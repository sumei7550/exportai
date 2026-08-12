import type { Conversation } from "../types/conversation";

export interface ConversationValidationIssue { path: string; message: string; }

export function validateConversation(conversation: Conversation): ConversationValidationIssue[] {
  const issues: ConversationValidationIssue[] = [];
  if (!conversation.id.trim()) issues.push({ path: "id", message: "Conversation ID is required." });
  if (!conversation.sourceUrl.startsWith("https://")) issues.push({ path: "sourceUrl", message: "Source URL must use HTTPS." });
  if (!conversation.exportedAt) issues.push({ path: "exportedAt", message: "Export time is required." });
  if (conversation.metadata.messageCount !== conversation.messages.length) issues.push({ path: "metadata.messageCount", message: "Message count does not match messages." });
  conversation.messages.forEach((message, index) => {
    if (!message.id.trim()) issues.push({ path: `messages.${index}.id`, message: "Message ID is required." });
    if (message.order !== index) issues.push({ path: `messages.${index}.order`, message: "Message order must be sequential." });
    if (message.blocks.length === 0) issues.push({ path: `messages.${index}.blocks`, message: "Message needs at least one block." });
  });
  return issues;
}