// Persona Inquiry — Expo / React Native (native Inquiry SDK).
// Docs: https://docs.withpersona.com/react-native-sdk-v2-integration-guide
// Requires a development build (npx expo prebuild / EAS). Not Expo Go.
//
// IMPORTANT: do not import react-native-persona at module top-level.
// That native module touch before Expo runtime is ready crashes the app.

import {
  PERSONA_DEV_CLIENT_HINT,
  isVerifiedStatus,
  personaEnvironmentName,
  personaTemplateId,
  shouldUsePersonaMock,
  startMockVerification,
  type VerificationHandlers,
} from "./personaConfig";

export {
  PERSONA_DEV_CLIENT_HINT,
  PERSONA_MOCK_INQUIRY_ID,
  PERSONA_MOCK_LABEL,
  PERSONA_TEMPLATE_ID_ENV,
  VERIFIED_STORAGE_KEY,
  isPersonaConfigured,
  isPersonaMockForced,
  isPersonaTemplateToken,
  isVerifiedStatus,
  mockFallbackLabel,
  personaEnvironmentName,
  personaTemplateId,
  shouldUsePersonaMock,
} from "./personaConfig";

export type { VerificationHandlers, VerifiedRecord } from "./personaConfig";

/**
 * Start 18+ verification via Inquiry.fromTemplate.
 * Uses labeled demo mock when USE_MOCK=1, template missing, or not an itmpl_ id.
 */
export async function startVerification(
  handlers: VerificationHandlers
): Promise<void> {
  if (shouldUsePersonaMock()) {
    await startMockVerification(handlers);
    return;
  }

  const templateId = personaTemplateId();

  try {
    // Lazy load so boot / Onboarding mock path never touches native Persona.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Environment, Inquiry } = require("react-native-persona") as {
      Environment: { SANDBOX: unknown; PRODUCTION: unknown };
      Inquiry: {
        fromTemplate: (id: string) => {
          environment: (env: unknown) => {
            onComplete: (
              cb: (inquiryId: string, status: string) => void
            ) => {
              onCanceled: (cb: () => void) => {
                onError: (cb: (error: Error) => void) => {
                  build: () => { start: () => void };
                };
              };
            };
          };
        };
      };
    };

    const env =
      personaEnvironmentName() === "sandbox"
        ? Environment.SANDBOX
        : Environment.PRODUCTION;

    Inquiry.fromTemplate(templateId)
      .environment(env)
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
    handlers.onError(
      message.includes("native") ||
        message.includes("null") ||
        message.includes("doesn't exist")
        ? PERSONA_DEV_CLIENT_HINT
        : message || PERSONA_DEV_CLIENT_HINT
    );
  }
}
