/**
 * Validate and filter Gemini's review findings
 * @param {Object} review - The raw review from Gemini
 * @param {Array} changedLines - The actual changed lines from parseDiff
 * @returns {Object} - Filtered and validated findings
 */
function validateReview(review, changedLines) {
  // Check if review has the expected structure
  if (!review || !Array.isArray(review.findings)) {
    throw new Error("Invalid review format: findings must be an array");
  }

  // Create a Set of valid line numbers that were actually changed
  const validLines = new Set(
    changedLines.map((line) => line.line)
  );

  // Define valid severity levels
  const validSeverities = new Set([
    "critical",
    "warning",
    "suggestion",
  ]);

  // Filter and validate each finding
  const validFindings = [];

  for (const finding of review.findings) {
    // Check if finding has required fields
    if (
      typeof finding.line !== "number" ||
      typeof finding.comment !== "string" ||
      !validSeverities.has(finding.severity)
    ) {
      console.warn("⚠️ Skipping malformed finding:", finding);
      continue;
    }

    // Check if the line number was actually changed
    if (!validLines.has(finding.line)) {
      console.warn(
        `⚠️ Skipping finding on line ${finding.line}: line was not changed`
      );
      continue;
    }

    // Keep valid finding
    validFindings.push(finding);
  }

  return {
    findings: validFindings,
  };
}

module.exports = validateReview;