import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { colors, fonts, type } from "../theme";

/**
 * Front-camera preview for Live Date atmosphere when Presage native is off.
 * When EXPO_PUBLIC_PRESAGE_USE_NATIVE=1 and SmartSpectra starts, LiveDate
 * hides this so Presage owns the camera session.
 */
export function DateCameraPreview() {
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!permission) return;
        if (!permission.granted) {
          const res = await requestPermission();
          if (!cancelled) setReady(Boolean(res.granted));
          return;
        }
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [permission, requestPermission]);

  if (failed) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Camera unavailable</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Allow camera for the date…</Text>
      </View>
    );
  }

  try {
    return (
      <CameraView
        style={styles.camera}
        facing="front"
        mirror
        mute
        mode="picture"
        onMountError={() => setFailed(true)}
      />
    );
  } catch {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Camera unavailable</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  camera: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#12080c",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  fallbackText: {
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.muted,
    textAlign: "center",
  },
});
