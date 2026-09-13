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
  /** Base64 JPEG from SmartSpectra when image output is enabled. */
  latestPreviewJpegBase64(): string | null;
  reset(): void;
  stop(): Promise<void>;
};

/** Serialize SmartSpectra start/stop so date #2 never overlaps date #1 teardown. */
let vitalsGate: Promise<void> = Promise.resolve();

function enqueueVitals<T>(fn: () => Promise<T>): Promise<T> {
  const run = vitalsGate.then(fn, fn);
  vitalsGate = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

/** Wait until any in-flight Presage start/stop finishes, then force-stop. */
export async function ensurePresageStopped(): Promise<void> {
  await enqueueVitals(async () => {
    const native = getNativeSmartSpectra();
    if (!native?.stop) return;
    try {
      await native.stop();
    } catch {
      // nothing running
    }
  });
  await new Promise((r) => setTimeout(r, 300));
}

function wrapSimulator(reason: VitalsFallbackReason): LiveVitals {
  const sim = createVitalsSimulator();
  return {
    kind: "simulator",
    fallbackReason: reason,
    hint: vitalsFallbackHint(reason),
    latest() {
      return sim.tick();
    },
    latestPreviewJpegBase64() {
      return null;
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

  // Native SmartSpectra SPM currently crashes the app if linked; keep simulator
  // unless explicitly opted in after a proper dynamic-frameworks rebuild.
  const allowNative =
    (process.env.EXPO_PUBLIC_PRESAGE_USE_NATIVE ?? "").trim() === "1";
  if (!allowNative) return wrapSimulator("native_unavailable");

  const native = getNativeSmartSpectra();
  if (!native) return wrapSimulator("native_unavailable");

  try {
    await requestCameraPermission();
    await enqueueVitals(async () => {
      try {
        await native.stop();
      } catch {
        // nothing running
      }
      await native.start(key);
    });
    return {
      kind: "presage",
      fallbackReason: null,
      hint: "Camera HR live",
      latest() {
        const reading = native.latestReading();
        if (!reading) return null;
        const hrRaw = reading.heartRate;
        const heartRate =
          typeof hrRaw === "number" && Number.isFinite(hrRaw) && hrRaw > 0
            ? Math.round(hrRaw)
            : 0;
        return {
          heartRate,
          breathingRate: reading.breathingRate,
          engagement: reading.engagement ?? 0.6,
          expression:
            typeof reading.expression === "string" && reading.expression
              ? reading.expression
              : undefined,
          expressionConfidence: reading.expressionConfidence,
          talking: Boolean(reading.talking),
          source: "presage" as const,
        };
      },
      latestPreviewJpegBase64() {
        try {
          return native.latestPreviewJpegBase64?.() ?? null;
        } catch {
          return null;
        }
      },
      reset() {},
      async stop() {
        await enqueueVitals(async () => {
          try {
            await native.stop();
          } catch {
            // Camera already torn down.
          }
        });
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
