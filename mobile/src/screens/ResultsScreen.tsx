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
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { ObCard } from "../components/ObCard";
import { ObButton } from "../components/ObButton";
import { Eyebrow } from "../components/Eyebrow";
import { colors, fonts, spacing, type, minHitSlop } from "../theme";
import { getTimeline } from "../services/api";
import {
  type CoachScores,
  type TimelineTurn,
} from "../services/sessionHelpers";
import { useAppState } from "../state/AppState";

type Props = NativeStackScreenProps<RootStackParamList, "Results">;

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
  const { scenario, addHistoryEntry } = useAppState();
  const params = route.params ?? {};
  const [scores, setScores] = useState<CoachScores | undefined>(params.scores);
  const [keyMoment, setKeyMoment] = useState<string | undefined>(
    params.keyMoment
  );
  const [coaching, setCoaching] = useState<string | undefined>(params.coaching);
  const [turns, setTurns] = useState<TimelineTurn[]>([]);
  const [loading, setLoading] = useState(Boolean(params.sessionId));
  const [error, setError] = useState<string | undefined>(params.error);
  const savedRef = useRef(false);

  useEffect(() => {
    setScores(params.scores);
    setKeyMoment(params.keyMoment);
    setCoaching(params.coaching);
    setError(params.error);
  }, [params.coaching, params.error, params.keyMoment, params.scores]);

  useEffect(() => {
    const sid = params.sessionId;
    if (!sid) {
      if (!params.scores && !params.error) {
        setError("No session results yet.");
      }
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const timeline = await getTimeline(sid);
        if (cancelled) return;
        setTurns(timeline);
        if (!params.keyMoment) {
          const flagged = timeline.find((t) => t.flagged);
          if (flagged?.text) {
            setKeyMoment(flagged.text);
          }
        }
      } catch {
        if (!cancelled) {
          setError((prev) => prev ?? "Could not load timeline from the server.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.keyMoment, params.scores, params.sessionId]);

  useEffect(() => {
    if (savedRef.current) return;
    if (!scores && !keyMoment && !coaching && !params.sessionId) return;
    savedRef.current = true;
    addHistoryEntry({
      sessionId: params.sessionId,
      scenario: scenario || "Practice date",
      scores,
      keyMoment,
      coaching,
    });
  }, [
    addHistoryEntry,
    coaching,
    keyMoment,
    params.sessionId,
    scenario,
    scores,
  ]);

  const flaggedIndex = useMemo(() => {
    const idx = turns.findIndex((t) => t.flagged);
    return idx >= 0 ? idx : turns.length > 1 ? 1 : 0;
  }, [turns]);

  const momentText =
    keyMoment ??
    (turns.length === 0
      ? loading
        ? "Loading timeline…"
        : "No timeline turns yet — Phase A needs to log conversation turns."
      : undefined);

  return (
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

        <ObCard style={styles.scores}>
          {loading && !scores ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.pulse} />
              <Text style={styles.loadingText}>Loading scores…</Text>
            </View>
          ) : scores ? (
            SCORE_META.map((s) => {
              const value = Math.max(0, Math.min(100, scores[s.key] ?? 0));
              return (
                <View key={s.key} style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>{s.label}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${value}%`, backgroundColor: s.color },
                      ]}
                    />
                  </View>
                  <Text style={styles.scoreValue}>{value}</Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyCopy}>
              Scores appear once the coach API responds. Nothing here is made
              up.
            </Text>
          )}
        </ObCard>

        <Eyebrow style={styles.sectionLabel}>Timeline</Eyebrow>
        <View style={styles.timeline}>
          <View style={styles.line} />
          {(turns.length > 0 ? turns : [{ flagged: false } as TimelineTurn]).map(
            (turn, i, arr) => {
              const left =
                arr.length === 1 ? 0.08 : i / Math.max(arr.length - 1, 1);
              const active = turns.length > 0 && i === flaggedIndex;
              return (
                <View
                  key={`${turn.time}-${i}`}
                  style={[
                    styles.dot,
                    { left: `${left * 100}%` },
                    active && styles.dotActive,
                  ]}
                />
              );
            }
          )}
        </View>
        <Text style={styles.moment}>{momentText}</Text>

        {turns.filter((t) => t.text).length > 0 ? (
          <View style={styles.turnList}>
            {turns
              .filter((t) => t.text)
              .map((t, i) => (
                <Text
                  key={`${t.time}-row-${i}`}
                  style={[styles.turnRow, t.flagged && styles.turnFlagged]}
                >
                  {t.speaker || "turn"} · {t.text}
                </Text>
              ))}
          </View>
        ) : null}

        <ObCard style={styles.coach}>
          <Eyebrow>Coach’s note</Eyebrow>
          {loading && !coaching ? (
            <Text style={styles.emptyCopy}>Loading coach’s note…</Text>
          ) : (
            <Text style={styles.coachBody}>
              {coaching ??
                "No coach note yet. Delivery notes will land here after a session — we won’t claim we know how you felt."}
            </Text>
          )}
        </ObCard>
      </ScrollView>

      <View style={styles.footer}>
        <ObButton
          label="Practice again"
          onPress={() => navigation.replace("LiveDate", { scenario })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.void,
    paddingHorizontal: spacing.lg,
  },
  scroll: { paddingBottom: spacing.md },
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
  scores: { gap: spacing.md },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: type.footnote,
    color: colors.muted,
  },
  emptyCopy: {
    fontFamily: fonts.body,
    fontSize: type.footnote,
    color: colors.muted,
    lineHeight: 18,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  scoreLabel: {
    width: 110,
    fontFamily: fonts.body,
    fontSize: type.footnote,
    color: colors.bone,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.line,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 4 },
  scoreValue: {
    width: 28,
    textAlign: "right",
    fontFamily: fonts.bodySemibold,
    fontSize: type.footnote,
    color: colors.bone,
  },
  sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.md },
  timeline: {
    height: 24,
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  line: {
    position: "absolute",
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: colors.line,
  },
  dot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.line,
    top: 7,
  },
  dotActive: {
    backgroundColor: colors.pulse,
    shadowColor: colors.pulse,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    top: 6,
    marginLeft: -1,
  },
  moment: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.footnote,
    color: colors.pulse,
    marginBottom: spacing.md,
  },
  turnList: { gap: 6, marginBottom: spacing.lg },
  turnRow: {
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.muted,
    lineHeight: 16,
  },
  turnFlagged: { color: colors.pulse },
  coach: { gap: spacing.md },
  coachBody: {
    fontFamily: fonts.displayItalic,
    fontSize: type.body,
    lineHeight: 24,
    color: colors.bone,
  },
  footer: {
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg,
  },
});
