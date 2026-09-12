// Default / web / tests: compile-safe stub.
// Native Metro resolves elevenlabs.native.ts (ConversationProvider + SDK).

export {
  STUB_CONVERSATION,
  buildVoiceSessionConfig,
  extractAgentSpokenLine,
  extractUserSpokenLine,
  isVoiceConfigured,
  mapVoiceStatus,
  voiceAgentId,
} from "./elevenlabsConfig";

export type {
  DateConversation,
  DateConversationStatus,
  VoiceSessionConfig,
} from "./elevenlabsConfig";

import { STUB_CONVERSATION, type DateConversation } from "./elevenlabsConfig";

/** Stub until a native dev client loads elevenlabs.native.ts. */
export function useDateConversation(_sessionId: string): DateConversation & {
  lastError: string | null;
} {
  return { ...STUB_CONVERSATION, lastError: null };
}
