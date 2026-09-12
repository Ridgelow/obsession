// ElevenLabs Agents — Expo / React Native (WebRTC + LiveKit).
// Docs: https://elevenlabs.io/docs/agents-platform/guides/integrations/expo-react-native
// Requires a development build (npx expo prebuild / EAS). Not Expo Go.

import { useCallback, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { useConversation } from "@elevenlabs/react-native";
import { AudioSession } from "@livekit/react-native";
import {
  buildVoiceSessionConfig,
  extractAgentSpokenLine,
  extractUserSpokenLine,
  isVoiceConfigured,
  mapVoiceStatus,
  voiceAgentId,
  type DateConversation,
} from "./elevenlabsConfig";

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

/** iOS often routes WebRTC to the quiet earpiece unless we force speaker. */
async function preparePlaybackAudio(): Promise<void> {
  try {
    await AudioSession.configureAudio({
      ios: {
        defaultOutput: "speaker",
      },
    });
  } catch {
    // configure may already be applied by the SDK setup strategy
  }

  try {
    await AudioSession.setAppleAudioConfiguration({
      audioCategory: "playAndRecord",
      audioCategoryOptions: [
        "defaultToSpeaker",
        "allowBluetooth",
        "allowBluetoothA2DP",
        "mixWithOthers",
      ],
      audioMode: "videoChat",
    });
  } catch {
    // older LiveKit builds may not expose this
  }

  try {
    await AudioSession.startAudioSession();
  } catch {
    // already started
  }

  try {
    await AudioSession.setDefaultRemoteAudioTrackVolume(1);
  } catch {
    // optional
  }

  try {
    if (Platform.OS === "ios") {
      await AudioSession.selectAudioOutput("force_speaker");
    } else {
      await AudioSession.selectAudioOutput("speaker");
    }
  } catch {
    // route picker unavailable
  }
}

export function useDateConversation(sessionId: string): DateConversation & {
  lastError: string | null;
} {
  const [lastAgentLine, setLastAgentLine] = useState<string | null>(null);
  const [lastUserLine, setLastUserLine] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const conversation = useConversation({
    onConnect: () => {
      setLastError(null);
      void preparePlaybackAudio();
    },
    onError: (message: string) => {
      setLastError(message || "Voice connection failed");
    },
    onModeChange: ({ mode }: { mode: "speaking" | "listening" }) => {
      if (mode === "speaking") void preparePlaybackAudio();
    },
    onMessage: (payload: unknown) => {
      const agent = extractAgentSpokenLine(payload);
      if (agent) setLastAgentLine(agent);
      const user = extractUserSpokenLine(payload);
      if (user) setLastUserLine(user);
    },
  });

  const start = useCallback(async () => {
    const sid = sessionIdRef.current.trim();
    const agentId = voiceAgentId();
    if (!agentId) {
      throw new Error(
        "Voice agent not configured (missing EXPO_PUBLIC_ELEVENLABS_AGENT_ID)."
      );
    }
    if (!sid) {
      throw new Error("No session id — voice needs a server session.");
    }
    const micOk = await requestMicrophonePermission();
    if (!micOk) {
      throw new Error("Microphone permission denied.");
    }
    setLastError(null);
    setLastUserLine(null);
    await preparePlaybackAudio();
    conversation.startSession(buildVoiceSessionConfig(sid));
  }, [conversation]);

  const stop = useCallback(async () => {
    try {
      conversation.endSession();
    } catch {
      // already ended
    }
  }, [conversation]);

  return {
    start,
    stop,
    isSpeaking: Boolean(conversation.isSpeaking),
    status: mapVoiceStatus(conversation.status),
    lastAgentLine,
    lastUserLine,
    configured: isVoiceConfigured(),
    lastError,
  };
}
