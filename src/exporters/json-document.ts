import type { Block, Conversation, InlineContent, ListBlock, Message, ParseWarning } from "../types/conversation";

export const JSON_SCHEMA_VERSION = "1.0" as const;
export const JSON_EXPORTER_NAME = "ExportAI JSON Exporter" as const;
export const JSON_EXPORTER_VERSION = "1.0.0" as const;

export interface JsonExportDocument {
  schemaVersion: typeof JSON_SCHEMA_VERSION;
  exportMetadata: {
    exporter: typeof JSON_EXPORTER_NAME;
    exporterVersion: typeof JSON_EXPORTER_VERSION;
    exportedAt: string;
  };
  conversationMetadata: {
    id: string;
    title: string;
    platform: Conversation["platform"];
    messageCount: number;
    isComplete: boolean;
    parseWarnings: JsonParseWarning[];
    modelVersion: string;
    model?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  messages: JsonMessage[];
}

export interface JsonParseWarning { code: string; message: string; messageId?: string; }

export interface JsonMessage {
  id: string;
  role: Message["role"];
  order: number;
  blocks: JsonBlock[];
  originalText: string;
  metadata: { isPartial: boolean; createdAt?: string };
}

export type JsonInlineContent = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  href?: string;
};

export type JsonBlock =
  | { id: string; type: "text" | "paragraph"; content: JsonInlineContent[] }
  | { id: string; type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; content: JsonInlineContent[] }
  | { id: string; type: "list"; ordered: boolean; items: JsonListItem[] }
  | { id: string; type: "code"; code: string; language?: string }
  | { id: string; type: "table"; headers: JsonInlineContent[][]; rows: JsonInlineContent[][][] }
  | { id: string; type: "math"; latex: string; display: boolean }
  | { id: string; type: "image"; src: string; alt: string; caption?: string }
  | { id: string; type: "link"; href: string; content: JsonInlineContent[] }
  | { id: string; type: "quote"; blocks: JsonBlock[] }
  | { id: string; type: "thematic-break" }
  | { id: string; type: "unknown"; rawText: string; sourceTag?: string };

export interface JsonListItem {
  id: string;
  content: JsonInlineContent[];
  children?: Extract<JsonBlock, { type: "list" }>;
}

export function createJsonDocument(conversation: Conversation): JsonExportDocument {
  return {
    schemaVersion: JSON_SCHEMA_VERSION,
    exportMetadata: {
      exporter: JSON_EXPORTER_NAME,
      exporterVersion: JSON_EXPORTER_VERSION,
      exportedAt: conversation.exportedAt,
    },
    conversationMetadata: mapConversationMetadata(conversation),
    messages: [...conversation.messages].sort((left, right) => left.order - right.order).map(mapMessage),
  };
}

function mapConversationMetadata(conversation: Conversation): JsonExportDocument["conversationMetadata"] {
  const metadata: JsonExportDocument["conversationMetadata"] = {
    id: conversation.id,
    title: conversation.title,
    platform: conversation.platform,
    messageCount: conversation.metadata.messageCount,
    isComplete: conversation.metadata.isComplete,
    parseWarnings: conversation.metadata.parseWarnings.map(mapParseWarning),
    modelVersion: conversation.metadata.modelVersion,
  };
  if (conversation.model !== undefined) metadata.model = conversation.model;
  if (conversation.createdAt !== undefined) metadata.createdAt = conversation.createdAt;
  if (conversation.updatedAt !== undefined) metadata.updatedAt = conversation.updatedAt;
  return metadata;
}

function mapParseWarning(warning: ParseWarning): JsonParseWarning {
  const mapped: JsonParseWarning = { code: warning.code, message: warning.message };
  if (warning.messageId !== undefined) mapped.messageId = warning.messageId;
  return mapped;
}

function mapMessage(message: Message): JsonMessage {
  const metadata: JsonMessage["metadata"] = { isPartial: message.metadata.isPartial ?? false };
  if (message.metadata.createdAt !== undefined) metadata.createdAt = message.metadata.createdAt;
  return {
    id: message.id,
    role: message.role,
    order: message.order,
    blocks: message.blocks.map(mapBlock),
    originalText: message.originalText,
    metadata,
  };
}

function mapInlineContent(inline: InlineContent): JsonInlineContent {
  const mapped: JsonInlineContent = { text: inline.text };
  if (inline.bold !== undefined) mapped.bold = inline.bold;
  if (inline.italic !== undefined) mapped.italic = inline.italic;
  if (inline.strikethrough !== undefined) mapped.strikethrough = inline.strikethrough;
  if (inline.code !== undefined) mapped.code = inline.code;
  if ("href" in inline) mapped.href = inline.href;
  return mapped;
}

function mapList(block: ListBlock): Extract<JsonBlock, { type: "list" }> {
  return {
    id: block.id,
    type: "list",
    ordered: block.ordered,
    items: block.items.map((item) => {
      const mapped: JsonListItem = { id: item.id, content: item.content.map(mapInlineContent) };
      if (item.children !== undefined) mapped.children = mapList(item.children);
      return mapped;
    }),
  };
}

function mapBlock(block: Block): JsonBlock {
  switch (block.type) {
    case "text":
    case "paragraph":
      return { id: block.id, type: block.type, content: block.content.map(mapInlineContent) };
    case "heading":
      return { id: block.id, type: block.type, level: block.level, content: block.content.map(mapInlineContent) };
    case "list": return mapList(block);
    case "code": {
      const mapped: Extract<JsonBlock, { type: "code" }> = { id: block.id, type: block.type, code: block.code };
      if (block.language !== undefined) mapped.language = block.language;
      return mapped;
    }
    case "table":
      return {
        id: block.id,
        type: block.type,
        headers: block.headers.map((cell) => cell.map(mapInlineContent)),
        rows: block.rows.map((row) => row.map((cell) => cell.map(mapInlineContent))),
      };
    case "math": return { id: block.id, type: block.type, latex: block.latex, display: block.display };
    case "image": {
      const mapped: Extract<JsonBlock, { type: "image" }> = {
        id: block.id,
        type: block.type,
        src: block.src,
        alt: block.alt,
      };
      if (block.caption !== undefined) mapped.caption = block.caption;
      return mapped;
    }
    case "link":
      return {
        id: block.id,
        type: block.type,
        href: block.href,
        content: block.content.map(mapInlineContent),
      };
    case "quote": return { id: block.id, type: block.type, blocks: block.blocks.map(mapBlock) };
    case "thematic-break": return { id: block.id, type: block.type };
    case "unknown": {
      const mapped: Extract<JsonBlock, { type: "unknown" }> = { id: block.id, type: block.type, rawText: block.rawText };
      if (block.sourceTag !== undefined) mapped.sourceTag = block.sourceTag;
      return mapped;
    }
  }
}
