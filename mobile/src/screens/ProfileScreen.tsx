import { Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ObButton } from "../components/ObButton";
import { colors, fonts, spacing, type } from "../theme";
import { useAppState } from "../state/AppState";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CompositeScreenProps } from "@react-navigation/native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { MainTabParamList, RootStackParamList } from "../navigation/types";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Profile">,
  NativeStackScreenProps<RootStackParamList>
>;

export function ProfileScreen({ navigation }: Props) {
  const { verified, setVerified } = useAppState();

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.body}>
        {verified
          ? "You’re verified with Persona."
          : "Verification required before practice dates."}
      </Text>
      <ObButton
        label={verified ? "Redo Persona check" : "Verify with Persona"}
        variant="outline"
        onPress={() => {
          setVerified(false);
          navigation.getParent()?.navigate("SignUp");
        }}
        style={styles.btn}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.void,
    paddingHorizontal: spacing.lg,
  },
  title: {
    marginTop: spacing.lg,
    fontFamily: fonts.display,
    fontSize: type.title1,
    color: colors.bone,
  },
  body: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    fontFamily: fonts.body,
    fontSize: type.subhead,
    color: colors.muted,
  },
  btn: { alignSelf: "stretch" },
});
