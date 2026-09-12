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
  shouldUsePersonaMock,
  startMockVerification,
} from "./personaConfig";
import { startVerification } from "./persona";

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

async function run(): Promise<void> {
  const prev = process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID;
  const prevMock = process.env.EXPO_PUBLIC_PERSONA_USE_MOCK;
  delete process.env.EXPO_PUBLIC_PERSONA_USE_MOCK;

  process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID = "";
  assert(isPersonaConfigured() === false, "empty template is not configured");
  assert(personaTemplateId() === "", "empty template trims to empty");
  assert(shouldUsePersonaMock() === true, "mock when unconfigured");
  assert(mockFallbackLabel() != null, "mock label when unconfigured");

  process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID =
    "  persona_sandbox_test-fixture-not-a-real-key  ";
  assert(isPersonaConfigured() === true, "template id is configured");
  assert(
    personaTemplateId() ===
      "persona_sandbox_test-fixture-not-a-real-key",
    "template id trims"
  );
  assert(personaEnvironmentName() === "sandbox", "sandbox from template id");
  assert(
    isPersonaTemplateToken() === false,
    "persona_sandbox_ uuid is not an itmpl_ token"
  );
  assert(isPersonaTemplateToken("itmpl_abc") === true, "itmpl_ token");
  assert(shouldUsePersonaMock() === true, "non-itmpl_ uses mock");
  assert(mockFallbackLabel() != null, "mock label for non-itmpl_ placeholder");

  process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID = "itmpl_AMQoTy2ziE377HwuVVf1h8Q78ms4VJ";
  assert(
    personaEnvironmentName() === "sandbox",
    "opaque real itmpl_ ids default to sandbox — they never encode env in the id"
  );
  assert(shouldUsePersonaMock() === false, "valid itmpl_ is live path");
  assert(mockFallbackLabel() === null, "no mock label for live itmpl_");

  process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID = "itmpl_live_production";
  assert(
    personaEnvironmentName() === "production",
    "id containing production word is detected without an override"
  );

  process.env.EXPO_PUBLIC_PERSONA_ENVIRONMENT = "production";
  assert(
    personaEnvironmentName("itmpl_AMQoTy2ziE377HwuVVf1h8Q78ms4VJ") === "production",
    "explicit env override wins over the opaque-id default"
  );
  delete process.env.EXPO_PUBLIC_PERSONA_ENVIRONMENT;

  process.env.EXPO_PUBLIC_PERSONA_USE_MOCK = "1";
  assert(shouldUsePersonaMock() === true, "force mock overrides itmpl_");
  delete process.env.EXPO_PUBLIC_PERSONA_USE_MOCK;

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
  assert(unlocked === PERSONA_MOCK_INQUIRY_ID, "startVerification mocks when id missing");

  process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID =
    "persona_sandbox_test-fixture-not-a-real-key";
  unlocked = "";
  await startVerification({
    onVerified: (id) => {
      unlocked = id;
    },
    onCanceled: () => {
      throw new Error("non-itmpl_ should mock");
    },
    onError: () => {
      throw new Error("non-itmpl_ should mock, not error");
    },
  });
  assert(unlocked === PERSONA_MOCK_INQUIRY_ID, "non-itmpl_ placeholder uses mock");

  process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID = "itmpl_for_dev_client";
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
  assert(verifiedFromCi === false, "CI/web never fake-verifies for live itmpl_");
  assert(err === PERSONA_DEV_CLIENT_HINT, "live itmpl_ on non-native asks for a dev client");

  if (prev === undefined) delete process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID;
  else process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID = prev;
  if (prevMock === undefined) delete process.env.EXPO_PUBLIC_PERSONA_USE_MOCK;
  else process.env.EXPO_PUBLIC_PERSONA_USE_MOCK = prevMock;

  console.log("persona tests passed");
}

run();
