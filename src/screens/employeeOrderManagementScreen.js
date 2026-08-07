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
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import {
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

const getDisplayOrderStatus = (order) =>
  order?.refundStatus === "PENDING" ? "Refund Pending" : order?.orderStatus;

const EmployeeOrderManagementScreen = ({ navigation, route }) => {
  const initialBucket = route?.params?.bucket || "preparing";
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState(initialBucket);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [requestModalOrder, setRequestModalOrder] = useState(null);
  const [requestType, setRequestType] = useState("REFUND");
  const [reasonCode, setReasonCode] = useState(REQUEST_REASONS[0]);
  const [employeeNotes, setEmployeeNotes] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  const selectedBucketConfig =
    ORDER_BUCKETS.find((bucket) => bucket.value === selectedBucket) ||
    ORDER_BUCKETS[0];

  const loadOrders = useCallback(async () => {
    const response = await getEmployeeOrders_API({
      status: ACTIVE_ORDER_STATUSES.join(","),
    });
    if (response?.success && response?.data?.orderList) {
      setOrders(response.data.orderList);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    const response = await getRefundCancelRequests_API();
    if (response?.success && response?.data?.requests) {
      setRequests(response.data.requests);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadOrders(), loadRequests()]);
    } catch (error) {
      Alert.alert("Orders unavailable", error?.message || "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [loadOrders, loadRequests]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const bucketCounts = useMemo(
    () =>
      ORDER_BUCKETS.reduce((counts, bucket) => {
        counts[bucket.value] = orders.filter((order) =>
          bucket.statuses.includes(order?.orderStatus),
        ).length;
        return counts;
      }, {}),
    [orders],
  );

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) =>
        selectedBucketConfig.statuses.includes(order?.orderStatus),
      ),
    [orders, selectedBucketConfig],
  );

  const getNextOrderStatus = (status) => {
    if ([orderStatusStrings.placed, orderStatusStrings.accepted].includes(status)) {
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
        await loadOrders();
      }
    } catch (error) {
      Alert.alert("Order update failed", error?.message || "Could not update order.");
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
              Alert.alert("Print unavailable", error?.message || "Could not print receipt.");
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

    const nextRequestType = getAvailableRequestTypes(order)[0];
    setRequestModalOrder(order);
    setRequestType(nextRequestType);
    setReasonCode(getAvailableReasons(order, nextRequestType)[0]);
    setEmployeeNotes("");
  };

  const submitRequest = async () => {
    if (!requestModalOrder?._id) return;
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
      await loadRequests();
      setRequestModalOrder(null);
      Alert.alert(
        response?.data?.existing ? "Existing request" : "Request submitted",
        response?.data?.existing
          ? "This order already has a refund/cancel request."
          : "The vendor has been notified for review.",
      );
    } catch (error) {
      Alert.alert("Request failed", error?.message || "Could not submit this request.");
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
    const existingRequest = getOrderRequest(item?._id);

    return (
      <View style={styles.orderCard}>
        {existingRequest ? (
          <Text style={styles.requestStatusNotice}>
            Request {existingRequest.request_status.toLowerCase()}
          </Text>
        ) : null}
        <View style={styles.orderHeader}>
          <Text style={styles.orderTitle}>
            Order #{item?.orderNumber || item?._id}
          </Text>
          <Text style={styles.orderStatus}>{getDisplayOrderStatus(item)}</Text>
        </View>
        <Text style={styles.orderMeta}>
          {(item?.items || []).length} items | ${getVendorOrderTotal(item).toFixed(2)}
        </Text>
        {(item?.items || []).length ? (
          <View style={styles.orderItemsBox}>
            {(item.items || []).map((orderItem, index) => (
              <Text
                key={`${item?._id || "order"}-${orderItem?._id || "item"}-${index}`}
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
      </View>
    );
  };

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
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={AppColor.black}
          />
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <Text style={styles.kicker}>Order Management</Text>
          <Text style={styles.title}>{selectedBucketConfig.label}</Text>
        </View>
      </View>

      <View style={styles.bucketRow}>
        {ORDER_BUCKETS.map((bucket) => {
          const selected = selectedBucket === bucket.value;
          return (
            <TouchableOpacity
              key={bucket.value}
              style={[styles.bucketCard, selected && styles.bucketCardActive]}
              onPress={() => setSelectedBucket(bucket.value)}
            >
              <Text style={[styles.bucketCount, selected && styles.bucketTextActive]}>
                {bucketCounts[bucket.value] || 0}
              </Text>
              <Text style={[styles.bucketLabel, selected && styles.bucketTextActive]}>
                {bucket.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item, index) => item?._id || `order-${index}`}
        renderItem={renderOrder}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={AppColor.primary} style={styles.emptyLoader} />
          ) : (
            <Text style={styles.emptyText}>
              No {selectedBucketConfig.label.toLowerCase()} orders.
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
    backgroundColor: "#F9FAFB",
    flex: 1,
  },
  header: {
    alignItems: "center",
    backgroundColor: AppColor.white,
    borderBottomColor: AppColor.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    alignItems: "center",
    borderColor: AppColor.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    marginRight: 12,
    width: 40,
  },
  headerTextBlock: {
    flex: 1,
  },
  kicker: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 13,
    marginBottom: 3,
  },
  title: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 22,
  },
  bucketRow: {
    backgroundColor: AppColor.white,
    borderBottomColor: AppColor.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  bucketCard: {
    alignItems: "center",
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 66,
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
  content: {
    padding: 16,
    paddingBottom: 32,
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
    flex: 1,
    fontFamily: Mulish700,
    fontSize: 15,
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
    justifyContent: "center",
    minHeight: 40,
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
    justifyContent: "center",
    minHeight: 40,
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
  emptyLoader: {
    marginTop: 36,
  },
  emptyText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 14,
    marginTop: 36,
    textAlign: "center",
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
    justifyContent: "center",
    minHeight: 40,
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
    marginTop: 14,
  },
  reasonWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  reasonChip: {
    borderColor: AppColor.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  reasonChipSelected: {
    borderColor: AppColor.primary,
  },
  reasonChipText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish600,
    fontSize: 12,
  },
  reasonChipTextSelected: {
    color: AppColor.primary,
  },
  notesInput: {
    borderColor: AppColor.border,
    borderRadius: 6,
    borderWidth: 1,
    color: AppColor.black,
    fontFamily: Mulish400,
    marginTop: 8,
    minHeight: 82,
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
    minWidth: 96,
    paddingVertical: 11,
  },
  modalSecondaryText: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 13,
  },
  modalPrimary: {
    alignItems: "center",
    backgroundColor: AppColor.primary,
    borderRadius: 6,
    minWidth: 110,
    paddingVertical: 11,
  },
  modalPrimaryText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 13,
  },
});

export default EmployeeOrderManagementScreen;
