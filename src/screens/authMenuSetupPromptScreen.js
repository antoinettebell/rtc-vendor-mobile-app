import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useDispatch } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StatusBarManager from "../components/StatusBarManager";
import {
  onOnBoard,
  onSignin,
  onUnderReview,
  setPostSignInRoute,
  setVendorOnboardingStep,
} from "../redux/slices/authSlice";
import { AppColor, Mulish400, Mulish700 } from "../utils/theme";

const AuthMenuSetupPromptScreen = () => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const enterVendorApp = (openMenu) => {
    dispatch(setPostSignInRoute(openMenu ? "menuScreen" : null));
    dispatch(setVendorOnboardingStep(null));
    dispatch(onUnderReview(false));
    dispatch(onOnBoard(false));
    dispatch(onSignin(true));
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 20 },
      ]}
    >
      <StatusBarManager />
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="restaurant-outline" size={48} color={AppColor.primary} />
        </View>
        <Text style={styles.title}>Now let&apos;s set up your menu.</Text>
        <Text style={styles.subtitle}>
          Add your categories and food items using the existing Menu page.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => enterVendorApp(true)}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Set Up Menu</Text>
          <Ionicons name="arrow-forward" size={18} color={AppColor.white} />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => enterVendorApp(false)}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>I&apos;ll Do This Later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColor.white,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3E8",
    marginBottom: 24,
  },
  title: {
    fontFamily: Mulish700,
    fontSize: 24,
    color: AppColor.text,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: Mulish400,
    fontSize: 16,
    lineHeight: 24,
    color: AppColor.textHighlighter,
    textAlign: "center",
    marginTop: 12,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    height: 50,
    borderRadius: 8,
    backgroundColor: AppColor.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.white,
  },
  secondaryButton: {
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColor.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.primary,
  },
});

export default AuthMenuSetupPromptScreen;
