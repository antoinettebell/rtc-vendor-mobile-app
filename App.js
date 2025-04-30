import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
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

const Stack = createNativeStackNavigator();

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
  </Stack.Navigator>
);

const App = () => {
  return (
    <NavigationContainer>
      <AuthNavigator />
    </NavigationContainer>
  );
};

export default App;

const styles = StyleSheet.create({
  container: { flex: 1 },
});
