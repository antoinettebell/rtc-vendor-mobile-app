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
import {
  getMarketplaceAwardedBids_API,
  getMarketplaceMyApplications_API,
} from "../api/appAPI";
import {
  MARKETPLACE_PAYMENT_TYPES,
  MarketplaceHeader,
  formatDate,
  formatMoney,
  formatStatusLabel,
  getApplicationEvent,
  getBidEvent,
  getEventLocation,
  getPaymentTypeLabel,
  isVendorPaysToAttendEvent,
  styles,
} from "./vendorMarketplaceShared";

const TIME_FILTERS = [
  { label: "Upcoming", value: "UPCOMING" },
  { label: "Past", value: "PAST" },
];

const PAYMENT_FILTERS = [
  { label: "All", value: "ALL" },
  {
    label: "Coordinator Pays Vendor",
    value: MARKETPLACE_PAYMENT_TYPES.COORDINATOR_PAYS_VENDOR,
  },
  {
    label: "Vendor Pays to Attend",
    value: MARKETPLACE_PAYMENT_TYPES.VENDOR_PAYS_TO_ATTEND,
  },
];

const ACCEPTED_APPLICATION_STATUSES = [
  "ACCEPTED",
  "PAYMENT_DUE",
  "PAID",
  "CONFIRMED",
];

const isPaidApplication = (application) =>
  application?.payment_status === "PAID" ||
  application?.application_status === "PAID" ||
  application?.application_status === "CONFIRMED" ||
  (application?.transaction_id && application?.payment_status === "PAID");

const canPayApplication = (application) =>
  ["ACCEPTED", "PAYMENT_DUE"].includes(application?.application_status) &&
  !isPaidApplication(application);

const getApplicationDisplayStatus = (application) => {
  if (application?.application_status === "CONFIRMED") {
    return "Confirmed";
  }
  if (isPaidApplication(application)) {
    return "Paid";
  }
  return formatStatusLabel(application?.application_status || "ACCEPTED");
};

const getBidPayoutStatus = (bid, event) => {
  if (bid?.final_payment_status === "PAID") {
    return "Paid to Vendor";
  }
  if (["PENDING", "FAILED"].includes(bid?.final_payment_status)) {
    return "Awaiting Coordinator Payment";
  }
  if (bid?.final_payment_status === "PROCESSING") {
    return "Payment Processing";
  }
  const explicitStatus =
    bid?.payout_status ||
    bid?.vendor_payout_status ||
    bid?.payment_status ||
    event?.award_payment_status;

  switch (explicitStatus) {
    case "PAID_TO_VENDOR":
      return "Paid to Vendor";
    case "PAYOUT_PROCESSING":
    case "PROCESSING":
      return "Payout Processing";
    case "PAID":
      return "Coordinator Paid";
    case "PENDING":
    case "NOT_REQUIRED":
    default:
      return "Pending Event Closing";
  }
};

const buildAwardItems = (bids, applications) => {
  const bidItems = bids.map((bid) => {
    const event = getBidEvent(bid);
    return {
      id: `bid-${bid.bid_id}`,
      recordType: "BID",
      paymentType: MARKETPLACE_PAYMENT_TYPES.COORDINATOR_PAYS_VENDOR,
      event,
      bid,
      statusLabel: getBidPayoutStatus(bid, event),
      eventDate: event?.event_date,
    };
  });

  const applicationItems = applications
    .filter((application) =>
      ACCEPTED_APPLICATION_STATUSES.includes(application.application_status),
    )
    .map((application) => {
      const event = getApplicationEvent(application);
      return {
        id: `application-${application.application_id}`,
        recordType: "APPLICATION",
        paymentType: MARKETPLACE_PAYMENT_TYPES.VENDOR_PAYS_TO_ATTEND,
        event,
        application,
        statusLabel: getApplicationDisplayStatus(application),
        eventDate: event?.event_date,
      };
    });

  return [...bidItems, ...applicationItems].sort((a, b) => {
    const aTime = new Date(a.eventDate || 0).getTime();
    const bTime = new Date(b.eventDate || 0).getTime();
    return aTime - bTime;
  });
};

const isPastEvent = (eventDate) => {
  if (!eventDate) {
    return false;
  }
  const eventTime = new Date(eventDate).getTime();
  if (Number.isNaN(eventTime)) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventTime < today.getTime();
};

const PaymentTypeBadge = ({ item }) => {
  const isVendorPays = item.paymentType === MARKETPLACE_PAYMENT_TYPES.VENDOR_PAYS_TO_ATTEND;
  return (
    <View
      style={[
        styles.badge,
        isVendorPays ? styles.paymentBadgeOrange : styles.paymentBadgeGreen,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          isVendorPays
            ? styles.paymentBadgeTextOrange
            : styles.paymentBadgeTextGreen,
        ]}
      >
        {getPaymentTypeLabel(item.event)}
      </Text>
    </View>
  );
};

const VendorMarketplaceAwardedBidsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [bids, setBids] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState("UPCOMING");
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  const loadAwardedEvents = async () => {
    setLoading(true);
    try {
      const [bidsResponse, applicationsResponse] = await Promise.all([
        getMarketplaceAwardedBids_API(),
        getMarketplaceMyApplications_API(),
      ]);

      if (bidsResponse?.success) {
        setBids(bidsResponse.data?.marketplaceBidList || []);
      }
      if (applicationsResponse?.success) {
        setApplications(
          applicationsResponse.data?.marketplaceApplicationList || [],
        );
      }
    } catch (error) {
      console.log("Marketplace awarded events error", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAwardedEvents();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAwardedEvents();
    setRefreshing(false);
  };

  const awardedItems = useMemo(
    () =>
      buildAwardItems(bids, applications).filter((item) => {
        const matchesTime =
          timeFilter === "PAST"
            ? isPastEvent(item.eventDate)
            : !isPastEvent(item.eventDate);
        const matchesPayment =
          paymentFilter === "ALL" || item.paymentType === paymentFilter;
        return matchesTime && matchesPayment;
      }),
    [applications, bids, paymentFilter, timeFilter],
  );

  const openDetails = (item) => {
    navigation.navigate("VendorAwardedEventDetailsScreen", {
      itemType: item.recordType,
      bid: item.bid,
      application: item.application,
      event: item.event,
    });
  };

  const handlePrimaryAction = (item) => {
    if (item.recordType === "APPLICATION" && canPayApplication(item.application)) {
      navigation.navigate("VendorFeeCheckoutScreen", {
        application: item.application,
        event: item.event,
      });
      return;
    }

    openDetails(item);
  };

  const getActionLabel = (item) => {
    if (item.recordType === "BID") {
      return "View Award Details";
    }
    if (canPayApplication(item.application)) {
      return "Pay Vendor Fee";
    }
    return "View Confirmation";
  };

  const renderAwardedEvent = ({ item }) => {
    const event = item.event || {};
    const eventId =
      event.event_id || item.bid?.event_id || item.application?.event_id || null;
    const isVendorPays =
      item.paymentType === MARKETPLACE_PAYMENT_TYPES.VENDOR_PAYS_TO_ATTEND;
    return (
      <TouchableOpacity
        activeOpacity={0.86}
        style={styles.card}
        onPress={() => openDetails(item)}
      >
        <View style={styles.rowBetween}>
          <PaymentTypeBadge item={item} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.statusLabel}</Text>
          </View>
        </View>
        <Text style={[styles.title, { marginTop: 12 }]}>
          {event.event_name || "Marketplace Event"}
        </Text>
        <Text style={styles.meta}>
          {getEventLocation(event)} | {formatDate(event.event_date)}
        </Text>
        <Text style={styles.meta}>
          {isVendorPays
            ? `Vendor Fee: ${formatMoney(event.vendor_fee)}`
            : `Your Bid Amount: ${formatMoney(item.bid?.full_bid_amount)}`}
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.button, { marginTop: 14 }]}
          onPress={() => handlePrimaryAction(item)}
        >
          <Text style={styles.buttonText}>{getActionLabel(item)}</Text>
        </TouchableOpacity>
        {eventId ? (
          <TouchableOpacity
            activeOpacity={0.8}
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
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <MarketplaceHeader title="Awarded Events" navigation={navigation} />
      {loading && !refreshing ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={AppColor.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={awardedItems}
          keyExtractor={(item) => item.id}
          renderItem={renderAwardedEvent}
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
              <Text style={styles.label}>Timeline</Text>
              <View style={styles.chipWrap}>
                {TIME_FILTERS.map((filter) => {
                  const active = timeFilter === filter.value;
                  return (
                    <TouchableOpacity
                      key={filter.value}
                      activeOpacity={0.8}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setTimeFilter(filter.value)}
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

              <Text style={styles.label}>Payment Type</Text>
              <View style={styles.chipWrap}>
                {PAYMENT_FILTERS.map((filter) => {
                  const active = paymentFilter === filter.value;
                  return (
                    <TouchableOpacity
                      key={filter.value}
                      activeOpacity={0.8}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setPaymentFilter(filter.value)}
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
                No awarded or accepted events
              </Text>
              <Text style={styles.emptyText}>
                Awarded bid events and accepted vendor applications will appear
                here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default VendorMarketplaceAwardedBidsScreen;
