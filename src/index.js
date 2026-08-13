require("dotenv").config();

const { Octokit } = require("@octokit/rest");
const fetchDiff = require("./github/fetchDiff");
const parseDiff = require("./review/parseDiff");
const { postReview } = require("./github/postReview");
const llmReview = require("./review/llmReview");
const validateReview = require("./review/schema");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function main() {
  const owner = "varunn15";
  const repo = "pr-review-bot-test";
  const pull_number = 1;

  console.log(`🔍 Fetching PR #${pull_number} from ${owner}/${repo}...`);

  // Step 1: Get the PR details
  console.log("\n📋 Getting PR details...");
  const { data: pullRequest } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number,
  });

  const commitId = pullRequest.head.sha;
  console.log(`✅ PR commit: ${commitId}`);
  console.log(`   PR state: ${pullRequest.state}`);
  
  if (pullRequest.state !== "open") {
    console.warn(`⚠️  PR is ${pullRequest.state}, not open. Comments may fail.`);
    return;
  }

  // Step 2: Fetch all files
  console.log("\n📁 Fetching PR files...");
  const files = await fetchDiff(octokit, owner, repo, pull_number);
  console.log(`   Found ${files.length} files in the PR`);

  // Step 3: Look for a file with changes
  const fileWithChanges = files.find(f => f.additions > 0);
  
  if (!fileWithChanges) {
    console.log("❌ No files with additions found");
    return;
  }

  console.log(`\n📄 Using file: ${fileWithChanges.filename}`);
  console.log(`   Additions: ${fileWithChanges.additions}`);
  console.log(`   Deletions: ${fileWithChanges.deletions}`);

  // Step 4: Parse the patch
  console.log("\n🔍 Parsing diff...");
  const changedLines = parseDiff(fileWithChanges.patch);
  
  console.log(`   Found ${changedLines.length} changed lines:`);
  changedLines.forEach((line, index) => {
    console.log(`   ${index + 1}. Line ${line.line}: ${line.content.trim()}`);
  });

  if (changedLines.length === 0) {
    console.log("❌ No changed lines found to comment on");
    return;
  }

  // Step 5: Get AI review from Gemini
  console.log("\n🤖 Running full LLM review pipeline...");
  const review = await llmReview(changedLines);
  
  console.log("\n===== GEMINI REVIEW =====");
  console.log(JSON.stringify(review, null, 2));

  // Step 6: Validate the review
  const validatedReview = validateReview(review, changedLines);
  console.log("\n===== VALIDATED REVIEW =====");
  console.log(JSON.stringify(validatedReview, null, 2));

  // Step 7: Post the AI finding as an inline comment
  if (validatedReview.findings.length > 0) {
    const finding = validatedReview.findings[0];
    
    const commentText = `🤖 **AI Code Review**\n\n` +
      `**Severity:** ${finding.severity}\n` +
      `**Issue:** ${finding.comment}`;

    console.log(`\n💬 Posting AI review on line ${finding.line}:`);
    console.log(`   "${commentText}"`);

    await postReview(
      octokit,
      owner,
      repo,
      pull_number,
      commitId,
      fileWithChanges.filename,
      finding.line,
      commentText
    );

    console.log(`\n🎉 AI review posted to your PR!`);
    console.log(`   https://github.com/${owner}/${repo}/pull/${pull_number}`);
  } else {
    console.log("\n✅ No issues found in the code");
    console.log("   No review comment posted.");
  }
}

main().catch((error) => {
  console.error(`❌ Script failed: ${error.message}`);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});