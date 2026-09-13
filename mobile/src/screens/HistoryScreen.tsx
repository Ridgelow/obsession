import { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ObButton } from "../components/ObButton";
import { colors, fonts, radii, spacing, type, minHitSlop } from "../theme";
import { useAppState } from "../state/AppState";
import { PERSONALITIES, SCENARIOS } from "../services/practiceOptions";
import {
  averageScore,
  filterHistory,
  formatClockTime,
  formatRelativeWhen,
  groupHistoryByDay,
  HISTORY_SORT_OPTIONS,
  type HistoryEntry,
  type HistoryFilters,
  type HistorySort,
} from "../services/historyStorage";

type FilterKey = "scenario" | "personality" | "sort";

type DropdownDef = {
  key: FilterKey;
  label: string;
  options: { id: string; label: string }[];
};

function FilterDropdown({
  def,
  value,
  open,
  onToggle,
}: {
  def: DropdownDef;
  value: string;
  open: boolean;
  onToggle: () => void;
}) {
  const selected =
    def.options.find((o) => o.id === value)?.label ?? def.label;
  return (
    <View style={styles.dropdownWrap}>
      <Pressable
        onPress={onToggle}
        style={[styles.dropdownBtn, open && styles.dropdownBtnOpen]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.dropdownBtnText} numberOfLines={1}>
          {selected}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={14}
          color={colors.muted}
        />
      </Pressable>
    </View>
  );
}

