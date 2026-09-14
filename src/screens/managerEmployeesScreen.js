import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StatusBarManager from "../components/StatusBarManager";
import { getManagerEmployees_API, getRefundCancelRequests_API, managerEmployeeShiftAction_API, reviewRefundCancelRequest_API } from "../api/appAPI";
import { AppColor, Mulish400, Mulish600, Mulish700 } from "../utils/theme";

const formatStatus = (employee) =>
  employee?.has_open_shift ? "Clocked in" : employee?.is_working ? "On duty" : "Not clocked in";
const scalarText = (value, fallback = "") => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (value && typeof value === "object" && value._id !== value) {
    return scalarText(value._id, fallback);
  }
  return fallback;
};
const orderLabel = (request) =>
  scalarText(request?.order_id?.orderNumber) ||
  scalarText(request?.order_id?._id) ||
  scalarText(request?.order_id, "Unavailable");

const ManagerEmployeesScreen = () => {
  const insets = useSafeAreaInsets();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingEmployeeId, setActingEmployeeId] = useState(null);
  const [refundRequests, setRefundRequests] = useState([]);
  const [responseNotes, setResponseNotes] = useState({});
  const [reviewingRequestId, setReviewingRequestId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [employeeResponse, refundResponse] = await Promise.all([
        getManagerEmployees_API(),
        getRefundCancelRequests_API({ status: "PENDING", limit: 25 }),
      ]);
      setEmployees(employeeResponse?.data?.vendoremployeeList || []);
      setRefundRequests(refundResponse?.data?.requests || []);
    } catch (error) {
      Alert.alert("Employees unavailable", error?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const reviewRequest = (request, status) => {
    const notes = String(responseNotes[request.request_id] || "").trim();
    if (status === "REJECTED" && !notes) {
      Alert.alert("Notes required", "Please add a response note before rejecting this request.");
      return;
    }
    Alert.alert(
      status === "APPROVED" ? "Approve request?" : "Reject request?",
      status === "APPROVED"
        ? "The refund or cancellation will be processed now."
        : "The employee will be able to see your response.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: status === "APPROVED" ? "Approve" : "Reject",
          style: status === "REJECTED" ? "destructive" : "default",
          onPress: async () => {
            setReviewingRequestId(request.request_id);
            try {
              await reviewRefundCancelRequest_API({
                request_id: request.request_id,
                payload: {
                  request_status: status,
                  vendor_response_notes: notes,
                },
              });
              await load();
            } catch (error) {
              Alert.alert("Review unavailable", error?.message || "Please try again.");
            } finally {
              setReviewingRequestId(null);
            }
          },
        },
      ],
    );
  };

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const runAction = (employee, action) => {
    const actionLabel = {
      END: "Clock Out",
      OVERRIDE_START: "Override Clock-In",
      PAUSE: "Start Break",
      RESUME: "Resume Shift",
    }[action] || "Update Shift";
    const submit = async () => {
      setActingEmployeeId(employee._id);
      try {
        await managerEmployeeShiftAction_API({
          employee_id: employee._id,
          action,
          reason: action === "OVERRIDE_START" ? "Manager override: employee unable to clock in" : null,
        });
        await load();
      } catch (error) {
        Alert.alert(`${actionLabel} unavailable`, error?.message || "Please try again.");
      } finally {
        setActingEmployeeId(null);
      }
    };
    Alert.alert(
      actionLabel,
      action === "END"
        ? `End ${employee.first_name} ${employee.last_name}'s active shift?`
        : action === "PAUSE"
          ? `Start a break for ${employee.first_name} ${employee.last_name}?`
          : action === "RESUME"
            ? `Resume ${employee.first_name} ${employee.last_name}'s shift?`
            : `Clock in ${employee.first_name} ${employee.last_name}? This override is recorded for the vendor.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: actionLabel, style: action === "END" ? "destructive" : "default", onPress: submit },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBarManager />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.title}>Employees</Text>
        <Text style={styles.subtitle}>Only employees within your assigned food truck scope are shown.</Text>
      </View>
      {loading ? <ActivityIndicator color={AppColor.primary} style={styles.loader} /> : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={AppColor.primary} />}
        >
          <View style={styles.refundSection}>
            <Text style={styles.sectionTitle}>Employee Refund Activity</Text>
            <Text style={styles.sectionHint}>Only requests made while you were on duty at this location remain available while you are still on duty here.</Text>
            {refundRequests.length ? refundRequests.map((request) => (
              <View key={request.request_id} style={styles.refundCard}>
                <Text style={styles.name}>Order #{orderLabel(request)}</Text>
                <Text style={styles.meta}>{request.request_type} · {request.reason_code}</Text>
                <Text style={styles.meta}>Employee: {request.employee_login_id || "Employee"}</Text>
                {request.employee_notes ? <Text style={styles.meta}>Note: {request.employee_notes}</Text> : null}
                <TextInput
                  multiline
                  placeholder="Response note (required to reject)"
                  style={styles.notesInput}
                  value={responseNotes[request.request_id] || ""}
                  onChangeText={(value) => setResponseNotes((current) => ({ ...current, [request.request_id]: value }))}
                />
                <View style={styles.reviewActions}>
                  <TouchableOpacity disabled={reviewingRequestId === request.request_id} style={[styles.reviewButton, styles.rejectButton]} onPress={() => reviewRequest(request, "REJECTED")}><Text style={styles.actionText}>Reject</Text></TouchableOpacity>
                  <TouchableOpacity disabled={reviewingRequestId === request.request_id} style={[styles.reviewButton, styles.approveButton]} onPress={() => reviewRequest(request, "APPROVED")}><Text style={styles.actionText}>{reviewingRequestId === request.request_id ? "Saving..." : "Approve"}</Text></TouchableOpacity>
                </View>
              </View>
            )) : <Text style={styles.empty}>No pending requests are available for your current duty location.</Text>}
          </View>
          {employees.length ? employees.map((employee) => {
            const active = !!employee.has_open_shift;
            const shiftStatus = employee?.shift?.shift_status;
            const breakCount = Number(employee?.shift?.break_count || 0);
            const actionAvailable = active || !!employee.shift_summary?.can_override_clock_in;
            return (
              <View key={employee._id} style={styles.card}>
                <Text style={styles.name}>{employee.first_name} {employee.last_name}</Text>
                <Text style={styles.meta}>{employee.assigned_truck_unit_name || "Assigned food truck"}</Text>
                <Text style={styles.status}>Status: {formatStatus(employee)}</Text>
                {actionAvailable ? (
                  <View style={styles.actionStack}>
                    {active && shiftStatus !== "ON_BREAK" && breakCount < 2 ? (
                      <TouchableOpacity
                        disabled={actingEmployeeId === employee._id}
                        style={[styles.actionButton, styles.breakButton]}
                        onPress={() => runAction(employee, "PAUSE")}
                      >
                        <Text style={styles.actionText}>
                          {actingEmployeeId === employee._id ? "Saving..." : `Start Break ${breakCount + 1}`}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    {active && shiftStatus === "ON_BREAK" ? (
                      <TouchableOpacity
                        disabled={actingEmployeeId === employee._id}
                        style={[styles.actionButton, styles.clockInButton]}
                        onPress={() => runAction(employee, "RESUME")}
                      >
                        <Text style={styles.actionText}>
                          {actingEmployeeId === employee._id ? "Saving..." : "Resume Shift"}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      disabled={actingEmployeeId === employee._id}
                      style={[styles.actionButton, active ? styles.clockOutButton : styles.clockInButton]}
                      onPress={() => runAction(employee, active ? "END" : "OVERRIDE_START")}
                    >
                      <Text style={styles.actionText}>
                        {actingEmployeeId === employee._id ? "Saving..." : active ? "Clock Out" : "Override Clock-In"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          }) : <Text style={styles.empty}>No employees are assigned to your management scope.</Text>}
        </ScrollView>
      )}
    </View>
  );
};

export default ManagerEmployeesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { backgroundColor: AppColor.white, borderBottomColor: AppColor.border, borderBottomWidth: 1, paddingHorizontal: 20, paddingBottom: 14 },
  title: { color: AppColor.text, fontFamily: Mulish700, fontSize: 26 },
  subtitle: { color: AppColor.subText, fontFamily: Mulish400, fontSize: 13, marginTop: 4 },
  loader: { marginTop: 32 },
  content: { gap: 12, padding: 16 },
  refundSection: { gap: 10, marginBottom: 8 },
  sectionTitle: { color: AppColor.text, fontFamily: Mulish700, fontSize: 21 },
  sectionHint: { color: AppColor.subText, fontFamily: Mulish400, fontSize: 13, lineHeight: 19 },
  refundCard: { backgroundColor: "#FFF7ED", borderColor: "#FDBA74", borderRadius: 10, borderWidth: 1, padding: 16 },
  notesInput: { backgroundColor: AppColor.white, borderColor: AppColor.border, borderRadius: 8, borderWidth: 1, color: AppColor.text, fontFamily: Mulish400, marginTop: 12, minHeight: 70, padding: 10, textAlignVertical: "top" },
  reviewActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  reviewButton: { alignItems: "center", borderRadius: 8, flex: 1, minHeight: 44, justifyContent: "center" },
  approveButton: { backgroundColor: AppColor.primary },
  rejectButton: { backgroundColor: AppColor.red },
  card: { backgroundColor: AppColor.white, borderColor: AppColor.border, borderRadius: 10, borderWidth: 1, padding: 16 },
  name: { color: AppColor.text, fontFamily: Mulish700, fontSize: 19 },
  meta: { color: AppColor.subText, fontFamily: Mulish400, fontSize: 14, marginTop: 4 },
  status: { color: AppColor.text, fontFamily: Mulish600, fontSize: 14, marginTop: 12 },
  actionButton: { alignItems: "center", borderRadius: 8, marginTop: 14, minHeight: 44, justifyContent: "center" },
  actionStack: { gap: 0 },
  clockInButton: { backgroundColor: AppColor.primary },
  clockOutButton: { backgroundColor: AppColor.red },
  breakButton: { backgroundColor: "#9A6700" },
  actionText: { color: AppColor.white, fontFamily: Mulish700, fontSize: 14 },
  empty: { color: AppColor.subText, fontFamily: Mulish400, fontSize: 15, paddingTop: 28, textAlign: "center" },
});
