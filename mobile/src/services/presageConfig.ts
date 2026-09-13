export type VitalsKind = "presage" | "simulator";

export type VitalsFallbackReason =
  | "missing_key"
  | "native_unavailable"
  | "native_failed"
  | null;

export type VitalsReading = {
  /** 0 while SmartSpectra is still locking pulse. */
  heartRate: number;
  breathingRate?: number;
  engagement?: number;
  /** Dominant facial expression label from SmartSpectra (e.g. smiling, nervous). */
  expression?: string;
  expressionConfidence?: number;
  talking?: boolean;
  source: VitalsKind;
};

export type VitalsSource = {
  tick(): VitalsReading;
  reset(): void;
};

export function presageApiKey(): string {
  return (process.env.EXPO_PUBLIC_PRESAGE_API_KEY ?? "").trim();
}

export function isPresageConfigured(): boolean {
  return presageApiKey().length > 0;
}

/** True when the build opts into SmartSpectra (mutually exclusive with expo-camera). */
export function preferNativePresage(): boolean {
  return (process.env.EXPO_PUBLIC_PRESAGE_USE_NATIVE ?? "").trim() === "1";
}

export function vitalsFallbackHint(reason: VitalsFallbackReason): string | null {
  switch (reason) {
    case "missing_key":
      return "Demo HR — camera preview still on.";
    case "native_unavailable":
      return "Demo HR (simulated) — face the camera for the date vibe.";
    case "native_failed":
      return "Demo HR (simulated) — camera preview still on.";
    default:
      return null;
  }
}

/** Emergency fallback: climbs from baseline toward a nerve spike. */
export function createVitalsSimulator(baseline = 71): VitalsSource {
  let t = 0;
  return {
    tick(): VitalsReading {
      t += 1;
      let heartRate = baseline;
      if (t >= 12) heartRate = baseline + 7;
      if (t >= 20) heartRate = baseline + 13;
      if (t >= 28) heartRate = baseline + 18;
      return {
        heartRate,
        breathingRate: 14,
        engagement: 0.6,
        source: "simulator",
      };
    },
    reset() {
      t = 0;
    },
  };
}
