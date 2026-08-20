import type { Platform } from "../types/conversation";
import type { PdfTemplateId } from "./pdf-template";

export const PDF_MIME_TYPE = "application/pdf" as const;
export const PDF_EXPORTER_NAME = "ExportAI PDF Exporter" as const;
export const PDF_EXPORTER_VERSION = "1.0.0" as const;

export type PdfExportErrorCode =
  | "EMPTY_CONVERSATION"
  | "INVALID_CONVERSATION"
  | "PDF_GENERATION_FAILED";

export type PdfExportResult =
  | { status: "success"; data: Uint8Array; filename: string; mimeType: typeof PDF_MIME_TYPE; warnings: PdfExportWarning[] }
  | { status: "error"; code: PdfExportErrorCode };

export interface PdfDocumentMetadata {
  platform: Platform;
  model?: string;

  exportedAt: string;
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

export interface PdfExportWarning {
  code:
    | "IMAGE_UNSAFE_SOURCE"
    | "IMAGE_EMBED_FAILED"
    | "MATH_LATEX_SOURCE_FALLBACK"
    | "UNKNOWN_BLOCK_FALLBACK"
    | "UNKNOWN_BLOCK_EMPTY";
  message: string;
}

/** @deprecated Use PdfExportWarning. */
export type PdfRenderWarning = PdfExportWarning;

export type PdfBlockPlan =
  | { type: "text"; content: PdfInlinePlan[] }
  | { type: "paragraph"; content: PdfInlinePlan[] }
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; content: PdfInlinePlan[] }
  | { type: "code"; code: string; language?: string }
  | { type: "list"; ordered: boolean; items: PdfListItemPlan[] }
  | { type: "table"; headers: PdfInlinePlan[][]; rows: PdfInlinePlan[][][] }
  | { type: "image"; src: string; alt: string; caption?: string }
  | { type: "math"; text: string }
  | { type: "unknown"; text: string }
  | { type: "quote"; blocks: PdfBlockPlan[] }
  | { type: "thematic-break" };

export interface PdfMessagePlan {
  id: string;
  role: "user" | "assistant";
  blocks: PdfBlockPlan[];
}

export interface PdfDocumentPlan {
  title: string;
  template: PdfTemplateId;
  metadata: PdfDocumentMetadata;
  messages: PdfMessagePlan[];
  warnings: PdfExportWarning[];
}

export type { PdfTemplateId } from "./pdf-template";

export function hasValidPdfSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;

  const signature = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4]);
  return signature === "%PDF-";
}
