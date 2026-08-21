/**
 * Check if a commit has already been reviewed by the bot
 */

// Unique marker to identify bot reviews
const BOT_MARKER = '<!-- github-pr-review-bot -->';

/**
 * Check if a commit has already been reviewed
 * @param {Object} octokit - Authenticated Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} pullNumber - PR number
 * @param {string} commitSha - The commit SHA to check
 * @returns {Promise<boolean>} - True if already reviewed
 */
async function hasBeenReviewed(octokit, owner, repo, pullNumber, commitSha) {
  try {
    console.log(`🔎 Checking previous reviews for commit ${commitSha.substring(0, 7)}...`);
    
    // Get all review comments on the PR
    const { data: reviews } = await octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: pullNumber,
    });

    // Look for bot reviews with our marker
    const botReviews = reviews.filter(review => 
      review.body && review.body.includes(BOT_MARKER)
    );

    if (botReviews.length === 0) {
      console.log(`ℹ️ No previous AI reviews found`);
      return false;
    }

    // Check if any bot review contains the commit SHA
    for (const review of botReviews) {
      if (review.body.includes(commitSha)) {
        console.log(`⏭️ Commit ${commitSha.substring(0, 7)} already reviewed`);
        return true;
      }
    }

    console.log(`ℹ️ Commit ${commitSha.substring(0, 7)} not reviewed yet`);
    return false;
  } catch (error) {
    console.error(`❌ Error checking review status: ${error.message}`);
    // Fail safe: if we can't check, assume not reviewed and proceed
    return false;
  }
}

/**
 * Generate the review body with bot marker
 * @param {Array} findings - Array of validated findings
 * @param {string} commitSha - The commit SHA
 * @returns {string} - Formatted review body
 */
function generateReviewBody(findings, commitSha) {
  let body = `${BOT_MARKER}\n\n🤖 **AI Code Review**\n\n`;
  body += `**Commit:** ${commitSha}\n\n`;

  for (const finding of findings) {
    body += `**Severity:** ${finding.severity}\n`;
    body += `**Issue:** ${finding.comment}\n\n`;
  }

  body += `---\n*Reviewed by AI PR Review Bot*`;
  return body;
}

module.exports = {
  hasBeenReviewed,
  generateReviewBody,
  BOT_MARKER,
};