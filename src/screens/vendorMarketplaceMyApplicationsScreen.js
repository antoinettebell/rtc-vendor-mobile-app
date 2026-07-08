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
import { getMarketplaceMyApplications_API } from "../api/appAPI";
import {
  MarketplaceHeader,
  formatDate,
  formatMoney,
  formatStatusLabel,
  getApplicationEvent,
  getEventLocation,
  isVendorPaysToAttendEvent,
  styles,
} from "./vendorMarketplaceShared";

const APPLICATION_STATUS_FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Under Review", value: "UNDER_REVIEW" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Payment Due", value: "PAYMENT_DUE" },
  { label: "Paid", value: "PAID" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Not Selected", value: "NOT_SELECTED" },
  { label: "Withdrawn", value: "WITHDRAWN" },
];

const getActionLabel = (status) => {
  switch (status) {
    case "DRAFT":
      return "Continue Application";
    case "ACCEPTED":
    case "PAYMENT_DUE":
      return "Pay Vendor Fee";
    case "PAID":
    case "CONFIRMED":
      return "View Confirmation";
    case "SUBMITTED":
    case "UNDER_REVIEW":
      return "View Application";
    default:
      return "View Details";
  }
};

const isEditableApplication = (application) =>
  ["DRAFT", "PENDING_SIGNATURE"].includes(
    String(application?.application_status || "DRAFT"),
  );

const VendorMarketplaceMyApplicationsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response = await getMarketplaceMyApplications_API();
      if (response?.success) {
        setApplications(response.data?.marketplaceApplicationList || []);
      }
    } catch (error) {
      console.log("Marketplace my applications error", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadApplications();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  };

  const filteredApplications = useMemo(
    () =>
      applications.filter((application) => {
        const event = getApplicationEvent(application);
        if (!isVendorPaysToAttendEvent(event)) {
          return false;
        }
        return (
          statusFilter === "ALL" ||
          application.application_status === statusFilter
        );
      }),
    [applications, statusFilter],
  );

  const renderApplication = ({ item }) => {
    const event = getApplicationEvent(item);
    const status = item.application_status || "DRAFT";
    const editable = isEditableApplication(item);
    const openApplication = () => {
      if (editable) {
        navigation.navigate("VendorApplicationScreen", {
          eventId: item.event_id || event?.event_id,
          application: item,
          event,
        });
        return;
      }

      const routeName =
        status === "ACCEPTED" || status === "PAYMENT_DUE"
          ? "VendorFeeCheckoutScreen"
          : "VendorApplicationDetailScreen";
      navigation.navigate(routeName, {
        application: item,
        event,
      });
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
                accessibilityLabel="Edit draft application"
                style={{ padding: 4, marginRight: 6 }}
                onPress={openApplication}
              >
                <MaterialIcons name="edit" size={22} color={AppColor.primary} />
              </TouchableOpacity>
            ) : null}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{formatStatusLabel(status)}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.meta}>
          {getEventLocation(event)} | {formatDate(event?.event_date)}
        </Text>
        <Text style={styles.meta}>
          Vendor Fee: {formatMoney(event?.vendor_fee)}
        </Text>
        <Text style={styles.meta}>
          Submitted Date:{" "}
          {item.submitted_at ? formatDate(item.submitted_at) : "Not submitted"}
        </Text>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.secondaryButton, { marginTop: 14 }]}
          onPress={openApplication}
        >
          <Text style={styles.secondaryButtonText}>{getActionLabel(status)}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <MarketplaceHeader title="My Applications" navigation={navigation} />
      {loading && !refreshing ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={AppColor.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredApplications}
          keyExtractor={(item) => item.application_id}
          renderItem={renderApplication}
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
                {APPLICATION_STATUS_FILTERS.map((filter) => {
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
                No applications yet
              </Text>
              <Text style={styles.emptyText}>
                Vendor-paid event applications will appear here after you apply.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default VendorMarketplaceMyApplicationsScreen;
