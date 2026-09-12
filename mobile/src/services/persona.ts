// Persona integration — install `react-native-persona` + Expo config plugin
// for the real SDK. Mock path used by Onboarding until then.
// Docs: https://docs.withpersona.com/react-native-sdk-v2-integration-guide

export type VerificationHandlers = {
  onVerified: (inquiryId: string) => void;
  onCanceled: () => void;
  onError: (message: string) => void;
};

/** Mock verify for UI sprint. Replace body with Inquiry.fromTemplate when SDK is installed. */
export async function startVerification({
  onVerified,
}: VerificationHandlers): Promise<void> {
  await new Promise((r) => setTimeout(r, 500));
  onVerified("inq_mock_sandbox");
}

/*
Real wiring (after `npm i react-native-persona` + prebuild):

import { Inquiry, Environment } from "react-native-persona";

Inquiry.fromTemplate(process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID!)
  .environment(Environment.SANDBOX)
  .onComplete((inquiryId: string, status: string) => { ... })
  .onCanceled(() => onCanceled())
  .onError((error: { message?: string }) => onError(error.message ?? "Verification failed"))
  .build()
  .start();
*/
