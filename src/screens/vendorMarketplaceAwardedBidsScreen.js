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
import { getMarketplaceAwardedBids_API } from "../api/appAPI";
import {
  MarketplaceHeader,
  formatDate,
  formatMoney,
  getBidEvent,
  getEventLocation,
  styles,
} from "./vendorMarketplaceShared";

const VendorMarketplaceAwardedBidsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadBids = async () => {
    setLoading(true);
    try {
      const response = await getMarketplaceAwardedBids_API();
      if (response?.success) {
        setBids(response.data?.marketplaceBidList || []);
      }
    } catch (error) {
      console.log("Marketplace awarded bids error", error);
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
        <View style={styles.badge}>
          <Text style={styles.badgeText}>AWARDED</Text>
        </View>
        <Text style={[styles.title, { marginTop: 10 }]}>
          {event?.event_name || item.event_id}
        </Text>
        <Text style={styles.meta}>
          {getEventLocation(event)} | {formatDate(event?.event_date)}
        </Text>
        <Text style={styles.meta}>
          Award amount {formatMoney(item.full_bid_amount)}
        </Text>
        <Text style={styles.meta}>
          Next steps, coordinator contact release, and contract payment workflow
          are placeholders for the next phase.
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <MarketplaceHeader title="Awarded Bids" navigation={navigation} />
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
                No awarded bids yet
              </Text>
              <Text style={styles.emptyText}>
                Awarded event details will appear here after coordinators select
                your bid.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default VendorMarketplaceAwardedBidsScreen;
