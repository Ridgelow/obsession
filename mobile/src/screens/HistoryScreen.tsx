import { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { colors, fonts, spacing, type } from "../theme";
import { useAppState } from "../state/AppState";
import type { HistoryEntry } from "../services/historyStorage";

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function scoreAvg(entry: HistoryEntry): number | null {
  const s = entry.scores;
  if (!s) return null;
  return Math.round(
    (s.chemistry + s.conversation + s.composure + s.curiosity) / 4
  );
}

export function HistoryScreen() {
  const { history, historyReady } = useAppState();
  const navigation = useNavigation();

  const openEntry = useCallback(
    (entry: HistoryEntry) => {
      // Results lives on the root stack above tabs.
      (navigation as { navigate: (name: string, params?: object) => void }).navigate(
        "Results",
        {
          sessionId: entry.sessionId,
          scores: entry.scores,
          keyMoment: entry.keyMoment,
          coaching: entry.coaching,
        }
      );
    },
    [navigation]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.body}>
        Past practice dates — scores, key moments, and coach notes.
      </Text>

      {!historyReady ? (
        <View style={styles.empty}>
          <ActivityIndicator color={colors.pulse} />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No sessions yet. Finish a practice date and it will show up here.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {history.map((entry) => {
            const avg = scoreAvg(entry);
            return (
              <Pressable
                key={entry.id}
                onPress={() => openEntry(entry)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.rowTop}>
                  <Text style={styles.scenario}>{entry.scenario}</Text>
                  <Text style={styles.when}>{formatWhen(entry.completedAt)}</Text>
                </View>
                {avg != null ? (
                  <Text style={styles.avg}>Avg {avg}</Text>
                ) : (
                  <Text style={styles.avgMuted}>Scores pending</Text>
                )}
                {entry.keyMoment ? (
                  <Text style={styles.moment} numberOfLines={2}>
                    {entry.keyMoment}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
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
    alignItems: "center",
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: type.footnote,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
  },
  list: { marginTop: spacing.lg, flex: 1 },
  listContent: { paddingBottom: spacing.xl, gap: spacing.md },
  row: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: spacing.md,
    gap: 6,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  scenario: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.subhead,
    color: colors.bone,
    flex: 1,
  },
  when: {
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.muted,
  },
  avg: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.footnote,
    color: colors.pulse,
  },
  avgMuted: {
    fontFamily: fonts.body,
    fontSize: type.footnote,
    color: colors.muted,
  },
  moment: {
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.muted,
    lineHeight: 16,
  },
});
