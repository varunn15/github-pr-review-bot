const config = require("../reviewbot.config.js");

/**
 * Check if a file should be reviewed based on configuration
 * @param {string} filename - The file path
 * @returns {boolean} - True if the file should be reviewed
 */
function shouldReviewFile(filename) {
  const { allowedExtensions, ignoredDirectories, ignoredFiles } =
    config.filtering;

  // Check if it's in the ignored files list
  if (ignoredFiles.includes(filename)) {
    return false;
  }

  // Check if it's in an ignored directory
  if (
    ignoredDirectories.some((directory) =>
      filename.startsWith(directory) || filename.includes(`/${directory}`)
    )
  ) {
    return false;
  }

  // Check if it has an allowed extension
  const hasAllowedExtension = allowedExtensions.some((extension) =>
    filename.endsWith(extension)
  );

  return hasAllowedExtension;
}

/**
 * Filter a list of files based on the configuration
 * @param {Array} files - Array of file objects with filename property
 * @returns {Array} - Filtered array of files
 */
function filterFiles(files) {
  return files.filter((file) => shouldReviewFile(file.filename));
}

module.exports = {
  shouldReviewFile,
  filterFiles,
};