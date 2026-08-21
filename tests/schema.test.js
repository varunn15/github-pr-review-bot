const validateReview = require('../src/review/schema');

describe('validateReview', () => {
  const changedLines = [
    { line: 5, content: 'function multiply(a, b) {' },
    { line: 6, content: '  return a * b;' },
    { line: 7, content: '}' },
    { line: 8, content: '' },
    { line: 9, content: 'module.exports = { add, multiply };' }
  ];

  // ✅ Valid AI response
  test('should accept valid AI response', () => {
    const review = {
      findings: [
        {
          line: 6,
          severity: 'critical',
          comment: 'multiply performs division instead of multiplication'
        }
      ]
    };

    const result = validateReview(review, changedLines);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toEqual(review.findings[0]);
  });

  // ❌ Invalid line
  test('should reject finding on line that was not changed', () => {
    const review = {
      findings: [
        {
          line: 999,
          severity: 'critical',
          comment: 'Fake issue on non-existent line'
        }
      ]
    };

    const result = validateReview(review, changedLines);
    expect(result.findings).toHaveLength(0);
  });

  // ❌ Invalid severity
  test('should reject finding with invalid severity', () => {
    const review = {
      findings: [
        {
          line: 6,
          severity: 'super-critical',
          comment: 'Something is wrong'
        }
      ]
    };

    const result = validateReview(review, changedLines);
    expect(result.findings).toHaveLength(0);
  });

  // ❌ Missing fields
  test('should reject finding missing line', () => {
    const review = {
      findings: [
        {
          severity: 'critical',
          comment: 'Missing line number'
        }
      ]
    };

    const result = validateReview(review, changedLines);
    expect(result.findings).toHaveLength(0);
  });

  test('should reject finding missing severity', () => {
    const review = {
      findings: [
        {
          line: 6,
          comment: 'Missing severity'
        }
      ]
    };

    const result = validateReview(review, changedLines);
    expect(result.findings).toHaveLength(0);
  });

  test('should reject finding missing comment', () => {
    const review = {
      findings: [
        {
          line: 6,
          severity: 'critical'
        }
      ]
    };

    const result = validateReview(review, changedLines);
    expect(result.findings).toHaveLength(0);
  });

  // ✅ Multiple findings
  test('should handle multiple valid findings', () => {
    const review = {
      findings: [
        {
          line: 5,
          severity: 'critical',
          comment: 'Bug 1'
        },
        {
          line: 9,
          severity: 'warning',
          comment: 'Bug 2'
        },
        {
          line: 6,
          severity: 'suggestion',
          comment: 'Suggestion 1'
        }
      ]
    };

    const result = validateReview(review, changedLines);
    expect(result.findings).toHaveLength(3);
  });

  // Mixed valid and invalid findings
  test('should filter out invalid findings while keeping valid ones', () => {
    const review = {
      findings: [
        {
          line: 6,
          severity: 'critical',
          comment: 'Valid finding'
        },
        {
          line: 999,
          severity: 'critical',
          comment: 'Invalid line - should be filtered'
        },
        {
          line: 5,
          severity: 'warning',
          comment: 'Another valid finding'
        }
      ]
    };

    const result = validateReview(review, changedLines);
    expect(result.findings).toHaveLength(2);
    expect(result.findings[0].comment).toBe('Valid finding');
    expect(result.findings[1].comment).toBe('Another valid finding');
  });

  // ❌ Malformed AI response
  test('should handle malformed AI response gracefully', () => {
    const review = {
      findings: 'This is not an array'
    };

    expect(() => validateReview(review, changedLines)).toThrow(
      'Invalid review format: findings must be an array'
    );
  });

  test('should handle null review gracefully', () => {
    expect(() => validateReview(null, changedLines)).toThrow(
      'Invalid review format: findings must be an array'
    );
  });

  // ❌ Hallucinated line test
  test('should reject hallucinated line not in changed lines', () => {
    const review = {
      findings: [
        {
          line: 500,
          severity: 'critical',
          comment: 'Hallucinated issue on line 500'
        }
      ]
    };

    const result = validateReview(review, changedLines);
    expect(result.findings).toHaveLength(0);
    // Verify the hallucinated line was rejected
    expect(result.findings).not.toContainEqual(
      expect.objectContaining({ line: 500 })
    );
  });

  // ✅ Valid severity values
  test('should accept all valid severity values', () => {
    const severities = ['critical', 'warning', 'suggestion'];
    
    for (const severity of severities) {
      const review = {
        findings: [
          {
            line: 6,
            severity: severity,
            comment: `Testing ${severity} severity`
          }
        ]
      };

      const result = validateReview(review, changedLines);
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].severity).toBe(severity);
    }
  });
});