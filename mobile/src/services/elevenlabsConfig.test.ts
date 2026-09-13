import {
  appendTranscriptEntry,
  buildVoiceSessionConfig,
  extractAgentSpokenLine,
  extractFromIncomingEvent,
  extractUserSpokenLine,
  isVoiceConfigured,
  mapVoiceStatus,
  voiceAgentId,
} from "./elevenlabsConfig";

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

function run(): void {
  assert(mapVoiceStatus("connected") === "connected", "connected maps");
  assert(mapVoiceStatus("connecting") === "connecting", "connecting maps");
  assert(mapVoiceStatus("error") === "disconnected", "error maps to disconnected");
  assert(mapVoiceStatus("disconnecting") === "disconnected", "disconnecting maps");

  const prev = process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID;
  process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID = "";
  assert(isVoiceConfigured() === false, "empty agent id is not configured");
  assert(voiceAgentId() === "", "empty agent id trims to empty");

  process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID = "  agent_test  ";
  assert(isVoiceConfigured() === true, "agent id is configured");
  assert(voiceAgentId() === "agent_test", "agent id trims");

  const cfg = buildVoiceSessionConfig("sess-123");
  assert(cfg.agentId === "agent_test", "agentId from env");
  assert(cfg.dynamicVariables.session_id === "sess-123", "session_id dynamic var");
  assert(cfg.customLlmExtraBody == null, "no customLlmExtraBody for hosted LLM");

  assert(
    extractAgentSpokenLine({
      message: "You seem a little thrown.",
      source: "ai",
      role: "agent",
    }) === "You seem a little thrown.",
    "agent line extracted"
  );
  assert(
    extractAgentSpokenLine({
      message: "hey",
      source: "user",
      role: "user",
    }) === null,
    "user line ignored"
  );
  assert(extractAgentSpokenLine({ message: "   ", source: "ai" }) === null, "blank ignored");
  assert(extractAgentSpokenLine(null) === null, "null ignored");
  assert(extractAgentSpokenLine("invented") === null, "raw string not invented");

  assert(
    extractUserSpokenLine({ message: "hi there", source: "user", role: "user" }) ===
      "hi there",
    "user line extracted"
  );
  assert(
    extractUserSpokenLine({ message: "nope", source: "ai", role: "agent" }) === null,
    "agent line ignored for user extract"
  );

  const t1 = appendTranscriptEntry([], "agent", "Hi");
  const t2 = appendTranscriptEntry(t1, "user", "Hello");
  const t3 = appendTranscriptEntry(t2, "user", "Hello");
  assert(t2.length === 2, "two turns");
  assert(t3.length === 2, "dedupe consecutive");

  assert(
    extractFromIncomingEvent({
      type: "user_transcript",
      user_transcription_event: { user_transcript: "Mic works" },
    })?.text === "Mic works",
    "incoming user transcript"
  );
  assert(
    extractFromIncomingEvent({
      type: "agent_response",
      agent_response_event: { agent_response: "Nice to meet you" },
    })?.role === "agent",
    "incoming agent response"
  );

  if (prev === undefined) delete process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID;
  else process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID = prev;

  console.log("elevenlabsConfig tests passed");
}

run();
