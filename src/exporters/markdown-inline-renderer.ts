import type { InlineContent } from "../types/conversation";

export function renderInlineContent(content: InlineContent[]): string {
  return content.map(renderInline).join("");
}

export function renderInline(inline: InlineContent): string {
  const renderedText = inline.code ? renderInlineCode(inline.text) : renderFormattedText(inline);

  if (!("href" in inline)) return renderedText;

  const safeUrl = getSafeMarkdownUrl(inline.href);
  return safeUrl ? `[${renderedText}](<${safeUrl}>)` : renderedText;
}

export function getSafeMarkdownUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export function escapeMarkdownText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/([`*_\[\]<>~|!#+-])/g, "\\$1");
}

function renderFormattedText(inline: InlineContent): string {
  let value = escapeMarkdownText(inline.text);

  if (inline.bold && inline.italic) value = `***${value}***`;
  else if (inline.bold) value = `**${value}**`;
  else if (inline.italic) value = `*${value}*`;

  return inline.strikethrough ? `~~${value}~~` : value;
}

function renderInlineCode(code: string): string {
  const longestRun = Math.max(0, ...Array.from(code.matchAll(/`+/g), (match) => match[0].length));
  const delimiter = "`".repeat(longestRun + 1);
  const paddedCode = code.startsWith("`") || code.endsWith("`") ? ` ${code} ` : code;

  return `${delimiter}${paddedCode}${delimiter}`;
}
