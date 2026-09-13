import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { ObButton } from "../components/ObButton";
import { NikkiAvatar } from "../components/NikkiAvatar";
import { colors, fonts, radii, spacing, type, minHitSlop } from "../theme";
import { endSessionAndCoach, getTimeline } from "../services/api";
import {
  isCoachResponse,
  type CoachScores,
  type TimelineTurn,
} from "../services/sessionHelpers";
import { useAppState } from "../state/AppState";
import {
  DATE_PARTNER_NAME,
  displayUserName,
} from "../services/profileStorage";
import { isMockSessionId } from "../services/historyMock";

type Props = NativeStackScreenProps<RootStackParamList, "Results">;

function speakerLabel(raw: string | undefined, youName: string): string {
  const s = (raw || "").toLowerCase();
  if (s === "ai" || s === "agent" || s === "assistant") return DATE_PARTNER_NAME;
  if (s === "user" || s === "you") return youName;
  return raw || "turn";
}

function isNikki(raw: string | undefined): boolean {
  const s = (raw || "").toLowerCase();
  return s === "ai" || s === "agent" || s === "assistant";
}

const SCORE_META: {
  key: keyof CoachScores;
  label: string;
  color: string;
}[] = [
  { key: "chemistry", label: "Chemistry", color: colors.hush },
  { key: "conversation", label: "Conversation", color: "#e06a9a" },
  { key: "composure", label: "Composure", color: colors.pulse },
  { key: "curiosity", label: "Curiosity", color: "#d45a8c" },
];

