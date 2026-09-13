// DEV-only: two back-to-back ElevenLabs sessions; log max getInputVolume.
// Provider remounted between A and B; recoverAudioSession() in the gap.

import { useEffect, useRef, useState } from "react";
// Install startAudioSession retry patch before ElevenLabs sessions.
import "./elevenlabs.native";
import { ConversationProvider, useConversation } from "@elevenlabs/react-native";
import { AudioSession } from "@livekit/react-native";
import { buildVoiceSessionConfig, voiceAgentId } from "./elevenlabsConfig";

type Phase = "a" | "gap" | "b" | "done";

function SessionProbe({
  label,
  sessionId,
  onDone,
}: {
  label: string;
  sessionId: string;
  onDone: (maxInput: number) => void;
}) {
  const finished = useRef(false);
  const conversation = useConversation({
    onConnect: () => console.warn(`[voice-regression] ${label} onConnect`),
    onDisconnect: () =>
      console.warn(`[voice-regression] ${label} onDisconnect`),
    onError: (m: string) =>
      console.warn(`[voice-regression] ${label} onError`, m),
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      console.warn(`[voice-regression] ${label} startSession`, sessionId);
      conversation.startSession(buildVoiceSessionConfig(sessionId));
      await new Promise((r) => setTimeout(r, 4000));
      let max = 0;
      const end = Date.now() + 5000;
      while (!cancelled && Date.now() < end) {
        try {
          const v = conversation.getInputVolume?.() ?? 0;
          if (typeof v === "number" && v > max) max = v;
        } catch {
          // ignore
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      console.warn(`[voice-regression] ${label} maxInput=`, max);
      try {
        conversation.endSession();
      } catch {
        // ignore
      }
      await new Promise((r) => setTimeout(r, 2000));
      if (!finished.current) {
        finished.current = true;
        onDone(max);
      }
    })().catch((err) => {
      console.warn(`[voice-regression] ${label} failed`, err);
      if (!finished.current) {
        finished.current = true;
        onDone(0);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/** Mount once in App when EXPO_PUBLIC_VOICE_REGRESSION=1. */
export function VoiceRegressionHarness() {
  const [phase, setPhase] = useState<Phase>("a");
  const maxA = useRef(0);
  const boot = useRef(false);

  useEffect(() => {
    if (boot.current) return;
    boot.current = true;
    console.warn(
      "[voice-regression] starting LiveKit double-session A/B (recover between)"
    );
  }, []);

  if (phase === "done" || !voiceAgentId()) return null;
  if (phase === "gap") return null;

  const label = phase === "a" ? "A" : "B";
  const sid = `regress-${phase}-${Date.now()}`;

  return (
    <ConversationProvider key={`voice-reg-${phase}`}>
      <SessionProbe
        label={label}
        sessionId={sid}
        onDone={(max) => {
          if (phase === "a") {
            maxA.current = max;
            setPhase("gap");
            void (async () => {
              try {
                const { recoverAudioSession } = await import(
                  "./elevenlabs.native"
                );
                await recoverAudioSession();
                console.warn(
                  "[voice-regression] gap done — engine availability cycled"
                );
              } catch (err) {
                console.warn("[voice-regression] recover failed", err);
              }
              setPhase("b");
            })();
          } else {
            const threshold = 0.002;
            console.warn(
              "[voice-regression] VERDICT",
              JSON.stringify({
                providerRemount: true,
                recoveredBetween: true,
                sessionA_ok: maxA.current >= threshold,
                sessionB_ok: max >= threshold,
                sessionB_dead_after_A:
                  maxA.current >= threshold && max < threshold,
                maxA: maxA.current,
                maxB: max,
                threshold,
              })
            );
            setPhase("done");
          }
        }}
      />
    </ConversationProvider>
  );
}
