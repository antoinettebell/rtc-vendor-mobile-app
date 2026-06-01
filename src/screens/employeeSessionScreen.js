import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
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
  endEmployeeSession_API,
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

  const foodTruck = user?.foodTruck;
  const assignedLocation = user?.assignedLocation;
  const capabilities = user?.employeeCapabilities || {};
  const canTapToPay = !!capabilities.tapToPay;
  const locationIsOpen =
    foodTruck?.currentLocation?.toString() ===
      assignedLocation?._id?.toString() || !!assignedLocation?.isOrderingOpen;

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
      setDashboard(response.data.dashboard);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadDashboard(), loadOrders(), loadRequests()]);
    } catch (error) {
      Alert.alert(
        "Dashboard unavailable",
        error?.message || "Could not load employee dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, [loadDashboard, loadOrders, loadRequests]);

  useFocusEffect(
    useCallback(() => {
      refreshDashboard();
    }, [refreshDashboard]),
  );

  const handleSignOut = async () => {
    try {
      await endEmployeeSession_API();
    } catch (error) {}

    dispatch(clearUserSlice());
    dispatch(clearFoodTruckProfileSlice());
    dispatch(clearPushNotificationRedux());
    dispatch(onSignOut());
  };

  const handleCompleteOrder = async (order) => {
    setActionLoadingId(order?._id);
    try {
      const response = await updateOrderStatusByID_API({
        order_id: order?._id,
        payload: {
          orderStatus: orderStatusStrings.completed,
        },
      });

      if (response?.success) {
        setOrders((prev) => prev.filter((item) => item._id !== order?._id));
        await loadDashboard();
      }
    } catch (error) {
      Alert.alert(
        "Order update failed",
        error?.message || "Could not complete order.",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePrintOrder = async (order) => {
    try {
      await printOrderTickets([order]);
    } catch (error) {
      Alert.alert(
        "Print unavailable",
        error?.message || "Could not print receipt.",
      );
    }
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

    setRequestModalOrder(order);
    setRequestType("REFUND");
    setReasonCode(REQUEST_REASONS[0]);
    setEmployeeNotes("");
  };

  const submitRequest = async () => {
    if (!requestModalOrder?._id) {
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

  const renderOrder = ({ item }) => (
    <View style={styles.orderCard}>
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
        <Text style={styles.orderStatus}>{item?.orderStatus}</Text>
      </View>
      <Text style={styles.orderMeta}>
        {(item?.items || []).length} items | $
        {getVendorOrderTotal(item).toFixed(2)}
      </Text>
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
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.primarySmallButton}
          disabled={actionLoadingId === item?._id}
          onPress={() => handleCompleteOrder(item)}
        >
          <Text style={styles.primarySmallButtonText}>
            {actionLoadingId === item?._id ? "Updating..." : "Complete"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.dangerButton}
          onPress={() => openRequestModal(item)}
        >
          <Text style={styles.dangerButtonText}>Request Refund/Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const metrics = dashboard?.metrics || {};
  const displayedLocation = dashboard?.assignedLocation || assignedLocation;
  const displayedLocationOpen =
    dashboard?.location?.is_open !== undefined
      ? dashboard.location.is_open
      : locationIsOpen;

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        animationType="slide"
        transparent
        visible={!!requestModalOrder}
        onRequestClose={() => setRequestModalOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Refund/Cancel Request</Text>
            <Text style={styles.modalMeta}>
              Order #{requestModalOrder?.orderNumber || requestModalOrder?._id}
            </Text>

            <View style={styles.segmentRow}>
              {["REFUND", "CANCEL"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.segmentButton,
                    requestType === type && styles.segmentButtonSelected,
                  ]}
                  onPress={() => setRequestType(type)}
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
              {REQUEST_REASONS.map((reason) => (
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
              placeholder="Optional notes"
              placeholderTextColor={AppColor.textHighlighter}
              style={styles.notesInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondary}
                onPress={() => setRequestModalOrder(null)}
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
        </View>
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
        data={orders}
        keyExtractor={(item) => item?._id}
        renderItem={renderOrder}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshDashboard} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>
                {foodTruck?.name || "Food truck"}
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

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Today</Text>
              <View style={styles.statsGrid}>
                <StatCard
                  label="Orders created"
                  value={metrics.orders_created_today || 0}
                />
                <StatCard
                  label="Completed"
                  value={metrics.completed_orders_today || 0}
                />
                <StatCard
                  label="Gross sales"
                  value={formatMoney(metrics.gross_sales_today)}
                />
                <StatCard
                  label="Cash orders"
                  value={metrics.cash_orders_today || 0}
                />
                <StatCard
                  label="Cash drawer"
                  value={formatMoney(metrics.cash_drawer_total)}
                />
                {canTapToPay ? (
                  <StatCard
                    label="Tap orders"
                    value={metrics.tap_orders_today || 0}
                  />
                ) : null}
                <StatCard
                  label="Refund/cancel requests"
                  value={metrics.refund_cancel_requests_submitted || 0}
                />
              </View>
              <View style={styles.requestRow}>
                <View style={styles.requestBadge}>
                  <Text style={styles.requestCount}>
                    {metrics.refund_cancel_request_status_counts?.pending || 0}
                  </Text>
                  <Text style={styles.requestLabel}>Pending</Text>
                </View>
                <View style={styles.requestBadge}>
                  <Text style={styles.requestCount}>
                    {metrics.refund_cancel_request_status_counts?.approved || 0}
                  </Text>
                  <Text style={styles.requestLabel}>Approved</Text>
                </View>
                <View style={styles.requestBadge}>
                  <Text style={styles.requestCount}>
                    {metrics.refund_cancel_request_status_counts?.rejected || 0}
                  </Text>
                  <Text style={styles.requestLabel}>Rejected</Text>
                </View>
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Walk-up POS</Text>
              <View style={styles.paymentRow}>
                <View style={styles.paymentBadge}>
                  <Text style={styles.paymentBadgeText}>Cash enabled</Text>
                </View>
                <View
                  style={[
                    styles.paymentBadge,
                    !canTapToPay && styles.paymentBadgeDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.paymentBadgeText,
                      !canTapToPay && styles.paymentBadgeTextDisabled,
                    ]}
                  >
                    {canTapToPay
                      ? "Tap to Pay enabled"
                      : "Tap to Pay unavailable"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.primaryButton, styles.stackedAction]}
                onPress={() => navigation.navigate("employeeShiftScreen")}
              >
                <Text style={styles.primaryButtonText}>My Shift</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.primaryButton}
                onPress={() => navigation.navigate("employeePosBoardScreen")}
              >
                <Text style={styles.primaryButtonText}>Open POS</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.queueTitle}>Active Order Queue</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              color={AppColor.primary}
              style={styles.emptyLoader}
            />
          ) : (
            <Text style={styles.emptyText}>
              No active orders for this location.
            </Text>
          )
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
