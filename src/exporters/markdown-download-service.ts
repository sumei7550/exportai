export interface MarkdownDownloadRequest {
  markdown: string;
  filename: string;
}

export function saveMarkdownFile({ markdown, filename }: MarkdownDownloadRequest): Promise<void> {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
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
