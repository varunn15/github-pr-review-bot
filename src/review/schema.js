/**
 * Validate and filter Gemini's review findings
 * @param {Object} review - The raw review from Gemini
 * @param {Array} changedLines - The actual changed lines from parseDiff
 * @returns {Object} - Filtered and validated findings
 */
function validateReview(review, changedLines) {
  // Check if review has the expected structure
  if (!review || !review.issues || !Array.isArray(review.issues)) {
    throw new Error("Invalid review format: issues must be an array");
  }

  // Create a Set of valid line numbers that were actually changed
  const validLines = new Set(
    changedLines.map((line) => line.line)
  );

  // Define valid severity levels
  const validSeverities = new Set([
    "CRITICAL",
    "HIGH",
    "MEDIUM",
    "LOW",
  ]);

  // Filter and validate each issue
  const validFindings = [];

  for (const issue of review.issues) {
    // Check if issue has required fields and they're not empty
    if (
      typeof issue.line !== "number" ||
      typeof issue.title !== "string" ||
      issue.title.trim() === "" ||
      typeof issue.explanation !== "string" ||
      issue.explanation.trim() === "" ||
      typeof issue.suggestedFix !== "string" ||
      issue.suggestedFix.trim() === "" ||
      !validSeverities.has(issue.severity)
    ) {
      console.warn("⚠️ Skipping malformed issue:", issue);
      continue;
    }

    // Check if the line number was actually changed
    if (!validLines.has(issue.line)) {
      console.warn(
        `⚠️ Skipping issue on line ${issue.line}: line was not changed`
      );
      continue;
    }

    // Keep valid issue
    validFindings.push({
      line: issue.line,
      severity: issue.severity,
      title: issue.title,
      explanation: issue.explanation,
      suggestedFix: issue.suggestedFix,
    });
  }

  return {
    findings: validFindings.map(f => ({
      line: f.line,
      severity: f.severity.toLowerCase(),
      comment: `**${f.title}**\n\n${f.explanation}\n\n**Suggested Fix:** ${f.suggestedFix}`,
    })),
  };
}

module.exports = validateReview;