import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { Wordmark } from "../components/Wordmark";
import { ObCard } from "../components/ObCard";
import { ObButton } from "../components/ObButton";
import { ObChipGroup } from "../components/ObChipGroup";
import { Eyebrow } from "../components/Eyebrow";
import { colors, fonts, spacing, type } from "../theme";
import { useAppState } from "../state/AppState";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

const GENDER_OPTIONS = ["Woman", "Man", "Non-binary", "Prefer not to say"];
const GOAL_OPTIONS = [
  "Build confidence",
  "Practice conversation",
  "Reduce dating anxiety",
  "Just for fun",
];
const DATES_OPTIONS = ["0", "1-3", "4-10", "10+"];
const YES_NO_OPTIONS = ["Yes", "No"];

export function OnboardingScreen({ navigation }: Props) {
  const { profile, setProfile } = useAppState();
  const [name, setName] = useState(profile.name);
  const [gender, setGender] = useState(profile.gender);
  const [goals, setGoals] = useState<string[]>(profile.goals);
  const [datesRange, setDatesRange] = useState(profile.datesRange);
  const [hadPartner, setHadPartner] = useState(profile.hadPartner);
  // Set once during Sign Up's 18+ check and never edited here — captured in
  // a ref (not spread from `profile`) so it doesn't retrigger the autosave
  // effect below on every save.
  const dateOfBirthRef = useRef(profile.dateOfBirth);

  const canSubmit = useMemo(
    () =>
      name.trim().length > 0 &&
      gender.length > 0 &&
      goals.length > 0 &&
      datesRange.length > 0 &&
      hadPartner.length > 0,
    [name, gender, goals, datesRange, hadPartner]
  );

  const toggleGoal = (value: string) => {
    setGoals((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]
    );
  };

  // Autosave: every answer persists as it's made, so progress survives an
  // app kill even before Submit. Debounced so typing a name doesn't write
  // to AsyncStorage on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      setProfile({
        name: name.trim(),
        dateOfBirth: dateOfBirthRef.current,
        gender,
        goals,
        datesRange,
        hadPartner,
      });
    }, 300);
    return () => clearTimeout(id);
  }, [name, gender, goals, datesRange, hadPartner, setProfile]);

  const onSubmit = () => {
    if (!canSubmit) return;
    setProfile({
      name: name.trim(),
      dateOfBirth: dateOfBirthRef.current,
      gender,
      goals,
      datesRange,
      hadPartner,
    });
    navigation.replace("Main");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Wordmark size="hero" />
          <Text style={styles.tagline}>
            Stop practicing dates in your head.
          </Text>
        </View>

        <ObCard style={styles.card}>
          <Eyebrow>Your name</Eyebrow>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="What should we call you?"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="done"
          />
        </ObCard>

        <ObCard style={styles.card}>
          <Eyebrow>Gender</Eyebrow>
          <ObChipGroup
            options={GENDER_OPTIONS}
            selected={gender ? [gender] : []}
            onToggle={setGender}
          />
        </ObCard>

        <ObCard style={styles.card}>
          <Eyebrow>Your goals</Eyebrow>
          <ObChipGroup options={GOAL_OPTIONS} selected={goals} onToggle={toggleGoal} />
        </ObCard>

        <ObCard style={styles.card}>
          <Eyebrow>How many dates have you been on?</Eyebrow>
          <ObChipGroup
            options={DATES_OPTIONS}
            selected={datesRange ? [datesRange] : []}
            onToggle={setDatesRange}
          />
        </ObCard>

        <ObCard style={styles.card}>
          <Eyebrow>Have you ever had a boyfriend/girlfriend?</Eyebrow>
          <ObChipGroup
            options={YES_NO_OPTIONS}
            selected={hadPartner ? [hadPartner] : []}
            onToggle={setHadPartner}
          />
        </ObCard>

        <ObButton
          label="Submit"
          onPress={onSubmit}
          disabled={!canSubmit}
          style={styles.submitBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.void },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  hero: {
    paddingTop: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontFamily: fonts.displayItalic,
    fontSize: type.body,
    color: colors.tagline,
    textAlign: "center",
  },
  card: { gap: spacing.sm },
  input: {
    fontFamily: fonts.body,
    fontSize: type.body,
    color: colors.bone,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  submitBtn: { marginTop: spacing.sm },
});
