import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, fonts, radii, spacing, type, minHitSlop } from "../theme";

export function ObChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <Pressable
            key={opt}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onToggle(opt)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: minHitSlop - 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.line,
    borderColor: colors.bone,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: type.footnote,
    color: colors.muted,
  },
  labelActive: {
    color: colors.bone,
    fontFamily: fonts.bodySemibold,
  },
});
