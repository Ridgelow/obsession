// ElevenLabs Agents — Expo / React Native (WebRTC + LiveKit).
// Docs: https://elevenlabs.io/docs/agents-platform/guides/integrations/expo-react-native
// Requires a development build (npx expo prebuild / EAS). Not Expo Go.
//
// Date #2 silent-mic (device-proven 2026-09-12):
// Session B fails with LiveKit "Session activation failed" after A ends.
// Room still connects; getInputVolume stays 0. Fix: recoverAudioSession()
// (LiveKit stop → configure → start, native deactivate-only + retry on fail)
// before every startSession. Do NOT raw-setCategory outside LiveKit.

import { useCallback, useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { useConversation } from "@elevenlabs/react-native";
import {
  AudioSession,
  AndroidAudioTypePresets,
} from "@livekit/react-native";
import {
  AudioDeviceModule,
  AudioEngineAvailability,
  AudioEngineMuteMode,
} from "@livekit/react-native-webrtc";
import { getNativeSmartSpectra } from "../native/smartSpectra";
import { ensurePresageStopped } from "./presage";
import {
  appendTranscriptEntry,
  buildVoiceSessionConfig,
  extractAgentSpokenLine,
  extractFromIncomingEvent,
  extractUserSpokenLine,
  isVoiceConfigured,
  mapVoiceStatus,
  voiceAgentId,
  type DateConversation,
  type TranscriptEntry,
} from "./elevenlabsConfig";

/**
 * Device-proven: 2nd LiveKit/WebRTC session publishes mic at audioLevel 0;
 * AudioDeviceModule.startRecording returns -1 after date 1.
 * Fully cycle engine availability + VoiceProcessing to rebuild the IO unit.
 */
const originalStartAudioSession =
  AudioSession.startAudioSession.bind(AudioSession);
AudioSession.startAudioSession = async () => {
  try {
    await originalStartAudioSession();
  } catch (first) {
    console.warn(
      "[voice] startAudioSession failed — deactivate + retry",
      first
    );
    try {
      await AudioSession.stopAudioSession();
    } catch {
      // ok
    }
    const native = getNativeSmartSpectra() as {
      deactivateAudioSession?: () => Promise<void>;
    } | null;
    try {
      await native?.deactivateAudioSession?.();
    } catch {
      // ok
    }
    await new Promise((r) => setTimeout(r, 700));
    await originalStartAudioSession();
  }
};

async function safeAdm(label: string, fn: () => Promise<void> | void) {
  try {
    await fn();
  } catch (err) {
    console.warn(`[voice] ADM ${label} failed`, err);
  }
}

/** Hard rebuild of WebRTC capture path between LiveKit dates. */
export async function recoverAudioSession(): Promise<void> {
  console.warn("[voice] recoverAudioSession — cycling ADM engine");

  await safeAdm("stopPlayout", () => AudioDeviceModule.stopPlayout());
  await safeAdm("stopLocalRecording", () =>
    AudioDeviceModule.stopLocalRecording()
  );
  await safeAdm("stopRecording", () => AudioDeviceModule.stopRecording());

  // Drop input/output so the next enable rebuilds the audio engine.
  await safeAdm("engineAvailability none", () =>
    AudioDeviceModule.setEngineAvailability(AudioEngineAvailability.none)
  );

  try {
    await AudioSession.stopAudioSession();
  } catch {
    // ok
  }

  const native = getNativeSmartSpectra() as {
    deactivateAudioSession?: () => Promise<void>;
  } | null;
  await safeAdm("native deactivate", () =>
    native?.deactivateAudioSession?.() ?? Promise.resolve()
  );

  await new Promise((r) => setTimeout(r, 900));

  await safeAdm("engineAvailability default", () =>
    AudioDeviceModule.setEngineAvailability(AudioEngineAvailability.default)
  );

  try {
    await AudioSession.configureAudio({
      android: {
        preferredOutputList: ["speaker"],
        audioTypeOptions: AndroidAudioTypePresets.communication,
      },
      ios: { defaultOutput: "speaker" },
    });
    await AudioSession.startAudioSession();
  } catch (err) {
    console.warn("[voice] recover startAudioSession failed — retry", err);
    await new Promise((r) => setTimeout(r, 500));
    await AudioSession.startAudioSession();
  }

  // RestartEngine mute mode + VPIO toggle forces IO unit recreate.
  await safeAdm("setMuteMode RestartEngine", () =>
    AudioDeviceModule.setMuteMode(AudioEngineMuteMode.RestartEngine)
  );
  await safeAdm("voiceProcessing off", () =>
    AudioDeviceModule.setVoiceProcessingEnabled(false)
  );
  await new Promise((r) => setTimeout(r, 250));
  await safeAdm("voiceProcessing on", () =>
    AudioDeviceModule.setVoiceProcessingEnabled(true)
  );
  await safeAdm("setMicrophoneMuted false", () =>
    AudioDeviceModule.setMicrophoneMuted(false)
  );
  await safeAdm("startLocalRecording", () =>
    AudioDeviceModule.startLocalRecording()
  );

  console.warn("[voice] recoverAudioSession done", {
    recording: (() => {
      try {
        return AudioDeviceModule.isRecording();
      } catch {
        return null;
      }
    })(),
    engine: (() => {
      try {
        return AudioDeviceModule.isEngineRunning();
      } catch {
        return null;
      }
    })(),
    muted: (() => {
      try {
        return AudioDeviceModule.isMicrophoneMuted();
      } catch {
        return null;
      }
    })(),
  });
}

/** If date #2 connects but mic stays flat, poke ADM unmute + VPIO. */
export async function healSilentMic(): Promise<void> {
  console.warn("[voice] healSilentMic");
  await safeAdm("mute true", () => AudioDeviceModule.setMicrophoneMuted(true));
  await new Promise((r) => setTimeout(r, 120));
  await safeAdm("mute false", () =>
    AudioDeviceModule.setMicrophoneMuted(false)
  );
  await safeAdm("startLocalRecording", () =>
    AudioDeviceModule.startLocalRecording()
  );
}

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

/** Speaker only — never setAppleAudioConfiguration (LiveKit owns category). */
async function applySpeakerRoute(): Promise<void> {
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
    // optional
  }
}

