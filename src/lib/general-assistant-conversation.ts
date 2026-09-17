/**
 * A second, independent conversation instance — see the doc comment on
 * createAssistantConversation in assistant-conversation.ts for why a
 * separate instance here doesn't reintroduce the "same question, two
 * answers" bug that led to that file's scoped instance being unified in
 * the first place. This one backs BisChatBot, the site-wide floating
 * widget, for general questions independent of whatever standards happen
 * to be on screen — never sharing a thread with ResearchChat's scoped,
 * "about these results" conversation.
 */
import { createAssistantConversation } from "./assistant-conversation";

const generalConversation = createAssistantConversation("bis-general-conversation-updated");

export const subscribeToConversation = generalConversation.subscribeToConversation;
export const getConversationSnapshot = generalConversation.getConversationSnapshot;
export const getConversationServerSnapshot = generalConversation.getConversationServerSnapshot;
export const resetConversation = generalConversation.resetConversation;
export const sendAssistantMessage = generalConversation.sendAssistantMessage;
export const __resetConversationForTests = generalConversation.__resetConversationForTests;
