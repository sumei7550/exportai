import type { InlineContent } from "../../types/conversation";
import { CHATGPT_DOM } from "./chatgpt-selectors";

export interface InlineStyle {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  href?: string;
}

export function normalizeReadableText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function safeTextContent(node: Node): string {
  try {
    return normalizeReadableText(node.textContent ?? "");
  } catch {
    return "";
  }
}

export function isExcludedElement(element: Element): boolean {
  return element.matches(CHATGPT_DOM.excludedContent);
}

export function isMathElement(element: Element): boolean {
  return element.matches(CHATGPT_DOM.math);
}

export function sanitizeLink(rawHref: string | null, baseUrl: string): string | null {
  if (!rawHref) return null;
  try {
    const url = new URL(rawHref, baseUrl);
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function sanitizeImageSource(rawSrc: string | null, baseUrl: string): string | null {
  if (!rawSrc) return null;
  if (rawSrc.startsWith("data:image/") || rawSrc.startsWith("blob:")) return rawSrc;
  try {
    const url = new URL(rawSrc, baseUrl);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function appendInline(target: InlineContent[], item: InlineContent): void {
  if (!item.text) return;
  const previous = target.at(-1);
  if (previous && inlineStylesEqual(previous, item)) {
    previous.text += item.text;
    return;
  }
  target.push(item);
}

function inlineStylesEqual(left: InlineContent, right: InlineContent): boolean {
  const leftHref = "href" in left ? left.href : undefined;
  const rightHref = "href" in right ? right.href : undefined;
  return left.bold === right.bold
    && left.italic === right.italic
    && left.strikethrough === right.strikethrough
    && left.code === right.code
    && leftHref === rightHref;
}

function nextStyle(element: Element, inherited: InlineStyle, baseUrl: string): InlineStyle {
  const tag = element.tagName.toLowerCase();
  const style: InlineStyle = { ...inherited };
  if (tag === "strong" || tag === "b") style.bold = true;
  if (tag === "em" || tag === "i") style.italic = true;
  if (tag === "del" || tag === "s" || tag === "strike") style.strikethrough = true;
  if (tag === "code" && element.parentElement?.tagName.toLowerCase() !== "pre") style.code = true;
  if (tag === "a") style.href = sanitizeLink(element.getAttribute("href"), baseUrl) ?? undefined;
  return style;
}

function visitInline(node: Node, inherited: InlineStyle, baseUrl: string, target: InlineContent[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue ?? "";
    if (!text) return;
    const item: InlineContent = inherited.href
      ? { text, href: inherited.href, bold: inherited.bold, italic: inherited.italic, strikethrough: inherited.strikethrough, code: inherited.code }
      : { text, bold: inherited.bold, italic: inherited.italic, strikethrough: inherited.strikethrough, code: inherited.code };
    appendInline(target, item);
    return;
  }
  if (!(node instanceof Element) || isExcludedElement(node) || isMathElement(node) || node.tagName.toLowerCase() === "img") return;
  if (node.tagName.toLowerCase() === "br") {
    appendInline(target, { text: "\n", ...inherited });
    return;
  }
  const style = nextStyle(node, inherited, baseUrl);
  node.childNodes.forEach((child) => visitInline(child, style, baseUrl, target));
}

export function parseInlineContent(node: Node, baseUrl: string): InlineContent[] {
  const content: InlineContent[] = [];
  node.childNodes.forEach((child) => visitInline(child, {}, baseUrl, content));
  return content
    .map((item) => ({ ...item, text: item.text.replace(/\u00a0/g, " ") }))
    .filter((item) => item.text.length > 0);
}

export function stableDomId(prefix: string, seed: string): string {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}
