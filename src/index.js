require("dotenv").config();

const { Octokit } = require("@octokit/rest");
const fetchDiff = require("./github/fetchDiff");
const parseDiff = require("./review/parseDiff");
const { postReview } = require("./github/postReview");
const llmReview = require("./review/llmReview");
const schemaValidate = require("./review/schema");
const { hasBeenReviewed, generateReviewBody, BOT_MARKER } = require("./github/reviewStatus");
const { filterFiles } = require("./filterFiles");
const { validateReview } = require("./validateReview");
const { shouldFailCI } = require("./ciGate");
const config = require("../reviewbot.config");

// Get config from environment (GitHub Actions) or .env (local)
const envConfig = {
  githubToken: process.env.GITHUB_TOKEN || process.env.INPUT_GITHUB_TOKEN,
  geminiKey: process.env.GEMINI_API_KEY || process.env.INPUT_GEMINI_API_KEY,
  owner: process.env.REPO_OWNER || process.env.GITHUB_REPOSITORY_OWNER || "varunn15",
  repo: process.env.REPO_NAME || process.env.GITHUB_REPOSITORY?.split('/')[1] || "pr-review-bot-test",
  prNumber: parseInt(process.env.PR_NUMBER || process.env.INPUT_PR_NUMBER || "1"),
};

// Validate required env vars
if (!envConfig.githubToken) {
  console.error("❌ GITHUB_TOKEN is required");
  console.error("   Make sure it's passed as an environment variable or input");
  process.exit(1);
}

if (!envConfig.geminiKey) {
  console.error("❌ GEMINI_API_KEY is required");
  console.error("   Make sure it's passed as an environment variable or input");
  process.exit(1);
}

const octokit = new Octokit({
  auth: envConfig.githubToken,
});

/**
 * Post a summary comment to the PR
 */
