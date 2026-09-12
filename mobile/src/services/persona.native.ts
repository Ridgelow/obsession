// Persona Inquiry — Expo / React Native (native Inquiry SDK).
// Docs: https://docs.withpersona.com/react-native-sdk-v2-integration-guide
// Requires a development build (npx expo prebuild / EAS). Not Expo Go.

import { Environment, Inquiry } from "react-native-persona";
import {
  PERSONA_DEV_CLIENT_HINT,
  isPersonaConfigured,
  isPersonaTemplateToken,
  isVerifiedStatus,
  personaEnvironmentName,
  personaTemplateId,
  startMockVerification,
  type VerificationHandlers,
} from "./personaConfig";

export {
  PERSONA_DEV_CLIENT_HINT,
  PERSONA_MOCK_INQUIRY_ID,
  PERSONA_MOCK_LABEL,
  PERSONA_SANDBOX_18_TEMPLATE_ID,
  PERSONA_TEMPLATE_ID_ENV,
  VERIFIED_STORAGE_KEY,
  isPersonaConfigured,
  isPersonaTemplateToken,
  isVerifiedStatus,
  mockFallbackLabel,
  personaEnvironmentName,
  personaTemplateId,
} from "./personaConfig";

export type { VerificationHandlers, VerifiedRecord } from "./personaConfig";

function personaEnvironment(): Environment {
  return personaEnvironmentName() === "sandbox"
    ? Environment.SANDBOX
    : Environment.PRODUCTION;
}

/**
 * Start 18+ verification via Inquiry.fromTemplate.
 * Mock path is labeled in the UI and used **only** when the template id is missing.
 */
export async function startVerification(
  handlers: VerificationHandlers
): Promise<void> {
  if (!isPersonaConfigured()) {
    await startMockVerification(handlers);
    return;
  }

  const templateId = personaTemplateId();

  try {
    Inquiry.fromTemplate(templateId)
      .environment(personaEnvironment())
      .onComplete((inquiryId: string, status: string) => {
        if (isVerifiedStatus(status)) {
          handlers.onVerified(inquiryId);
          return;
        }
        handlers.onError(
          `Verification ${status || "unsuccessful"}. You’re not cleared for 18+ yet.`
        );
      })
      .onCanceled(() => handlers.onCanceled())
      .onError((error: Error) =>
        handlers.onError(error?.message ?? "Verification failed")
      )
      .build()
      .start();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!isPersonaTemplateToken(templateId)) {
      handlers.onError(
        `${message} Paste the dashboard itmpl_ token into EXPO_PUBLIC_PERSONA_TEMPLATE_ID (18+ template).`
      );
      return;
    }
    handlers.onError(
      message.includes("native") || message.includes("null")
        ? PERSONA_DEV_CLIENT_HINT
        : message || PERSONA_DEV_CLIENT_HINT
    );
  }
}
