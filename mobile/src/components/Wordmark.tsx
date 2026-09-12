import { Text, StyleSheet, TextStyle } from "react-native";
import { colors, fonts } from "../theme";

type Size = "hero" | "lockup" | "nav";

const sizes: Record<Size, number> = {
  hero: 48,
  lockup: 36,
  nav: 15,
};

export function Wordmark({
  size = "lockup",
  style,
}: {
  size?: Size;
  style?: TextStyle;
}) {
  return (
    <Text style={[styles.base, { fontSize: sizes[size] }, style]}>
      Obsession
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: fonts.display,
    color: colors.bone,
    letterSpacing: -0.3,
    lineHeight: undefined,
  },
});
