export type VitalsKind = "presage" | "simulator";

export type VitalsFallbackReason =
  | "missing_key"
  | "native_unavailable"
  | "native_failed"
  | null;

export type VitalsReading = {
  heartRate: number;
  breathingRate?: number;
  engagement?: number;
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

export function vitalsFallbackHint(reason: VitalsFallbackReason): string | null {
  switch (reason) {
    case "missing_key":
      return "Demo HR — add EXPO_PUBLIC_PRESAGE_API_KEY for camera vitals.";
    case "native_unavailable":
      return "Demo HR (simulated) — camera vitals need SmartSpectra linked.";
    case "native_failed":
      return "Demo HR (simulated) — camera vitals unavailable this build.";
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
