require("dotenv").config();

const { Octokit } = require("@octokit/rest");
const fetchDiff = require("./github/fetchDiff");
const parseDiff = require("./review/parseDiff");
const { postReview } = require("./github/postReview");
const llmReview = require("./review/llmReview");
const validateReview = require("./review/schema");

// Get config from environment (GitHub Actions) or .env (local)
const config = {
  githubToken: process.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN_DEV,
  geminiKey: process.env.GEMINI_API_KEY,
  owner: process.env.REPO_OWNER || "varunn15",
  repo: process.env.REPO_NAME || "pr-review-bot-test",
  prNumber: parseInt(process.env.PR_NUMBER || "1"),
};

// Validate required env vars
if (!config.githubToken) {
  console.error("❌ GITHUB_TOKEN is required");
  console.error("   Set it in .env or as a GitHub secret");
  process.exit(1);
}
if (!config.geminiKey) {
  console.error("❌ GEMINI_API_KEY is required");
  console.error("   Set it in .env or as a GitHub secret");
  process.exit(1);
}

const octokit = new Octokit({
  auth: config.githubToken,
});

async function main() {
  const { owner, repo, prNumber } = config;
  
  console.log(`🔍 Fetching PR #${prNumber} from ${owner}/${repo}...`);
  console.log(`🤖 Running in ${process.env.GITHUB_ACTIONS ? 'GitHub Actions' : 'local'} mode`);

  // Step 1: Get the PR details
  console.log("\n📋 Getting PR details...");
  const { data: pullRequest } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  const commitId = pullRequest.head.sha;
  console.log(`✅ PR commit: ${commitId}`);
  console.log(`   PR state: ${pullRequest.state}`);
  
  if (pullRequest.state !== "open") {
    console.warn(`⚠️  PR is ${pullRequest.state}, not open. Skipping.`);
    return;
  }

  // Step 2: Fetch all files
  console.log("\n📁 Fetching PR files...");
  const files = await fetchDiff(octokit, owner, repo, prNumber);
  console.log(`   Found ${files.length} files in the PR`);

  // Step 3: Filter files (ignore common non-code files)
  const ignorePatterns = [
    /\.lock$/,
    /\.txt$/,
    /\.md$/,
    /\.json$/,
    /\.yml$/,
    /\.yaml$/,
    /pnpm-lock/,
    /package-lock/,
    /\.gitignore/,
    /\.env/,
  ];
  
  const codeFiles = files.filter(file => 
    file.additions > 0 && 
    !ignorePatterns.some(pattern => pattern.test(file.filename))
  );

  if (codeFiles.length === 0) {
    console.log("✅ No code files to review");
    // Post a summary comment
    await postSummaryComment(octokit, owner, repo, prNumber, 
      "✅ No code files to review. Skipping AI analysis."
    );
    return;
  }

  console.log(`   Found ${codeFiles.length} code files to review`);

  // Step 4: Process each file
  let totalFindings = 0;
  const allFindings = [];
  
  for (const file of codeFiles) {
    console.log(`\n📄 Processing: ${file.filename}`);
    console.log(`   Additions: ${file.additions}, Deletions: ${file.deletions}`);

    // Parse the patch
    const changedLines = parseDiff(file.patch);
    console.log(`   Found ${changedLines.length} changed lines`);

    if (changedLines.length === 0) continue;

    // Get AI review
    console.log("   🤖 Getting AI review from Gemini...");
    try {
      const review = await llmReview(changedLines);
      const validatedReview = validateReview(review, changedLines);

      // Post findings
      for (const finding of validatedReview.findings) {
        const commentText = `🤖 **AI Code Review**\n\n` +
          `**Severity:** ${finding.severity}\n` +
          `**Issue:** ${finding.comment}`;

        console.log(`   💬 Posting finding on line ${finding.line}`);
        await postReview(
          octokit,
          owner,
          repo,
          prNumber,
          commitId,
          file.filename,
          finding.line,
          commentText
        );
        totalFindings++;
        allFindings.push({
          file: file.filename,
          line: finding.line,
          severity: finding.severity,
          comment: finding.comment,
        });
      }
    } catch (error) {
      console.error(`   ❌ Error reviewing ${file.filename}:`, error.message);
    }
  }

  // Step 5: Post summary comment
  let summaryBody;
  if (totalFindings > 0) {
    summaryBody = `🤖 **PR Review Bot Summary**\n\n` +
      `Found **${totalFindings}** issue${totalFindings > 1 ? 's' : ''} in ${codeFiles.length} file${codeFiles.length > 1 ? 's' : ''}.\n\n` +
      allFindings.map(f => 
        `- **${f.file}** (line ${f.line}): ${f.severity} - ${f.comment}`
      ).join('\n');
  } else {
    summaryBody = `🤖 **PR Review Bot**\n\n✅ No issues found in this PR!`;
  }

  await postSummaryComment(octokit, owner, repo, prNumber, summaryBody);
  console.log(`\n🎉 Review complete! Found ${totalFindings} issue${totalFindings > 1 ? 's' : ''}.`);
}

/**
 * Post a summary comment to the PR
 */
async function postSummaryComment(octokit, owner, repo, prNumber, body) {
  try {
    // Check if we already posted a summary comment
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
    });

    const botComment = comments.find(c => 
      c.user.type === 'Bot' && c.body.includes('PR Review Bot Summary')
    );

    if (botComment) {
      // Update existing comment
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: botComment.id,
        body,
      });
      console.log("   📝 Updated summary comment");
    } else {
      // Create new comment
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      });
      console.log("   📝 Posted summary comment");
    }
  } catch (error) {
    console.error("   ⚠️ Could not post summary comment:", error.message);
  }
}

main().catch((error) => {
  console.error(`❌ Script failed: ${error.message}`);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});