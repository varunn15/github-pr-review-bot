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
      issues: [
        {
          line: 6,
          severity: 'CRITICAL',
          title: 'Incorrect operation',
          explanation: 'multiply performs division instead of multiplication',
          suggestedFix: 'Change return a / b to return a * b'
        }
      ]
    };

    const result = validateReview(review, changedLines);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      line: 6,
      severity: 'critical',
      comment: expect.stringContaining('Incorrect operation')
    });
  });

  // ❌ Invalid line
  test('should reject finding on line that was not changed', () => {
    const review = {
      issues: [
        {
          line: 999,
          severity: 'CRITICAL',
          title: 'Fake issue',
          explanation: 'Fake issue on non-existent line',
          suggestedFix: 'Fix it'
        }
      ]
    };

    const result = validateReview(review, changedLines);
    expect(result.findings).toHaveLength(0);
  });

  // ❌ Invalid severity
  test('should reject finding with invalid severity', () => {
    const review = {
      issues: [
        {
          line: 6,
          severity: 'SUPER-CRITICAL',
          title: 'Something is wrong',
          explanation: 'Something is wrong',
          suggestedFix: 'Fix it'
        }
      ]
    };

    const result = validateReview(review, changedLines);
    expect(result.findings).toHaveLength(0);
  });

  // ❌ Missing fields
  test('should reject finding missing line', () => {
    const review = {
      issues: [
        {
          severity: 'CRITICAL',
          title: 'Missing line number',
          explanation: 'Missing line number',
          suggestedFix: 'Fix it'
        }
      ]
    };

    const result = validateReview(review, changedLines);
    expect(result.findings).toHaveLength(0);
  });

  test('should reject finding missing severity', () => {
    const review = {
      issues: [
        {
          line: 6,
          title: 'Missing severity',
          explanation: 'Missing severity',
          suggestedFix: 'Fix it'
        }
      ]
    };

    const result = validateReview(review, changedLines);
    expect(result.findings).toHaveLength(0);
  });

  test('should reject finding missing comment (empty explanation and suggestedFix)', () => {
    const review = {
      issues: [
        {
          line: 6,
          severity: 'CRITICAL',
          title: 'Missing comment',
          explanation: '',
          suggestedFix: ''
        }
      ]
    };

    const result = validateReview(review, changedLines);
    expect(result.findings).toHaveLength(0);
  });

  // ✅ Multiple findings
  test('should handle multiple valid findings', () => {
    const review = {
      issues: [
        {
          line: 5,
          severity: 'CRITICAL',
          title: 'Bug 1',
          explanation: 'Bug 1 description',
          suggestedFix: 'Fix 1'
        },
        {
          line: 9,
          severity: 'HIGH',
          title: 'Bug 2',
          explanation: 'Bug 2 description',
          suggestedFix: 'Fix 2'
        },
        {
          line: 6,
          severity: 'MEDIUM',
          title: 'Suggestion 1',
          explanation: 'Suggestion 1 description',
          suggestedFix: 'Fix 3'
        }
      ]
    };

    const result = validateReview(review, changedLines);
    expect(result.findings).toHaveLength(3);
  });

  // Mixed valid and invalid findings
  test('should filter out invalid findings while keeping valid ones', () => {
    const review = {
      issues: [
        {
          line: 6,
          severity: 'CRITICAL',
          title: 'Valid finding',
          explanation: 'Valid finding description',
          suggestedFix: 'Fix it'
        },
        {
          line: 999,
          severity: 'CRITICAL',
          title: 'Invalid line - should be filtered',
          explanation: 'Invalid line',
          suggestedFix: 'Fix it'
        },
        {
          line: 5,
          severity: 'HIGH',
          title: 'Another valid finding',
          explanation: 'Another valid finding description',
          suggestedFix: 'Fix it'
        }
      ]
    };

    const result = validateReview(review, changedLines);
    expect(result.findings).toHaveLength(2);
    expect(result.findings[0].comment).toContain('Valid finding');
    expect(result.findings[1].comment).toContain('Another valid finding');
  });

  // ❌ Malformed AI response
  test('should handle malformed AI response gracefully', () => {
    const review = {
      issues: 'This is not an array'
    };

    expect(() => validateReview(review, changedLines)).toThrow(
      'Invalid review format: issues must be an array'
    );
  });

  test('should handle null review gracefully', () => {
    expect(() => validateReview(null, changedLines)).toThrow(
      'Invalid review format: issues must be an array'
    );
  });

  // ❌ Hallucinated line test
  test('should reject hallucinated line not in changed lines', () => {
    const review = {
      issues: [
        {
          line: 500,
          severity: 'CRITICAL',
          title: 'Hallucinated issue on line 500',
          explanation: 'Hallucinated issue',
          suggestedFix: 'Fix it'
        }
      ]
    };

    const result = validateReview(review, changedLines);
    expect(result.findings).toHaveLength(0);
  });

  // ✅ Valid severity values
  test('should accept all valid severity values', () => {
    const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    
    for (const severity of severities) {
      const review = {
        issues: [
          {
            line: 6,
            severity: severity,
            title: `Testing ${severity} severity`,
            explanation: `Testing ${severity} severity description`,
            suggestedFix: 'Fix it'
          }
        ]
      };

      const result = validateReview(review, changedLines);
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].severity).toBe(severity.toLowerCase());
    }
  });
});