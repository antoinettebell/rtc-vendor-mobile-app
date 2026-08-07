import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Platform,
  Image,
} from "react-native";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useDispatch, useSelector } from "react-redux";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import BootSplash from "react-native-bootsplash";
import { check, request, RESULTS } from "react-native-permissions";
import { AppColor, vendorTheme } from "./src/utils/theme";
import GlobalSnackbar from "./src/components/GlobalSnackbar";
import {
  createAndroidChannel,
  requestNotificationPermission,
} from "./src/helpers/notification.helper";
import { clearCurrentNotificationOrder } from "./src/redux/slices/pushNotificationSlice";
import { navigationRef } from "./src/helpers/navigation.helper";
import { permission } from "./src/helpers/permission.helper";
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
import EmployeesScreen from "./src/screens/employeesScreen";
import ProfileMenuScreen from "./src/screens/profileMenuScreen";
import EditProfileScreen from "./src/screens/editProfileScreen";
import ProfileSelectCuisineScreen from "./src/screens/profileSelectCuisineScreen";
import ProfileServingLocationScreen from "./src/screens/profileServingLocationScreen";
import ProfileMapScreen from "./src/screens/profileMapScreen";
import ProfileAvailabilityScreen from "./src/screens/profileSetAvailabilityScreen";
import MenuDishListScreen from "./src/screens/menuDishListScreen";
import MenuAddDishItemScreen from "./src/screens/menuAddDishItemScreen";
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
import AuthSetBusinessHrsScreen from "./src/screens/authSetBusinessHrsScreen";
import ProfileSetBusinessHrsScreen from "./src/screens/profileSetBusinessHrsScreen";
import EditMailingAddressScreen from "./src/screens/editMailingAddressScreen";
import EarningListScreen from "./src/screens/earningListScreen";
import EarningsSummaryDetailScreen from "./src/screens/earningsSummaryDetailScreen";
import VendorPosMenuScreen from "./src/screens/vendorPosMenuScreen";
import VendorPosCheckoutScreen from "./src/screens/vendorPosCheckoutScreen";
import ProfileEmployeeManagementScreen from "./src/screens/profileEmployeeManagementScreen";
import EmployeeSessionScreen from "./src/screens/employeeSessionScreen";
import EmployeeOrderManagementScreen from "./src/screens/employeeOrderManagementScreen";
import EmployeeRefundRequestsScreen from "./src/screens/employeeRefundRequestsScreen";
import EmployeePosBoardScreen from "./src/screens/employeePosBoardScreen";
import EmployeeShiftScreen from "./src/screens/employeeShiftScreen";
import VendorMarketplaceScreen from "./src/screens/vendorMarketplaceScreen";
import VendorMarketplaceNearMeScreen from "./src/screens/vendorMarketplaceNearMeScreen";
import VendorMarketplaceEventDetailsScreen from "./src/screens/vendorMarketplaceEventDetailsScreen";
import VendorMarketplaceMessagesScreen from "./src/screens/vendorMarketplaceMessagesScreen";
import VendorMarketplaceBidResponseScreen from "./src/screens/vendorMarketplaceBidResponseScreen";
import VendorMarketplaceBidDetailScreen from "./src/screens/vendorMarketplaceBidDetailScreen";
import VendorMarketplaceMyBidsScreen from "./src/screens/vendorMarketplaceMyBidsScreen";
import VendorMarketplaceAwardedBidsScreen from "./src/screens/vendorMarketplaceAwardedBidsScreen";
import VendorMarketplaceAwardedEventDetailsScreen from "./src/screens/vendorMarketplaceAwardedEventDetailsScreen";
import VendorMarketplacePaymentScreen from "./src/screens/vendorMarketplacePaymentScreen";
import VendorMarketplaceMyApplicationsScreen from "./src/screens/vendorMarketplaceMyApplicationsScreen";
import VendorMarketplaceApplicationScreen from "./src/screens/vendorMarketplaceApplicationScreen";
import VendorMarketplaceApplicationDetailScreen from "./src/screens/vendorMarketplaceApplicationDetailScreen";
import VendorFeeCheckoutScreen from "./src/screens/vendorFeeCheckoutScreen";
import VendorComplianceScreen from "./src/screens/vendorComplianceScreen";
import AuthMenuSetupPromptScreen from "./src/screens/authMenuSetupPromptScreen";
import EventVendorProfileScreen from "./src/screens/eventVendorProfileScreen";
import EventVendorPhotosScreen from "./src/screens/eventVendorPhotosScreen";
import EventVendorMarketplaceScreen from "./src/screens/eventVendorMarketplaceScreen";
import EventVendorApplicationScreen from "./src/screens/eventVendorApplicationScreen";
import MoreMenuScreen from "./src/screens/moreMenuScreen";
import OperationsScreen from "./src/screens/operationsScreen";
import OperationalFormScreen from "./src/screens/operationalFormScreen";

