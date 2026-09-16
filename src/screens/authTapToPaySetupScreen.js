import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getBankDetail_API,
  getUserDetail_API,
  getVendorComplianceSummary_API,
  updateFoodtruckSubscription_API,
} from "../api/appAPI";
import StatusBarManager from "../components/StatusBarManager";
import { setVendorOnboardingStep } from "../redux/slices/authSlice";
import { setUser } from "../redux/slices/userSlice";
import {
  activateTapToPay,
} from "../services/tapToPay-service";
import tapToPayConfig from "../services/tapToPay-config";
import { AppColor, Mulish400, Mulish600, Mulish700 } from "../utils/theme";

const AuthTapToPaySetupScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.userReducer);
  const isOnboardingFlow = route?.params?.onboardingFlow === true;
  const isTapToPayUpgradeFlow = route?.params?.tapToPayUpgradeFlow === true;
  const [compliance, setCompliance] = useState(null);
  const [loadingCompliance, setLoadingCompliance] = useState(true);
  const [activating, setActivating] = useState(false);
  const [terminalReady, setTerminalReady] = useState(false);
  const [terminalSuffix, setTerminalSuffix] = useState("");
  const [hasPaymentDetails, setHasPaymentDetails] = useState(null);
  const terminalSerial = user?.foodTruck?.tap_to_pay_serial_number || "";
  const isCompliant = compliance?.eligible === true
    && Number(compliance?.score) === 100;
  const canActivate = Platform.OS === "ios"
    && tapToPayConfig.enabled
    && isCompliant
    && !loadingCompliance;

  const loadCompliance = useCallback(async () => {
    setLoadingCompliance(true);
    try {
      const response = await getVendorComplianceSummary_API({
        foodtruck_id: user?.foodTruck?._id,
      });
      setCompliance(response?.data?.compliance || null);
    } catch {
      setCompliance(null);
    } finally {
      setLoadingCompliance(false);
    }
  }, [user?.foodTruck?._id]);

  useEffect(() => {
    loadCompliance();
  }, [loadCompliance]);

  const loadPaymentDetails = useCallback(async () => {
    try {
      const response = await getBankDetail_API();
      setHasPaymentDetails(!!response?.data?.bankDetail);
    } catch {
      setHasPaymentDetails(false);
    }
  }, []);

  useEffect(() => {
    if (isTapToPayUpgradeFlow) loadPaymentDetails();
  }, [isTapToPayUpgradeFlow, loadPaymentDetails]);

  const continueToPayment = async () => {
    if (!isCompliant || !terminalReady) {
      Alert.alert(
        "Tap to Pay Setup Required",
        "Complete Tap to Pay activation on this iPhone before continuing to Payment Details.",
      );
      return;
    }
    if (isTapToPayUpgradeFlow) {
      if (hasPaymentDetails !== true) {
        navigation.reset({
          index: 0,
          routes: [{
            name: "authFoodTruckBankDetailScreen",
            params: { tapToPayUpgradeFlow: true },
          }],
        });
        return;
      }
      try {
        await updateFoodtruckSubscription_API({
          planId: user?.foodTruck?.plan?._id || user?.foodTruck?.planId,
          complete_tap_to_pay_upgrade: true,
        });
        navigation.reset({ index: 0, routes: [{ name: "splash" }] });
      } catch (error) {
        Alert.alert(
          "Unable to Finish Setup",
          error?.message || "Tap to Pay setup could not be completed. Please try again.",
        );
      }
      return;
    }
    if (!isOnboardingFlow) {
      navigation.goBack();
      return;
    }
    dispatch(setVendorOnboardingStep("PAYMENT"));
    navigation.reset({
      index: 0,
      routes: [{
        name: "authFoodTruckBankDetailScreen",
        params: { onboardingFlow: true },
      }],
    });
  };

  const returnToCompliance = () => {
    if (isTapToPayUpgradeFlow) {
      navigation.reset({
        index: 0,
        routes: [{
          name: "vendorComplianceScreen",
          params: { tapToPayUpgradeFlow: true },
        }],
      });
      return;
    }
    if (!isOnboardingFlow) {
      navigation.goBack();
      return;
    }
    dispatch(setVendorOnboardingStep("COMPLIANCE"));
    navigation.reset({
      index: 0,
      routes: [{
        name: "vendorComplianceScreen",
        params: { onboardingFlow: true },
      }],
    });
  };

  const handleActivation = async () => {
    if (!canActivate) return;
    setActivating(true);
    try {
      const result = await activateTapToPay();
      setTerminalSuffix(result?.terminalSerialSuffix || "");
      setTerminalReady(result?.activated !== false);

      const refreshed = await getUserDetail_API(user?._id);
      if (refreshed?.success && refreshed?.data?.user) {
        dispatch(setUser(refreshed.data.user));
      }

      Alert.alert(
        "Tap to Pay Is Ready",
        "This iPhone is activated and its terminal serial ID has been saved to your RTC profile.",
      );
    } catch (error) {
      Alert.alert(
        "Tap to Pay Setup",
        error?.message || "Tap to Pay on iPhone could not be activated. Please try again.",
      );
    } finally {
      setActivating(false);
    }
  };

  const statusText = loadingCompliance
    ? "Checking compliance eligibility…"
    : isCompliant
      ? "Compliance complete — this iPhone is eligible for setup."
      : "Complete all required compliance items before activating Tap to Pay on iPhone.";

  return (
    <View style={styles.container}>
      <StatusBarManager barStyle="dark-content" backgroundColor={AppColor.white} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={returnToCompliance} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color={AppColor.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tap to Pay Setup</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="phone-portrait-outline" size={48} color={AppColor.primary} />
        </View>
        <Text style={styles.title}>Set Up Tap to Pay on iPhone</Text>
        <Text style={styles.subtitle}>
          Accept contactless debit cards, credit cards, and digital wallets directly on a compatible iPhone.
        </Text>

        <View style={styles.statusCard}>
          {loadingCompliance ? (
            <ActivityIndicator size="small" color={AppColor.primary} />
          ) : (
            <Ionicons
              name={isCompliant ? "checkmark-circle" : "alert-circle-outline"}
              size={24}
              color={isCompliant ? AppColor.primary : "#B42318"}
            />
          )}
          <Text style={styles.statusText}>{statusText}</Text>
        </View>

        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Before you begin</Text>
          <Text style={styles.instruction}>• Use the iPhone that will accept customer payments.</Text>
          <Text style={styles.instruction}>• Keep this iPhone connected to the internet.</Text>
          <Text style={styles.instruction}>• Follow Apple and CyberSource prompts to complete activation.</Text>
          <Text style={styles.instruction}>• RTC securely supplies the activation code—you will not need to contact support or enter it manually.</Text>
        </View>

        {terminalSerial || terminalSuffix ? (
          <View style={styles.readyCard}>
            <Ionicons name="checkmark-circle" size={24} color={AppColor.primary} />
            <View style={styles.readyTextContainer}>
              <Text style={styles.readyTitle}>Terminal registered</Text>
              <Text style={styles.readyText}>
                Serial ID ending in {terminalSuffix || terminalSerial.slice(-4)}
              </Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.7}
          disabled={!canActivate || activating}
          onPress={handleActivation}
          style={[
            styles.primaryButton,
            (!canActivate || activating) && styles.disabledButton,
          ]}
        >
          {activating ? (
            <ActivityIndicator color={AppColor.white} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {terminalSerial ? "Verify or Set Up This iPhone" : "Set Up Tap to Pay on iPhone"}
            </Text>
          )}
        </TouchableOpacity>

        {!loadingCompliance && !isCompliant ? (
          <TouchableOpacity onPress={returnToCompliance} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Return to Compliance</Text>
          </TouchableOpacity>
        ) : null}

        {(isOnboardingFlow || isTapToPayUpgradeFlow) && terminalReady ? (
          <TouchableOpacity
            onPress={continueToPayment}
            style={styles.continueButton}
          >
            <Text style={styles.continueButtonText}>
              {isTapToPayUpgradeFlow && hasPaymentDetails === true
                ? "Finish Setup"
                : "Next: Payment Details"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColor.white },
  header: {
    minHeight: 76,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: { width: 40, minHeight: 40, justifyContent: "center" },
  headerTitle: { fontFamily: Mulish700, fontSize: 20, color: AppColor.text },
  content: { paddingHorizontal: 24, paddingTop: 28 },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#EAF5EF",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  title: {
    marginTop: 20,
    fontFamily: Mulish700,
    fontSize: 25,
    color: AppColor.text,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    fontFamily: Mulish400,
    fontSize: 16,
    lineHeight: 24,
    color: AppColor.textHighlighter,
    textAlign: "center",
  },
  statusCard: {
    marginTop: 24,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#F7F9FA",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusText: { flex: 1, fontFamily: Mulish600, fontSize: 15, lineHeight: 21, color: AppColor.text },
  instructionsCard: {
    marginTop: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#D8E0E5",
    borderRadius: 12,
  },
  instructionsTitle: { fontFamily: Mulish700, fontSize: 17, color: AppColor.text, marginBottom: 8 },
  instruction: { fontFamily: Mulish400, fontSize: 15, lineHeight: 23, color: AppColor.textHighlighter, marginTop: 5 },
  readyCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#EAF5EF",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  readyTextContainer: { flex: 1 },
  readyTitle: { fontFamily: Mulish700, fontSize: 16, color: AppColor.primary },
  readyText: { marginTop: 2, fontFamily: Mulish400, fontSize: 14, color: AppColor.text },
  primaryButton: {
    minHeight: 52,
    marginTop: 24,
    paddingHorizontal: 18,
    borderRadius: 9,
    backgroundColor: AppColor.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: { opacity: 0.45 },
  primaryButtonText: { fontFamily: Mulish700, fontSize: 16, color: AppColor.white, textAlign: "center" },
  secondaryButton: {
    minHeight: 50,
    marginTop: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: AppColor.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: { fontFamily: Mulish700, fontSize: 16, color: AppColor.primary },
  continueButton: { minHeight: 50, marginTop: 12, alignItems: "center", justifyContent: "center" },
  continueButtonText: { fontFamily: Mulish700, fontSize: 16, color: AppColor.primary },
});

export default AuthTapToPaySetupScreen;
