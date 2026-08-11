require("dotenv").config();

const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function main() {
  const owner = "varunn15";
  const repo = "pr-review-bot-test";
  const pull_number = 1;

  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number,
  });

  console.log(files);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});