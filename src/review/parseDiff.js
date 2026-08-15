/**
 * Parse a unified diff patch to extract changed lines
 */
function parseDiff(patch) {
  // ✅ Add defensive check
  if (!patch || typeof patch !== 'string') {
    console.warn("⚠️ Invalid patch provided to parseDiff");
    return [];
  }
  
  const lines = patch.split("\n");
  const changedLines = [];
  let newLineNumber = 0;

  for (const line of lines) {
    // HUNK HEADER: "@@ -1,5 +1,7 @@"
    if (line.startsWith("@@")) {
      const match = line.match(/\+(\d+)(?:,\d+)?/);
      if (match) {
        newLineNumber = Number(match[1]);
      }
      continue;
    }

    // ADDED LINE: "+ const total = price + tax;"
    if (line.startsWith("+")) {
      changedLines.push({
        line: newLineNumber,
        side: "RIGHT",
        content: line.slice(1),
      });
      newLineNumber++;
      continue;
    }

    // DELETED LINE: "- return price + tax;"
    if (line.startsWith("-")) {
      continue;
    }

    // CONTEXT LINE: " function calculateTotal(price, tax) {"
    if (line.startsWith(" ")) {
      newLineNumber++;
    }
  }

  return changedLines;
}

module.exports = parseDiff;