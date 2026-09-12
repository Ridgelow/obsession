import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { ObCard } from "../components/ObCard";
import { ObButton } from "../components/ObButton";
import { colors, fonts, radii, spacing, type } from "../theme";
import { useAppState } from "../state/AppState";
import { mockFallbackLabel, startVerification } from "../services/persona";
import { verifyAgeWithPersona, type PersonaAgeVerifyResult } from "../services/api";

type Props = NativeStackScreenProps<RootStackParamList, "SignUp">;

const MIN_AGE = 18;

function isValidCalendarDate(month: number, day: number, year: number): boolean {
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day
  );
}

function calculateAge(month: number, day: number, year: number): number {
  const today = new Date();
  const birthDate = new Date(year, month - 1, day);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Human-readable reason the server rejected the ID/age cross-check. */
function ageCheckErrorMessage(result: PersonaAgeVerifyResult): string {
  switch (result.reason) {
    case "dob_mismatch":
      return result.idDateOfBirth
        ? `Your ID says ${result.idDateOfBirth} — that doesn't match the birthday you entered.`
        : "Your ID's date of birth doesn't match the birthday you entered.";
    case "underage":
      return "Your ID shows you're under 18.";
    case "inquiry_not_complete":
      return "Persona didn't finish verifying your ID. Try again.";
    case "no_birthdate_on_id":
      return "We couldn't read a date of birth from your ID.";
    case "not_configured":
      return "ID age verification isn't configured on the server yet.";
    default:
      return "We couldn't confirm your ID. Try again.";
  }
}

/** Parses a stored "YYYY-MM-DD" into display parts, only if still a valid 18+ date. */
function parseStoredDob(iso: string): { month: string; day: string; year: string } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [, yearStr, monthStr, dayStr] = match;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  if (!isValidCalendarDate(month, day, year) || calculateAge(month, day, year) < MIN_AGE) {
    return null;
  }
  return { month: monthStr, day: dayStr, year: yearStr };
}

