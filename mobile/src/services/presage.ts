// Presage SmartSpectra — real camera HR is primary.
// Native iOS/Android SDK (no official RN package). Local Expo module
// `obsession-smart-spectra` bridges SmartSpectra when a dev client is built.
// Simulator is emergency fallback only (missing key, no native module, start fail).

import { PermissionsAndroid, Platform } from "react-native";
import { getNativeSmartSpectra } from "../native/smartSpectra";
import {
  createVitalsSimulator,
  isPresageConfigured,
  presageApiKey,
  vitalsFallbackHint,
  type VitalsFallbackReason,
  type VitalsKind,
  type VitalsReading,
  type VitalsSource,
} from "./presageConfig";

export {
  createVitalsSimulator,
  isPresageConfigured,
  presageApiKey,
  vitalsFallbackHint,
} from "./presageConfig";

export type {
  VitalsFallbackReason,
  VitalsKind,
  VitalsReading,
  VitalsSource,
} from "./presageConfig";

export type LiveVitals = {
  kind: VitalsKind;
  fallbackReason: VitalsFallbackReason;
  hint: string | null;
  /** Latest HR. Null while the camera is warming — do not invent a reading. */
  latest(): VitalsReading | null;
  reset(): void;
  stop(): Promise<void>;
};

function wrapSimulator(reason: VitalsFallbackReason): LiveVitals {
  const sim = createVitalsSimulator();
  return {
    kind: "simulator",
    fallbackReason: reason,
    hint: vitalsFallbackHint(reason),
    latest() {
      return sim.tick();
    },
    reset() {
      sim.reset();
    },
    async stop() {
      sim.reset();
    },
  };
}

async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    {
      title: "Camera",
      message: "Obsession uses the camera to read heart rate during the date.",
      buttonPositive: "OK",
    }
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Prefer native SmartSpectra when the API key and native module are present.
 * Falls back to the vitals simulator only if those are missing or start fails.
 */
export async function openVitalsSource(): Promise<LiveVitals> {
  const key = presageApiKey();
  if (!key) return wrapSimulator("missing_key");

  const native = getNativeSmartSpectra();
  if (!native) return wrapSimulator("native_unavailable");

  try {
    await requestCameraPermission();
    await native.start(key);
    return {
      kind: "presage",
      fallbackReason: null,
      hint: "Camera HR live",
      latest() {
        const reading = native.latestReading();
        if (
          !reading ||
          !Number.isFinite(reading.heartRate) ||
          reading.heartRate <= 0
        ) {
          return null;
        }
        return {
          heartRate: Math.round(reading.heartRate),
          breathingRate: reading.breathingRate,
          engagement: reading.engagement ?? 0.6,
          source: "presage",
        };
      },
      reset() {},
      async stop() {
        try {
          await native.stop();
        } catch {
          // Camera already torn down.
        }
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[vitals] Presage camera start failed:", msg);
    return wrapSimulator("native_failed");
  }
}

/** @deprecated Use openVitalsSource(). Kept so older call sites still compile. */
export function createVitalsSource(baseline = 71): VitalsSource {
  return createVitalsSimulator(baseline);
}

export async function submitClipForAnalysis(
  _clipUri: string,
  _sessionId: string
): Promise<VitalsReading> {
  throw new Error(
    "Presage cloud clip upload is not wired — LiveDate uses the native SDK or simulator."
  );
}
