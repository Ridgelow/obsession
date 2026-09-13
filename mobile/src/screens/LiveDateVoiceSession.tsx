import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { NerveTag } from "../components/NerveTag";
import { AiBubble } from "../components/AiBubble";
import { NikkiAvatar } from "../components/NikkiAvatar";
import { DateCameraPreview } from "../components/DateCameraPreview";
import { PresageNativePreview } from "../components/PresageNativePreview";
import { LiveDateErrorBoundary } from "../components/LiveDateErrorBoundary";
import { colors, fonts, spacing, type, minHitSlop } from "../theme";
import { useAppState } from "../state/AppState";
import {
  getTimeline,
  sendTelemetry,
  setBaseline,
  startSession,
} from "../services/api";
import { openVitalsSource } from "../services/presage";
import { preferNativePresage } from "../services/presageConfig";
import { useDateConversation, restoreVoiceAudio } from "../services/elevenlabs";
import { ConversationProvider } from "@elevenlabs/react-native";
import {
  AI_LINE_POLL_MS,
  BASELINE_WINDOW_SEC,
  DEMO_USER_ID,
  TELEMETRY_INTERVAL_MS,
  averageHeartRate,
  demoLineAt,
  latestAiLine,
  mapScenario,
  shouldShowNerves,
} from "../services/sessionHelpers";
import {
  DATE_PARTNER_NAME,
  displayUserName,
} from "../services/profileStorage";

type Props = NativeStackScreenProps<RootStackParamList, "LiveDate">;

const DEFAULT_LINE = "Take a breath — I’m here when you are.";

/** Matched face-cam + Nikki portrait diameter (outer ring). */
const PORTRAIT_SIZE = 128;
const PORTRAIT_INNER = PORTRAIT_SIZE - 6;

/** Survives Fast Refresh remounts so a delayed voice stop can't kill the new room. */
let voiceLifecycleEpoch = 0;

/** Loaded only after NativeModules.WebRTCModule is confirmed present. */
export function LiveDateVoiceSession(props: Props) {
  // Fresh provider every visit — never reuse LiveKit controls across dates.
  const [voiceMountId] = useState(
    () => `voice-${props.route.params?.sessionId ?? "pending"}-${Date.now()}`
  );
  return (
    <LiveDateErrorBoundary>
      <ConversationProvider key={voiceMountId}>
        <LiveDateBody {...props} />
      </ConversationProvider>
    </LiveDateErrorBoundary>
  );
}

export default LiveDateVoiceSession;

function LiveDateBody({ navigation, route }: Props) {
  const {
    scenario,
    setLastMemory,
    bumpSessionCount,
    profile,
  } = useAppState();
  const [sessionId, setSessionId] = useState<string | null>(
    route.params?.sessionId ?? null
  );
  const [sessionHint, setSessionHint] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(route.params?.sessionId ?? null);

  // Always call the hook (Rules of Hooks); startSession waits for a real id.
  const conversation = useDateConversation(sessionId ?? "");

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Create session once if Home didn't pass one. Never leave this screen stuck —
  // dead tunnel / slow API must fall through to a local offline id.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (sessionIdRef.current) {
        bumpSessionCount();
        return;
      }
      const fallbackId = `local-${Date.now()}`;
      try {
        const scenarioKey = mapScenario(route.params?.scenario ?? scenario);
        const res = await startSession(DEMO_USER_ID, scenarioKey);
        if (cancelled) return;
        sessionIdRef.current = res.sessionId;
        setSessionId(res.sessionId);
        if (res.priorPatterns) setLastMemory(res.priorPatterns);
        bumpSessionCount();
      } catch {
        if (cancelled) return;
        sessionIdRef.current = fallbackId;
        setSessionId(fallbackId);
        setSessionHint("Offline demo — vitals + scripted lines only.");
        bumpSessionCount();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!sessionId) {
    return (
      <View style={styles.bootWrap}>
        <Text style={styles.bootText}>Setting up your date…</Text>
      </View>
    );
  }

  return (
    <LiveDateActive
      navigation={navigation}
      route={route}
      sessionId={sessionId}
      sessionHint={sessionHint}
      conversation={conversation}
    />
  );
}

