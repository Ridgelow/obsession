// Pure Persona helpers — no native SDK import (safe for tests / Expo web).
// Inquiry UI lives in persona.ts / persona.native.ts.

export const PERSONA_TEMPLATE_ID_ENV = "EXPO_PUBLIC_PERSONA_TEMPLATE_ID";

/** Sandbox 18+ template from the Persona dashboard. Copy into mobile/.env. */
export const PERSONA_SANDBOX_18_TEMPLATE_ID =
  "persona_sandbox_2ccdba5e-08cd-4e47-965f-a59133988bb0";

export const VERIFIED_STORAGE_KEY = "obsession.persona.verified";

export const PERSONA_DEV_CLIENT_HINT =
  "Persona SDK needs a prebuild / EAS dev client — not Expo Go.";

export const PERSONA_MOCK_INQUIRY_ID = "inq_mock_unconfigured";

export const PERSONA_MOCK_LABEL =
  "Demo mock — EXPO_PUBLIC_PERSONA_TEMPLATE_ID is not set. Not a real Persona inquiry.";

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

export function isPersonaConfigured(): boolean {
  return personaTemplateId().length > 0;
}

/** Persona Inquiry.fromTemplate only accepts tokens that start with `itmpl_`. */
export function isPersonaTemplateToken(templateId = personaTemplateId()): boolean {
  return templateId.startsWith("itmpl_");
}

/** Sandbox template ids include "sandbox"; otherwise production. */
export function personaEnvironmentName(
  templateId = personaTemplateId()
): PersonaEnvironmentName {
  return /sandbox/i.test(templateId) ? "sandbox" : "production";
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

export function mockFallbackLabel(configured = isPersonaConfigured()): string | null {
  return configured ? null : PERSONA_MOCK_LABEL;
}

/** Honest mock — only when the template id is missing. Never label this as live Persona. */
export async function startMockVerification({
  onVerified,
}: VerificationHandlers): Promise<void> {
  await new Promise((r) => setTimeout(r, 500));
  onVerified(PERSONA_MOCK_INQUIRY_ID);
}
