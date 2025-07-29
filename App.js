import React, { useEffect, useState } from "react";
import {
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useDispatch, useSelector } from "react-redux";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColor, Secondary400 } from "./src/utils/theme";
import GlobalSnackbar from "./src/components/GlobalSnackbar";
import {
  createAndroidChannel,
  requestNotificationPermission,
} from "./src/helpers/notification.helper";
import { clearCurrentNotificationOrder } from "./src/redux/slices/pushNotificationSlice";
import { navigationRef } from "./src/helpers/navigation.helper";
import NewOrderPopup from "./src/components/NewOrderPopup";

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
import AuthAvailabilityScreen from "./src/screens/authSetAvailabilityScreen";
import AuthUnderReviewNoteScreen from "./src/screens/authUnderReviewNoteScreen";
import ForgetPasswordScreen from "./src/screens/forgetPasswordScreen";
import HomeScreen from "./src/screens/homeScreen";
import OrderScreen from "./src/screens/orderScreen";
import MenuScreen from "./src/screens/menuScreen";
import EarningsScreen from "./src/screens/earningsScreen";
import ProfileMenuScreen from "./src/screens/profileMenuScreen";
import EditProfileScreen from "./src/screens/editProfileScreen";
import ProfileSelectCuisineScreen from "./src/screens/profileSelectCuisineScreen";
import ProfileServingLocationScreen from "./src/screens/profileServingLocationScreen";
import ProfileMapScreen from "./src/screens/profileMapScreen";
import ProfileAvailabilityScreen from "./src/screens/profileSetAvailabilityScreen";
import MenuDishListScreen from "./src/screens/menuDishListScreen";
import MenuAddDishItemScreen from "./src/screens/menuAddDishItemScreen";
import MenuEditDishItemScreen from "./src/screens/menuEditDishItemScreen";
import TermsOfServiceScreen from "./src/screens/termsOfServiceScreen";
import PrivacyPolicyScreen from "./src/screens/privacyPolicyScreen";
import AgreementScreen from "./src/screens/agreementScreen";
import AuthFoodTruckPlansScreen from "./src/screens/authFoodTruckPlansScreen";
import AppTermsOfServiceScreen from "./src/screens/appTermsOfServiceScreen";
import UserProfileScreen from "./src/screens/userProfileScreen";
import OrderDetailsScreen from "./src/screens/orderDetailsScreen";
import PreviousOrderScreen from "./src/screens/previousOrderScreen";
import RateReviewScreen from "./src/screens/rateReviewScreen";
import ProfileSubscriptionScreen from "./src/screens/profileSubscriptionScreen";
import AuthFoodTruckBankDetailScreen from "./src/screens/authFoodTruckBankDetailScreen";
import EditBankDetailScreen from "./src/screens/editBankDetailScreen";
import OneTapSignInScreen from "./src/screens/oneTapSigninScreen";

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
    <Stack.Screen name="oneTapSignin" component={OneTapSignInScreen} />
    <Stack.Screen name="otpVerification" component={OtpVerificationScreen} />
    <Stack.Screen name="resetPassword" component={ResetPasswordScreen} />
    <Stack.Screen name="forgetPassword" component={ForgetPasswordScreen} />
    <Stack.Screen name="termsOfService" component={TermsOfServiceScreen} />
    <Stack.Screen name="privacyPolicy" component={PrivacyPolicyScreen} />
  </Stack.Navigator>
);

const FinalSignupStepsNavigator = () => (
  <Stack.Navigator
    screenOptions={{ headerShown: false }}
    initialRouteName="splash"
  >
    <Stack.Screen name="splash" component={SplashScreen} />
    <Stack.Screen
      name="authFoodTruckPlansScreen"
      component={AuthFoodTruckPlansScreen}
    />
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
      name="authFoodTruckBankDetailScreen"
      component={AuthFoodTruckBankDetailScreen}
    />
    <Stack.Screen
      name="authUnderReviewNoteScreen"
      component={AuthUnderReviewNoteScreen}
    />
    <Stack.Screen name="agreementScreen" component={AgreementScreen} />
  </Stack.Navigator>
);

const BottomTabNavigator = ({ insets }) => (
  <BottomTab.Navigator
    screenOptions={{
      tabBarHideOnKeyboard: true,
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
      name="earningsScreen"
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
    <Stack.Screen name="bottomRoot">
      {() => <BottomTabNavigator insets={insets} />}
    </Stack.Screen>
    <Stack.Screen name="editProfileScreen" component={EditProfileScreen} />
    <Stack.Screen
      name="profileServingLocationScreen"
      component={ProfileServingLocationScreen}
    />
    <Stack.Screen name="profileMapScreen" component={ProfileMapScreen} />
    <Stack.Screen
      name="profileSelectCuisineScreen"
      component={ProfileSelectCuisineScreen}
    />
    <Stack.Screen
      name="profileAvailabilityScreen"
      component={ProfileAvailabilityScreen}
    />
    <Stack.Screen name="menuDishListScreen" component={MenuDishListScreen} />
    <Stack.Screen
      name="menuAddDishItemScreen"
      component={MenuAddDishItemScreen}
    />
    <Stack.Screen
      name="menuEditDishItemScreen"
      component={MenuEditDishItemScreen}
    />
    <Stack.Screen
      name="appTermsOfServiceScreen"
      component={AppTermsOfServiceScreen}
    />
    <Stack.Screen name="userProfileScreen" component={UserProfileScreen} />
    <Stack.Screen
      name="editBankDetailScreen"
      component={EditBankDetailScreen}
    />
    <Stack.Screen name="orderDetailsScreen" component={OrderDetailsScreen} />
    <Stack.Screen name="previousOrderScreen" component={PreviousOrderScreen} />
    <Stack.Screen name="rateReviewScreen" component={RateReviewScreen} />
    <Stack.Screen
      name="profileSubscriptionScreen"
      component={ProfileSubscriptionScreen}
    />
    <Stack.Screen
      name="deleteOtpVerification"
      component={OtpVerificationScreen}
    />
  </Stack.Navigator>
);

const configureNotification = async () => {
  await requestNotificationPermission();
  if (Platform.OS === "android") {
    await createAndroidChannel();
  }
};

const App = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { isSignedIn, isOnboarded } = useSelector((state) => state.authReducer);
  const { showPopup, currentOrderId } = useSelector(
    (state) => state.pushNotificationReducer
  );

  const handleCloseForCurrentOrder = () => {
    dispatch(clearCurrentNotificationOrder());
  };

  useEffect(() => {
    configureNotification();
  }, []);

  return (
    <NavigationContainer theme={DefaultTheme} ref={navigationRef}>
      <GlobalSnackbar />
      {isSignedIn ? (
        <MainAppNavigator insets={insets} />
      ) : isOnboarded ? (
        <FinalSignupStepsNavigator />
      ) : (
        <AuthNavigator />
      )}
      {showPopup && currentOrderId ? (
        <NewOrderPopup
          orderId={currentOrderId}
          onCloseCurrentOrder={handleCloseForCurrentOrder}
        />
      ) : null}
    </NavigationContainer>
  );
};

export default App;

const styles = StyleSheet.create({
  container: { flex: 1 },
});
