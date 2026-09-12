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
import { createVitalsSimulator } from "../services/presage";
import { useDateConversation } from "../services/elevenlabs";
import {
  AI_LINE_POLL_MS,
  BASELINE_WINDOW_SEC,
  DEMO_USER_ID,
  TELEMETRY_INTERVAL_MS,
  averageHeartRate,
  isCoachResponse,
  latestAiLine,
  mapScenario,
  shouldShowNerves,
} from "../services/sessionHelpers";

type Props = NativeStackScreenProps<RootStackParamList, "LiveDate">;

const DEFAULT_LINE = "Take a breath — I’m here when you are.";

export function LiveDateScreen({ navigation, route }: Props) {
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
  const [bpm, setBpm] = useState(71);
  const [delta, setDelta] = useState(0);
  const [nerves, setNerves] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [sessionHint, setSessionHint] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(route.params?.sessionId ?? null);
  const baselineRef = useRef<number | null>(null);
  const baselinePostedRef = useRef(false);
  const samplesRef = useRef<number[]>([]);
  const endingRef = useRef(false);

  const conversation = useDateConversation(sessionId ?? "");

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    const scenarioKey = mapScenario(route.params?.scenario ?? scenario);
    (async () => {
      if (sessionIdRef.current) {
        bumpSessionCount();
        return;
      }
      try {
        const res = await startSession(DEMO_USER_ID, scenarioKey);
        if (cancelled) return;
        sessionIdRef.current = res.sessionId;
        setSessionId(res.sessionId);
        if (res.priorPatterns) setLastMemory(res.priorPatterns);
        bumpSessionCount();
      } catch {
        if (!cancelled) {
          setSessionHint("Server unreachable — local vitals still running.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // One session per LiveDate mount — do not restart when AppState identity shifts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    conversation.start().catch(() => undefined);
    return () => {
      conversation.stop().catch(() => undefined);
    };
    // Stub hook is stable; sessionId is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || baselineRef.current == null || baselinePostedRef.current) {
      return;
    }
    baselinePostedRef.current = true;
    setBaseline(sessionId, baselineRef.current).catch(() => {
      baselinePostedRef.current = false;
    });
  }, [sessionId]);

  useEffect(() => {
    const sim = createVitalsSimulator();
    const tick = setInterval(() => {
      if (endingRef.current) return;
      const reading = sim.tick();
      setBpm(reading.heartRate);
      setSeconds((s) => s + 1);
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

    return () => {
      clearInterval(tick);
      sim.reset();
    };
  }, []);

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
        // Timeline is empty until Phase A + B write turns.
      }
    };
    pull();
    const poll = setInterval(pull, AI_LINE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [sessionId]);

  const onEnd = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    setEnding(true);
    try {
      await conversation.stop();
    } catch {
      // Phase B stub / SDK stop is optional.
    }
    const sid = sessionIdRef.current;
    if (!sid) {
      markSessionComplete();
      navigation.replace("Results", {
        error:
          "No session id. Start Phase A on :8787 or set EXPO_PUBLIC_API_URL.",
      });
      return;
    }
    try {
      const coach = await endSessionAndCoach(sid);
      if (coach.coaching) setLastMemory(coach.coaching);
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
        error:
          "Could not load coaching. Is Phase A running, and is EXPO_PUBLIC_API_URL set?",
      });
    }
  }, [conversation, markSessionComplete, navigation, setLastMemory]);

  const mm = String(Math.floor(seconds / 60));
  const ss = String(seconds % 60).padStart(2, "0");
  const progress = Math.min(seconds / 150, 1);

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

        {nerves ? (
          <View style={styles.tagWrap}>
            <NerveTag bpm={bpm} delta={delta} />
          </View>
        ) : (
          <View style={styles.tagWrap}>
            <Text style={styles.quietHr}>{bpm} BPM</Text>
          </View>
        )}

        <View style={styles.stage}>
          <View style={styles.silhouetteOuter}>
            <View style={styles.silhouette} />
          </View>
          {sessionHint ? (
            <Text style={styles.hint}>{sessionHint}</Text>
          ) : null}
        </View>

        <View style={styles.bottom}>
          <AiBubble text={line ?? DEFAULT_LINE} />
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
  },
  bottom: { paddingBottom: spacing.xl },
});
