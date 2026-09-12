import { Text, StyleSheet, View } from "react-native";
import { colors, fonts, radii, spacing, type } from "../theme";

export function AiBubble({ text }: { text: string }) {
  return (
    <View style={styles.bubble}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: "rgba(20, 10, 10, 0.85)",
    borderWidth: 1,
    borderColor: colors.line,
    borderTopLeftRadius: radii.bubble,
    borderTopRightRadius: radii.bubble,
    borderBottomRightRadius: radii.bubble,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: spacing.md,
  },
  text: {
    fontFamily: fonts.displayItalic,
    fontSize: type.body,
    lineHeight: 24,
    color: colors.bone,
  },
});
