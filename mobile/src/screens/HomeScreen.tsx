import { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CompositeScreenProps } from "@react-navigation/native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { MainTabParamList, RootStackParamList } from "../navigation/types";
import { Wordmark } from "../components/Wordmark";
import { ObButton } from "../components/ObButton";
import { NikkiAvatar } from "../components/NikkiAvatar";
import { colors, fonts, radii, spacing, type, minHitSlop } from "../theme";
import { useAppState } from "../state/AppState";
import { startSession } from "../services/api";
import {
  DEMO_USER_ID,
  mapScenario,
  sanitizePriorPatterns,
} from "../services/sessionHelpers";
import {
  PERSONALITIES,
  PERSONALITY_BLURBS,
  SCENARIOS,
  type Personality,
  type Scenario,
} from "../services/practiceOptions";
import {
  DATE_PARTNER_NAME,
  displayUserName,
} from "../services/profileStorage";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Practice">,
  NativeStackScreenProps<RootStackParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const {
    sessionCount,
    scenario,
    setScenario,
    personality,
    setPersonality,
    profile,
    lastMemory,
    setLastMemory,
  } = useAppState();
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const youName = displayUserName(profile);

  const onBegin = async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    try {
      let sessionId = `local-${Date.now()}`;
      try {
        const res = await startSession(DEMO_USER_ID, mapScenario(scenario));
        sessionId = res.sessionId;
        const memory = sanitizePriorPatterns(res.priorPatterns);
        if (memory) setLastMemory(memory);
      } catch {
        // Keep local id — LiveDate must still open if the tunnel/API is down.
      }
      navigation.navigate("LiveDate", {
        sessionId,
        scenario,
      });
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#1c0c12", colors.void, "#0a0608"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.greeting}>
            Session {Math.max(1, sessionCount)} · {youName}
          </Text>
          <Wordmark size="lockup" style={styles.brand} />
          <Text style={styles.tagline}>Stop practicing dates in your head.</Text>

          <View style={styles.hero}>
            <NikkiAvatar size={112} />
            <View style={styles.heroCopy}>
              <Text style={styles.heroName}>{DATE_PARTNER_NAME}</Text>
              <Text style={styles.heroSub}>
                {personality} · {scenario}
              </Text>
            </View>
          </View>

          <ObButton
            label={starting ? "Starting…" : "Begin practice date"}
            onPress={onBegin}
            disabled={starting}
            style={styles.cta}
          />

          {lastMemory ? (
            <Text style={styles.memory}>
              <Text style={styles.memoryLabel}>Last time · </Text>
              {lastMemory}
            </Text>
          ) : null}

          <Text style={styles.section}>Her vibe</Text>
          <View style={styles.segment}>
            {PERSONALITIES.map((p: Personality) => {
              const active = p === personality;
              return (
                <Pressable
                  key={p}
                  onPress={() => setPersonality(p)}
                  style={[styles.segmentItem, active && styles.segmentActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      active && styles.segmentTextActive,
                    ]}
                  >
                    {p}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.blurb}>{PERSONALITY_BLURBS[personality]}</Text>

          <Text style={styles.section}>Setup</Text>
          <View style={styles.segment}>
            {SCENARIOS.map((s: Scenario) => {
              const active = s === scenario;
              return (
                <Pressable
                  key={s}
                  onPress={() => setScenario(s)}
                  style={[styles.segmentItem, active && styles.segmentActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      active && styles.segmentTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.footerHint}>
            <Ionicons name="mic-outline" size={16} color={colors.muted} />
            <Text style={styles.footerHintText}>
              2–3 minutes · voice with {DATE_PARTNER_NAME}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.void },
  safe: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  greeting: {
    marginTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: type.footnote,
    color: colors.muted,
  },
  brand: { marginTop: spacing.sm },
  tagline: {
    marginTop: spacing.xs,
    fontFamily: fonts.displayItalic,
    fontSize: type.subhead,
    color: colors.tagline,
  },
  hero: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  heroCopy: { flex: 1, gap: 4 },
  heroName: {
    fontFamily: fonts.display,
    fontSize: type.title2,
    color: colors.bone,
  },
  heroSub: {
    fontFamily: fonts.body,
    fontSize: type.footnote,
    color: colors.muted,
  },
  cta: { marginBottom: spacing.md },
  memory: {
    fontFamily: fonts.body,
    fontSize: type.footnote,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  memoryLabel: {
    fontFamily: fonts.bodySemibold,
    color: colors.tagline,
  },
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontFamily: fonts.bodySemibold,
    fontSize: type.caption1,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segmentItem: {
    flex: 1,
    minHeight: minHitSlop - 8,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  segmentActive: {
    backgroundColor: colors.bone,
  },
  segmentText: {
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.muted,
  },
  segmentTextActive: {
    fontFamily: fonts.bodySemibold,
    color: colors.ink,
  },
  blurb: {
    marginTop: spacing.sm,
    fontFamily: fonts.body,
    fontSize: type.footnote,
    color: colors.tagline,
    lineHeight: 18,
  },
  footerHint: {
    marginTop: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "center",
  },
  footerHintText: {
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.muted,
  },
});
