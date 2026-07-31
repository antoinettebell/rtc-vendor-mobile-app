import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { onSignOut } from "../redux/slices/authSlice";
import { clearUserSlice } from "../redux/slices/userSlice";
import { clearFoodTruckProfileSlice } from "../redux/slices/foodTruckProfileSlice";
import { clearPushNotificationRedux } from "../redux/slices/pushNotificationSlice";
import {
  getEmployeeDashboard_API,
  getEmployeeOrders_API,
  getRefundCancelRequests_API,
  submitRefundCancelRequest_API,
  updateOrderStatusByID_API,
} from "../api/appAPI";
import { printOrderTickets } from "../helpers/print.helper";
import { getVendorOrderTotal } from "../helpers/order.helper";
import { orderStatusStrings } from "../utils/constants";
import { AppColor, Mulish400, Mulish600, Mulish700 } from "../utils/theme";

const ACTIVE_ORDER_STATUSES = [
  orderStatusStrings.placed,
  orderStatusStrings.accepted,
  orderStatusStrings.preparing,
  orderStatusStrings.ready_for_pickup,
  orderStatusStrings.driver_picked_up,
  orderStatusStrings.completed,
];

const ORDER_BUCKETS = [
  {
    label: "Preparing",
    value: "preparing",
    statuses: [
      orderStatusStrings.placed,
      orderStatusStrings.accepted,
      orderStatusStrings.preparing,
    ],
  },
  {
    label: "Ready for Pickup",
    value: "ready",
    statuses: [
      orderStatusStrings.ready_for_pickup,
      orderStatusStrings.driver_picked_up,
    ],
  },
  {
    label: "Completed",
    value: "completed",
    statuses: [orderStatusStrings.completed],
  },
];

