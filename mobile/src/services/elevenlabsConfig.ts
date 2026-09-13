// Pure ElevenLabs helpers — no native SDK import (safe for tests / Expo web).

export type VoiceSessionConfig = {
  agentId: string;
  dynamicVariables: { session_id: string };
  /**
   * Only sent when the agent allows it
   * (`platform_settings.overrides.custom_llm_extra_body`).
   * Session id is also in dynamicVariables for the webhook.
   */
  customLlmExtraBody?: { sessionId: string };
};

export type DateConversationStatus =
  | "connected"
  | "connecting"
  | "disconnected";

export type TranscriptRole = "agent" | "user";

export type TranscriptEntry = {
  id: string;
  role: TranscriptRole;
  text: string;
};

export type DateConversation = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  isSpeaking: boolean;
  status: DateConversationStatus;
  lastAgentLine: string | null;
  lastUserLine: string | null;
  /** Full live transcript for the date screen. */
  transcript: TranscriptEntry[];
  configured: boolean;
  /** Inject a [SIGNAL:…] note into the live agent (hosted LLM path). */
  sendSignal?: (signal: string) => void;
};

export function voiceAgentId(): string {
  return (process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID ?? "").trim();
}

export function isVoiceConfigured(): boolean {
  return voiceAgentId().length > 0;
}

/**
 * Session config for the ElevenLabs agent.
 * Prefer dynamicVariables.session_id only — customLlmExtraBody is only valid
 * when the agent llm is `custom-llm` AND overrides.custom_llm_extra_body is on.
 * Hosted Gemini agents reject/ignore extra body; keep the payload minimal.
 */
export function buildVoiceSessionConfig(sessionId: string): VoiceSessionConfig {
  return {
    agentId: voiceAgentId(),
    dynamicVariables: { session_id: sessionId },
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

function roleFromPayload(payload: Record<string, unknown>): TranscriptRole | null {
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

/** Append a turn, skipping exact consecutive duplicates. */
export function appendTranscriptEntry(
  prev: TranscriptEntry[],
  role: TranscriptRole,
  text: string
): TranscriptEntry[] {
  const trimmed = text.trim();
  if (!trimmed) return prev;
  const last = prev[prev.length - 1];
  if (last && last.role === role && last.text === trimmed) return prev;
  return [
    ...prev,
    {
      id: `${role}-${Date.now()}-${prev.length}`,
      role,
      text: trimmed,
    },
  ];
}

/**
 * Pull transcript text from raw LiveKit / ElevenLabs client events
 * (user_transcript / agent_response) when onMessage is quiet.
 */
export function extractFromIncomingEvent(
  event: unknown
): { role: TranscriptRole; text: string } | null {
  if (event == null || typeof event !== "object") return null;
  const e = event as Record<string, unknown>;
  const type = String(e.type ?? "");

  if (type === "user_transcript") {
    const ute = e.user_transcription_event as Record<string, unknown> | undefined;
    const text = ute?.user_transcript ?? e.user_transcript;
    if (typeof text === "string" && text.trim()) {
      return { role: "user", text: text.trim() };
    }
  }

  if (type === "agent_response") {
    const are = e.agent_response_event as Record<string, unknown> | undefined;
    const text = are?.agent_response ?? e.agent_response;
    if (typeof text === "string" && text.trim()) {
      return { role: "agent", text: text.trim() };
    }
  }

  return null;
}

export const STUB_CONVERSATION: DateConversation = {
  start: async () => undefined,
  stop: async () => undefined,
  isSpeaking: false,
  status: "disconnected",
  lastAgentLine: null,
  lastUserLine: null,
  transcript: [],
  configured: false,
  sendSignal: () => undefined,
};
