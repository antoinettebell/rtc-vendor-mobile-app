import React, { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColor, Mulish400, Mulish700 } from "../utils/theme";
import { useNavigation } from "@react-navigation/native";
import BootSplash from "react-native-bootsplash";
import { useDispatch, useSelector } from "react-redux";
import {
  setPendingAuthRoute,
  setPendingEventVendorApplication,
  setPostSignInRoute,
} from "../redux/slices/authSlice";
import StatusBarManager from "../components/StatusBarManager";
import {
  consumePendingAuthRoute,
  getFinalSignupDestination,
} from "../helpers/signupNavigation.helper";

const SplashScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {
    isSignedIn,
    isOnboarded,
    isUnderReview,
    vendorOnboardingStep,
    postSignInRoute,
    pendingAuthRoute,
    pendingEventVendorApplication,
  } = useSelector(
    (state) => state.authReducer
  );
  const { selectedPlan, selectedSignupAddOns, user } = useSelector(
    (state) => state.userReducer
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isSignedIn) {
        if (pendingEventVendorApplication?.event?.event_id) {
          navigation.replace("eventVendorApplicationScreen", {
            event: pendingEventVendorApplication.event,
          });
          dispatch(setPendingEventVendorApplication(null));
        } else {
          navigation.replace(
            "bottomRoot",
            postSignInRoute ? { screen: postSignInRoute } : undefined
          );
        }
        if (postSignInRoute) {
          dispatch(setPostSignInRoute(null));
        }
      } else if (!isOnboarded) {
        const pendingTransition = consumePendingAuthRoute(pendingAuthRoute);
        navigation.replace(pendingTransition.destination);
        if (pendingAuthRoute) {
          dispatch(setPendingAuthRoute(pendingTransition.pendingAuthRoute));
        }
      } else if (isUnderReview) {
        navigation.replace("authUnderReviewNoteScreen");
      } else if (vendorOnboardingStep === "COMPLIANCE") {
        navigation.replace("vendorComplianceScreen", {
          onboardingFlow: true,
        });
      } else if (vendorOnboardingStep === "PROFILE") {
        navigation.replace("authFoodTruckProfileScreen", {
          addOns: selectedSignupAddOns,
          onboardingFlow: true,
        });
      } else if (vendorOnboardingStep === "PAYMENT") {
        navigation.replace("authFoodTruckBankDetailScreen", {
          onboardingFlow: true,
        });
      } else if (vendorOnboardingStep === "MENU") {
        navigation.replace("authMenuSetupPromptScreen");
      } else if (selectedPlan) {
        navigation.replace(
          getFinalSignupDestination({ selectedPlan, user }),
          { addOns: selectedSignupAddOns }
        );
      } else if (user?.vendorSubtype === "EVENT_VENDOR") {
        navigation.replace(getFinalSignupDestination({ user }));
      } else {
        navigation.replace("authFoodTruckPlansScreen");
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [
    isOnboarded,
    isSignedIn,
    isUnderReview,
    vendorOnboardingStep,
    postSignInRoute,
    pendingAuthRoute,
    pendingEventVendorApplication,
    dispatch,
    navigation,
    selectedPlan,
    selectedSignupAddOns,
    user,
  ]);

  useEffect(() => {
    const hideSplash = async () => {
      BootSplash.hide({ fade: true }); // fade is optional
    };

    hideSplash();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top / 2 }]}>
      <StatusBarManager barStyle="light-content" />

      <View style={styles.middleContainer}>
        <View style={styles.logoCard}>
          <Image
            source={require("../assets/images/AppLogo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.enterpriseRibbon}>
            <Text style={styles.enterpriseRibbonText}>ENTERPRISE SYSTEM</Text>
          </View>
        </View>
        <Text style={styles.title}>{"Round Da' Corner ERP"}</Text>
        <Text style={styles.subtitle}>Enterprise System</Text>
      </View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColor.header,
  },
  middleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logoCard: {
    alignItems: "center",
    backgroundColor: AppColor.white,
    borderRadius: 22,
    height: 190,
    justifyContent: "center",
    marginBottom: 34,
    paddingHorizontal: 18,
    paddingTop: 14,
    width: 190,
  },
  logoImage: {
    height: 130,
    width: 150,
  },
  enterpriseRibbon: {
    alignItems: "center",
    backgroundColor: AppColor.primary,
    borderRadius: 3,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  enterpriseRibbonText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  title: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 28,
    textAlign: "center",
  },
  subtitle: {
    color: AppColor.primary,
    fontFamily: Mulish400,
    fontSize: 16,
    marginTop: 6,
    textAlign: "center",
  },
});
