import type { ComponentType } from "react";
import { requireNativeViewManager } from "expo-modules-core";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

type Props = {
  style?: StyleProp<ViewStyle>;
};

/**
 * Native SmartSpectra face preview (UIImageView).
 * Falls back to an empty well if the native view isn't in this build.
 */
let NativePreview: ComponentType<{ style?: StyleProp<ViewStyle> }> | null = null;
try {
  NativePreview = requireNativeViewManager("ObsessionSmartSpectra");
} catch {
  NativePreview = null;
}

export function PresageNativePreview({ style }: Props) {
  if (!NativePreview) {
    return <View style={[styles.fallback, style]} />;
  }
  return <NativePreview style={style} />;
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: "#12080c",
  },
});
