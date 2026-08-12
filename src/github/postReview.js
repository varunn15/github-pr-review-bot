/**
 * Post a review comment on a specific line in a PR
 */
async function postReview(
  octokit,
  owner,
  repo,
  pullNumber,
  commitId,
  path,
  line,
  body
) {
  try {
    const response = await octokit.rest.pulls.createReviewComment({
      owner,
      repo,
      pull_number: pullNumber,
      body,
      commit_id: commitId,
      path,
      line,
      side: "RIGHT", // We always comment on the new version
    });

    console.log(`✅ Comment posted successfully!`);
    console.log(`   URL: ${response.data.html_url}`);
    console.log(`   File: ${path}`);
    console.log(`   Line: ${line}`);
    
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to post comment:`);
    console.error(`   Status: ${error.status}`);
    console.error(`   Message: ${error.message}`);
    
    if (error.response) {
      console.error(`   Response:`, JSON.stringify(error.response.data, null, 2));
    }
    
    throw error;
  }
}

/**
 * Post multiple review comments at once
 */
async function postReviewComments(
  octokit,
  owner,
  repo,
  pullNumber,
  commitId,
  comments
) {
  try {
    const review = await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      commit_id: commitId,
      event: "COMMENT",
      comments: comments.map(comment => ({
        path: comment.path,
        line: comment.line,
        side: "RIGHT",
        body: comment.body,
      })),
    });

    console.log(`✅ Review created with ${comments.length} comments`);
    console.log(`   Review ID: ${review.data.id}`);

    const submittedReview = await octokit.rest.pulls.submitReview({
      owner,
      repo,
      pull_number: pullNumber,
      review_id: review.data.id,
      event: "COMMENT",
    });

    console.log(`✅ Review submitted!`);
    console.log(`   URL: ${submittedReview.data.html_url}`);
    
    return submittedReview.data;
  } catch (error) {
    console.error(`❌ Failed to post review:`);
    console.error(`   Status: ${error.status}`);
    console.error(`   Message: ${error.message}`);
    
    if (error.response) {
      console.error(`   Response:`, JSON.stringify(error.response.data, null, 2));
    }
    
    throw error;
  }
}

module.exports = {
  postReview,
  postReviewComments,
};