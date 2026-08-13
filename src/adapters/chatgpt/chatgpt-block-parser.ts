import type {
  Block,
  InlineContent,
  ListBlock,
  ListItem,
  ParseWarning,
  TableBlock,
} from "../../types/conversation";
import { CHATGPT_DOM } from "./chatgpt-selectors";
import {
  isExcludedElement,
  isMathElement,
  normalizeReadableText,
  parseInlineContent,
  safeTextContent,
  sanitizeImageSource,
  sanitizeLink,
  stableDomId,
} from "./dom-utils";

export interface BlockParseContext {
  baseUrl: string;
  messageId: string;
  warnings: ParseWarning[];
}

const TRANSPARENT_CONTAINERS = new Set(["article", "div", "main", "section"]);
const INLINE_TAGS = new Set(["a", "b", "br", "code", "del", "em", "i", "mark", "s", "small", "span", "strike", "strong", "sub", "sup", "u"]);

class BlockFactory {
  private index = 0;

  constructor(private readonly messageId: string) {}

  id(type: string): string {
    const id = stableDomId("block", `${this.messageId}:${this.index}:${type}`);
    this.index += 1;
    return id;
  }
}

function readableInline(content: InlineContent[]): boolean {
  return content.some((item) => item.text.trim().length > 0);
}

function extractLatex(element: Element): string {
  if (element.matches(CHATGPT_DOM.latexAnnotation)) return safeTextContent(element);
  for (const attribute of CHATGPT_DOM.latexAttributes) {
    const value = element.getAttribute(attribute)?.trim();
    if (value) return value;
  }
  const annotation = element.querySelector(CHATGPT_DOM.latexAnnotation);
  if (annotation) return safeTextContent(annotation);
  const ariaLabel = element.getAttribute("aria-label")?.trim();
  if (ariaLabel) return ariaLabel;
  return safeTextContent(element);
}

function isDisplayMath(element: Element): boolean {
  return element.classList.contains("katex-display")
    || element.getAttribute("data-display") === "true"
    || element.closest("[data-display='true']") !== null;
}

function parseMath(element: Element, factory: BlockFactory): Block | null {
  const latex = extractLatex(element);
  return latex ? { id: factory.id("math"), type: "math", latex, display: isDisplayMath(element) } : null;
}

function parseCode(element: Element, factory: BlockFactory): Block {
  const codeElement = element.tagName.toLowerCase() === "code" ? element : element.querySelector("code");
  const code = (codeElement?.textContent ?? element.textContent ?? "").replace(/^\n|\n$/g, "");
  let language: string | undefined;
  for (const attribute of CHATGPT_DOM.codeLanguageAttributes) {
    language = codeElement?.getAttribute(attribute) ?? element.getAttribute(attribute) ?? undefined;
    if (language) break;
  }
  if (!language && codeElement) {
    const languageClass = [...codeElement.classList].find((name) => name.startsWith("language-"));
    language = languageClass?.slice("language-".length);
  }
  return { id: factory.id("code"), type: "code", code, language: language?.trim() || undefined };
}

function directListItems(element: Element): Element[] {
  return [...element.children].filter((child) => child.tagName.toLowerCase() === "li");
}

function parseList(element: Element, factory: BlockFactory, context: BlockParseContext): ListBlock {
  const items: ListItem[] = directListItems(element).map((listItem, index) => {
    const inlineContainer = listItem.cloneNode(true) as Element;
    inlineContainer.querySelectorAll(":scope > ul, :scope > ol").forEach((nested) => nested.remove());
    const nested = [...listItem.children].find((child) => ["ul", "ol"].includes(child.tagName.toLowerCase()));
    return {
      id: stableDomId("list-item", `${context.messageId}:${factory.id("item")}:${index}`),
      content: parseInlineContent(inlineContainer, context.baseUrl),
      children: nested ? parseList(nested, factory, context) : undefined,
    };
  });
  return { id: factory.id("list"), type: "list", ordered: element.tagName.toLowerCase() === "ol", items };
}

function parseTable(element: Element, factory: BlockFactory, context: BlockParseContext): TableBlock {
  const directRows = [...element.querySelectorAll("tr")];
  const headerRow = directRows.find((row) => row.querySelector(":scope > th"));
  const headers = headerRow
    ? [...headerRow.querySelectorAll(":scope > th")].map((cell) => parseInlineContent(cell, context.baseUrl))
    : [];
  const rows = directRows
    .filter((row) => row !== headerRow)
    .map((row) => [...row.querySelectorAll(":scope > th, :scope > td")].map((cell) => parseInlineContent(cell, context.baseUrl)));
  return { id: factory.id("table"), type: "table", headers, rows };
}

function hasSemanticBlockChild(element: Element): boolean {
  return [...element.children].some((child) => {
    const tag = child.tagName.toLowerCase();
    return ["blockquote", "hr", "ol", "p", "pre", "table", "ul"].includes(tag)
      || /^h[1-6]$/.test(tag)
      || isMathElement(child)
      || child.tagName.toLowerCase() === "img";
  });
}

