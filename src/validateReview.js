const VALID_SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

/**
 * Validate the structure and content of a review from the LLM
 * @param {Object} review - The review object from the LLM
 * @returns {boolean} - True if valid
 * @throws {Error} - If validation fails
 */
function validateReview(review) {
  // Check if review exists and has issues array
  if (!review || !Array.isArray(review.issues)) {
    throw new Error("Invalid review format: issues must be an array");
  }

  // Check each issue
  for (const issue of review.issues) {
    // Check severity
    if (!VALID_SEVERITIES.includes(issue.severity)) {
      throw new Error(
        `Invalid severity: ${issue.severity}. Must be one of: ${VALID_SEVERITIES.join(", ")}`
      );
    }

    // Check required fields
    if (!issue.file || typeof issue.file !== "string") {
      throw new Error("Review issue missing file");
    }

    if (!issue.title || typeof issue.title !== "string") {
      throw new Error("Review issue missing title");
    }

    if (!issue.explanation || typeof issue.explanation !== "string") {
      throw new Error("Review issue missing explanation");
    }

    if (!issue.suggestedFix || typeof issue.suggestedFix !== "string") {
      throw new Error("Review issue missing suggestedFix");
    }

    // Check line is a number
    if (typeof issue.line !== "number") {
      throw new Error("Review issue line must be a number");
    }
  }

  return true;
}

module.exports = {
  validateReview,
  VALID_SEVERITIES,
};