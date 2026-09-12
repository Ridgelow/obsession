import type { ReactNode } from "react";

/**
 * Passthrough — LiveDate mounts its own ConversationProvider next to the
 * ElevenLabs hooks. Nesting two providers caused early session teardown.
 */
export function VoiceGateway({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