export function SignUpScreen({ navigation }: Props) {
  const { verified, setVerified, profile, setProfile } = useAppState();
  const storedDob = parseStoredDob(profile.dateOfBirth);

  const [dobMonth, setDobMonth] = useState(storedDob?.month ?? "");
  const [dobDay, setDobDay] = useState(storedDob?.day ?? "");
  const [dobYear, setDobYear] = useState(storedDob?.year ?? "");
  const [dobError, setDobError] = useState<string | null>(null);
  const [dobConfirmed, setDobConfirmed] = useState(Boolean(storedDob));
  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mockLabel = mockFallbackLabel();
  const usingMock = Boolean(mockLabel);

  const onConfirmBirthday = () => {
    const month = parseInt(dobMonth, 10);
    const day = parseInt(dobDay, 10);
    const year = parseInt(dobYear, 10);

    if (dobMonth.length === 0 || dobDay.length === 0 || dobYear.length !== 4) {
      setDobError("Enter your full date of birth.");
      return;
    }
    if (!isValidCalendarDate(month, day, year)) {
      setDobError("That date doesn't look right.");
      return;
    }
    if (new Date(year, month - 1, day) > new Date()) {
      setDobError("Date of birth can't be in the future.");
      return;
    }
    if (calculateAge(month, day, year) < MIN_AGE) {
      setDobError("You must be 18 or older to use Obsession.");
      return;
    }
    setDobError(null);
    setDobConfirmed(true);
    setProfile({
      ...profile,
      dateOfBirth: `${year}-${pad2(month)}-${pad2(day)}`,
    });
  };

  const onEditBirthday = () => {
    setDobConfirmed(false);
    setVerified(false);
    setError(null);
  };

  // Persona's Inquiry SDK captures the ID + selfie and reports back only an
  // inquiryId + status — it never hands the extracted ID fields to the
  // client. So "onVerified" here isn't the final answer: the server has to
  // fetch that inquiry from Persona's API and confirm the ID itself says
  // 18+ and its birthdate matches what was typed above.
  const confirmAgeWithServer = async (inquiryId: string) => {
    try {
      const result = await verifyAgeWithPersona(inquiryId, profile.dateOfBirth);
      if (result.verified) {
        setVerified(true, inquiryId);
      } else {
        setError(ageCheckErrorMessage(result));
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Couldn't confirm your ID: ${err.message}`
          : "Couldn't confirm your ID."
      );
    } finally {
      setVerifying(false);
    }
  };

  const onVerify = () => {
    if (verifying || verified) return;
    setVerifying(true);
    setError(null);
    void startVerification({
      onVerified: (inquiryId) => {
        void confirmAgeWithServer(inquiryId);
      },
      onCanceled: () => {
        setVerifying(false);
      },
      onError: (message) => {
        setError(message);
        setVerifying(false);
      },
    }).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Verification failed");
      setVerifying(false);
    });
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#3a1218", colors.void, colors.void]}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.safe}>
        <View style={styles.hero}>
          <Text style={styles.wordmarkHero}>OBSESSION</Text>
          <Text style={styles.tagline}>
            Stop practicing dates in your head.
          </Text>
        </View>

        {!dobConfirmed ? (
          <ObCard style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="calendar" size={18} color={colors.pulse} />
              <Text style={styles.cardTitle}>You must be 18+ to sign up.</Text>
            </View>
            <Text style={styles.cardBody}>
              No email, no password. Enter your birthday, then we'll scan a
              government ID with Persona to confirm it matches and says
              18+.
            </Text>
            <View style={styles.dobRow}>
              <TextInput
                value={dobMonth}
                onChangeText={(t) => {
                  const digits = t.replace(/\D/g, "").slice(0, 2);
                  setDobMonth(digits);
                  if (digits.length === 2) dayRef.current?.focus();
                }}
                placeholder="MM"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.dobInput, styles.dobInputSmall]}
              />
              <TextInput
                ref={dayRef}
                value={dobDay}
                onChangeText={(t) => {
                  const digits = t.replace(/\D/g, "").slice(0, 2);
                  setDobDay(digits);
                  if (digits.length === 2) yearRef.current?.focus();
                }}
                placeholder="DD"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.dobInput, styles.dobInputSmall]}
              />
              <TextInput
                ref={yearRef}
                value={dobYear}
                onChangeText={(t) => setDobYear(t.replace(/\D/g, "").slice(0, 4))}
                placeholder="YYYY"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                maxLength={4}
                style={[styles.dobInput, styles.dobInputLarge]}
              />
            </View>
            {dobError ? <Text style={styles.errorText}>{dobError}</Text> : null}
            <ObButton
              label="Confirm birthday"
              variant="outline"
              onPress={onConfirmBirthday}
              style={styles.verifyBtn}
            />
          </ObCard>
        ) : (
          <>
            <ObCard style={styles.card}>
              <View style={styles.dobConfirmedRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.pulse} />
                <Text style={styles.dobConfirmedText}>
                  Born {pad2(parseInt(dobMonth, 10))}/{pad2(parseInt(dobDay, 10))}/
                  {dobYear} — 18+
                </Text>
                <Pressable onPress={onEditBirthday} hitSlop={8}>
                  <Text style={styles.editLink}>Edit</Text>
                </Pressable>
              </View>
            </ObCard>

            <ObCard style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="shield-checkmark" size={18} color={colors.pulse} />
                <Text style={styles.cardTitle}>Scan your ID.</Text>
              </View>
              <Text style={styles.cardBody}>
                Persona opens your camera to scan a government ID and take a
                selfie — about 20 seconds. We check that the ID's birthday
                matches what you entered and confirms you're 18+. Your data
                stays private.
              </Text>

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: verified, disabled: verifying }}
                onPress={onVerify}
                disabled={verifying || verified}
                style={[
                  styles.humanBox,
                  verified && styles.humanBoxVerified,
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    verified && styles.checkboxChecked,
                  ]}
                >
                  {verified ? (
                    <Ionicons name="checkmark" size={16} color={colors.ink} />
                  ) : null}
                </View>
                <Text style={styles.humanLabel}>
                  {verified
                    ? "You're verified"
                    : verifying
                      ? "Verifying…"
                      : "Verify You Are Human"}
                </Text>
                {verifying ? (
                  <ActivityIndicator size="small" color={colors.muted} />
                ) : (
                  <Ionicons
                    name={verified ? "shield-checkmark" : "sync-outline"}
                    size={20}
                    color={verified ? colors.pulse : colors.muted}
                  />
                )}
              </Pressable>

              {mockLabel && !verified ? (
                <Text style={styles.mockLabel}>{mockLabel}</Text>
              ) : null}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </ObCard>
          </>
        )}

        <View style={styles.footer}>
          <ObButton
            label="Continue"
            onPress={() => navigation.replace("Onboarding")}
            disabled={!dobConfirmed || !verified}
          />
        </View>
      </View>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.void },
  safeArea: { flex: 1 },
  flexOne: { flex: 1 },
  safe: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "space-between",
    paddingBottom: spacing.lg,
  },
  hero: {
    paddingTop: spacing.xxl,
    alignItems: "center",
    gap: spacing.md,
  },
  wordmarkHero: {
    fontFamily: fonts.display,
    fontSize: 44,
    color: colors.bone,
    letterSpacing: -1,
    textAlign: "center",
  },
  tagline: {
    fontFamily: fonts.displayItalic,
    fontSize: type.body,
    color: colors.tagline,
    textAlign: "center",
  },
  card: { gap: spacing.md },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.headline,
    color: colors.bone,
  },
  cardBody: {
    fontFamily: fonts.body,
    fontSize: type.subhead,
    lineHeight: 22,
    color: colors.muted,
  },
  dobRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dobInput: {
    fontFamily: fonts.body,
    fontSize: type.body,
    color: colors.bone,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlign: "center",
  },
  dobInputSmall: { flex: 1 },
  dobInputLarge: { flex: 1.4 },
  dobConfirmedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dobConfirmedText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: type.subhead,
    color: colors.bone,
  },
  editLink: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.footnote,
    color: colors.pulse,
  },
  verifyBtn: { marginTop: spacing.sm },
  humanBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  humanBoxVerified: {
    borderColor: colors.pulse,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.pulse,
    borderColor: colors.pulse,
  },
  humanLabel: {
    flex: 1,
    fontFamily: fonts.bodySemibold,
    fontSize: type.subhead,
    color: colors.bone,
  },
  mockLabel: {
    fontFamily: fonts.body,
    fontSize: type.caption1,
    lineHeight: 16,
    color: colors.muted,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: type.footnote,
    lineHeight: 18,
    color: colors.pulse,
  },
  footer: { gap: spacing.sm },
});
