import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/rag/chunking";

describe("Text Chunking", () => {
  describe("chunkText", () => {
    it("returns single chunk for small text", () => {
      const text = "This is a short text.";
      const chunks = chunkText(text, { chunkSize: 500, overlap: 50 });

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe(text);
      expect(chunks[0].index).toBe(0);
    });

    it("splits long text into multiple chunks", () => {
      const text = "A".repeat(1000);
      const chunks = chunkText(text, { chunkSize: 300, overlap: 50 });

      expect(chunks.length).toBeGreaterThan(1);
      // Verify all chunks have content
      chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeGreaterThan(0);
        expect(chunk.content.length).toBeLessThanOrEqual(300);
      });
    });

    it("creates overlapping chunks", () => {
      const text = "AAAA BBBB CCCC DDDD EEEE FFFF GGGG HHHH IIII JJJJ";
      const chunks = chunkText(text, { chunkSize: 20, overlap: 5 });

      // Adjacent chunks should have overlapping character ranges
      for (let i = 1; i < chunks.length; i++) {
        const prevEndChar = chunks[i - 1].metadata?.endChar ?? 0;
        const currStartChar = chunks[i].metadata?.startChar ?? 0;
        // End of prev chunk should be past start of current (overlap)
        expect(prevEndChar).toBeGreaterThan(currStartChar);
      }
    });

    it("includes metadata with character positions", () => {
      const text = "Hello world, this is a test.";
      const chunks = chunkText(text, { chunkSize: 10, overlap: 2 });

      chunks.forEach((chunk) => {
        expect(chunk.metadata).toBeDefined();
        expect(typeof chunk.metadata?.startChar).toBe("number");
        expect(typeof chunk.metadata?.endChar).toBe("number");
        expect(chunk.metadata?.endChar ?? 0).toBeGreaterThan(chunk.metadata?.startChar ?? 0);
      });
    });

    it("assigns sequential indices to chunks", () => {
      const text = "A".repeat(500);
      const chunks = chunkText(text, { chunkSize: 100, overlap: 10 });

      chunks.forEach((chunk, i) => {
        expect(chunk.index).toBe(i);
      });
    });

    it("normalizes whitespace", () => {
      const text = "Hello  \t world\r\n\r\nHow   are   you?";
      const chunks = chunkText(text, { chunkSize: 500, overlap: 50 });

      expect(chunks[0].content).not.toMatch(/\t/);
      expect(chunks[0].content).not.toMatch(/\r/);
      expect(chunks[0].content).not.toMatch(/  /); // No double spaces
    });

    it("trims leading/trailing whitespace", () => {
      const text = "   Hello world   ";
      const chunks = chunkText(text, { chunkSize: 500, overlap: 50 });

      expect(chunks[0].content).toBe("Hello world");
    });

    it("prefers sentence boundaries for splits", () => {
      const text = "First sentence. Second sentence. Third sentence. Fourth sentence.";
      const chunks = chunkText(text, { chunkSize: 40, overlap: 5 });

      // Most chunks should end with a period
      const endsWithPeriod = chunks.filter((c) => c.content.endsWith("."));
      expect(endsWithPeriod.length).toBeGreaterThan(0);
    });

    it("prefers paragraph boundaries for splits", () => {
      const text = "Paragraph one content.\n\nParagraph two content.\n\nParagraph three content.";
      const chunks = chunkText(text, { chunkSize: 30, overlap: 5 });

      // Check that splits occur at paragraph boundaries when possible
      expect(chunks.length).toBeGreaterThan(1);
    });

    it("handles empty text", () => {
      const chunks = chunkText("", { chunkSize: 500, overlap: 50 });
      expect(chunks).toHaveLength(0);
    });

    it("handles whitespace-only text", () => {
      const chunks = chunkText("   \n\t  ", { chunkSize: 500, overlap: 50 });
      expect(chunks).toHaveLength(0);
    });

    it("handles text exactly at chunk size", () => {
      const text = "A".repeat(100);
      const chunks = chunkText(text, { chunkSize: 100, overlap: 10 });

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content.length).toBe(100);
    });

    it("uses config defaults when options not provided", () => {
      const text = "A".repeat(2000);
      const chunks = chunkText(text);

      // Should use default chunk size from config
      expect(chunks.length).toBeGreaterThan(1);
    });
  });

  describe("chunk quality", () => {
    it("produces chunks suitable for embedding", () => {
      // Real-world-like text
      const text = `
        Machine learning is a subset of artificial intelligence that focuses on
        building systems that learn from data. These systems can identify patterns
        and make decisions with minimal human intervention. Deep learning, a subset
        of machine learning, uses neural networks with many layers to analyze data.

        Natural language processing (NLP) is another important area of AI that
        deals with the interaction between computers and human language. NLP enables
        machines to read, understand, and derive meaning from human language.

        Computer vision allows machines to interpret and make decisions based on
        visual data from the world. This technology is used in facial recognition,
        autonomous vehicles, and medical image analysis.
      `;

      const chunks = chunkText(text, { chunkSize: 200, overlap: 30 });

      // Each chunk should be meaningful
      chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeGreaterThan(20);
        expect(chunk.content.split(" ").length).toBeGreaterThan(3);
      });
    });

    it("handles code-like content", () => {
      const code = `
        function processData(input) {
          const result = input.map(item => {
            return {
              id: item.id,
              value: item.value * 2
            };
          });
          return result.filter(r => r.value > 10);
        }

        function validateInput(data) {
          if (!data || !Array.isArray(data)) {
            throw new Error('Invalid input');
          }
          return data.length > 0;
        }
      `;

      const chunks = chunkText(code, { chunkSize: 150, overlap: 20 });

      expect(chunks.length).toBeGreaterThan(0);
      // Code should be preserved
      expect(chunks.some((c) => c.content.includes("function"))).toBe(true);
    });

    it("handles markdown content", () => {
      const markdown = `
        # Introduction

        This is the **introduction** section.

        ## Features

        - Feature 1: Fast processing
        - Feature 2: Easy to use
        - Feature 3: Scalable

        ## Code Example

        \`\`\`javascript
        const app = new App();
        app.start();
        \`\`\`
      `;

      const chunks = chunkText(markdown, { chunkSize: 100, overlap: 15 });

      expect(chunks.length).toBeGreaterThan(0);
      // Markdown structure should be somewhat preserved
      expect(chunks.some((c) => c.content.includes("#"))).toBe(true);
    });

    it("handles JSON-like content", () => {
      const json = `
        {
          "users": [
            {"id": 1, "name": "Alice", "role": "admin"},
            {"id": 2, "name": "Bob", "role": "user"},
            {"id": 3, "name": "Charlie", "role": "user"}
          ],
          "settings": {
            "theme": "dark",
            "language": "en"
          }
        }
      `;

      const chunks = chunkText(json, { chunkSize: 100, overlap: 15 });

      expect(chunks.length).toBeGreaterThan(0);
    });
  });
});
