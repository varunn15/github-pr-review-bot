// check-prs.js (create this in your project root)
require("dotenv").config();
const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function checkPRs() {
  const owner = "varunn15";
  const repo = "pr-review-bot-test";
  
  console.log(`🔍 Checking PRs in ${owner}/${repo}...\n`);
  
  try {
    // Get all PRs (open and closed)
    const { data: pulls } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "all", // Get both open and closed
      sort: "created",
      direction: "desc",
    });
    
    if (pulls.length === 0) {
      console.log("❌ No PRs found in this repository.");
      console.log("\n💡 You need to create a PR first!");
      return;
    }
    
    console.log(`📋 Found ${pulls.length} PRs:\n`);
    pulls.forEach((pr, index) => {
      console.log(`${index + 1}. PR #${pr.number}: ${pr.title}`);
      console.log(`   State: ${pr.state}`);
      console.log(`   Created: ${pr.created_at}`);
      console.log(`   URL: ${pr.html_url}`);
      console.log(`   Head SHA: ${pr.head.sha.substring(0, 7)}...`);
      console.log("");
    });
    
    // Show the most recent open PR
    const openPR = pulls.find(pr => pr.state === "open");
    if (openPR) {
      console.log(`✅ Use PR #${openPR.number} (it's open)`);
      console.log(`   Update your index.js with: pull_number = ${openPR.number}`);
    } else {
      console.log("❌ No open PRs found. Create a new PR!");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("\n💡 Make sure:");
    console.log("   1. Token has access to the repository");
    console.log("   2. Repository name is correct");
    console.log("   3. Token has 'repo' or 'pull_requests' permission");
  }
}

checkPRs();