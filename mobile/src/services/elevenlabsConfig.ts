// Pure ElevenLabs helpers — no native SDK import (safe for tests / Expo web).

export type VoiceSessionConfig = {
  agentId: string;
  dynamicVariables: { session_id: string };
  customLlmExtraBody: { sessionId: string };
};

export type DateConversationStatus =
  | "connected"
  | "connecting"
  | "disconnected";

export type DateConversation = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  isSpeaking: boolean;
  status: DateConversationStatus;
  lastAgentLine: string | null;
  configured: boolean;
};

export function voiceAgentId(): string {
  return (process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID ?? "").trim();
}

export function isVoiceConfigured(): boolean {
  return voiceAgentId().length > 0;
}

/**
 * Session overrides for the Custom LLM webhook (Phase A).
 * Server resolveSessionId reads:
 *   elevenlabs_extra_body.sessionId | custom_llm_extra_body.sessionId
 *   | dynamic_variables.session_id
 * This SDK version sends customLlmExtraBody → custom_llm_extra_body
 * and dynamicVariables → dynamic_variables.
 */
export function buildVoiceSessionConfig(sessionId: string): VoiceSessionConfig {
  return {
    agentId: voiceAgentId(),
    dynamicVariables: { session_id: sessionId },
    customLlmExtraBody: { sessionId },
  };
}

/** Map SDK status (includes "error") onto the LiveDate contract. */
export function mapVoiceStatus(status: string): DateConversationStatus {
  if (status === "connected" || status === "connecting") return status;
  return "disconnected";
}

/**
 * Pull a spoken agent line from an ElevenLabs onMessage payload.
 * Returns null for user speech or empty content — never invents a line.
 */
export function extractAgentSpokenLine(payload: unknown): string | null {
  if (payload == null) return null;
  if (typeof payload === "string") return null;
  if (typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const role = String(p.role ?? "").toLowerCase();
  const source = String(p.source ?? "").toLowerCase();
  const isAgent =
    role === "agent" ||
    source === "ai" ||
    source === "agent" ||
    source === "assistant";
  if (!isAgent) return null;
  const text = p.message;
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const STUB_CONVERSATION: DateConversation = {
  start: async () => undefined,
  stop: async () => undefined,
  isSpeaking: false,
  status: "disconnected",
  lastAgentLine: null,
  configured: false,
};
