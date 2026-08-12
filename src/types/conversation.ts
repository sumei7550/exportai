export const CONVERSATION_MODEL_VERSION = "1.0" as const;

export type Platform = "chatgpt" | "claude" | "gemini";
export type MessageRole = "user" | "assistant" | "system" | "unknown";
export type ExportFormat = "pdf" | "markdown" | "json";

export interface InlineText { text: string; bold?: boolean; italic?: boolean; strikethrough?: boolean; code?: boolean; }
export interface LinkInline extends InlineText { href: string; }
export type InlineContent = InlineText | LinkInline;

export interface BlockBase { id: string; type: BlockType; }
export interface TextBlock extends BlockBase { type: "text"; content: InlineContent[]; }
export interface ParagraphBlock extends BlockBase { type: "paragraph"; content: InlineContent[]; }
export interface HeadingBlock extends BlockBase { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; content: InlineContent[]; }
export interface ListItem { id: string; content: InlineContent[]; children?: ListBlock; }
export interface ListBlock extends BlockBase { type: "list"; ordered: boolean; items: ListItem[]; }
export interface CodeBlock extends BlockBase { type: "code"; code: string; language?: string; }
export interface TableBlock extends BlockBase { type: "table"; headers: InlineContent[][]; rows: InlineContent[][][]; }
export interface ImageBlock extends BlockBase { type: "image"; src: string; alt: string; caption?: string; }
export interface MathBlock extends BlockBase { type: "math"; latex: string; display: boolean; }
export interface LinkBlock extends BlockBase { type: "link"; href: string; content: InlineContent[]; }
export interface QuoteBlock extends BlockBase { type: "quote"; blocks: Block[]; }
export interface ThematicBreakBlock extends BlockBase { type: "thematic-break"; }
export interface UnknownBlock extends BlockBase { type: "unknown"; rawText: string; sourceTag?: string; }
export type BlockType = "text" | "heading" | "paragraph" | "list" | "code" | "table" | "image" | "math" | "link" | "quote" | "thematic-break" | "unknown";
export type Block = TextBlock | ParagraphBlock | HeadingBlock | ListBlock | CodeBlock | TableBlock | ImageBlock | MathBlock | LinkBlock | QuoteBlock | ThematicBreakBlock | UnknownBlock;

export interface ParseWarning { code: string; message: string; messageId?: string; }
export interface ConversationMetadata { messageCount: number; isComplete: boolean; parseWarnings: ParseWarning[]; modelVersion: typeof CONVERSATION_MODEL_VERSION; }
export interface MessageMetadata { createdAt?: string; isPartial?: boolean; sourceAttributes?: Record<string, string>; }
export interface Message { id: string; role: MessageRole; order: number; originalText: string; blocks: Block[]; metadata: MessageMetadata; }
export interface Conversation { id: string; title: string; platform: Platform; model?: string; sourceUrl: string; createdAt?: string; updatedAt?: string; exportedAt: string; messages: Message[]; metadata: ConversationMetadata; }