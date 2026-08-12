require("dotenv").config();
const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function debugPR() {
  const owner = "varunn15";
  const repo = "pr-review-bot-test";
  const pull_number = 1;

  console.log(`🔍 Debugging PR #${pull_number}...\n`);

  try {
    // 1. Check if we can even access the repo
    console.log("📋 Test 1: Repository access...");
    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo,
    });
    console.log(`✅ Can access repo: ${repoData.name}\n`);

    // 2. Check if we can get PR details
    console.log("📋 Test 2: PR details...");
    const { data: prData } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number,
    });
    console.log(`✅ PR #${prData.number}: ${prData.title}`);
    console.log(`   State: ${prData.state}`);
    console.log(`   Files changed: ${prData.changed_files}`);
    console.log(`   Additions: ${prData.additions}`);
    console.log(`   Deletions: ${prData.deletions}\n`);

    // 3. Get the files with more details
    console.log("📋 Test 3: Listing files...");
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number,
    });
    
    console.log(`   Found ${files.length} files in the PR\n`);
    
    if (files.length === 0) {
      console.log("❌ No files found! This is the problem.");
      console.log("   Possible reasons:");
      console.log("   - PR has no changes (but it should)");
      console.log("   - Token doesn't have 'Contents: Read' permission");
      console.log("   - Repository is empty or corrupted");
      return;
    }

    // 4. Show each file's details
    files.forEach((file, index) => {
      console.log(`   File ${index + 1}: ${file.filename}`);
      console.log(`      Status: ${file.status}`);
      console.log(`      Additions: ${file.additions}`);
      console.log(`      Deletions: ${file.deletions}`);
      console.log(`      Patch length: ${file.patch ? file.patch.length : 0} characters`);
      console.log(`      Has patch: ${file.patch ? '✅ Yes' : '❌ No'}`);
      console.log("");
    });

    // 5. Check if files have additions
    const filesWithAdditions = files.filter(f => f.additions > 0);
    console.log(`📊 Summary: ${filesWithAdditions.length} files have additions`);
    console.log(`   File names: ${filesWithAdditions.map(f => f.filename).join(', ')}`);

  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.status) {
      console.log(`   Status: ${error.status}`);
    }
    if (error.response) {
      console.log(`   Response:`, JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugPR();