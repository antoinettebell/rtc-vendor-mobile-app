import React, { useCallback, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSelector } from "react-redux";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import { getVendorComplianceSummary_API } from "../api/appAPI";
import { AppColor } from "../utils/theme";
import { styles } from "./vendorMarketplaceShared";
import VendorMarketplaceLanding, {
  VENDOR_MARKETPLACE_NAVIGATION,
} from "../components/VendorMarketplaceLanding";
import { VendorMarketplaceLoadingState, VendorMarketplacePage } from "../components/VendorMarketplacePrimitives";

const getPlanLabel = (plan) =>
  String(plan?.slug || plan?.name || plan?.title || "").toLowerCase();

const getPlanRate = (plan) =>
  parseFloat(plan?.rate || plan?.feeRate || plan?.saleFee || 0);

const isElitePlan = (plan) => {
  const label = getPlanLabel(plan);
  return (
    label.includes("elite") ||
    label.includes("sub_elite") ||
    getPlanRate(plan) === 5.5 ||
    !!plan?.capabilities?.eventMarketplace
  );
};

const canAccessMarketplace = (foodTruck, selectedPlan) =>
  isElitePlan(foodTruck?.plan || foodTruck?.planId) ||
  isElitePlan(selectedPlan);

const FOOD_MARKETPLACE_ROUTES = {
  MARKETPLACE: "VendorMarketplaceNearMeScreen",
  BIDS: "VendorMyBidsScreen",
  APPLICATIONS: "VendorMyApplicationsScreen",
  AWARDED: "VendorAwardedEventsScreen",
};

const AccessOption = ({ title, details }) => (
  <View style={[styles.card, localStyles.optionCard]}>
    <Text style={[styles.title, localStyles.optionTitle]}>{title}</Text>
    {details.map((detail) => (
      <Text key={detail} style={styles.meta}>
        {detail}
      </Text>
    ))}
  </View>
);

const MarketplaceAccessPrompt = ({ navigation }) => {
  const onMaybeLater = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("homeScreen");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.card}>
        <Text style={[styles.title, { textAlign: "center" }]}>
          Marketplace Access
        </Text>
        <Text style={styles.emptyText}>
          Find event opportunities, submit bids, apply for vendor events, and
          manage awarded events.
        </Text>
      </View>

      <AccessOption
        title="Upgrade to Elite"
        details={["Includes Marketplace Access", "5.5% per sale fee"]}
      />

      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.button}
        onPress={() => navigation.navigate("profileSubscriptionScreen")}
      >
        <Text style={styles.buttonText}>Upgrade to Elite</Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.secondaryButton, localStyles.maybeLaterButton]}
        onPress={onMaybeLater}
      >
        <Text style={styles.secondaryButtonText}>Maybe Later</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const VendorMarketplaceScreen = ({ navigation }) => {
  const { selectedPlan, user } = useSelector((state) => state.userReducer);
  const foodTruck = user?.foodTruck;
  const [compliance, setCompliance] = useState(null);
  const [checkingCompliance, setCheckingCompliance] = useState(false);
  const hasAccess = useMemo(
    () => canAccessMarketplace(foodTruck, selectedPlan),
    [foodTruck, selectedPlan],
  );
  const complianceBlocked =
    hasAccess &&
    !checkingCompliance &&
    compliance &&
    (Number(compliance.score || 0) < 100 || compliance.eligible === false);

  const loadCompliance = useCallback(async () => {
    if (!hasAccess || !foodTruck?._id) {
      setCompliance(null);
      return;
    }

    setCheckingCompliance(true);
    try {
      const response = await getVendorComplianceSummary_API({
        foodtruck_id: foodTruck._id,
      });
      setCompliance(response?.data?.compliance || null);
    } catch (error) {
      console.log("Marketplace compliance check error", error);
    } finally {
      setCheckingCompliance(false);
    }
  }, [foodTruck?._id, hasAccess]);

  useFocusEffect(
    useCallback(() => {
      loadCompliance();
    }, [loadCompliance]),
  );

  const goToFoodVendorHome = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("bottomRoot", { screen: "homeScreen" });
  };

  return (
    <VendorMarketplacePage
        title="Marketplace"
        navigation={navigation}
        onBack={goToFoodVendorHome}
        right={
          hasAccess ? (
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={checkingCompliance}
              onPress={loadCompliance}
              style={localStyles.refreshButton}
              accessibilityRole="button"
              accessibilityLabel="Refresh marketplace requirements"
            >
              <MaterialIcons
                name="refresh"
                size={25}
                color={
                  checkingCompliance ? AppColor.gray : AppColor.primary
                }
              />
            </TouchableOpacity>
          ) : null
        }
    >
      {checkingCompliance ? (
        <VendorMarketplaceLoadingState />
      ) : complianceBlocked ? (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.card}>
            <Text style={[styles.title, { textAlign: "center" }]}>
              Compliance Paperwork Required
            </Text>
            <Text style={styles.emptyText}>
              Please update your compliance paperwork.
            </Text>
            <Text style={styles.meta}>
              Compliance score: {compliance?.score || 0}/100
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.button}
            onPress={() => navigation.navigate("vendorComplianceScreen")}
          >
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={checkingCompliance}
            style={[styles.secondaryButton, localStyles.refreshComplianceButton]}
            onPress={loadCompliance}
          >
            <Text style={styles.secondaryButtonText}>Refresh Requirements</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : hasAccess ? (
        <ScrollView contentContainerStyle={styles.body}>
          <VendorMarketplaceLanding
            cards={VENDOR_MARKETPLACE_NAVIGATION}
            onSelect={(item) => navigation.navigate(FOOD_MARKETPLACE_ROUTES[item.key])}
          />
        </ScrollView>
      ) : (
        <MarketplaceAccessPrompt navigation={navigation} />
      )}
    </VendorMarketplacePage>
  );
};

const localStyles = StyleSheet.create({
  optionCard: {
    borderColor: "#F0D5BD",
    backgroundColor: "#FFFDF9",
  },
  optionTitle: {
    fontSize: 16,
  },
  maybeLaterButton: {
    marginTop: 12,
    marginBottom: 12,
    borderColor: AppColor.border,
  },
  refreshButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  refreshComplianceButton: {
    marginTop: 12,
  },
});

export default VendorMarketplaceScreen;