export function ResultsScreen({ navigation, route }: Props) {
  const { scenario, personality, profile, addHistoryEntry } = useAppState();
  const youName = displayUserName(profile);
  const params = route.params ?? {};
  const [scores, setScores] = useState<CoachScores | undefined>(params.scores);
  const [keyMoment, setKeyMoment] = useState<string | undefined>(
    params.keyMoment
  );
  const [coaching, setCoaching] = useState<string | undefined>(params.coaching);
  const [turns, setTurns] = useState<TimelineTurn[]>([]);
  const [loadingCoach, setLoadingCoach] = useState(
    Boolean(params.sessionId && !params.scores && !isMockSessionId(params.sessionId))
  );
  const [loadingTimeline, setLoadingTimeline] = useState(
    Boolean(
      params.sessionId &&
        !isMockSessionId(params.sessionId) &&
        !(params.pendingTurns && params.pendingTurns.length > 0)
    )
  );
  const [error, setError] = useState<string | undefined>(params.error);
  const savedRef = useRef(false);
  const coachedRef = useRef(false);

  useEffect(() => {
    setScores(params.scores);
    setKeyMoment(params.keyMoment);
    setCoaching(params.coaching);
    setError(params.error);
  }, [params.coaching, params.error, params.keyMoment, params.scores]);

  // Fetch coach on Results so End Date can navigate instantly.
  useEffect(() => {
    const sid = params.sessionId;
    if (!sid || params.scores || coachedRef.current) return;
    if (isMockSessionId(sid)) {
      setLoadingCoach(false);
      return;
    }
    coachedRef.current = true;
    let cancelled = false;
    setLoadingCoach(true);
    (async () => {
      try {
        const coach = await endSessionAndCoach(sid, params.pendingTurns);
        if (cancelled) return;
        if (isCoachResponse(coach)) {
          setScores(coach.scores);
          if (coach.keyMoment) setKeyMoment(coach.keyMoment);
          if (coach.coaching) setCoaching(coach.coaching);
        } else {
          setError("Coach response was incomplete.");
        }
      } catch {
        if (!cancelled) {
          setScores({
            chemistry: 70,
            conversation: 64,
            composure: 55,
            curiosity: 78,
          });
          setKeyMoment(
            (prev) => prev ?? "Session saved — coach timed out, try again later."
          );
          setCoaching(
            (prev) =>
              prev ??
              "You showed up and finished the date. Next time, land one clear sentence after a pause."
          );
        }
      } finally {
        if (!cancelled) setLoadingCoach(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.pendingTurns, params.scores, params.sessionId]);

  useEffect(() => {
    const sid = params.sessionId;
    // Mock / history replays already ship transcript via pendingTurns.
    if (!sid || isMockSessionId(sid) || (params.pendingTurns?.length ?? 0) > 0) {
      setLoadingTimeline(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const timeline = await getTimeline(sid);
        if (cancelled) return;
        setTurns(timeline);
        if (!keyMoment) {
          const flagged = timeline.find((t) => t.flagged);
          if (flagged?.text) setKeyMoment(flagged.text);
        }
      } catch {
        // Optional — client transcript may still show via pendingTurns later.
      } finally {
        if (!cancelled) setLoadingTimeline(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.sessionId, params.pendingTurns]);

  useEffect(() => {
    if (savedRef.current) return;
    if (!scores && !keyMoment && !coaching && !params.sessionId) return;
    if (loadingCoach) return;
    // Don't re-save seeded mock dates back into history.
    if (isMockSessionId(params.sessionId)) {
      savedRef.current = true;
      return;
    }
    savedRef.current = true;
    addHistoryEntry({
      sessionId: params.sessionId,
      scenario: scenario || "Practice date",
      personality,
      scores,
      keyMoment,
      coaching,
      turns: params.pendingTurns,
    });
  }, [
    addHistoryEntry,
    coaching,
    keyMoment,
    loadingCoach,
    params.pendingTurns,
    params.sessionId,
    personality,
    scenario,
    scores,
  ]);

  const timelineTurns = useMemo(() => {
    if (turns.length > 0) return turns.filter((t) => t.text);
    return (params.pendingTurns ?? [])
      .filter((t) => t.text?.trim())
      .map((t, i) => ({
        time: String(i),
        speaker: t.speaker,
        text: t.text,
        flagged: false,
      }));
  }, [params.pendingTurns, turns]);

  const avg = scores
    ? Math.round(
        (scores.chemistry +
          scores.conversation +
          scores.composure +
          scores.curiosity) /
          4
      )
    : null;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#1a0a12", colors.void, "#0a0608"]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>Session complete</Text>
              <Text style={styles.title}>Your read.</Text>
            </View>
            <Pressable
              onPress={() => navigation.replace("Main")}
              hitSlop={12}
              style={styles.doneHit}
            >
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.scoreHero}>
            <View style={styles.avgBlock}>
              {loadingCoach && avg == null ? (
                <ActivityIndicator color={colors.pulse} />
              ) : (
                <Text style={styles.avgValue}>{avg ?? "—"}</Text>
              )}
              <Text style={styles.avgLabel}>overall</Text>
            </View>
            <View style={styles.scoreList}>
              {SCORE_META.map((s) => {
                const value = scores
                  ? Math.max(0, Math.min(100, scores[s.key] ?? 0))
                  : 0;
                return (
                  <View key={s.key} style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>{s.label}</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: loadingCoach && !scores ? "12%" : `${value}%`,
                            backgroundColor: s.color,
                            opacity: loadingCoach && !scores ? 0.35 : 1,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.scoreValue}>
                      {scores ? value : "··"}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Coach’s note</Text>
          <Text style={styles.coachBody}>
            {loadingCoach && !coaching
              ? "Reading the date…"
              : coaching ??
                "No coach note yet. Finish a full session to get delivery notes."}
          </Text>

          {keyMoment ? (
            <View style={styles.momentBlock}>
              <Text style={styles.momentLabel}>Key moment</Text>
              <Text style={styles.momentText}>{keyMoment}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Timeline</Text>
          {loadingTimeline && timelineTurns.length === 0 ? (
            <ActivityIndicator color={colors.pulse} style={{ marginTop: 8 }} />
          ) : timelineTurns.length === 0 ? (
            <Text style={styles.emptyCopy}>No turns logged for this date.</Text>
          ) : (
            <View style={styles.timeline}>
              {timelineTurns.map((turn, i) => {
                const nikki = isNikki(turn.speaker);
                const last = i === timelineTurns.length - 1;
                return (
                  <View key={`${turn.time}-${i}`} style={styles.tlRow}>
                    <View style={styles.tlRail}>
                      {nikki ? (
                        <NikkiAvatar size={28} />
                      ) : (
                        <View style={styles.youDot}>
                          <Text style={styles.youDotText}>
                            {youName.slice(0, 1).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      {!last ? <View style={styles.tlLine} /> : null}
                    </View>
                    <View
                      style={[
                        styles.tlBubble,
                        turn.flagged && styles.tlBubbleFlagged,
                      ]}
                    >
                      <Text style={styles.tlSpeaker}>
                        {speakerLabel(turn.speaker, youName)}
                        {turn.flagged ? " · pulse" : ""}
                      </Text>
                      <Text style={styles.tlText}>{turn.text}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <ObButton
            label="Practice again"
            onPress={() => navigation.replace("LiveDate", { scenario })}
          />
          <ObButton
            label="Back to home"
            variant="outline"
            onPress={() => navigation.replace("Main")}
            style={{ marginTop: spacing.sm }}
          />
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
  },
  scroll: { paddingBottom: spacing.xl },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  kicker: {
    fontFamily: fonts.body,
    fontSize: type.footnote,
    color: colors.muted,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: type.largeTitle,
    color: colors.bone,
  },
  doneHit: { minHeight: minHitSlop, justifyContent: "center" },
  done: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.subhead,
    color: colors.pulse,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: type.footnote,
    color: colors.pulse,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  scoreHero: {
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  avgBlock: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: colors.pulse,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(215, 71, 69, 0.08)",
  },
  avgValue: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.bone,
  },
  avgLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  scoreList: { flex: 1, gap: spacing.sm },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  scoreLabel: {
    width: 96,
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.tagline,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.line,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3 },
  scoreValue: {
    width: 28,
    textAlign: "right",
    fontFamily: fonts.bodySemibold,
    fontSize: type.caption1,
    color: colors.bone,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.footnote,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  coachBody: {
    fontFamily: fonts.displayItalic,
    fontSize: type.body,
    lineHeight: 26,
    color: colors.bone,
    marginBottom: spacing.md,
  },
  momentBlock: {
    borderLeftWidth: 2,
    borderLeftColor: colors.pulse,
    paddingLeft: spacing.md,
    marginBottom: spacing.sm,
    gap: 4,
  },
  momentLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.caption1,
    color: colors.pulse,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  momentText: {
    fontFamily: fonts.body,
    fontSize: type.subhead,
    color: colors.tagline,
    lineHeight: 22,
  },
  emptyCopy: {
    fontFamily: fonts.body,
    fontSize: type.footnote,
    color: colors.muted,
    lineHeight: 18,
  },
  timeline: { marginTop: spacing.sm, paddingBottom: spacing.md },
  tlRow: {
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 56,
  },
  tlRail: {
    width: 28,
    alignItems: "center",
  },
  tlLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.line,
    marginVertical: 4,
  },
  youDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  youDotText: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.caption1,
    color: colors.bone,
  },
  tlBubble: {
    flex: 1,
    paddingBottom: spacing.md,
    gap: 4,
  },
  tlBubbleFlagged: {
    borderRadius: radii.sm,
    backgroundColor: "rgba(215, 71, 69, 0.08)",
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  tlSpeaker: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.caption1,
    color: colors.muted,
  },
  tlText: {
    fontFamily: fonts.body,
    fontSize: type.subhead,
    color: colors.bone,
    lineHeight: 21,
  },
  footer: {
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
});
