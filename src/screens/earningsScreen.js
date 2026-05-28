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
const FILTER_LABELS = {
  location: "Location",
  employee: "Employee",
  status: "Refund/Cancel Status",
};

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

const SegmentButton = ({ label, selected, onPress }) => (
  <Pressable
    style={[styles.segmentButton, selected && styles.segmentButtonSelected]}
    onPress={onPress}
  >
    <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
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
  const [filterPicker, setFilterPicker] = useState(null);

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
  const analyticsSummary = useMemo(() => {
    const totals = employees.reduce(
      (acc, employee) => {
        const metrics = employee.metrics || {};
        const orders = Number(metrics.orders_processed || 0);
        const sales = Number(metrics.gross_sales || 0);
        const requests = Number(metrics.refund_cancel_requests_submitted || 0);

        return {
          sales: acc.sales + sales,
          orders: acc.orders + orders,
          requests: acc.requests + requests,
        };
      },
      { sales: 0, orders: 0, requests: 0 }
    );

    return {
      ...totals,
      averageTicket: totals.orders ? totals.sales / totals.orders : 0,
    };
  }, [employees]);
  const locationOptions = useMemo(
    () => [
      { label: "All Locations", value: null },
      ...locations.map((location) => ({
        label: location.title || location.address || "Location",
        value: location._id,
      })),
    ],
    [locations]
  );
  const employeeOptions = useMemo(
    () => [
      { label: "All Employees", value: null },
      ...employees.map((employee) => ({
        label: employee.employee_name || "Employee",
        value: employee.employee_internal_id,
      })),
    ],
    [employees]
  );
  const statusOptions = useMemo(
    () =>
      REQUEST_STATUS_FILTERS.map((item) => ({
        ...item,
        label: item.value ? item.label : "All Statuses",
      })),
    []
  );
  const filterOptions = {
    location: locationOptions,
    employee: employeeOptions,
    status: statusOptions,
  };
  const selectedFilterLabel = (options, value, fallback) =>
    options.find((item) => item.value === value)?.label || fallback;
  const resetEmployeeFilters = () => {
    setDateFilter("today");
    setLocationFilter(null);
    setEmployeeFilter(null);
    setPaymentFilter(null);
    setRequestStatusFilter(null);
  };

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
      <Modal
        animationType="fade"
        transparent
        visible={!!filterPicker}
        onRequestClose={() => setFilterPicker(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFilterPicker(null)}
        >
          <Pressable style={styles.filterPickerCard}>
            <Text style={styles.modalTitle}>
              {FILTER_LABELS[filterPicker] || "Filter"}
            </Text>
            {(filterOptions[filterPicker] || []).map((item) => {
              const selected =
                (filterPicker === "location" && locationFilter === item.value) ||
                (filterPicker === "employee" && employeeFilter === item.value) ||
                (filterPicker === "status" &&
                  requestStatusFilter === item.value);
              return (
                <Pressable
                  key={`${filterPicker}-${item.label}-${item.value || "all"}`}
                  style={styles.filterPickerOption}
                  onPress={() => {
                    if (filterPicker === "location") {
                      setLocationFilter(item.value);
                    }
                    if (filterPicker === "employee") {
                      setEmployeeFilter(item.value);
                    }
                    if (filterPicker === "status") {
                      setRequestStatusFilter(item.value);
                    }
                    setFilterPicker(null);
                  }}
                >
                  <Text
                    style={[
                      styles.filterPickerText,
                      selected && styles.filterPickerTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {selected ? (
                    <FontAwesome6
                      name="check"
                      size={14}
                      color={AppColor.primary}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
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
                <Text style={styles.sectionSubtitle}>
                  Track employee sales, refunds, and order activity.
                </Text>

                <View style={styles.summaryGrid}>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Total Sales</Text>
                    <Text style={styles.summaryValue}>
                      ${formatMoney(analyticsSummary.sales)}
                    </Text>
                  </View>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Orders</Text>
                    <Text style={styles.summaryValue}>
                      {analyticsSummary.orders}
                    </Text>
                  </View>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Refunds/Cancels</Text>
                    <Text style={styles.summaryValue}>
                      {analyticsSummary.requests}
                    </Text>
                  </View>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Avg. Ticket</Text>
                    <Text style={styles.summaryValue}>
                      ${formatMoney(analyticsSummary.averageTicket)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.filterLabel}>Date Range</Text>
                <View style={styles.segmentedControl}>
                  {DATE_FILTERS.map((item) => (
                    <SegmentButton
                      key={item.value}
                      label={item.label}
                      selected={dateFilter === item.value}
                      onPress={() => setDateFilter(item.value)}
                    />
                  ))}
                </View>

                <Text style={styles.filterLabel}>Filters</Text>
                <View style={styles.filterGrid}>
                  <Pressable
                    style={styles.selectControl}
                    onPress={() => setFilterPicker("location")}
                  >
                    <Text style={styles.selectLabel} numberOfLines={1}>
                      {selectedFilterLabel(
                        locationOptions,
                        locationFilter,
                        "All Locations"
                      )}
                    </Text>
                    <Entypo
                      name="chevron-small-down"
                      size={22}
                      color={AppColor.textHighlighter}
                    />
                  </Pressable>
                  <Pressable
                    style={styles.selectControl}
                    onPress={() => setFilterPicker("employee")}
                  >
                    <Text style={styles.selectLabel} numberOfLines={1}>
                      {selectedFilterLabel(
                        employeeOptions,
                        employeeFilter,
                        "All Employees"
                      )}
                    </Text>
                    <Entypo
                      name="chevron-small-down"
                      size={22}
                      color={AppColor.textHighlighter}
                    />
                  </Pressable>
                  <View style={[styles.segmentedControl, styles.paymentSegment]}>
                    {paymentFilters.map((item) => (
                      <SegmentButton
                        key={item.label}
                        label={item.label}
                        selected={paymentFilter === item.value}
                        onPress={() => setPaymentFilter(item.value)}
                      />
                    ))}
                  </View>
                  <Pressable
                    style={styles.selectControl}
                    onPress={() => setFilterPicker("status")}
                  >
                    <Text style={styles.selectLabel} numberOfLines={1}>
                      {selectedFilterLabel(
                        statusOptions,
                        requestStatusFilter,
                        "All Statuses"
                      )}
                    </Text>
                    <Entypo
                      name="chevron-small-down"
                      size={22}
                      color={AppColor.textHighlighter}
                    />
                  </Pressable>
                </View>
                <Pressable style={styles.resetButton} onPress={resetEmployeeFilters}>
                  <Text style={styles.resetButtonText}>Reset Filters</Text>
                </Pressable>

                <View style={styles.subsectionCard}>
                  <Text style={styles.subsectionTitle}>Pending Requests</Text>
                  {pendingRequests.length ? (
                    pendingRequests.map((request) => (
                      <View key={request.request_id} style={styles.requestCard}>
                        <Text style={styles.requestTitle}>
                          Order #{request.order_id?.orderNumber || request.order_id}
                        </Text>
                        <Text style={styles.requestMeta}>
                          {request.request_type || "Request"} |{" "}
                          {request.reason_code || "Reason not provided"}
                        </Text>
                        <Text style={styles.requestMeta}>
                          {request.employee_login_id || "Employee"}
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
                    <Text style={styles.emptyInlineText}>
                      No pending refund or cancel requests.
                    </Text>
                  )}
                </View>

                <View style={styles.activityHeader}>
                  <Text style={styles.subsectionTitle}>Activity</Text>
                </View>
                {employees.length ? (
                  employees.map((employee) => {
                    const metrics = employee.metrics || {};
                    const locationName =
                      employee.assigned_location?.title ||
                      employee.assigned_location?.address ||
                      "All locations";
                    const paymentSummary = canTapToPay
                      ? `Cash ${metrics.cash_orders || 0} / Tap ${
                          metrics.tap_orders || 0
                        }`
                      : `Cash ${metrics.cash_orders || 0}`;
                    const statusText = employee.is_working
                      ? "Working"
                      : employee.is_active
                        ? "Active"
                        : "Inactive";

                    return (
                      <View
                        key={employee.employee_internal_id}
                        style={styles.activityCard}
                      >
                        <View style={styles.employeeHeader}>
                          <View style={styles.employeeTitleWrap}>
                            <Text style={styles.employeeName}>
                              {employee.employee_name || "Employee"}
                            </Text>
                            <Text style={styles.employeeLocation}>
                              {locationName}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.statusBadge,
                              employee.is_working && styles.statusBadgeWorking,
                              !employee.is_working &&
                                employee.is_active &&
                                styles.statusBadgeActive,
                            ]}
                          >
                            {statusText}
                          </Text>
                        </View>

                        <View style={styles.activityDetails}>
                          <View style={styles.activityMetric}>
                            <Text style={styles.metaLabel}>Order amount</Text>
                            <Text style={styles.metaValue}>
                              ${formatMoney(metrics.gross_sales || 0)}
                            </Text>
                          </View>
                          <View style={styles.activityMetric}>
                            <Text style={styles.metaLabel}>Orders</Text>
                            <Text style={styles.metaValue}>
                              {metrics.orders_processed || 0}
                            </Text>
                          </View>
                          <View style={styles.activityMetric}>
                            <Text style={styles.metaLabel}>Payment</Text>
                            <Text style={styles.metaValue}>{paymentSummary}</Text>
                          </View>
                          <View style={styles.activityMetric}>
                            <Text style={styles.metaLabel}>Refund/Cancel</Text>
                            <Text style={styles.metaValue}>
                              {metrics.refund_cancel_requests_submitted || 0}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.metaRow}>
                          <Text style={styles.metaLabel}>Date/time</Text>
                          <Text style={styles.metaValue}>
                            {formatDateTime(employee.last_activity_at)}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyActivityCard}>
                    <FontAwesome6
                      name="receipt"
                      size={24}
                      color={AppColor.primary}
                    />
                    <Text style={styles.emptyActivityTitle}>
                      No activity found
                    </Text>
                    <Text style={styles.emptyActivityText}>
                      Try changing the filters or selecting a wider date range.
                    </Text>
                  </View>
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
    borderRadius: 14,
    borderWidth: 1,
    margin: 16,
    padding: 16,
    shadowColor: AppColor.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 18,
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 76,
    padding: 12,
  },
  summaryLabel: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 12,
  },
  summaryValue: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 19,
    marginTop: 8,
  },
  subsectionTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 15,
    marginBottom: 8,
  },
  subsectionCard: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    padding: 12,
  },
  activityHeader: {
    marginTop: 16,
  },
  requestCard: {
    backgroundColor: AppColor.white,
    borderColor: "#E5E7EB",
    borderRadius: 10,
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
    marginTop: 12,
  },
  segmentedControl: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  segmentButton: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 8,
  },
  segmentButtonSelected: {
    backgroundColor: AppColor.primary,
  },
  segmentText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish700,
    fontSize: 12,
  },
  segmentTextSelected: {
    color: AppColor.white,
  },
  filterGrid: {
    gap: 10,
  },
  selectControl: {
    alignItems: "center",
    backgroundColor: AppColor.white,
    borderColor: "#DADFE8",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  selectLabel: {
    color: AppColor.black,
    flex: 1,
    fontFamily: Mulish700,
    fontSize: 13,
  },
  paymentSegment: {
    minHeight: 44,
  },
  resetButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: AppColor.primary,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 38,
    paddingHorizontal: 14,
  },
  resetButtonText: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 13,
  },
  filterPickerCard: {
    backgroundColor: AppColor.white,
    borderRadius: 14,
    padding: 16,
    width: "100%",
  },
  filterPickerOption: {
    alignItems: "center",
    borderBottomColor: "#EEF0F4",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 46,
  },
  filterPickerText: {
    color: AppColor.black,
    flex: 1,
    fontFamily: Mulish400,
    fontSize: 14,
  },
  filterPickerTextSelected: {
    color: AppColor.primary,
    fontFamily: Mulish700,
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
  activityCard: {
    backgroundColor: AppColor.white,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
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
    borderTopColor: "#EEF0F4",
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
  activityDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  activityMetric: {
    backgroundColor: "#F9FAFB",
    borderColor: "#EEF0F4",
    borderRadius: 10,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 62,
    padding: 10,
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
  emptyInlineText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyActivityCard: {
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    padding: 20,
  },
  emptyActivityTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 15,
    marginTop: 10,
  },
  emptyActivityText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
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
