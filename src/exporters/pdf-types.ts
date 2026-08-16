import type { Platform } from "../types/conversation";

export const PDF_MIME_TYPE = "application/pdf" as const;
export const PDF_EXPORTER_NAME = "ExportAI PDF Exporter" as const;
export const PDF_EXPORTER_VERSION = "1.0.0" as const;

export type PdfExportErrorCode =
  | "EMPTY_CONVERSATION"
  | "INVALID_CONVERSATION"
  | "PDF_GENERATION_FAILED";

export type PdfExportResult =
  | { status: "success"; data: Uint8Array; filename: string; mimeType: typeof PDF_MIME_TYPE }
  | { status: "error"; code: PdfExportErrorCode };

export interface PdfDocumentMetadata {
  platform: Platform;
  model?: string;
}

export interface PdfInlinePlan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  href?: string;
}

export interface PdfListItemPlan {
  content: PdfInlinePlan[];
  children?: PdfListBlockPlan;
}

export interface PdfListBlockPlan {
  ordered: boolean;
  items: PdfListItemPlan[];
}

export interface PdfTableBlockPlan {
  headers: PdfInlinePlan[][];
  rows: PdfInlinePlan[][][];
}

export type PdfBlockPlan =
  | { type: "text"; content: PdfInlinePlan[] }
  | { type: "paragraph"; content: PdfInlinePlan[] }
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; content: PdfInlinePlan[] }
  | { type: "code"; code: string; language?: string }
  | { type: "list"; ordered: boolean; items: PdfListItemPlan[] }
  | { type: "table"; headers: PdfInlinePlan[][]; rows: PdfInlinePlan[][][] }
  | { type: "quote"; blocks: PdfBlockPlan[] }
  | { type: "thematic-break" };

export interface PdfMessagePlan {
  role: "user" | "assistant";
  blocks: PdfBlockPlan[];
}

export interface PdfDocumentPlan {
  title: string;
  metadata: PdfDocumentMetadata;
  messages: PdfMessagePlan[];
}

export function hasValidPdfSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;

  const signature = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4]);
  return signature === "%PDF-";
}
