// Presage SmartSpectra — native iOS/Android SDK (no official RN package yet).
// Until the bridge lands, LiveDateScreen runs a vitals simulator.

export type VitalsReading = {
  heartRate: number;
  breathingRate?: number;
  engagement?: number;
};

/** Demo simulator: climbs from baseline toward a nerve spike. */
export function createVitalsSimulator(baseline = 71) {
  let t = 0;
  return {
    tick(): VitalsReading {
      t += 1;
      let heartRate = baseline;
      if (t >= 12) heartRate = baseline + 7;
      if (t >= 20) heartRate = baseline + 13;
      if (t >= 28) heartRate = baseline + 18;
      return { heartRate, breathingRate: 14, engagement: 0.6 };
    },
    reset() {
      t = 0;
    },
  };
}

export async function submitClipForAnalysis(
  _clipUri: string,
  _sessionId: string
): Promise<VitalsReading> {
  throw new Error(
    "Presage cloud/native bridge not wired yet — use createVitalsSimulator()."
  );
}
