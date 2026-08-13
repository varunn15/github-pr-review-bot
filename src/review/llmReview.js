const reviewCode = require("./providers/gemini");

/**
 * Orchestrate the LLM review of changed code
 * @param {Array} changedLines - Array of { line, side, content } from parseDiff
 * @returns {Promise<Object>} - Validated review findings
 */
async function llmReview(changedLines) {
  // Format the code with line numbers for Gemini
  const formattedCode = changedLines
    .map((line) => `Line ${line.line}: ${line.content}`)
    .join("\n");

  // Get review from Gemini
  const review = await reviewCode(formattedCode);

  return review;
}

module.exports = llmReview;