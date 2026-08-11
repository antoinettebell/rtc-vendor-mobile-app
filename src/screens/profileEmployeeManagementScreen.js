import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
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
import { useDispatch, useSelector } from "react-redux";
import { Dropdown } from "react-native-element-dropdown";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import FiveMinuteWheelPicker from "../components/FiveMinuteWheelPicker";
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
  updateFoodTruckUnits_API,
  uploadImage_API,
} from "../api/appAPI";
import { updateFoodTruck } from "../redux/slices/userSlice";
import { setVendorOnboardingStep } from "../redux/slices/authSlice";
import {
  beginScheduleEdit,
  cancelScheduleEdit,
  isScheduleControlEnabled,
} from "../helpers/employeeScheduleEdit.helper";
import {
  formatShiftEditDate,
  formatShiftEditTime,
  isValidShiftRange,
  mergeShiftDatePart,
  mergeShiftTimePart,
} from "../helpers/shiftHistoryEdit.helper";

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
  pin: "",
};

const WEEK_DAYS = [
  ["sun", "Sunday"], ["mon", "Monday"], ["tue", "Tuesday"],
  ["wed", "Wednesday"], ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"],
];
const getDayDraft = (schedule = []) => WEEK_DAYS.map(([day]) => {
  const saved = schedule.find((row) => row.day === day);
  return { day, enabled: !!saved?.enabled, clock_in: saved?.clock_in || "09:00", clock_out: saved?.clock_out || "17:00" };
});
const getScheduleDraft = (employee) => {
  if (employee.schedule_assignments?.length) {
    return employee.schedule_assignments.map((assignment) => ({
      truck_unit_id: assignment.truck_unit_id?._id || assignment.truck_unit_id || "",
      location_id: assignment.location_id?._id || assignment.location_id || "",
      days: getDayDraft(assignment.days || []),
    }));
  }
  if (employee.weekly_schedule?.length) {
    return [{
      truck_unit_id: employee.assigned_truck_unit_id || "",
      location_id: employee.assigned_location_id || "",
      days: getDayDraft(employee.weekly_schedule),
    }];
  }
  return [{ truck_unit_id: "", location_id: "", days: getDayDraft() }];
};
const timeToDate = (value) => {
  const [hours, minutes] = String(value || "09:00").split(":").map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
};
const dateToTime = (date) => `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
const formatScheduleTime = (value) => timeToDate(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

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

  return date.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};
const formatShiftHours = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(2)} hrs` : "Pending";
};
const formatOperationalDay = (value) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : value || "Shift";
};

const ProfileEmployeeManagementScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
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
  const [shiftPickerTarget, setShiftPickerTarget] = useState(null);
  const [breakPickerVisible, setBreakPickerVisible] = useState(false);
  const [employeeIdUploading, setEmployeeIdUploading] = useState(false);
  const [scheduleExpandedId, setScheduleExpandedId] = useState(null);
  const [scheduleEditingId, setScheduleEditingId] = useState(null);
  const [scheduleDrafts, setScheduleDrafts] = useState({});
  const [timePickerTarget, setTimePickerTarget] = useState(null);
  const [missingTruckPromptVisible, setMissingTruckPromptVisible] = useState(false);
  const [missingTruckName, setMissingTruckName] = useState("");
  const [missingTruckSaving, setMissingTruckSaving] = useState(false);
  const isManageMode = managementMode === "manage";
  const isGuidedOnboarding = route?.params?.onboardingFlow === true;
  const continueGuidedOnboarding = () => {
    dispatch(setVendorOnboardingStep("MENU"));
    navigation.reset({ index: 0, routes: [{ name: "authMenuSetupPromptScreen" }] });
  };

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
      started_at: new Date(session.started_at),
      ended_at: new Date(session.ended_at),
      total_break_minutes: String(session.total_break_minutes || 0),
      reason: "",
    });
  };

  const saveShiftEdit = async (employee, session) => {
    const startedAt = new Date(shiftEditDraft?.started_at);
    const endedAt = new Date(shiftEditDraft?.ended_at);
    if (
      Number.isNaN(startedAt.getTime()) ||
      Number.isNaN(endedAt.getTime()) ||
      !shiftEditDraft?.reason?.trim()
    ) {
      Alert.alert("Timecard incomplete", "Enter valid start/end times and an edit reason.");
      return;
    }
    if (!isValidShiftRange(startedAt, endedAt)) {
      Alert.alert(
        "End time must follow start time",
        "For an overnight shift, select the following calendar date for the end time.",
      );
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

  const confirmShiftPicker = (selectedValue) => {
    if (!shiftPickerTarget) return;
    const { field, mode } = shiftPickerTarget;
    setShiftEditDraft((draft) => ({
      ...draft,
      [field]:
        mode === "date"
          ? mergeShiftDatePart(draft[field], selectedValue)
          : mergeShiftTimePart(draft[field], selectedValue),
    }));
    setShiftPickerTarget(null);
  };

  const archiveShiftHistory = async (employee) => {
    let weeklySessions = [];
    try {
      const response = await getVendorEmployeeShiftHistory_API({
        employee_id: employee._id,
        range: "week",
      });
      weeklySessions = response?.data?.sessions || [];
    } catch (error) {
      Alert.alert("Shift history unavailable", error?.message || "Please try again.");
      return;
    }
    if (employee.has_open_shift || weeklySessions.some((session) => session.is_active)) {
      Alert.alert("Open shift", "End this employee's open shift before archiving shift history.");
      return;
    }
    const sessions = weeklySessions.filter((session) => !session.is_active && session.ended_at);
    if (!sessions.length) {
      Alert.alert("Nothing to archive", "Only completed timecards can be archived.");
      return;
    }
    Alert.alert(
      "Archive Shift History?",
      "Are you ready to roll this employee's completed timecards into history for next week? They will remain stored for reporting but cannot be edited afterward.",
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

  const toggleEmployeeSchedule = (employee) => {
    if (!(foodTruck?.truck_units || []).some((unit) => !unit.is_archived)) {
      setMissingTruckName("");
      setMissingTruckPromptVisible(true);
      return;
    }
    const willCollapse = scheduleExpandedId === employee._id;
    setScheduleExpandedId(willCollapse ? null : employee._id);
    if (willCollapse) setScheduleEditingId(null);
    setScheduleDrafts((current) => ({
      ...current,
      [employee._id]: cancelScheduleEdit(getScheduleDraft(employee)),
    }));
  };

  const startScheduleEdit = (employee) => {
    setScheduleExpandedId(employee._id);
    setScheduleDrafts((current) => ({
      ...current,
      [employee._id]: beginScheduleEdit(getScheduleDraft(employee)),
    }));
    setScheduleEditingId(employee._id);
  };

  const cancelScheduleEditing = (employee) => {
    setScheduleDrafts((current) => ({
      ...current,
      [employee._id]: cancelScheduleEdit(getScheduleDraft(employee)),
    }));
    if (timePickerTarget?.employeeId === employee._id) {
      setTimePickerTarget(null);
    }
    setScheduleEditingId(null);
  };

  const createMissingPrimaryTruck = async () => {
    if (!missingTruckName.trim()) {
      Alert.alert("Truck name required", "Enter the name used to identify this food truck.");
      return;
    }
    setMissingTruckSaving(true);
    try {
      const response = await updateFoodTruckUnits_API({
        foodtruck_id: foodTruck?._id,
        payload: { food_truck_count: 1, create_name: missingTruckName.trim() },
      });
      const nextFoodTruck = response?.data?.foodtruck;
      if (!nextFoodTruck?.truck_units?.length) {
        throw new Error("The food truck record was not created.");
      }
      dispatch(updateFoodTruck(nextFoodTruck));
      setMissingTruckPromptVisible(false);
      setMissingTruckName("");
      Alert.alert("Food truck created", "You can now open Employee Schedule and assign this truck.");
    } catch (error) {
      Alert.alert("Truck not saved", error?.message || "Please try again.");
    } finally {
      setMissingTruckSaving(false);
    }
  };

  const updateScheduleRow = (employeeId, assignmentIndex, day, field, value) => {
    setScheduleDrafts((current) => ({
      ...current,
      [employeeId]: (current[employeeId] || []).map((assignment, index) =>
        index === assignmentIndex
          ? { ...assignment, days: assignment.days.map((row) => row.day === day ? { ...row, [field]: value } : row) }
          : assignment),
    }));
  };

  const updateScheduleAssignment = (employeeId, assignmentIndex, field, value) => {
    setScheduleDrafts((current) => ({
      ...current,
      [employeeId]: (current[employeeId] || []).map((assignment, index) =>
        index === assignmentIndex ? { ...assignment, [field]: value } : assignment),
    }));
  };

  const addScheduleAssignment = (employeeId) => {
    setScheduleDrafts((current) => ({
      ...current,
      [employeeId]: [
        ...(current[employeeId] || []),
        { truck_unit_id: "", location_id: "", days: getDayDraft() },
      ],
    }));
  };

  const removeScheduleAssignment = (employeeId, assignmentIndex) => {
    setScheduleDrafts((current) => ({
      ...current,
      [employeeId]: (current[employeeId] || []).filter((_, index) => index !== assignmentIndex),
    }));
  };

  const saveEmployeeSchedule = async (employee) => {
    const assignments = scheduleDrafts[employee._id] || getScheduleDraft(employee);
    if (!assignments.length || assignments.some((item) => !item.truck_unit_id || !item.location_id)) {
      Alert.alert("Truck and location required", "Select a food truck and serving location on every schedule card.");
      return;
    }
    const enabledRows = assignments.flatMap((assignment) => assignment.days.filter((row) => row.enabled));
    if (!enabledRows.length) {
      Alert.alert("Workday required", "Check at least one workday before saving the employee schedule.");
      return;
    }
    if (new Set(enabledRows.map((row) => row.day)).size !== enabledRows.length) {
      Alert.alert("Duplicate workday", "Assign each day to only one food truck and location.");
      return;
    }
    const invalid = enabledRows.find((row) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.clock_in) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.clock_out));
    if (invalid) {
      Alert.alert("Valid times required", "Enter scheduled times as HH:MM, such as 09:00 or 17:30.");
      return;
    }
    const saved = await updateEmployee(employee, { schedule_assignments: assignments, is_working: false });
    if (saved) {
      setScheduleEditingId(null);
      setScheduleExpandedId(null);
    }
  };

  const archiveEmployeeSchedule = (employee) => {
    if (employee.has_open_shift) {
      Alert.alert("Open shift", "End this employee's open shift before archiving the schedule.");
      return;
    }
    if (!employee.schedule_assignments?.length && !employee.weekly_schedule?.length) {
      Alert.alert("Nothing to archive", "This employee does not have a saved schedule.");
      return;
    }
    Alert.alert(
      "Archive Employee Schedule?",
      "Are you ready to set the schedule for next week? Before archiving, remove any future shifts and end any open shift. The current schedule will move to history and the schedule form will be cleared.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            const saved = await updateEmployee(employee, { archive_schedule: true, is_working: false });
            if (saved) {
              setScheduleDrafts((current) => ({ ...current, [employee._id]: getScheduleDraft({}) }));
              await fetchEmployees();
            }
          },
        },
      ],
    );
  };

  const confirmScheduleTime = (date) => {
    if (timePickerTarget) {
      updateScheduleRow(timePickerTarget.employeeId, timePickerTarget.assignmentIndex, timePickerTarget.day, timePickerTarget.field, dateToTime(date));
    }
    setTimePickerTarget(null);
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

            <Text style={styles.helperText}>
              Food truck, location, days, and hours are assigned from Employee Schedule after this profile is saved.
            </Text>

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
                    Schedule cards: {employee.schedule_assignments?.length || (employee.weekly_schedule?.length ? 1 : 0)}
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
	                  <Text style={styles.submenuTitle}>Pay Rate</Text>
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
                <View style={styles.scheduleSection}>
                  <View style={styles.scheduleHeader}>
                    <TouchableOpacity
                      style={styles.scheduleHeaderSummary}
                      onPress={() => toggleEmployeeSchedule(employee)}
                    >
                    <View>
                      <Text style={styles.toggleLabel}>Employee Schedule</Text>
                      <Text style={styles.employeeMeta}>
                        {employee.is_working ? "Inside scheduled working window" : "Outside scheduled working window"}
                      </Text>
                    </View>
                    </TouchableOpacity>
                    <View style={styles.scheduleHeaderActions}>
                      <IconButton
                        icon="pencil"
                        iconColor={AppColor.primary}
                        size={20}
                        onPress={() => startScheduleEdit(employee)}
                        accessibilityLabel={`Edit ${employee.first_name} schedule`}
                      />
                      <TouchableOpacity onPress={() => toggleEmployeeSchedule(employee)}>
                        <Text style={styles.scheduleChevron}>{scheduleExpandedId === employee._id ? "▲" : "▼"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {scheduleExpandedId === employee._id ? (
                    <View style={styles.scheduleBody}>
                      <Text style={styles.employeeMeta}>Employees may clock in 15 minutes early. Access ends and active shifts close 15 minutes after the scheduled clock-out time.</Text>
                      {(scheduleDrafts[employee._id] || getScheduleDraft(employee)).map((assignment, assignmentIndex) => (
                        <View key={`${employee._id}-${assignmentIndex}`} style={styles.scheduleAssignmentCard}>
                          <View style={styles.scheduleCardHeader}>
                            <Text style={styles.submenuTitle}>Truck / Location {assignmentIndex + 1}</Text>
                            {assignmentIndex > 0 && scheduleEditingId === employee._id ? (
                              <TouchableOpacity onPress={() => removeScheduleAssignment(employee._id, assignmentIndex)}>
                                <Text style={styles.removeScheduleText}>Remove</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                          <Text style={styles.label}>Select Food Truck</Text>
                          <Dropdown
                            data={truckOptions}
                            labelField="label"
                            valueField="value"
                            value={assignment.truck_unit_id}
                            disable={!isScheduleControlEnabled({ editingEmployeeId: scheduleEditingId, employeeId: employee._id })}
                            onChange={(item) => updateScheduleAssignment(employee._id, assignmentIndex, "truck_unit_id", item.value)}
                            placeholder="Select food truck"
                            style={[
                              styles.dropdown,
                              scheduleEditingId !== employee._id && styles.scheduleControlDisabled,
                            ]}
                            selectedTextStyle={styles.dropdownText}
                            placeholderStyle={styles.placeholderText}
                            itemTextStyle={styles.dropdownText}
                          />
                          <Text style={styles.label}>Select Location</Text>
                          <Dropdown
                            data={locationOptions}
                            labelField="label"
                            valueField="value"
                            value={assignment.location_id}
                            disable={!isScheduleControlEnabled({ editingEmployeeId: scheduleEditingId, employeeId: employee._id })}
                            onChange={(item) => updateScheduleAssignment(employee._id, assignmentIndex, "location_id", item.value)}
                            placeholder="Select location"
                            style={[
                              styles.dropdown,
                              scheduleEditingId !== employee._id && styles.scheduleControlDisabled,
                            ]}
                            selectedTextStyle={styles.dropdownText}
                            placeholderStyle={styles.placeholderText}
                            itemTextStyle={styles.dropdownText}
                          />
                          {assignment.days.map((row) => {
                            const label = WEEK_DAYS.find(([day]) => day === row.day)?.[1] || row.day;
                            return (
                              <View key={row.day} style={styles.scheduleRow}>
                                <TouchableOpacity
                                  style={styles.scheduleDayBlock}
                                  disabled={scheduleEditingId !== employee._id}
                                  onPress={() => updateScheduleRow(employee._id, assignmentIndex, row.day, "enabled", !row.enabled)}
                                >
                                  <View style={[styles.dayCheckbox, row.enabled && styles.dayCheckboxChecked]}>
                                    {row.enabled ? <Text style={styles.dayCheckboxMark}>✓</Text> : null}
                                  </View>
                                  <Text style={styles.scheduleDay}>{label}</Text>
                                </TouchableOpacity>
                                {row.enabled ? (
                                  <View style={styles.scheduleTimeRow}>
                                    <TouchableOpacity
                                      style={[styles.scheduleTimeInput, scheduleEditingId !== employee._id && styles.scheduleControlDisabled]}
                                      disabled={scheduleEditingId !== employee._id}
                                      onPress={() => setTimePickerTarget({ employeeId: employee._id, assignmentIndex, day: row.day, field: "clock_in", value: row.clock_in })}
                                    >
                                      <Text style={styles.scheduleTimeText}>{formatScheduleTime(row.clock_in)}</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.employeeMeta}>to</Text>
                                    <TouchableOpacity
                                      style={[styles.scheduleTimeInput, scheduleEditingId !== employee._id && styles.scheduleControlDisabled]}
                                      disabled={scheduleEditingId !== employee._id}
                                      onPress={() => setTimePickerTarget({ employeeId: employee._id, assignmentIndex, day: row.day, field: "clock_out", value: row.clock_out })}
                                    >
                                      <Text style={styles.scheduleTimeText}>{formatScheduleTime(row.clock_out)}</Text>
                                    </TouchableOpacity>
                                  </View>
                                ) : null}
                              </View>
                            );
                          })}
                        </View>
                      ))}
                      {scheduleEditingId === employee._id ? (
                        <>
                          <TouchableOpacity style={styles.secondaryButton} onPress={() => addScheduleAssignment(employee._id)}>
                            <Text style={styles.secondaryButtonText}>Add Food Truck</Text>
                          </TouchableOpacity>
                          <View style={styles.scheduleEditActions}>
                            <TouchableOpacity style={styles.secondaryButton} onPress={() => cancelScheduleEditing(employee)}>
                              <Text style={styles.secondaryButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.primaryButton} onPress={() => saveEmployeeSchedule(employee)}>
                              <Text style={styles.primaryButtonText}>Save</Text>
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity style={styles.archiveHistoryButton} onPress={() => archiveEmployeeSchedule(employee)}>
                            <Text style={styles.archiveHistoryButtonText}>Archive Schedule</Text>
                          </TouchableOpacity>
                        </>
                      ) : null}
                    </View>
                  ) : null}
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
                            {formatOperationalDay(session.operational_day_key)}
                          </Text>
                          {!session.is_active ? (
                            <TouchableOpacity onPress={() => beginShiftEdit(session)}>
                              <IconButton icon="pencil" size={18} />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                        {editingShiftId === session.employee_session_id ? (
                          <View style={styles.timecardEditor}>
                            <Text style={styles.label}>Start date</Text>
                            <TouchableOpacity
                              style={styles.input}
                              onPress={() => setShiftPickerTarget({ field: "started_at", mode: "date" })}
                            >
                              <Text>{formatShiftEditDate(shiftEditDraft?.started_at)}</Text>
                            </TouchableOpacity>
                            <Text style={styles.label}>Start time</Text>
                            <TouchableOpacity
                              style={styles.input}
                              onPress={() => setShiftPickerTarget({ field: "started_at", mode: "time" })}
                            >
                              <Text>{formatShiftEditTime(shiftEditDraft?.started_at)}</Text>
                            </TouchableOpacity>
                            <Text style={styles.label}>End date</Text>
                            <TouchableOpacity
                              style={styles.input}
                              onPress={() => setShiftPickerTarget({ field: "ended_at", mode: "date" })}
                            >
                              <Text>{formatShiftEditDate(shiftEditDraft?.ended_at)}</Text>
                            </TouchableOpacity>
                            <Text style={styles.label}>End time</Text>
                            <TouchableOpacity
                              style={styles.input}
                              onPress={() => setShiftPickerTarget({ field: "ended_at", mode: "time" })}
                            >
                              <Text>{formatShiftEditTime(shiftEditDraft?.ended_at)}</Text>
                            </TouchableOpacity>
                            <Text style={styles.label}>Break minutes</Text>
                            <TouchableOpacity
                              style={styles.input}
                              onPress={() => setBreakPickerVisible(true)}
                            >
                              <Text>
                                {shiftEditDraft?.total_break_minutes || "0"} minutes
                              </Text>
                            </TouchableOpacity>
                            <Text style={styles.label}>Reason for edit</Text>
                            <TextInput
                              style={styles.input}
                              value={shiftEditDraft?.reason || ""}
                              onChangeText={(value) => setShiftEditDraft((draft) => ({ ...draft, reason: value }))}
                            />
                            <View style={styles.buttonRow}>
                              <TouchableOpacity style={styles.secondaryButton} onPress={() => {
                                setEditingShiftId(null);
                                setShiftEditDraft(null);
                                setShiftPickerTarget(null);
                                setBreakPickerVisible(false);
                              }}>
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
                      <Text style={styles.archiveHistoryButtonText}>Archive Shift History</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
      {isGuidedOnboarding ? (
        <View style={styles.guidedActions}>
          <TouchableOpacity style={styles.guidedNextButton} onPress={continueGuidedOnboarding}>
            <Text style={styles.primaryButtonText}>Next: Menu Setup</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.guidedSkipButton} onPress={continueGuidedOnboarding}>
            <Text style={styles.secondaryButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <Modal transparent visible={missingTruckPromptVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
            <Text style={styles.submenuTitle}>Food Truck Name Required</Text>
            <Text style={styles.helperText}>
              No food truck record is available for employee scheduling. Enter a name to create the primary truck.
            </Text>
            <TextInput
              value={missingTruckName}
              onChangeText={setMissingTruckName}
              placeholder="Food truck name"
              maxLength={80}
              style={styles.input}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                disabled={missingTruckSaving}
                onPress={() => setMissingTruckPromptVisible(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallPrimaryButton}
                disabled={missingTruckSaving}
                onPress={createMissingPrimaryTruck}
              >
                <Text style={styles.primaryButtonText}>
                  {missingTruckSaving ? "Saving..." : "Create Truck"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <DateTimePickerModal
        isVisible={!!timePickerTarget}
        mode="time"
        date={timeToDate(timePickerTarget?.value)}
        onConfirm={confirmScheduleTime}
        onCancel={() => setTimePickerTarget(null)}
        is24Hour={false}
      />
      <FiveMinuteWheelPicker
        visible={breakPickerVisible}
        value={shiftEditDraft?.total_break_minutes || "0"}
        onChange={(value) =>
          setShiftEditDraft((draft) => ({
            ...draft,
            total_break_minutes: value,
          }))
        }
        onClose={() => setBreakPickerVisible(false)}
      />
      <DateTimePickerModal
        isVisible={!!shiftPickerTarget}
        mode={shiftPickerTarget?.mode || "date"}
        date={
          new Date(
            shiftEditDraft?.[shiftPickerTarget?.field] || Date.now(),
          )
        }
        onConfirm={confirmShiftPicker}
        onCancel={() => setShiftPickerTarget(null)}
        is24Hour={false}
      />
    </View>
  );
};

export default ProfileEmployeeManagementScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  guidedActions: { backgroundColor: AppColor.white, paddingHorizontal: 20, paddingVertical: 12 },
  guidedNextButton: { backgroundColor: AppColor.primary, alignItems: "center", borderRadius: 8, paddingVertical: 14 },
  guidedSkipButton: { alignItems: "center", paddingVertical: 12 },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalPanel: {
    backgroundColor: AppColor.white,
    borderRadius: 12,
    gap: 10,
    padding: 20,
    width: "100%",
  },
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
  scheduleSection: {
    borderTopWidth: 1,
    borderColor: AppColor.border,
    marginTop: 10,
    paddingTop: 10,
  },
  scheduleHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  scheduleHeaderSummary: {
    flex: 1,
  },
  scheduleHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
  },
  scheduleChevron: { color: AppColor.primary, fontSize: 16 },
  scheduleBody: { gap: 8, paddingBottom: 10 },
  scheduleControlDisabled: { opacity: 0.65 },
  scheduleEditActions: {
    flexDirection: "row",
    gap: 8,
  },
  scheduleAssignmentCard: {
    backgroundColor: AppColor.white,
    borderColor: AppColor.border,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  scheduleCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  removeScheduleText: { color: AppColor.error || "#B42318", fontFamily: Mulish700 },
  scheduleRow: {
    backgroundColor: "#F9FAFB",
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  scheduleDayBlock: { alignItems: "center", flexDirection: "row", gap: 8 },
  dayCheckbox: {
    alignItems: "center",
    borderColor: AppColor.border,
    borderRadius: 4,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  dayCheckboxChecked: { backgroundColor: AppColor.primary, borderColor: AppColor.primary },
  dayCheckboxMark: { color: AppColor.white, fontFamily: Mulish700, fontSize: 14 },
  scheduleDay: { color: AppColor.text, fontFamily: Mulish700, fontSize: 14 },
  scheduleTimeRow: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 8 },
  scheduleTimeInput: {
    backgroundColor: AppColor.white,
    borderColor: AppColor.border,
    borderRadius: 6,
    borderWidth: 1,
    fontFamily: Mulish600,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: 82,
  },
  scheduleTimeText: { color: AppColor.text, fontFamily: Mulish600, textAlign: "center" },
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
