import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { IconButton } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { Dropdown } from "react-native-element-dropdown";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor, Mulish400, Mulish600, Mulish700 } from "../utils/theme";
import {
  archiveVendorEmployee_API,
  createVendorEmployee_API,
  deleteVendorEmployee_API,
  getVendorEmployeeShiftHistory_API,
  getVendorEmployees_API,
  resetVendorEmployeePin_API,
  updateVendorEmployee_API,
} from "../api/appAPI";

const initialForm = {
  first_name: "",
  last_name: "",
  zip_code: "",
  assigned_location_id: "",
  assigned_truck_unit_id: "",
  pin: "",
};

const getGeneratedLoginPreview = ({ first_name, last_name, zip_code }) => {
  const initial = first_name.trim().charAt(0);
  const last = last_name.trim().replace(/[^a-z0-9]/gi, "");
  const zip = zip_code.trim().replace(/[^a-z0-9]/gi, "");
  const value = `${initial}${last}${zip}`.toLowerCase();
  return value || "Generated after save";
};

const normalizePin = (value) => value.replace(/\D/g, "").slice(0, 4);
const isFourDigitPin = (value) => /^\d{4}$/.test(value);
const SHIFT_HISTORY_FILTERS = [
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

const formatShiftDateTime = (value) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString([], {
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
};

const ProfileEmployeeManagementScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const user = useSelector((state) => state.userReducer.user);
  const foodTruck = user?.foodTruck;
  const initialMode = route?.params?.mode === "create" ? "create" : "manage";
  const initialEmployeeInternalId = route?.params?.employeeInternalId || null;

  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetEmployeeId, setResetEmployeeId] = useState(null);
  const [resetPin, setResetPin] = useState("");
  const [expandedEmployeeId, setExpandedEmployeeId] = useState(null);
  const [managementMode, setManagementMode] = useState(initialMode);
  const [employeeLocationDrafts, setEmployeeLocationDrafts] = useState({});
  const [employeeTruckDrafts, setEmployeeTruckDrafts] = useState({});
  const [activeTab, setActiveTab] = useState("current");
  const [shiftHistoryRange, setShiftHistoryRange] = useState("week");
  const [shiftHistoryByEmployee, setShiftHistoryByEmployee] = useState({});
  const [shiftHistoryLoadingId, setShiftHistoryLoadingId] = useState(null);
  const isManageMode = managementMode === "manage";

  const locationOptions = useMemo(
    () =>
      (foodTruck?.locations || []).map((location) => ({
        label: location.title || location.address || "Serving location",
        value: location._id,
      })),
    [foodTruck?.locations]
  );

  const truckOptions = useMemo(() => {
    const units = (foodTruck?.truck_units || []).filter((unit) => !unit.is_archived);
    if (units.length) {
      return units.map((unit, index) => ({
        label: unit.name || `Truck ${index + 1}`,
        value: unit._id,
      }));
    }

    return [
      {
        label: foodTruck?.name || "Truck 1",
        value: "",
      },
    ];
  }, [foodTruck]);

  const loginPreview = getGeneratedLoginPreview(form);

  const getLocationLabel = (locationId) =>
    locationOptions.find((location) => location.value === locationId)?.label ||
    "Unassigned location";

  const getTruckLabel = (truckUnitId, truckUnitName) =>
    truckOptions.find((truck) => truck.value === truckUnitId)?.label ||
    truckUnitName ||
    foodTruck?.name ||
    "Truck 1";

  const setFormValue = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getVendorEmployees_API({
        archivedOnly: activeTab === "archived",
      });
      if (response?.success && response?.data) {
        const nextEmployees = response.data.vendoremployeeList || [];
        setEmployees(nextEmployees);
        if (initialEmployeeInternalId && activeTab === "current") {
          const matchedEmployee = nextEmployees.find(
            (employee) =>
              employee.employee_internal_id === initialEmployeeInternalId
          );
          if (matchedEmployee) {
            setExpandedEmployeeId(matchedEmployee._id);
            setEmployeeLocationDrafts((current) => ({
              ...current,
              [matchedEmployee._id]: matchedEmployee.assigned_location_id,
            }));
            setEmployeeTruckDrafts((current) => ({
              ...current,
              [matchedEmployee._id]:
                matchedEmployee.assigned_truck_unit_id || "",
            }));
            setManagementMode("manage");
          }
        }
      }
    } catch (error) {
      Alert.alert("Employees unavailable", error?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, initialEmployeeInternalId]);

  const validateForm = () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      Alert.alert("Name required", "Enter the employee's first and last name.");
      return false;
    }

    if (!form.zip_code.trim()) {
      Alert.alert("Zip code required", "Enter the employee's zip code.");
      return false;
    }

    if (!form.assigned_location_id) {
      Alert.alert("Location required", "Assign the employee to a saved location.");
      return false;
    }

    if (!form.assigned_truck_unit_id && truckOptions.length > 1) {
      Alert.alert("Truck required", "Assign the employee to a truck name.");
      return false;
    }

    if (!isFourDigitPin(form.pin)) {
      Alert.alert("PIN required", "Set a 4 digit employee PIN.");
      return false;
    }

    return true;
  };

  const createEmployee = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const response = await createVendorEmployee_API({
        food_truck_id: foodTruck?._id,
        ...form,
      });
      if (response?.success) {
        setForm(initialForm);
        setManagementMode("manage");
        await fetchEmployees();
        Alert.alert("Employee saved", "The employee was added to Current Employees.");
      }
    } catch (error) {
      Alert.alert("Could not create employee", error?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const updateEmployee = async (employee, payload) => {
    const previousEmployees = employees;
    setEmployees((current) =>
      current.map((item) =>
        item._id === employee._id ? { ...item, ...payload } : item
      )
    );

    try {
      await updateVendorEmployee_API({
        employee_id: employee._id,
        payload,
      });
    } catch (error) {
      setEmployees(previousEmployees);
      Alert.alert("Update failed", error?.message || "Please try again.");
    }
  };

  const toggleEmployeeDetails = (employee) => {
    setExpandedEmployeeId((current) =>
      current === employee._id ? null : employee._id
    );
    setEmployeeLocationDrafts((current) => ({
      ...current,
      [employee._id]: current[employee._id] || employee.assigned_location_id,
    }));
    setEmployeeTruckDrafts((current) => ({
      ...current,
      [employee._id]:
        current[employee._id] || employee.assigned_truck_unit_id || "",
    }));
  };

  const loadShiftHistory = async (employee, range = shiftHistoryRange) => {
    if (!employee?._id) return;

    setShiftHistoryLoadingId(employee._id);
    try {
      const response = await getVendorEmployeeShiftHistory_API({
        employee_id: employee._id,
        range,
      });
      setShiftHistoryByEmployee((current) => ({
        ...current,
        [employee._id]: response?.data?.sessions || [],
      }));
    } catch (error) {
      Alert.alert(
        "Shift history unavailable",
        error?.message || "Please try again."
      );
    } finally {
      setShiftHistoryLoadingId(null);
    }
  };

  const selectShiftHistoryRange = async (employee, range) => {
    setShiftHistoryRange(range);
    await loadShiftHistory(employee, range);
  };

  const setEmployeeLocationDraft = (employeeId, locationId) => {
    setEmployeeLocationDrafts((current) => ({
      ...current,
      [employeeId]: locationId,
    }));
  };

  const setEmployeeTruckDraft = (employeeId, truckUnitId) => {
    setEmployeeTruckDrafts((current) => ({
      ...current,
      [employeeId]: truckUnitId,
    }));
  };

  const assignEmployeeLocation = async (employee) => {
    const assignedLocationId = employeeLocationDrafts[employee._id];
    const assignedTruckUnitId = employeeTruckDrafts[employee._id] || "";

    if (!assignedLocationId) {
      Alert.alert("Location required", "Select a saved location.");
      return;
    }

    if (!assignedTruckUnitId && truckOptions.length > 1) {
      Alert.alert("Truck required", "Select a truck name.");
      return;
    }

    if (
      assignedLocationId === employee.assigned_location_id &&
      assignedTruckUnitId === (employee.assigned_truck_unit_id || "")
    ) {
      Alert.alert("No change", "This employee is already assigned there.");
      return;
    }

    await updateEmployee(employee, {
      assigned_location_id: assignedLocationId,
      assigned_truck_unit_id: assignedTruckUnitId || null,
      is_working: false,
    });
  };

  const resetEmployeePin = async (employee) => {
    if (!isFourDigitPin(resetPin)) {
      Alert.alert("PIN required", "Enter a 4 digit PIN.");
      return;
    }

    try {
      await resetVendorEmployeePin_API({
        employee_id: employee._id,
        pin: resetPin,
      });
      setResetEmployeeId(null);
      setResetPin("");
      Alert.alert("PIN reset", "Employee PIN was updated.");
    } catch (error) {
      Alert.alert("PIN reset failed", error?.message || "Please try again.");
    }
  };

  const archiveEmployee = (employee) => {
    Alert.alert(
      "Archive employee?",
      `${employee.first_name} ${employee.last_name} will be removed from active employee lists but historical activity will stay saved.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            try {
              await archiveVendorEmployee_API(employee._id);
              fetchEmployees();
            } catch (error) {
              Alert.alert("Archive failed", error?.message || "Please try again.");
            }
          },
        },
      ]
    );
  };

  const deleteEmployee = (employee) => {
    Alert.alert(
      "Delete employee?",
      `${employee.first_name} ${employee.last_name} will be permanently deleted if they do not have activity history. Use Archive for employees with orders, sessions, or requests.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVendorEmployee_API(employee._id);
              fetchEmployees();
            } catch (error) {
              Alert.alert("Delete failed", error?.message || "Please try again.");
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useFocusEffect(
    useCallback(() => {
      fetchEmployees();
    }, [fetchEmployees])
  );

  useEffect(() => {
    if (!expandedEmployeeId || activeTab !== "current") {
      return;
    }

    const employee = employees.find((item) => item._id === expandedEmployeeId);
    if (employee && !shiftHistoryByEmployee[expandedEmployeeId]) {
      loadShiftHistory(employee, shiftHistoryRange);
    }
  }, [expandedEmployeeId, activeTab, employees]);

  return (
    <View style={styles.container}>
      <StatusBarManager />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.black}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>Employees</Text>
        <IconButton
          icon={managementMode === "create" ? "account-multiple" : "plus"}
          iconColor={AppColor.primary}
          onPress={() => {
            if (managementMode === "create") {
              setManagementMode("manage");
              setActiveTab("current");
              setExpandedEmployeeId(null);
              return;
            }
            setManagementMode("create");
            setActiveTab("current");
          }}
          accessibilityLabel={
            managementMode === "create"
              ? "Manage all employees"
              : "Add employee"
          }
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "current" && managementMode === "create" ? (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Create Employee</Text>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  value={form.first_name}
                  onChangeText={(text) => setFormValue("first_name", text)}
                  style={styles.input}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  value={form.last_name}
                  onChangeText={(text) => setFormValue("last_name", text)}
                  style={styles.input}
                />
              </View>
            </View>

            <Text style={styles.label}>Zip Code</Text>
            <TextInput
              value={form.zip_code}
              onChangeText={(text) => setFormValue("zip_code", text)}
              keyboardType="number-pad"
              style={styles.input}
            />

            <Text style={styles.label}>Assigned Location</Text>
            <Dropdown
              data={locationOptions}
              labelField="label"
              valueField="value"
              value={form.assigned_location_id}
              onChange={(item) => setFormValue("assigned_location_id", item.value)}
              placeholder="Select location"
              style={styles.dropdown}
              selectedTextStyle={styles.dropdownText}
              placeholderStyle={styles.placeholderText}
              itemTextStyle={styles.dropdownText}
            />

            <Text style={styles.label}>Assigned Truck</Text>
            <Dropdown
              data={truckOptions}
              labelField="label"
              valueField="value"
              value={form.assigned_truck_unit_id}
              onChange={(item) => setFormValue("assigned_truck_unit_id", item.value)}
              placeholder="Select truck"
              style={styles.dropdown}
              selectedTextStyle={styles.dropdownText}
              placeholderStyle={styles.placeholderText}
              itemTextStyle={styles.dropdownText}
            />

            <Text style={styles.label}>Employee Login ID</Text>
            <TextInput value={loginPreview} editable={false} style={styles.readOnlyInput} />
            <Text style={styles.helperText}>
              If this ID is already taken, the system will add -2, -3, and so on.
            </Text>

            <Text style={styles.label}>PIN</Text>
            <TextInput
              value={form.pin}
              onChangeText={(text) => setFormValue("pin", normalizePin(text))}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={4}
              style={styles.input}
            />

	            <TouchableOpacity
	              onPress={createEmployee}
	              disabled={saving}
	              style={[styles.primaryButton, saving && styles.disabledButton]}
	            >
              {saving ? (
                <ActivityIndicator color={AppColor.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Create Employee</Text>
              )}
	            </TouchableOpacity>
		          </View>
		        ) : activeTab === "current" ? (
	          <TouchableOpacity
	            onPress={() => setManagementMode("create")}
            style={styles.addInlineButton}
          >
            <Text style={styles.addInlineButtonText}>+ Add Employee</Text>
	          </TouchableOpacity>
	        ) : null}

        {activeTab === "current" && !isManageMode && employees.length ? (
          <TouchableOpacity
            onPress={() => {
              setManagementMode("manage");
              setExpandedEmployeeId(null);
            }}
            style={styles.manageAllButton}
          >
            <Text style={styles.manageAllButtonText}>Manage Employees</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.tabRow}>
          <TouchableOpacity
            onPress={() => setActiveTab("current")}
            style={[
              styles.tabButton,
              activeTab === "current" && styles.tabButtonActive,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "current" && styles.tabTextActive,
              ]}
            >
              Current Employees
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("archived")}
            style={[
              styles.tabButton,
              activeTab === "archived" && styles.tabButtonActive,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "archived" && styles.tabTextActive,
              ]}
            >
              Archived Employees
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>
          {activeTab === "archived" ? "Archived Employees" : "Current Employees"}
        </Text>
        {loading ? (
          <ActivityIndicator color={AppColor.primary} style={{ marginTop: 24 }} />
        ) : employees.length === 0 ? (
          <Text style={styles.emptyText}>
            {activeTab === "archived"
              ? "No archived employees."
              : "No current employees."}
          </Text>
        ) : (
          employees.map((employee) => (
            <View key={employee._id} style={styles.employeeCard}>
              <View style={styles.employeeHeader}>
                <TouchableOpacity
                  onPress={() => toggleEmployeeDetails(employee)}
                  style={styles.employeeSummary}
                >
                  <Text style={styles.employeeName}>
                    {employee.first_name} {employee.last_name}
                  </Text>
                  <Text style={styles.employeeMeta}>
                    {employee.role} - {employee.zip_code}
                  </Text>
                  <Text style={styles.employeeMeta}>
                    Assigned: {getLocationLabel(employee.assigned_location_id)}
                  </Text>
                  <Text style={styles.employeeMeta}>
                    Truck:{" "}
                    {getTruckLabel(
                      employee.assigned_truck_unit_id,
                      employee.assigned_truck_unit_name
                    )}
                  </Text>
                </TouchableOpacity>
                {isManageMode ? (
                  <View style={styles.employeeActions}>
                    <IconButton
                      icon={
                        expandedEmployeeId === employee._id
                          ? "chevron-up"
                          : "chevron-down"
                      }
                      iconColor={AppColor.textHighlighter}
                      size={22}
                      style={styles.trashButton}
                      onPress={() => toggleEmployeeDetails(employee)}
                      accessibilityLabel={`Manage ${employee.first_name} ${employee.last_name}`}
                    />
                    {activeTab === "current" ? (
	                    <TouchableOpacity
	                      onPress={() => archiveEmployee(employee)}
	                      style={styles.archivePill}
	                    >
	                      <Text style={styles.archiveText}>Archive</Text>
	                    </TouchableOpacity>
                    ) : null}
                    <IconButton
                      icon="trash-can-outline"
                      iconColor={AppColor.red}
                      size={22}
                      style={styles.trashButton}
                      onPress={() => deleteEmployee(employee)}
                      accessibilityLabel={`Delete ${employee.first_name} ${employee.last_name}`}
                    />
                  </View>
                ) : null}
              </View>
              {isManageMode &&
                activeTab === "current" &&
                expandedEmployeeId === employee._id ? (
                <View style={styles.submenu}>
                  <Text style={styles.submenuTitle}>Truck Assignment</Text>
                  <Text style={styles.helperText}>
                    Moving an employee to another truck or location sets them off
                    duty and ends any active session.
                  </Text>
                  <Text style={styles.label}>Assigned Truck</Text>
                  <Dropdown
                    data={truckOptions}
                    labelField="label"
                    valueField="value"
                    value={
                      employeeTruckDrafts[employee._id] ||
                      employee.assigned_truck_unit_id ||
                      ""
                    }
                    onChange={(item) =>
                      setEmployeeTruckDraft(employee._id, item.value)
                    }
                    placeholder="Select truck"
                    style={styles.dropdown}
                    selectedTextStyle={styles.dropdownText}
                    placeholderStyle={styles.placeholderText}
                    itemTextStyle={styles.dropdownText}
                  />
                  <Text style={styles.label}>Assigned Location</Text>
                  <Dropdown
                    data={locationOptions}
                    labelField="label"
                    valueField="value"
                    value={
                      employeeLocationDrafts[employee._id] ||
                      employee.assigned_location_id
                    }
                    onChange={(item) =>
                      setEmployeeLocationDraft(employee._id, item.value)
                    }
                    placeholder="Select location"
                    style={styles.dropdown}
                    selectedTextStyle={styles.dropdownText}
                    placeholderStyle={styles.placeholderText}
                    itemTextStyle={styles.dropdownText}
                  />
                  <TouchableOpacity
                    onPress={() => assignEmployeeLocation(employee)}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>Save Assignment</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {isManageMode ? (
                <>
                  <Text style={styles.label}>Employee Login ID</Text>
                  <TextInput
                    value={employee.employee_login_id || ""}
                    editable={false}
                    style={styles.readOnlyInput}
                  />
                </>
              ) : null}

              {isManageMode && activeTab === "current" ? (
                <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Login Access</Text>
                  <Text style={styles.employeeMeta}>
                    {employee.is_active ? "Active" : "Inactive"}
                  </Text>
                </View>
                <Switch
                  value={!!employee.is_active}
                  onValueChange={(value) =>
                    updateEmployee(employee, {
                      is_active: value,
                      is_working: value ? employee.is_working : false,
                    })
                  }
                  trackColor={{ false: AppColor.border, true: AppColor.primary }}
                />
              </View>
              ) : null}

	              {isManageMode && activeTab === "current" ? (
	              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>On/Off Duty</Text>
                  <Text style={styles.employeeMeta}>
                    {employee.is_working ? "Working" : "Off duty"}
                  </Text>
                </View>
                <Switch
                  value={!!employee.is_working}
                  disabled={!employee.is_active}
                  onValueChange={(value) =>
                    updateEmployee(employee, { is_working: value })
                  }
                  trackColor={{ false: AppColor.border, true: AppColor.primary }}
                />
              </View>
              ) : null}

	              {isManageMode &&
                activeTab === "current" &&
                resetEmployeeId === employee._id ? (
                <View style={styles.resetBox}>
                  <Text style={styles.label}>New PIN</Text>
                  <TextInput
                    value={resetPin}
                    onChangeText={(text) => setResetPin(normalizePin(text))}
                    secureTextEntry
                    keyboardType="number-pad"
                    maxLength={4}
                    style={styles.input}
                  />
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      onPress={() => {
                        setResetEmployeeId(null);
                        setResetPin("");
                      }}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => resetEmployeePin(employee)}
                      style={styles.smallPrimaryButton}
                    >
                      <Text style={styles.primaryButtonText}>Save PIN</Text>
                    </TouchableOpacity>
                  </View>
                </View>
	              ) : isManageMode && activeTab === "current" ? (
                <TouchableOpacity
                  onPress={() => setResetEmployeeId(employee._id)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Reset PIN</Text>
                </TouchableOpacity>
              ) : null}

	              {isManageMode &&
                activeTab === "current" &&
                expandedEmployeeId === employee._id ? (
                <View style={styles.shiftHistorySection}>
                  <View style={styles.shiftHistoryHeader}>
                    <Text style={styles.submenuTitle}>Shift History</Text>
                    <View style={styles.shiftFilterRow}>
                      {SHIFT_HISTORY_FILTERS.map((filter) => (
                        <TouchableOpacity
                          key={filter.value}
                          onPress={() => selectShiftHistoryRange(employee, filter.value)}
                          style={[
                            styles.shiftFilterButton,
                            shiftHistoryRange === filter.value &&
                              styles.shiftFilterButtonActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.shiftFilterText,
                              shiftHistoryRange === filter.value &&
                                styles.shiftFilterTextActive,
                            ]}
                          >
                            {filter.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {shiftHistoryLoadingId === employee._id ? (
                    <ActivityIndicator color={AppColor.primary} style={{ marginTop: 12 }} />
                  ) : (shiftHistoryByEmployee[employee._id] || []).length ? (
                    (shiftHistoryByEmployee[employee._id] || []).map((session) => (
                      <View
                        key={session.employee_session_id || session._id}
                        style={styles.shiftHistoryItem}
                      >
                        <View>
                          <Text style={styles.shiftHistoryLabel}>Start</Text>
                          <Text style={styles.shiftHistoryValue}>
                            {formatShiftDateTime(session.started_at)}
                          </Text>
                        </View>
                        <View style={styles.shiftHistoryEnd}>
                          <Text style={styles.shiftHistoryLabel}>End</Text>
                          <Text style={styles.shiftHistoryValue}>
                            {session.ended_at
                              ? formatShiftDateTime(session.ended_at)
                              : "Active"}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyHistoryText}>
                      No shift history for this {shiftHistoryRange}.
                    </Text>
                  )}
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default ProfileEmployeeManagementScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppColor.white,
    borderBottomWidth: 1,
    borderColor: AppColor.border,
  },
  headerTitle: {
    color: AppColor.black,
    fontSize: 20,
    fontFamily: Mulish700,
  },
  content: { padding: 16, gap: 16 },
  formSection: {
    backgroundColor: AppColor.white,
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    padding: 16,
  },
  addInlineButton: {
    alignItems: "center",
    backgroundColor: AppColor.white,
    borderColor: AppColor.primary,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  addInlineButtonText: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 14,
  },
  manageAllButton: {
    alignItems: "center",
    backgroundColor: AppColor.primary,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 44,
  },
  manageAllButtonText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Mulish700,
    color: AppColor.text,
    marginBottom: 12,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColor.white,
  },
  tabButtonActive: {
    borderColor: AppColor.primary,
    backgroundColor: "#FFF5EE",
  },
  tabText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish600,
    fontSize: 13,
  },
  tabTextActive: {
    color: AppColor.primary,
    fontFamily: Mulish700,
  },
  row: { flexDirection: "row", gap: 10 },
  halfField: { flex: 1 },
  label: {
    fontSize: 13,
    fontFamily: Mulish600,
    color: AppColor.textHighlighter,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    backgroundColor: AppColor.white,
    color: AppColor.text,
    fontFamily: Mulish400,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  readOnlyInput: {
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    backgroundColor: "#F1F2F4",
    color: AppColor.text,
    fontFamily: Mulish600,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  helperText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 12,
    marginTop: 6,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    minHeight: 46,
    paddingHorizontal: 12,
    backgroundColor: AppColor.white,
  },
  dropdownText: {
    fontSize: 14,
    color: AppColor.text,
    fontFamily: Mulish400,
  },
  placeholderText: {
    fontSize: 14,
    color: AppColor.textPlaceholder,
    fontFamily: Mulish400,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: AppColor.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  smallPrimaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: AppColor.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: { opacity: 0.65 },
  primaryButtonText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 15,
  },
  emptyText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    textAlign: "center",
    marginTop: 24,
  },
  employeeCard: {
    backgroundColor: AppColor.white,
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  employeeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  employeeSummary: { flex: 1 },
  employeeName: {
    color: AppColor.text,
    fontFamily: Mulish700,
    fontSize: 16,
  },
  employeeMeta: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 12,
    marginTop: 2,
  },
  employeeActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
  },
  archivePill: {
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  archiveText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish700,
    fontSize: 12,
  },
  trashButton: { margin: -8 },
  submenu: {
    borderTopWidth: 1,
    borderColor: AppColor.border,
    marginTop: 12,
    paddingTop: 12,
  },
  submenuTitle: {
    color: AppColor.text,
    fontFamily: Mulish700,
    fontSize: 14,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  toggleLabel: {
    color: AppColor.text,
    fontFamily: Mulish600,
    fontSize: 14,
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColor.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  secondaryButtonText: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 14,
  },
  resetBox: {
    borderTopWidth: 1,
    borderColor: AppColor.border,
    paddingTop: 8,
    marginTop: 8,
  },
  shiftHistorySection: {
    borderTopWidth: 1,
    borderColor: AppColor.border,
    marginTop: 12,
    paddingTop: 12,
  },
  shiftHistoryHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  shiftFilterRow: {
    flexDirection: "row",
    gap: 6,
  },
  shiftFilterButton: {
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  shiftFilterButtonActive: {
    backgroundColor: "#FFF5EE",
    borderColor: AppColor.primary,
  },
  shiftFilterText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish700,
    fontSize: 12,
  },
  shiftFilterTextActive: {
    color: AppColor.primary,
  },
  shiftHistoryItem: {
    backgroundColor: "#F9FAFB",
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    padding: 12,
  },
  shiftHistoryEnd: {
    alignItems: "flex-end",
  },
  shiftHistoryLabel: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 12,
  },
  shiftHistoryValue: {
    color: AppColor.text,
    fontFamily: Mulish700,
    fontSize: 13,
    marginTop: 2,
  },
  emptyHistoryText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 13,
    marginTop: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
});