/** @deprecated name kept for call sites — speaker route only. */
export async function restoreVoiceAudio(): Promise<void> {
  await applySpeakerRoute();
}

export async function teardownVoiceAudio(): Promise<void> {
  try {
    await AudioSession.stopAudioSession();
  } catch {
    // already stopped
  }
}

/** @deprecated — use recoverAudioSession. Kept for call-site compatibility. */
export async function hardResetAudioSession(): Promise<void> {
  await recoverAudioSession();
  try {
    await AudioSession.stopAudioSession();
  } catch {
    // leave inactive for ElevenLabs setup to start cleanly
  }
  await new Promise((r) => setTimeout(r, 300));
}

/** Serialize start/stop across dates. */
let voiceGate: Promise<void> = Promise.resolve();

function enqueueVoice<T>(fn: () => Promise<T>): Promise<T> {
  const run = voiceGate.then(fn, fn);
  voiceGate = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

type ConversationControls = {
  startSession: (cfg: ReturnType<typeof buildVoiceSessionConfig>) => void;
  endSession: () => void;
  setVolume?: (opts: { volume: number }) => void;
  setMuted?: (muted: boolean) => void;
  getInputVolume?: () => number;
  sendContextualUpdate?: (text: string) => void;
  status: string;
};

export function useDateConversation(sessionId: string): DateConversation & {
  lastError: string | null;
  inputLevel: number;
} {
  const [lastAgentLine, setLastAgentLine] = useState<string | null>(null);
  const [lastUserLine, setLastUserLine] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [inputLevel, setInputLevel] = useState(0);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const controlsRef = useRef<ConversationControls | null>(null);
  /** Session id we already called startSession for — blocks double-start kills. */
  const liveSidRef = useRef<string | null>(null);
  const stoppingRef = useRef(false);
  const statusRef = useRef<string>("disconnected");
  const disconnectWaitersRef = useRef<Array<() => void>>([]);

  const pushLine = useCallback((role: "agent" | "user", text: string) => {
    if (role === "agent") setLastAgentLine(text);
    else setLastUserLine(text);
    setTranscript((prev) => appendTranscriptEntry(prev, role, text));
  }, []);

  const conversation = useConversation({
    onConnect: () => {
      setLastError(null);
      void applySpeakerRoute();
      try {
        controlsRef.current?.setVolume?.({ volume: 1 });
      } catch {
        // optional
      }
      try {
        controlsRef.current?.setMuted?.(false);
      } catch {
        // optional
      }
      // Date #2: if capture stays silent after connect, poke ADM.
      void (async () => {
        await new Promise((r) => setTimeout(r, 1800));
        if (stoppingRef.current) return;
        let peak = 0;
        for (let i = 0; i < 8; i++) {
          try {
            const v = controlsRef.current?.getInputVolume?.() ?? 0;
            if (typeof v === "number" && v > peak) peak = v;
          } catch {
            // ignore
          }
          await new Promise((r) => setTimeout(r, 100));
        }
        if (peak < 0.005 && liveSidRef.current) {
          console.warn("[voice] silent mic after connect — healing", { peak });
          await healSilentMic();
          try {
            controlsRef.current?.setMuted?.(false);
          } catch {
            // optional
          }
        }
      })();
    },
    onError: (message: string, context?: Record<string, unknown>) => {
      const detail =
        (typeof context?.reason === "string" && context.reason) ||
        (typeof context?.debugMessage === "string" && context.debugMessage) ||
        (typeof context?.error === "string" && context.error) ||
        "";
      const raw =
        [message || "Voice connection failed", detail].filter(Boolean).join(" — ") ||
        "Voice connection failed";
      const lower = raw.toLowerCase();
      if (
        /WS closed|signal stream|negotiation timed out|cannot send signal request/i.test(
          raw
        ) &&
        !/quota|limit|credit|billing/i.test(raw)
      ) {
        console.warn("[voice] suppressed teardown noise:", raw);
        return;
      }
      if (
        /quota|credit|billing|limit exceeded|exceeds your quota|payment|payment_required/i.test(
          lower
        ) ||
        /server error:\s*unknown error/i.test(lower)
      ) {
        setLastError(
          "ElevenLabs quota exceeded — voice can’t start. Upgrade the plan or wait for the monthly reset, then retry."
        );
        return;
      }
      setLastError(raw);
    },
    onDisconnect: () => {
      console.warn("[voice] disconnected", {
        live: liveSidRef.current,
        stopping: stoppingRef.current,
      });
      if (liveSidRef.current && !stoppingRef.current) {
        setLastError(
          (prev) =>
            prev ??
            "ElevenLabs closed the voice room. Free-tier quota is likely exhausted — upgrade or wait for reset."
        );
      }
      liveSidRef.current = null;
      const waiters = disconnectWaitersRef.current;
      disconnectWaitersRef.current = [];
      waiters.forEach((resolve) => resolve());
    },
    onMessage: (payload: unknown) => {
      const agent = extractAgentSpokenLine(payload);
      if (agent) pushLine("agent", agent);
      const user = extractUserSpokenLine(payload);
      if (user) pushLine("user", user);
    },
    onIncomingEvent: (event: unknown) => {
      const parsed = extractFromIncomingEvent(event);
      if (parsed) pushLine(parsed.role, parsed.text);
    },
  });

  controlsRef.current = conversation as unknown as ConversationControls;
  statusRef.current = conversation.status;

  useEffect(() => {
    if (conversation.status !== "connected") {
      setInputLevel(0);
      return;
    }
    const getVol = () => {
      try {
        return controlsRef.current?.getInputVolume?.() ?? 0;
      } catch {
        return 0;
      }
    };
    const id = setInterval(() => {
      const v = getVol();
      setInputLevel(typeof v === "number" && Number.isFinite(v) ? v : 0);
    }, 120);
    return () => clearInterval(id);
  }, [conversation.status]);

  const waitUntilDisconnected = (ms: number) =>
    new Promise<void>((resolve) => {
      if (
        statusRef.current === "disconnected" ||
        statusRef.current === "error"
      ) {
        resolve();
        return;
      }
      const timer = setTimeout(() => {
        disconnectWaitersRef.current = disconnectWaitersRef.current.filter(
          (w) => w !== done
        );
        resolve();
      }, ms);
      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      disconnectWaitersRef.current.push(done);
    });

  const start = useCallback(async () => {
    await enqueueVoice(async () => {
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
      if (liveSidRef.current === sid && !stoppingRef.current) {
        console.log("[voice] start skipped — already live for", sid);
        return;
      }
      if (stoppingRef.current) {
        await new Promise((r) => setTimeout(r, 500));
      }

      const micOk = await requestMicrophonePermission();
      if (!micOk) {
        throw new Error("Microphone permission denied.");
      }
      setLastError(null);
      setLastUserLine(null);
      setLastAgentLine(null);
      setTranscript([]);

      // Camera must release; rebuild WebRTC capture before the next room.
      await ensurePresageStopped();
      await recoverAudioSession();
      // Leave session active — ElevenLabs setup will configure/start again.

      let ready = controlsRef.current;
      if (!ready?.startSession) {
        await new Promise((r) => setTimeout(r, 400));
        ready = controlsRef.current;
      }
      if (!ready?.startSession) {
        throw new Error("Voice controls not ready — try again.");
      }

      console.log("[voice] startSession", sid);
      liveSidRef.current = sid;
      ready.startSession(buildVoiceSessionConfig(sid));
      try {
        ready.setVolume?.({ volume: 1 });
        ready.setMuted?.(false);
      } catch {
        // optional
      }
      setTimeout(() => {
        if (liveSidRef.current === sid) void applySpeakerRoute();
      }, 800);
    });
  }, []);

  const stop = useCallback(async () => {
    await enqueueVoice(async () => {
      stoppingRef.current = true;
      liveSidRef.current = null;
      try {
        controlsRef.current?.endSession();
      } catch {
        // already ended
      }
      await waitUntilDisconnected(3500);
      await ensurePresageStopped();
      // Full ADM teardown so date #2 can rebuild capture.
      await recoverAudioSession();
      try {
        await AudioSession.stopAudioSession();
      } catch {
        // ok
      }
      await new Promise((r) => setTimeout(r, 500));
      stoppingRef.current = false;
    });
  }, []);

  const sendSignal = useCallback((signal: string) => {
    const text = signal.trim();
    if (!text) return;
    try {
      const payload = text.startsWith("[SIGNAL:")
        ? text
        : `[SIGNAL: ${text}]`;
      controlsRef.current?.sendContextualUpdate?.(payload);
    } catch {
      // optional during demo
    }
  }, []);

  return {
    start,
    stop,
    sendSignal,
    isSpeaking: Boolean(conversation.isSpeaking),
    status: mapVoiceStatus(conversation.status),
    lastAgentLine,
    lastUserLine,
    transcript,
    configured: isVoiceConfigured(),
    lastError,
    inputLevel,
  };
}