async function postSummaryComment(octokit, owner, repo, prNumber, body) {
  try {
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
    });

    const botComment = comments.find(c => 
      c.user.type === 'Bot' && c.body.includes('PR Review Bot Summary')
    );

    if (botComment) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: botComment.id,
        body,
      });
      console.log("   📝 Updated summary comment");
    } else {
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

async function main() {
  const { owner, repo, prNumber } = envConfig;
  
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
  console.log(`📌 HEAD commit: ${commitId}`);
  console.log(`   PR state: ${pullRequest.state}`);
  
  if (pullRequest.state !== "open") {
    console.warn(`⚠️  PR is ${pullRequest.state}, not open. Skipping.`);
    return;
  }

  // Step 2: Check if already reviewed (IDEMPOTENCY)
  const alreadyReviewed = await hasBeenReviewed(octokit, owner, repo, prNumber, commitId);
  
  if (alreadyReviewed) {
    console.log(`✅ Skipping duplicate review for commit ${commitId.substring(0, 7)}`);
    return;
  }

  // Step 3: Fetch all files
  console.log("\n📁 Fetching PR files...");
  const files = await fetchDiff(octokit, owner, repo, prNumber);
  console.log(`   Found ${files.length} files in the PR`);

  // Step 4: Filter files using configuration
  console.log(`\n🔍 Filtering files...`);
  console.log(`   📊 Files before filtering: ${files.length}`);
  
  const filteredFiles = filterFiles(files);
  console.log(`   📊 Files after filtering: ${filteredFiles.length}`);

  if (filteredFiles.length === 0) {
    console.log("✅ No code files to review after filtering");
    await postSummaryComment(octokit, owner, repo, prNumber, 
      "✅ No code files to review after filtering. Skipping AI analysis."
    );
    return;
  }

  // Step 5: Check max files limit
  const { maxFiles, maxChangedLines } = config.filtering;
  
  if (filteredFiles.length > maxFiles) {
    console.log(`⚠️ PR contains too many reviewable files (${filteredFiles.length} > ${maxFiles}).`);
    await postSummaryComment(octokit, owner, repo, prNumber,
      `⚠️ PR contains too many reviewable files (${filteredFiles.length} > ${maxFiles}). Skipping review.`
    );
    return;
  }

  // Step 6: Check max changed lines limit
  const totalChangedLines = filteredFiles.reduce(
    (total, file) => total + (file.additions || 0) + (file.deletions || 0),
    0
  );
  
  console.log(`   📊 Total changed lines: ${totalChangedLines}`);

  if (totalChangedLines > maxChangedLines) {
    console.log(`⚠️ PR diff is too large: ${totalChangedLines} changed lines > ${maxChangedLines}.`);
    await postSummaryComment(octokit, owner, repo, prNumber,
      `⚠️ PR diff is too large: ${totalChangedLines} changed lines > ${maxChangedLines}. Skipping review.`
    );
    return;
  }

  // Step 7: Process each file
  let totalFindings = 0;
  const allFindings = [];

  for (const file of filteredFiles) {
    console.log(`\n📄 Processing: ${file.filename}`);
    console.log(`   Additions: ${file.additions}, Deletions: ${file.deletions}`);

    // Parse the patch
    const changedLines = parseDiff(file.patch);
    console.log(`   Found ${changedLines.length} changed lines`);

    if (changedLines.length === 0) continue;

    // Get AI review
    console.log("   🤖 Getting AI review from Gemini...");
    try {
      const review = await llmReview(changedLines, file.filename);
      
      // Handle the new response format
      if (review && review.issues && Array.isArray(review.issues)) {
        for (const issue of review.issues) {
          // Map severity to our format
          const severityMap = {
            'CRITICAL': 'critical',
            'HIGH': 'warning',
            'MEDIUM': 'warning',
            'LOW': 'suggestion',
          };
          
          totalFindings++;
          allFindings.push({
            file: issue.file || file.filename,
            line: issue.line,
            severity: severityMap[issue.severity] || 'suggestion',
            comment: `**${issue.title}**\n\n${issue.explanation}\n\n**Suggested Fix:** ${issue.suggestedFix}`,
            rawSeverity: issue.severity,
          });
        }
      } else {
        console.log("   ℹ️ No issues found by AI");
      }
    } catch (error) {
      console.error(`   ❌ Error reviewing ${file.filename}:`, error.message);
    }
  }

  // Step 8: Post findings as a single review
  if (allFindings.length > 0) {
    console.log(`\n💬 Posting ${allFindings.length} finding(s) as a single review...`);
    
    // Generate review body with bot marker and commit SHA
    const reviewBody = generateReviewBody(allFindings, commitId);
    
    // Post the review using the GitHub API
    await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      commit_id: commitId,
      body: reviewBody,
      event: "COMMENT",
      comments: allFindings.map(finding => ({
        path: finding.file,
        line: finding.line,
        side: "RIGHT",
        body: `🤖 **AI Code Review**\n\n**Severity:** ${finding.severity}\n**Issue:** ${finding.comment}`,
      })),
    });

    console.log(`✅ Review posted successfully!`);
    console.log(`   Commit: ${commitId}`);
    console.log(`   Findings: ${allFindings.length}`);

    // Also post a summary comment
    const summaryBody = `🤖 **PR Review Bot Summary**\n\n` +
      `Found **${allFindings.length}** issue${allFindings.length > 1 ? 's' : ''} in ${filteredFiles.length} file${filteredFiles.length > 1 ? 's' : ''}.\n\n` +
      allFindings.map(f => 
        `- **${f.file}** (line ${f.line}): ${f.severity} - ${f.comment}`
      ).join('\n');

    await postSummaryComment(octokit, owner, repo, prNumber, summaryBody);
    
  } else {
    // Post a "no issues found" review
    const reviewBody = `${BOT_MARKER}\n\n🤖 **AI Code Review**\n\n**Commit:** ${commitId}\n\n✅ No issues found in this PR.\n\n---\n*Reviewed by AI PR Review Bot*`;
    
    await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      commit_id: commitId,
      body: reviewBody,
      event: "COMMENT",
    });

    console.log(`✅ No issues found. Review posted.`);

    await postSummaryComment(octokit, owner, repo, prNumber, 
      `🤖 **PR Review Bot Summary**\n\n✅ No issues found in this PR!`
    );
  }

  // Step 9: Validate review structure
  try {
    const reviewForValidation = {
      issues: allFindings.map(f => ({
        severity: f.rawSeverity || f.severity.toUpperCase(),
        file: f.file,
        line: f.line,
        title: f.comment.split('\n')[0] || 'Issue',
        explanation: f.comment,
        suggestedFix: 'See comment for details',
      })),
    };
    validateReview(reviewForValidation);
    console.log("✅ Review validation passed");
  } catch (error) {
    console.error("❌ Review validation failed:", error.message);
    process.exit(1);
  }

  // Step 10: Check CI gate
  const ciShouldFail = shouldFailCI(
    allFindings.map(f => ({ severity: f.rawSeverity || f.severity.toUpperCase() }))
  );

  if (ciShouldFail) {
    console.error("❌ CI failed: Critical or High severity issues detected.");
    console.error("   Review comments have been posted. Please fix the issues.");
    process.exit(1);
  } else {
    console.log("✅ CI passed: No blocking issues detected.");
  }

  console.log(`\n🎉 Review complete! Found ${allFindings.length} issue${allFindings.length > 1 ? 's' : ''}.`);
}

main().catch((error) => {
  console.error(`❌ Script failed: ${error.message}`);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});