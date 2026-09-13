import AsyncStorage from "@react-native-async-storage/async-storage";

export type UserProfile = {
  name: string;
  dateOfBirth: string; // ISO "YYYY-MM-DD", set once during Sign Up's 18+ check
  gender: string;
  goals: string[];
  datesRange: string;
  hadPartner: string;
};

export const EMPTY_PROFILE: UserProfile = {
  name: "",
  dateOfBirth: "",
  gender: "",
  goals: [],
  datesRange: "",
  hadPartner: "",
};

export const PROFILE_STORAGE_KEY = "obsession.profile";

/** Practice-date partner — always shown as Nikki in the product UI. */
export const DATE_PARTNER_NAME = "Nikki";

export function displayUserName(profile: UserProfile | null | undefined): string {
  const name = profile?.name?.trim();
  return name && name.length > 0 ? name : "You";
}

export function isProfileComplete(profile: UserProfile): boolean {
  return (
    profile.name.trim().length > 0 &&
    profile.gender.length > 0 &&
    profile.goals.length > 0 &&
    profile.datesRange.length > 0 &&
    profile.hadPartner.length > 0
  );
}

export async function loadProfile(): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return EMPTY_PROFILE;
    const parsed = JSON.parse(raw) as Partial<UserProfile> | null;
    if (!parsed || typeof parsed !== "object") return EMPTY_PROFILE;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      dateOfBirth:
        typeof parsed.dateOfBirth === "string" ? parsed.dateOfBirth : "",
      gender: typeof parsed.gender === "string" ? parsed.gender : "",
      goals: Array.isArray(parsed.goals)
        ? parsed.goals.filter((g): g is string => typeof g === "string")
        : [],
      datesRange:
        typeof parsed.datesRange === "string" ? parsed.datesRange : "",
      hadPartner:
        typeof parsed.hadPartner === "string" ? parsed.hadPartner : "",
    };
  } catch {
    return EMPTY_PROFILE;
  }
}

export async function persistProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage unavailable (web private mode / tests) — in-memory state still holds.
  }
}
