import type { ReactNode } from "react";

/** Web / tests: no ConversationProvider. Native file wraps the SDK. */
export function VoiceGateway({ children }: { children: ReactNode }) {
  return children;
}
