const { shouldFailCI } = require("../src/ciGate");

describe("ciGate", () => {
  // CI fails for HIGH severity
  test("fails CI for HIGH severity", () => {
    const issues = [{ severity: "HIGH" }];
    expect(shouldFailCI(issues)).toBe(true);
  });

  // CI fails for CRITICAL severity
  test("fails CI for CRITICAL severity", () => {
    const issues = [{ severity: "CRITICAL" }];
    expect(shouldFailCI(issues)).toBe(true);
  });

  // CI passes for MEDIUM severity
  test("passes CI for MEDIUM severity", () => {
    const issues = [{ severity: "MEDIUM" }];
    expect(shouldFailCI(issues)).toBe(false);
  });

  // CI passes for LOW severity
  test("passes CI for LOW severity", () => {
    const issues = [{ severity: "LOW" }];
    expect(shouldFailCI(issues)).toBe(false);
  });

  // CI passes when there are no issues
  test("passes CI when there are no issues", () => {
    expect(shouldFailCI([])).toBe(false);
  });

  // CI passes when null is passed
  test("passes CI when null is passed", () => {
    expect(shouldFailCI(null)).toBe(false);
  });

  // CI fails if any issue is HIGH or CRITICAL
  test("fails CI if any issue is HIGH or CRITICAL", () => {
    const issues = [
      { severity: "LOW" },
      { severity: "MEDIUM" },
      { severity: "HIGH" },
    ];
    expect(shouldFailCI(issues)).toBe(true);
  });

  // CI passes if all issues are MEDIUM or LOW
  test("passes CI if all issues are MEDIUM or LOW", () => {
    const issues = [
      { severity: "LOW" },
      { severity: "MEDIUM" },
    ];
    expect(shouldFailCI(issues)).toBe(false);
  });
});