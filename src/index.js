require("dotenv").config();

const { Octokit } = require("@octokit/rest");
const fetchDiff = require("./github/fetchDiff");
const parseDiff = require("./review/parseDiff");
const { postReview } = require("./github/postReview");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function main() {
  const owner = "varunn15";
  const repo = "pr-review-bot-test";
  const pull_number = 1; // ✅ CHANGED: Now using PR #2

  console.log(`🔍 Fetching PR #${pull_number} from ${owner}/${repo}...`);

  // Step 1: Get the PR details (including the commit SHA)
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

  // Step 2: Fetch all files in the PR
  console.log("\n📁 Fetching PR files...");
  const files = await fetchDiff(octokit, owner, repo, pull_number);
  console.log(`   Found ${files.length} files in the PR`);

  // Step 3: Look for a file with changes (skip if no changes)
  const fileWithChanges = files.find(f => f.additions > 0);
  
  if (!fileWithChanges) {
    console.log("❌ No files with additions found");
    return;
  }

  console.log(`\n📄 Using file: ${fileWithChanges.filename}`);
  console.log(`   Additions: ${fileWithChanges.additions}`);
  console.log(`   Deletions: ${fileWithChanges.deletions}`);

  // Step 4: Parse the patch to find changed lines
  console.log("\n🔍 Parsing diff...");
  const changedLines = parseDiff(fileWithChanges.patch);
  
  console.log(`   Found ${changedLines.length} changed lines:`);
  changedLines.forEach((line, index) => {
    console.log(`   ${index + 1}. Line ${line.line}: ${line.content.trim()}`);
  });

  // Step 5: Pick a line to comment on
  if (changedLines.length === 0) {
    console.log("❌ No changed lines found to comment on");
    return;
  }

  // Pick the first changed line
  const targetLine = changedLines[0];
  const commentText = `🤖 **Test comment from PR Review Bot**

This is a test comment on line ${targetLine.line}.

The code here is: \`${targetLine.content.trim()}\`

---
🔍 *Test comment using fine-grained token authentication*`;

  console.log(`\n💬 Posting comment on line ${targetLine.line}:`);
  console.log(`   "${commentText}"`);

  // Step 6: Post the comment
  try {
    await postReview(
      octokit,
      owner,
      repo,
      pull_number,
      commitId,
      fileWithChanges.filename,
      targetLine.line,
      commentText
    );

    console.log("\n🎉 Success! Check your PR for the inline comment.");
    console.log(`   https://github.com/${owner}/${repo}/pull/${pull_number}`);
  } catch (error) {
    console.error("\n❌ Failed to post comment:", error.message);
    
    // Provide helpful troubleshooting
    console.log("\n💡 Troubleshooting tips:");
    console.log("   1. Make sure the PR is OPEN (not merged/closed)");
    console.log("   2. Verify the line number exists in the file");
    console.log("   3. Check that your GITHUB_TOKEN has proper permissions");
    console.log("   4. Try a different line number (some lines might not be commentable)");
    
    if (changedLines.length > 1) {
      console.log(`\n   Try commenting on a different line:`);
      changedLines.forEach((line, i) => {
        console.log(`   ${i + 1}. Line ${line.line}: ${line.content.trim()}`);
      });
    }
  }
}

main().catch((error) => {
  console.error(`❌ Script failed: ${error.message}`);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});