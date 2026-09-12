import { NativeModules } from "react-native";

export type NativeVitalsReading = {
  heartRate: number;
  breathingRate?: number;
  engagement?: number;
};

export type NativeSmartSpectra = {
  start(apiKey: string): Promise<void>;
  stop(): Promise<void>;
  latestReading(): NativeVitalsReading | null;
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
