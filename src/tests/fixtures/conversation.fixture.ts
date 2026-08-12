import { CONVERSATION_MODEL_VERSION, type Conversation } from "../../types/conversation";

export function createConversationFixture(): Conversation {
  return {
    id: "conversation-001",
    title: "ExportAI fixture",
    platform: "chatgpt",
    model: "example-model",
    sourceUrl: "https://chatgpt.com/c/conversation-001",
    exportedAt: "2026-08-12T12:00:00.000Z",
    messages: [
      { id: "message-user-001", role: "user", order: 0, originalText: "Explain a nested list.", blocks: [{ id: "block-user-001", type: "paragraph", content: [{ text: "Explain a nested list." }] }], metadata: {} },
      { id: "message-assistant-001", role: "assistant", order: 1, originalText: "A list may contain another list.", blocks: [
        { id: "block-heading-001", type: "heading", level: 2, content: [{ text: "Nested list" }] },
        { id: "block-list-001", type: "list", ordered: false, items: [{ id: "list-item-001", content: [{ text: "Parent item" }], children: { id: "block-list-002", type: "list", ordered: false, items: [{ id: "list-item-002", content: [{ text: "Child item", bold: true }] }] } }] },
        { id: "block-code-001", type: "code", language: "ts", code: "const exportable = true;" },
        { id: "block-math-001", type: "math", latex: "E = mc^2", display: true }
      ], metadata: {} },
      { id: "message-assistant-002", role: "assistant", order: 2, originalText: "Complete block coverage.", blocks: [
        { id: "block-text-001", type: "text", content: [{ text: "Plain text" }] },
        { id: "block-table-001", type: "table", headers: [[{ text: "Name" }]], rows: [[[{ text: "ExportAI" }]]] },
        { id: "block-image-001", type: "image", src: "https://example.com/image.png", alt: "Example image" },
        { id: "block-link-001", type: "link", href: "https://example.com", content: [{ text: "Example" }] },
        { id: "block-quote-001", type: "quote", blocks: [{ id: "block-quote-paragraph-001", type: "paragraph", content: [{ text: "Quoted text" }] }] },
        { id: "block-break-001", type: "thematic-break" },
        { id: "block-unknown-001", type: "unknown", rawText: "Unrecognized safe fallback" }
      ], metadata: {} }
    ],
    metadata: { messageCount: 3, isComplete: true, parseWarnings: [], modelVersion: CONVERSATION_MODEL_VERSION }
  };
}