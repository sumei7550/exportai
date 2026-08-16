const WINDOWS_RESERVED_NAMES = new Set([
  "CON", "PRN", "AUX", "NUL",
  "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
  "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
]);

const DEFAULT_TITLE = "untitled-conversation";
const MAX_BASENAME_LENGTH = 120;

export function createPdfFilename(title: string): string {
  const normalizedTitle = title
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .trim()
    .replace(/[. ]+$/g, "");
  const truncatedTitle = normalizedTitle.slice(0, MAX_BASENAME_LENGTH).replace(/[. ]+$/g, "");
  const basename = truncatedTitle || DEFAULT_TITLE;
  const safeBasename = WINDOWS_RESERVED_NAMES.has(basename.toUpperCase()) ? `${basename}-conversation` : basename;
  return `${safeBasename}.pdf`;
}
