import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { ObCard } from "../components/ObCard";
import { ObButton } from "../components/ObButton";
import { colors, fonts, spacing, type } from "../theme";
import { useAppState } from "../state/AppState";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

export function OnboardingScreen({ navigation }: Props) {
  const { verified, setVerified } = useAppState();
  const [verifying, setVerifying] = useState(false);

  const onVerify = async () => {
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 600));
    setVerified(true);
    setVerifying(false);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#3a1218", colors.void, colors.void]}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          <Text style={styles.wordmarkHero}>OBSESSION</Text>
          <Text style={styles.tagline}>
            Stop practicing dates in your head.
          </Text>
        </View>

        <ObCard style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="shield-checkmark" size={18} color={colors.pulse} />
            <Text style={styles.cardTitle}>One quick check.</Text>
          </View>
          <Text style={styles.cardBody}>
            We confirm you’re a real person with Persona before your first
            practice date — about 20 seconds, and your data stays private.
          </Text>
          <ObButton
            label={verifying ? "Verifying…" : "Verify with Persona"}
            variant="outline"
            onPress={onVerify}
            disabled={verifying || verified}
            style={styles.verifyBtn}
          />
          {verified ? (
            <View style={styles.verifiedRow}>
              <Ionicons name="checkmark" size={16} color={colors.pulse} />
              <Text style={styles.verifiedText}>Verified — you’re all set</Text>
            </View>
          ) : null}
        </ObCard>

        <View style={styles.footer}>
          <ObButton
            label="Continue"
            onPress={() => navigation.replace("Main")}
            disabled={!verified}
          />
          <Text style={styles.footerHint}>
            You can redo this anytime from Profile.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.void },
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
  verifyBtn: { marginTop: spacing.sm },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  verifiedText: {
    fontFamily: fonts.body,
    fontSize: type.footnote,
    color: colors.pulse,
  },
  footer: { gap: spacing.sm },
  footerHint: {
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.muted,
    textAlign: "center",
  },
});
