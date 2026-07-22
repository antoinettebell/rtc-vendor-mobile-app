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
  const [locationLoading, setLocationLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const foodTruck = user?.foodTruck;
  const assignedLocation = dashboard?.assignedLocation || user?.assignedLocation;
  const assignedTruckUnit =
    dashboard?.assignedTruckUnit || user?.assignedTruckUnit || null;
  const shift = dashboard?.shift || {};
  const isOnDuty =
    dashboard?.employee?.is_working !== undefined
      ? !!dashboard.employee.is_working
      : !!user?.is_working;
  const canManageShift = isOnDuty;
  const canManageStore = canManageShift && !!assignedTruckUnit?._id;
  const isShiftActive = !!shift?.is_active;
  const hasClockedOut = !!shift?.ended_at && !isShiftActive;
  const isOnBreak = shift?.shift_status === "ON_BREAK";
  const breakCount = Number(shift?.break_count || 0);
  const canStartShift = isOnDuty && !isShiftActive && !hasClockedOut;
  const canPauseForBreak =
    isOnDuty && isShiftActive && !isOnBreak && breakCount < 2;
  const locationIsOpen =
    dashboard?.location?.is_open !== undefined
      ? dashboard.location.is_open
      : (assignedTruckUnit?.open_locations || []).some(
          (location) =>
            location?.locationId?.toString() === assignedLocation?._id?.toString() &&
            location?.isOrderingOpen,
        );
  const hasShiftAssignment = !!assignedLocation?._id && !!assignedTruckUnit?._id;

  const handleBack = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "employeeSessionScreen" }],
    });
  };

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

  const updateEmployeeOrderingStatus = async ({ nextOpen, overrideReason }) => {
    setLocationLoading(true);
    try {
      const response = await updateLocationOrdering_API({
        foodtruck_id: foodTruck._id,
        location_id: assignedLocation._id,
        truck_unit_id: assignedTruckUnit?._id || user?.assigned_truck_unit_id || null,
        isOrderingOpen: nextOpen,
        schedule_override_reason: overrideReason,
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

  const handleToggleLocation = async () => {
    if (!foodTruck?._id || !assignedLocation?._id || !assignedTruckUnit?._id) return;
    if (!canManageStore) {
      Alert.alert(
        "Not scheduled",
        "You must be Working and assigned to a truck before you can open or close the store.",
      );
      return;
    }

    const nextOpen = !locationIsOpen;
    Alert.alert(
      nextOpen ? "Are you opening early?" : "Are you closing early?",
      "This change will override the weekly schedule. You will need to manually open/close for the rest of the day. The automatic open/close feature will resume after midnight.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: () =>
            updateEmployeeOrderingStatus({
              nextOpen,
              overrideReason: nextOpen ? "OPENING_EARLY" : "CLOSING_EARLY",
            }),
        },
      ],
    );
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

  const confirmEndShift = () => {
    Alert.alert(
      "End shift?",
      "Once you clock out, only the vendor can clock you back in for this shift.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Shift",
          style: "destructive",
          onPress: () => runShiftAction("END"),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          onPress={handleBack}
        >
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
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.panelTitle}>Duty Status</Text>
              <Text style={styles.caption}>
                Vendor managed schedule status
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                isOnDuty ? styles.statusBadgeActive : styles.statusBadgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isOnDuty
                    ? styles.statusBadgeTextActive
                    : styles.statusBadgeTextInactive,
                ]}
              >
                {isOnDuty ? "Working" : "Off duty"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.panelTitle}>Open/Close Store</Text>
              <Text style={styles.caption}>
                {!hasShiftAssignment
                  ? "Truck and location assignment required"
                  : !isOnDuty
                    ? "Go on duty before changing store status"
                    : assignedTruckUnit?.name
                  ? `${assignedTruckUnit.name} is ${locationIsOpen ? "open" : "closed"}`
                  : "No truck assigned"}
              </Text>
            </View>
            {canManageStore ? (
              <Switch
                value={locationIsOpen}
                disabled={locationLoading}
                onValueChange={handleToggleLocation}
                trackColor={{ false: AppColor.border, true: AppColor.primary }}
              />
            ) : (
              <View style={styles.readOnlyStoreBadge}>
                <Text style={styles.readOnlyStoreBadgeText}>
                  {assignedTruckUnit?._id ? "View only" : "Unavailable"}
                </Text>
              </View>
            )}
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
            <Text style={styles.detailLabel}>Clock out</Text>
            <Text style={styles.detailValue}>{formatDateTime(shift.ended_at)}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.actionButton,
              !canStartShift && styles.disabledButton,
            ]}
            disabled={!canStartShift || !!actionLoading}
            onPress={() => runShiftAction("START")}
          >
            <Text style={styles.actionButtonText}>
              {actionLoading === "START"
                ? "Starting..."
                : hasClockedOut
                  ? "Shift Ended"
                  : "Start Shift"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              !canPauseForBreak && styles.disabledButton,
            ]}
            disabled={!canPauseForBreak || !!actionLoading}
            onPress={() => runShiftAction("PAUSE")}
          >
            <Text style={styles.secondaryButtonText}>
              {actionLoading === "PAUSE"
                ? "Pausing..."
                : breakCount >= 2
                  ? "Break Limit Reached"
                  : "Pause for Break"}
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
            onPress={confirmEndShift}
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
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeActive: {
    backgroundColor: "#E8F5E9",
    borderColor: "#A5D6A7",
  },
  statusBadgeInactive: {
    backgroundColor: "#F5F5F5",
    borderColor: AppColor.border,
  },
  statusBadgeText: {
    fontFamily: Mulish700,
    fontSize: 13,
  },
  statusBadgeTextActive: {
    color: "#2E7D32",
  },
  statusBadgeTextInactive: {
    color: AppColor.textHighlighter,
  },
  readOnlyStoreBadge: {
    backgroundColor: "#F5F5F5",
    borderColor: AppColor.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  readOnlyStoreBadgeText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish700,
    fontSize: 13,
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
