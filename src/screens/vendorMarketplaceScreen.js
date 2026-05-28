import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import StatusBarManager from "../components/StatusBarManager";
import { getAddOnsPlans_API } from "../api/appAPI";
import { AppColor } from "../utils/theme";
import { MarketplaceHeader, styles } from "./vendorMarketplaceShared";

const EVENT_ADD_ON_PATTERN = /event|booking|marketplace/i;

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

const hasEventBookingsAddOn = (foodTruck, eventAddOnIds = []) => {
  const addOns = foodTruck?.addOns || [];
  return Array.isArray(addOns)
    ? addOns.some((addOn) => {
        if (typeof addOn === "string") {
          return (
            EVENT_ADD_ON_PATTERN.test(addOn) || eventAddOnIds.includes(addOn)
          );
        }
        if (eventAddOnIds.includes(addOn?._id)) {
          return true;
        }
        return EVENT_ADD_ON_PATTERN.test(
          `${addOn?.slug || ""} ${addOn?.name || ""} ${addOn?.description || ""}`,
        );
      })
    : false;
};

const canAccessMarketplace = (foodTruck, eventAddOnIds, selectedPlan) =>
  isElitePlan(foodTruck?.plan || foodTruck?.planId) ||
  isElitePlan(selectedPlan) ||
  hasEventBookingsAddOn(foodTruck, eventAddOnIds);

const MARKETPLACE_CARDS = [
  {
    title: "Marketplace / Near Me",
    subtitle: "View sourcing events and food opportunities near you.",
    icon: "storefront",
    route: "VendorMarketplaceNearMeScreen",
  },
  {
    title: "My Bids",
    subtitle: "Track bids submitted for coordinator-paid events.",
    icon: "receipt-long",
    route: "VendorMyBidsScreen",
  },
  {
    title: "My Applications",
    subtitle: "Track applications submitted for vendor-paid events.",
    icon: "assignment",
    route: "VendorMyApplicationsScreen",
  },
  {
    title: "Awarded Events",
    subtitle: "View events you were accepted or awarded for.",
    icon: "emoji-events",
    route: "VendorAwardedEventsScreen",
  },
];

const MarketplaceCard = ({ item, onPress }) => (
  <TouchableOpacity activeOpacity={0.8} style={styles.card} onPress={onPress}>
    <View style={localStyles.cardRow}>
      <View style={localStyles.iconWrap}>
        <MaterialIcons name={item.icon} size={24} color={AppColor.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={26} color={AppColor.gray} />
    </View>
  </TouchableOpacity>
);

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
      <AccessOption
        title="Add-On Event Bookings - $25/month"
        details={["Add marketplace access to your current plan."]}
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
        style={[styles.secondaryButton, { marginTop: 12 }]}
        onPress={() => navigation.navigate("profileSubscriptionScreen")}
      >
        <Text style={styles.secondaryButtonText}>
          Add-On Event Bookings - $25/month
        </Text>
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
  const insets = useSafeAreaInsets();
  const { selectedPlan, user } = useSelector((state) => state.userReducer);
  const foodTruck = user?.foodTruck;
  const [eventAddOnIds, setEventAddOnIds] = useState([]);
  const hasAccess = useMemo(
    () => canAccessMarketplace(foodTruck, eventAddOnIds, selectedPlan),
    [eventAddOnIds, foodTruck, selectedPlan],
  );

  useEffect(() => {
    const loadEventAddOns = async () => {
      try {
        const response = await getAddOnsPlans_API();
        const addOns = response?.data?.addonsList || [];
        setEventAddOnIds(
          addOns
            .filter((addOn) =>
              EVENT_ADD_ON_PATTERN.test(
                `${addOn?.slug || ""} ${addOn?.name || ""} ${
                  addOn?.description || ""
                }`,
              ),
            )
            .map((addOn) => addOn._id)
            .filter(Boolean),
        );
      } catch (error) {
        console.log("Marketplace add-ons error", error);
      }
    };

    loadEventAddOns();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <MarketplaceHeader title="Marketplace" navigation={navigation} />
      {hasAccess ? (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={localStyles.kicker}>ROUND THE CORNER</Text>
          <Text style={localStyles.heading}>Vendor Event Marketplace</Text>
          <Text style={styles.screenIntro}>
            Discover event opportunities, track bids and applications, and manage
            awarded events.
          </Text>
          {MARKETPLACE_CARDS.map((item) => (
            <MarketplaceCard
              key={item.title}
              item={item}
              onPress={() => navigation.navigate(item.route)}
            />
          ))}
        </ScrollView>
      ) : (
        <MarketplaceAccessPrompt navigation={navigation} />
      )}
    </View>
  );
};

const localStyles = StyleSheet.create({
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1E6",
  },
  kicker: {
    fontSize: 11,
    fontFamily: "Mulish-Bold",
    color: AppColor.primary,
    letterSpacing: 0,
  },
  heading: {
    fontSize: 22,
    fontFamily: "Mulish-Bold",
    color: AppColor.text,
    marginTop: 2,
    marginBottom: 4,
  },
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
});

export default VendorMarketplaceScreen;
