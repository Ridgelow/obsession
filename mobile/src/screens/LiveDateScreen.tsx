import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { NerveTag } from "../components/NerveTag";
import { AiBubble } from "../components/AiBubble";
import { colors, fonts, spacing, type, minHitSlop } from "../theme";
import { useAppState } from "../state/AppState";
import {
  endSessionAndCoach,
  getTimeline,
  sendTelemetry,
  setBaseline,
  startSession,
} from "../services/api";
import { openVitalsSource } from "../services/presage";
import { useDateConversation } from "../services/elevenlabs";
import { ConversationProvider } from "@elevenlabs/react-native";
import {
  AI_LINE_POLL_MS,
  BASELINE_WINDOW_SEC,
  DEMO_USER_ID,
  TELEMETRY_INTERVAL_MS,
  averageHeartRate,
  demoLineAt,
  isCoachResponse,
  latestAiLine,
  mapScenario,
  shouldShowNerves,
} from "../services/sessionHelpers";

type Props = NativeStackScreenProps<RootStackParamList, "LiveDate">;

const DEFAULT_LINE = "Take a breath — I’m here when you are.";

/**
 * Mount ConversationProvider as the direct parent of ElevenLabs hooks.
 * (App-level VoiceGateway alone was still crashing on Begin.)
 */
export function LiveDateScreen(props: Props) {
  return (
    <ConversationProvider>
      <LiveDateBody {...props} />
    </ConversationProvider>
  );
}

