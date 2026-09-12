import type { ReactNode } from "react";
import { ConversationProvider } from "@elevenlabs/react-native";

/** Required by @elevenlabs/react-native. startSession still gates on agent id. */
export function VoiceGateway({ children }: { children: ReactNode }) {
  return <ConversationProvider>{children}</ConversationProvider>;
}
