// Import the real module (no mocking)
const { hasBeenReviewed } = require('../src/github/reviewStatus');

describe('Idempotency', () => {
  const mockOctokit = {
    rest: {
      pulls: {
        listReviews: jest.fn(),
      },
    },
  };

  const owner = 'test-owner';
  const repo = 'test-repo';
  const pullNumber = 1;
  const commitSha = 'abc123def456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1 - No existing reviews
  test('should return false when no reviews exist', async () => {
    mockOctokit.rest.pulls.listReviews.mockResolvedValue({
      data: [],
    });

    const result = await hasBeenReviewed(mockOctokit, owner, repo, pullNumber, commitSha);
    expect(result).toBe(false);
  });

  // Test 2 - Same SHA reviewed
  test('should return true when commit already reviewed by bot', async () => {
    mockOctokit.rest.pulls.listReviews.mockResolvedValue({
      data: [
        {
          body: '<!-- github-pr-review-bot -->\n\n🤖 AI Code Review\n\n**Commit:** abc123def456\n\n✅ No issues found.',
        },
      ],
    });

    const result = await hasBeenReviewed(mockOctokit, owner, repo, pullNumber, commitSha);
    expect(result).toBe(true);
  });

  // Test 3 - New commit not reviewed
  test('should return false for new commit SHA', async () => {
    mockOctokit.rest.pulls.listReviews.mockResolvedValue({
      data: [
        {
          body: '<!-- github-pr-review-bot -->\n\n🤖 AI Code Review\n\n**Commit:** old789\n\n✅ No issues found.',
        },
      ],
    });

    const result = await hasBeenReviewed(mockOctokit, owner, repo, pullNumber, commitSha);
    expect(result).toBe(false);
  });

  // Test 4 - Non-bot review should be ignored
  test('should ignore reviews from other users', async () => {
    mockOctokit.rest.pulls.listReviews.mockResolvedValue({
      data: [
        {
          body: 'Looks good to me!',
        },
        {
          body: '<!-- github-pr-review-bot -->\n\n🤖 AI Code Review\n\n**Commit:** old789\n\n✅ No issues found.',
        },
      ],
    });

    const result = await hasBeenReviewed(mockOctokit, owner, repo, pullNumber, commitSha);
    expect(result).toBe(false);
  });

  // Test 5 - Multiple bot reviews with different SHAs
  test('should find correct SHA among multiple bot reviews', async () => {
    mockOctokit.rest.pulls.listReviews.mockResolvedValue({
      data: [
        {
          body: '<!-- github-pr-review-bot -->\n\n🤖 AI Code Review\n\n**Commit:** old123\n\n✅ No issues found.',
        },
        {
          body: '<!-- github-pr-review-bot -->\n\n🤖 AI Code Review\n\n**Commit:** abc123def456\n\n⚠️ Found 1 issue.',
        },
        {
          body: '<!-- github-pr-review-bot -->\n\n🤖 AI Code Review\n\n**Commit:** newer789\n\n✅ No issues found.',
        },
      ],
    });

    const result = await hasBeenReviewed(mockOctokit, owner, repo, pullNumber, commitSha);
    expect(result).toBe(true);
  });

  // Test 6 - Empty review body handling
  test('should handle empty review bodies gracefully', async () => {
    mockOctokit.rest.pulls.listReviews.mockResolvedValue({
      data: [
        {
          body: null,
        },
        {
          body: '',
        },
        {
          body: '<!-- github-pr-review-bot -->\n\n🤖 AI Code Review\n\n**Commit:** abc123def456\n\n✅ No issues found.',
        },
      ],
    });

    const result = await hasBeenReviewed(mockOctokit, owner, repo, pullNumber, commitSha);
    expect(result).toBe(true);
  });
});