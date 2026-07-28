import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import StatusBarManager from "../components/StatusBarManager";
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
  MarketplaceHeader,
  formatDate,
  formatMoney,
  getEventImageUrl,
  getEventLocation,
  getPaymentAmount,
  getPaymentAmountLabel,
  getPaymentTypeLabel,
  getPrimaryActionLabel,
  isEventAccessError,
  isVendorPaysToAttendEvent,
  listText,
  styles,
} from "./vendorMarketplaceShared";

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
  const insets = useSafeAreaInsets();
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

  const openEventAction = (item) => {
    if (isVendorPaysToAttendEvent(item)) {
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

  const renderEvent = ({ item }) => {
    const imageUrl = getEventImageUrl(item);
    const vendorPays = isVendorPaysToAttendEvent(item);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.card}
        onPress={() => openEventDetails(item)}
      >
        <AppImage uri={imageUrl} containerStyle={styles.cardImage} />
        <View style={styles.rowBetween}>
          <Text style={[styles.title, { flex: 1, paddingRight: 8 }]}>
            {item.event_name}
          </Text>
          <View
            style={[
              styles.badge,
              vendorPays ? styles.paymentBadgeOrange : styles.paymentBadgeGreen,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                vendorPays
                  ? styles.paymentBadgeTextOrange
                  : styles.paymentBadgeTextGreen,
              ]}
            >
              {getPaymentTypeLabel(item)}
            </Text>
          </View>
        </View>
        <Text style={styles.subtitle} numberOfLines={2}>
          {item.event_description || "Event details available on the next screen."}
        </Text>
        <Text style={styles.meta}>
          {item.event_type || "Event"} | {getEventLocation(item)}
        </Text>
        <Text style={styles.meta}>
          {formatDate(item.event_date)} {item.event_time || ""}
        </Text>
        <Text style={styles.meta}>
          Estimated guests: {item.number_of_guests || "Not set"}
        </Text>
        <Text style={styles.meta}>
          {getPaymentAmountLabel(item)}: {formatMoney(getPaymentAmount(item))}
        </Text>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.button, { marginTop: 14 }]}
          onPress={() => openEventAction(item)}
        >
          <Text style={styles.buttonText}>{getPrimaryActionLabel(item)}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <MarketplaceHeader
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
      />
      {locked ? (
        <LockedMarketplace navigation={navigation} />
      ) : loading && !refreshing ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={AppColor.primary} size="large" />
        </View>
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
            <View style={styles.card}>
              <Text style={[styles.title, { textAlign: "center" }]}>
                No open events found
              </Text>
              <Text style={styles.emptyText}>
                Adjust your filters or check back as coordinators publish new
                events.
              </Text>
            </View>
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
    </View>
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
