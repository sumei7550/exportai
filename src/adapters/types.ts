import type { Conversation, Platform } from "../types/conversation";

export interface PageLocation {
  hostname: string;
  href: string;
  pathname: string;
}

export type AdapterParseResult =
  | { status: "success"; conversation: Conversation }
  | { status: "empty"; reason: string }
  | { status: "unsupported"; reason: string }
  | { status: "error"; reason: string };

export interface PlatformAdapter {
  readonly platform: Platform;
  isSupportedPage(location: PageLocation): boolean;
  parse(document: Document, location: PageLocation): AdapterParseResult;
}
