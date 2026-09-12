import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, spacing, type } from "../theme";

export function HistoryScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.body}>
        Past practice dates will land here — scores, timeline moments, and
        coach notes.
      </Text>
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No sessions yet this build.</Text>
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
  title: {
    marginTop: spacing.lg,
    fontFamily: fonts.display,
    fontSize: type.title1,
    color: colors.bone,
  },
  body: {
    marginTop: spacing.sm,
    fontFamily: fonts.body,
    fontSize: type.subhead,
    color: colors.muted,
    lineHeight: 22,
  },
  empty: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: spacing.lg,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: type.footnote,
    color: colors.muted,
  },
});
