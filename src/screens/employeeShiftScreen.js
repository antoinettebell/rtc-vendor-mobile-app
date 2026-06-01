import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import {
  employeeShiftAction_API,
  getEmployeeDashboard_API,
  toggleEmployeeDuty_API,
  updateLocationOrdering_API,
} from "../api/appAPI";
import { setAuthToken, setUser } from "../redux/slices/userSlice";
import { AppColor, Mulish400, Mulish600, Mulish700 } from "../utils/theme";

const formatDateTime = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatShiftDuration = (startedAt, endedAt) => {
  if (!startedAt) return "Not started";
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Not available";
  }
  const diffMinutes = Math.max(0, Math.floor((end - start) / 60000));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return hours <= 0 ? `${minutes}m` : `${hours}h ${minutes}m`;
};

const EmployeeShiftScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.userReducer.user);

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dutyLoading, setDutyLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const foodTruck = user?.foodTruck;
  const assignedLocation = dashboard?.assignedLocation || user?.assignedLocation;
  const shift = dashboard?.shift || {};
  const isOnDuty = !!user?.is_working;
  const isShiftActive = !!user?.employee_session_id && shift?.is_active !== false;
  const isOnBreak = shift?.shift_status === "ON_BREAK";
  const locationIsOpen =
    dashboard?.location?.is_open !== undefined
      ? dashboard.location.is_open
      : foodTruck?.currentLocation?.toString() ===
          assignedLocation?._id?.toString() ||
        !!assignedLocation?.isOrderingOpen;

  const loadDashboard = useCallback(async () => {
    const response = await getEmployeeDashboard_API();
    if (response?.success && response?.data?.dashboard) {
      setDashboard(response.data.dashboard);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await loadDashboard();
    } catch (error) {
      Alert.alert(
        "Shift unavailable",
        error?.message || "Could not load shift details.",
      );
    } finally {
      setLoading(false);
    }
  }, [loadDashboard]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const mergeEmployeeResponse = (response) => {
    const nextEmployee = response?.data?.employee;
    if (nextEmployee) {
      dispatch(
        setUser({
          ...user,
          ...nextEmployee,
          foodTruck,
          assignedLocation: response?.data?.assignedLocation || assignedLocation,
        }),
      );
    }
    if (response?.data?.authToken) {
      dispatch(setAuthToken(response.data.authToken));
    }
  };

  const handleToggleDuty = async () => {
    setDutyLoading(true);
    try {
      const response = await toggleEmployeeDuty_API({ is_working: !isOnDuty });
      mergeEmployeeResponse(response);
      await loadDashboard();
    } catch (error) {
      Alert.alert(
        "Duty update failed",
        error?.message || "Could not update duty status.",
      );
    } finally {
      setDutyLoading(false);
    }
  };

  const handleToggleLocation = async () => {
    if (!foodTruck?._id || !assignedLocation?._id) return;
    setLocationLoading(true);
    try {
      const response = await updateLocationOrdering_API({
        foodtruck_id: foodTruck._id,
        location_id: assignedLocation._id,
        isOrderingOpen: !locationIsOpen,
      });
      const updatedFoodTruck = response?.data?.foodtruck;
      const updatedLocation = updatedFoodTruck?.locations?.find(
        (location) => location._id === assignedLocation._id,
      );
      if (updatedFoodTruck) {
        dispatch(
          setUser({
            ...user,
            foodTruck: { ...foodTruck, ...updatedFoodTruck },
            assignedLocation: updatedLocation || assignedLocation,
          }),
        );
      }
      await loadDashboard();
    } catch (error) {
      Alert.alert(
        "Store update failed",
        error?.message || "Could not update store status.",
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const runShiftAction = async (action) => {
    setActionLoading(action);
    try {
      const response = await employeeShiftAction_API({ action });
      mergeEmployeeResponse(response);
      await loadDashboard();
    } catch (error) {
      Alert.alert(
        "Shift update failed",
        error?.message || "Could not update shift.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={AppColor.black} />
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <Text style={styles.kicker}>My Shift</Text>
          <Text style={styles.title}>
            {[user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
              "Employee"}
          </Text>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        contentContainerStyle={styles.content}
      >
        {loading && !dashboard ? (
          <ActivityIndicator color={AppColor.primary} style={styles.loader} />
        ) : null}

        <View style={styles.panel}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.panelTitle}>On/Off Duty</Text>
              <Text style={styles.caption}>
                {isOnDuty ? "Available to work" : "Not available for shifts"}
              </Text>
            </View>
            <Switch
              value={isOnDuty}
              disabled={dutyLoading}
              onValueChange={handleToggleDuty}
              trackColor={{ false: AppColor.border, true: AppColor.primary }}
            />
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.panelTitle}>Open/Close Store</Text>
              <Text style={styles.caption}>
                {locationIsOpen ? "Store is open" : "Store is closed"}
              </Text>
            </View>
            <Switch
              value={locationIsOpen}
              disabled={locationLoading}
              onValueChange={handleToggleLocation}
              trackColor={{ false: AppColor.border, true: AppColor.primary }}
            />
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Shift Actions</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current shift</Text>
            <Text style={styles.detailValue}>
              {formatShiftDuration(shift.started_at, shift.ended_at)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Started</Text>
            <Text style={styles.detailValue}>{formatDateTime(shift.started_at)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Break started</Text>
            <Text style={styles.detailValue}>
              {formatDateTime(shift.break_started_at)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Break minutes</Text>
            <Text style={styles.detailValue}>{shift.total_break_minutes || 0}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.actionButton,
              (!isOnDuty || isShiftActive) && styles.disabledButton,
            ]}
            disabled={!isOnDuty || isShiftActive || !!actionLoading}
            onPress={() => runShiftAction("START")}
          >
            <Text style={styles.actionButtonText}>
              {actionLoading === "START" ? "Starting..." : "Start Shift"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              (!isOnDuty || !isShiftActive || isOnBreak) && styles.disabledButton,
            ]}
            disabled={!isOnDuty || !isShiftActive || isOnBreak || !!actionLoading}
            onPress={() => runShiftAction("PAUSE")}
          >
            <Text style={styles.secondaryButtonText}>
              {actionLoading === "PAUSE" ? "Pausing..." : "Pause for Break"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              (!isOnDuty || !isShiftActive || !isOnBreak) && styles.disabledButton,
            ]}
            disabled={!isOnDuty || !isShiftActive || !isOnBreak || !!actionLoading}
            onPress={() => runShiftAction("RESUME")}
          >
            <Text style={styles.secondaryButtonText}>
              {actionLoading === "RESUME" ? "Resuming..." : "Resume Shift"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.dangerButton,
              (!isOnDuty || !isShiftActive) && styles.disabledButton,
            ]}
            disabled={!isOnDuty || !isShiftActive || !!actionLoading}
            onPress={() => runShiftAction("END")}
          >
            <Text style={styles.dangerButtonText}>
              {actionLoading === "END" ? "Ending..." : "End Shift"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EmployeeShiftScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
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
    height: 38,
    justifyContent: "center",
    marginRight: 10,
    width: 38,
  },
  headerTextBlock: { flex: 1 },
  kicker: { color: AppColor.primary, fontFamily: Mulish700, fontSize: 12 },
  title: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 21,
    marginTop: 2,
  },
  content: { padding: 16, paddingBottom: 32 },
  loader: { marginVertical: 24 },
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
  },
  caption: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 13,
    marginTop: 4,
  },
  toggleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailRow: {
    borderBottomColor: AppColor.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  detailLabel: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish600,
    fontSize: 13,
  },
  detailValue: {
    color: AppColor.black,
    flex: 1,
    fontFamily: Mulish700,
    fontSize: 13,
    marginLeft: 12,
    textAlign: "right",
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: AppColor.primary,
    borderRadius: 6,
    marginTop: 16,
    paddingVertical: 13,
  },
  actionButtonText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 15,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: AppColor.border,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 10,
    paddingVertical: 13,
  },
  secondaryButtonText: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 15,
  },
  dangerButton: {
    alignItems: "center",
    borderColor: AppColor.red,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 10,
    paddingVertical: 13,
  },
  dangerButtonText: {
    color: AppColor.red,
    fontFamily: Mulish700,
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.45,
  },
});
