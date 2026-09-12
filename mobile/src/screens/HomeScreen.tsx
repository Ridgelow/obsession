import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CompositeScreenProps } from "@react-navigation/native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { MainTabParamList, RootStackParamList } from "../navigation/types";
import { Wordmark } from "../components/Wordmark";
import { ObCard } from "../components/ObCard";
import { Eyebrow } from "../components/Eyebrow";
import { colors, fonts, radii, spacing, type, minHitSlop } from "../theme";
import { Scenario, useAppState } from "../state/AppState";
import { startSession } from "../services/api";
import { DEMO_USER_ID, mapScenario } from "../services/sessionHelpers";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Practice">,
  NativeStackScreenProps<RootStackParamList>
>;

const SCENARIOS: Scenario[] = ["First Date", "Coffee Chat", "Silence"];

export function HomeScreen({ navigation }: Props) {
  const {
    sessionCount,
    scenario,
    setScenario,
    lastMemory,
    setLastMemory,
    pendingSessionId,
    setPendingSessionId,
    recallNonce,
  } = useAppState();
  const [starting, setStarting] = useState(false);
  const pendingRef = useRef<string | null>(pendingSessionId);
  const requestGen = useRef(0);

  useEffect(() => {
    pendingRef.current = pendingSessionId;
  }, [pendingSessionId]);

  useEffect(() => {
    let cancelled = false;
    const gen = ++requestGen.current;
    (async () => {
      try {
        const res = await startSession(DEMO_USER_ID, mapScenario(scenario));
        if (cancelled || gen !== requestGen.current) return;
        pendingRef.current = res.sessionId;
        setPendingSessionId(res.sessionId);
        if (res.priorPatterns) setLastMemory(res.priorPatterns);
      } catch {
        // Phase A may be down — keep the last card copy.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scenario, recallNonce, setLastMemory, setPendingSessionId]);

  const onBegin = async () => {
    if (starting) return;
    setStarting(true);
    requestGen.current += 1;
    try {
      let sessionId: string | undefined = pendingRef.current ?? undefined;
      if (!sessionId) {
        try {
          const res = await startSession(DEMO_USER_ID, mapScenario(scenario));
          sessionId = res.sessionId;
          if (res.priorPatterns) setLastMemory(res.priorPatterns);
        } catch {
          sessionId = undefined;
        }
      }
      setPendingSessionId(null);
      pendingRef.current = null;
      navigation.navigate("LiveDate", {
        sessionId,
        scenario,
      });
    } finally {
      setStarting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sessionLabel}>Session {sessionCount}</Text>
        <Wordmark size="lockup" />

        <ObCard style={styles.memoryCard}>
          <View style={styles.memoryIcon}>
            <Ionicons name="heart" size={16} color={colors.hush} />
          </View>
          <View style={styles.memoryCopy}>
            <Text style={styles.memoryTitle}>From your last session</Text>
            <Text style={styles.memoryBody}>{lastMemory}</Text>
          </View>
        </ObCard>

        <Pressable
          accessibilityRole="button"
          onPress={onBegin}
          disabled={starting}
          style={({ pressed }) => [
            styles.beginBlock,
            pressed && { opacity: 0.9 },
            starting && { opacity: 0.7 },
          ]}
        >
          <View style={styles.playOrb}>
            <Ionicons name="play" size={28} color={colors.bone} />
          </View>
          <Text style={styles.beginTitle}>Begin a practice date</Text>
          <Text style={styles.beginSub}>
            {starting
              ? "Starting session…"
              : "2–3 minutes · we’ll tell you how it went"}
          </Text>
        </Pressable>

        <Eyebrow style={styles.scenarioLabel}>Scenario</Eyebrow>
        <View style={styles.scenarioRow}>
          {SCENARIOS.map((s) => {
            const active = s === scenario;
            return (
              <Pressable
                key={s}
                onPress={() => setScenario(s)}
                style={[styles.scenarioPill, active && styles.scenarioActive]}
              >
                <Text
                  style={[
                    styles.scenarioText,
                    active && styles.scenarioTextActive,
                  ]}
                >
                  {s}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.scenarioHint}>
          More scenarios soon — same engine, new prompts.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.void },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  sessionLabel: {
    marginTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: type.footnote,
    color: colors.muted,
  },
  memoryCard: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
    marginTop: spacing.sm,
  },
  memoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  memoryCopy: { flex: 1, gap: 4 },
  memoryTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.subhead,
    color: colors.bone,
  },
  memoryBody: {
    fontFamily: fonts.body,
    fontSize: type.footnote,
    lineHeight: 18,
    color: colors.muted,
  },
  beginBlock: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  playOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.pulse,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 4,
  },
  beginTitle: {
    fontFamily: fonts.display,
    fontSize: type.title1,
    color: colors.bone,
    textAlign: "center",
  },
  beginSub: {
    fontFamily: fonts.body,
    fontSize: type.footnote,
    color: colors.muted,
  },
  scenarioLabel: { marginTop: spacing.md },
  scenarioRow: {
    flexDirection: "row",
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    padding: 4,
    gap: 4,
  },
  scenarioPill: {
    flex: 1,
    minHeight: minHitSlop - 8,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  scenarioActive: { backgroundColor: colors.line },
  scenarioText: {
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.muted,
  },
  scenarioTextActive: {
    color: colors.bone,
    fontFamily: fonts.bodySemibold,
  },
  scenarioHint: {
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.muted,
  },
});
