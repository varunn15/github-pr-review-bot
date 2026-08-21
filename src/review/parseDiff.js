function parseDiff(patch) {
  // 🛡️ Add defensive check
  if (!patch || typeof patch !== 'string') {
    console.warn("⚠️ parseDiff: patch is undefined or not a string, returning empty array");
    return [];
  }
  
  const lines = patch.split("\n");
  const changedLines = [];
  let newLineNumber = 0;

  for (const line of lines) {
    // HUNK HEADER: "@@ -1,5 +1,7 @@"
    if (line.startsWith("@@")) {
      // Extract the starting line number for the NEW file
      // Pattern: +1,7 means new file starts at line 1
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
      // Deleted lines don't exist in the new file, so we don't increment
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