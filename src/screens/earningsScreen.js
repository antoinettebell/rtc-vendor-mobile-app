import React, { memo, useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  ActivityIndicator as NativeIndicator,
  Modal,
  RefreshControl,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import moment from "moment";
import Entypo from "react-native-vector-icons/Entypo";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import { vendorProfileStatus } from "../utils/constants";
import {
  getEarningByFoodTruckID_API,
  getOrderList_API,
  getRefundCancelRequests_API,
  reviewRefundCancelRequest_API,
} from "../api/appAPI";
import {
  formatMoney,
  getPastOrderDate,
  getVendorOrderTotal,
} from "../helpers/order.helper";
import StatusBarManager from "../components/StatusBarManager";

const PAST_ORDER_STATUSES = "DELIVERED, COMPLETED";

const DATE_FILTERS = [
  { label: "Today", value: "today" },
  { label: "7 days", value: "week" },
  { label: "30 days", value: "month" },
];

const PAYMENT_FILTERS = [
  { label: "All", value: null },
  { label: "Cash", value: "CASH" },
  { label: "Tap", value: "TAP_TO_PAY" },
];

const REQUEST_STATUS_FILTERS = [
  { label: "All", value: null },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const getOrdersTotal = (orders) =>
  orders.reduce((total, order) => total + getVendorOrderTotal(order), 0);

const getOrdersForPeriod = (orders, period) => {
  const periodStart = moment().startOf(period);
  const periodEnd = moment().endOf(period);

  return orders.filter((order) => {
    const orderDate = getPastOrderDate(order);
    if (!orderDate) return false;

    return moment(orderDate).isBetween(periodStart, periodEnd, null, "[]");
  });
};

const EarningComponent = memo(({ title, amount, onPress }) => {
  return (
    <Pressable style={styles.earningContainer} onPress={onPress}>
      <Entypo
        name="wallet"
        size={24}
        color={AppColor.primary}
        style={styles.earningIcon}
      />
      <Text style={styles.earningAmount} numberOfLines={1}>
        {`$${amount}`}
      </Text>
      <View style={styles.earningRow}>
        <Text style={styles.earningTitle}>{title}</Text>
        <FontAwesome6
          name="circle-arrow-right"
          size={12}
          color={AppColor.primary}
          style={styles.arrowIcon}
        />
      </View>
    </Pressable>
  );
});

const Chip = ({ label, selected, onPress }) => (
  <Pressable
    style={[styles.chip, selected && styles.chipSelected]}
    onPress={onPress}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
      {label}
    </Text>
  </Pressable>
);

const formatDateTime = (value) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getDateRange = (dateFilter) => {
  const end = moment().format("YYYY-MM-DD");
  const start =
    dateFilter === "month"
      ? moment().subtract(29, "days").format("YYYY-MM-DD")
      : dateFilter === "week"
        ? moment().subtract(6, "days").format("YYYY-MM-DD")
        : moment().format("YYYY-MM-DD");

  return { startDate: start, endDate: end };
};

const EarningsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { profileStatus, user } = useSelector((state) => state.userReducer);

  const [dataLoading, setDataLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [earnings, setEarnings] = useState(null);
  const [employeeAnalytics, setEmployeeAnalytics] = useState(null);
  const [dateFilter, setDateFilter] = useState("today");
  const [locationFilter, setLocationFilter] = useState(null);
  const [employeeFilter, setEmployeeFilter] = useState(null);
  const [paymentFilter, setPaymentFilter] = useState(null);
  const [requestStatusFilter, setRequestStatusFilter] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [reviewRequest, setReviewRequest] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("APPROVED");
  const [vendorResponseNotes, setVendorResponseNotes] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const canTapToPay = !!user?.foodTruck?.plan?.capabilities?.tapToPay;
  const locations = user?.foodTruck?.locations || [];
  const employees = employeeAnalytics?.employees || [];

  const paymentFilters = useMemo(
    () =>
      canTapToPay
        ? PAYMENT_FILTERS
        : PAYMENT_FILTERS.filter((item) => item.value !== "TAP_TO_PAY"),
    [canTapToPay]
  );

  const fetchPastOrders = async () => {
    let page = 1;
    let totalPages = 1;
    let orders = [];

    do {
      const response = await getOrderList_API({
        page,
        limit: 100,
        status: PAST_ORDER_STATUSES,
      });

      if (!response?.success || !response?.data) break;

      orders = [...orders, ...(response.data.orderList || [])];
      totalPages = response.data.totalPages || 1;
      page += 1;
    } while (page <= totalPages);

    return orders;
  };

  const onRefresh = async ({ isInitialLoad = false }) => {
    if (isInitialLoad) {
      setDataLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const pastOrders = await fetchPastOrders();
      const todayOrders = getOrdersForPeriod(pastOrders, "day");
      const weeklyOrders = getOrdersForPeriod(pastOrders, "week");
      const monthlyOrders = getOrdersForPeriod(pastOrders, "month");
      const { startDate, endDate } = getDateRange(dateFilter);
      const analyticsResponse = await getEarningByFoodTruckID_API({
        foodTruck_id: user.foodTruck._id,
        startDate,
        endDate,
        locationId: locationFilter,
        employeeInternalId: employeeFilter,
        paymentMethod: paymentFilter,
        refundCancelStatus: requestStatusFilter,
      });
      const requestsResponse = await getRefundCancelRequests_API({
        foodTruckId: user.foodTruck._id,
        status: "PENDING",
        limit: 25,
      });

      setEarnings({
        totalEarning: getOrdersTotal(pastOrders),
        todayEarning: getOrdersTotal(todayOrders),
        weeklyEarning: getOrdersTotal(weeklyOrders),
        monthlyEarning: getOrdersTotal(monthlyOrders),
      });
      setEmployeeAnalytics(analyticsResponse?.data?.employeeAnalytics || null);
      setPendingRequests(requestsResponse?.data?.requests || []);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
      setDataLoading(false);
    }
  };

  const openReviewModal = (request, status) => {
    setReviewRequest(request);
    setReviewStatus(status);
    setVendorResponseNotes("");
  };

  const submitReview = async () => {
    if (!reviewRequest?.request_id) {
      return;
    }

    setReviewLoading(true);
    try {
      await reviewRefundCancelRequest_API({
        request_id: reviewRequest.request_id,
        payload: {
          request_status: reviewStatus,
          vendor_response_notes: vendorResponseNotes,
        },
      });
      setReviewRequest(null);
      await onRefresh({ isInitialLoad: false });
      Alert.alert(
        "Request reviewed",
        reviewStatus === "APPROVED"
          ? "The refund/cancel has been processed."
          : "The request has been rejected."
      );
    } catch (error) {
      Alert.alert(
        "Review failed",
        error?.message || "Could not review this request."
      );
    } finally {
      setReviewLoading(false);
    }
  };

  const onPressNavigationHandler = ({
    listType = "earning",
    durationType = "monthly",
  }) => {
    navigation.navigate("earningListScreen", {
      truckId: user.foodTruck._id,
      listType: listType,
      durationType: durationType,
    });
  };

  useFocusEffect(
    useCallback(() => {
      onRefresh({ isInitialLoad: true });
    }, [
      dateFilter,
      locationFilter,
      employeeFilter,
      paymentFilter,
      requestStatusFilter,
    ])
  );

  return (
    <View style={styles.container}>
      <StatusBarManager />
      <Modal
        animationType="slide"
        transparent
        visible={!!reviewRequest}
        onRequestClose={() => setReviewRequest(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {reviewStatus === "APPROVED" ? "Approve Request" : "Reject Request"}
            </Text>
            <Text style={styles.modalMeta}>
              Order #{reviewRequest?.order_id?.orderNumber || reviewRequest?.order_id}
            </Text>
            <Text style={styles.modalMeta}>
              {reviewRequest?.request_type} | {reviewRequest?.reason_code}
            </Text>
            <Text style={styles.modalLabel}>Response note</Text>
            <TextInput
              multiline
              value={vendorResponseNotes}
              onChangeText={setVendorResponseNotes}
              placeholder="Optional note"
              placeholderTextColor={AppColor.textHighlighter}
              style={styles.notesInput}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalSecondary}
                onPress={() => setReviewRequest(null)}
              >
                <Text style={styles.modalSecondaryText}>Close</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalPrimary,
                  reviewStatus === "REJECTED" && styles.modalDanger,
                ]}
                disabled={reviewLoading}
                onPress={submitReview}
              >
                <Text style={styles.modalPrimaryText}>
                  {reviewLoading ? "Saving..." : reviewStatus}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {"Earnings"}
        </Text>
      </View>

      {profileStatus === vendorProfileStatus.approved ? (
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              tintColor={AppColor.primary}
              refreshing={isRefreshing}
              onRefresh={() => onRefresh({ isInitialLoad: false })}
            />
          }
        >
          {dataLoading ? (
            <View
              style={[styles.loadingContainer, { marginBottom: insets.bottom }]}
            >
              <NativeIndicator color={AppColor.primary} size="large" />
            </View>
          ) : (
            <>
              <View style={styles.earningsRow}>
                <EarningComponent
                  title={"Total Earnings"}
                  amount={formatMoney(earnings?.totalEarning || 0)}
                  onPress={() => onPressNavigationHandler({})}
                />
                <EarningComponent
                  title={"Today's Earning"}
                  amount={formatMoney(earnings?.todayEarning || 0)}
                  onPress={() =>
                    onPressNavigationHandler({ durationType: "daily" })
                  }
                />
              </View>
              <View style={styles.earningsRow}>
                <EarningComponent
                  title={"Weekly Earning"}
                  amount={formatMoney(earnings?.weeklyEarning || 0)}
                  onPress={() =>
                    onPressNavigationHandler({ durationType: "weekly" })
                  }
                />
                <EarningComponent
                  title={"Monthly Earning"}
                  amount={formatMoney(earnings?.monthlyEarning || 0)}
                  onPress={() =>
                    onPressNavigationHandler({ durationType: "monthly" })
                  }
                />
              </View>

              <View style={styles.analyticsPanel}>
                <Text style={styles.sectionTitle}>Employee Analytics</Text>

                <Text style={styles.subsectionTitle}>Pending Requests</Text>
                {pendingRequests.length ? (
                  pendingRequests.map((request) => (
                    <View key={request.request_id} style={styles.requestCard}>
                      <Text style={styles.requestTitle}>
                        Order #{request.order_id?.orderNumber || request.order_id}
                      </Text>
                      <Text style={styles.requestMeta}>
                        {request.request_type} | {request.reason_code}
                      </Text>
                      <Text style={styles.requestMeta}>
                        {request.employee_login_id}
                        {request.employee_notes
                          ? ` | ${request.employee_notes}`
                          : ""}
                      </Text>
                      <View style={styles.reviewActions}>
                        <Pressable
                          style={styles.approveButton}
                          onPress={() => openReviewModal(request, "APPROVED")}
                        >
                          <Text style={styles.approveButtonText}>Approve</Text>
                        </Pressable>
                        <Pressable
                          style={styles.rejectButton}
                          onPress={() => openReviewModal(request, "REJECTED")}
                        >
                          <Text style={styles.rejectButtonText}>Reject</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyAnalyticsText}>
                    No pending refund/cancel requests.
                  </Text>
                )}

                <Text style={styles.filterLabel}>Date range</Text>
                <View style={styles.chipRow}>
                  {DATE_FILTERS.map((item) => (
                    <Chip
                      key={item.value}
                      label={item.label}
                      selected={dateFilter === item.value}
                      onPress={() => setDateFilter(item.value)}
                    />
                  ))}
                </View>

                <Text style={styles.filterLabel}>Location</Text>
                <View style={styles.chipRow}>
                  <Chip
                    label="All"
                    selected={!locationFilter}
                    onPress={() => setLocationFilter(null)}
                  />
                  {locations.map((location) => (
                    <Chip
                      key={location._id}
                      label={location.title || location.address || "Location"}
                      selected={locationFilter === location._id}
                      onPress={() => setLocationFilter(location._id)}
                    />
                  ))}
                </View>

                <Text style={styles.filterLabel}>Employee</Text>
                <View style={styles.chipRow}>
                  <Chip
                    label="All"
                    selected={!employeeFilter}
                    onPress={() => setEmployeeFilter(null)}
                  />
                  {employees.map((employee) => (
                    <Chip
                      key={employee.employee_internal_id}
                      label={employee.employee_name}
                      selected={employeeFilter === employee.employee_internal_id}
                      onPress={() =>
                        setEmployeeFilter(employee.employee_internal_id)
                      }
                    />
                  ))}
                </View>

                <Text style={styles.filterLabel}>Payment method</Text>
                <View style={styles.chipRow}>
                  {paymentFilters.map((item) => (
                    <Chip
                      key={item.label}
                      label={item.label}
                      selected={paymentFilter === item.value}
                      onPress={() => setPaymentFilter(item.value)}
                    />
                  ))}
                </View>

                <Text style={styles.filterLabel}>Refund/cancel status</Text>
                <View style={styles.chipRow}>
                  {REQUEST_STATUS_FILTERS.map((item) => (
                    <Chip
                      key={item.label}
                      label={item.label}
                      selected={requestStatusFilter === item.value}
                      onPress={() => setRequestStatusFilter(item.value)}
                    />
                  ))}
                </View>

                {employees.length ? (
                  employees.map((employee) => (
                    <View
                      key={employee.employee_internal_id}
                      style={styles.employeeCard}
                    >
                      <View style={styles.employeeHeader}>
                        <View style={styles.employeeTitleWrap}>
                          <Text style={styles.employeeName}>
                            {employee.employee_name}
                          </Text>
                          <Text style={styles.employeeLocation}>
                            {employee.assigned_location?.title ||
                              employee.assigned_location?.address ||
                              "Assigned location"}
                          </Text>
                        </View>
                        <View style={styles.statusColumn}>
                          <Text
                            style={[
                              styles.statusBadge,
                              employee.is_active && styles.statusBadgeActive,
                            ]}
                          >
                            {employee.is_active ? "Active" : "Inactive"}
                          </Text>
                          <Text
                            style={[
                              styles.statusBadge,
                              employee.is_working && styles.statusBadgeWorking,
                            ]}
                          >
                            {employee.is_working ? "Working" : "Off duty"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Last activity</Text>
                        <Text style={styles.metaValue}>
                          {formatDateTime(employee.last_activity_at)}
                        </Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Shift start</Text>
                        <Text style={styles.metaValue}>
                          {formatDateTime(employee.shift?.started_at)}
                        </Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Shift end</Text>
                        <Text style={styles.metaValue}>
                          {employee.shift?.is_active
                            ? "Active"
                            : formatDateTime(employee.shift?.ended_at)}
                        </Text>
                      </View>

                      <View style={styles.metricGrid}>
                        <View style={styles.metricBox}>
                          <Text style={styles.metricValue}>
                            {employee.metrics?.orders_processed || 0}
                          </Text>
                          <Text style={styles.metricLabel}>Orders</Text>
                        </View>
                        <View style={styles.metricBox}>
                          <Text style={styles.metricValue}>
                            {employee.metrics?.completed_orders || 0}
                          </Text>
                          <Text style={styles.metricLabel}>Completed</Text>
                        </View>
                        <View style={styles.metricBox}>
                          <Text style={styles.metricValue}>
                            ${formatMoney(employee.metrics?.gross_sales || 0)}
                          </Text>
                          <Text style={styles.metricLabel}>Gross sales</Text>
                        </View>
                        <View style={styles.metricBox}>
                          <Text style={styles.metricValue}>
                            {employee.metrics?.cash_orders || 0}
                          </Text>
                          <Text style={styles.metricLabel}>Cash</Text>
                        </View>
                        {canTapToPay ? (
                          <View style={styles.metricBox}>
                            <Text style={styles.metricValue}>
                              {employee.metrics?.tap_orders || 0}
                            </Text>
                            <Text style={styles.metricLabel}>Tap</Text>
                          </View>
                        ) : null}
                        <View style={styles.metricBox}>
                          <Text style={styles.metricValue}>
                            {employee.metrics?.refund_cancel_requests_submitted ||
                              0}
                          </Text>
                          <Text style={styles.metricLabel}>Requests</Text>
                        </View>
                      </View>

                      <View style={styles.requestStatusRow}>
                        <Text style={styles.requestStatusText}>
                          Pending:{" "}
                          {employee.metrics
                            ?.refund_cancel_request_status_counts?.pending || 0}
                        </Text>
                        <Text style={styles.requestStatusText}>
                          Approved:{" "}
                          {employee.metrics
                            ?.refund_cancel_request_status_counts?.approved || 0}
                        </Text>
                        <Text style={styles.requestStatusText}>
                          Rejected:{" "}
                          {employee.metrics
                            ?.refund_cancel_request_status_counts?.rejected || 0}
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyAnalyticsText}>
                    No employee activity found for these filters.
                  </Text>
                )}
              </View>
            </>
          )}
        </ScrollView>
      ) : (
        <View style={styles.pendingContainer}>
          <Text style={styles.pendingText}>
            {
              "This feature will become available once your\nprofile is approved."
            }
          </Text>
        </View>
      )}
    </View>
  );
};

export default EarningsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: AppColor.border,
    backgroundColor: AppColor.white,
  },
  headerTitle: {
    fontSize: 19.78,
    fontFamily: Mulish700,
    color: AppColor.black,
  },
  contentContainer: {
    flexGrow: 1,
  },
  pendingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  pendingText: {
    fontSize: 16,
    fontFamily: Mulish400,
    color: AppColor.black,
    textAlign: "center",
  },

  // Earning Component
  earningContainer: {
    flex: 1 / 2,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: AppColor.border,
    backgroundColor: AppColor.white,
    shadowColor: AppColor.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  earningIcon: {
    alignSelf: "flex-end",
    marginBottom: 10,
  },
  earningRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  earningAmount: {
    fontSize: 24.65,
    fontFamily: Mulish400,
    color: AppColor.black,
    letterSpacing: 0.51,
  },
  earningTitle: {
    fontSize: 12.33,
    fontFamily: Mulish400,
    letterSpacing: 0.51,
    color: AppColor.black,
  },
  arrowIcon: {
    marginLeft: 4,
  },
  earningsRow: {
    flexDirection: "row",
    marginTop: 16,
    marginHorizontal: 16,
    gap: 16,
  },
  analyticsPanel: {
    backgroundColor: AppColor.white,
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    margin: 16,
    padding: 16,
  },
  sectionTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 18,
    marginBottom: 12,
  },
  subsectionTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 15,
    marginBottom: 8,
  },
  requestCard: {
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  requestTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 14,
  },
  requestMeta: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 12,
    marginTop: 4,
  },
  reviewActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 12,
  },
  approveButton: {
    alignItems: "center",
    backgroundColor: AppColor.primary,
    borderRadius: 6,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  approveButtonText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 13,
  },
  rejectButton: {
    alignItems: "center",
    borderColor: "#DC2626",
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  rejectButtonText: {
    color: "#DC2626",
    fontFamily: Mulish700,
    fontSize: 13,
  },
  filterLabel: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderColor: AppColor.border,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  chipSelected: {
    backgroundColor: AppColor.primary,
    borderColor: AppColor.primary,
  },
  chipText: {
    color: AppColor.black,
    fontFamily: Mulish400,
    fontSize: 12,
  },
  chipTextSelected: {
    color: AppColor.white,
    fontFamily: Mulish700,
  },
  employeeCard: {
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  employeeHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  employeeTitleWrap: {
    flex: 1,
  },
  employeeName: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 16,
  },
  employeeLocation: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 12,
    marginTop: 4,
  },
  statusColumn: {
    alignItems: "flex-end",
    gap: 6,
  },
  statusBadge: {
    borderColor: AppColor.border,
    borderRadius: 12,
    borderWidth: 1,
    color: AppColor.textHighlighter,
    fontFamily: Mulish700,
    fontSize: 11,
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusBadgeActive: {
    color: AppColor.primary,
    borderColor: AppColor.primary,
  },
  statusBadgeWorking: {
    backgroundColor: AppColor.primary,
    borderColor: AppColor.primary,
    color: AppColor.white,
  },
  metaRow: {
    alignItems: "center",
    borderTopColor: AppColor.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
  },
  metaLabel: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 12,
  },
  metaValue: {
    color: AppColor.black,
    flex: 1,
    fontFamily: Mulish700,
    fontSize: 12,
    textAlign: "right",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metricBox: {
    backgroundColor: "#F9FAFB",
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "31%",
    flexGrow: 1,
    minHeight: 68,
    padding: 10,
  },
  metricValue: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 16,
    marginBottom: 4,
  },
  metricLabel: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 11,
  },
  requestStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  requestStatusText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish700,
    fontSize: 12,
  },
  emptyAnalyticsText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 14,
    marginTop: 16,
    textAlign: "center",
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
    marginTop: 5,
  },
  modalLabel: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 14,
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
  modalDanger: {
    backgroundColor: "#DC2626",
  },
  modalPrimaryText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 14,
  },

  totalDeliveredContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    margin: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: AppColor.border,
    backgroundColor: AppColor.white,
    shadowColor: AppColor.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  totalDeliveredText: {
    fontSize: 18,
    fontFamily: Mulish400,
    color: AppColor.black,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
