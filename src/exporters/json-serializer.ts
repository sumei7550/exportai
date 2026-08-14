import type { JsonExportDocument } from "./json-document";

export type JsonSerializationResult =
  | { status: "success"; json: string }
  | { status: "error"; code: "SERIALIZATION_FAILED" };

export function serializeJsonDocument(document: JsonExportDocument): JsonSerializationResult {
  try {
    const json = JSON.stringify(document, null, 2);
    if (json === undefined) return { status: "error", code: "SERIALIZATION_FAILED" };
    return { status: "success", json: `${json}\n` };
  } catch {
    return { status: "error", code: "SERIALIZATION_FAILED" };
  }
}
