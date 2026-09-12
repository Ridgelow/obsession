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
  lastUserLine: string | null;
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

function messageTextFromPayload(payload: Record<string, unknown>): string | null {
  let text: unknown = payload.message ?? payload.text ?? payload.content;
  if (text && typeof text === "object") {
    const nested = text as Record<string, unknown>;
    text = nested.message ?? nested.text ?? nested.content;
  }
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function roleFromPayload(payload: Record<string, unknown>): "agent" | "user" | null {
  const role = String(payload.role ?? "").toLowerCase();
  const source = String(payload.source ?? "").toLowerCase();
  if (
    role === "agent" ||
    role === "ai" ||
    role === "assistant" ||
    source === "ai" ||
    source === "agent" ||
    source === "assistant"
  ) {
    return "agent";
  }
  if (role === "user" || source === "user") return "user";
  return null;
}

/**
 * Pull a spoken agent line from an ElevenLabs onMessage payload.
 * Handles both `{ role, message }` and `{ source, message }` shapes.
 */
export function extractAgentSpokenLine(payload: unknown): string | null {
  if (payload == null || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (roleFromPayload(p) !== "agent") return null;
  return messageTextFromPayload(p);
}

/** Pull a spoken user (mic) transcript line from an onMessage payload. */
export function extractUserSpokenLine(payload: unknown): string | null {
  if (payload == null || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (roleFromPayload(p) !== "user") return null;
  return messageTextFromPayload(p);
}

export const STUB_CONVERSATION: DateConversation = {
  start: async () => undefined,
  stop: async () => undefined,
  isSpeaking: false,
  status: "disconnected",
  lastAgentLine: null,
  lastUserLine: null,
  configured: false,
};
