import { detectPlatformFromHostname } from "../../constants/platforms";
import { normalizeConversation } from "../../parser/conversation-normalizer";
import {
  CONVERSATION_MODEL_VERSION,
  type Block,
  type Conversation,
  type Message,
  type MessageRole,
  type ParseWarning,
} from "../../types/conversation";
import type { AdapterParseResult, PageLocation, PlatformAdapter } from "../types";
import { parseChatGPTBlocks, safeChatGPTMessageText, type BlockParseContext } from "./chatgpt-block-parser";
import { CHATGPT_DOM } from "./chatgpt-selectors";
import { safeTextContent, stableDomId } from "./dom-utils";

type BlockParser = (container: Element, context: BlockParseContext) => Block[];

export interface ChatGPTAdapterDependencies {
  parseBlocks?: BlockParser;
  now?: () => Date;
}

function documentOrder(left: Element, right: Element): number {
  if (left === right) return 0;
  const position = left.compareDocumentPosition(right);
  return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

function outermost(elements: Element[]): Element[] {
  return elements.filter((candidate) => !elements.some((other) => other !== candidate && other.contains(candidate)));
}

function findConversationRoot(document: Document): Element {
  for (const selector of CHATGPT_DOM.conversationRoots) {
    const root = document.querySelector(selector);
    if (root) return root;
  }
  return document.body ?? document.documentElement;
}

function findMessageNodes(document: Document): Element[] {
  const root = findConversationRoot(document);
  const primary = outermost([...root.querySelectorAll(CHATGPT_DOM.primaryMessages)]);
  const fallback = [...root.querySelectorAll(CHATGPT_DOM.fallbackMessages)]
    .filter((candidate) => !primary.some((message) => candidate.contains(message) || message.contains(candidate)));
  return [...primary, ...fallback].sort(documentOrder);
}

function roleContainer(messageNode: Element): Element {
  if (messageNode.hasAttribute(CHATGPT_DOM.roleAttribute)) return messageNode;
  return messageNode.querySelector(CHATGPT_DOM.roleContainers) ?? messageNode;
}

function parseRole(messageNode: Element): MessageRole {
  const value = (
    messageNode.getAttribute(CHATGPT_DOM.turnRoleAttribute)
    ?? roleContainer(messageNode).getAttribute(CHATGPT_DOM.roleAttribute)
  )?.toLowerCase();
  if (value === "user" || value === "assistant" || value === "system") return value;
  const testId = messageNode.getAttribute("data-testid")?.toLowerCase() ?? "";
  if (testId.includes("user")) return "user";
  if (testId.includes("assistant")) return "assistant";
  return "unknown";
}

function sourceMessageId(messageNode: Element): string | null {
  const container = roleContainer(messageNode);
  for (const attribute of CHATGPT_DOM.messageIdAttributes) {
    const value = messageNode.getAttribute(attribute) ?? container.getAttribute(attribute);
    if (value?.trim()) return value.trim();
  }
  return null;
}

function createMessageId(messageNode: Element, order: number): string {
  return stableDomId("chatgpt-message", sourceMessageId(messageNode) ?? `${order}:${safeChatGPTMessageText(roleContainer(messageNode)).slice(0, 160)}`);
}

function sourceAttributes(messageNode: Element): Record<string, string> | undefined {
  const attributes: Record<string, string> = {};
  const container = roleContainer(messageNode);
  for (const attribute of CHATGPT_DOM.messageIdAttributes) {
    const value = messageNode.getAttribute(attribute) ?? container.getAttribute(attribute);
    if (value) attributes[attribute] = value;
  }
  const role = container.getAttribute(CHATGPT_DOM.roleAttribute);
  if (role) attributes[CHATGPT_DOM.roleAttribute] = role;
  const turnRole = messageNode.getAttribute(CHATGPT_DOM.turnRoleAttribute);
  if (turnRole) attributes[CHATGPT_DOM.turnRoleAttribute] = turnRole;
  return Object.keys(attributes).length > 0 ? attributes : undefined;
}

function extractConversationId(location: PageLocation): string {
  const match = location.pathname.match(/\/c\/([^/?#]+)/);
  return stableDomId("chatgpt-conversation", match?.[1] ?? location.pathname);
}

function cleanDocumentTitle(value: string): string {
  return value.replace(/\s*[|–—-]\s*ChatGPT\s*$/i, "").trim();
}

function extractTitle(document: Document, location: PageLocation): string {
  for (const selector of CHATGPT_DOM.activeTitleLinks) {
    const links = [...document.querySelectorAll<HTMLAnchorElement>(selector)];
    const current = links.find((link) => {
      try {
        return new URL(link.href, location.href).pathname === location.pathname;
      } catch {
        return false;
      }
    });
    const title = current ? safeTextContent(current) : "";
    if (title) return title;
  }
  for (const selector of CHATGPT_DOM.headingTitles) {
    const title = document.querySelector(selector);
    const text = title ? safeTextContent(title) : "";
    if (text) return text;
  }
  const documentTitle = cleanDocumentTitle(document.title);
  return /^chatgpt$/i.test(documentTitle) ? "" : documentTitle;
}

function fallbackMessage(messageNode: Element, id: string, role: MessageRole, order: number): Message {
  const originalText = safeChatGPTMessageText(roleContainer(messageNode));
  return {
    id,
    role,
    order,
    originalText,
    blocks: originalText ? [{ id: `${id}-fallback`, type: "unknown", rawText: originalText, sourceTag: messageNode.tagName.toLowerCase() }] : [],
    metadata: { isPartial: true, sourceAttributes: sourceAttributes(messageNode) },
  };
}

export class ChatGPTAdapter implements PlatformAdapter {
  readonly platform = "chatgpt" as const;
  private readonly parseBlocks: BlockParser;
  private readonly now: () => Date;

  constructor(dependencies: ChatGPTAdapterDependencies = {}) {
    this.parseBlocks = dependencies.parseBlocks ?? parseChatGPTBlocks;
    this.now = dependencies.now ?? (() => new Date());
  }

  isSupportedPage(location: PageLocation): boolean {
    return detectPlatformFromHostname(location.hostname) === "chatgpt";
  }

  parse(document: Document, location: PageLocation): AdapterParseResult {
    if (!this.isSupportedPage(location)) return { status: "unsupported", reason: "The current page is not a supported ChatGPT host." };

    try {
      const messageNodes = findMessageNodes(document);
      if (messageNodes.length === 0) return { status: "empty", reason: "ChatGPT is supported, but no readable conversation was detected on this page." };

      const warnings: ParseWarning[] = [];
      const title = extractTitle(document, location);
      if (!title) warnings.push({ code: "chatgpt-title-missing", message: "The conversation title was not available; a readable fallback title was used." });

      const messages = messageNodes.map((messageNode, order) => {
        const id = createMessageId(messageNode, order);
        const role = parseRole(messageNode);
        if (role === "unknown") warnings.push({ code: "chatgpt-message-role-unknown", message: "A message role could not be identified and was preserved as unknown.", messageId: id });
        const container = roleContainer(messageNode);
        try {
          const blocks = this.parseBlocks(container, { baseUrl: location.href, messageId: id, warnings });
          const originalText = safeChatGPTMessageText(container);
          if (blocks.length === 0) warnings.push({ code: "chatgpt-message-empty-blocks", message: "A message had no structured blocks and was preserved by the normalizer.", messageId: id });
          return {
            id,
            role,
            order,
            originalText,
            blocks,
            metadata: { isPartial: blocks.length === 0 || undefined, sourceAttributes: sourceAttributes(messageNode) },
          } satisfies Message;
        } catch {
          warnings.push({ code: "chatgpt-message-parse-failed", message: "One ChatGPT message could not be fully structured and was preserved as partial readable content.", messageId: id });
          return fallbackMessage(messageNode, id, role, order);
        }
      });

      const hasPartialMessage = messages.some((message) => message.metadata.isPartial === true);
      const conversation: Conversation = {
        id: extractConversationId(location),
        title,
        platform: "chatgpt",
        sourceUrl: location.href,
        exportedAt: this.now().toISOString(),
        messages,
        metadata: {
          messageCount: messages.length,
          isComplete: warnings.length === 0 && !hasPartialMessage,
          parseWarnings: warnings,
          modelVersion: CONVERSATION_MODEL_VERSION,
        },
      };
      return { status: "success", conversation: normalizeConversation(conversation).conversation };
    } catch {
      return { status: "error", reason: "The ChatGPT page structure could not be read safely." };
    }
  }
}
