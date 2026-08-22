const config = require("../reviewbot.config");

/**
 * Determine if CI should fail based on issue severities
 * @param {Array} issues - Array of issues from the review
 * @returns {boolean} - True if CI should fail
 */
function shouldFailCI(issues) {
  const failOn = config.ci.failOn;

  // If no issues, CI passes
  if (!issues || issues.length === 0) {
    return false;
  }

  // Check if any issue has a severity that should fail CI
  return issues.some((issue) => failOn.includes(issue.severity));
}

module.exports = {
  shouldFailCI,
};