const Stack = createNativeStackNavigator();
const BottomTab = createBottomTabNavigator();

const homeActive = require("./src/assets/images/homeMenuActive.png");
const homeInactive = require("./src/assets/images/homeMenuInactive.png");
const orderActive = require("./src/assets/images/orderMenuActive.png");
const orderInactive = require("./src/assets/images/orderMenuInactive.png");
const menuActive = require("./src/assets/images/menuMenuActive.png");
const menuInactive = require("./src/assets/images/menuMenuInactive.png");
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
    <Stack.Screen
      name="authFoodTruckPlansScreen"
      component={AuthFoodTruckPlansScreen}
    />
    <Stack.Screen name="agreementScreen" component={AgreementScreen} />
    <Stack.Screen name="oneTapSignin" component={OneTapSignInScreen} />
    <Stack.Screen name="otpVerification" component={OtpVerificationScreen} />
    <Stack.Screen name="resetPassword" component={ResetPasswordScreen} />
    <Stack.Screen name="forgetPassword" component={ForgetPasswordScreen} />
    <Stack.Screen name="termsOfService" component={TermsOfServiceScreen} />
    <Stack.Screen name="privacyPolicy" component={PrivacyPolicyScreen} />
  </Stack.Navigator>
);

// register navigator
const FinalSignupStepsNavigator = () => (
  <Stack.Navigator
    screenOptions={{ headerShown: false }}
    initialRouteName="splash"
  >
    <Stack.Screen name="splash" component={SplashScreen} />
    <Stack.Screen name="eventVendorProfileScreen" component={EventVendorProfileScreen} />
    <Stack.Screen name="eventVendorPhotosScreen" component={EventVendorPhotosScreen} />
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
      name="authSetBusinessHrsScreen"
      component={AuthSetBusinessHrsScreen}
    />
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
    <Stack.Screen
      name="vendorComplianceScreen"
      component={VendorComplianceScreen}
    />
    <Stack.Screen
      name="authMenuSetupPromptScreen"
      component={AuthMenuSetupPromptScreen}
    />
    <Stack.Screen name="agreementScreen" component={AgreementScreen} />
  </Stack.Navigator>
);

// bottom tab navigator
const BottomTabNavigator = ({ insets }) => {
  const { user } = useSelector((state) => state.userReducer);
  const isEventVendor = user?.vendorSubtype === "EVENT_VENDOR";

  if (isEventVendor) {
    return (
      <BottomTab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { height: insets.bottom + 60 } }}>
        <BottomTab.Screen name="eventVendorMarketplaceScreen" component={EventVendorMarketplaceScreen} options={{ tabBarLabel: "Marketplace", tabBarIcon: ({ color, size }) => <MaterialIcons name="storefront" size={size || 24} color={color} /> }} />
        <BottomTab.Screen name="eventVendorProfileScreen" component={EventVendorProfileScreen} options={{ tabBarLabel: "Profile", tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size || 24} color={color} /> }} />
      </BottomTab.Navigator>
    );
  }

  return (
    <BottomTab.Navigator
      screenOptions={{
        tabBarHideOnKeyboard: true,
        headerShown: false,
        tabBarStyle: {
          height: insets.bottom + 60,
          backgroundColor: vendorTheme.navigation.background,
          borderTopColor: vendorTheme.background.secondary,
          // height: Platform.OS === "ios" ? insets.bottom + 60 : 60,
        },
        tabBarLabelStyle: {
          // fontFamily: Secondary400,
          fontSize: 12,
          fontWeight: "500",
          bottom: Dimensions.get("window").width > 768 ? 0 : 5,
        },
        tabBarActiveTintColor: vendorTheme.navigation.active,
        tabBarInactiveTintColor: vendorTheme.navigation.inactive,
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
            style={{ height: 24, width: 24, tintColor: color }}
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
            style={{ height: 24, width: 24, tintColor: color }}
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
            style={{ height: 24, width: 24, tintColor: color }}
          />
        ),
      }}
    />
    <BottomTab.Screen
      name="vendorMarketplaceScreen"
      component={VendorMarketplaceScreen}
      options={{
        tabBarLabel: "Marketplace",
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name="storefront" size={size || 24} color={color} />
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
            style={{ height: 24, width: 24, tintColor: color }}
          />
        ),
      }}
    />
    <BottomTab.Screen
      name="moreMenuScreen"
      component={MoreMenuScreen}
      options={{
        tabBarLabel: "More",
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name="menu" size={size || 25} color={color} />
        ),
      }}
    />
    </BottomTab.Navigator>
  );
};

