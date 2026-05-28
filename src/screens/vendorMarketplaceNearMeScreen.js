import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
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
import { AppColor } from "../utils/theme";
import { getMarketplaceOpenEvents_API } from "../api/appAPI";
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
        Accept Event Bookings is required before you can browse events or submit
        bids.
      </Text>
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.button, { marginTop: 18 }]}
        onPress={() => navigation.navigate("profileSubscriptionScreen")}
      >
        <Text style={styles.buttonText}>Manage Add-ons</Text>
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
  const [cityState, setCityState] = useState("");
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
    const locationFilter = cityState.trim().toLowerCase();
    const cuisineFilter = cuisine.trim().toLowerCase();

    return events.filter((event) => {
      const location = getEventLocation(event).toLowerCase();
      const eventCuisine = listText(event.cuisine_preferences).toLowerCase();

      return (
        (!locationFilter || location.includes(locationFilter)) &&
        (!eventType || event.event_type === eventType) &&
        (!cuisineFilter || eventCuisine.includes(cuisineFilter))
      );
    });
  }, [cityState, cuisine, eventType, events]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
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
            onPress={() => navigation.navigate("VendorMyBidsScreen")}
          >
            <MaterialIcons name="receipt-long" size={24} color={AppColor.primary} />
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
              <Text style={styles.label}>City or State</Text>
              <TextInput
                value={cityState}
                onChangeText={setCityState}
                placeholder="Filter by city/state"
                placeholderTextColor={AppColor.placeholderTextColor}
                style={styles.input}
              />
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
    </View>
  );
};

export default VendorMarketplaceNearMeScreen;
