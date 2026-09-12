import { NativeModulesProxy, requireOptionalNativeModule } from "expo-modules-core";

export type SmartSpectraReading = {
  heartRate: number;
  breathingRate?: number;
  engagement?: number;
};

type SmartSpectraNative = {
  start(apiKey: string): Promise<void>;
  stop(): Promise<void>;
  latestReading(): SmartSpectraReading | null;
};

const native =
  requireOptionalNativeModule<SmartSpectraNative>("ObsessionSmartSpectra") ??
  (NativeModulesProxy.ObsessionSmartSpectra as SmartSpectraNative | undefined) ??
  null;

export function isSmartSpectraAvailable(): boolean {
  return native != null;
}

export async function startSmartSpectra(apiKey: string): Promise<void> {
  if (!native) {
    throw new Error("ObsessionSmartSpectra native module is not available");
  }
  await native.start(apiKey);
}

export async function stopSmartSpectra(): Promise<void> {
  if (!native) return;
  await native.stop();
}

export function latestSmartSpectraReading(): SmartSpectraReading | null {
  if (!native) return null;
  return native.latestReading();
}
