/**
 * Test fixtures for RAG tests
 *
 * Centralized test data to ensure consistency and valid formats.
 */

// Valid UUID format for non-existent entities
export const TEST_UUIDS = {
  // Users
  nonExistentUser: "00000000-0000-0000-0000-000000000001",
  testUser: "00000000-0000-0000-0000-000000000002",

  // Characters
  nonExistentCharacter: "00000000-0000-0000-0000-000000000010",
  testCharacter: "00000000-0000-0000-0000-000000000011",

  // Conversations
  nonExistentConversation: "00000000-0000-0000-0000-000000000020",
  testConversation: "00000000-0000-0000-0000-000000000021",

  // Files
  nonExistentFile: "00000000-0000-0000-0000-000000000030",
  testFile: "00000000-0000-0000-0000-000000000031",

  // Memory items
  nonExistentMemory: "00000000-0000-0000-0000-000000000040",
  testMemory: "00000000-0000-0000-0000-000000000041",
} as const;

// Sample texts for embedding tests
export const TEST_TEXTS = {
  short: "Hello, world!",
  medium: "The quick brown fox jumps over the lazy dog. This is a test sentence for embedding generation.",
  long: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.`,
  empty: "",
  whitespace: "   \n\t   ",
  special: "Test @#$%^&*() 你好 🎉 émojis",
  code: "function add(a, b) { return a + b; }",
  multilingual: {
    english: "Hello, how are you?",
    french: "Bonjour, comment allez-vous?",
    chinese: "你好，你好吗？",
    spanish: "Hola, ¿cómo estás?",
  },
} as const;

// Semantic similarity test pairs
export const SEMANTIC_PAIRS = {
  similar: {
    a: "How do I reset my password?",
    b: "I forgot my login credentials",
    expectedSimilarity: 0.7, // Minimum expected similarity
  },
  unrelated: {
    a: "How do I reset my password?",
    b: "The weather is nice today",
    maxSimilarity: 0.5, // Maximum expected similarity
  },
} as const;

// Test document content for chunking
export const TEST_DOCUMENTS = {
  shortText: "This is a short document.",
  mediumText: `This is a medium-length document with multiple sentences.
It contains some basic information about testing.
The chunking algorithm should handle this properly.`,
  longText: Array(20)
    .fill("This is a paragraph of text that will be repeated to create a long document for chunking tests.")
    .join("\n\n"),
  markdown: `# Heading 1

This is a paragraph under heading 1.

## Heading 2

- List item 1
- List item 2
- List item 3

### Heading 3

Some code:
\`\`\`javascript
const x = 1;
\`\`\`
`,
  json: JSON.stringify({ key: "value", nested: { array: [1, 2, 3] } }, null, 2),
} as const;

/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.TRAVIS
  );
}

/**
 * Skip test in CI environment (for integration tests requiring LM Studio)
 */
export function skipInCI(testFn: () => void | Promise<void>): () => void | Promise<void> {
  return async () => {
    if (isCI()) {
      console.log("⏭️  Skipping in CI environment");
      return;
    }
    return testFn();
  };
}

/**
 * Cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}
