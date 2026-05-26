import React, { useCallback, useState } from "react";
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
import StatusBarManager from "../components/StatusBarManager";
import { AppColor } from "../utils/theme";
import { getMarketplaceMyBids_API } from "../api/appAPI";
import {
  MarketplaceHeader,
  formatDate,
  formatMoney,
  getBidEvent,
  getEventLocation,
  styles,
} from "./vendorMarketplaceShared";

const VendorMarketplaceMyBidsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const renderBid = ({ item }) => {
    const event = getBidEvent(item);
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.card}
        onPress={() =>
          event?.event_id
            ? navigation.navigate("vendorMarketplaceEventDetailsScreen", {
                eventId: event.event_id,
              })
            : null
        }
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={[styles.title, { flex: 1, paddingRight: 8 }]}>
            {event?.event_name || item.event_id}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.bid_status}</Text>
          </View>
        </View>
        <Text style={styles.meta}>
          {getEventLocation(event)} | {formatDate(event?.event_date)}
        </Text>
        <Text style={styles.meta}>
          Submitted amount {formatMoney(item.full_bid_amount)}
          {item.price_per_guest != null
            ? ` | ${formatMoney(item.price_per_guest)} per guest`
            : ""}
        </Text>
      </TouchableOpacity>
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
          data={bids}
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
