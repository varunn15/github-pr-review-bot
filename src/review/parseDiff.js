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
    if (line.startsWith("@@")) {
      const match = line.match(/\+(\d+)(?:,\d+)?/);
      if (match) {
        newLineNumber = Number(match[1]);
      }
      continue;
    }

    if (line.startsWith("+")) {
      changedLines.push({
        line: newLineNumber,
        side: "RIGHT",
        content: line.slice(1),
      });
      newLineNumber++;
      continue;
    }

    if (line.startsWith("-")) {
      continue;
    }

    if (line.startsWith(" ")) {
      newLineNumber++;
    }
  }

  return changedLines;
}

module.exports = parseDiff;