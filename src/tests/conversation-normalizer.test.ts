import { describe, expect, it } from "vitest";
import { detectPlatformFromHostname, getPlatformLabel } from "../constants/platforms";
import { normalizeConversation } from "../parser/conversation-normalizer";
import { validateConversation } from "../parser/conversation-validator";
import { createConversationFixture } from "./fixtures/conversation.fixture";

describe("unified conversation model", () => {
  it("creates a valid platform-independent conversation fixture", () => {
    expect(validateConversation(createConversationFixture())).toEqual([]);
  });

  it("represents every Phase 2 block type without platform-specific fields", () => {
    const blockTypes = createConversationFixture().messages.flatMap((message) => message.blocks.map((block) => block.type));
    expect(blockTypes).toEqual(expect.arrayContaining([
      "text", "paragraph", "heading", "list", "code", "table", "image", "math", "link", "quote", "thematic-break", "unknown",
    ]));
  });

  it("normalizes message order and preserves an empty message as a readable fallback", () => {
    const fixture = createConversationFixture();
    fixture.messages[1] = { ...fixture.messages[1], order: 8, blocks: [] };
    const result = normalizeConversation(fixture);
    expect(result.conversation.messages[1].order).toBe(1);
    expect(result.conversation.messages[1].blocks[0].type).toBe("paragraph");
    expect(result.warnings.map((warning) => warning.code)).toEqual(["message-order-normalized", "empty-message-blocks"]);
  });

  it("reports invalid conversation metadata without relying on a platform DOM", () => {
    const fixture = createConversationFixture();
    fixture.metadata.messageCount = 4;
    fixture.messages[0] = { ...fixture.messages[0], order: 5 };
    expect(validateConversation(fixture).map((issue) => issue.path)).toEqual(["metadata.messageCount", "messages.0.order"]);
  });
});

describe("platform constants", () => {
  it("maps supported domains to one shared platform type", () => {
    expect(detectPlatformFromHostname("chatgpt.com")).toBe("chatgpt");
    expect(detectPlatformFromHostname("claude.ai")).toBe("claude");
    expect(detectPlatformFromHostname("gemini.google.com")).toBe("gemini");
    expect(detectPlatformFromHostname("example.com")).toBeNull();
    expect(getPlatformLabel("chatgpt")).toBe("ChatGPT");
  });
});