function LiveDateActive({
  navigation,
  route,
  sessionId,
  sessionHint,
  conversation,
}: Props & {
  sessionId: string;
  sessionHint: string | null;
  conversation: ReturnType<typeof useDateConversation>;
}) {
  const { scenario, markSessionComplete, profile } = useAppState();
  const youName = displayUserName(profile);
  const nativePresage = preferNativePresage();
  const [seconds, setSeconds] = useState(0);
  const [bpm, setBpm] = useState<number | null>(null);
  const [delta, setDelta] = useState(0);
  const [nerves, setNerves] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [vitalsHint, setVitalsHint] = useState<string | null>(null);
  const [vitalsKind, setVitalsKind] = useState<"presage" | "simulator" | null>(
    null
  );
  const [expression, setExpression] = useState<string | null>(null);
  const [vitalsFeed, setVitalsFeed] = useState<
    { id: string; text: string }[]
  >([]);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const sessionIdRef = useRef<string>(sessionId);
  const transcriptScrollRef = useRef<ScrollView>(null);
  const baselineRef = useRef<number | null>(null);
  const baselinePostedRef = useRef(false);
  const samplesRef = useRef<number[]>([]);
  const endingRef = useRef(false);
  const stopVoiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signalSentRef = useRef(false);
  const lastFeedExprRef = useRef<string | null>(null);
  const lastFeedBpmRef = useRef<number | null>(null);
  const lastFeedAtRef = useRef(0);
  const vitalsSourceRef = useRef<Awaited<
    ReturnType<typeof openVitalsSource>
  > | null>(null);
  const startVoiceRef = useRef(conversation.start);
  const stopVoiceRef = useRef(conversation.stop);
  const inputLevelRef = useRef(conversation.inputLevel);
  startVoiceRef.current = conversation.start;
  stopVoiceRef.current = conversation.stop;
  inputLevelRef.current = conversation.inputLevel;

  const scrollTranscriptToEnd = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      transcriptScrollRef.current?.scrollToEnd({ animated });
    });
  }, []);

  // Keep the chat pinned to the latest turn / vitals note.
  useEffect(() => {
    scrollTranscriptToEnd(true);
  }, [
    conversation.transcript.length,
    conversation.lastAgentLine,
    conversation.lastUserLine,
    vitalsFeed.length,
    scrollTranscriptToEnd,
  ]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Voice: start once per session id. Cleanup must NOT kill a room that just
  // connected (Strict Mode / fast remount was unpublishing the mic in ~1s).
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
    const epoch = ++voiceLifecycleEpoch;
    let cancelled = false;
    const kickoff = setTimeout(() => {
      if (cancelled || epoch !== voiceLifecycleEpoch) return;
      console.log("[LiveDate] starting voice session", sessionId);
      startVoiceRef
        .current()
        .then(() => {
          if (!cancelled && epoch === voiceLifecycleEpoch) setVoiceError(null);
        })
        .catch((err: unknown) => {
          if (cancelled || epoch !== voiceLifecycleEpoch) return;
          console.warn("[LiveDate] voice start failed", err);
          setVoiceError(
            err instanceof Error
              ? err.message
              : "Voice failed — continuing with on-screen lines."
          );
        });
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(kickoff);
      // Long delay so React remounts don't tear down a healthy room.
      stopVoiceTimerRef.current = setTimeout(() => {
        if (epoch !== voiceLifecycleEpoch) return;
        // Only stop if End was pressed or we're truly leaving without a newer epoch.
        if (!endingRef.current && epoch === voiceLifecycleEpoch) {
          // Still the latest epoch after 2.5s with no remount → real unmount.
          stopVoiceRef.current().catch(() => undefined);
        }
        stopVoiceTimerRef.current = null;
      }, 2500);
    };
  }, [sessionId, conversation.configured]);

  useEffect(() => {
    if (endingRef.current) return;
    if (conversation.lastError) setVoiceError(conversation.lastError);
  }, [conversation.lastError]);

  // NERVES↑ → inject a light [SIGNAL] into the live agent (hosted Gemini path).
  useEffect(() => {
    if (!nerves || signalSentRef.current) return;
    if (conversation.status !== "connected") return;
    signalSentRef.current = true;
    const abs = Math.abs(Math.round(delta));
    const dir = delta >= 0 ? "jumped" : "dropped";
    conversation.sendSignal?.(
      `heart rate ${dir} ${abs}bpm on this question`
    );
    // Intentionally omit full `conversation` — it changes every mic-level tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nerves, delta, conversation.status, conversation.sendSignal]);
  useEffect(() => {
    if (!sessionId || baselineRef.current == null || baselinePostedRef.current) {
      return;
    }
    baselinePostedRef.current = true;
    setBaseline(sessionId, baselineRef.current).catch(() => {
      baselinePostedRef.current = false;
    });
  }, [sessionId]);

  // Vitals: wait until voice is connected AND mic is live (or timeout), then
  // start SmartSpectra. Never remount expo-camera alongside it.
  useEffect(() => {
    if (!sessionId) return;
    if (conversation.configured && conversation.status !== "connected") {
      return;
    }
    let cancelled = false;
    let source: Awaited<ReturnType<typeof openVitalsSource>> | null = null;
    let tick: ReturnType<typeof setInterval> | null = null;

    const pushVitalsNote = (text: string) => {
      const id = `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setVitalsFeed((prev) => [...prev.slice(-8), { id, text }]);
    };

    const waitForMicOrTimeout = async () => {
      const deadline = Date.now() + 5000;
      while (!cancelled && Date.now() < deadline) {
        if (inputLevelRef.current > 0.015) return;
        await new Promise((r) => setTimeout(r, 200));
      }
    };

    const startVitals = async () => {
      try {
        // Prefer starting camera only after mic is clearly publishing.
        if (conversation.configured) {
          await waitForMicOrTimeout();
          await new Promise((r) => setTimeout(r, nativePresage ? 600 : 200));
        } else {
          await new Promise((r) => setTimeout(r, 400));
        }
        if (cancelled || endingRef.current) return;

        const opened = await openVitalsSource();
        if (cancelled || endingRef.current) {
          await opened.stop();
          return;
        }
        source = opened;
        vitalsSourceRef.current = opened;
        setVitalsHint(
          opened.kind === "presage"
            ? "Hold still a few seconds — locking pulse…"
            : opened.hint
        );
        setVitalsKind(opened.kind);
        // Speaker only after camera — never reconfigure AVAudioSession category.
        await new Promise((r) => setTimeout(r, 400));
        if (!cancelled && !endingRef.current) {
          await restoreVoiceAudio();
        }
        if (opened.kind === "presage") {
          pushVitalsNote("Vitals camera on");
        }

        tick = setInterval(() => {
          if (endingRef.current || !source) return;

          const now = Date.now();
          const reading = source.latest();
          if (!reading) return;

          if (reading.heartRate > 0) setBpm(reading.heartRate);
          if (reading.expression) setExpression(reading.expression);

          if (reading.heartRate > 0) {
            samplesRef.current.push(reading.heartRate);
          }

          const expr = reading.expression ?? null;
          const hr = reading.heartRate > 0 ? reading.heartRate : null;
          const meaningfulExpr =
            expr != null &&
            expr !== "neutral" &&
            expr !== lastFeedExprRef.current;
          const prevBpm = lastFeedBpmRef.current;
          const bpmJump =
            hr != null &&
            prevBpm != null &&
            Math.abs(hr - prevBpm) >= 10;
          const firstLock = hr != null && prevBpm == null;
          const spaced = now - lastFeedAtRef.current > 14000;
          if (firstLock) {
            lastFeedAtRef.current = now;
            lastFeedBpmRef.current = hr;
            pushVitalsNote(`Pulse locked · ${hr} BPM`);
            if (opened.kind === "presage") setVitalsHint("Camera HR live");
          } else if ((meaningfulExpr || bpmJump) && spaced) {
            lastFeedAtRef.current = now;
            if (expr && expr !== "neutral") lastFeedExprRef.current = expr;
            if (hr != null) lastFeedBpmRef.current = hr;
            if (bpmJump && hr != null) {
              const dir = hr > (prevBpm ?? hr) ? "up" : "down";
              pushVitalsNote(`Heart rate ${dir} · ${hr} BPM`);
            } else if (meaningfulExpr) {
              pushVitalsNote(`Expression · ${expr}`);
            }
          } else if (hr != null) {
            lastFeedBpmRef.current = hr;
          }

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
              pushVitalsNote(`Baseline · ${avg} BPM`);
              lastFeedAtRef.current = now;
            }
          }

          if (reading.heartRate <= 0) return;

          const base = baselineRef.current;
          const localDelta = base != null ? reading.heartRate - base : 0;
          if (base != null) {
            setDelta(localDelta);
            setNerves(shouldShowNerves(false, localDelta));
          }

          const sid = sessionIdRef.current;
          if (sid) {
            sendTelemetry(sid, {
              heartRate: reading.heartRate,
              breathingRate: reading.breathingRate,
              engagement: reading.engagement,
              source: reading.source,
            })
              .then((tel) => {
                if (endingRef.current) return;
                const nextDelta =
                  typeof tel.delta === "number" ? tel.delta : localDelta;
                setDelta(Math.round(nextDelta));
                setNerves(shouldShowNerves(Boolean(tel.flagged), nextDelta));
              })
              .catch(() => undefined);
          }
        }, TELEMETRY_INTERVAL_MS);
      } catch {
        if (!cancelled) {
          setVitalsHint("Vitals unavailable — timer still runs.");
          setVitalsKind("simulator");
        }
      }
    };

    void startVitals();

    return () => {
      cancelled = true;
      if (tick) clearInterval(tick);
      vitalsSourceRef.current = null;
      source?.stop().catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, conversation.status, conversation.configured, nativePresage]);

  // Wall-clock timer independent of camera warm-up (vitals start later for mic safety).
  useEffect(() => {
    if (!sessionId) return;
    if (conversation.configured && conversation.status !== "connected") return;
    const id = setInterval(() => {
      if (endingRef.current) return;
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [sessionId, conversation.status, conversation.configured]);

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
    setVoiceError(null);
    if (stopVoiceTimerRef.current) {
      clearTimeout(stopVoiceTimerRef.current);
      stopVoiceTimerRef.current = null;
    }

    const turns = conversation.transcript.map((entry) => ({
      speaker: (entry.role === "user" ? "user" : "ai") as "user" | "ai",
      text: entry.text,
    }));
    const sid = sessionIdRef.current;

    // Camera off first, then await voice stop so date #2 doesn't join while
    // LiveKit is still reconnecting (that caused "Server error: Unknown error").
    try {
      await vitalsSourceRef.current?.stop();
    } catch {
      // already stopped
    }
    vitalsSourceRef.current = null;

    if (stopVoiceTimerRef.current) {
      clearTimeout(stopVoiceTimerRef.current);
      stopVoiceTimerRef.current = null;
    }

    try {
      await Promise.race([
        conversation.stop(),
        new Promise((r) => setTimeout(r, 4500)),
      ]);
    } catch {
      // ignore disconnect noise
    }

    markSessionComplete();

    if (!sid) {
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
      });
      return;
    }

    navigation.replace("Results", {
      sessionId: sid,
      pendingTurns: turns,
    });
  }, [conversation, markSessionComplete, navigation]);

  const mm = String(Math.floor(seconds / 60));
  const ss = String(seconds % 60).padStart(2, "0");
  const progress = Math.min(seconds / 150, 1);
  const spokenLine =
    conversation.lastAgentLine ?? line ?? demoLineAt(seconds) ?? DEFAULT_LINE;
  const voiceHint = ending
    ? "Wrapping up your date…"
    : voiceError
    ? /quota|elevenlabs closed|upgrade or wait/i.test(voiceError)
      ? voiceError
      : /WS closed|signal stream|negotiation|cannot send signal/i.test(voiceError)
        ? null
        : voiceError
    : !conversation.configured
      ? "On-screen date lines (voice agent not configured)."
      : conversation.status === "connecting"
        ? "Connecting voice…"
        : conversation.status === "connected"
          ? conversation.isSpeaking
            ? "Date is speaking — turn volume up / off silent switch"
            : conversation.inputLevel > 0.02
              ? "Hearing you — keep talking"
              : "Listening — speak closer to the mic"
          : sessionId
            ? null
            : null;

  const micWidth = `${Math.min(100, Math.round(conversation.inputLevel * 140))}%` as `${number}%`;

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

        <View style={styles.stage}>
          <View style={styles.stageRow}>
            <View style={styles.portraitCol}>
              <View style={[styles.youRing, nerves && styles.youRingNerves]}>
                {vitalsKind === "presage" ? (
                  <PresageNativePreview style={styles.youCam} />
                ) : vitalsKind != null ? (
                  <View style={styles.youCam}>
                    <DateCameraPreview />
                  </View>
                ) : (
                  <View style={[styles.youCam, styles.youCamWarming]}>
                    <Text style={styles.youCamWarmingText}>You</Text>
                  </View>
                )}
              </View>
              <Text style={styles.portraitName} numberOfLines={1}>
                {youName}
              </Text>
              <Text style={styles.youCamStat} numberOfLines={1}>
                {bpm != null ? `${bpm} BPM` : "locking…"}
                {expression ? ` · ${expression}` : ""}
              </Text>
            </View>

            <View style={styles.portraitCol}>
              <NikkiAvatar
                size={PORTRAIT_SIZE}
                speaking={conversation.isSpeaking}
              />
              <Text style={styles.portraitName} numberOfLines={1}>
                {DATE_PARTNER_NAME}
              </Text>
              <Text style={styles.partnerSub} numberOfLines={1}>
                {conversation.isSpeaking ? "speaking…" : "listening"}
              </Text>
            </View>
          </View>

          {nerves && bpm != null ? (
            <View style={styles.tagWrap}>
              <NerveTag bpm={bpm} delta={delta} />
            </View>
          ) : null}

          <View style={styles.micTrack}>
            <View style={[styles.micFill, { width: micWidth }]} />
          </View>
          <Text style={styles.micLabel}>Mic level</Text>
          {sessionHint ? (
            <Text style={styles.hint}>{sessionHint}</Text>
          ) : null}
          {voiceHint ? <Text style={styles.hint}>{voiceHint}</Text> : null}
          {vitalsHint ? <Text style={styles.hint}>{vitalsHint}</Text> : null}
        </View>

        <View style={styles.bottom}>
          <Text style={styles.speakerLabel}>Date transcript</Text>
          <ScrollView
            ref={transcriptScrollRef}
            style={styles.transcriptScroll}
            contentContainerStyle={styles.transcriptContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollTranscriptToEnd(true)}
            onLayout={() => scrollTranscriptToEnd(false)}
          >
            {conversation.transcript.length === 0 ? (
              <>
                <View style={styles.speakerRow}>
                  <NikkiAvatar size={28} />
                  <Text style={styles.speakerLabel}>{DATE_PARTNER_NAME}</Text>
                </View>
                <AiBubble text={spokenLine} />
                <Text style={[styles.speakerLabel, styles.youLabel]}>
                  {youName}
                </Text>
                <View style={styles.youBubble}>
                  <Text style={styles.youText}>
                    {conversation.status === "connected"
                      ? conversation.inputLevel > 0.02
                        ? "Hearing audio… waiting for transcript…"
                        : "Say something — it will show up here…"
                      : "Waiting for voice…"}
                  </Text>
                </View>
              </>
            ) : (
              conversation.transcript.map((entry) =>
                entry.role === "agent" ? (
                  <View key={entry.id} style={styles.turn}>
                    <View style={styles.speakerRow}>
                      <NikkiAvatar size={28} />
                      <Text style={styles.speakerLabel}>
                        {DATE_PARTNER_NAME}
                      </Text>
                    </View>
                    <AiBubble text={entry.text} />
                  </View>
                ) : (
                  <View key={entry.id} style={styles.turn}>
                    <Text style={[styles.speakerLabel, styles.youLabel]}>
                      {youName}
                    </Text>
                    <View style={styles.youBubble}>
                      <Text style={styles.youText}>{entry.text}</Text>
                    </View>
                  </View>
                )
              )
            )}

            {vitalsFeed.map((note) => (
              <View key={note.id} style={styles.vitalsNote}>
                <Text style={styles.vitalsNoteLabel}>Vitals</Text>
                <Text style={styles.vitalsNoteText}>{note.text}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.void },
  safe: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    position: "relative",
  },
  bootWrap: {
    flex: 1,
    backgroundColor: colors.void,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  bootText: {
    fontFamily: fonts.body,
    fontSize: type.subhead,
    color: colors.muted,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  stage: {
    flex: 0.52,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  stageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: spacing.md,
    width: "100%",
    paddingHorizontal: spacing.sm,
  },
  portraitCol: {
    flex: 1,
    maxWidth: 168,
    alignItems: "center",
    gap: 6,
  },
  youRing: {
    width: PORTRAIT_SIZE,
    height: PORTRAIT_SIZE,
    borderRadius: PORTRAIT_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.line,
    overflow: "hidden",
    backgroundColor: "#12080c",
    alignItems: "center",
    justifyContent: "center",
  },
  youRingNerves: {
    borderColor: colors.pulse,
  },
  youCam: {
    width: PORTRAIT_INNER,
    height: PORTRAIT_INNER,
    borderRadius: PORTRAIT_INNER / 2,
    overflow: "hidden",
  },
  youCamWarming: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#12080c",
  },
  youCamWarmingText: {
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.muted,
  },
  portraitName: {
    fontFamily: fonts.displayItalic,
    fontSize: type.headline,
    color: colors.bone,
    textAlign: "center",
    marginTop: 2,
  },
  youCamStat: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.pulse,
    textAlign: "center",
    textTransform: "capitalize",
  },
  partnerSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.tagline,
    textAlign: "center",
  },
  tagWrap: {
    alignItems: "center",
    minHeight: 28,
  },
  vitalsNote: {
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(215, 71, 69, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    maxWidth: "92%",
  },
  vitalsNoteLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    color: colors.pulse,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  vitalsNoteText: {
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.tagline,
    flexShrink: 1,
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
  micTrack: {
    marginTop: spacing.sm,
    width: 160,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    overflow: "hidden",
  },
  speakerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  micFill: {
    height: "100%",
    backgroundColor: colors.pulse,
  },
  micLabel: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.muted,
  },
  hint: {
    marginTop: spacing.sm,
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.muted,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
  bottom: { flex: 0.45, paddingBottom: spacing.xl, gap: 6 },
  transcriptScroll: { flex: 1 },
  transcriptContent: { gap: 6, paddingBottom: spacing.md },
  turn: { gap: 4 },
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
