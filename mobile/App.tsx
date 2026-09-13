import { useEffect, useState, type ComponentType } from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import {
  useFonts,
  BodoniModa_700Bold,
  BodoniModa_400Regular_Italic,
} from "@expo-google-fonts/bodoni-moda";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "./src/state/AppState";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { VoiceGateway } from "./src/services/voiceGateway";
import { loadVerified } from "./src/services/verifiedStorage";
import { EMPTY_PROFILE, loadProfile, type UserProfile } from "./src/services/profileStorage";
import { colors } from "./src/theme";

let VoiceRegressionHarness: ComponentType = () => null;
if (
  __DEV__ &&
  (process.env.EXPO_PUBLIC_VOICE_REGRESSION ?? "").trim() === "1"
) {
  // Native-only harness (ConversationProvider + LiveKit).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  VoiceRegressionHarness =
    require("./src/services/voiceRegression.native").VoiceRegressionHarness;
}

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.void,
    card: colors.void,
    text: colors.bone,
    border: colors.line,
    primary: colors.pulse,
  },
};

export default function App() {
  const [loaded] = useFonts({
    BodoniModa_700Bold,
    BodoniModa_400Regular_Italic,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_700Bold,
  });
  const [boot, setBoot] = useState<{
    ready: boolean;
    verified: boolean;
    profile: UserProfile;
  }>({
    ready: false,
    verified: false,
    profile: EMPTY_PROFILE,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadVerified(), loadProfile()])
      .then(([record, profile]) => {
        if (!cancelled) setBoot({ ready: true, verified: record.verified, profile });
      })
      .catch(() => {
        if (!cancelled) setBoot({ ready: true, verified: false, profile: EMPTY_PROFILE });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // One-shot on-device mic regression (ambient RMS) — proves what kills date #2 capture.
  useEffect(() => {
    if (!__DEV__) return;
    if ((process.env.EXPO_PUBLIC_MIC_REGRESSION ?? "").trim() !== "1") return;
    let cancelled = false;
    (async () => {
      try {
        const { getNativeSmartSpectra } = await import(
          "./src/native/smartSpectra"
        );
        const { presageApiKey } = await import("./src/services/presageConfig");
        const native = getNativeSmartSpectra();
        const key = presageApiKey();
        if (!native?.runMicCaptureRegression || !key) {
          console.warn("[mic-regression] skipped — module or key missing");
          return;
        }
        console.warn("[mic-regression] starting device capture A/B…");
        const report = await native.runMicCaptureRegression(key);
        if (cancelled) return;
        console.warn(
          "[mic-regression] RESULT",
          JSON.stringify(report?.verdict ?? report, null, 2)
        );
        console.warn(
          "[mic-regression] rms",
          JSON.stringify({
            t0: report?.t0_rms,
            after_presage: report?.after_presage_rms,
            after_hardReset: report?.after_hardReset_rms,
            second_cycle: (report as { second_cycle_rms?: number })
              ?.second_cycle_rms,
            presage_error: report?.presage_error,
          })
        );
      } catch (err) {
        console.warn("[mic-regression] failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const voiceRegression =
    __DEV__ &&
    (process.env.EXPO_PUBLIC_VOICE_REGRESSION ?? "").trim() === "1";

  if (!loaded || !boot.ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.void,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.pulse} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <VoiceGateway>
        <AppProvider initialVerified={boot.verified} initialProfile={boot.profile}>
          <NavigationContainer theme={navTheme}>
            <StatusBar style="light" />
            <RootNavigator />
            {voiceRegression ? <VoiceRegressionHarness /> : null}
          </NavigationContainer>
        </AppProvider>
      </VoiceGateway>
    </SafeAreaProvider>
  );
}