function parseParagraphWithMath(element: Element, factory: BlockFactory, context: BlockParseContext): Block[] {
  const mathChildren = [...element.children].filter(isMathElement);
  if (mathChildren.length === 0) {
    const content = parseInlineContent(element, context.baseUrl);
    return readableInline(content) ? [{ id: factory.id("paragraph"), type: "paragraph", content }] : [];
  }

  const blocks: Block[] = [];
  let inline: InlineContent[] = [];
  const flushInline = () => {
    if (readableInline(inline)) blocks.push({ id: factory.id("paragraph"), type: "paragraph", content: inline });
    inline = [];
  };
  element.childNodes.forEach((node) => {
    if (node instanceof Element && isMathElement(node)) {
      flushInline();
      const math = parseMath(node, factory);
      if (math) blocks.push(math);
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue ?? "";
      if (text) inline.push({ text });
      return;
    }
    if (node instanceof Element) {
      const wrapper = element.ownerDocument.createElement("span");
      wrapper.append(node.cloneNode(true));
      inline.push(...parseInlineContent(wrapper, context.baseUrl));
    }
  });
  flushInline();
  return blocks;
}

function parseElement(element: Element, factory: BlockFactory, context: BlockParseContext): Block[] {
  if (isExcludedElement(element)) return [];
  if (isMathElement(element)) {
    const math = parseMath(element, factory);
    return math ? [math] : [];
  }

  const tag = element.tagName.toLowerCase();
  if (tag === "p") return parseParagraphWithMath(element, factory, context);
  if (/^h[1-6]$/.test(tag)) {
    const content = parseInlineContent(element, context.baseUrl);
    return readableInline(content)
      ? [{ id: factory.id("heading"), type: "heading", level: Number(tag[1]) as 1 | 2 | 3 | 4 | 5 | 6, content }]
      : [];
  }
  if (tag === "ul" || tag === "ol") return [parseList(element, factory, context)];
  if (tag === "pre") return [parseCode(element, factory)];
  if (tag === "table") return [parseTable(element, factory, context)];
  if (tag === "blockquote") {
    const blocks = parseContainer(element, factory, context);
    return [{ id: factory.id("quote"), type: "quote", blocks: blocks.length > 0 ? blocks : [{ id: factory.id("quote-text"), type: "paragraph", content: [{ text: safeTextContent(element) }] }] }];
  }
  if (tag === "hr") return [{ id: factory.id("break"), type: "thematic-break" }];
  if (tag === "img") {
    const src = sanitizeImageSource(element.getAttribute("src"), context.baseUrl);
    if (!src) {
      context.warnings.push({ code: "chatgpt-image-source-ignored", message: "An image with an unsafe or unreadable source was preserved as unknown content.", messageId: context.messageId });
      return [{ id: factory.id("unknown-image"), type: "unknown", rawText: element.getAttribute("alt") ?? "Unreadable image", sourceTag: tag }];
    }
    return [{ id: factory.id("image"), type: "image", src, alt: element.getAttribute("alt") ?? "", caption: element.getAttribute("title") ?? undefined }];
  }
  if (tag === "a") {
    const content = parseInlineContent(element, context.baseUrl);
    const href = sanitizeLink(element.getAttribute("href"), context.baseUrl);
    if (href && readableInline(content)) return [{ id: factory.id("link"), type: "link", href, content }];
    if (readableInline(content)) return [{ id: factory.id("text"), type: "text", content }];
    return [];
  }
  if (TRANSPARENT_CONTAINERS.has(tag)) {
    if (hasSemanticBlockChild(element)) return parseContainer(element, factory, context);
    const content = parseInlineContent(element, context.baseUrl);
    return readableInline(content) ? [{ id: factory.id("paragraph"), type: "paragraph", content }] : [];
  }
  if (INLINE_TAGS.has(tag)) {
    const content = parseInlineContent(element, context.baseUrl);
    return readableInline(content) ? [{ id: factory.id("text"), type: "text", content }] : [];
  }

  const rawText = safeTextContent(element);
  context.warnings.push({ code: "chatgpt-unknown-block", message: `An unsupported <${tag}> node was preserved as unknown content.`, messageId: context.messageId });
  return rawText ? [{ id: factory.id("unknown"), type: "unknown", rawText, sourceTag: tag }] : [];
}

function parseContainer(container: Element, factory: BlockFactory, context: BlockParseContext): Block[] {
  const blocks: Block[] = [];
  container.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = normalizeReadableText(node.nodeValue ?? "");
      if (text) blocks.push({ id: factory.id("text"), type: "text", content: [{ text }] });
      return;
    }
    if (!(node instanceof Element)) return;
    try {
      blocks.push(...parseElement(node, factory, context));
    } catch {
      const rawText = safeTextContent(node);
      if (rawText) blocks.push({ id: factory.id("fallback"), type: "unknown", rawText, sourceTag: node.tagName.toLowerCase() });
      context.warnings.push({ code: "chatgpt-block-parse-failed", message: "A content block could not be structured and was preserved as readable fallback text.", messageId: context.messageId });
    }
  });
  return blocks;
}

export function parseChatGPTBlocks(container: Element, context: BlockParseContext): Block[] {
  return parseContainer(container, new BlockFactory(context.messageId), context);
}
