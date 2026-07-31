import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
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
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import { vendorProfileStatus } from "../utils/constants";
import {
  getEarningByFoodTruckID_API,
  getRefundCancelRequests_API,
  reviewRefundCancelRequest_API,
  vendorEmployeeShiftAction_API,
} from "../api/appAPI";
import { formatMoney } from "../helpers/order.helper";
import StatusBarManager from "../components/StatusBarManager";

const EARNINGS_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const DATE_FILTERS = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
];
const EMPLOYEE_DATE_FILTERS = DATE_FILTERS.filter(
  (item) => item.value !== "month"
);

const PAYMENT_FILTERS = [
  { label: "All", value: null },
  { label: "Cash", value: "CASH" },
  { label: "Tap", value: "TAP_TO_PAY" },
];

const REQUEST_STATUS_FILTERS = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: null },
];

const EMPLOYEE_STATUS_FILTERS = [
  { label: "Active", value: "active" },
  { label: "Working", value: "working" },
  { label: "Inactive", value: "inactive" },
  { label: "All", value: null },
];
const FILTER_LABELS = {
  location: "Location",
  truckUnit: "Food Truck",
  employee: "Employee",
  employeeStatus: "Status",
  status: "Refunds",
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

const formatShiftDateTime = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString([], {
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getEmployeeShiftStatusText = (employee) => {
  if (employee?.is_archived) {
    return "Archived";
  }

  if (employee?.shift?.is_active) {
    const startedAt = formatShiftDateTime(employee?.shift?.started_at);
    return startedAt ? `Started ${startedAt}` : "Shift started";
  }

  if (employee?.shift?.ended_at) {
    const endedAt = formatShiftDateTime(employee?.shift?.ended_at);
    return endedAt ? `Ended ${endedAt}` : "Shift ended";
  }

  if (employee?.is_working) {
    return "Working - shift not started";
  }

  return "Off duty";
};

const getDateRange = (dateFilter) => {
  const period =
    dateFilter === "month" ? "month" : dateFilter === "week" ? "week" : "day";
  const start = moment().startOf(period).format("YYYY-MM-DD");
  const end = moment().endOf(period).format("YYYY-MM-DD");

  return { startDate: start, endDate: end };
};

const EarningsScreen = ({ navigation, screenMode = "earnings" }) => {
  const insets = useSafeAreaInsets();
  const { profileStatus, user } = useSelector((state) => state.userReducer);
  const isEmployeesScreen = screenMode === "employees";

  const [dataLoading, setDataLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [earnings, setEarnings] = useState(null);
  const [employeeAnalytics, setEmployeeAnalytics] = useState(null);
  const [allFoodTruckAnalytics, setAllFoodTruckAnalytics] = useState(null);
  const [dateFilter, setDateFilter] = useState("today");
  const [locationFilter, setLocationFilter] = useState(null);
  const [truckUnitFilter, setTruckUnitFilter] = useState(null);
  const [employeeFilter, setEmployeeFilter] = useState(null);
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState("active");
  const [paymentFilter, setPaymentFilter] = useState(null);
  const [requestStatusFilter, setRequestStatusFilter] = useState("pending");
  const [refundRequests, setRefundRequests] = useState([]);
  const [reviewRequest, setReviewRequest] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("APPROVED");
  const [vendorResponseNotes, setVendorResponseNotes] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [employeeShiftActionLoading, setEmployeeShiftActionLoading] =
    useState(null);
  const [overrideEmployee, setOverrideEmployee] = useState(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [filterPicker, setFilterPicker] = useState(null);

  const canTapToPay = !!user?.foodTruck?.plan?.capabilities?.tapToPay;
  const locations = user?.foodTruck?.locations || [];
  const truckUnits = (user?.foodTruck?.truck_units || []).filter(
    (unit) => !unit.is_archived
  );
  const employees = employeeAnalytics?.employees || [];
  const statusFilteredEmployees = useMemo(() => {
    if (employeeStatusFilter === "working") {
      return employees.filter((employee) => employee.is_working);
    }
    if (employeeStatusFilter === "active") {
      return employees.filter((employee) => employee.is_active);
    }
    if (employeeStatusFilter === "inactive") {
      return employees.filter((employee) => !employee.is_active);
    }
    return employees;
  }, [employeeStatusFilter, employees]);
  const visibleEmployees = statusFilteredEmployees;

  const paymentFilters = useMemo(
    () =>
      canTapToPay
        ? PAYMENT_FILTERS
        : PAYMENT_FILTERS.filter((item) => item.value !== "TAP_TO_PAY"),
    [canTapToPay]
  );
  const buildAnalyticsSummary = useCallback((analyticsEmployees = []) => {
    const totals = analyticsEmployees.reduce(
      (acc, employee) => {
        const metrics = employee.metrics || {};
        const orders = Number(metrics.orders_processed || 0);
        const sales = Number(metrics.gross_sales || 0);
	        const requests = Number(metrics.refund_cancel_requests_submitted || 0);
	        const grossHours = Number(metrics.gross_hours_worked || 0);
	        const netHours = Number(metrics.net_hours_worked || 0);

	        return {
	          sales: acc.sales + sales,
	          orders: acc.orders + orders,
	          requests: acc.requests + requests,
	          grossHours: acc.grossHours + grossHours,
	          netHours: acc.netHours + netHours,
	        };
	      },
	      { sales: 0, orders: 0, requests: 0, grossHours: 0, netHours: 0 }
	    );

    return {
      ...totals,
	      averageTicket: totals.orders ? totals.sales / totals.orders : 0,
	    };
	  }, []);
	  const activeDateFilters = isEmployeesScreen
	    ? EMPLOYEE_DATE_FILTERS
	    : DATE_FILTERS;
  const analyticsEmployees = isEmployeesScreen ? statusFilteredEmployees : employees;
  const analyticsSummary = useMemo(() => {
    const allEmployees = allFoodTruckAnalytics?.employees || [];
    return buildAnalyticsSummary(
      isEmployeesScreen ? analyticsEmployees : allEmployees
    );
  }, [
    allFoodTruckAnalytics,
    analyticsEmployees,
    buildAnalyticsSummary,
    isEmployeesScreen,
  ]);
  const allFoodTruckSummary = useMemo(
    () => ({
      sales: Number(allFoodTruckAnalytics?.grossSales || 0),
      orders: Number(allFoodTruckAnalytics?.orders || 0),
      requests: Number(allFoodTruckAnalytics?.refundsCancels || 0),
      averageTicket: Number(allFoodTruckAnalytics?.averageTicket || 0),
    }),
    [allFoodTruckAnalytics]
  );
	  useEffect(() => {
	    if (isEmployeesScreen && dateFilter === "month") {
	      setDateFilter("week");
	    }
	  }, [dateFilter, isEmployeesScreen]);

	  const earningsSummaryRows = useMemo(
	    () => {
	      if (isEmployeesScreen) {
	        return [
	          {
	            key: "grossSales",
	            label: "Employee Sales",
	            value: `$${formatMoney(analyticsSummary.sales)}`,
	          },
	          {
	            key: "orders",
	            label: "Orders Handled",
	            value: String(analyticsSummary.orders),
	          },
	          {
	            key: "grossHours",
	            label: "With Breaks",
	            value: `${analyticsSummary.grossHours.toFixed(2)} hrs`,
	          },
	          {
	            key: "netHours",
	            label: "Without Breaks",
	            value: `${analyticsSummary.netHours.toFixed(2)} hrs`,
	          },
	        ];
	      }

	      return [
	      {
        key: "grossSales",
        label: "Gross Sales",
        value: `$${formatMoney(allFoodTruckSummary.sales)}`,
        detailLabel: "All food truck sales",
        rawValue: allFoodTruckSummary.sales,
      },
      {
        key: "orders",
        label: "Orders",
        value: String(allFoodTruckSummary.orders),
        detailLabel: "Orders across all food trucks",
        rawValue: allFoodTruckSummary.orders,
      },
      {
        key: "refundsCancels",
        label: "Refunds/Cancels",
        value: String(allFoodTruckSummary.requests),
        detailLabel: "Requests across all food trucks",
        rawValue: allFoodTruckSummary.requests,
      },
      {
        key: "avgTicket",
        label: "Avg. Ticket",
        value: `$${formatMoney(allFoodTruckSummary.averageTicket)}`,
        detailLabel: "Gross sales divided by orders",
        rawValue: allFoodTruckSummary.averageTicket,
	      },
	    ];
	    },
	    [allFoodTruckSummary, analyticsSummary, isEmployeesScreen]
	  );
  const allFoodTruckBreakdown = useMemo(
    () =>
      (allFoodTruckAnalytics?.breakdown || []).map((item) => ({
        label: item.label,
        sales: Number(item.grossSales || 0),
        orders: Number(item.orders || 0),
        requests: Number(item.refundsCancels || 0),
        averageTicket: Number(item.averageTicket || 0),
      })),
    [allFoodTruckAnalytics]
  );
  const refundStatusCounts = useMemo(
    () =>
      refundRequests.reduce(
        (counts, request) => {
          const status = String(request.request_status || "").toLowerCase();
          if (status === "pending") counts.pending += 1;
          if (status === "approved") counts.approved += 1;
          if (status === "rejected") counts.rejected += 1;
          counts.all += 1;
          return counts;
        },
        { pending: 0, approved: 0, rejected: 0, all: 0 }
      ),
    [refundRequests]
  );
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
  const truckUnitOptions = useMemo(
    () => [
      { label: "All Food Trucks", value: null },
      ...truckUnits.map((truckUnit, index) => ({
        label: truckUnit.name || `Truck ${index + 1}`,
        value: truckUnit._id,
      })),
    ],
    [truckUnits]
  );
  const statusOptions = useMemo(
    () =>
      REQUEST_STATUS_FILTERS.map((item) => ({
        ...item,
        label: item.value ? item.label : "All",
      })),
    []
  );
  const employeeStatusOptions = useMemo(() => EMPLOYEE_STATUS_FILTERS, []);
  const filterOptions = {
    location: locationOptions,
    truckUnit: truckUnitOptions,
    employee: employeeOptions,
    employeeStatus: employeeStatusOptions,
    status: statusOptions,
  };
  const selectedFilterLabel = (options, value, fallback) =>
    options.find((item) => item.value === value)?.label || fallback;
  const resetEmployeeFilters = () => {
    setDateFilter("today");
    setLocationFilter(null);
    setTruckUnitFilter(null);
    setEmployeeFilter(null);
    setEmployeeStatusFilter("active");
    setPaymentFilter(null);
    setRequestStatusFilter("pending");
  };

  const onRefresh = async ({ isInitialLoad = false }) => {
    if (isInitialLoad) {
      setDataLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const { startDate, endDate } = getDateRange(dateFilter);
      const [analyticsResponse, allFoodTruckResponse, requestsResponse] =
        await Promise.all([
          getEarningByFoodTruckID_API({
            foodTruck_id: user.foodTruck._id,
            startDate,
            endDate,
            locationId: locationFilter,
            truckUnitId: truckUnitFilter,
            employeeInternalId: employeeFilter,
            paymentMethod: paymentFilter,
            refundCancelStatus: null,
            includeEmployeeAnalytics: isEmployeesScreen,
          }),
          getEarningByFoodTruckID_API({
            foodTruck_id: user.foodTruck._id,
            startDate,
            endDate,
            refundCancelStatus: null,
            includeEmployeeAnalytics: false,
          }),
          isEmployeesScreen
            ? getRefundCancelRequests_API({
                foodTruckId: user.foodTruck._id,
                status: requestStatusFilter?.toUpperCase() || null,
                employeeInternalId: employeeFilter,
                locationId: locationFilter,
                truckUnitId: truckUnitFilter,
                limit: 25,
              })
            : Promise.resolve({ data: { requests: [] } }),
        ]);
      const backendEarnings = analyticsResponse?.data?.earningsFulldata || {};

      setEarnings({
        totalEarning: Number(backendEarnings.totalEarning || 0),
        todayEarning: Number(backendEarnings.todayEarning || 0),
        weeklyEarning: Number(backendEarnings.weeklyEarning || 0),
        monthlyEarning: Number(backendEarnings.monthlyEarning || 0),
      });
      setEmployeeAnalytics(
        isEmployeesScreen
          ? analyticsResponse?.data?.employeeAnalytics || null
          : null
      );
      setAllFoodTruckAnalytics(
        allFoodTruckResponse?.data?.salesSummary || null
      );
      setRefundRequests(requestsResponse?.data?.requests || []);
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
    if (reviewStatus === "REJECTED" && !vendorResponseNotes.trim()) {
      Alert.alert("Notes required", "Please add notes before rejecting this request.");
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

  const runVendorEmployeeShiftAction = async (employee, action, reason = null) => {
    const employeeId = employee?.employee_id || employee?._id;
    if (!employeeId) {
      Alert.alert("Employee unavailable", "Could not identify this employee.");
      return;
    }

    const isReopen = action === "OVERRIDE_START";
    setEmployeeShiftActionLoading(`${employeeId}:${action}`);
    try {
      await vendorEmployeeShiftAction_API({
        employee_id: employeeId,
        action,
        reason,
      });
      await onRefresh({ isInitialLoad: false });
      if (isReopen) {
        setOverrideEmployee(null);
        setOverrideReason("");
      }
      Alert.alert(
        "Shift updated",
        isReopen
          ? "The employee has been clocked back in with a new override shift."
          : "The employee shift has been ended.",
      );
    } catch (error) {
      Alert.alert(
        "Shift update failed",
        error?.message || "Could not update this employee shift.",
      );
    } finally {
      setEmployeeShiftActionLoading(null);
    }
  };

  const confirmVendorEmployeeShiftAction = (employee, action) => {
    const isReopen = action === "OVERRIDE_START";
    if (isReopen) {
      setOverrideEmployee(employee);
      setOverrideReason("");
      return;
    }
    Alert.alert(
      "End employee shift?",
      "This records the clock-out time and immediately blocks employee access.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Shift",
          style: "destructive",
          onPress: () => runVendorEmployeeShiftAction(employee, action),
        },
      ],
    );
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
  const openEarningsSummary = (summaryItem) => {
    const { startDate, endDate } = getDateRange(dateFilter);
    const breakdownRows = allFoodTruckBreakdown.map((item) => {
      let value;

      if (summaryItem.key === "grossSales") {
        value = `$${formatMoney(item.sales)}`;
      } else if (summaryItem.key === "orders") {
        value = String(item.orders);
      } else if (summaryItem.key === "refundsCancels") {
        value = String(item.requests);
      } else {
        value = `$${formatMoney(item.averageTicket)}`;
      }

      return {
        label: item.label,
        value,
      };
    });

    navigation.navigate("earningsSummaryDetailScreen", {
      title: summaryItem.label,
      value: summaryItem.value,
      detailLabel: summaryItem.detailLabel,
      dateLabel: `${moment(startDate).format("MMM D")} - ${moment(endDate).format(
        "MMM D"
      )}`,
      breakdownRows,
      totals: {
        grossSales: `$${formatMoney(allFoodTruckSummary.sales)}`,
        orders: String(allFoodTruckSummary.orders),
        refundsCancels: String(allFoodTruckSummary.requests),
        avgTicket: `$${formatMoney(allFoodTruckSummary.averageTicket)}`,
      },
    });
  };

  useFocusEffect(
    useCallback(() => {
      onRefresh({ isInitialLoad: true });

      const refreshTimer = setInterval(() => {
        onRefresh({ isInitialLoad: false });
      }, EARNINGS_REFRESH_INTERVAL_MS);

      return () => clearInterval(refreshTimer);
    }, [
      dateFilter,
	      locationFilter,
	      truckUnitFilter,
	      employeeFilter,
	      employeeStatusFilter,
	      paymentFilter,
	      requestStatusFilter,
	      isEmployeesScreen,
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
        visible={!!overrideEmployee}
        onRequestClose={() => {
          if (!employeeShiftActionLoading) {
            setOverrideEmployee(null);
            setOverrideReason("");
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Override Clock-In</Text>
            <Text style={styles.modalMeta}>
              {overrideEmployee?.employee_name || "Employee"}
            </Text>
            <Text style={styles.modalMeta}>
              Most recent clock-out:{" "}
              {formatShiftDateTime(overrideEmployee?.shift?.ended_at) ||
                "Not available"}
            </Text>
            <Text style={styles.modalLabel}>Override reason</Text>
            <TextInput
              multiline
              value={overrideReason}
              onChangeText={setOverrideReason}
              placeholder="Required"
              placeholderTextColor={AppColor.textHighlighter}
              style={styles.notesInput}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalSecondary}
                disabled={!!employeeShiftActionLoading}
                onPress={() => {
                  setOverrideEmployee(null);
                  setOverrideReason("");
                }}
              >
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalPrimary}
                disabled={!!employeeShiftActionLoading}
                onPress={() => {
                  const reason = overrideReason.trim();
                  if (!reason) {
                    Alert.alert("Reason required", "Enter an override reason.");
                    return;
                  }
                  runVendorEmployeeShiftAction(
                    overrideEmployee,
                    "OVERRIDE_START",
                    reason,
                  );
                }}
              >
                <Text style={styles.modalPrimaryText}>
                  {employeeShiftActionLoading
                    ? "Clocking In..."
                    : "Override Clock-In"}
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
	                (filterPicker === "truckUnit" &&
	                  truckUnitFilter === item.value) ||
	                (filterPicker === "employee" && employeeFilter === item.value) ||
	                (filterPicker === "employeeStatus" &&
	                  employeeStatusFilter === item.value) ||
	                (filterPicker === "status" &&
	                  requestStatusFilter === item.value);
              return (
                <Pressable
                  key={`${filterPicker}-${item.label}-${item.value || "all"}`}
                  style={[
                    styles.filterPickerOption,
                    selected && styles.filterPickerOptionSelected,
                  ]}
                  onPress={() => {
	                    if (filterPicker === "location") {
	                      setLocationFilter(item.value);
	                    }
	                    if (filterPicker === "truckUnit") {
	                      setTruckUnitFilter(item.value);
	                    }
	                    if (filterPicker === "employee") {
	                      setEmployeeFilter(item.value);
	                    }
	                    if (filterPicker === "employeeStatus") {
	                      setEmployeeStatusFilter(item.value);
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
          {isEmployeesScreen ? "Employees" : "Earnings"}
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
              {!isEmployeesScreen ? (
                <>
                  <View style={styles.earningsRow}>
                    <EarningComponent
                      title={"Total Earnings"}
                      amount={formatMoney(earnings?.totalEarning || 0)}
                      onPress={() => onPressNavigationHandler({})}
                    />
                    <EarningComponent
                      title={"Today's Earnings"}
                      amount={formatMoney(earnings?.todayEarning || 0)}
                      onPress={() =>
                        onPressNavigationHandler({ durationType: "daily" })
                      }
                    />
                  </View>
                  <View style={styles.earningsRow}>
                    <EarningComponent
                      title={"Weekly Earnings"}
                      amount={formatMoney(earnings?.weeklyEarning || 0)}
                      onPress={() =>
                        onPressNavigationHandler({ durationType: "weekly" })
                      }
                    />
                    <EarningComponent
                      title={"Monthly Earnings"}
                      amount={formatMoney(earnings?.monthlyEarning || 0)}
                      onPress={() =>
                        onPressNavigationHandler({ durationType: "monthly" })
                      }
                    />
                  </View>
                </>
              ) : null}

              <View style={styles.analyticsPanel}>
                {isEmployeesScreen ? null : (
                  <>
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
                        onPress={() => setFilterPicker("truckUnit")}
                      >
                        <Text style={styles.selectLabel} numberOfLines={1}>
                          {selectedFilterLabel(
                            truckUnitOptions,
                            truckUnitFilter,
                            "All Food Trucks"
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
                    </View>
                  </>
                )}

                <View style={styles.summaryGrid}>
                  {earningsSummaryRows.map((item) => (
                    <Pressable
                      key={item.key}
                      style={styles.summaryCard}
                      onPress={
                        isEmployeesScreen
                          ? undefined
                          : () => openEarningsSummary(item)
                      }
                    >
                      <View style={styles.summaryCardHeader}>
                        <Text style={styles.summaryLabel}>
                          {isEmployeesScreen && item.key === "grossSales"
                            ? "Employee Sales"
                            : isEmployeesScreen && item.key === "orders"
                            ? "Orders Handled"
                            : item.label}
                        </Text>
                        {!isEmployeesScreen ? (
                          <FontAwesome6
                            name="circle-arrow-right"
                            size={12}
                            color={AppColor.primary}
                          />
                        ) : null}
                      </View>
                      <Text style={styles.summaryValue}>
                        {isEmployeesScreen && item.key === "grossSales"
                          ? `$${formatMoney(analyticsSummary.sales)}`
                          : isEmployeesScreen && item.key === "orders"
                          ? analyticsSummary.orders
                          : isEmployeesScreen && item.key === "refundsCancels"
                          ? analyticsSummary.requests
                          : isEmployeesScreen && item.key === "avgTicket"
                          ? `$${formatMoney(analyticsSummary.averageTicket)}`
                          : item.value}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {isEmployeesScreen ? (
                  <>
                    <Text style={styles.filterLabel}>Date Range</Text>
                    <View style={styles.segmentedControl}>
	                      {activeDateFilters.map((item) => (
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
                        onPress={() => setFilterPicker("truckUnit")}
                      >
                        <Text style={styles.selectLabel} numberOfLines={1}>
                          {selectedFilterLabel(
                            truckUnitOptions,
                            truckUnitFilter,
                            "All Food Trucks"
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
                      <Pressable
                        style={styles.selectControl}
                        onPress={() => setFilterPicker("employeeStatus")}
                      >
                        <Text style={styles.selectLabel} numberOfLines={1}>
                          {selectedFilterLabel(
                            employeeStatusOptions,
                            employeeStatusFilter,
                            "All Statuses"
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
                    </View>
                  </>
                ) : null}

                <Pressable style={styles.resetButton} onPress={resetEmployeeFilters}>
                  <Text style={styles.resetButtonText}>Reset Filters</Text>
                </Pressable>

                {isEmployeesScreen ? (
                  <>
                    <View style={styles.activityHeader}>
                      <Text style={styles.subsectionTitle}>Employee Activity</Text>
                      <View style={styles.headerActions}>
                        <Pressable
                          style={styles.manageEmployeesIconButton}
                          onPress={() =>
                            navigation.navigate("profileEmployeeManagementScreen", {
                              mode: "manage",
                            })
                          }
                          accessibilityLabel="Manage all employees"
                        >
                          <FontAwesome6
                            name="users-gear"
                            size={14}
                            color={AppColor.primary}
                          />
                        </Pressable>
                        <Pressable
                          style={styles.addEmployeeButton}
                          onPress={() =>
                            navigation.navigate("profileEmployeeManagementScreen", {
                              mode: "create",
                            })
                          }
                          accessibilityLabel="Add employee"
                        >
                          <FontAwesome6
                            name="plus"
                            size={14}
                            color={AppColor.white}
                          />
                        </Pressable>
                      </View>
                    </View>
                    {visibleEmployees.length ? (
                      visibleEmployees.map((employee) => {
                        const metrics = employee.metrics || {};
                        const truckName =
                          employee.assigned_truck_unit_name ||
                          "All Food Trucks";
                        const locationName =
                          employee.assigned_location?.title ||
                          employee.assigned_location?.address ||
                          "All locations";
                        const paymentSummary = canTapToPay
                          ? `Cash ${metrics.cash_orders || 0} / Tap ${
                              metrics.tap_orders || 0
                            }`
                          : `Cash ${metrics.cash_orders || 0}`;
                        const shiftStatusText =
                          getEmployeeShiftStatusText(employee);
                        const employeeId = employee.employee_id || employee._id;
                        const canEndEmployeeShift = !!employee.shift?.is_active;
                        const canReopenEmployeeShift =
                          !!employee.shift?.can_override_clock_in;
                        const shiftActionKey = canReopenEmployeeShift
                          ? `${employeeId}:OVERRIDE_START`
                          : `${employeeId}:END`;
                        const isShiftActionLoading =
                          employeeShiftActionLoading === shiftActionKey;

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
                                  {truckName} | {locationName}
                                </Text>
                              </View>
                              <Pressable
                                style={styles.manageButton}
                                onPress={() =>
                                  navigation.navigate(
                                    "profileEmployeeManagementScreen",
                                    {
                                      mode: "manage",
                                      employeeInternalId:
                                        employee.employee_internal_id,
                                    }
                                  )
                                }
                              >
                                <Text style={styles.manageButtonText}>Manage</Text>
                              </Pressable>
                            </View>

                            <View style={styles.activityDetails}>
                              <View style={styles.activityMetric}>
                                <Text style={styles.metaLabel}>Sales</Text>
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
                                <Text style={styles.metaValue}>
                                  {paymentSummary}
                                </Text>
                              </View>
	                              <View style={styles.activityMetric}>
	                                <Text style={styles.metaLabel}>Refund/Cancel</Text>
	                                <Text style={styles.metaValue}>
	                                  {metrics.refund_cancel_requests_submitted || 0}
	                                </Text>
	                              </View>
	                              <View style={styles.activityMetric}>
	                                <Text style={styles.metaLabel}>With Breaks</Text>
	                                <Text style={styles.metaValue}>
	                                  {Number(
	                                    metrics.gross_hours_worked || 0
	                                  ).toFixed(2)}{" "}
	                                  hrs
	                                </Text>
	                              </View>
	                              <View style={styles.activityMetric}>
	                                <Text style={styles.metaLabel}>Without Breaks</Text>
	                                <Text style={styles.metaValue}>
	                                  {Number(
	                                    metrics.net_hours_worked || 0
	                                  ).toFixed(2)}{" "}
	                                  hrs
	                                </Text>
	                              </View>
	                            </View>
                            <View style={styles.metaRow}>
                              <Text style={styles.metaLabel}>Status</Text>
                              <Text style={styles.metaValue}>
                                {shiftStatusText}
                              </Text>
                            </View>
                            {canEndEmployeeShift || canReopenEmployeeShift ? (
                              <View style={styles.shiftControlRow}>
                                <Pressable
                                  style={[
                                    styles.shiftControlButton,
                                    canEndEmployeeShift
                                      ? styles.shiftEndButton
                                      : styles.shiftReopenButton,
                                    isShiftActionLoading &&
                                      styles.shiftControlDisabled,
                                  ]}
                                  disabled={isShiftActionLoading}
                                  onPress={() =>
                                    confirmVendorEmployeeShiftAction(
                                      employee,
                                      canReopenEmployeeShift ? "OVERRIDE_START" : "END",
                                    )
                                  }
                                >
                                  <Text
                                    style={[
                                      styles.shiftControlButtonText,
                                      canEndEmployeeShift &&
                                        styles.shiftEndButtonText,
                                    ]}
                                  >
                                    {isShiftActionLoading
                                      ? "Updating..."
	                                      : canReopenEmployeeShift
	                                        ? "Override Clock-In"
	                                        : "End Shift"}
	                                  </Text>
	                                </Pressable>
	                              </View>
	                            ) : null}
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
                          {employees.length
                            ? "No employees match these filters"
                            : "No activity found"}
                        </Text>
                        <Text style={styles.emptyActivityText}>
                          {employees.length
                            ? "Try changing the employee status filter."
                            : "Try changing the filters or selecting a wider date range."}
                        </Text>
                      </View>
                    )}

                    <View style={styles.subsectionCard}>
                      <View style={styles.refundSectionHeader}>
                        <View>
                          <Text style={styles.subsectionTitle}>
                            Employee Refund Activity
                          </Text>
                          <Text style={styles.emptyInlineText}>
                            View refund/cancel activity by employee.
                          </Text>
                        </View>
                      </View>
                      <View style={styles.refundFilterBar}>
                        <View>
                          <Text style={styles.refundFilterLabel}>Status</Text>
                          <Text style={styles.refundFilterHint}>
                            Show requests by review status
                          </Text>
                        </View>
                        <Pressable
                          style={styles.refundFilterSelect}
                          onPress={() => setFilterPicker("status")}
                        >
                          <Text style={styles.refundFilterSelectText}>
                            {selectedFilterLabel(
                              statusOptions,
                              requestStatusFilter,
                              "All"
                            )}
                          </Text>
                          <MaterialCommunityIcons
                            name="chevron-down"
                            size={18}
                            color={AppColor.primary}
                          />
                        </Pressable>
                      </View>
                      <View style={styles.requestStatusRow}>
                        <Text style={styles.requestStatusText}>
                          Pending {refundStatusCounts.pending}
                        </Text>
                        <Text style={styles.requestStatusText}>
                          Approved {refundStatusCounts.approved}
                        </Text>
                        <Text style={styles.requestStatusText}>
                          Rejected {refundStatusCounts.rejected}
                        </Text>
                        <Text style={styles.requestStatusText}>
                          All {refundStatusCounts.all}
                        </Text>
                      </View>
                      {refundRequests.length ? (
                        refundRequests.map((request) => {
                          const isPending =
                            String(request.request_status || "").toUpperCase() ===
                            "PENDING";
                          const orderId = request.order_id?._id || request.order_id;
                          return (
                          <Pressable
                            key={request.request_id}
                            style={styles.requestCard}
                            onPress={() => {
                              if (orderId) {
                                navigation.navigate("orderDetailsScreen", {
                                  orderId,
                                });
                              }
                            }}
                          >
                            <Text style={styles.requestTitle}>
                              Order #{request.order_id?.orderNumber || request.order_id}
                            </Text>
                            <Text style={styles.requestMeta}>
                              Employee: {request.employee_login_id || "Employee"}
                            </Text>
                            <Text style={styles.requestMeta}>
                              Amount: ${formatMoney(request.order_id?.total || 0)} | Status:{" "}
                              {request.request_status || "Not available"}
                            </Text>
                            <Text style={styles.requestMeta}>
                              {formatDateTime(request.requested_at)}
                            </Text>
                            {isPending ? (
                              <View style={styles.reviewActions}>
                                <Pressable
                                  style={styles.rejectButton}
                                  onPress={() =>
                                    openReviewModal(request, "REJECTED")
                                  }
                                >
                                  <Text style={styles.rejectButtonText}>Reject</Text>
                                </Pressable>
                                <Pressable
                                  style={styles.approveButton}
                                  onPress={() =>
                                    openReviewModal(request, "APPROVED")
                                  }
                                >
                                  <Text style={styles.approveButtonText}>Approve</Text>
                                </Pressable>
                              </View>
                            ) : null}
                          </Pressable>
                        );
                        })
                      ) : (
                        <Text style={styles.emptyInlineText}>
                          No employee refund or cancel activity found.
                        </Text>
                      )}
                    </View>
                  </>
                ) : null}
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
  summaryCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
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
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  addEmployeeButton: {
    alignItems: "center",
    backgroundColor: AppColor.primary,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  manageEmployeesIconButton: {
    alignItems: "center",
    backgroundColor: "#FFF5EE",
    borderColor: AppColor.primary,
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  expandButton: {
    borderColor: AppColor.primary,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  expandButtonText: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 12,
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
    backgroundColor: "#F7F3EF",
    borderBottomColor: "#EEF0F4",
    borderBottomWidth: 1,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  filterPickerOptionSelected: {
    backgroundColor: AppColor.primary + "18",
    borderColor: AppColor.primary,
    borderWidth: 1,
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
  shiftControlRow: {
    alignItems: "flex-end",
    borderTopColor: "#EEF0F4",
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
  },
  shiftControlButton: {
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 14,
  },
  shiftReopenButton: {
    borderColor: AppColor.primary,
  },
  shiftEndButton: {
    borderColor: "#FF7A7A",
  },
  shiftControlDisabled: {
    opacity: 0.5,
  },
  shiftControlButtonText: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 12,
  },
  shiftEndButtonText: {
    color: "#FF7A7A",
  },
  manageButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    borderColor: AppColor.primary,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 14,
  },
  manageButtonText: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 12,
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
  refundSectionHeader: {
    marginBottom: 2,
  },
  refundFilterBar: {
    alignItems: "center",
    backgroundColor: AppColor.white,
    borderColor: "#FFE0C2",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
  },
  refundFilterLabel: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 12,
    marginBottom: 2,
  },
  refundFilterHint: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 11,
  },
  refundFilterSelect: {
    alignItems: "center",
    backgroundColor: "#FFF5EE",
    borderColor: AppColor.primary,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  refundFilterSelectText: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 12,
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
