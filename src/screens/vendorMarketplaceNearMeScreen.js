import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AppImage from "../components/AppImage";
import StatePickerModal from "../components/StatePickerModal";
import { AppColor, Mulish400, Mulish700 } from "../utils/theme";
import { getStateCode } from "../utils/usStates";
import {
  getMarketplaceNotificationSummary_API,
  getMarketplaceOpenEvents_API,
} from "../api/appAPI";
import {
  CUISINE_OPTIONS,
  EVENT_TYPES,
  formatDate,
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
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [marketplaceNotifications, setMarketplaceNotifications] = useState([]);

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

  const loadNotifications = async () => {
    try {
      const response = await getMarketplaceNotificationSummary_API();
      if (response?.success) {
        setMarketplaceNotifications(
          response.data?.marketplaceNotificationList || [],
        );
      }
    } catch (error) {
      console.log("Marketplace notification summary error", error);
      setMarketplaceNotifications([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEvents();
      loadNotifications();
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
    await Promise.all([loadEvents(), loadNotifications()]);
    setRefreshing(false);
  };

  const openNotificationRow = (item) => {
    setNotificationsVisible(false);

    if (item.type === "MARKETPLACE_MESSAGE") {
      navigation.navigate("vendorMarketplaceMessagesScreen", {
        eventId: item.event_id,
      });
      return;
    }

    if (
      item.type === "MARKETPLACE_BID" ||
      item.type === "MARKETPLACE_APPLICATION" ||
      item.type === "MARKETPLACE_EVENT_CLOSED"
    ) {
      navigation.navigate("vendorMarketplaceEventDetailsScreen", {
        eventId: item.event_id,
      });
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
        <Text style={styles.meta}>Application/Bid Deadline: {formatDate(getFoodVendorMarketplaceCloseDate(item))}</Text>
        {renderEventActions(item)}
      </VendorMarketplaceCard>
    );
  };

  return (
    <VendorMarketplacePage
        title="Marketplace / Near Me"
        navigation={navigation}
        right={
          <TouchableOpacity
            activeOpacity={0.7}
            style={localStyles.headerBellButton}
            onPress={() => setNotificationsVisible(true)}
          >
            <MaterialIcons name="notifications" size={26} color={AppColor.primary} />
            {marketplaceNotifications.length ? (
              <View style={localStyles.notificationBadge}>
                <Text style={localStyles.notificationBadgeText}>
                  {marketplaceNotifications.length > 99
                    ? "99+"
                    : marketplaceNotifications.length}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
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
      <Modal
        animationType="fade"
        transparent
        visible={notificationsVisible}
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View style={localStyles.notificationOverlay}>
          <View style={localStyles.notificationCard}>
            <View style={localStyles.notificationHeader}>
              <Text style={localStyles.notificationTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setNotificationsVisible(false)}>
                <MaterialIcons name="close" size={22} color={AppColor.black} />
              </TouchableOpacity>
            </View>
            {marketplaceNotifications.length ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {marketplaceNotifications.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={localStyles.notificationRow}
                    onPress={() => openNotificationRow(item)}
                  >
                    <Text style={localStyles.notificationRowTitle}>
                      {item.title}
                    </Text>
                    <Text style={localStyles.notificationRowMeta}>
                      {item.event_name || item.subtitle}
                    </Text>
                    {item.event_name && item.subtitle ? (
                      <Text style={localStyles.notificationRowMeta}>
                        {item.subtitle}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={localStyles.notificationEmpty}>
                No notifications right now.
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </VendorMarketplacePage>
  );
};

const localStyles = StyleSheet.create({
  headerBellButton: {
    padding: 4,
  },
  notificationBadge: {
    alignItems: "center",
    backgroundColor: "#DC2626",
    borderRadius: 10,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 4,
    position: "absolute",
    right: -3,
    top: -2,
  },
  notificationBadgeText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 10,
  },
  notificationOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  notificationCard: {
    backgroundColor: AppColor.white,
    borderRadius: 8,
    maxHeight: "80%",
    padding: 16,
    width: "100%",
  },
  notificationHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  notificationTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 18,
  },
  notificationRow: {
    borderTopColor: AppColor.border,
    borderTopWidth: 1,
    paddingVertical: 12,
  },
  notificationRowTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 14,
  },
  notificationRowMeta: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 12,
    marginTop: 3,
  },
  notificationEmpty: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 14,
    paddingVertical: 18,
    textAlign: "center",
  },
});

export default VendorMarketplaceNearMeScreen;
