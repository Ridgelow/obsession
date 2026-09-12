// Presage SmartSpectra — native iOS/Android SDK (no official RN package yet).
// Prefer the vitals simulator for demo reliability. Native is an optional stub.

export type VitalsReading = {
  heartRate: number;
  breathingRate?: number;
  engagement?: number;
  source?: string;
};

export type VitalsSource = {
  tick(): VitalsReading;
  reset(): void;
};

/** Keep simulator first. Flip only if a native bridge is actually installed. */
export const PREFER_SIMULATOR = true;

/** Demo simulator: climbs from baseline toward a nerve spike. */
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

/** Optional native stub — do not call in the demo path. */
export function createNativePresageStub(): VitalsSource {
  return {
    tick(): VitalsReading {
      throw new Error(
        "Presage native bridge not wired — use createVitalsSimulator()."
      );
    },
    reset() {},
  };
}

/** Demo entry: always the simulator unless native is explicitly opted in. */
export function createVitalsSource(
  baseline = 71,
  opts?: { native?: boolean }
): VitalsSource {
  if (opts?.native && !PREFER_SIMULATOR) {
    return createNativePresageStub();
  }
  return createVitalsSimulator(baseline);
}

export async function submitClipForAnalysis(
  _clipUri: string,
  _sessionId: string
): Promise<VitalsReading> {
  throw new Error(
    "Presage cloud/native bridge not wired yet — use createVitalsSimulator()."
  );
}
