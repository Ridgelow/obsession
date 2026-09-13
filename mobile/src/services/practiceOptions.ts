/** Date-partner personality (Nikki) — chosen above scenario on Home. */
export type Personality = "Warm" | "Witty" | "Guarded" | "Flirty";

export const PERSONALITIES: Personality[] = [
  "Warm",
  "Witty",
  "Guarded",
  "Flirty",
];

export const PERSONALITY_BLURBS: Record<Personality, string> = {
  Warm: "Soft openers, lots of follow-ups.",
  Witty: "Playful banter, light teasing.",
  Guarded: "Shorter answers — you have to earn trust.",
  Flirty: "More charged energy, clearer interest.",
};

export type Scenario = "First Date" | "Coffee Chat" | "Silence";

export const SCENARIOS: Scenario[] = ["First Date", "Coffee Chat", "Silence"];

export function isPersonality(value: unknown): value is Personality {
  return (
    typeof value === "string" &&
    (PERSONALITIES as string[]).includes(value)
  );
}
