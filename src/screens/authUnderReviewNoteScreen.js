import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import Octicons from "react-native-vector-icons/Octicons";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  onOnBoard,
  onUnderReview,
  setVendorOnboardingStep,
  onSignin,
  setEventVendorOnboardingSessionActive,
  onSignOut,
  setPendingEventVendorApplication,
} from "../redux/slices/authSlice";
import StatusBarManager from "../components/StatusBarManager";
import { getUserDetail_API } from "../api/appAPI";
import { clearUserSlice, setUser } from "../redux/slices/userSlice";
import {
  getEventVendorResumeDestination,
  getEventVendorSignInTransition,
} from "../helpers/eventVendorProfile.helper";
import MarketplaceVendorScreenLayout from "../components/MarketplaceVendorScreenLayout";
import { getEventVendorSignOutKeys } from "../helpers/eventVendorApplicationDraft.helper";

export default function AuthUnderReviewNoteScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { user } = useSelector((state) => state.userReducer);

  const [loading, setLoading] = useState(false);
  const approvalHandledRef = useRef(false);
  const isEventVendor = user?.vendorSubtype === "EVENT_VENDOR";
  const confirmSignOut = () => Alert.alert(
    "Sign Out",
    "Sign out of this Marketplace Vendor account? Your submitted profile will not be deleted.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          const keys = await AsyncStorage.getAllKeys();
          const vendorId = String(user?._id || user?.id || "");
          const transient = getEventVendorSignOutKeys(keys, vendorId);
          if (transient.length) await AsyncStorage.multiRemove(transient);
          dispatch(setPendingEventVendorApplication(null));
          dispatch(onSignOut());
          dispatch(clearUserSlice());
          navigation.reset({ index: 0, routes: [{ name: "splash" }] });
        },
      },
    ],
  );

  const checkApprovalStatus = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const user_id = user?._id;
      if (!user_id || approvalHandledRef.current) {
        return;
      }
      const response = await getUserDetail_API(user_id);
      if (response?.success && response?.data) {
        const refreshedUser = response.data.user;
        dispatch(setUser(refreshedUser));

        if (refreshedUser?.vendorSubtype === "EVENT_VENDOR") {
          const profile = refreshedUser?.eventVendorProfile || null;
          const transition = getEventVendorSignInTransition(profile);
          dispatch(onSignin(transition.isSignedIn));
          dispatch(onOnBoard(transition.isOnboarded));
          dispatch(onUnderReview(transition.isUnderReview));
          dispatch(setVendorOnboardingStep(transition.vendorOnboardingStep));
          if (transition.isSignedIn) {
            approvalHandledRef.current = true;
            navigation.reset({ index: 0, routes: [{ name: "splash" }] });
            return;
          }
          if (!transition.isUnderReview) {
            approvalHandledRef.current = true;
            dispatch(setEventVendorOnboardingSessionActive(true));
            const destination = getEventVendorResumeDestination(profile);
            navigation.reset({
              index: 0,
              routes: [{
                name: destination === "EVENT_VENDOR_PHOTOS"
                  ? "eventVendorPhotosScreen"
                  : "eventVendorProfileScreen",
                params: { onboardingFlow: true },
              }],
            });
            return;
          }
          if (!silent) {
            Alert.alert("Approval Pending", "Your Marketplace Vendor profile is still being reviewed.");
          }
          return;
        }

        const requestStatus = String(
          refreshedUser?.requestStatus || "PENDING"
        ).toUpperCase();

        if (requestStatus === "APPROVED") {
          approvalHandledRef.current = true;
          dispatch(onOnBoard(true));
          dispatch(onUnderReview(false));
          dispatch(setVendorOnboardingStep("COMPLIANCE"));
          navigation.reset({
            index: 0,
            routes: [
              {
                name: "vendorComplianceScreen",
                params: { onboardingFlow: true },
              },
            ],
          });
          return;
        }

        if (!silent && requestStatus === "REJECTED") {
          Alert.alert(
            "Application Needs Attention",
            refreshedUser?.reasonForRejection ||
              "Your application was not approved. Please contact support for assistance."
          );
          return;
        }

        if (!silent) {
          Alert.alert(
            "Approval Pending",
            "Your business details are still being reviewed. We’ll continue automatically once an administrator approves your account."
          );
        }
      }
    } catch (error) {
      console.log("error => ", error);
      if (!silent) {
        Alert.alert(
          "Unable to Check Approval Status",
          error?.message || "Check your connection and try again. Your submitted profile is unchanged.",
        );
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [dispatch, navigation, user?._id]);

  useEffect(() => {
    checkApprovalStatus({ silent: true });
    const interval = setInterval(
      () => checkApprovalStatus({ silent: true }),
      15000
    );

    return () => clearInterval(interval);
  }, [checkApprovalStatus]);

  const content = (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBarManager />

      <View style={styles.subContainer}>
        <Octicons
          name="check-circle-fill"
          size={77.5}
          color={AppColor.primary}
        />

        <Text style={styles.title}>
          {isEventVendor
            ? "Your account is currently being reviewed for approval."
            : "Your business details have been sent for approval."}
        </Text>

        <View style={{ width: "85%" }}>
          <View style={{ flexDirection: "row", marginTop: 8 }}>
            <Text style={styles.subTitle}>{".  "}</Text>
            <Text style={styles.subTitle}>
              {"The Round Da’ Corner team is reviewing your information."}
            </Text>
          </View>
          <View style={{ flexDirection: "row", marginTop: 8 }}>
            <Text style={styles.subTitle}>{".  "}</Text>
            <Text style={styles.subTitle}>
              {
                "You'll receive a confirmation email once approved, usually within 24-48 hours."
              }
            </Text>
          </View>
          <View style={{ flexDirection: "row", marginTop: 8 }}>
            <Text style={styles.subTitle}>{".  "}</Text>
            <Text style={styles.subTitle}>
              {isEventVendor
                ? "After approval, sign in to enter the Event Marketplace."
                : "After approval, complete your compliance, profile requirements, and payment details. Menu setup is included for every vendor; employee features are available according to your selected tier."}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.continueButton}
        activeOpacity={0.7}
        disabled={loading}
        onPress={() => checkApprovalStatus()}
      >
        {loading ? (
          <ActivityIndicator color={AppColor.white} />
        ) : (
          <Text style={styles.continueButtonText}>{"Check Approval Status"}</Text>
        )}
      </TouchableOpacity>
      {isEventVendor ? (
        <TouchableOpacity
          style={styles.signOutButton}
          activeOpacity={0.7}
          disabled={loading}
          onPress={confirmSignOut}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
  return isEventVendor ? (
    <MarketplaceVendorScreenLayout title="Marketplace Vendor Approval Status">
      {content}
    </MarketplaceVendorScreenLayout>
  ) : content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  subContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    width: "90%",
    fontFamily: Mulish700,
    fontSize: 18,
    color: AppColor.text,
    marginVertical: 20,
    textAlign: "center",
  },
  subTitle: {
    flexWrap: "wrap",
    fontSize: 14,
    fontFamily: Mulish400,
    textAlign: "left",
    color: AppColor.textHighlighter,
  },

  continueButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginBottom: 20,
    marginHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: AppColor.black,
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  continueButtonText: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.white,
  },
  signOutButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppColor.primary,
    marginBottom: 20,
    marginHorizontal: 16,
  },
  signOutText: { fontFamily: Mulish700, fontSize: 16, color: AppColor.primary },
});
