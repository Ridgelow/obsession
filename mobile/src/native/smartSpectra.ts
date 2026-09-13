import { NativeModules } from "react-native";

export type NativeVitalsReading = {
  heartRate: number;
  breathingRate?: number;
  engagement?: number;
  expression?: string;
  expressionConfidence?: number;
  talking?: boolean;
};

export type MicCaptureRegressionVerdict = {
  cold_capture_ok: boolean;
  after_presage_capture_ok: boolean;
  after_hardReset_capture_ok: boolean;
  presage_killed_capture: boolean;
  hardReset_killed_capture: boolean;
  threshold: number;
};

export type MicCaptureRegressionReport = {
  t0_rms?: number;
  after_presage_rms?: number;
  after_hardReset_rms?: number;
  presage_error?: string;
  verdict?: MicCaptureRegressionVerdict;
  [key: string]: unknown;
};

export type NativeSmartSpectra = {
  start(apiKey: string): Promise<void>;
  stop(): Promise<void>;
  latestReading(): NativeVitalsReading | null;
  latestPreviewJpegBase64?: () => string | null;
  /** Hard AVAudioSession deactivate/activate — clears silent-mic after date #1. */
  resetAudioSession?: () => Promise<void>;
  /** Deactivate only — clear stuck activation before LiveKit startAudioSession. */
  deactivateAudioSession?: () => Promise<void>;
  /** Device A/B: capture RMS before/after Presage + hardReset. */
  runMicCaptureRegression?: (
    apiKey: string
  ) => Promise<MicCaptureRegressionReport>;
};

/**
 * Optional native module. Null in Expo Go / web / before prebuild.
 * Linked as `ObsessionSmartSpectra` after `npx expo prebuild`.
 */
export function getNativeSmartSpectra(): NativeSmartSpectra | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireOptionalNativeModule } = require("expo-modules-core") as {
      requireOptionalNativeModule: (name: string) => NativeSmartSpectra | null;
    };
    const mod = requireOptionalNativeModule("ObsessionSmartSpectra");
    if (mod) return mod;
  } catch {
    // expo-modules-core missing or module not registered.
  }
  const legacy = (
    NativeModules as { ObsessionSmartSpectra?: NativeSmartSpectra }
  ).ObsessionSmartSpectra;
  return legacy ?? null;
}
