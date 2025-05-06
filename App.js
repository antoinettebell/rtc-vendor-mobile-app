import React from "react";
import {
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColor, Secondary400 } from "./src/utils/theme";

import SigninScreen from "./src/screens/signinScreen";
import SignupScreen from "./src/screens/signupScreen";
import OtpVerificationScreen from "./src/screens/otpVerificationScreen";
import AuthIntroScreen from "./src/screens/authIntroScreen";
import ResetPasswordScreen from "./src/screens/resetPasswordScreen";
import SplashScreen from "./src/screens/splashScreen";
import AuthFoodTruckProfileScreen from "./src/screens/authFoodTruckProfileScreen";
import AuthSelectCuisineScreen from "./src/screens/authSelectCuisineScreen";
import AuthServingLocationScreen from "./src/screens/authServingLocationScreen";
import AuthMapScreen from "./src/screens/authMapScreen";
import AuthAvailabilityScreen from "./src/screens/authSetAvilabilityScreen";
import AuthUnderReviewNoteScreen from "./src/screens/authUnderReviewNoteScreen";
import ForgetPasswordScreen from "./src/screens/forgetPasswordScreen";
import HomeScreen from "./src/screens/homeScreen";
import OrderScreen from "./src/screens/orderScreen";
import MenuScreen from "./src/screens/menuScreen";
import EarningsScreen from "./src/screens/earningsScreen";
import ProfileMenuScreen from "./src/screens/profileMenuScreen";

const Stack = createNativeStackNavigator();
const BottomTab = createBottomTabNavigator();

const homeActive = require("./src/assets/images/homeMenuActive.png");
const homeInactive = require("./src/assets/images/homeMenuInactive.png");
const orderActive = require("./src/assets/images/orderMenuActive.png");
const orderInactive = require("./src/assets/images/orderMenuInactive.png");
const menuActive = require("./src/assets/images/menuMenuActive.png");
const menuInactive = require("./src/assets/images/menuMenuInactive.png");
const earningsActive = require("./src/assets/images/earningsMenuActive.png");
const earningsInactive = require("./src/assets/images/earningsMenuInactive.png");
const profileActive = require("./src/assets/images/profileMenuActive.png");
const profileInactive = require("./src/assets/images/profileMenuInactive.png");

const AuthNavigator = () => (
  <Stack.Navigator
    screenOptions={{ headerShown: false }}
    initialRouteName="splash"
  >
    <Stack.Screen name="splash" component={SplashScreen} />
    <Stack.Screen name="authIntro" component={AuthIntroScreen} />
    <Stack.Screen name="signin" component={SigninScreen} />
    <Stack.Screen name="signup" component={SignupScreen} />
    <Stack.Screen name="otpVerification" component={OtpVerificationScreen} />
    <Stack.Screen name="resetPassword" component={ResetPasswordScreen} />
    <Stack.Screen name="forgetPassword" component={ForgetPasswordScreen} />
  </Stack.Navigator>
);

const FinalSignupStepsNavigator = () => (
  <Stack.Navigator
    screenOptions={{ headerShown: false }}
    initialRouteName="splash"
  >
    <Stack.Screen name="splash" component={SplashScreen} />
    <Stack.Screen
      name="authFoodTruckProfileScreen"
      component={AuthFoodTruckProfileScreen}
    />
    <Stack.Screen
      name="authSelectCuisineScreen"
      component={AuthSelectCuisineScreen}
    />
    <Stack.Screen
      name="authServingLocationScreen"
      component={AuthServingLocationScreen}
    />
    <Stack.Screen name="authMapScreen" component={AuthMapScreen} />
    <Stack.Screen
      name="authAvailabilityScreen"
      component={AuthAvailabilityScreen}
    />
    <Stack.Screen
      name="authUnderReviewNoteScreen"
      component={AuthUnderReviewNoteScreen}
    />
  </Stack.Navigator>
);

const BottomTabNavigator = ({ insets }) => (
  <BottomTab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        height: Platform.OS === "ios" ? insets.bottom + 60 : 60,
      },
      tabBarLabelStyle: {
        // fontFamily: Secondary400,
        fontSize: 12,
        fontWeight: "500",
        bottom: 5,
      },
      tabBarActiveTintColor: AppColor.primary,
      tabBarInactiveTintColor: AppColor.gray,
    }}
  >
    <BottomTab.Screen
      name="homeScreen"
      component={HomeScreen}
      options={{
        tabBarLabel: "Home",
        tabBarIcon: ({ focused, color, size }) => (
          <Image
            source={focused ? homeActive : homeInactive}
            style={{ height: 24, width: 24 }}
          />
        ),
      }}
    />
    <BottomTab.Screen
      name="orderScreen"
      component={OrderScreen}
      options={{
        tabBarLabel: "Order",
        tabBarIcon: ({ focused, color, size }) => (
          <Image
            source={focused ? orderActive : orderInactive}
            style={{ height: 24, width: 24 }}
          />
        ),
      }}
    />
    <BottomTab.Screen
      name="menuScreen"
      component={MenuScreen}
      options={{
        tabBarLabel: "Menu",
        tabBarIcon: ({ focused, color, size }) => (
          <Image
            source={focused ? menuActive : menuInactive}
            style={{ height: 24, width: 24 }}
          />
        ),
      }}
    />
    <BottomTab.Screen
      name="earningsScreem"
      component={EarningsScreen}
      options={{
        tabBarLabel: "Earnings",
        tabBarIcon: ({ focused, color, size }) => (
          <Image
            source={focused ? earningsActive : earningsInactive}
            style={{ height: 24, width: 24 }}
          />
        ),
      }}
    />
    <BottomTab.Screen
      name="profileMenuScreen"
      component={ProfileMenuScreen}
      options={{
        tabBarLabel: "Profile",
        tabBarIcon: ({ focused, color, size }) => (
          <Image
            source={focused ? profileActive : profileInactive}
            style={{ height: 24, width: 24 }}
          />
        ),
      }}
    />
  </BottomTab.Navigator>
);

const MainAppNavigator = ({ insets }) => (
  <Stack.Navigator
    screenOptions={{ headerShown: false }}
    initialRouteName="splash"
  >
    <Stack.Screen name="splash" component={SplashScreen} />
    <Stack.Screen
      name="bottomRoot"
      component={() => <BottomTabNavigator insets={insets} />}
    />
  </Stack.Navigator>
);

const App = () => {
  const insets = useSafeAreaInsets();
  const { isSignedIn, isOnboarded } = useSelector((state) => state.authReducer);
  return (
    <NavigationContainer>
      {isSignedIn ? (
        <MainAppNavigator insets={insets} />
      ) : isOnboarded ? (
        <FinalSignupStepsNavigator />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

export default App;

const styles = StyleSheet.create({
  container: { flex: 1 },
});
