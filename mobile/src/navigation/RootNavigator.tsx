import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { MainTabParamList, RootStackParamList } from "./types";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { LiveDateScreen } from "../screens/LiveDateScreen";
import { ResultsScreen } from "../screens/ResultsScreen";
import { colors, fonts, type } from "../theme";
import { useAppState } from "../state/AppState";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.void,
          borderTopColor: colors.line,
          height: 84,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.bone,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontFamily: fonts.body,
          fontSize: type.caption1,
        },
        tabBarIcon: ({ color, size }) => {
          const name =
            route.name === "Practice"
              ? "home"
              : route.name === "History"
                ? "time-outline"
                : "person-outline";
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Practice" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { verified } = useAppState();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.void },
        animation: "fade",
      }}
      initialRouteName={verified ? "Main" : "Onboarding"}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="LiveDate"
        component={LiveDateScreen}
        options={{ animation: "slide_from_bottom", gestureEnabled: false }}
      />
      <Stack.Screen
        name="Results"
        component={ResultsScreen}
        options={{ animation: "fade" }}
      />
    </Stack.Navigator>
  );
}
