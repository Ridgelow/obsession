import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, fonts, spacing, type } from "../theme";

type Props = {
  children: ReactNode;
  onReset?: () => void;
};

type State = { error: Error | null };

/** Catch render/runtime failures on Live Date so Begin doesn't hard-crash the app. */
export class LiveDateErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[LiveDate] crashed:", error.message, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Date hiccup</Text>
        <Text style={styles.body}>
          Something broke starting the session. You can retry without leaving
          the app.
        </Text>
        <Text style={styles.detail} numberOfLines={4}>
          {this.state.error.message}
        </Text>
        <Pressable
          onPress={() => {
            this.setState({ error: null });
            this.props.onReset?.();
          }}
          style={styles.btn}
        >
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.void,
    padding: spacing.lg,
    justifyContent: "center",
    gap: spacing.md,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: type.title1,
    color: colors.bone,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: type.subhead,
    color: colors.muted,
    lineHeight: 22,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: type.caption1,
    color: colors.pulse,
    lineHeight: 16,
  },
  btn: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    backgroundColor: colors.pulse,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  btnText: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.subhead,
    color: colors.bone,
  },
});
