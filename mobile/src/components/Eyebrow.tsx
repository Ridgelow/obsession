import { Text, StyleSheet, TextStyle } from "react-native";
import { colors, fonts, type } from "../theme";

export function Eyebrow({
  children,
  style,
}: {
  children: string;
  style?: TextStyle;
}) {
  return <Text style={[styles.text, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.caption1,
    letterSpacing: 2.8,
    textTransform: "uppercase",
    color: colors.muted,
  },
});
