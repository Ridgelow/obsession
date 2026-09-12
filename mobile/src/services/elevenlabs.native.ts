// ElevenLabs Agents — Expo / React Native (WebRTC + LiveKit).
// Docs: https://elevenlabs.io/docs/agents-platform/guides/integrations/expo-react-native
// Requires a development build (npx expo prebuild / EAS). Not Expo Go.

import { useCallback, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { useConversation } from "@elevenlabs/react-native";
import {
  buildVoiceSessionConfig,
  extractAgentSpokenLine,
  isVoiceConfigured,
  mapVoiceStatus,
  voiceAgentId,
  type DateConversation,
} from "./elevenlabsConfig";

export {
  STUB_CONVERSATION,
  buildVoiceSessionConfig,
  extractAgentSpokenLine,
  isVoiceConfigured,
  mapVoiceStatus,
  voiceAgentId,
} from "./elevenlabsConfig";

export type {
  DateConversation,
  DateConversationStatus,
  VoiceSessionConfig,
} from "./elevenlabsConfig";

async function requestMicrophonePermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: "Microphone",
      message: "Obsession uses the microphone for the practice date.",
      buttonPositive: "OK",
    }
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export function useDateConversation(sessionId: string): DateConversation {
  const [lastAgentLine, setLastAgentLine] = useState<string | null>(null);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const conversation = useConversation({
    onMessage: (payload) => {
      const line = extractAgentSpokenLine(payload);
      if (line) setLastAgentLine(line);
    },
  });

  const start = useCallback(async () => {
    const sid = sessionIdRef.current.trim();
    const agentId = voiceAgentId();
    if (!agentId || !sid) return;
    await requestMicrophonePermission();
    conversation.startSession(buildVoiceSessionConfig(sid));
  }, [conversation]);

  const stop = useCallback(async () => {
    conversation.endSession();
  }, [conversation]);

  return {
    start,
    stop,
    isSpeaking: Boolean(conversation.isSpeaking),
    status: mapVoiceStatus(conversation.status),
    lastAgentLine,
    configured: isVoiceConfigured(),
  };
}
