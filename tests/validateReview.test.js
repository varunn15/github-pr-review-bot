const { validateReview, VALID_SEVERITIES } = require("../src/validateReview");

describe("validateReview", () => {
  // Valid review
  test("accepts valid review with all fields", () => {
    const review = {
      issues: [
        {
          severity: "HIGH",
          file: "src/app.js",
          line: 10,
          title: "Security issue",
          explanation: "Unsafe input handling",
          suggestedFix: "Validate input before using it",
        },
      ],
    };

    expect(validateReview(review)).toBe(true);
  });

  // All valid severities
  test("accepts all valid severities", () => {
    for (const severity of VALID_SEVERITIES) {
      const review = {
        issues: [
          {
            severity: severity,
            file: "src/app.js",
            line: 10,
            title: "Test issue",
            explanation: "Test explanation",
            suggestedFix: "Test fix",
          },
        ],
      };

      expect(validateReview(review)).toBe(true);
    }
  });

  // Invalid severity
  test("rejects invalid severity", () => {
    const review = {
      issues: [
        {
          severity: "SUPER_HIGH",
          file: "src/app.js",
          line: 10,
          title: "Issue",
          explanation: "Problem",
          suggestedFix: "Fix",
        },
      ],
    };

    expect(() => validateReview(review)).toThrow(
      "Invalid severity: SUPER_HIGH"
    );
  });

  // Missing issues
  test("rejects missing issues array", () => {
    const review = {};

    expect(() => validateReview(review)).toThrow(
      "Invalid review format: issues must be an array"
    );
  });

  // Missing file
  test("rejects missing file", () => {
    const review = {
      issues: [
        {
          severity: "HIGH",
          line: 10,
          title: "Issue",
          explanation: "Problem",
          suggestedFix: "Fix",
        },
      ],
    };

    expect(() => validateReview(review)).toThrow(
      "Review issue missing file"
    );
  });

  // Missing title
  test("rejects missing title", () => {
    const review = {
      issues: [
        {
          severity: "HIGH",
          file: "src/app.js",
          line: 10,
          explanation: "Problem",
          suggestedFix: "Fix",
        },
      ],
    };

    expect(() => validateReview(review)).toThrow(
      "Review issue missing title"
    );
  });

  // Missing explanation
  test("rejects missing explanation", () => {
    const review = {
      issues: [
        {
          severity: "HIGH",
          file: "src/app.js",
          line: 10,
          title: "Issue",
          suggestedFix: "Fix",
        },
      ],
    };

    expect(() => validateReview(review)).toThrow(
      "Review issue missing explanation"
    );
  });

  // Missing suggestedFix
  test("rejects missing suggestedFix", () => {
    const review = {
      issues: [
        {
          severity: "HIGH",
          file: "src/app.js",
          line: 10,
          title: "Issue",
          explanation: "Problem",
        },
      ],
    };

    expect(() => validateReview(review)).toThrow(
      "Review issue missing suggestedFix"
    );
  });

  // Empty issues array
  test("accepts empty issues array", () => {
    const review = {
      issues: [],
    };

    expect(validateReview(review)).toBe(true);
  });

  // Null review
  test("rejects null review", () => {
    expect(() => validateReview(null)).toThrow(
      "Invalid review format: issues must be an array"
    );
  });
});