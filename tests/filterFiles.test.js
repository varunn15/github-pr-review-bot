const { shouldReviewFile, filterFiles } = require('../src/filterFiles');

describe('filterFiles', () => {
  // Test 1 - JS should be reviewed
  test('reviews JavaScript files', () => {
    expect(shouldReviewFile('src/app.js')).toBe(true);
  });

  // Test 2 - TS should be reviewed
  test('reviews TypeScript files', () => {
    expect(shouldReviewFile('src/app.ts')).toBe(true);
  });

  // Test 3 - TSX should be reviewed
  test('reviews TypeScript React files', () => {
    expect(shouldReviewFile('src/components/App.tsx')).toBe(true);
  });

  // Test 4 - JSX should be reviewed
  test('reviews JavaScript React files', () => {
    expect(shouldReviewFile('src/components/App.jsx')).toBe(true);
  });

  // Test 5 - Markdown should be ignored
  test('ignores markdown files', () => {
    expect(shouldReviewFile('README.md')).toBe(false);
  });

  // Test 6 - JSON should be ignored
  test('ignores JSON files', () => {
    expect(shouldReviewFile('package.json')).toBe(false);
  });

  // Test 7 - node_modules should be ignored
  test('ignores node_modules', () => {
    expect(shouldReviewFile('node_modules/package/index.js')).toBe(false);
  });

  // Test 8 - dist should be ignored
  test('ignores dist directory', () => {
    expect(shouldReviewFile('dist/index.js')).toBe(false);
  });

  // Test 9 - .github should be ignored
  test('ignores .github directory', () => {
    expect(shouldReviewFile('.github/workflows/test.yml')).toBe(false);
  });

  // Test 10 - package-lock.json should be ignored
  test('ignores package-lock.json', () => {
    expect(shouldReviewFile('package-lock.json')).toBe(false);
  });

  // Test 11 - yarn.lock should be ignored
  test('ignores yarn.lock', () => {
    expect(shouldReviewFile('yarn.lock')).toBe(false);
  });

  // Test 12 - .gitignore should be ignored
  test('ignores .gitignore', () => {
    expect(shouldReviewFile('.gitignore')).toBe(false);
  });

  // Test 13 - Filter multiple files
  test('filters a list of files correctly', () => {
    const files = [
      { filename: 'src/app.js' },
      { filename: 'README.md' },
      { filename: 'src/utils.ts' },
      { filename: 'package-lock.json' },
      { filename: 'node_modules/test.js' },
    ];

    const result = filterFiles(files);
    expect(result).toHaveLength(2);
    expect(result.map(f => f.filename)).toEqual(['src/app.js', 'src/utils.ts']);
  });

  // Test 14 - Empty array returns empty array
  test('returns empty array for empty input', () => {
    const result = filterFiles([]);
    expect(result).toEqual([]);
  });

  // Test 15 - No matching files returns empty array
  test('returns empty array when no files match', () => {
    const files = [
      { filename: 'README.md' },
      { filename: 'package.json' },
    ];

    const result = filterFiles(files);
    expect(result).toEqual([]);
  });
});