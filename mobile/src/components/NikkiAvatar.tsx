import { Image, StyleSheet, View } from "react-native";

/** Nikki's practice-date portrait — shown on Live Date. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const NIKKI_PORTRAIT = require("../../assets/nikki.png");

type Props = {
  size?: number;
  speaking?: boolean;
};

export function NikkiAvatar({ size = 160, speaking = false }: Props) {
  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: speaking ? "#d74745" : "#2e2726",
        },
      ]}
    >
      <Image
        source={NIKKI_PORTRAIT}
        style={{
          width: size - 6,
          height: size - 6,
          borderRadius: (size - 6) / 2,
        }}
        resizeMode="cover"
        accessibilityLabel="Nikki"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#12080c",
  },
});
