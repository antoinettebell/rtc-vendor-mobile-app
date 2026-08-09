import React, { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColor, Mulish400, Mulish700 } from "../utils/theme";
import { useNavigation } from "@react-navigation/native";
import BootSplash from "react-native-bootsplash";
import { useDispatch, useSelector } from "react-redux";
import {
  setPendingAuthRoute,
  setPendingEventVendorApplication,
  setPostSignInRoute,
  onSignin,
  onOnBoard,
  onUnderReview,
  onSignOut,
  setVendorOnboardingStep,
  setEventVendorOnboardingSessionActive,
} from "../redux/slices/authSlice";
import StatusBarManager from "../components/StatusBarManager";
import {
  consumePendingAuthRoute,
  getFinalSignupDestination,
} from "../helpers/signupNavigation.helper";
import { getEventVendorProfile_API } from "../api/appAPI";
import {
  getEventVendorResumeDestination,
  getEventVendorColdLaunchTransition,
  getEventVendorStatusFailureTransition,
  getEventVendorStatusFailureUserAction,
} from "../helpers/eventVendorProfile.helper";
import { clearUserSlice, updateUser } from "../redux/slices/userSlice";

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
    eventVendorOnboardingSessionActive,
  } = useSelector(
    (state) => state.authReducer
  );
  const eventVendorCheckRef = useRef(false);
  const [statusCheckFailure, setStatusCheckFailure] = useState(null);
  const [statusCheckAttempt, setStatusCheckAttempt] = useState(0);
  const { selectedPlan, selectedSignupAddOns, user } = useSelector(
    (state) => state.userReducer
  );

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (user?.vendorSubtype === "EVENT_VENDOR" && !eventVendorCheckRef.current) {
        eventVendorCheckRef.current = true;
        try {
          setStatusCheckFailure(null);
          const response = await getEventVendorProfile_API();
          const profile = response?.data?.eventVendorProfile || null;
          const transition = getEventVendorColdLaunchTransition({
            profile,
            onboardingSessionActive: eventVendorOnboardingSessionActive,
          });
          dispatch(updateUser({ eventVendorProfile: profile }));
          dispatch(onSignin(transition.isSignedIn));
          dispatch(onOnBoard(transition.isOnboarded));
          dispatch(onUnderReview(transition.isUnderReview));
          dispatch(setVendorOnboardingStep(transition.vendorOnboardingStep));
          if (transition.isSignedIn) {
            if (isSignedIn) {
              navigation.replace(
                "bottomRoot",
                postSignInRoute ? { screen: postSignInRoute } : undefined,
              );
            }
            return;
          }
          if (transition.isUnderReview) {
            dispatch(setEventVendorOnboardingSessionActive(false));
            if (isOnboarded && !isSignedIn) {
              navigation.replace("authUnderReviewNoteScreen");
            }
            return;
          }
          if (!eventVendorOnboardingSessionActive) {
            dispatch(onSignOut());
            dispatch(clearUserSlice());
            return;
          }
          const destination = getEventVendorResumeDestination(profile);
          if (isOnboarded && !isSignedIn) {
            navigation.replace(
              destination === "EVENT_VENDOR_PHOTOS"
                ? "eventVendorPhotosScreen"
                : "eventVendorProfileScreen",
              { onboardingFlow: true },
            );
          }
          return;
        } catch (error) {
          const failure = getEventVendorStatusFailureTransition({
            error,
            existingProfile: user?.eventVendorProfile,
          });
          if (failure.authoritativeMissing) {
            dispatch(onSignOut());
            dispatch(clearUserSlice());
            return;
          }
          setStatusCheckFailure(failure);
          return;
        }
      }
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
    eventVendorOnboardingSessionActive,
    statusCheckAttempt,
    dispatch,
    navigation,
    selectedPlan,
    selectedSignupAddOns,
    user,
  ]);

  const retryStatusCheck = () => {
    if (!getEventVendorStatusFailureUserAction("RETRY").retry) return;
    eventVendorCheckRef.current = false;
    setStatusCheckFailure(null);
    setStatusCheckAttempt((value) => value + 1);
  };

  const signOutAfterStatusFailure = () => {
    if (!getEventVendorStatusFailureUserAction("SIGN_OUT").clearSession) return;
    dispatch(onSignOut());
    dispatch(clearUserSlice());
  };

  useEffect(() => {
    const hideSplash = async () => {
      BootSplash.hide({ fade: true }); // fade is optional
    };

    hideSplash();
  }, []);

  if (statusCheckFailure) {
    return (
      <View style={[styles.statusFailure, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.statusFailureTitle}>Unable to Check Marketplace Vendor Status</Text>
        <Text style={styles.statusFailureText}>
          We could not confirm your Marketplace Vendor status. Your session and saved profile state have been preserved.
        </Text>
        <TouchableOpacity style={styles.statusRetryButton} onPress={retryStatusCheck}>
          <Text style={styles.statusRetryText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statusSignOutButton} onPress={signOutAfterStatusFailure}>
          <Text style={styles.statusSignOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
  statusFailure: {
    alignItems: "center",
    backgroundColor: AppColor.white,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  statusFailureTitle: {
    color: AppColor.text,
    fontFamily: Mulish700,
    fontSize: 22,
    textAlign: "center",
  },
  statusFailureText: {
    color: AppColor.text,
    fontFamily: Mulish400,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    textAlign: "center",
  },
  statusRetryButton: {
    alignItems: "center",
    backgroundColor: AppColor.primary,
    borderRadius: 10,
    marginTop: 24,
    paddingVertical: 14,
    width: "100%",
  },
  statusRetryText: { color: AppColor.white, fontFamily: Mulish700 },
  statusSignOutButton: { marginTop: 18, padding: 10 },
  statusSignOutText: { color: AppColor.text, fontFamily: Mulish700 },
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
