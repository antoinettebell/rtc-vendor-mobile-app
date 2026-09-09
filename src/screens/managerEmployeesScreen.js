import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StatusBarManager from "../components/StatusBarManager";
import { getManagerEmployees_API, managerEmployeeShiftAction_API } from "../api/appAPI";
import { AppColor, Mulish400, Mulish600, Mulish700 } from "../utils/theme";

const formatStatus = (employee) =>
  employee?.has_open_shift ? "Clocked in" : employee?.is_working ? "On duty" : "Not clocked in";

const ManagerEmployeesScreen = () => {
  const insets = useSafeAreaInsets();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingEmployeeId, setActingEmployeeId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getManagerEmployees_API();
      setEmployees(response?.data?.vendoremployeeList || []);
    } catch (error) {
      Alert.alert("Employees unavailable", error?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

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
