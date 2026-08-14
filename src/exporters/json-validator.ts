import type { BlockType, Conversation, MessageRole, Platform } from "../types/conversation";

const PLATFORMS = new Set<Platform>(["chatgpt", "claude", "gemini"]);
const MESSAGE_ROLES = new Set<MessageRole>(["user", "assistant", "system", "unknown"]);
const BLOCK_TYPES = new Set<BlockType>([
  "text", "paragraph", "heading", "list", "code", "table", "image", "math", "link", "quote", "thematic-break", "unknown",
]);

type UnknownRecord = Record<string, unknown>;

export function isValidJsonConversation(value: unknown): value is Conversation {
  if (!isRecord(value) || !isNonEmptyString(value.id) || typeof value.title !== "string") return false;
  if (typeof value.platform !== "string" || !PLATFORMS.has(value.platform as Platform)) return false;
  if (typeof value.sourceUrl !== "string" || typeof value.exportedAt !== "string") return false;
  if (!isOptionalString(value.model) || !isOptionalString(value.createdAt) || !isOptionalString(value.updatedAt)) return false;
  if (!Array.isArray(value.messages) || !isConversationMetadata(value.metadata, value.messages.length)) return false;
  if (!value.messages.every(isMessage)) return false;

  const orders = value.messages.map((message) => (message as UnknownRecord).order);
  if (new Set(orders).size !== orders.length) return false;
  return orders.every(isNonNegativeInteger);
}

function isConversationMetadata(value: unknown, messageCount: number): boolean {
  if (!isRecord(value) || value.messageCount !== messageCount) return false;
  if (!isNonNegativeInteger(value.messageCount) || typeof value.isComplete !== "boolean") return false;
  if (typeof value.modelVersion !== "string" || !Array.isArray(value.parseWarnings)) return false;
  return value.parseWarnings.every(isParseWarning);
}

function isParseWarning(value: unknown): boolean {
  return isRecord(value)
    && isNonEmptyString(value.code)
    && typeof value.message === "string"
    && isOptionalString(value.messageId);
}

function isMessage(value: unknown): boolean {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonNegativeInteger(value.order)) return false;
  if (typeof value.role !== "string" || !MESSAGE_ROLES.has(value.role as MessageRole)) return false;
  if (typeof value.originalText !== "string" || !Array.isArray(value.blocks) || !value.blocks.every(isBlock)) return false;
  return isMessageMetadata(value.metadata);
}

function isMessageMetadata(value: unknown): boolean {
  return isRecord(value)
    && (value.isPartial === undefined || typeof value.isPartial === "boolean")
    && isOptionalString(value.createdAt)
    && (value.sourceAttributes === undefined || isStringRecord(value.sourceAttributes));
}

function isBlock(value: unknown): boolean {
  if (!isRecord(value) || !isNonEmptyString(value.id) || typeof value.type !== "string") return false;
  if (!BLOCK_TYPES.has(value.type as BlockType)) return false;

  switch (value.type) {
    case "text":
    case "paragraph":
      return isInlineContentArray(value.content);
    case "heading":
      return isIntegerInRange(value.level, 1, 6) && isInlineContentArray(value.content);
    case "list":
      return isListBlock(value);
    case "code":
      return typeof value.code === "string" && isOptionalString(value.language);
    case "table":
      return isTableHeaders(value.headers) && isTableRows(value.rows);
    case "math":
      return typeof value.latex === "string" && typeof value.display === "boolean";
    case "image":
      return typeof value.src === "string" && typeof value.alt === "string" && isOptionalString(value.caption);
    case "link":
      return typeof value.href === "string" && isInlineContentArray(value.content);
    case "quote":
      return Array.isArray(value.blocks) && value.blocks.every(isBlock);
    case "thematic-break":
      return true;
    case "unknown":
      return typeof value.rawText === "string" && isOptionalString(value.sourceTag);
    default:
      return false;
  }
}

function isListBlock(value: UnknownRecord): boolean {
  return typeof value.ordered === "boolean"
    && Array.isArray(value.items)
    && value.items.every((item) => isRecord(item)
      && isNonEmptyString(item.id)
      && isInlineContentArray(item.content)
      && (item.children === undefined || (isRecord(item.children) && item.children.type === "list" && isBlock(item.children))));
}

function isTableHeaders(value: unknown): boolean {
  return Array.isArray(value) && value.every(isInlineContentArray);
}

function isTableRows(value: unknown): boolean {
  return Array.isArray(value)
    && value.every((row) => Array.isArray(row) && row.every(isInlineContentArray));
}

function isInlineContentArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(isInlineContent);
}

function isInlineContent(value: unknown): boolean {
  return isRecord(value)
    && typeof value.text === "string"
    && isOptionalBoolean(value.bold)
    && isOptionalBoolean(value.italic)
    && isOptionalBoolean(value.strikethrough)
    && isOptionalBoolean(value.code)
    && isOptionalString(value.href);
}

function isStringRecord(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): boolean {
  return isNonNegativeInteger(value) && value >= minimum && value <= maximum;
}
