import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor } from "../utils/theme";
import { getMarketplaceMyBids_API } from "../api/appAPI";
import {
  MarketplaceHeader,
  formatDate,
  formatMoney,
  formatStatusLabel,
  getBidEvent,
  getEventLocation,
  isVendorPaysToAttendEvent,
  styles,
} from "./vendorMarketplaceShared";

const BID_STATUS_FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Under Review", value: "UNDER_REVIEW" },
  { label: "Awarded", value: "AWARDED" },
  { label: "Not Selected", value: "NOT_AWARDED" },
  { label: "Withdrawn", value: "WITHDRAWN" },
];

const isEditableBid = (bid) =>
  ["DRAFT", "PENDING_SIGNATURE"].includes(String(bid?.bid_status || "DRAFT"));

const VendorMarketplaceMyBidsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadBids = async () => {
    setLoading(true);
    try {
      const response = await getMarketplaceMyBids_API();
      if (response?.success) {
        setBids(response.data?.marketplaceBidList || []);
      }
    } catch (error) {
      console.log("Marketplace my bids error", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBids();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBids();
    setRefreshing(false);
  };

  const filteredBids = useMemo(
    () =>
      bids.filter((bid) => {
        const event = getBidEvent(bid);
        if (isVendorPaysToAttendEvent(event)) {
          return false;
        }
        return statusFilter === "ALL" || bid.bid_status === statusFilter;
      }),
    [bids, statusFilter],
  );

  const renderBid = ({ item }) => {
    const event = getBidEvent(item);
    const editable = isEditableBid(item);
    const eventId = item.event_id || event?.event_id;
    const openBid = () => {
      if (editable) {
        navigation.navigate("VendorBidResponseScreen", {
          eventId,
          bid: item,
          event,
        });
        return;
      }
      if (eventId) {
        navigation.navigate("VendorBidDetailScreen", {
          bid: item,
          event,
        });
      }
    };

    return (
      <View style={styles.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={[styles.title, { flex: 1, paddingRight: 8 }]}>
            {event?.event_name || item.event_id}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {editable ? (
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityLabel="Edit draft bid"
                style={{ padding: 4, marginRight: 6 }}
                onPress={openBid}
              >
                <MaterialIcons name="edit" size={22} color={AppColor.primary} />
              </TouchableOpacity>
            ) : null}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {formatStatusLabel(item.bid_status)}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.meta}>
          {getEventLocation(event)} | {formatDate(event?.event_date)}
        </Text>
        <Text style={styles.meta}>
          Event Budget: {formatMoney(event?.budgeted_amount)}
        </Text>
        <Text style={styles.meta}>
          Bid Amount: {formatMoney(item.full_bid_amount)}
        </Text>
        <Text style={styles.meta}>
          Submitted Date:{" "}
          {item.submitted_at ? formatDate(item.submitted_at) : "Not submitted"}
        </Text>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.secondaryButton, { marginTop: 14 }]}
          onPress={openBid}
        >
          <Text style={styles.secondaryButtonText}>
            {editable ? "Edit Draft" : "View Details"}
          </Text>
        </TouchableOpacity>
        {eventId ? (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.secondaryButton, { marginTop: 10 }]}
            onPress={() =>
              navigation.navigate("vendorMarketplaceMessagesScreen", { eventId })
            }
          >
            <MaterialIcons
              name="chat-bubble-outline"
              size={18}
              color={AppColor.primary}
            />
            <Text style={[styles.secondaryButtonText, { marginLeft: 8 }]}>
              Messages
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <MarketplaceHeader title="My Bids" navigation={navigation} />
      {loading && !refreshing ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={AppColor.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredBids}
          keyExtractor={(item) => item.bid_id}
          renderItem={renderBid}
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
              <Text style={styles.label}>Status</Text>
              <View style={styles.chipWrap}>
                {BID_STATUS_FILTERS.map((filter) => {
                  const active = statusFilter === filter.value;
                  return (
                    <TouchableOpacity
                      key={filter.value}
                      activeOpacity={0.7}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setStatusFilter(filter.value)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.card}>
              <Text style={[styles.title, { textAlign: "center" }]}>
                No bids yet
              </Text>
              <Text style={styles.emptyText}>
                Browse open marketplace events and submit your first bid.
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.button, { marginTop: 18 }]}
                onPress={() => navigation.navigate("vendorMarketplaceScreen")}
              >
                <Text style={styles.buttonText}>Browse Events</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
};

export default VendorMarketplaceMyBidsScreen;
