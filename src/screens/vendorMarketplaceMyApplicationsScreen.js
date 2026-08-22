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
  deleteMarketplaceApplicationDraft_API,
  getMarketplaceMyApplications_API,
  withdrawMarketplaceApplication_API,
} from "../api/appAPI";
import {
  MarketplaceHeader,
  formatDate,
  formatMoney,
  formatStatusLabel,
  getApplicationEvent,
  getEventLocation,
  isApplicationRevisionRequested,
  styles,
} from "./vendorMarketplaceShared";
import { getMarketplaceSubmissionDisplayStatus } from "../helpers/marketplaceSubmissionDisplay.helper";
import { VendorMarketplaceCard, VendorMarketplaceStatusBadge } from "../components/VendorMarketplacePrimitives";
import { matchesMarketplaceSubmissionStatus } from "../helpers/marketplaceSubmissionList.helper";
import {
  canPayMarketplaceVendorFee,
  isMarketplaceVendorFeePaid,
} from "../helpers/marketplaceVendorFeeState.helper";
import { getMarketplaceEventSupportId } from "../helpers/marketplaceSupportId.helper";

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

const getActionLabel = (application) => {
  const status = String(application?.application_status || "DRAFT").toUpperCase();
  if (isMarketplaceVendorFeePaid(application)) {
    return "View Confirmation";
  }
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
  ) || isApplicationRevisionRequested(application);

const canWithdrawApplication = (application) =>
  ["SUBMITTED", "UNDER_REVIEW", "PENDING_SIGNATURE"].includes(
    String(application?.application_status || "").toUpperCase(),
  );

const canDeleteApplicationDraft = (application) =>
  String(application?.application_status || "").toUpperCase() === "DRAFT";

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
      applications.filter((application) =>
        matchesMarketplaceSubmissionStatus(
          application.application_status,
          statusFilter,
        ),
      ),
    [applications, statusFilter],
  );

  const withdrawApplication = (application) => {
    if (!application?.application_id) return;
    Alert.alert(
      "Withdraw Application",
      "Withdraw this application? The coordinator will see it as withdrawn and will not be able to select it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: async () => {
            try {
              await withdrawMarketplaceApplication_API({
                application_id: application.application_id,
              });
              await loadApplications();
            } catch (error) {
              Alert.alert("Withdraw Failed", error?.message || "Please try again.");
            }
          },
        },
      ],
    );
  };

  const deleteDraftApplication = (application) => {
    if (!application?.application_id) return;
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
              await deleteMarketplaceApplicationDraft_API({
                application_id: application.application_id,
              });
              await loadApplications();
            } catch (error) {
              Alert.alert("Delete Failed", error?.message || "Please try again.");
            }
          },
        },
      ],
    );
  };

  const renderApplication = ({ item }) => {
    const event = getApplicationEvent(item);
    const status = item.application_status || "DRAFT";
    const editable = isEditableApplication(item);
    const eventId = item.event_id || event?.event_id;
    const supportId = getMarketplaceEventSupportId(event, item);
    const unreadMessageCount = Number(item.unread_message_count || 0);
    const openApplication = () => {
      if (editable) {
        navigation.navigate("VendorApplicationScreen", {
          eventId,
          application: item,
          event,
        });
        return;
      }

      const routeName =
        canPayMarketplaceVendorFee(item)
          ? "VendorFeeCheckoutScreen"
          : "VendorApplicationDetailScreen";
      navigation.navigate(routeName, {
        application: item,
        event,
      });
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
                  isApplicationRevisionRequested(item)
                    ? "Revise application"
                    : "Edit draft application"
                }
                style={{ padding: 4, marginRight: 6 }}
                onPress={openApplication}
              >
                <MaterialIcons name="edit" size={22} color={AppColor.primary} />
              </TouchableOpacity>
            ) : null}
            <VendorMarketplaceStatusBadge
              status={getMarketplaceSubmissionDisplayStatus(item, status)}
            />
          </View>
        </View>
        <Text style={styles.meta}>
          {getEventLocation(event)} | {formatDate(event?.event_date)}
        </Text>
        {supportId ? <Text style={styles.meta}>Event ID: {supportId}</Text> : null}
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
          <Text style={styles.secondaryButtonText}>
            {isApplicationRevisionRequested(item)
              ? "Revise Application"
              : getActionLabel(item)}
          </Text>
        </TouchableOpacity>
        {eventId ? (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.secondaryButton, { marginTop: 10 }]}
            onPress={() =>
              navigation.navigate("vendorMarketplaceMessagesScreen", {
                eventId,
                applicationId: item.application_id,
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
            {unreadMessageCount > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginLeft: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                  backgroundColor: AppColor.primary,
                }}
              >
                <MaterialIcons name="notifications" size={14} color="#FFFFFF" />
                <Text
                  style={{
                    marginLeft: 4,
                    color: "#FFFFFF",
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ) : null}
        {canWithdrawApplication(item) ? (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.secondaryButton,
              { marginTop: 10, borderColor: AppColor.red || "#D93025" },
            ]}
            onPress={() => withdrawApplication(item)}
          >
            <MaterialIcons name="remove-circle-outline" size={18} color="#D93025" />
            <Text style={[styles.secondaryButtonText, { marginLeft: 8, color: "#D93025" }]}>
              Withdraw Application
            </Text>
          </TouchableOpacity>
        ) : null}
        {canDeleteApplicationDraft(item) ? (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.secondaryButton,
              { marginTop: 10, borderColor: AppColor.red || "#D93025" },
            ]}
            onPress={() => deleteDraftApplication(item)}
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
