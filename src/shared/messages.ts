import type { AdapterParseResult } from "../adapters/types";
import type { Platform } from "../types/conversation";

export const MESSAGE_TYPE = {
  getPageStatus: "EXPORTAI_GET_PAGE_STATUS",
  pageStatus: "EXPORTAI_PAGE_STATUS",
  parseConversation: "EXPORTAI_PARSE_CONVERSATION",
  conversationParsed: "EXPORTAI_CONVERSATION_PARSED",
  exportFlow: "EXPORTAI_EXPORT_FLOW",
  exportRequest: "EXPORTAI_EXPORT_REQUEST",
} as const;

export type SupportedPlatform = Platform;

export interface PageStatus {
  platform: SupportedPlatform | null;
  pageUrl: string;
}

export interface GetPageStatusMessage {
  type: typeof MESSAGE_TYPE.getPageStatus;
}

export interface PageStatusMessage {
  type: typeof MESSAGE_TYPE.pageStatus;
  payload: PageStatus;
}

export interface ParseConversationMessage {
  type: typeof MESSAGE_TYPE.parseConversation;
}

export interface ConversationParsedMessage {
  type: typeof MESSAGE_TYPE.conversationParsed;
  payload: AdapterParseResult;
}

export type ExportFlowMessage = {
  type: typeof MESSAGE_TYPE.exportFlow;
  payload:
    | { status: "processing"; format: string }
    | { status: "success"; format: string; filename: string }
    | { status: "error"; format: string; reason: string }
    | { status: "idle" };
};

export interface ExportFormatMessage {
  type: typeof MESSAGE_TYPE.exportRequest;
  format: "PDF" | "Markdown" | "JSON";
}

export type ContentScriptRequest = GetPageStatusMessage | ParseConversationMessage | ExportFlowMessage | ExportFormatMessage;