export function HistoryScreen() {
  const { history, historyReady } = useAppState();
  const navigation = useNavigation();
  const [filters, setFilters] = useState<HistoryFilters>({
    scenario: "all",
    personality: "all",
    sort: "newest",
  });
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);

  const dropdowns: DropdownDef[] = useMemo(
    () => [
      {
        key: "scenario",
        label: "Scenario",
        options: [
          { id: "all", label: "All scenarios" },
          ...SCENARIOS.map((s) => ({ id: s, label: s })),
        ],
      },
      {
        key: "personality",
        label: "Personality",
        options: [
          { id: "all", label: "All vibes" },
          ...PERSONALITIES.map((p) => ({ id: p, label: p })),
        ],
      },
      {
        key: "sort",
        label: "Sort",
        options: HISTORY_SORT_OPTIONS.map((o) => ({
          id: o.id,
          label: o.label,
        })),
      },
    ],
    []
  );

  const filtered = useMemo(
    () => filterHistory(history, filters),
    [history, filters]
  );
  const groups = useMemo(() => groupHistoryByDay(filtered), [filtered]);

  const activeFilterCount = [
    filters.scenario !== "all",
    filters.personality !== "all",
  ].filter(Boolean).length;

  const openMenu = dropdowns.find((d) => d.key === openFilter) ?? null;

  const openEntry = useCallback(
    (entry: HistoryEntry) => {
      (
        navigation as { navigate: (name: string, params?: object) => void }
      ).navigate("Results", {
        sessionId: entry.sessionId,
        scores: entry.scores,
        keyMoment: entry.keyMoment,
        coaching: entry.coaching,
        pendingTurns: entry.turns,
      });
    },
    [navigation]
  );

  const setFilterValue = (key: FilterKey, id: string) => {
    setFilters((prev) => {
      if (key === "sort") return { ...prev, sort: id as HistorySort };
      if (key === "scenario") return { ...prev, scenario: id };
      return { ...prev, personality: id };
    });
    setOpenFilter(null);
  };

  const clearFilters = () => {
    setFilters({
      scenario: "all",
      personality: "all",
      sort: "newest",
    });
    setOpenFilter(null);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#1a0a12", colors.void]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>History</Text>
            <Text style={styles.subtitle}>Practice commits</Text>
          </View>
          {historyReady && history.length > 0 ? (
            <Text style={styles.count}>
              {filtered.length}
              {filtered.length !== history.length
                ? ` / ${history.length}`
                : ""}
            </Text>
          ) : null}
        </View>

        {!historyReady ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.pulse} />
          </View>
        ) : history.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="time-outline" size={36} color={colors.line} />
            <Text style={styles.emptyTitle}>No dates yet</Text>
            <Text style={styles.emptyText}>
              Finish a practice session and it will show up here with scores.
            </Text>
            <ObButton
              label="Start practicing"
              onPress={() =>
                (
                  navigation as { navigate: (name: string) => void }
                ).navigate("Practice")
              }
              style={{ marginTop: spacing.md, alignSelf: "stretch" }}
            />
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
              style={styles.filterScroll}
            >
              {dropdowns.map((def) => (
                <FilterDropdown
                  key={def.key}
                  def={def}
                  value={
                    def.key === "scenario"
                      ? filters.scenario
                      : def.key === "personality"
                        ? filters.personality
                        : filters.sort
                  }
                  open={openFilter === def.key}
                  onToggle={() =>
                    setOpenFilter((cur) =>
                      cur === def.key ? null : def.key
                    )
                  }
                />
              ))}
              {activeFilterCount > 0 ? (
                <Pressable
                  onPress={clearFilters}
                  style={styles.clearChip}
                  accessibilityRole="button"
                >
                  <Text style={styles.clearChipText}>Clear</Text>
                </Pressable>
              ) : null}
            </ScrollView>

            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {groups.length === 0 ? (
                <View style={styles.noMatch}>
                  <Text style={styles.noMatchTitle}>No matching dates</Text>
                  <Text style={styles.emptyText}>
                    Try another scenario, vibe, or score band.
                  </Text>
                  <Pressable onPress={clearFilters} hitSlop={12}>
                    <Text style={styles.clearLink}>Reset filters</Text>
                  </Pressable>
                </View>
              ) : (
                groups.map((group) => (
                  <View key={group.key} style={styles.dayBlock}>
                    <Text style={styles.dayLabel}>{group.label}</Text>
                    <View style={styles.timeline}>
                      {group.entries.map((entry, index) => {
                        const avg = averageScore(entry);
                        const isLast = index === group.entries.length - 1;
                        const message =
                          entry.keyMoment?.replace(/^\d+:\d+\s*—\s*/, "") ??
                          entry.coaching ??
                          `${entry.scenario} practice`;
                        return (
                          <Pressable
                            key={entry.id}
                            onPress={() => openEntry(entry)}
                            style={({ pressed }) => [
                              styles.commitRow,
                              pressed && { opacity: 0.88 },
                            ]}
                            accessibilityRole="button"
                          >
                            <View style={styles.rail}>
                              <View
                                style={[
                                  styles.dot,
                                  avg != null && avg >= 80
                                    ? styles.dotHigh
                                    : avg != null && avg < 60
                                      ? styles.dotLow
                                      : null,
                                ]}
                              />
                              {!isLast ? <View style={styles.railLine} /> : null}
                            </View>
                            <View style={styles.commitBody}>
                              <View style={styles.commitTop}>
                                <Text style={styles.commitTitle} numberOfLines={2}>
                                  {message}
                                </Text>
                                <Text style={styles.commitScore}>
                                  {avg != null ? avg : "—"}
                                </Text>
                              </View>
                              <Text style={styles.commitMeta} numberOfLines={1}>
                                {entry.scenario}
                                {entry.personality
                                  ? ` · ${entry.personality}`
                                  : ""}
                              </Text>
                              <View style={styles.commitFoot}>
                                <Text style={styles.commitWhen}>
                                  {formatClockTime(entry.completedAt)}
                                  {" · "}
                                  {formatRelativeWhen(entry.completedAt)}
                                </Text>
                                {(entry.turns?.length ?? 0) > 0 ? (
                                  <Text style={styles.commitTurns}>
                                    {entry.turns!.length} turns
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </>
        )}
      </SafeAreaView>

      <Modal
        visible={openMenu != null}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenFilter(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpenFilter(null)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss filters"
          />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{openMenu?.label}</Text>
            <ScrollView style={styles.modalList}>
              {openMenu?.options.map((opt) => {
                const selected =
                  openMenu.key === "scenario"
                    ? filters.scenario === opt.id
                    : openMenu.key === "personality"
                      ? filters.personality === opt.id
                      : filters.sort === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setFilterValue(openMenu.key, opt.id)}
                    style={[
                      styles.modalOption,
                      selected && styles.modalOptionActive,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        selected && styles.modalOptionTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {selected ? (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={colors.pulse}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.void },
  safe: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: fonts.display,
    fontSize: type.title1,
    color: colors.bone,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.muted,
    marginTop: 2,
  },
  count: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.subhead,
    color: colors.muted,
    marginBottom: 2,
  },
  filterScroll: { flexGrow: 0, marginBottom: spacing.md },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  dropdownWrap: { position: "relative" },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.ink,
    maxWidth: 148,
    minHeight: 36,
  },
  dropdownBtnOpen: {
    borderColor: colors.pulse,
  },
  dropdownBtnText: {
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.bone,
    flexShrink: 1,
  },
  clearChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: "center",
  },
  clearChipText: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.caption1,
    color: colors.pulse,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.headline,
    color: colors.bone,
    marginTop: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: type.footnote,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
  },
  noMatch: {
    paddingTop: spacing.xxl,
    alignItems: "center",
    gap: spacing.sm,
  },
  noMatchTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.headline,
    color: colors.bone,
  },
  clearLink: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.subhead,
    color: colors.pulse,
    marginTop: spacing.sm,
  },
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.xxl },
  dayBlock: { marginBottom: spacing.lg },
  dayLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.footnote,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  timeline: { paddingLeft: 2 },
  commitRow: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: minHitSlop + 12,
    gap: spacing.md,
  },
  rail: {
    width: 16,
    alignItems: "center",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.line,
    borderWidth: 2,
    borderColor: colors.muted,
    marginTop: 6,
    zIndex: 1,
  },
  dotHigh: {
    borderColor: colors.pulse,
    backgroundColor: "rgba(215, 71, 69, 0.35)",
  },
  dotLow: {
    borderColor: colors.tagline,
    backgroundColor: "rgba(217, 207, 196, 0.15)",
  },
  railLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.line,
    marginTop: 2,
    marginBottom: -2,
  },
  commitBody: {
    flex: 1,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: 4,
  },
  commitTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  commitTitle: {
    flex: 1,
    fontFamily: fonts.bodySemibold,
    fontSize: type.subhead,
    color: colors.bone,
    lineHeight: 20,
  },
  commitScore: {
    fontFamily: fonts.display,
    fontSize: type.headline,
    color: colors.pulse,
    minWidth: 28,
    textAlign: "right",
  },
  commitMeta: {
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.tagline,
  },
  commitFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: 2,
  },
  commitWhen: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    flexShrink: 1,
  },
  commitTurns: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.tagline,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(4, 2, 2, 0.72)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.ink,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    maxHeight: "52%",
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  modalTitle: {
    fontFamily: fonts.displayItalic,
    fontSize: type.headline,
    color: colors.bone,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  modalList: { paddingHorizontal: spacing.md },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    minHeight: minHitSlop,
  },
  modalOptionActive: {
    backgroundColor: "rgba(215, 71, 69, 0.1)",
  },
  modalOptionText: {
    fontFamily: fonts.body,
    fontSize: type.subhead,
    color: colors.tagline,
  },
  modalOptionTextActive: {
    fontFamily: fonts.bodySemibold,
    color: colors.bone,
  },
});
