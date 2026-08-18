import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AppImage from "../components/AppImage";
import VendorMarketplaceNotificationBell from "../components/VendorMarketplaceNotificationBell";
import StatePickerModal from "../components/StatePickerModal";
import { AppColor } from "../utils/theme";
import { getStateCode } from "../utils/usStates";
import {
  getMarketplaceMyApplications_API,
  getMarketplaceMyBids_API,
  getMarketplaceOpenEvents_API,
} from "../api/appAPI";
import {
  CUISINE_OPTIONS,
  EVENT_TYPES,
  formatDate,
  formatEventDeadlineDate,
  formatMoney,
  formatTimeRange,
  getEventImageUrl,
  getEventLocation,
  getPrimaryActionLabel,
  isBothPaymentEvent,
  isEventAccessError,
  isVendorPaysToAttendEvent,
  listText,
  styles,
} from "./vendorMarketplaceShared";
import {
  VendorMarketplaceCard,
  VendorMarketplaceEmptyState,
  VendorMarketplaceLoadingState,
  VendorMarketplacePage,
  VendorMarketplacePrimaryAction,
  VendorMarketplaceSecondaryAction,
} from "../components/VendorMarketplacePrimitives";
import { getFoodVendorMarketplaceCloseDate, getFoodVendorMarketplaceGuestRows } from "../helpers/foodVendorMarketplaceGuestCounts.helper";
import { resolveFoodMarketplaceNotificationDestination } from "../helpers/marketplaceNotificationCenter.helper";

