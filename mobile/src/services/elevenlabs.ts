// ElevenLabs Agent — install @elevenlabs/react-native (+ LiveKit) for real voice.
// Docs: https://elevenlabs.io/docs/agents-platform/guides/integrations/expo-react-native

export type DateConversation = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  isSpeaking: boolean;
  status: "connected" | "connecting" | "disconnected";
};

/** Stub until native SDK is installed. LiveDate uses on-screen transcript for now. */
export function useDateConversation(_sessionId: string): DateConversation {
  return {
    start: async () => undefined,
    stop: async () => undefined,
    isSpeaking: false,
    status: "disconnected",
  };
}
