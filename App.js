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

const Stack = createNativeStackNavigator();

const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="splash" component={SplashScreen} />
    <Stack.Screen name="authIntro" component={AuthIntroScreen} />
    <Stack.Screen name="signin" component={SigninScreen} />
    <Stack.Screen name="signup" component={SignupScreen} />
    <Stack.Screen name="otpVerification" component={OtpVerificationScreen} />
    <Stack.Screen name="resetPassword" component={ResetPasswordScreen} />
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
