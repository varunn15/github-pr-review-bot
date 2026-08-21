const parseDiff = require('../src/review/parseDiff');

describe('parseDiff', () => {
  // ✅ Normal changed lines
  test('should parse single changed line', () => {
    const patch = `@@ -1,1 +1,1 @@
-function add(a, b) { return a + b; }
+function multiply(a, b) { return a * b; }`;

    const result = parseDiff(patch);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      line: 1,
      side: 'RIGHT',
      content: 'function multiply(a, b) { return a * b; }'
    });
  });

  test('should parse multiple changed lines', () => {
    const patch = `@@ -1,3 +1,5 @@
 function add(a, b) {
-  return a + b;
+  const result = a + b;
+  console.log('Adding');
+  return result;
 }`;

    const result = parseDiff(patch);
    expect(result).toHaveLength(3);
    expect(result[0].line).toBe(2);
    expect(result[1].line).toBe(3);
    expect(result[2].line).toBe(4);
  });

  // ✅ Multiple hunks
  test('should handle multiple hunks with correct line numbers', () => {
    const patch = `@@ -1,2 +1,2 @@
 function add(a, b) {
   return a + b;
 }
@@ -10,2 +10,3 @@
 function multiply(a, b) {
+  console.log('Multiplying');
   return a * b;
 }`;

    const result = parseDiff(patch);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      line: 11,
      side: 'RIGHT',
      content: '  console.log(\'Multiplying\');'
    });
  });

  // ✅ Deleted lines (should not be included)
  test('should exclude deleted lines', () => {
    const patch = `@@ -1,3 +1,1 @@
 function add(a, b) {
-  return a + b;
+  return a * b;
 }`;

    const result = parseDiff(patch);
    expect(result).toHaveLength(1);
    expect(result[0].content).toContain('return a * b');
  });

  // ✅ Context lines (should not be included)
  test('should exclude context lines', () => {
    const patch = `@@ -1,5 +1,5 @@
 function add(a, b) {
-  return a + b;
+  return a * b;
 }
 
 module.exports = add;`;

    const result = parseDiff(patch);
    expect(result).toHaveLength(1);
    expect(result[0].content).toContain('return a * b');
  });

  // ✅ Empty patch
  test('should return empty array for empty patch', () => {
    const result = parseDiff('');
    expect(result).toEqual([]);
  });

  test('should return empty array for undefined patch', () => {
    const result = parseDiff(undefined);
    expect(result).toEqual([]);
  });

  test('should return empty array for null patch', () => {
    const result = parseDiff(null);
    expect(result).toEqual([]);
  });

  // ✅ Multiple hunks with deletions
  test('should handle multiple hunks with deletions correctly', () => {
    const patch = `@@ -1,5 +1,4 @@
 function add(a, b) {
-  console.log('Adding');
   return a + b;
 }
 
@@ -10,3 +9,4 @@
 function multiply(a, b) {
+  console.log('Multiplying');
   return a * b;
 }`;

    const result = parseDiff(patch);
    expect(result).toHaveLength(1);
    expect(result[0].content).toContain('console.log(\'Multiplying\')');
    expect(result[0].line).toBe(10);
  });
});