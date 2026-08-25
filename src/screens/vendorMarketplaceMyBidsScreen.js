import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
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
import {
  deleteMarketplaceBidDraft_API,
  getMarketplaceMyBids_API,
  withdrawMarketplaceBid_API,
} from "../api/appAPI";
import {
  MarketplaceHeader,
  formatDate,
  formatMoney,
  formatStatusLabel,
  getBidEvent,
  getEventLocation,
  isBidRevisionRequested,
  styles,
} from "./vendorMarketplaceShared";
import { getMarketplaceSubmissionDisplayStatus } from "../helpers/marketplaceSubmissionDisplay.helper";
import { VendorMarketplaceCard, VendorMarketplaceStatusBadge } from "../components/VendorMarketplacePrimitives";
import { matchesMarketplaceSubmissionStatus } from "../helpers/marketplaceSubmissionList.helper";
import { getMarketplaceEventSupportId } from "../helpers/marketplaceSupportId.helper";
import { getMarketplaceBidTotal } from "../helpers/marketplaceBidTotal.helper";

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
  ["DRAFT", "PENDING_SIGNATURE"].includes(String(bid?.bid_status || "DRAFT")) ||
  isBidRevisionRequested(bid);

const canWithdrawBid = (bid) =>
  ["SUBMITTED", "UNDER_REVIEW", "PENDING_SIGNATURE"].includes(
    String(bid?.bid_status || "").toUpperCase(),
  );

const canDeleteBidDraft = (bid) =>
  String(bid?.bid_status || "").toUpperCase() === "DRAFT";

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
      bids.filter((bid) =>
        matchesMarketplaceSubmissionStatus(bid.bid_status, statusFilter),
      ),
    [bids, statusFilter],
  );

  const withdrawBid = (bid) => {
    if (!bid?.bid_id) return;
    Alert.alert(
      "Withdraw Bid",
      "Withdraw this bid? The coordinator will see it as withdrawn and will not be able to award it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: async () => {
            try {
              await withdrawMarketplaceBid_API({ bid_id: bid.bid_id });
              await loadBids();
            } catch (error) {
              Alert.alert("Withdraw Failed", error?.message || "Please try again.");
            }
          },
        },
      ],
    );
  };

  const deleteDraftBid = (bid) => {
    if (!bid?.bid_id) return;
    Alert.alert(
      "Delete Draft",
      "Delete this draft and start over? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMarketplaceBidDraft_API({ bid_id: bid.bid_id });
              await loadBids();
            } catch (error) {
              Alert.alert("Delete Failed", error?.message || "Please try again.");
            }
          },
        },
      ],
    );
  };

  const renderBid = ({ item }) => {
    const event = getBidEvent(item);
    const specialtyUpdateAvailable = !!item.specialty_update_available_at;
    const editable = isEditableBid(item) || specialtyUpdateAvailable;
    const eventId = item.event_id || event?.event_id;
    const supportId = getMarketplaceEventSupportId(event, item);
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
      <VendorMarketplaceCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={[styles.title, { flex: 1, paddingRight: 8 }]}>
            {event?.event_name || item.event_id}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {editable ? (
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityLabel={
                  isBidRevisionRequested(item) ? "Revise bid" : specialtyUpdateAvailable ? "Update bid" : "Edit draft bid"
                }
                style={{ padding: 4, marginRight: 6 }}
                onPress={openBid}
              >
                <MaterialIcons name="edit" size={22} color={AppColor.primary} />
              </TouchableOpacity>
            ) : null}
            <VendorMarketplaceStatusBadge
              status={getMarketplaceSubmissionDisplayStatus(item, item.bid_status)}
            />
          </View>
        </View>
        <Text style={styles.meta}>
          {getEventLocation(event)} | {formatDate(event?.event_date)}
        </Text>
        {supportId ? <Text style={styles.meta}>Event ID: {supportId}</Text> : null}
        <Text style={styles.meta}>
          Event Budget: {formatMoney(event?.budgeted_amount)}
        </Text>
        <Text style={styles.meta}>
          Bid Amount: {formatMoney(item.full_bid_amount)}
        </Text>
        <Text style={styles.meta}>
          Total Bid Amount: {formatMoney(getMarketplaceBidTotal(item))}
        </Text>
        {specialtyUpdateAvailable ? <Text style={styles.meta}>Coordinator has made some additional changes: Dessert and Drinks are now needed.</Text> : null}
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
            {isBidRevisionRequested(item)
              ? "Revise Bid"
              : specialtyUpdateAvailable
                ? "Update Bid"
              : editable
                ? "Edit Draft"
                : "View Details"}
          </Text>
        </TouchableOpacity>
        {eventId ? (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.secondaryButton, { marginTop: 10 }]}
            onPress={() =>
              navigation.navigate("vendorMarketplaceMessagesScreen", {
                eventId,
                bidId: item.bid_id,
              })
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
        {canWithdrawBid(item) ? (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.secondaryButton,
              { marginTop: 10, borderColor: AppColor.red || "#D93025" },
            ]}
            onPress={() => withdrawBid(item)}
          >
            <MaterialIcons name="remove-circle-outline" size={18} color="#D93025" />
            <Text style={[styles.secondaryButtonText, { marginLeft: 8, color: "#D93025" }]}>
              Withdraw Bid
            </Text>
          </TouchableOpacity>
        ) : null}
        {canDeleteBidDraft(item) ? (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.secondaryButton,
              { marginTop: 10, borderColor: AppColor.red || "#D93025" },
            ]}
            onPress={() => deleteDraftBid(item)}
          >
            <MaterialIcons name="delete-outline" size={18} color="#D93025" />
            <Text style={[styles.secondaryButtonText, { marginLeft: 8, color: "#D93025" }]}>
              Delete Draft
            </Text>
          </TouchableOpacity>
        ) : null}
      </VendorMarketplaceCard>
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