function LiveDateBody({ navigation, route }: Props) {
  const {
    scenario,
    setLastMemory,
    bumpSessionCount,
    markSessionComplete,
  } = useAppState();
  const [sessionId, setSessionId] = useState<string | null>(
    route.params?.sessionId ?? null
  );
  const [seconds, setSeconds] = useState(0);
  const [bpm, setBpm] = useState<number | null>(null);
  const [delta, setDelta] = useState(0);
  const [nerves, setNerves] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [sessionHint, setSessionHint] = useState<string | null>(null);
  const [vitalsHint, setVitalsHint] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(route.params?.sessionId ?? null);
  const baselineRef = useRef<number | null>(null);
  const baselinePostedRef = useRef(false);
  const samplesRef = useRef<number[]>([]);
  const endingRef = useRef(false);
  const stopVoiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversation = useDateConversation(sessionId ?? "");

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Create session once if Home didn't pass one.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (sessionIdRef.current) {
        bumpSessionCount();
        return;
      }
      try {
        const scenarioKey = mapScenario(route.params?.scenario ?? scenario);
        const res = await startSession(DEMO_USER_ID, scenarioKey);
        if (cancelled) return;
        sessionIdRef.current = res.sessionId;
        setSessionId(res.sessionId);
        if (res.priorPatterns) setLastMemory(res.priorPatterns);
        bumpSessionCount();
      } catch {
        if (!cancelled) {
          setSessionHint("Offline demo — vitals + scripted lines only.");
          bumpSessionCount();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Voice: start when we have a session id. Delay teardown so React Strict Mode
  // remounts don't immediately kill a live LiveKit room (that was silencing audio).
  useEffect(() => {
    if (!sessionId) return;
    if (!conversation.configured) {
      setVoiceError(null);
      return;
    }
    if (stopVoiceTimerRef.current) {
      clearTimeout(stopVoiceTimerRef.current);
      stopVoiceTimerRef.current = null;
    }
    let cancelled = false;
    const kickoff = setTimeout(() => {
      conversation
        .start()
        .then(() => {
          if (!cancelled) setVoiceError(null);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setVoiceError(
            err instanceof Error
              ? err.message
              : "Voice failed — continuing with on-screen lines."
          );
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(kickoff);
      stopVoiceTimerRef.current = setTimeout(() => {
        conversation.stop().catch(() => undefined);
        stopVoiceTimerRef.current = null;
      }, 900);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (conversation.lastError) setVoiceError(conversation.lastError);
  }, [conversation.lastError]);

  useEffect(() => {
    if (!sessionId || baselineRef.current == null || baselinePostedRef.current) {
      return;
    }
    baselinePostedRef.current = true;
    setBaseline(sessionId, baselineRef.current).catch(() => {
      baselinePostedRef.current = false;
    });
  }, [sessionId]);

  // Vitals loop (simulator or Presage).
  useEffect(() => {
    let cancelled = false;
    let source: Awaited<ReturnType<typeof openVitalsSource>> | null = null;
    let tick: ReturnType<typeof setInterval> | null = null;

    (async () => {
      try {
        const opened = await openVitalsSource();
        if (cancelled) {
          await opened.stop();
          return;
        }
        source = opened;
        setVitalsHint(opened.hint);

        tick = setInterval(() => {
          if (endingRef.current || !source) return;
          setSeconds((s) => s + 1);
          const reading = source.latest();
          if (!reading) return;

          setBpm(reading.heartRate);
          samplesRef.current.push(reading.heartRate);

          if (
            baselineRef.current == null &&
            samplesRef.current.length >= BASELINE_WINDOW_SEC
          ) {
            const avg = averageHeartRate(samplesRef.current);
            baselineRef.current = avg;
            const sid = sessionIdRef.current;
            if (sid && !baselinePostedRef.current) {
              baselinePostedRef.current = true;
              setBaseline(sid, avg).catch(() => {
                baselinePostedRef.current = false;
              });
            }
          }

          const localDelta =
            baselineRef.current != null
              ? reading.heartRate - baselineRef.current
              : 0;

          const sid = sessionIdRef.current;
          if (!sid) {
            setDelta(Math.round(localDelta));
            setNerves(shouldShowNerves(false, localDelta));
            return;
          }

          sendTelemetry(sid, reading)
            .then((tel) => {
              if (endingRef.current) return;
              const nextDelta =
                typeof tel.delta === "number" ? tel.delta : localDelta;
              setDelta(Math.round(nextDelta));
              setNerves(shouldShowNerves(Boolean(tel.flagged), nextDelta));
            })
            .catch(() => {
              if (endingRef.current) return;
              setDelta(Math.round(localDelta));
              setNerves(shouldShowNerves(false, localDelta));
            });
        }, TELEMETRY_INTERVAL_MS);
      } catch {
        if (!cancelled) {
          setVitalsHint("Vitals unavailable — timer still runs.");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (tick) clearInterval(tick);
      source?.stop();
    };
  }, []);

  // Prefer live timeline lines when the server has them.
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const pull = async () => {
      try {
        const turns = await getTimeline(sessionId);
        if (cancelled) return;
        const ai = latestAiLine(turns);
        if (ai) setLine(ai);
      } catch {
        // Keep demo / voice lines.
      }
    };
    pull();
    const poll = setInterval(pull, AI_LINE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [sessionId]);

  // Prefer live agent transcript; fall back to timeline / demo lines.
  useEffect(() => {
    if (conversation.lastAgentLine) {
      setLine(conversation.lastAgentLine);
      return;
    }
    const demo = demoLineAt(seconds);
    if (demo) setLine(demo);
  }, [seconds, conversation.lastAgentLine]);

  const onEnd = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    setEnding(true);
    if (stopVoiceTimerRef.current) {
      clearTimeout(stopVoiceTimerRef.current);
      stopVoiceTimerRef.current = null;
    }
    try {
      await conversation.stop();
    } catch {
      // optional
    }
    const sid = sessionIdRef.current;
    if (!sid) {
      markSessionComplete();
      navigation.replace("Results", {
        scores: {
          chemistry: 70,
          conversation: 64,
          composure: 55,
          curiosity: 78,
        },
        keyMoment: "0:28 — asked about your last relationship",
        coaching:
          "You recovered after the pause — try landing on one clear sentence next time.",
        error: undefined,
      });
      return;
    }
    try {
      const coach = await endSessionAndCoach(sid);
      markSessionComplete();
      navigation.replace("Results", {
        sessionId: sid,
        ...(isCoachResponse(coach) ? coach : {}),
        error: isCoachResponse(coach)
          ? undefined
          : "Coach response was missing scores.",
      });
    } catch {
      markSessionComplete();
      navigation.replace("Results", {
        sessionId: sid,
        scores: {
          chemistry: 70,
          conversation: 64,
          composure: 55,
          curiosity: 78,
        },
        keyMoment: "0:28 — asked about your last relationship",
        coaching:
          "You recovered after the pause — try landing on one clear sentence next time.",
      });
    }
  }, [conversation, markSessionComplete, navigation]);

  const mm = String(Math.floor(seconds / 60));
  const ss = String(seconds % 60).padStart(2, "0");
  const progress = Math.min(seconds / 150, 1);
  const spokenLine =
    conversation.lastAgentLine ?? line ?? demoLineAt(seconds) ?? DEFAULT_LINE;
  const voiceHint = voiceError
    ? voiceError
    : !conversation.configured
      ? "On-screen date lines (voice agent not configured)."
      : conversation.status === "connecting"
        ? "Connecting voice…"
        : conversation.status === "connected"
          ? conversation.isSpeaking
            ? "Date is speaking — turn volume up"
            : "Listening — your words should appear below"
          : sessionId
            ? "Voice disconnected — scripted lines still play."
            : null;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#1a0a12", colors.void, "#120810"]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onEnd}
            disabled={ending}
            hitSlop={12}
            style={styles.endHit}
          >
            <Text style={styles.end}>{ending ? "Ending…" : "End"}</Text>
          </Pressable>
          <View style={styles.centerMeta}>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progress * 100}%` }]}
              />
            </View>
            <Text style={styles.timer}>
              • {mm}:{ss}
            </Text>
          </View>
          <View style={styles.endHit} />
        </View>

        {nerves && bpm != null ? (
          <View style={styles.tagWrap}>
            <NerveTag bpm={bpm} delta={delta} />
          </View>
        ) : (
          <View style={styles.tagWrap}>
            <Text style={styles.quietHr}>
              {bpm != null ? `${bpm} BPM` : "HR…"}
            </Text>
          </View>
        )}

        <View style={styles.stage}>
          <View style={styles.silhouetteOuter}>
            <View style={styles.silhouette} />
          </View>
          {sessionHint ? (
            <Text style={styles.hint}>{sessionHint}</Text>
          ) : null}
          {voiceHint ? <Text style={styles.hint}>{voiceHint}</Text> : null}
          {vitalsHint ? <Text style={styles.hint}>{vitalsHint}</Text> : null}
        </View>

        <View style={styles.bottom}>
          <Text style={styles.speakerLabel}>Them</Text>
          <AiBubble text={spokenLine} />
          <Text style={[styles.speakerLabel, styles.youLabel]}>You</Text>
          <View style={styles.youBubble}>
            <Text style={styles.youText}>
              {conversation.lastUserLine
                ? conversation.lastUserLine
                : conversation.status === "connected"
                  ? "Say something — transcript appears here…"
                  : "Waiting for voice…"}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.void },
  safe: { flex: 1, paddingHorizontal: spacing.lg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  endHit: {
    minWidth: minHitSlop,
    minHeight: minHitSlop,
    justifyContent: "center",
  },
  end: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.subhead,
    color: colors.pulse,
  },
  centerMeta: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
  },
  progressTrack: {
    width: "70%",
    height: 3,
    backgroundColor: colors.line,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.pulse },
  timer: {
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.muted,
  },
  tagWrap: {
    alignItems: "flex-end",
    marginTop: spacing.md,
    minHeight: 36,
  },
  quietHr: {
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.muted,
  },
  stage: { flex: 1, alignItems: "center", justifyContent: "center" },
  silhouetteOuter: {
    width: 220,
    height: 280,
    borderRadius: 110,
    borderWidth: 1.5,
    borderColor: "rgba(194, 75, 161, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.hush,
    shadowOpacity: 0.35,
    shadowRadius: 40,
  },
  silhouette: {
    width: 160,
    height: 200,
    borderRadius: 80,
    backgroundColor: "#12080c",
  },
  hint: {
    marginTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.muted,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
  bottom: { paddingBottom: spacing.xl, gap: 8 },
  speakerLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.caption1,
    color: colors.muted,
    marginLeft: 4,
  },
  youLabel: { marginTop: spacing.sm, alignSelf: "flex-end", marginRight: 4 },
  youBubble: {
    alignSelf: "flex-end",
    maxWidth: "92%",
    backgroundColor: "rgba(215, 71, 69, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(215, 71, 69, 0.35)",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  youText: {
    fontFamily: fonts.body,
    fontSize: type.subhead,
    lineHeight: 20,
    color: colors.bone,
  },
});
