// Default / web / tests: compile-safe stub.
// On iOS/Android Metro resolves elevenlabs.native.ts (real ElevenLabs + LiveKit).

export {
  STUB_CONVERSATION,
  appendTranscriptEntry,
  buildVoiceSessionConfig,
  extractAgentSpokenLine,
  extractFromIncomingEvent,
  extractUserSpokenLine,
  isVoiceConfigured,
  mapVoiceStatus,
  voiceAgentId,
} from "./elevenlabsConfig";

export type {
  DateConversation,
  DateConversationStatus,
  TranscriptEntry,
  TranscriptRole,
  VoiceSessionConfig,
} from "./elevenlabsConfig";

import { STUB_CONVERSATION, type DateConversation } from "./elevenlabsConfig";

/** Stub until a native dev client loads elevenlabs.native.ts. */
export async function restoreVoiceAudio(): Promise<void> {}

/** Stub until a native dev client loads elevenlabs.native.ts. */
export async function teardownVoiceAudio(): Promise<void> {}

/** Stub until a native dev client loads elevenlabs.native.ts. */
export async function hardResetAudioSession(): Promise<void> {}

/** Stub until a native dev client loads elevenlabs.native.ts. */
export async function recoverAudioSession(): Promise<void> {}

/** Stub until a native dev client loads elevenlabs.native.ts. */
export async function healSilentMic(): Promise<void> {}

/** Stub for web/tests — native builds use elevenlabs.native.ts. */
export function useDateConversation(_sessionId: string): DateConversation & {
  lastError: string | null;
  inputLevel: number;
} {
  return { ...STUB_CONVERSATION, lastError: null, inputLevel: 0 };
}
