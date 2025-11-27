import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildExportData,
  exportToJSON,
  exportToMarkdown,
  type ChatExportData,
} from "@/lib/export/formats";
import { slugify, generateExportFilename } from "@/lib/export/download";
import { copyToClipboard } from "@/lib/clipboard";

describe("chat-export", () => {
  describe("buildExportData", () => {
    it("should build export data with all fields", () => {
      const options = {
        conversationId: "conv-123",
        title: "Test Chat",
        character: { id: "char-1", name: "Sam" },
        model: { id: "gpt-4", provider: "openai" },
        messages: [
          { id: "msg-1", role: "user", content: "Hello", createdAt: new Date("2024-01-01T12:00:00Z") },
          { id: "msg-2", role: "assistant", content: "Hi there!", createdAt: new Date("2024-01-01T12:00:05Z") },
        ],
      };

      const result = buildExportData(options);

      expect(result.version).toBe(1);
      expect(result.exportedAt).toBeDefined();
      expect(result.conversation.id).toBe("conv-123");
      expect(result.conversation.title).toBe("Test Chat");
      expect(result.conversation.character.name).toBe("Sam");
      expect(result.conversation.model.id).toBe("gpt-4");
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[1].content).toBe("Hi there!");
    });

    it("should handle null conversation ID", () => {
      const options = {
        conversationId: null,
        title: null,
        character: { id: null, name: "Assistant" },
        model: { id: "local-model", provider: "lmstudio" },
        messages: [],
      };

      const result = buildExportData(options);

      expect(result.conversation.id).toBeNull();
      expect(result.conversation.title).toBeNull();
      expect(result.conversation.character.id).toBeNull();
    });

    it("should include system and tool messages", () => {
      const options = {
        conversationId: "conv-1",
        title: null,
        character: { id: "char-1", name: "Bot" },
        model: { id: "model-1", provider: "lmstudio" },
        messages: [
          { id: "msg-1", role: "system", content: "You are a helpful assistant" },
          { id: "msg-2", role: "user", content: "Help me" },
          { id: "msg-3", role: "tool", content: "Tool output" },
          { id: "msg-4", role: "assistant", content: "Here's help" },
        ],
      };

      const result = buildExportData(options);

      expect(result.messages).toHaveLength(4);
      expect(result.messages[0].role).toBe("system");
      expect(result.messages[2].role).toBe("tool");
    });
  });

  describe("exportToJSON", () => {
    it("should export valid JSON with proper formatting", () => {
      const data: ChatExportData = {
        version: 1,
        exportedAt: "2024-01-01T12:00:00.000Z",
        conversation: {
          id: "conv-1",
          title: "Test",
          character: { id: "c-1", name: "Sam" },
          model: { id: "gpt-4", provider: "openai" },
        },
        messages: [
          { id: "m-1", role: "user", content: "Hello", createdAt: "2024-01-01T12:00:00.000Z" },
        ],
      };

      const json = exportToJSON(data);
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe(1);
      expect(parsed.conversation.character.name).toBe("Sam");
      expect(parsed.messages[0].content).toBe("Hello");
    });
  });

  describe("exportToMarkdown", () => {
    it("should export valid markdown with headers and messages", () => {
      const data: ChatExportData = {
        version: 1,
        exportedAt: "2024-01-01T12:00:00.000Z",
        conversation: {
          id: "conv-1",
          title: "Test Chat",
          character: { id: "c-1", name: "Sam" },
          model: { id: "gpt-4", provider: "openai" },
        },
        messages: [
          { id: "m-1", role: "user", content: "Hello", createdAt: "2024-01-01T12:00:00.000Z" },
          { id: "m-2", role: "assistant", content: "Hi there!", createdAt: "2024-01-01T12:00:05.000Z" },
        ],
      };

      const md = exportToMarkdown(data);

      expect(md).toContain("# Chat Export");
      expect(md).toContain("**Character:** Sam");
      expect(md).toContain("**Model:** gpt-4 (openai)");
      expect(md).toContain("**Title:** Test Chat");
      expect(md).toContain("### 👤 User");
      expect(md).toContain("### 🤖 Assistant");
      expect(md).toContain("Hello");
      expect(md).toContain("Hi there!");
    });

    it("should include system and tool messages with proper labels", () => {
      const data: ChatExportData = {
        version: 1,
        exportedAt: "2024-01-01T12:00:00.000Z",
        conversation: {
          id: "conv-1",
          title: null,
          character: { id: "c-1", name: "Bot" },
          model: { id: "model", provider: "local" },
        },
        messages: [
          { id: "m-1", role: "system", content: "System prompt", createdAt: "2024-01-01T12:00:00.000Z" },
          { id: "m-2", role: "tool", content: "Tool output", createdAt: "2024-01-01T12:00:01.000Z" },
        ],
      };

      const md = exportToMarkdown(data);

      expect(md).toContain("### ⚙️ System");
      expect(md).toContain("### 🔧 Tool");
      expect(md).toContain("System prompt");
      expect(md).toContain("Tool output");
    });

    it("should not include title line when title is null", () => {
      const data: ChatExportData = {
        version: 1,
        exportedAt: "2024-01-01T12:00:00.000Z",
        conversation: {
          id: "conv-1",
          title: null,
          character: { id: "c-1", name: "Bot" },
          model: { id: "model", provider: "local" },
        },
        messages: [],
      };

      const md = exportToMarkdown(data);

      expect(md).not.toContain("**Title:**");
    });
  });

  describe("copyToClipboard", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it("should use navigator.clipboard when available", async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, "isSecureContext", {
        value: true,
        writable: true,
        configurable: true,
      });

      const result = await copyToClipboard("test text");

      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith("test text");
    });

    it("should return false on clipboard error", async () => {
      const mockWriteText = vi.fn().mockRejectedValue(new Error("Clipboard error"));
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, "isSecureContext", {
        value: true,
        writable: true,
        configurable: true,
      });

      const result = await copyToClipboard("test text");

      expect(result).toBe(false);
    });
  });

  describe("slugify", () => {
    it("should convert to lowercase and replace spaces with hyphens", () => {
      expect(slugify("Hello World")).toBe("hello-world");
    });

    it("should remove special characters", () => {
      expect(slugify("Sam (Friend)")).toBe("sam-friend");
    });

    it("should collapse multiple hyphens", () => {
      expect(slugify("Hello   World")).toBe("hello-world");
    });

    it("should trim hyphens from ends", () => {
      expect(slugify("  Hello World  ")).toBe("hello-world");
    });

    it("should handle empty string", () => {
      expect(slugify("")).toBe("");
    });

    it("should handle string with only special characters", () => {
      expect(slugify("@#$%")).toBe("");
    });
  });

  describe("generateExportFilename", () => {
    it("should generate JSON filename", () => {
      const filename = generateExportFilename("Sam Friend", "json");
      expect(filename).toMatch(/^sam-friend-\d{4}-\d{2}-\d{2}\.json$/);
    });

    it("should generate Markdown filename", () => {
      const filename = generateExportFilename("Test Bot", "md");
      expect(filename).toMatch(/^test-bot-\d{4}-\d{2}-\d{2}\.md$/);
    });

    it("should handle special characters in name", () => {
      const filename = generateExportFilename("Sam (Friend)", "json");
      expect(filename).toMatch(/^sam-friend-\d{4}-\d{2}-\d{2}\.json$/);
    });

    it("should fallback to 'chat' for empty name", () => {
      const filename = generateExportFilename("", "json");
      expect(filename).toMatch(/^chat-\d{4}-\d{2}-\d{2}\.json$/);
    });
  });
});