// main app navigator
const MainAppNavigator = ({ insets }) => (
  <Stack.Navigator
    screenOptions={{ headerShown: false }}
    initialRouteName="splash"
  >
    <Stack.Screen name="splash" component={SplashScreen} />
    <Stack.Screen name="eventVendorPhotosScreen" component={EventVendorPhotosScreen} />
    <Stack.Screen name="eventVendorApplicationScreen" component={EventVendorApplicationScreen} />
    <Stack.Screen name="bottomRoot">
      {() => <BottomTabNavigator insets={insets} />}
    </Stack.Screen>
    <Stack.Screen name="editProfileScreen" component={EditProfileScreen} />
    <Stack.Screen
      name="editMailingAddressScreen"
      component={EditMailingAddressScreen}
    />
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
      name="profileSetBusinessHoursScreen"
      component={ProfileSetBusinessHrsScreen}
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
      name="vendorComplianceScreen"
      component={VendorComplianceScreen}
    />
    <Stack.Screen
      name="profileEmployeeManagementScreen"
      component={ProfileEmployeeManagementScreen}
    />
    <Stack.Screen name="employeesScreen" component={EmployeesScreen} />
    <Stack.Screen name="earningsScreen" component={EarningsScreen} />
    <Stack.Screen name="operationsScreen" component={OperationsScreen} />
    <Stack.Screen name="operationalFormScreen" component={OperationalFormScreen} />
    <Stack.Screen
      name="deleteOtpVerification"
      component={OtpVerificationScreen}
    />
    <Stack.Screen name="earningListScreen" component={EarningListScreen} />
    <Stack.Screen
      name="earningsSummaryDetailScreen"
      component={EarningsSummaryDetailScreen}
    />
    <Stack.Screen name="vendorPosMenuScreen" component={VendorPosMenuScreen} />
    <Stack.Screen
      name="vendorPosCheckoutScreen"
      component={VendorPosCheckoutScreen}
    />
    <Stack.Screen
      name="vendorMarketplaceScreen"
      component={VendorMarketplaceScreen}
    />
    <Stack.Screen
      name="VendorMarketplaceNearMeScreen"
      component={VendorMarketplaceNearMeScreen}
    />
    <Stack.Screen
      name="vendorMarketplaceNearMeScreen"
      component={VendorMarketplaceNearMeScreen}
    />
    <Stack.Screen
      name="vendorMarketplaceEventDetailsScreen"
      component={VendorMarketplaceEventDetailsScreen}
    />
    <Stack.Screen
      name="vendorMarketplaceMessagesScreen"
      component={VendorMarketplaceMessagesScreen}
    />
    <Stack.Screen
      name="vendorMarketplaceBidResponseScreen"
      component={VendorMarketplaceBidResponseScreen}
    />
    <Stack.Screen
      name="VendorBidResponseScreen"
      component={VendorMarketplaceBidResponseScreen}
    />
    <Stack.Screen
      name="VendorBidDetailScreen"
      component={VendorMarketplaceBidDetailScreen}
    />
    <Stack.Screen
      name="vendorMarketplaceMyBidsScreen"
      component={VendorMarketplaceMyBidsScreen}
    />
    <Stack.Screen
      name="VendorMyBidsScreen"
      component={VendorMarketplaceMyBidsScreen}
    />
    <Stack.Screen
      name="VendorMyApplicationsScreen"
      component={VendorMarketplaceMyApplicationsScreen}
    />
    <Stack.Screen
      name="VendorApplicationScreen"
      component={VendorMarketplaceApplicationScreen}
    />
    <Stack.Screen
      name="VendorApplicationDetailScreen"
      component={VendorMarketplaceApplicationDetailScreen}
    />
    <Stack.Screen
      name="VendorFeeCheckoutScreen"
      component={VendorFeeCheckoutScreen}
    />
    <Stack.Screen
      name="vendorMarketplaceAwardedBidsScreen"
      component={VendorMarketplaceAwardedBidsScreen}
    />
    <Stack.Screen
      name="VendorAwardedEventsScreen"
      component={VendorMarketplaceAwardedBidsScreen}
    />
    <Stack.Screen
      name="VendorAwardedEventDetailsScreen"
      component={VendorMarketplaceAwardedEventDetailsScreen}
    />
    <Stack.Screen
      name="vendorMarketplacePaymentScreen"
      component={VendorMarketplacePaymentScreen}
    />
  </Stack.Navigator>
);

const EmployeeAppNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen
      name="employeeSessionScreen"
      component={EmployeeSessionScreen}
    />
    <Stack.Screen
      name="employeePosBoardScreen"
      component={EmployeePosBoardScreen}
    />
    <Stack.Screen
      name="employeeOrderManagementScreen"
      component={EmployeeOrderManagementScreen}
    />
    <Stack.Screen
      name="employeeRefundRequestsScreen"
      component={EmployeeRefundRequestsScreen}
    />
    <Stack.Screen
      name="employeeShiftScreen"
      component={EmployeeShiftScreen}
    />
    <Stack.Screen name="operationsScreen" component={OperationsScreen} />
    <Stack.Screen name="operationalFormScreen" component={OperationalFormScreen} />
    <Stack.Screen name="userProfileScreen" component={UserProfileScreen} />
    <Stack.Screen name="vendorPosMenuScreen" component={VendorPosMenuScreen} />
    <Stack.Screen
      name="vendorPosCheckoutScreen"
      component={VendorPosCheckoutScreen}
    />
  </Stack.Navigator>
);

const configureNotification = async () => {
  await requestNotificationPermission();
  if (Platform.OS === "android") {
    await createAndroidChannel();
  }
};

const configureLocationPermission = async () => {
  const status = await check(permission.location);
  if (status === RESULTS.DENIED) {
    await request(permission.location);
  }
};

const App = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { isSignedIn, isOnboarded } = useSelector((state) => state.authReducer);
  const currentUser = useSelector((state) => state.userReducer.user);
  const isEmployeeSession =
    currentUser?.userType === "EMPLOYEE" || currentUser?.role === "EMPLOYEE";
  const { showPopup, currentOrderId } = useSelector(
    (state) => state.pushNotificationReducer,
  );

  const handleCloseForCurrentOrder = () => {
    dispatch(clearCurrentNotificationOrder());
  };

  useEffect(() => {
    configureNotification();
    configureLocationPermission().catch((error) =>
      console.log("Location permission setup error", error),
    );
    BootSplash.hide({ fade: true });
  }, []);

  return (
    <NavigationContainer theme={DefaultTheme} ref={navigationRef}>
      <GlobalSnackbar />
      {isSignedIn ? (
        isEmployeeSession ? (
          <EmployeeAppNavigator />
        ) : (
          <MainAppNavigator insets={insets} />
        )
      ) : isOnboarded ? (
        <FinalSignupStepsNavigator />
      ) : (
        <AuthNavigator />
      )}
      {!isEmployeeSession && showPopup && currentOrderId ? (
        <NewOrderPopup
          orderId={currentOrderId}
          onCloseCurrentOrder={handleCloseForCurrentOrder}
        />
      ) : null}
    </NavigationContainer>
  );
};

export default App;
