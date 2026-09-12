import { View, Text, StyleSheet } from "react-native";
import { colors, fonts, radii, spacing, type } from "../theme";

export function NerveTag({
  bpm,
  delta,
}: {
  bpm: number;
  delta: number;
}) {
  const up = delta > 0;
  return (
    <View style={styles.wrap}>
      <Text style={styles.heart}>♥</Text>
      <Text style={styles.bpm}>{bpm}</Text>
      <Text style={styles.delta}>
        {up ? "↑" : "↓"}
        {Math.abs(delta)}
      </Text>
      <Text style={styles.meta}>BPM · NERVES{up ? "↑" : "↓"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: "rgba(215, 71, 69, 0.5)",
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  heart: {
    color: colors.pulse,
    fontSize: 12,
  },
  bpm: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.subhead,
    color: colors.bone,
  },
  delta: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.caption1,
    color: colors.pulse,
  },
  meta: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.pulse,
    textTransform: "uppercase",
  },
});
