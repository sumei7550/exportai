import type { Platform } from "../types/conversation";

export const MESSAGE_TYPE = {
  getPageStatus: "EXPORTAI_GET_PAGE_STATUS",
  pageStatus: "EXPORTAI_PAGE_STATUS",
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