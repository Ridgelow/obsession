// Pure Persona helpers — no native SDK import (safe for tests / Expo web).
// Inquiry UI lives in persona.ts / persona.native.ts.

export const PERSONA_TEMPLATE_ID_ENV = "EXPO_PUBLIC_PERSONA_TEMPLATE_ID";

export const VERIFIED_STORAGE_KEY = "obsession.persona.verified";

export const PERSONA_DEV_CLIENT_HINT =
  "Persona SDK needs a prebuild / EAS dev client — not Expo Go.";

export const PERSONA_MOCK_INQUIRY_ID = "inq_mock_unconfigured";

export const PERSONA_MOCK_LABEL =
  "Demo mock — not a real Persona inquiry. Set EXPO_PUBLIC_PERSONA_USE_MOCK=0 and an itmpl_ id for live verify.";

export type VerificationHandlers = {
  onVerified: (inquiryId: string) => void;
  onCanceled: () => void;
  onError: (message: string) => void;
};

export type VerifiedRecord = {
  verified: boolean;
  inquiryId?: string;
};

export type PersonaEnvironmentName = "sandbox" | "production";

export function personaTemplateId(): string {
  return (process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID ?? "").trim();
}

/** Force the labeled demo mock (hackathon / bad template id). */
export function isPersonaMockForced(): boolean {
  const raw = (process.env.EXPO_PUBLIC_PERSONA_USE_MOCK ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function isPersonaConfigured(): boolean {
  return personaTemplateId().length > 0;
}

/** Persona Inquiry.fromTemplate only accepts tokens that start with `itmpl_`. */
export function isPersonaTemplateToken(templateId = personaTemplateId()): boolean {
  return templateId.startsWith("itmpl_");
}

/** Use mock when forced, missing template, or non-itmpl_ placeholder in env. */
export function shouldUsePersonaMock(): boolean {
  if (isPersonaMockForced()) return true;
  if (!isPersonaConfigured()) return true;
  return !isPersonaTemplateToken();
}

/**
 * Real Persona `itmpl_` ids are opaque — unlike hand-written placeholders,
 * they never encode "sandbox"/"production" in the string itself — so an id
 * check alone can't tell the two apart. Prefer an explicit
 * EXPO_PUBLIC_PERSONA_ENVIRONMENT=sandbox|production override; fall back to
 * checking the id for either word (for placeholder-style ids); otherwise
 * default to sandbox, since that's the safe choice for dev/hackathon use —
 * a mismatched environment makes Inquiry.fromTemplate fail outright.
 */
export function personaEnvironmentName(
  templateId = personaTemplateId()
): PersonaEnvironmentName {
  const override = (process.env.EXPO_PUBLIC_PERSONA_ENVIRONMENT ?? "")
    .trim()
    .toLowerCase();
  if (override === "sandbox" || override === "production") return override;
  if (/production/i.test(templateId)) return "production";
  return "sandbox";
}

/**
 * Unlock Continue only on a passed 18+ inquiry.
 * Persona onComplete status is typically completed | approved | declined | failed | needs_review.
 */
export function isVerifiedStatus(status: string | null | undefined): boolean {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();
  return normalized === "completed" || normalized === "approved" || normalized === "passed";
}

export function serializeVerifiedRecord(record: VerifiedRecord): string {
  return JSON.stringify({
    verified: Boolean(record.verified),
    inquiryId: record.inquiryId,
  });
}

export function parseVerifiedRecord(raw: string | null | undefined): VerifiedRecord {
  if (raw == null || raw === "") return { verified: false };
  if (raw === "true") return { verified: true };
  if (raw === "false") return { verified: false };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === true) return { verified: true };
    if (parsed === false) return { verified: false };
    if (parsed && typeof parsed === "object") {
      const rec = parsed as { verified?: unknown; inquiryId?: unknown };
      const inquiryId =
        typeof rec.inquiryId === "string" && rec.inquiryId.trim().length > 0
          ? rec.inquiryId
          : undefined;
      return { verified: rec.verified === true, inquiryId };
    }
  } catch {
    // fall through
  }
  return { verified: false };
}

export function mockFallbackLabel(): string | null {
  return shouldUsePersonaMock() ? PERSONA_MOCK_LABEL : null;
}

/** Honest mock — only when the template id is missing. Never label this as live Persona. */
export async function startMockVerification({
  onVerified,
}: VerificationHandlers): Promise<void> {
  await new Promise((r) => setTimeout(r, 500));
  onVerified(PERSONA_MOCK_INQUIRY_ID);
}
