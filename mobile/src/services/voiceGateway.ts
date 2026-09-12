import type { ReactNode } from "react";

/**
 * Fallback for TypeScript / Node tests.
 * Metro on iOS/Android resolves `voiceGateway.native.tsx` (ConversationProvider).
 * Metro on web resolves `voiceGateway.web.ts`.
 */
export function VoiceGateway({ children }: { children: ReactNode }) {
  return children;
}
