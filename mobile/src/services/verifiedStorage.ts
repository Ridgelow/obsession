import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  parseVerifiedRecord,
  serializeVerifiedRecord,
  VERIFIED_STORAGE_KEY,
  type VerifiedRecord,
} from "./personaConfig";

export async function loadVerified(): Promise<VerifiedRecord> {
  try {
    const raw = await AsyncStorage.getItem(VERIFIED_STORAGE_KEY);
    return parseVerifiedRecord(raw);
  } catch {
    return { verified: false };
  }
}

export async function persistVerified(record: VerifiedRecord): Promise<void> {
  try {
    if (!record.verified) {
      await AsyncStorage.removeItem(VERIFIED_STORAGE_KEY);
      return;
    }
    await AsyncStorage.setItem(
      VERIFIED_STORAGE_KEY,
      serializeVerifiedRecord(record)
    );
  } catch {
    // Storage unavailable (web private mode / tests) — in-memory state still holds.
  }
}