const REFUND_BUCKETS = [
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

const REQUEST_REASONS = [
  "customer changed mind",
  "wrong item entered",
  "duplicate order",
  "payment issue",
  "food unavailable",
  "customer complaint",
  "other",
];
const PAID_PAYMENT_STATUSES = ["PAID", "COMPLETED", "CAPTURED"];
const POST_PICKUP_STATUSES = [
  orderStatusStrings.driver_picked_up,
  orderStatusStrings.delivered,
  orderStatusStrings.completed,
];
const TEN_MINUTES_MS = 10 * 60 * 1000;
const SHIFT_ENDED_MESSAGE =
  "Your shift has ended. Please see your manager to be clocked back in.";
const SHIFT_NOT_STARTED_MESSAGE =
  "You are not currently clocked in. Please start your shift to continue.";
const SHIFT_ON_BREAK_MESSAGE =
  "Your shift is paused for break. Please resume your shift to log back in.";

const isCashPayment = (order) =>
  ["CASH", "COD"].includes(
    String(order?.paymentMethod || order?.payment_method || "").toUpperCase(),
  );

const isPaidOrPickedUp = (order) =>
  PAID_PAYMENT_STATUSES.includes(String(order?.paymentStatus || "").toUpperCase()) ||
  POST_PICKUP_STATUSES.includes(order?.orderStatus);

const getCompletedAt = (order) =>
  order?.completed_at || order?.statusTime?.completedAt || null;

const isCompletedRefundWindowExpired = (order) => {
  if (order?.orderStatus !== orderStatusStrings.completed) return false;
  const completedAt = getCompletedAt(order);
  if (!completedAt) return false;
  const completedDate = new Date(completedAt);
  if (Number.isNaN(completedDate.getTime())) return false;
  return Date.now() - completedDate.getTime() > TEN_MINUTES_MS;
};

const getAvailableRequestTypes = (order) =>
  isPaidOrPickedUp(order) ? ["REFUND"] : ["REFUND", "CANCEL"];

const getAvailableReasons = (order, requestType) =>
  REQUEST_REASONS.filter(
    (reason) =>
      !(
        requestType === "REFUND" &&
        isCashPayment(order) &&
        reason === "payment issue"
      ),
  );

const formatMoney = (value) => {
  const amount = Number(value);
  return `$${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`;
};

const StatCard = ({ label, value }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const EmployeeSessionScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.userReducer.user);
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [requestModalOrder, setRequestModalOrder] = useState(null);
  const [requestType, setRequestType] = useState("REFUND");
  const [reasonCode, setReasonCode] = useState(REQUEST_REASONS[0]);
  const [employeeNotes, setEmployeeNotes] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [selectedOrderBucket, setSelectedOrderBucket] = useState("preparing");
  const [selectedRefundBucket, setSelectedRefundBucket] = useState("PENDING");

  const foodTruck = user?.foodTruck;
  const assignedLocation = user?.assignedLocation;
  const assignedTruckUnit = dashboard?.assignedTruckUnit || user?.assignedTruckUnit;
  const capabilities = user?.employeeCapabilities || {};
  const canTapToPay = !!capabilities.tapToPay;
  const isShiftActive = !!dashboard?.shift?.is_active;
  const isOnBreak = dashboard?.shift?.shift_status === "ON_BREAK";
  const hasEndedCurrentOperationalDayShift =
    !!dashboard?.shift?.ended_at && !isShiftActive;
  const locationIsOpen =
    (assignedTruckUnit?.open_locations || []).some(
      (location) =>
        location?.locationId?.toString() === assignedLocation?._id?.toString() &&
        location?.isOrderingOpen,
    );

  const employeeName = useMemo(
    () =>
      [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
      "Employee",
    [user?.first_name, user?.last_name],
  );

  const loadOrders = useCallback(async () => {
    try {
      const response = await getEmployeeOrders_API({
        status: ACTIVE_ORDER_STATUSES.join(","),
      });

      if (response?.success && response?.data?.orderList) {
        setOrders(response.data.orderList);
      }
    } catch (error) {
      Alert.alert(
        "Orders unavailable",
        error?.message || "Could not load orders.",
      );
    }
  }, []);

  const loadRequests = useCallback(async () => {
    const response = await getRefundCancelRequests_API();
    if (response?.success && response?.data?.requests) {
      setRequests(response.data.requests);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    const response = await getEmployeeDashboard_API();
    if (response?.success && response?.data?.dashboard) {
      const nextDashboard = response.data.dashboard;
      setDashboard(nextDashboard);
      return nextDashboard;
    }
    return null;
  }, []);

  const refreshDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const nextDashboard = await loadDashboard();
      if (
        nextDashboard?.shift?.is_active &&
        nextDashboard?.shift?.shift_status !== "ON_BREAK"
      ) {
        await Promise.all([loadOrders(), loadRequests()]);
      } else {
        setOrders([]);
        setRequests([]);
      }
    } catch (error) {
      Alert.alert(
        "Dashboard unavailable",
        error?.message || "Could not load employee dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, [loadDashboard, loadOrders, loadRequests]);

  const runShiftProtectedAction = useCallback(
    (action) => {
      if (!isShiftActive || isOnBreak) {
        if (isOnBreak) {
          Alert.alert("Shift paused", SHIFT_ON_BREAK_MESSAGE);
          return;
        }
        Alert.alert(
          hasEndedCurrentOperationalDayShift ? "Shift ended" : "Shift not started",
          hasEndedCurrentOperationalDayShift
            ? SHIFT_ENDED_MESSAGE
            : SHIFT_NOT_STARTED_MESSAGE,
        );
        return;
      }
      action();
    },
    [hasEndedCurrentOperationalDayShift, isOnBreak, isShiftActive],
  );

  useFocusEffect(
    useCallback(() => {
      refreshDashboard();
    }, [refreshDashboard]),
  );

  const handleSignOut = () => {
    dispatch(clearUserSlice());
    dispatch(clearFoodTruckProfileSlice());
    dispatch(clearPushNotificationRedux());
    dispatch(onSignOut());
  };

  const getNextOrderStatus = (status) => {
    if (
      [orderStatusStrings.placed, orderStatusStrings.accepted].includes(status)
    ) {
      return orderStatusStrings.preparing;
    }
    if (status === orderStatusStrings.preparing) {
      return orderStatusStrings.ready_for_pickup;
    }
    if (
      [
        orderStatusStrings.ready_for_pickup,
        orderStatusStrings.driver_picked_up,
      ].includes(status)
    ) {
      return orderStatusStrings.completed;
    }
    return null;
  };

  const getNextOrderStatusLabel = (status) => {
    const next = getNextOrderStatus(status);
    if (next === orderStatusStrings.preparing) return "Start Preparing";
    if (next === orderStatusStrings.ready_for_pickup) return "Mark Ready";
    if (next === orderStatusStrings.completed) return "Complete";
    return null;
  };

  const updateOrderStatus = async (order, nextStatus) => {
    if (!nextStatus) return;
    setActionLoadingId(order?._id);
    try {
      const response = await updateOrderStatusByID_API({
        order_id: order?._id,
        payload: { orderStatus: nextStatus },
      });

      if (response?.success) {
        await Promise.all([loadOrders(), loadDashboard()]);
      }
    } catch (error) {
      Alert.alert(
        "Order update failed",
        error?.message || "Could not update order.",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePrintOrder = (order) => {
    Alert.alert(
      "Print order?",
      `Open printer options for order #${order?.orderNumber || order?._id}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Print",
          onPress: async () => {
            try {
              await printOrderTickets([order]);
            } catch (error) {
              Alert.alert(
                "Print unavailable",
                error?.message || "Could not print receipt.",
              );
            }
          },
        },
      ],
    );
  };

  const getOrderRequest = useCallback(
    (orderId) =>
      requests.find(
        (request) =>
          request.order_id?.toString?.() === orderId?.toString?.() ||
          request.order_id === orderId,
      ),
    [requests],
  );

  const openRequestModal = (order) => {
    const existingRequest = getOrderRequest(order?._id);
    if (existingRequest) {
      Alert.alert(
        "Request already submitted",
        `Status: ${existingRequest.request_status}${
          existingRequest.vendor_response_notes
            ? `\n\nVendor note: ${existingRequest.vendor_response_notes}`
            : ""
        }`,
      );
      return;
    }

    if (isCompletedRefundWindowExpired(order)) {
      Alert.alert(
        "Refund unavailable",
        "Employees can only request a refund within 10 minutes after completion.",
      );
      return;
    }

    setRequestModalOrder(order);
    const nextRequestType = getAvailableRequestTypes(order)[0];
    setRequestType(nextRequestType);
    setReasonCode(getAvailableReasons(order, nextRequestType)[0]);
    setEmployeeNotes("");
  };

  const submitRequest = async () => {
    if (!requestModalOrder?._id) {
      return;
    }
    if (reasonCode === "other" && !employeeNotes.trim()) {
      Alert.alert("Notes required", "Please add notes when reason is other.");
      return;
    }

    setRequestSubmitting(true);
    try {
      const response = await submitRefundCancelRequest_API({
        order_id: requestModalOrder._id,
        request_type: requestType,
        reason_code: reasonCode,
        employee_notes: employeeNotes,
      });

      await Promise.all([loadDashboard(), loadRequests()]);
      setRequestModalOrder(null);
      Alert.alert(
        response?.data?.existing ? "Existing request" : "Request submitted",
        response?.data?.existing
          ? "This order already has a refund/cancel request."
          : "The vendor has been notified for review.",
      );
    } catch (error) {
      Alert.alert(
        "Request failed",
        error?.message || "Could not submit this request.",
      );
    } finally {
      setRequestSubmitting(false);
    }
  };

  const renderOrder = ({ item }) => {
    const nextStatus = getNextOrderStatus(item?.orderStatus);
    const nextStatusLabel = getNextOrderStatusLabel(item?.orderStatus);
    const isRefundPending = item?.refundStatus === "PENDING";
    const canRequestRefundCancel =
      !getOrderRequest(item?._id) && !isCompletedRefundWindowExpired(item);

    return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.orderCard}
      onPress={() => {
        if (nextStatus) {
          Alert.alert(
            "Update order status?",
            `Move order #${item?.orderNumber || item?._id} to ${nextStatusLabel}?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: nextStatusLabel,
                onPress: () => updateOrderStatus(item, nextStatus),
              },
            ],
          );
        }
      }}
    >
      {(() => {
        const existingRequest = getOrderRequest(item?._id);
        return existingRequest ? (
          <Text style={styles.requestStatusNotice}>
            Request {existingRequest.request_status.toLowerCase()}
          </Text>
        ) : null;
      })()}
      <View style={styles.orderHeader}>
        <Text style={styles.orderTitle}>
          Order #{item?.orderNumber || item?._id}
        </Text>
        <Text style={styles.orderStatus}>
          {isRefundPending ? "Refund Pending" : item?.orderStatus}
        </Text>
      </View>
      <Text style={styles.orderMeta}>
        {(item?.items || []).length} items | $
        {getVendorOrderTotal(item).toFixed(2)}
      </Text>
      {(item?.items || []).length ? (
        <View style={styles.orderItemsBox}>
          {(item.items || []).map((orderItem, index) => (
            <Text
              key={`${item?._id || "order"}-${orderItem?._id || index}`}
              style={styles.orderItemLine}
            >
              {orderItem?.qty || orderItem?.quantity || 1}x{" "}
              {orderItem?.menuItem?.name ||
                orderItem?.name ||
                orderItem?.menuItemId?.name ||
                "Menu item"}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={styles.orderActions}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.secondaryButton}
          onPress={() => handlePrintOrder(item)}
        >
          <MaterialCommunityIcons
            name="printer"
            size={18}
            color={AppColor.black}
          />
          <Text style={styles.secondaryButtonText}>Print</Text>
        </TouchableOpacity>
        {nextStatus && !isRefundPending ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.primarySmallButton}
            disabled={actionLoadingId === item?._id}
            onPress={() => updateOrderStatus(item, nextStatus)}
          >
            <Text style={styles.primarySmallButtonText}>
              {actionLoadingId === item?._id ? "Updating..." : nextStatusLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.dangerButton,
            !canRequestRefundCancel && styles.disabledButton,
          ]}
          disabled={!canRequestRefundCancel}
          onPress={() => openRequestModal(item)}
        >
          <Text style={styles.dangerButtonText}>
            {isPaidOrPickedUp(item) ? "Request Refund" : "Request Refund/Cancel"}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
    );
  };

  const metrics = dashboard?.metrics || {};
  const displayedLocation = dashboard?.assignedLocation || assignedLocation;
  const displayedTruckName =
    assignedTruckUnit?.name || foodTruck?.name || "Food truck";
  const displayedLocationOpen =
    dashboard?.location?.is_open !== undefined
      ? dashboard.location.is_open
      : locationIsOpen;
  const selectedOrderBucketConfig =
    ORDER_BUCKETS.find((bucket) => bucket.value === selectedOrderBucket) ||
    ORDER_BUCKETS[0];
  const filteredOrders = orders.filter((order) =>
    selectedOrderBucketConfig.statuses.includes(order?.orderStatus),
  );
  const refundBucketCounts = REFUND_BUCKETS.reduce((counts, bucket) => {
    counts[bucket.value] = requests.filter(
      (request) =>
        String(request.request_status || "").toUpperCase() === bucket.value,
    ).length;
    return counts;
  }, {});
  const selectedRefundRequests = requests.filter(
    (request) =>
      String(request.request_status || "").toUpperCase() === selectedRefundBucket,
  );

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        animationType="slide"
        transparent
        visible={!!requestModalOrder}
        onRequestClose={() => setRequestModalOrder(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Refund/Cancel Request</Text>
            <Text style={styles.modalMeta}>
              Order #{requestModalOrder?.orderNumber || requestModalOrder?._id}
            </Text>

            <View style={styles.segmentRow}>
              {getAvailableRequestTypes(requestModalOrder).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.segmentButton,
                    requestType === type && styles.segmentButtonSelected,
                  ]}
                  onPress={() => {
                    setRequestType(type);
                    const reasons = getAvailableReasons(requestModalOrder, type);
                    if (!reasons.includes(reasonCode)) {
                      setReasonCode(reasons[0]);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      requestType === type && styles.segmentButtonTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Reason</Text>
            <View style={styles.reasonWrap}>
              {getAvailableReasons(requestModalOrder, requestType).map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonChip,
                    reasonCode === reason && styles.reasonChipSelected,
                  ]}
                  onPress={() => setReasonCode(reason)}
                >
                  <Text
                    style={[
                      styles.reasonChipText,
                      reasonCode === reason && styles.reasonChipTextSelected,
                    ]}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

	            <Text style={styles.modalLabel}>Notes</Text>
            <TextInput
              multiline
              value={employeeNotes}
              onChangeText={setEmployeeNotes}
              placeholder={reasonCode === "other" ? "Required notes" : "Optional notes"}
              placeholderTextColor={AppColor.textHighlighter}
              style={styles.notesInput}
            />

	            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondary}
                onPress={() => {
                  Keyboard.dismiss();
                  setRequestModalOrder(null);
                }}
              >
                <Text style={styles.modalSecondaryText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimary}
                disabled={requestSubmitting}
                onPress={submitRequest}
              >
                <Text style={styles.modalPrimaryText}>
                  {requestSubmitting ? "Submitting..." : "Submit"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Employee Dashboard</Text>
          <Text style={styles.title}>{employeeName}</Text>
        </View>
        <TouchableOpacity activeOpacity={0.8} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[]}
        keyExtractor={(item) => item?._id}
        renderItem={renderOrder}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshDashboard} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.panel}>
              <View style={styles.locationHeaderRow}>
                <View style={styles.locationInfoBlock}>
                  <Text style={styles.panelTitle}>
                    {displayedTruckName}
                  </Text>
                  <Text style={styles.locationText}>
                    {displayedLocation?.title ||
                      displayedLocation?.address ||
                      user?.assigned_location_id ||
                      "Assigned location"}
                  </Text>
                  <Text style={styles.locationAddress}>
                    {displayedLocation?.address || ""}
                  </Text>

                  <Text
                    style={[
                      styles.locationStatus,
                      displayedLocationOpen && styles.locationStatusOpen,
                    ]}
                  >
                    {displayedLocationOpen ? "Location Open" : "Location Closed"}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.takeoutButton,
                    (!isShiftActive || isOnBreak) && styles.disabledButton,
                  ]}
                  onPress={() =>
                    runShiftProtectedAction(() =>
                      navigation.navigate("employeePosBoardScreen"),
                    )
                  }
                >
                  <Text style={styles.takeoutButtonText}>Take-Out Order</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Today</Text>
              <View style={styles.statsGrid}>
                <StatCard
                  label="Cash drawer"
                  value={formatMoney(metrics.cash_drawer_total)}
                />
                <StatCard
                  label="Refund/cancel requests"
                  value={metrics.refund_cancel_requests_submitted || 0}
                />
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Order Management</Text>
              <View style={styles.bucketRow}>
                {ORDER_BUCKETS.map((bucket) => {
                  const count = orders.filter((order) =>
                    bucket.statuses.includes(order?.orderStatus),
                  ).length;
                  return (
                    <TouchableOpacity
                      key={bucket.value}
                      style={[
                        styles.bucketCard,
                        (!isShiftActive || isOnBreak) && styles.disabledButton,
                      ]}
                      onPress={() =>
                        runShiftProtectedAction(() =>
                          navigation.navigate("employeeOrderManagementScreen", {
                            bucket: bucket.value,
                          }),
                        )
                      }
                    >
                      <Text style={styles.bucketCount}>
                        {count}
                      </Text>
                      <Text style={styles.bucketLabel}>
                        {bucket.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Refunds</Text>
              <View style={styles.bucketRow}>
                {REFUND_BUCKETS.map((bucket) => {
                  return (
                    <TouchableOpacity
                      key={bucket.value}
                      style={[
                        styles.bucketCard,
                        (!isShiftActive || isOnBreak) && styles.disabledButton,
                      ]}
                      onPress={() =>
                        runShiftProtectedAction(() =>
                          navigation.navigate("employeeRefundRequestsScreen", {
                            bucket: bucket.value,
                          }),
                        )
                      }
                    >
                      <Text style={styles.bucketCount}>
                        {refundBucketCounts[bucket.value] || 0}
                      </Text>
                      <Text style={styles.bucketLabel}>
                        {bucket.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.bottomActionPanel}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.secondaryButton}
                onPress={() => navigation.navigate("userProfileScreen")}
              >
                <Text style={styles.secondaryButtonText}>My Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.primaryButton}
                onPress={() => navigation.navigate("employeeShiftScreen")}
              >
                <Text style={styles.primaryButtonText}>My Shift</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              color={AppColor.primary}
              style={styles.emptyLoader}
            />
          ) : null
        }
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    alignItems: "center",
    backgroundColor: AppColor.white,
    borderBottomColor: AppColor.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  kicker: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 13,
    marginBottom: 4,
  },
  title: {
    color: AppColor.text,
    fontFamily: Mulish700,
    fontSize: 22,
  },
  signOutText: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 14,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  panel: {
    backgroundColor: AppColor.white,
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  panelTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 18,
    marginBottom: 8,
  },
  panelHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  statusPill: {
    borderColor: AppColor.border,
    borderRadius: 12,
    borderWidth: 1,
    color: AppColor.textHighlighter,
    fontFamily: Mulish700,
    fontSize: 12,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillOpen: {
    backgroundColor: AppColor.primary,
    borderColor: AppColor.primary,
    color: AppColor.white,
  },
  detailRow: {
    alignItems: "center",
    borderTopColor: AppColor.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  detailLabel: {
    color: AppColor.textHighlighter,
    flex: 1,
    fontFamily: Mulish400,
    fontSize: 13,
    marginRight: 10,
  },
  detailValue: {
    color: AppColor.black,
    flex: 1,
    fontFamily: Mulish700,
    fontSize: 13,
    textAlign: "right",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    backgroundColor: "#F9FAFB",
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 78,
    padding: 12,
  },
  statValue: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 20,
    marginBottom: 6,
  },
  statLabel: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish600,
    fontSize: 12,
  },
  requestRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  requestBadge: {
    alignItems: "center",
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  requestCount: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 16,
  },
  requestLabel: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish600,
    fontSize: 11,
    marginTop: 3,
  },
  bucketRow: {
    flexDirection: "row",
    gap: 8,
  },
  bucketCard: {
    alignItems: "center",
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 68,
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  bucketCardActive: {
    backgroundColor: AppColor.primary,
    borderColor: AppColor.primary,
  },
  bucketCount: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 18,
  },
  bucketLabel: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish600,
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
  bucketTextActive: {
    color: AppColor.white,
  },
  bucketDetails: {
    marginTop: 12,
  },
  refundCard: {
    borderTopColor: AppColor.border,
    borderTopWidth: 1,
    paddingVertical: 10,
  },
  refundTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 13,
  },
  refundMeta: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 12,
    marginTop: 3,
  },
  refundDetail: {
    color: AppColor.black,
    fontFamily: Mulish400,
    fontSize: 12,
    marginTop: 6,
  },
  refundStatusText: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 12,
    marginTop: 6,
  },
  emptyInlineText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 13,
    marginTop: 10,
  },
  locationHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  locationInfoBlock: {
    flex: 1,
  },
  takeoutButton: {
    alignItems: "center",
    backgroundColor: AppColor.primary,
    borderRadius: 6,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 12,
  },
  takeoutButtonText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 12,
  },
  locationText: {
    color: AppColor.black,
    fontFamily: Mulish600,
    fontSize: 15,
  },
  locationAddress: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 13,
    marginTop: 4,
  },
  locationStatus: {
    alignSelf: "flex-start",
    borderColor: AppColor.border,
    borderRadius: 12,
    borderWidth: 1,
    color: AppColor.textHighlighter,
    fontFamily: Mulish700,
    fontSize: 12,
    marginTop: 12,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  locationStatusOpen: {
    borderColor: AppColor.primary,
    color: AppColor.primary,
  },
  paymentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  paymentBadge: {
    borderColor: AppColor.primary,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  paymentBadgeDisabled: {
    borderColor: AppColor.border,
  },
  paymentBadgeText: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 12,
  },
  paymentBadgeTextDisabled: {
    color: AppColor.textHighlighter,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: AppColor.primary,
    borderRadius: 6,
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
  },
  stackedAction: {
    marginBottom: 10,
  },
  primaryButtonText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 16,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: AppColor.white,
    borderColor: AppColor.primary,
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  secondaryButtonText: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 16,
  },
  bottomActionPanel: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  queueTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 18,
    marginBottom: 10,
    marginTop: 4,
  },
  orderCard: {
    backgroundColor: AppColor.white,
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  orderHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  orderStatus: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 12,
  },
  orderMeta: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 13,
    marginTop: 8,
  },
  orderItemsBox: {
    backgroundColor: "#F9FAFB",
    borderColor: AppColor.border,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 10,
    padding: 10,
  },
  orderItemLine: {
    color: AppColor.black,
    fontFamily: Mulish400,
    fontSize: 12,
    marginBottom: 3,
  },
  orderActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 14,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: AppColor.border,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 14,
  },
  primarySmallButton: {
    alignItems: "center",
    backgroundColor: AppColor.primary,
    borderRadius: 6,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primarySmallButtonText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 14,
  },
  dangerButton: {
    alignItems: "center",
    borderColor: "#DC2626",
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  dangerButtonText: {
    color: "#DC2626",
    fontFamily: Mulish700,
    fontSize: 13,
  },
  disabledButton: {
    opacity: 0.5,
  },
  requestStatusNotice: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 12,
    marginBottom: 8,
    textTransform: "capitalize",
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    width: "100%",
  },
  modalCard: {
    backgroundColor: AppColor.white,
    borderRadius: 8,
    maxHeight: "90%",
    padding: 16,
    width: "100%",
  },
  modalTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 18,
  },
  modalMeta: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 13,
    marginTop: 4,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  segmentButton: {
    alignItems: "center",
    borderColor: AppColor.border,
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    minHeight: 40,
    justifyContent: "center",
  },
  segmentButtonSelected: {
    backgroundColor: AppColor.primary,
    borderColor: AppColor.primary,
  },
  segmentButtonText: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 13,
  },
  segmentButtonTextSelected: {
    color: AppColor.white,
  },
  modalLabel: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 14,
  },
  reasonWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reasonChip: {
    borderColor: AppColor.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reasonChipSelected: {
    backgroundColor: AppColor.primary,
    borderColor: AppColor.primary,
  },
  reasonChipText: {
    color: AppColor.black,
    fontFamily: Mulish600,
    fontSize: 12,
  },
  reasonChipTextSelected: {
    color: AppColor.white,
  },
  notesInput: {
    borderColor: AppColor.border,
    borderRadius: 6,
    borderWidth: 1,
    color: AppColor.black,
    fontFamily: Mulish400,
    minHeight: 84,
    padding: 10,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 16,
  },
  modalSecondary: {
    alignItems: "center",
    borderColor: AppColor.border,
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalSecondaryText: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 14,
  },
  modalPrimary: {
    alignItems: "center",
    backgroundColor: AppColor.primary,
    borderRadius: 6,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalPrimaryText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 14,
  },
  emptyLoader: {
    marginTop: 24,
  },
  emptyText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 14,
    paddingVertical: 24,
    textAlign: "center",
  },
});

export default EmployeeSessionScreen;
