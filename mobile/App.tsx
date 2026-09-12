import { useEffect, useState } from "react";
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
          </NavigationContainer>
        </AppProvider>
      </VoiceGateway>
    </SafeAreaProvider>
  );
}
