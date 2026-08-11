require("dotenv").config();

const { Octokit } = require("@octokit/rest");
const fetchDiff = require("./github/fetchDiff");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function main() {
  const owner = "varunn15";
  const repo = "pr-review-bot-test";
  const pull_number = 1;

  const files = await fetchDiff(
    octokit,
    owner,
    repo,
    pull_number
  );

  for (const file of files) {
    console.log("\n====================");
    console.log(`FILE: ${file.filename}`);
    console.log("====================");

    console.log(`Status: ${file.status}`);
    console.log(`Additions: ${file.additions}`);
    console.log(`Deletions: ${file.deletions}`);

    console.log("\nPATCH:");
    console.log(file.patch);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});