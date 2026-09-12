// Default / web / tests: compile-safe Persona entry.
// Native Metro resolves persona.native.ts (Inquiry.fromTemplate).
// Docs: https://docs.withpersona.com/react-native-sdk-v2-integration-guide
//
// Real 18+ inquiry needs react-native-persona + plugins/withPersona.js
// + a prebuild / EAS **dev client**. Expo Go cannot load the native module.

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

import {
  PERSONA_DEV_CLIENT_HINT,
  isPersonaConfigured,
  startMockVerification,
  type VerificationHandlers,
} from "./personaConfig";

/**
 * Start 18+ verification.
 * - Template id missing → honest mock (Onboarding labels this).
 * - Template id set on web / Expo Go / CI → do **not** mock; error with the
 *   dev-client hint. Native builds use persona.native.ts.
 */
export async function startVerification(
  handlers: VerificationHandlers
): Promise<void> {
  if (!isPersonaConfigured()) {
    await startMockVerification(handlers);
    return;
  }
  handlers.onError(PERSONA_DEV_CLIENT_HINT);
}
