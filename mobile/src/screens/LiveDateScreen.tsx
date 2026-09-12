import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { NerveTag } from "../components/NerveTag";
import { AiBubble } from "../components/AiBubble";
import { colors, fonts, spacing, type, minHitSlop } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "LiveDate">;

const BASELINE = 71;

export function LiveDateScreen({ navigation }: Props) {
  const [seconds, setSeconds] = useState(0);
  const [bpm, setBpm] = useState(BASELINE);
  const [line, setLine] = useState("So… why did your last relationship end?");
  const nerveFired = useRef(false);

  useEffect(() => {
    const tick = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (seconds === 12) setBpm(78);
    if (seconds === 20) setBpm(84);
    if (seconds === 28) {
      setBpm(89);
      if (!nerveFired.current) {
        nerveFired.current = true;
        setLine("Oh, I definitely hit a nerve there.");
      }
    }
  }, [seconds]);

  const delta = bpm - BASELINE;
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
            onPress={() => navigation.replace("Results")}
            hitSlop={12}
            style={styles.endHit}
          >
            <Text style={styles.end}>End</Text>
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

        {delta >= 12 ? (
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
        </View>

        <View style={styles.bottom}>
          <AiBubble text={line} />
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
  bottom: { paddingBottom: spacing.xl },
});
