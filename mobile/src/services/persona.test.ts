import {
  PERSONA_DEV_CLIENT_HINT,
  PERSONA_MOCK_INQUIRY_ID,
  isPersonaConfigured,
  isPersonaTemplateToken,
  isVerifiedStatus,
  mockFallbackLabel,
  parseVerifiedRecord,
  personaEnvironmentName,
  personaTemplateId,
  serializeVerifiedRecord,
  startMockVerification,
} from "./personaConfig";
import { startVerification } from "./persona";

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

async function run(): Promise<void> {
  const prev = process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID;

  process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID = "";
  assert(isPersonaConfigured() === false, "empty template is not configured");
  assert(personaTemplateId() === "", "empty template trims to empty");
  assert(
    mockFallbackLabel()?.includes("EXPO_PUBLIC_PERSONA_TEMPLATE_ID"),
    "mock label only when unconfigured"
  );

  process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID =
    "  persona_sandbox_2ccdba5e-08cd-4e47-965f-a59133988bb0  ";
  assert(isPersonaConfigured() === true, "template id is configured");
  assert(
    personaTemplateId() ===
      "persona_sandbox_2ccdba5e-08cd-4e47-965f-a59133988bb0",
    "template id trims"
  );
  assert(personaEnvironmentName() === "sandbox", "sandbox from template id");
  assert(
    isPersonaTemplateToken() === false,
    "persona_sandbox_ uuid is not an itmpl_ token"
  );
  assert(isPersonaTemplateToken("itmpl_abc") === true, "itmpl_ token");
  assert(mockFallbackLabel() === null, "no mock label when configured");

  process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID = "itmpl_live_prod";
  assert(personaEnvironmentName() === "production", "prod when not sandbox");

  assert(isVerifiedStatus("completed") === true, "completed verifies");
  assert(isVerifiedStatus("APPROVED") === true, "approved verifies");
  assert(isVerifiedStatus("passed") === true, "passed verifies");
  assert(isVerifiedStatus("declined") === false, "declined does not verify");
  assert(isVerifiedStatus("failed") === false, "failed does not verify");
  assert(isVerifiedStatus("needs_review") === false, "needs_review waits");
  assert(isVerifiedStatus("") === false, "empty status does not verify");

  const stored = serializeVerifiedRecord({
    verified: true,
    inquiryId: "inq_abc",
  });
  assert(
    parseVerifiedRecord(stored).verified === true &&
      parseVerifiedRecord(stored).inquiryId === "inq_abc",
    "round-trip verified record"
  );
  assert(parseVerifiedRecord("true").verified === true, "legacy true string");
  assert(parseVerifiedRecord(null).verified === false, "null is unverified");
  assert(parseVerifiedRecord("{").verified === false, "bad json is unverified");

  let mockId = "";
  await startMockVerification({
    onVerified: (id) => {
      mockId = id;
    },
    onCanceled: () => {
      throw new Error("mock should not cancel");
    },
    onError: () => {
      throw new Error("mock should not error");
    },
  });
  assert(mockId === PERSONA_MOCK_INQUIRY_ID, "mock inquiry id");

  process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID = "";
  let unlocked = "";
  await startVerification({
    onVerified: (id) => {
      unlocked = id;
    },
    onCanceled: () => {
      throw new Error("unconfigured path should mock, not cancel");
    },
    onError: () => {
      throw new Error("unconfigured path should mock, not error");
    },
  });
  assert(unlocked === PERSONA_MOCK_INQUIRY_ID, "startVerification mocks only when id missing");

  process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID =
    "persona_sandbox_2ccdba5e-08cd-4e47-965f-a59133988bb0";
  let err = "";
  let verifiedFromCi = false;
  await startVerification({
    onVerified: () => {
      verifiedFromCi = true;
    },
    onCanceled: () => undefined,
    onError: (message) => {
      err = message;
    },
  });
  assert(verifiedFromCi === false, "CI/web never fake-verifies when template id is set");
  assert(err === PERSONA_DEV_CLIENT_HINT, "configured non-native path asks for a dev client");

  if (prev === undefined) delete process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID;
  else process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID = prev;

  console.log("persona tests passed");
}

run();
