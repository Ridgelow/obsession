import {
  buildVoiceSessionConfig,
  extractAgentSpokenLine,
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

  process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID =
    "  agent_4801m2bbx00he4krmxrfdvyt4x2k  ";
  assert(isVoiceConfigured() === true, "Hasnain agent id is configured");
  assert(
    voiceAgentId() === "agent_4801m2bbx00he4krmxrfdvyt4x2k",
    "Hasnain agent id trims"
  );

  const cfg = buildVoiceSessionConfig("sess-123");
  assert(cfg.agentId === "agent_4801m2bbx00he4krmxrfdvyt4x2k", "agentId from env");
  assert(cfg.dynamicVariables.session_id === "sess-123", "session_id dynamic var");
  assert(cfg.customLlmExtraBody.sessionId === "sess-123", "sessionId extra body");

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

  if (prev === undefined) delete process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID;
  else process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID = prev;

  console.log("elevenlabsConfig tests passed");
}

run();
