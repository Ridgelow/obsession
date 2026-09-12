import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { ObCard } from "../components/ObCard";
import { ObButton } from "../components/ObButton";
import { Eyebrow } from "../components/Eyebrow";
import { colors, fonts, spacing, type, minHitSlop } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Results">;

const SCORES = [
  { label: "Chemistry", value: 72, color: colors.hush },
  { label: "Conversation", value: 65, color: "#e06a9a" },
  { label: "Composure", value: 54, color: colors.pulse },
  { label: "Curiosity", value: 80, color: "#d45a8c" },
];

export function ResultsScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
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

      <ObCard style={styles.scores}>
        {SCORES.map((s) => (
          <View key={s.label} style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>{s.label}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${s.value}%`, backgroundColor: s.color },
                ]}
              />
            </View>
            <Text style={styles.scoreValue}>{s.value}</Text>
          </View>
        ))}
      </ObCard>

      <Eyebrow style={styles.sectionLabel}>Timeline</Eyebrow>
      <View style={styles.timeline}>
        <View style={styles.line} />
        {[0.08, 0.32, 0.58, 0.88].map((left, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { left: `${left * 100}%` },
              i === 1 && styles.dotActive,
            ]}
          />
        ))}
      </View>
      <Text style={styles.moment}>
        0:42 — asked about your last relationship
      </Text>

      <ObCard style={styles.coach}>
        <Eyebrow>Coach’s note</Eyebrow>
        <Text style={styles.coachBody}>
          You recovered well after the pause — but the answer trailed off. Try
          landing on one clear sentence next time.
        </Text>
      </ObCard>

      <View style={styles.footer}>
        <ObButton
          label="Practice again"
          onPress={() => navigation.replace("LiveDate")}
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
  scores: { gap: spacing.md },
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
    marginBottom: spacing.lg,
  },
  coach: { gap: spacing.md },
  coachBody: {
    fontFamily: fonts.displayItalic,
    fontSize: type.body,
    lineHeight: 24,
    color: colors.bone,
  },
  footer: {
    marginTop: "auto",
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg,
  },
});
