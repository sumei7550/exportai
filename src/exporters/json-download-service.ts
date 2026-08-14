export interface JsonDownloadRequest {
  json: string;
  filename: string;
}

export function saveJsonFile({ json, filename }: JsonDownloadRequest): Promise<void> {
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  try {
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }

  return Promise.resolve();
}
