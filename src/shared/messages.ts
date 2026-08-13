import type { AdapterParseResult } from "../adapters/types";
import type { Platform } from "../types/conversation";

export const MESSAGE_TYPE = {
  getPageStatus: "EXPORTAI_GET_PAGE_STATUS",
  pageStatus: "EXPORTAI_PAGE_STATUS",
  parseConversation: "EXPORTAI_PARSE_CONVERSATION",
  conversationParsed: "EXPORTAI_CONVERSATION_PARSED",
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

export type ContentScriptRequest = GetPageStatusMessage | ParseConversationMessage;