const LockedMarketplace = ({ navigation }) => (
  <View style={[styles.body, { justifyContent: "center" }]}>
    <View style={styles.card}>
      <Text style={[styles.title, { textAlign: "center" }]}>
        Event Marketplace Locked
      </Text>
      <Text style={styles.emptyText}>
        Upgrade to Elite before you can browse events or submit bids.
      </Text>
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.button, { marginTop: 18 }]}
        onPress={() => navigation.navigate("profileSubscriptionScreen")}
      >
        <Text style={styles.buttonText}>Manage Plan</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const VendorMarketplaceNearMeScreen = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locked, setLocked] = useState(false);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [eventType, setEventType] = useState("");
  const [cuisine, setCuisine] = useState("");

  const loadEvents = async () => {
    setLoading(true);
    try {
      const response = await getMarketplaceOpenEvents_API({ limit: 100 });
      if (response?.success) {
        setEvents(response.data?.marketplaceEventList || []);
        setLocked(false);
      }
    } catch (error) {
      if (isEventAccessError(error)) {
        setLocked(true);
      } else {
        console.log("Marketplace events error", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, []),
  );

  const filteredEvents = useMemo(() => {
    const cityFilter = city.trim().toLowerCase();
    const stateFilter = getStateCode(state);
    const cuisineFilter = cuisine.trim().toLowerCase();

    return events.filter((event) => {
      const eventCity = String(event?.event_city || "").trim().toLowerCase();
      const eventState = getStateCode(event?.event_state || "");
      const eventCuisine = listText(event.cuisine_preferences).toLowerCase();

      return (
        (!cityFilter || eventCity.includes(cityFilter)) &&
        (!stateFilter || eventState === stateFilter) &&
        (!eventType || event.event_type === eventType) &&
        (!cuisineFilter || eventCuisine.includes(cuisineFilter))
      );
    });
  }, [city, cuisine, eventType, events, state]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const openNotificationRow = async (item) => {
    if (
      item.type === "MARKETPLACE_BID" ||
      item.type === "MARKETPLACE_APPLICATION" ||
      item.type === "MARKETPLACE_EVENT_CLOSED"
    ) {
      try {
        const destination = await resolveFoodMarketplaceNotificationDestination({
          notification: item,
          loadBids: getMarketplaceMyBids_API,
          loadApplications: getMarketplaceMyApplications_API,
        });
        navigation.navigate(destination.route, destination.params);
      } catch (error) {
        navigation.navigate(
          item.bid_id
            ? "VendorMyBidsScreen"
            : "VendorMyApplicationsScreen"
        );
      }
      return;
    }

    navigation.navigate("vendorMarketplaceScreen");
  };

  const openEventDetails = (item) =>
    navigation.navigate("vendorMarketplaceEventDetailsScreen", {
      eventId: item.event_id,
      event: item,
    });

  const openEventAction = (item, submissionType) => {
    const isApplication = submissionType
      ? submissionType === "application"
      : isVendorPaysToAttendEvent(item);
    const navigateToSubmission = () => {
      if (isApplication) {
        navigation.navigate("VendorApplicationScreen", {
          eventId: item.event_id,
          event: item,
        });
        return;
      }

      navigation.navigate("VendorBidResponseScreen", {
        eventId: item.event_id,
        event: item,
      });
    };

    if (!isBothPaymentEvent(item)) {
      navigateToSubmission();
      return;
    }

    Alert.alert(
      isApplication ? "Vendor-Paid Application" : "Coordinator-Paid Bid",
      isApplication
        ? "This option is for vendors paying to attend and sell at the event. Would you like to proceed?"
        : "This option is for vendors bidding for the coordinator-paid VIP catering award. Would you like to proceed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isApplication ? "Continue to Application" : "Continue to Bid",
          onPress: navigateToSubmission,
        },
      ],
    );
  };

  const renderEventActions = (item) => {
    if (!isBothPaymentEvent(item)) {
      return (
        <VendorMarketplacePrimaryAction label={getPrimaryActionLabel(item)} style={{ marginTop: 14 }} onPress={() => openEventAction(item)} />
      );
    }

    return (
      <View style={{ gap: 10, marginTop: 14 }}>
        <VendorMarketplacePrimaryAction label="Submit Application" onPress={() => openEventAction(item, "application")} />
        <VendorMarketplaceSecondaryAction label={item.catered_vip_section_enabled ? "Submit VIP Catering Bid" : "Submit Bid"} style={{ paddingVertical: 14 }} onPress={() => openEventAction(item, "bid")} />
      </View>
    );
  };

  const renderEvent = ({ item }) => {
    const imageUrl = getEventImageUrl(item);
    const vendorPays = isVendorPaysToAttendEvent(item);
    const bothPay = isBothPaymentEvent(item);

    return (
      <VendorMarketplaceCard onPress={() => openEventDetails(item)}>
        <AppImage uri={imageUrl} containerStyle={styles.cardImage} />
        <Text style={styles.title}>{item.event_type || "Event"}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {item.event_description || "Event details available on the next screen."}
        </Text>
        <Text style={styles.meta}>
          Who Pays: {bothPay ? "Both" : vendorPays ? "Vendor" : "Coordinator"}
        </Text>
        {(vendorPays || bothPay) && (
          <Text style={styles.meta}>Vendor Fee: {formatMoney(item.vendor_fee)}</Text>
        )}
        {bothPay && (
          <Text style={styles.meta}>
            {item.catered_vip_section_enabled && !item.fully_catered_event
              ? "Coordinator VIP Catering Budget"
              : "Coordinator Event Budget"}: {formatMoney(item.budgeted_amount)}
          </Text>
        )}
        {item.catered_vip_section_enabled ? (
          <Text style={styles.meta}>
            GA Food Sales: {item.ga_food_sales_allowed ? "Allowed" : "Not allowed"}
          </Text>
        ) : null}
        {!vendorPays && !bothPay && (
          <Text style={styles.meta}>
            Coordinator Event Budget: {formatMoney(item.budgeted_amount)}
          </Text>
        )}
        <Text style={styles.meta}>{getEventLocation(item)}</Text>
        <Text style={styles.meta}>
          {formatDate(item.event_date)} {formatTimeRange(item.event_time)}
        </Text>
        {getFoodVendorMarketplaceGuestRows({ event: item, participationPath: bothPay ? "BOTH" : vendorPays ? "APPLICATION" : "BID" }).map((row) => <Text key={row.label} style={styles.meta}>{row.label}: {row.value}</Text>)}
        <Text style={styles.meta}>Application/Bid Deadline: {formatEventDeadlineDate(getFoodVendorMarketplaceCloseDate(item), item)}</Text>
        {renderEventActions(item)}
      </VendorMarketplaceCard>
    );
  };

  return (
    <VendorMarketplacePage
        title="Marketplace / Near Me"
        navigation={navigation}
        right={
          <VendorMarketplaceNotificationBell
            navigation={navigation}
            onOpenNotification={openNotificationRow}
          />
        }
    >
      {locked ? (
        <LockedMarketplace navigation={navigation} />
      ) : loading && !refreshing ? (
        <VendorMarketplaceLoadingState />
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.event_id}
          renderItem={renderEvent}
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={AppColor.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.card}>
              <Text style={styles.label}>City</Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="Filter by city"
                placeholderTextColor={AppColor.placeholderTextColor}
                style={styles.input}
              />
              <View style={{ marginTop: 14 }}>
                <StatePickerModal
                  allowClear
                  label="State"
                  placeholder="All States"
                  value={state}
                  onChange={setState}
                />
              </View>
              <Text style={styles.label}>Event Type</Text>
              <View style={styles.chipWrap}>
                {["All", ...EVENT_TYPES].map((type) => {
                  const active = type === "All" ? !eventType : eventType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      activeOpacity={0.7}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setEventType(type === "All" ? "" : type)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.label}>Cuisine/Food Type</Text>
              <View style={styles.chipWrap}>
                {["All", ...CUISINE_OPTIONS].map((type) => {
                  const active = type === "All" ? !cuisine : cuisine === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      activeOpacity={0.7}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setCuisine(type === "All" ? "" : type)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={[styles.row, { marginTop: 16 }]}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.secondaryButton, styles.flex]}
                  onPress={() => navigation.navigate("VendorMyBidsScreen")}
                >
                  <Text style={styles.secondaryButtonText}>My Bids</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.secondaryButton, styles.flex]}
                  onPress={() =>
                    navigation.navigate("VendorAwardedEventsScreen")
                  }
                >
                  <Text style={styles.secondaryButtonText}>Awarded</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          ListEmptyComponent={
            <VendorMarketplaceEmptyState title="No open events found" message="Adjust your filters or check back as coordinators publish new events." />
          }
        />
      )}
    </VendorMarketplacePage>
  );
};

export default VendorMarketplaceNearMeScreen;
