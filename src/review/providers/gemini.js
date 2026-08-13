const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Define the JSON schema for the review response
const reviewSchema = {
  type: "object",
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          line: {
            type: "integer",
            description: "The line number of the changed code",
          },
          severity: {
            type: "string",
            enum: ["critical", "warning", "suggestion"],
            description: "The severity level of the finding",
          },
          comment: {
            type: "string",
            description: "A concise explanation of the issue",
          },
        },
        required: ["line", "severity", "comment"],
      },
    },
  },
  required: ["findings"],
};

async function reviewCode(code) {
const prompt = `
You are a senior software engineer performing a code review.

Review ONLY the changed lines provided below.

Look for:
- bugs
- incorrect logic
- runtime errors
- security problems
- important edge cases
- mismatches between function names and behavior

Do NOT comment on:
- formatting
- personal style preferences
- trivial improvements

If there are no issues, return an empty findings array.

Changed code:


${code}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: reviewSchema,
      },
    });

    // Parse the JSON response and return as JavaScript object
    const parsedResponse = JSON.parse(response.text);
    return parsedResponse;
  } catch (error) {
    console.error("Gemini structured output failed:", error.message);
    return null;
  }
}

module.exports = reviewCode;