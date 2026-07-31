import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { IconButton } from "react-native-paper";
import ImagePicker from "react-native-image-crop-picker";
import { RESULTS } from "react-native-permissions";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { Dropdown } from "react-native-element-dropdown";
import StatusBarManager from "../components/StatusBarManager";
import StatePickerModal from "../components/StatePickerModal";
import usePermission from "../hooks/usePermission";
import { permission } from "../helpers/permission.helper";
import { AppColor, Mulish400, Mulish600, Mulish700 } from "../utils/theme";
import {
  archiveVendorEmployee_API,
  archiveVendorEmployeeShiftHistory_API,
  createVendorEmployee_API,
  deleteVendorEmployee_API,
  getVendorEmployeeShiftHistory_API,
  getVendorEmployees_API,
  resetVendorEmployeePin_API,
  updateVendorEmployee_API,
  updateVendorEmployeeShiftHistory_API,
  uploadImage_API,
} from "../api/appAPI";

const initialForm = {
  first_name: "",
  last_name: "",
  zip_code: "",
  phone_number: "",
  address_line1: "",
  address_city: "",
  address_state: "",
  employee_id_photo_url: "",
  employee_tax_identifier_type: "SSN",
  employee_tax_identifier: "",
  employee_rate: "",
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
const normalizeRateInput = (value) =>
  value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
const formatEmployeeRate = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `$${parsed.toFixed(2)}` : "Not set";
};
const employeeProfileFields = [
  "first_name",
  "last_name",
  "zip_code",
  "phone_number",
  "address_line1",
  "address_city",
  "address_state",
  "employee_id_photo_url",
];
const normalizePhoneForDial = (value) => String(value || "").replace(/[^\d+]/g, "");
const formatEmployeeAddress = (employee) =>
  [
    employee?.address_line1,
    [employee?.address_city, employee?.address_state]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join("\n");
const getEmployeeIdPhotoUrl = (employee, draft = {}) =>
  draft.employee_id_photo_url || employee?.employee_id_photo_url || "";
const SHIFT_HISTORY_FILTERS = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
];
const TAX_ID_OPTIONS = [
  { label: "SSN", value: "SSN" },
  { label: "EIN", value: "EIN" },
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
const formatShiftHours = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(2)} hrs` : "Pending";
};
const formatTimecardInput = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const parseTimecardInput = (value) => new Date(String(value || "").trim().replace(" ", "T"));

const ProfileEmployeeManagementScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { checkAndRequestPermission: cameraPermissionStatus } = usePermission(
    permission.camera
  );
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
  const [employeeRateDrafts, setEmployeeRateDrafts] = useState({});
  const [employeeProfileDrafts, setEmployeeProfileDrafts] = useState({});
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [activeTab, setActiveTab] = useState("current");
  const [shiftHistoryRange, setShiftHistoryRange] = useState("week");
  const [shiftHistoryByEmployee, setShiftHistoryByEmployee] = useState({});
  const [shiftHistoryLoadingId, setShiftHistoryLoadingId] = useState(null);
  const [shiftHistoryExpanded, setShiftHistoryExpanded] = useState({});
  const [editingShiftId, setEditingShiftId] = useState(null);
  const [shiftEditDraft, setShiftEditDraft] = useState(null);
  const [employeeIdUploading, setEmployeeIdUploading] = useState(false);
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

	  const buildEmployeeProfileDraft = (employee) =>
	    ({
	      ...employeeProfileFields.reduce((draft, field) => {
	      draft[field] = employee?.[field] ? String(employee[field]) : "";
	      return draft;
	      }, {}),
	      employee_tax_identifier_type:
	        employee?.employee_tax_identifier_type || "SSN",
	      employee_tax_identifier: "",
	    });

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
            setEditingEmployeeId(null);
            setEmployeeLocationDrafts((current) => ({
              ...current,
              [matchedEmployee._id]: matchedEmployee.assigned_location_id,
            }));
            setEmployeeTruckDrafts((current) => ({
              ...current,
              [matchedEmployee._id]:
                matchedEmployee.assigned_truck_unit_id || "",
            }));
            setEmployeeRateDrafts((current) => ({
              ...current,
              [matchedEmployee._id]:
                matchedEmployee.employee_rate !== null &&
                matchedEmployee.employee_rate !== undefined
                  ? String(matchedEmployee.employee_rate)
                  : "",
            }));
            setEmployeeProfileDrafts((current) => ({
              ...current,
              [matchedEmployee._id]: buildEmployeeProfileDraft(matchedEmployee),
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
      return true;
    } catch (error) {
      setEmployees(previousEmployees);
      Alert.alert("Update failed", error?.message || "Please try again.");
      return false;
    }
  };

  const toggleEmployeeDetails = (employee) => {
    const willCollapse = expandedEmployeeId === employee._id;
    setExpandedEmployeeId((current) =>
      current === employee._id ? null : employee._id
    );
    if (willCollapse) {
      setEditingEmployeeId(null);
    }
    setEmployeeLocationDrafts((current) => ({
      ...current,
      [employee._id]: current[employee._id] || employee.assigned_location_id,
    }));
    setEmployeeTruckDrafts((current) => ({
      ...current,
      [employee._id]:
        current[employee._id] || employee.assigned_truck_unit_id || "",
    }));
    setEmployeeRateDrafts((current) => ({
      ...current,
      [employee._id]:
        current[employee._id] ||
        (employee.employee_rate !== null && employee.employee_rate !== undefined
          ? String(employee.employee_rate)
          : ""),
    }));
    setEmployeeProfileDrafts((current) => ({
      ...current,
      [employee._id]: current[employee._id] || buildEmployeeProfileDraft(employee),
    }));
  };

  const openEmployeeEditor = (employee) => {
    setActiveTab("current");
    setManagementMode("manage");
    setExpandedEmployeeId(employee._id);
    setEditingEmployeeId(employee._id);
    setEmployeeLocationDrafts((current) => ({
      ...current,
      [employee._id]: current[employee._id] || employee.assigned_location_id,
    }));
    setEmployeeTruckDrafts((current) => ({
      ...current,
      [employee._id]:
        current[employee._id] || employee.assigned_truck_unit_id || "",
    }));
    setEmployeeRateDrafts((current) => ({
      ...current,
      [employee._id]:
        current[employee._id] ||
        (employee.employee_rate !== null && employee.employee_rate !== undefined
          ? String(employee.employee_rate)
          : ""),
    }));
    setEmployeeProfileDrafts((current) => ({
      ...current,
      [employee._id]: current[employee._id] || buildEmployeeProfileDraft(employee),
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

  const toggleShiftHistory = async (employee) => {
    const willExpand = !shiftHistoryExpanded[employee._id];
    setShiftHistoryExpanded((current) => ({
      ...current,
      [employee._id]: willExpand,
    }));
    if (willExpand && !(shiftHistoryByEmployee[employee._id] || []).length) {
      await loadShiftHistory(employee);
    }
  };

  const beginShiftEdit = (session) => {
    setEditingShiftId(session.employee_session_id);
    setShiftEditDraft({
      started_at: formatTimecardInput(session.started_at),
      ended_at: formatTimecardInput(session.ended_at),
      total_break_minutes: String(session.total_break_minutes || 0),
      reason: "",
    });
  };

  const saveShiftEdit = async (employee, session) => {
    const startedAt = parseTimecardInput(shiftEditDraft?.started_at);
    const endedAt = parseTimecardInput(shiftEditDraft?.ended_at);
    if (
      Number.isNaN(startedAt.getTime()) ||
      Number.isNaN(endedAt.getTime()) ||
      !shiftEditDraft?.reason?.trim()
    ) {
      Alert.alert("Timecard incomplete", "Enter valid start/end times and an edit reason.");
      return;
    }
    try {
      await updateVendorEmployeeShiftHistory_API({
        employee_id: employee._id,
        session_id: session.employee_session_id,
        payload: {
          started_at: startedAt.toISOString(),
          ended_at: endedAt.toISOString(),
          total_break_minutes: Number(shiftEditDraft.total_break_minutes || 0),
          reason: shiftEditDraft.reason.trim(),
        },
      });
      setEditingShiftId(null);
      setShiftEditDraft(null);
      await loadShiftHistory(employee);
      Alert.alert("Timecard updated", "The original values were retained in the audit history.");
    } catch (error) {
      Alert.alert("Update failed", error?.message || "Could not update this timecard.");
    }
  };

  const archiveShiftHistory = (employee) => {
    const sessions = (shiftHistoryByEmployee[employee._id] || []).filter(
      (session) => !session.is_active && session.ended_at,
    );
    if (!sessions.length) {
      Alert.alert("Nothing to archive", "Only completed timecards can be archived.");
      return;
    }
    Alert.alert(
      "Archive shift history?",
      "These timecards will remain stored for reporting and audit history, but cannot be edited afterward.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            try {
              await archiveVendorEmployeeShiftHistory_API({
                employee_id: employee._id,
                session_ids: sessions.map((session) => session.employee_session_id),
              });
              await loadShiftHistory(employee);
            } catch (error) {
              Alert.alert("Archive failed", error?.message || "Please try again.");
            }
          },
        },
      ],
    );
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

  const setEmployeeRateDraft = (employeeId, rate) => {
    setEmployeeRateDrafts((current) => ({
      ...current,
      [employeeId]: normalizeRateInput(rate),
    }));
  };

  const setEmployeeProfileDraft = (employeeId, field, value) => {
    setEmployeeProfileDrafts((current) => ({
      ...current,
      [employeeId]: {
        ...(current[employeeId] || {}),
        [field]: value,
      },
    }));
  };

  const getEmployeeProfileDraftValue = (employee, field) =>
    employeeProfileDrafts[employee._id]?.[field] ?? String(employee?.[field] || "");

  const isEmployeeEditing = (employee) => editingEmployeeId === employee?._id;

  const saveEmployeeProfile = async (employee) => {
    const draft = employeeProfileDrafts[employee._id] || buildEmployeeProfileDraft(employee);

    if (!draft.first_name?.trim() || !draft.last_name?.trim()) {
      Alert.alert("Name required", "Enter the employee's first and last name.");
      return;
    }

    if (!draft.zip_code?.trim()) {
      Alert.alert("Zip code required", "Enter the employee's zip code.");
      return;
    }

	    const saved = await updateEmployee(
	      employee,
	      {
	        ...employeeProfileFields.reduce((payload, field) => {
	        payload[field] = draft[field]?.trim() || "";
	        return payload;
	        }, {}),
	        employee_tax_identifier_type:
	          draft.employee_tax_identifier_type || employee.employee_tax_identifier_type || "SSN",
	        ...(draft.employee_tax_identifier?.trim()
	          ? { employee_tax_identifier: draft.employee_tax_identifier.trim() }
	          : {}),
	      }
		    );
	    if (saved) {
	      setEditingEmployeeId(null);
	    }
		  };

  const callEmployee = async (phoneNumber) => {
    const dialNumber = normalizePhoneForDial(phoneNumber);
    if (!dialNumber) {
      Alert.alert("Phone number missing", "Add a phone number for this employee first.");
      return;
    }

    const url = `tel:${dialNumber}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Call unavailable", "This device cannot place phone calls.");
    }
  };

  const uploadEmployeeIdPhoto = async (employee = null) => {
    try {
      const cameraStatus = await cameraPermissionStatus();
      if (cameraStatus !== RESULTS.GRANTED) return;

      setEmployeeIdUploading(true);
      setTimeout(
        async () => {
          try {
            const image = await ImagePicker.openCamera({
              cropping: false,
              mediaType: "photo",
            });
            const file = {
              uri: image?.path,
              name: image?.path?.split("/").pop() || `employee-id-${Date.now()}.jpg`,
              type: image?.mime || "image/jpeg",
            };
            const formData = new FormData();
            formData.append("file", file);
            const response = await uploadImage_API(formData);
            const uploadedUrl = response?.data?.file;

            if (!response?.success || !uploadedUrl) {
              Alert.alert("Upload failed", "Could not save the employee ID photo.");
              return;
            }

            if (employee?._id) {
              setEmployeeProfileDraft(employee._id, "employee_id_photo_url", uploadedUrl);
              await updateEmployee(employee, { employee_id_photo_url: uploadedUrl });
            } else {
              setFormValue("employee_id_photo_url", uploadedUrl);
            }
          } catch (error) {
            console.log("employee ID camera error => ", error);
          } finally {
            setEmployeeIdUploading(false);
          }
        },
        Platform.OS === "ios" ? 600 : 0
      );
    } catch (error) {
      setEmployeeIdUploading(false);
      Alert.alert("Camera unavailable", error?.message || "Please try again.");
    }
  };

  const saveEmployeeRate = async (employee) => {
    const draftRate = employeeRateDrafts[employee._id] ?? "";
    const normalizedRate = draftRate === "" ? null : Number(draftRate);

    if (draftRate !== "" && !Number.isFinite(normalizedRate)) {
      Alert.alert("Rate invalid", "Enter a valid employee rate.");
      return;
    }

    const saved = await updateEmployee(employee, {
      employee_rate: normalizedRate,
    });
    if (saved) {
      setEditingEmployeeId(null);
    }
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

    const saved = await updateEmployee(employee, {
      assigned_location_id: assignedLocationId,
      assigned_truck_unit_id: assignedTruckUnitId || null,
      is_working: false,
    });
    if (saved) {
      setEditingEmployeeId(null);
    }
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
      "Terminate employee?",
      `${employee.first_name} ${employee.last_name} will be removed from active employee lists but historical activity will stay saved.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Terminate",
          style: "destructive",
          onPress: async () => {
            try {
              await archiveVendorEmployee_API(employee._id);
              fetchEmployees();
            } catch (error) {
              Alert.alert("Terminate failed", error?.message || "Please try again.");
            }
          },
        },
      ]
    );
  };

  const deleteEmployee = (employee) => {
    Alert.alert(
      "Delete employee?",
      `${employee.first_name} ${employee.last_name} will be permanently deleted if they do not have activity history. Use Terminate for employees with orders, sessions, or requests.`,
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
              Alert.alert(
                "Delete failed",
                error?.message ||
                  "Employee cannot be deleted due to prior sales activity. Please Disable Login Access then Terminate the Employee."
              );
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

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Zip Code</Text>
                <TextInput
                  value={form.zip_code}
                  onChangeText={(text) => setFormValue("zip_code", text)}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>Employee Rate</Text>
                <TextInput
                  value={form.employee_rate}
                  onChangeText={(text) =>
                    setFormValue("employee_rate", normalizeRateInput(text))
                  }
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  style={styles.input}
                />
              </View>
            </View>

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              value={form.phone_number}
              onChangeText={(text) => setFormValue("phone_number", text)}
              keyboardType="phone-pad"
              placeholder="Employee phone"
              style={styles.input}
            />

            <Text style={styles.label}>Address</Text>
            <TextInput
              value={form.address_line1}
              onChangeText={(text) => setFormValue("address_line1", text)}
              placeholder="Street address"
              style={styles.input}
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  value={form.address_city}
                  onChangeText={(text) => setFormValue("address_city", text)}
                  style={styles.input}
                />
              </View>
              <View style={styles.halfField}>
                <StatePickerModal
                  label="State"
                  value={form.address_state}
                  onChange={(value) => setFormValue("address_state", value)}
                />
              </View>
            </View>

	            <View style={styles.row}>
	              <View style={styles.halfField}>
	                <Text style={styles.label}>Tax ID Type</Text>
	                <Dropdown
	                  data={TAX_ID_OPTIONS}
	                  labelField="label"
	                  valueField="value"
	                  value={form.employee_tax_identifier_type}
	                  onChange={(item) =>
	                    setFormValue("employee_tax_identifier_type", item.value)
	                  }
	                  style={styles.dropdown}
	                  placeholderStyle={styles.dropdownText}
	                  selectedTextStyle={styles.dropdownText}
	                  itemTextStyle={styles.dropdownText}
	                />
	              </View>
	              <View style={styles.halfField}>
	                <Text style={styles.label}>Employee EIN/SSN</Text>
	                <TextInput
	                  value={form.employee_tax_identifier}
	                  onChangeText={(text) =>
	                    setFormValue(
	                      "employee_tax_identifier",
	                      text.replace(/\D/g, "").slice(0, 9)
	                    )
	                  }
	                  keyboardType="number-pad"
	                  placeholder="9 digits"
	                  secureTextEntry
	                  style={styles.input}
	                />
	              </View>
	            </View>

	            <View style={styles.idUploadCard}>
              <View style={styles.idUploadCopy}>
                <Text style={styles.toggleLabel}>Employee ID</Text>
                <Text style={styles.employeeMeta}>
                  {form.employee_id_photo_url ? "ID scanned" : "Optional"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => uploadEmployeeIdPhoto()}
                disabled={employeeIdUploading}
                style={[
                  styles.idUploadButton,
                  employeeIdUploading && styles.disabledButton,
                ]}
              >
                <Text style={styles.idUploadButtonText}>
                  {employeeIdUploading ? "Scanning..." : "Scan ID"}
                </Text>
              </TouchableOpacity>
            </View>

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
              Terminated Employees
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>
          {activeTab === "archived" ? "Terminated Employees" : "Current Employees"}
        </Text>
        {loading ? (
          <ActivityIndicator color={AppColor.primary} style={{ marginTop: 24 }} />
        ) : employees.length === 0 ? (
          <Text style={styles.emptyText}>
            {activeTab === "archived"
              ? "No terminated employees."
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
	                    Rate: {formatEmployeeRate(employee.employee_rate)}
	                  </Text>
                  <Text style={styles.employeeHoursSummary}>
                    Today: {formatShiftHours(employee.shift_summary?.today?.gross_hours_worked)} with breaks /{" "}
                    {formatShiftHours(employee.shift_summary?.today?.net_hours_worked)} without
                  </Text>
                  <Text style={styles.employeeHoursSummary}>
                    This Week: {formatShiftHours(employee.shift_summary?.week?.gross_hours_worked)} with breaks /{" "}
                    {formatShiftHours(employee.shift_summary?.week?.net_hours_worked)} without
                  </Text>
                  {employee.phone_number ? (
                    <Text
                      onPress={() => callEmployee(employee.phone_number)}
                      style={[styles.employeeMeta, styles.phoneLink]}
                    >
                      Phone: {employee.phone_number}
                    </Text>
                  ) : null}
                  {formatEmployeeAddress(employee) ? (
                    <Text style={styles.employeeMeta}>
                      {formatEmployeeAddress(employee)}
                    </Text>
                  ) : null}
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
                <View style={styles.employeeActions}>
                  {activeTab === "current" ? (
                    <IconButton
                      icon="pencil"
                      iconColor={AppColor.primary}
                      size={22}
                      style={styles.actionIconButton}
                      onPress={() => openEmployeeEditor(employee)}
                      accessibilityLabel={`Edit ${employee.first_name} ${employee.last_name}`}
                    />
                  ) : null}
                  {isManageMode ? (
                    <>
                    <IconButton
                      icon={
                        expandedEmployeeId === employee._id
                          ? "chevron-up"
                          : "chevron-down"
                      }
                      iconColor={AppColor.textHighlighter}
                      size={22}
                      style={styles.actionIconButton}
                      onPress={() => toggleEmployeeDetails(employee)}
                      accessibilityLabel={`Manage ${employee.first_name} ${employee.last_name}`}
                    />
                    {activeTab === "current" ? (
	                    <TouchableOpacity
	                      onPress={() => archiveEmployee(employee)}
	                      style={styles.archivePill}
	                    >
	                      <Text style={styles.archiveText}>Terminate</Text>
	                    </TouchableOpacity>
                    ) : null}
                    <IconButton
                      icon="trash-can-outline"
                      iconColor={AppColor.red}
                      size={22}
                      style={styles.actionIconButton}
                      onPress={() => deleteEmployee(employee)}
                      accessibilityLabel={`Delete ${employee.first_name} ${employee.last_name}`}
                    />
                    </>
                  ) : null}
                </View>
              </View>
              {isManageMode &&
                activeTab === "current" &&
                expandedEmployeeId === employee._id ? (
	                  <View style={styles.submenu}>
	                  <Text style={styles.submenuTitle}>
	                    Employee Profile {isEmployeeEditing(employee) ? "(Editing)" : ""}
	                  </Text>
	                  <View style={styles.row}>
                    <View style={styles.halfField}>
                      <Text style={styles.label}>First Name</Text>
                      <TextInput
                        value={getEmployeeProfileDraftValue(employee, "first_name")}
	                        onChangeText={(text) =>
	                          setEmployeeProfileDraft(employee._id, "first_name", text)
	                        }
	                        editable={isEmployeeEditing(employee)}
	                        style={[
	                          styles.input,
	                          !isEmployeeEditing(employee) && styles.readOnlyInput,
	                        ]}
	                      />
                    </View>
                    <View style={styles.halfField}>
                      <Text style={styles.label}>Last Name</Text>
                      <TextInput
                        value={getEmployeeProfileDraftValue(employee, "last_name")}
	                        onChangeText={(text) =>
	                          setEmployeeProfileDraft(employee._id, "last_name", text)
	                        }
	                        editable={isEmployeeEditing(employee)}
	                        style={[
	                          styles.input,
	                          !isEmployeeEditing(employee) && styles.readOnlyInput,
	                        ]}
	                      />
                    </View>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.halfField}>
                      <Text style={styles.label}>Phone Number</Text>
                      <TextInput
                        value={getEmployeeProfileDraftValue(employee, "phone_number")}
	                        onChangeText={(text) =>
	                          setEmployeeProfileDraft(employee._id, "phone_number", text)
	                        }
	                        keyboardType="phone-pad"
	                        editable={isEmployeeEditing(employee)}
	                        style={[
	                          styles.input,
	                          !isEmployeeEditing(employee) && styles.readOnlyInput,
	                        ]}
	                      />
                    </View>
                    <View style={styles.halfField}>
                      <Text style={styles.label}>Zip Code</Text>
                      <TextInput
                        value={getEmployeeProfileDraftValue(employee, "zip_code")}
	                        onChangeText={(text) =>
	                          setEmployeeProfileDraft(employee._id, "zip_code", text)
	                        }
	                        keyboardType="number-pad"
	                        editable={isEmployeeEditing(employee)}
	                        style={[
	                          styles.input,
	                          !isEmployeeEditing(employee) && styles.readOnlyInput,
	                        ]}
	                      />
                    </View>
                  </View>
                  <Text style={styles.label}>Address</Text>
                  <TextInput
                    value={getEmployeeProfileDraftValue(employee, "address_line1")}
	                    onChangeText={(text) =>
	                      setEmployeeProfileDraft(employee._id, "address_line1", text)
	                    }
	                    editable={isEmployeeEditing(employee)}
	                    style={[
	                      styles.input,
	                      !isEmployeeEditing(employee) && styles.readOnlyInput,
	                    ]}
	                  />
                  <View style={styles.row}>
                    <View style={styles.halfField}>
                      <Text style={styles.label}>City</Text>
                      <TextInput
                        value={getEmployeeProfileDraftValue(employee, "address_city")}
	                        onChangeText={(text) =>
	                          setEmployeeProfileDraft(employee._id, "address_city", text)
	                        }
	                        editable={isEmployeeEditing(employee)}
	                        style={[
	                          styles.input,
	                          !isEmployeeEditing(employee) && styles.readOnlyInput,
	                        ]}
	                      />
                    </View>
                    <View style={styles.halfField}>
                      {isEmployeeEditing(employee) ? (
                        <StatePickerModal
                          label="State"
                          value={getEmployeeProfileDraftValue(
                            employee,
                            "address_state"
                          )}
                          onChange={(value) =>
                            setEmployeeProfileDraft(
                              employee._id,
                              "address_state",
                              value
                            )
                          }
                        />
                      ) : (
                        <>
                          <Text style={styles.label}>State</Text>
                          <TextInput
                            value={getEmployeeProfileDraftValue(
                              employee,
                              "address_state"
                            )}
                            editable={false}
                            style={[styles.input, styles.readOnlyInput]}
                          />
                        </>
                      )}
                    </View>
                  </View>
	                  <View style={styles.row}>
	                    <View style={styles.halfField}>
	                      <Text style={styles.label}>Tax ID Type</Text>
	                      <Dropdown
	                        data={TAX_ID_OPTIONS}
	                        labelField="label"
	                        valueField="value"
	                        value={getEmployeeProfileDraftValue(
	                          employee,
	                          "employee_tax_identifier_type"
	                        )}
		                        onChange={(item) =>
		                          setEmployeeProfileDraft(
		                            employee._id,
		                            "employee_tax_identifier_type",
		                            item.value
		                          )
		                        }
		                        disable={!isEmployeeEditing(employee)}
		                        style={[
		                          styles.dropdown,
		                          !isEmployeeEditing(employee) && styles.readOnlyInput,
		                        ]}
		                        placeholderStyle={styles.dropdownText}
		                        selectedTextStyle={styles.dropdownText}
		                        itemTextStyle={styles.dropdownText}
	                      />
	                    </View>
	                    <View style={styles.halfField}>
	                      <Text style={styles.label}>Employee EIN/SSN</Text>
	                      <TextInput
	                        value={getEmployeeProfileDraftValue(
	                          employee,
	                          "employee_tax_identifier"
	                        )}
	                        onChangeText={(text) =>
	                          setEmployeeProfileDraft(
	                            employee._id,
	                            "employee_tax_identifier",
	                            text.replace(/\D/g, "").slice(0, 9)
	                          )
	                        }
	                        keyboardType="number-pad"
		                        placeholder={
		                          employee.employee_tax_identifier_masked ||
		                          "9 digits"
		                        }
		                        secureTextEntry
		                        editable={isEmployeeEditing(employee)}
		                        style={[
		                          styles.input,
		                          !isEmployeeEditing(employee) && styles.readOnlyInput,
		                        ]}
		                      />
	                    </View>
	                  </View>
	                  {employee.employee_tax_identifier_masked ? (
	                    <Text style={styles.helperText}>
	                      Saved tax ID: {employee.employee_tax_identifier_masked}
	                    </Text>
	                  ) : null}
                  <View style={styles.idUploadCard}>
                    <View style={styles.idUploadCopy}>
                      <Text style={styles.toggleLabel}>Employee ID</Text>
                      <Text style={styles.employeeMeta}>
                        {getEmployeeProfileDraftValue(
                          employee,
                          "employee_id_photo_url"
                        )
                          ? "ID scanned"
                          : "Optional"}
                      </Text>
                    </View>
	                    <TouchableOpacity
	                      onPress={() => uploadEmployeeIdPhoto(employee)}
	                      disabled={employeeIdUploading || !isEmployeeEditing(employee)}
	                      style={[
	                        styles.idUploadButton,
	                        (employeeIdUploading || !isEmployeeEditing(employee)) &&
	                          styles.disabledButton,
	                      ]}
	                    >
                      <Text style={styles.idUploadButtonText}>
                        {employeeIdUploading ? "Scanning..." : "Scan ID"}
                      </Text>
                    </TouchableOpacity>
                    {getEmployeeIdPhotoUrl(
                      employee,
                      employeeProfileDrafts[employee._id]
                    ) ? (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.idPreviewRow}
                        onPress={() =>
                          Linking.openURL(
                            getEmployeeIdPhotoUrl(
                              employee,
                              employeeProfileDrafts[employee._id]
                            )
                          )
                        }
                      >
                        <Image
                          source={{
                            uri: getEmployeeIdPhotoUrl(
                              employee,
                              employeeProfileDrafts[employee._id]
                            ),
                          }}
                          style={styles.idPreviewImage}
                        />
                        <Text style={styles.idPreviewText}>View saved ID</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
	                  {isEmployeeEditing(employee) ? (
	                    <TouchableOpacity
	                      onPress={() => saveEmployeeProfile(employee)}
	                      style={styles.secondaryButton}
	                    >
	                      <Text style={styles.secondaryButtonText}>Save Profile</Text>
	                    </TouchableOpacity>
	                  ) : null}

                  <View style={styles.subsectionDivider} />
                  <Text style={styles.submenuTitle}>Truck Assignment</Text>
	                  <Text style={styles.helperText}>
	                    Moving an employee to another truck or location sets them off
	                    duty and ends any active session.
	                  </Text>
	                  <Text style={styles.label}>Employee Rate</Text>
	                  <View style={styles.rateEditRow}>
	                    <TextInput
	                      value={
	                        employeeRateDrafts[employee._id] ??
	                        (employee.employee_rate !== null &&
	                        employee.employee_rate !== undefined
	                          ? String(employee.employee_rate)
	                          : "")
	                      }
		                      onChangeText={(text) =>
		                        setEmployeeRateDraft(employee._id, text)
		                      }
		                      keyboardType="decimal-pad"
		                      placeholder="0.00"
		                      editable={isEmployeeEditing(employee)}
		                      style={[
		                        styles.input,
		                        styles.rateInput,
		                        !isEmployeeEditing(employee) && styles.readOnlyInput,
		                      ]}
		                    />
		                    {isEmployeeEditing(employee) ? (
		                      <TouchableOpacity
		                        onPress={() => saveEmployeeRate(employee)}
		                        style={styles.rateSaveButton}
		                      >
		                        <Text style={styles.rateSaveButtonText}>Save Rate</Text>
		                      </TouchableOpacity>
		                    ) : null}
	                  </View>
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
	                    disable={!isEmployeeEditing(employee)}
	                    style={[
	                      styles.dropdown,
	                      !isEmployeeEditing(employee) && styles.readOnlyInput,
	                    ]}
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
	                    disable={!isEmployeeEditing(employee)}
	                    style={[
	                      styles.dropdown,
	                      !isEmployeeEditing(employee) && styles.readOnlyInput,
	                    ]}
	                    selectedTextStyle={styles.dropdownText}
	                    placeholderStyle={styles.placeholderText}
	                    itemTextStyle={styles.dropdownText}
	                  />
	                  {isEmployeeEditing(employee) ? (
	                    <TouchableOpacity
	                      onPress={() => assignEmployeeLocation(employee)}
	                      style={styles.secondaryButton}
	                    >
	                      <Text style={styles.secondaryButtonText}>Save Assignment</Text>
	                    </TouchableOpacity>
	                  ) : null}
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
                    <TouchableOpacity
                      style={styles.shiftHistoryTitleButton}
                      onPress={() => toggleShiftHistory(employee)}
                    >
                      <Text style={styles.submenuTitle}>Shift History</Text>
                      <IconButton
                        icon={shiftHistoryExpanded[employee._id] ? "chevron-up" : "chevron-down"}
                        size={20}
                      />
                    </TouchableOpacity>
                    {shiftHistoryExpanded[employee._id] ? <View style={styles.shiftFilterRow}>
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
                    </View> : null}
                  </View>

                  {shiftHistoryExpanded[employee._id] && shiftHistoryLoadingId === employee._id ? (
                    <ActivityIndicator color={AppColor.primary} style={{ marginTop: 12 }} />
                  ) : shiftHistoryExpanded[employee._id] && (shiftHistoryByEmployee[employee._id] || []).length ? (
                    (shiftHistoryByEmployee[employee._id] || []).map((session) => (
                      <View
                        key={session.employee_session_id || session._id}
                        style={styles.shiftHistoryItem}
                      >
                        <View style={styles.timecardTitleRow}>
                          <Text style={styles.shiftHistoryValue}>
                            {session.operational_day_key || "Shift"}
                          </Text>
                          {!session.is_active ? (
                            <TouchableOpacity onPress={() => beginShiftEdit(session)}>
                              <IconButton icon="pencil" size={18} />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                        {editingShiftId === session.employee_session_id ? (
                          <View style={styles.timecardEditor}>
                            <Text style={styles.label}>Start (YYYY-MM-DD HH:mm)</Text>
                            <TextInput
                              style={styles.input}
                              value={shiftEditDraft?.started_at || ""}
                              onChangeText={(value) => setShiftEditDraft((draft) => ({ ...draft, started_at: value }))}
                            />
                            <Text style={styles.label}>End (YYYY-MM-DD HH:mm)</Text>
                            <TextInput
                              style={styles.input}
                              value={shiftEditDraft?.ended_at || ""}
                              onChangeText={(value) => setShiftEditDraft((draft) => ({ ...draft, ended_at: value }))}
                            />
                            <Text style={styles.label}>Break minutes</Text>
                            <TextInput
                              style={styles.input}
                              keyboardType="number-pad"
                              value={shiftEditDraft?.total_break_minutes || ""}
                              onChangeText={(value) => setShiftEditDraft((draft) => ({ ...draft, total_break_minutes: value.replace(/\D/g, "") }))}
                            />
                            <Text style={styles.label}>Reason for edit</Text>
                            <TextInput
                              style={styles.input}
                              value={shiftEditDraft?.reason || ""}
                              onChangeText={(value) => setShiftEditDraft((draft) => ({ ...draft, reason: value }))}
                            />
                            <View style={styles.buttonRow}>
                              <TouchableOpacity style={styles.secondaryButton} onPress={() => setEditingShiftId(null)}>
                                <Text style={styles.secondaryButtonText}>Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.smallPrimaryButton} onPress={() => saveShiftEdit(employee, session)}>
                                <Text style={styles.primaryButtonText}>Save Hours</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : <>
                        <View style={styles.shiftHistoryRow}>
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
                        <View style={styles.shiftTotalsRow}>
                          <View>
                            <Text style={styles.shiftHistoryLabel}>With Breaks</Text>
                            <Text style={styles.shiftHistoryValue}>
                              {formatShiftHours(session.gross_hours_worked)}
                            </Text>
                          </View>
                          <View style={styles.shiftHistoryEnd}>
                            <Text style={styles.shiftHistoryLabel}>Without Breaks</Text>
                            <Text style={styles.shiftHistoryValue}>
                              {formatShiftHours(session.net_hours_worked)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.shiftTotalsRow}>
                          <Text style={styles.employeeMeta}>
                            Breaks: {session.total_break_minutes || 0} min
                          </Text>
                        </View>
                        </>}
                      </View>
                    ))
                  ) : shiftHistoryExpanded[employee._id] ? (
                    <Text style={styles.emptyHistoryText}>
                      No shift history for this {shiftHistoryRange}.
                    </Text>
                  ) : null}
                  {shiftHistoryExpanded[employee._id] && (shiftHistoryByEmployee[employee._id] || []).length ? (
                    <TouchableOpacity
                      style={styles.archiveHistoryButton}
                      onPress={() => archiveShiftHistory(employee)}
                    >
                      <Text style={styles.archiveHistoryButtonText}>Archive</Text>
                    </TouchableOpacity>
                  ) : null}
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
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
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
    paddingVertical: 11,
    minHeight: 48,
    textAlignVertical: "center",
  },
  readOnlyInput: {
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    backgroundColor: "#F1F2F4",
    color: AppColor.text,
    fontFamily: Mulish600,
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 48,
    textAlignVertical: "center",
  },
  rateEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rateInput: {
    flex: 1,
  },
  rateSaveButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: AppColor.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  rateSaveButtonText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 13,
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
    minHeight: 48,
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
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 12,
  },
  employeeSummary: { width: "100%" },
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
  employeeHoursSummary: {
    color: AppColor.black,
    fontFamily: Mulish600,
    fontSize: 12,
    marginTop: 3,
  },
  phoneLink: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    textDecorationLine: "underline",
  },
  employeeActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
    width: "100%",
  },
  archivePill: {
    alignItems: "center",
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 10,
  },
  archiveText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish700,
    fontSize: 12,
  },
  actionIconButton: {
    height: 40,
    margin: 0,
    width: 40,
  },
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
  subsectionDivider: {
    borderTopWidth: 1,
    borderColor: AppColor.border,
    marginTop: 14,
    paddingTop: 12,
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
  idUploadCard: {
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 12,
    padding: 12,
  },
  idUploadCopy: {
    flex: 1,
  },
  idUploadButton: {
    alignItems: "center",
    backgroundColor: AppColor.primary,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 14,
  },
  idUploadButtonText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 13,
  },
  idPreviewRow: {
    alignItems: "center",
    backgroundColor: AppColor.white,
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 8,
    width: "100%",
  },
  idPreviewImage: {
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    height: 44,
    width: 44,
  },
  idPreviewText: {
    color: AppColor.primary,
    flex: 1,
    fontFamily: Mulish700,
    fontSize: 13,
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
  shiftHistoryTitleButton: {
    alignItems: "center",
    flexDirection: "row",
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
    marginTop: 10,
    padding: 12,
  },
  timecardTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timecardEditor: {
    borderTopColor: AppColor.border,
    borderTopWidth: 1,
    marginTop: 6,
    paddingTop: 4,
  },
  archiveHistoryButton: {
    alignItems: "center",
    borderColor: AppColor.primary,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  archiveHistoryButtonText: {
    color: AppColor.primary,
    fontFamily: Mulish700,
  },
  shiftHistoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  shiftTotalsRow: {
    borderTopWidth: 1,
    borderColor: AppColor.border,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
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
