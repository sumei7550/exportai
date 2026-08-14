import type { Conversation } from "../types/conversation";
import { createJsonDocument } from "./json-document";
import { createJsonFilename } from "./json-filename";
import { serializeJsonDocument } from "./json-serializer";
import { isValidJsonConversation } from "./json-validator";

export type JsonExportResult =
  | { status: "success"; json: string; filename: string }
  | { status: "error"; code: "EMPTY_CONVERSATION" | "INVALID_CONVERSATION" | "SERIALIZATION_FAILED" };

export function exportConversationToJson(conversation: Conversation): JsonExportResult {
  try {
    if (Array.isArray(conversation.messages) && conversation.messages.length === 0) {
      return { status: "error", code: "EMPTY_CONVERSATION" };
    }
    if (!isValidJsonConversation(conversation)) return { status: "error", code: "INVALID_CONVERSATION" };
  } catch {
    return { status: "error", code: "INVALID_CONVERSATION" };
  }

  try {
    const serialized = serializeJsonDocument(createJsonDocument(conversation));
    if (serialized.status === "error") return serialized;
    return { status: "success", json: serialized.json, filename: createJsonFilename(conversation.title) };
  } catch {
    return { status: "error", code: "SERIALIZATION_FAILED" };
  }
}
