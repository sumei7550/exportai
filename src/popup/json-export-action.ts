import type { JsonDownloadRequest } from "../exporters/json-download-service";
import { exportConversationToJson } from "../exporters/json-exporter";
import type { Conversation } from "../types/conversation";

export type SaveJsonFile = (request: JsonDownloadRequest) => Promise<void>;

export type PopupJsonExportResult =
  | { status: "success"; filename: string }
  | { status: "error"; reason: string };

export async function exportJsonFromPopup(
  conversation: Conversation,
  saveJsonFile: SaveJsonFile,
): Promise<PopupJsonExportResult> {
  const result = exportConversationToJson(conversation);
  if (result.status === "error") {
    if (result.code === "EMPTY_CONVERSATION") {
      return { status: "error", reason: "This conversation has no messages to export." };
    }
    if (result.code === "INVALID_CONVERSATION") {
      return { status: "error", reason: "This conversation contains invalid data and could not be exported." };
    }
    return { status: "error", reason: "The JSON file could not be generated. Please try again." };
  }

  try {
    await saveJsonFile({ json: result.json, filename: result.filename });
    return { status: "success", filename: result.filename };
  } catch {
    return { status: "error", reason: "The JSON file could not be saved. Please try again." };
  }
}
