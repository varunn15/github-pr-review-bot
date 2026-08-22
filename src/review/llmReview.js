const reviewCode = require("./providers/gemini");

/**
 * Orchestrate the LLM review of changed code
 * @param {Array} changedLines - Array of { line, side, content } from parseDiff
 * @param {string} filename - The name of the file being reviewed
 * @returns {Promise<Object>} - Validated review issues
 */
async function llmReview(changedLines, filename) {
  // Format the code with line numbers for Gemini
  const formattedCode = changedLines
    .map((line) => `Line ${line.line}: ${line.content}`)
    .join("\n");

  // Get review from Gemini
  const review = await reviewCode(formattedCode, filename);

  return review;
}

module.exports = llmReview;