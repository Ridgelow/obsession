import {
  NativeModules,
  Pressable,
  StyleSheet,
  Text,
  View,
  TurboModuleRegistry,
} from "react-native";
import type { ComponentType } from "react";
import Constants from "expo-constants";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts, spacing, type } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "LiveDate">;

/** True when JS is running inside Expo Go (no LiveKit/WebRTC native module). */
function isExpoGo(): boolean {
  return (
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === "storeClient"
  );
}

function hasWebRtcNative(): boolean {
  try {
    if (NativeModules.WebRTCModule != null) return true;
  } catch {
    // ignore
  }
  try {
    // New Architecture / bridgeless may only expose via TurboModuleRegistry
    return TurboModuleRegistry.get("WebRTCModule") != null;
  } catch {
    return false;
  }
}

function MissingWebRtc({
  onBack,
  reason,
}: {
  onBack: () => void;
  reason: string;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Voice needs Obsession</Text>
      <Text style={styles.body}>
        Close Expo Go and open the Obsession app. Voice uses native WebRTC that
        Expo Go does not include.
      </Text>
      <Text style={styles.detail}>{reason}</Text>
      <Pressable onPress={onBack} style={styles.btn} accessibilityRole="button">
        <Text style={styles.btnText}>Go back</Text>
      </Pressable>
    </View>
  );
}

function LoadError({
  onBack,
  message,
}: {
  onBack: () => void;
  message: string;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Date failed to load</Text>
      <Text style={styles.body}>{message}</Text>
      <Pressable onPress={onBack} style={styles.btn} accessibilityRole="button">
        <Text style={styles.btnText}>Go back</Text>
      </Pressable>
    </View>
  );
}

/**
 * Thin entry — never imports @elevenlabs / LiveKit at module top level.
 * Those packages call registerGlobals() on import and crash hard if WebRTC
 * is missing (classic Expo Go failure on elevenlabs.native.ts line 6).
 */
export function LiveDateScreen(props: Props) {
  const onBack = () => props.navigation.goBack();

  if (isExpoGo()) {
    return (
      <MissingWebRtc
        onBack={onBack}
        reason="Running in Expo Go (executionEnvironment=storeClient)."
      />
    );
  }

  if (!hasWebRtcNative()) {
    return (
      <MissingWebRtc
        onBack={onBack}
        reason="WebRTCModule not found in this Obsession build — rebuild with npx expo run:ios."
      />
    );
  }

  try {
    // Dynamic require so @elevenlabs/react-native only loads when WebRTC exists.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./LiveDateVoiceSession") as {
      default?: ComponentType<Props>;
      LiveDateVoiceSession?: ComponentType<Props>;
    };
    const Session = mod.default ?? mod.LiveDateVoiceSession;
    if (!Session) {
      return (
        <LoadError
          onBack={onBack}
          message="LiveDateVoiceSession export missing after require()."
        />
      );
    }
    return <Session {...props} />;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[LiveDate] voice session failed to load:", message);
    return <LoadError onBack={onBack} message={message} />;
  }
}

export default LiveDateScreen;

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.void,
    padding: spacing.lg,
    justifyContent: "center",
    gap: spacing.md,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: type.title1,
    color: colors.bone,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: type.subhead,
    color: colors.muted,
    lineHeight: 22,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.pulse,
  },
  btn: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    backgroundColor: colors.pulse,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  btnText: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.subhead,
    color: colors.bone,
  },
});
