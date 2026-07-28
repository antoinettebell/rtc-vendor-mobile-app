import React, { useCallback, useEffect, useState } from "react";
import {
	  ActivityIndicator,
	  Alert,
	  Linking,
	  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DocumentPicker, { types } from "react-native-document-picker";
import ImagePicker from "react-native-image-crop-picker";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { RESULTS } from "react-native-permissions";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Dropdown } from "react-native-element-dropdown";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getVendorFoodTruckList_API,
  getVendorComplianceSummary_API,
  submitVendorComplianceForOcr_API,
  uploadVendorComplianceDocument_API,
} from "../api/appAPI";
import StatusBarManager from "../components/StatusBarManager";
import usePermission from "../hooks/usePermission";
import { permission } from "../helpers/permission.helper";
import { AppColor, Mulish400, Mulish600, Mulish700 } from "../utils/theme";

const SCORE_FALLBACK = {
  red: "#D93025",
  yellow: "#F9AB00",
  blue: "#1A73E8",
  green: "#188038",
};

const EXPIRATION_WARNING_DAYS = 90;
const EXPIRING_DOCUMENT_TYPES = new Set([
  "HEALTH_PERMIT",
  "BUSINESS_LICENSE",
  "COI",
  "CERTIFICATE_OF_INSURANCE",
  "LIQUOR_LICENSE",
]);
const SANITATION_GRADE_OPTIONS = ["A", "B", "C", "D", "F"].map(
  (grade) => ({ label: grade, value: grade })
);

const formatLabel = (value = "") =>
  String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value) => {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
};

const formatDateForPayload = (value) => formatDate(value);

const getSelectedDateLabel = (value) =>
  value ? formatDate(value) : "Select expiration date";

const getDocumentName = (document = {}) =>
  document?.title || document?.original_name || "Uploaded document";

const getSanitationGradeFromDocument = (document = {}) => {
  const fields = document?.extracted_fields || {};
  return (
    fields.sanitation_grade ||
    fields.manual_sanitation_grade ||
    fields.grade ||
    fields.letter_grade ||
    ""
  );
};

const normalizeGradeInput = (value = "") =>
  String(value).trim().toUpperCase().replace(/[^ABCDF]/g, "").slice(0, 1);

const getFoodTruckOptionKey = (foodTruck = {}) =>
  String(foodTruck?._id || foodTruck?.id || "");

const getFoodTruckOptionLabel = (foodTruck = {}, index = 0) =>
  foodTruck?.name || foodTruck?.business_name || `Food Truck ${index + 1}`;

const getOcrStatusText = (document = {}) => {
  if (!document?.ocr_status) return "";
  const status = formatLabel(document.ocr_status);
  return document.ocr_error_message
    ? `OCR: ${status} - ${document.ocr_error_message}`
    : `OCR: ${status}`;
};

const getExpiringDocumentStatus = (requirement = {}) => {
  const rawType = String(requirement.type || "").toUpperCase();
  const daysUntilExpiration = requirement.days_until_expiration;
  const hasExpirationStatus =
    EXPIRING_DOCUMENT_TYPES.has(rawType) && daysUntilExpiration !== null;

  if (!hasExpirationStatus) {
    return {
      label: formatLabel(requirement.status),
      countdown: "",
      tone: "neutral",
    };
  }

  if (Number(daysUntilExpiration) < 0) {
    return {
      label: "Expired",
      countdown: "Expired",
      tone: "expired",
    };
  }

  if (Number(daysUntilExpiration) <= EXPIRATION_WARNING_DAYS) {
    return {
      label: "Expiring",
      countdown: `${daysUntilExpiration} days left`,
      tone: "expiring",
    };
  }

  return {
    label: "Active",
    countdown: "",
    tone: "active",
  };
};

const VendorComplianceScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state) => state.userReducer);
  const defaultFoodTruckId = user?.foodTruck?._id;
  const [selectedFoodTruckId, setSelectedFoodTruckId] = useState(
    defaultFoodTruckId || null
  );
  const foodTruckId = selectedFoodTruckId || defaultFoodTruckId;
  const [foodTruckOptions, setFoodTruckOptions] = useState([]);
  const [loadingFoodTrucks, setLoadingFoodTrucks] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState(null);
  const [submittingOcr, setSubmittingOcr] = useState(false);
  const [summary, setSummary] = useState(null);
  const [expirationDates, setExpirationDates] = useState({});
  const [manualSanitationGrades, setManualSanitationGrades] = useState({});
  const [documentRevisionTypes, setDocumentRevisionTypes] = useState({});
  const [uploadedRevisionTypes, setUploadedRevisionTypes] = useState({});
  const [expandedDocuments, setExpandedDocuments] = useState({});
  const [datePickerRequirement, setDatePickerRequirement] = useState(null);
  const { checkAndRequestPermission: cameraPermissionStatus } = usePermission(
    permission.camera
  );

  const loadFoodTruckOptions = useCallback(async () => {
    if (!defaultFoodTruckId) return;
    setLoadingFoodTrucks(true);
    try {
      const response = await getVendorFoodTruckList_API({
        page: 1,
        limit: 100,
      });
      const apiList =
        response?.data?.foodtruckList ||
        response?.data?.foodTruckList ||
        response?.foodtruckList ||
        response?.foodTruckList ||
        [];
      const fallbackList = user?.foodTruck ? [user.foodTruck] : [];
      const optionMap = new Map();
      [...apiList, ...fallbackList].forEach((foodTruck, index) => {
        const value = getFoodTruckOptionKey(foodTruck);
        if (!value || optionMap.has(value)) return;
        optionMap.set(value, {
          label: getFoodTruckOptionLabel(foodTruck, index),
          value,
        });
      });
      const nextOptions = Array.from(optionMap.values());
      setFoodTruckOptions(nextOptions);
      if (!selectedFoodTruckId && nextOptions[0]?.value) {
        setSelectedFoodTruckId(nextOptions[0].value);
      }
    } catch (error) {
      setFoodTruckOptions(
        user?.foodTruck
          ? [
              {
                label: getFoodTruckOptionLabel(user.foodTruck),
                value: defaultFoodTruckId,
              },
            ]
          : []
      );
    } finally {
      setLoadingFoodTrucks(false);
    }
  }, [defaultFoodTruckId, selectedFoodTruckId, user?.foodTruck]);

  const loadCompliance = useCallback(async () => {
    if (!foodTruckId) return;
    setLoading(true);
    try {
      const summaryResponse = await getVendorComplianceSummary_API({
        foodtruck_id: foodTruckId,
      });
      setSummary(summaryResponse?.data?.compliance || null);
    } catch (error) {
      Alert.alert("Compliance", error?.message || "Compliance details unavailable.");
    } finally {
      setLoading(false);
    }
  }, [foodTruckId]);

  useEffect(() => {
    loadCompliance();
  }, [loadCompliance]);

  useEffect(() => {
    loadFoodTruckOptions();
  }, [loadFoodTruckOptions]);

  useEffect(() => {
    setExpirationDates({});
    setManualSanitationGrades({});
    setDocumentRevisionTypes({});
    setUploadedRevisionTypes({});
    setExpandedDocuments({});
  }, [foodTruckId]);

  useEffect(() => {
    const nextGrades = {};
    (summary?.requirements || []).forEach((requirement) => {
      if (requirement.type !== "HEALTH_PERMIT") return;
      const grade = getSanitationGradeFromDocument(requirement.document);
      if (grade) {
        nextGrades[requirement.type] = String(grade).toUpperCase();
      }
    });
    setManualSanitationGrades((current) => ({ ...nextGrades, ...current }));
  }, [summary]);

  const uploadComplianceFile = async (requirement, file) => {
    const selectedExpirationDate = expirationDates[requirement.type];
    if (EXPIRING_DOCUMENT_TYPES.has(requirement.type) && !selectedExpirationDate) {
      Alert.alert(
        "Expiration Date Required",
        "Please enter the expiration date shown on the document before uploading."
      );
      return;
    }

    const sanitationGrade = normalizeGradeInput(
      manualSanitationGrades[requirement.type]
    );
    if (requirement.type === "HEALTH_PERMIT" && !sanitationGrade) {
      Alert.alert(
        "Sanitation Grade Required",
        "Select the sanitation grade shown on the document before uploading."
      );
      return;
    }

    const payload = new FormData();
    payload.append("document_type", requirement.type);
    payload.append("title", requirement.label);
    if (selectedExpirationDate) {
      payload.append("expiration_date", formatDateForPayload(selectedExpirationDate));
    }
    if (requirement.type === "HEALTH_PERMIT") {
      payload.append("sanitation_grade", sanitationGrade);
    }
    payload.append("file", {
      uri: file.uri,
      name: file.name || `${requirement.type}.pdf`,
      type: file.type || "application/octet-stream",
    });

    setUploadingType(requirement.type);
    await uploadVendorComplianceDocument_API({
      foodtruck_id: foodTruckId,
      payload,
    });
    await loadCompliance();
    setDocumentRevisionTypes((current) => ({
      ...current,
      [requirement.type]: true,
    }));
    setUploadedRevisionTypes((current) => ({
      ...current,
      [requirement.type]: true,
    }));
  };

  const pickFileAndUpload = async (requirement) => {
    try {
      const [file] = await DocumentPicker.pick({
        type: [types.pdf, types.images],
        allowMultiSelection: false,
      });

      await uploadComplianceFile(requirement, file);
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert("Upload Failed", error?.message || "Please try again.");
      }
    } finally {
      setUploadingType(null);
    }
  };

  const captureAndUpload = async (requirement) => {
    try {
      const cameraStatus = await cameraPermissionStatus();
      if (cameraStatus !== RESULTS.GRANTED) return;

      const image = await ImagePicker.openCamera({
        cropping: false,
        mediaType: "photo",
        forceJpg: true,
      });
      const file = {
        uri: image?.path,
        name:
          image?.filename ||
          image?.path?.split("/").pop() ||
          `${requirement.type}-${Date.now()}.jpg`,
        type: image?.mime || "image/jpeg",
      };

      await uploadComplianceFile(requirement, file);
    } catch (error) {
      Alert.alert("Upload Failed", error?.message || "Please try again.");
    } finally {
      setUploadingType(null);
    }
  };

  const pickPhotoAndUpload = async (requirement) => {
    try {
      const image = await ImagePicker.openPicker({
        cropping: false,
        mediaType: "photo",
        forceJpg: true,
      });
      const file = {
        uri: image?.path,
        name:
          image?.filename ||
          image?.path?.split("/").pop() ||
          `${requirement.type}-${Date.now()}.jpg`,
        type: image?.mime || "image/jpeg",
      };

      await uploadComplianceFile(requirement, file);
    } catch (error) {
      if (error?.code !== "E_PICKER_CANCELLED") {
        Alert.alert("Upload Failed", error?.message || "Please try again.");
      }
    } finally {
      setUploadingType(null);
    }
  };

  const pickAndUpload = (requirement) => {
    Alert.alert(`Upload ${requirement.label}`, "Choose how to add the document.", [
      { text: "Photo Library", onPress: () => pickPhotoAndUpload(requirement) },
      { text: "Camera", onPress: () => captureAndUpload(requirement) },
      { text: "Files", onPress: () => pickFileAndUpload(requirement) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const startDocumentRevision = (requirement) => {
    setDocumentRevisionTypes((current) => ({
      ...current,
      [requirement.type]: true,
    }));
    setUploadedRevisionTypes((current) => ({
      ...current,
      [requirement.type]: false,
    }));
    if (requirement.document?.expiration_date) {
      setExpirationDates((current) => ({
        ...current,
        [requirement.type]: new Date(requirement.document.expiration_date),
      }));
    }
    setManualSanitationGrades((current) => ({
      ...current,
      [requirement.type]:
        current[requirement.type] ||
        String(getSanitationGradeFromDocument(requirement.document) || "").toUpperCase(),
    }));
  };

  const cancelDocumentRevision = (requirement) => {
    setDocumentRevisionTypes((current) => ({
      ...current,
      [requirement.type]: false,
    }));
    setUploadedRevisionTypes((current) => ({
      ...current,
      [requirement.type]: false,
    }));
    setExpirationDates((current) => {
      const next = { ...current };
      delete next[requirement.type];
      return next;
    });
    setManualSanitationGrades((current) => ({
      ...current,
      [requirement.type]: String(
        getSanitationGradeFromDocument(requirement.document) || ""
      ).toUpperCase(),
    }));
  };

  const openExpirationDatePicker = (requirement) => {
    setDatePickerRequirement(requirement);
  };

  const toggleDocumentExpanded = (requirementType) => {
    setExpandedDocuments((current) => ({
      ...current,
      [requirementType]: !current[requirementType],
    }));
  };

  const submitForOcr = async () => {
    if (!foodTruckId) return;
    const replacementAwaitingUpload = requirements.find(
      (requirement) =>
        documentRevisionTypes[requirement.type] &&
        !uploadedRevisionTypes[requirement.type]
    );
    if (replacementAwaitingUpload) {
      Alert.alert(
        "Replacement Document Required",
        `Upload the replacement ${replacementAwaitingUpload.label} before saving.`
      );
      return;
    }
    setSubmittingOcr(true);
    try {
      const response = await submitVendorComplianceForOcr_API({
        foodtruck_id: foodTruckId,
      });
      setSummary(response?.data?.compliance || summary);
      Alert.alert(
        "Compliance Saved",
        "Your documents were saved and submitted for OCR review."
      );
      await loadCompliance();
      setDocumentRevisionTypes({});
      setUploadedRevisionTypes({});
      setExpirationDates({});
      setManualSanitationGrades({});
    } catch (error) {
      Alert.alert(
        "Compliance",
        error?.message || "Unable to submit compliance documents for OCR."
      );
    } finally {
      setSubmittingOcr(false);
    }
  };

  const handleExpirationDateConfirm = (date) => {
    if (datePickerRequirement?.type) {
      setExpirationDates((prev) => ({
        ...prev,
        [datePickerRequirement.type]: date,
      }));
    }
    setDatePickerRequirement(null);
  };

  const openDocument = (document) => {
    const url = document?.access_url || document?.file_url;
    if (!url) return;
    Linking.openURL(url).catch(() => {
      Alert.alert("Document", "Unable to open this document.");
    });
  };

	  const scoreColor =
	    summary?.score_color_hex ||
	    SCORE_FALLBACK[summary?.score_color] ||
	    AppColor.primary;
	  const requirements = summary?.requirements || [];
	  const supportPhone = summary?.support_phone_number || "(800) 410-7053";
	  const supportPhoneDigits = String(supportPhone).replace(/\D/g, "");
	  const callSupport = () => {
	    if (!supportPhoneDigits) return;
	    Linking.openURL(`tel:${supportPhoneDigits}`).catch(() => {
	      Alert.alert("Support", `Please call ${supportPhone}.`);
	    });
	  };

  return (
    <View style={styles.container}>
      <StatusBarManager barStyle="dark-content" backgroundColor={AppColor.white} />
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 12, minHeight: insets.top + 72 },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color={AppColor.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compliance</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColor.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.foodTruckSelectCard}>
            <Text style={styles.foodTruckSelectLabel}>Food Truck</Text>
            <Dropdown
              data={foodTruckOptions}
              labelField="label"
              valueField="value"
              value={foodTruckId}
              disable={loadingFoodTrucks || foodTruckOptions.length <= 1}
              onChange={(item) => {
                if (item?.value && item.value !== foodTruckId) {
                  setSelectedFoodTruckId(item.value);
                }
              }}
              placeholder={
                loadingFoodTrucks ? "Loading food trucks..." : "Select food truck"
              }
              style={[
                styles.foodTruckDropdown,
                (loadingFoodTrucks || foodTruckOptions.length <= 1) &&
                  styles.disabledDropdown,
              ]}
              placeholderStyle={styles.foodTruckDropdownText}
              selectedTextStyle={styles.foodTruckDropdownText}
              itemTextStyle={styles.foodTruckDropdownItemText}
              renderRightIcon={() =>
                loadingFoodTrucks ? (
                  <ActivityIndicator size="small" color={AppColor.primary} />
                ) : (
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={AppColor.subText}
                  />
                )
              }
            />
            <Text style={styles.foodTruckSelectHelp}>
              Sanitation grades are saved per food truck and only appear to customers when provided and verified.
            </Text>
          </View>

          <View style={[styles.scorePanel, { borderColor: scoreColor }]}>
            <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
              <Text style={styles.scoreValue}>{summary?.score || 0}</Text>
            </View>
            <View style={styles.scoreTextContainer}>
              <Text style={styles.scoreTitle}>{summary?.score_label || "Incomplete"}</Text>
              <Text style={styles.scoreBody}>
                {summary?.eligible
                  ? "Your compliance status is eligible."
                  : "Complete required documents before bidding or accepting orders."}
              </Text>
	              <TouchableOpacity onPress={callSupport} activeOpacity={0.7}>
	                <Text style={styles.supportText}>Support {supportPhone}</Text>
	              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Compliance Documents</Text>
          {requirements.map((requirement) => {
            const document = requirement.document;
		            const status = getExpiringDocumentStatus(requirement);
		            const isUploading = uploadingType === requirement.type;
            const requiresExpirationDate = EXPIRING_DOCUMENT_TYPES.has(
              requirement.type
            );
	            const selectedExpirationDate = expirationDates[requirement.type];
            const isExpanded =
              expandedDocuments[requirement.type] ?? !document;
            const isHealthPermit = requirement.type === "HEALTH_PERMIT";
            const isDocumentRevision =
              !!documentRevisionTypes[requirement.type];
            const areDocumentFieldsEditable =
              !document || isDocumentRevision;
            const sanitationGradeValue = normalizeGradeInput(
              manualSanitationGrades[requirement.type] ||
                getSanitationGradeFromDocument(document)
            );

	            return (
	              <View key={requirement.type} style={styles.documentCard}>
	                <TouchableOpacity
	                  activeOpacity={0.75}
	                  onPress={() => toggleDocumentExpanded(requirement.type)}
	                  style={styles.documentHeader}
	                >
	                  <View style={styles.documentIcon}>
	                    <Ionicons name="document-text-outline" size={22} color={AppColor.primary} />
	                  </View>
	                  <View style={styles.documentTitleContainer}>
	                    <Text style={styles.documentTitle}>{requirement.label}</Text>
	                    <Text style={styles.documentSubtitle}>{status.label}</Text>
	                  </View>
	                  <Text
	                    style={[
	                      styles.statusPill,
	                      status.tone === "expired" && styles.statusExpired,
	                      status.tone === "expiring" && styles.statusExpiring,
	                      status.tone === "active" && styles.statusActive,
	                      status.tone === "neutral" && { color: scoreColor },
	                    ]}
	                  >
	                    {status.countdown}
	                  </Text>
	                  <Ionicons
	                    name={isExpanded ? "chevron-up" : "chevron-down"}
	                    size={20}
	                    color={AppColor.subText}
	                    style={styles.expandIcon}
	                  />
	                </TouchableOpacity>
	                {isExpanded ? (
	                  <>
	                    <Text style={styles.documentMeta}>
	                      Expires {formatDate(document?.expiration_date)}
	                  </Text>
	                  {isHealthPermit &&
	                  getSanitationGradeFromDocument(document) ? (
	                    <Text style={styles.documentMeta}>
	                      Grade {String(getSanitationGradeFromDocument(document)).toUpperCase()}
	                    </Text>
	                  ) : null}
		                  {requiresExpirationDate ? (
		                      <View style={styles.expirationInputGroup}>
		                        <View style={styles.fieldLabelRow}>
		                          <Text style={styles.expirationInputLabel}>
		                            Expiration date on document *
		                          </Text>
                              {document ? (
                                <TouchableOpacity
                                  activeOpacity={0.7}
                                  accessibilityRole="button"
                                  accessibilityLabel={
                                    isDocumentRevision
                                      ? `Cancel ${requirement.label} replacement`
                                      : `Replace ${requirement.label} to edit expiration date`
                                  }
                                  onPress={() =>
                                    isDocumentRevision
                                      ? cancelDocumentRevision(requirement)
                                      : startDocumentRevision(requirement)
                                  }
                                  style={styles.editDocumentFieldButton}
                                >
                                  <Ionicons
                                    name={
                                      isDocumentRevision
                                        ? "close-outline"
                                        : "pencil-outline"
                                    }
                                    size={18}
                                    color={AppColor.primary}
                                  />
                                </TouchableOpacity>
                              ) : null}
                            </View>
	                        <TouchableOpacity
	                          activeOpacity={0.7}
	                          disabled={!areDocumentFieldsEditable}
	                          onPress={() => openExpirationDatePicker(requirement)}
	                          style={[
                              styles.expirationDateButton,
                              !areDocumentFieldsEditable && styles.readOnlyInput,
                            ]}
	                        >
	                          <Text
	                            style={[
	                              styles.expirationDateText,
	                              !selectedExpirationDate &&
	                                !document?.expiration_date &&
	                                styles.expirationDatePlaceholder,
	                            ]}
	                          >
	                            {getSelectedDateLabel(
	                              selectedExpirationDate || document?.expiration_date
	                            )}
	                          </Text>
	                          <Ionicons
	                            name="calendar-outline"
	                            size={18}
	                            color={AppColor.primary}
	                          />
	                        </TouchableOpacity>
		                        <Text style={styles.expirationHelpText}>
		                          OCR runs when you tap Save & Run OCR.
		                        </Text>
		                      </View>
		                    ) : null}
		                    {isHealthPermit ? (
		                      <View style={styles.expirationInputGroup}>
		                        <View style={styles.fieldLabelRow}>
		                          <Text style={styles.expirationInputLabel}>
		                            Sanitation Grade on document *
		                          </Text>
                              {document ? (
                                <TouchableOpacity
                                  activeOpacity={0.7}
                                  accessibilityRole="button"
                                  accessibilityLabel={
                                    isDocumentRevision
                                      ? "Cancel sanitation grade replacement"
                                      : "Replace sanitation document to edit grade"
                                  }
                                  onPress={() =>
                                    isDocumentRevision
                                      ? cancelDocumentRevision(requirement)
                                      : startDocumentRevision(requirement)
                                  }
                                  style={styles.editDocumentFieldButton}
                                >
                                  <Ionicons
                                    name={
                                      isDocumentRevision
                                        ? "close-outline"
                                        : "pencil-outline"
                                    }
                                    size={18}
                                    color={AppColor.primary}
                                  />
                                </TouchableOpacity>
                              ) : null}
                            </View>
		                        <Dropdown
                              data={SANITATION_GRADE_OPTIONS}
                              labelField="label"
                              valueField="value"
		                          value={sanitationGradeValue || null}
                              disable={!areDocumentFieldsEditable}
                              onChange={(item) =>
                                setManualSanitationGrades((current) => ({
                                  ...current,
                                  [requirement.type]: item?.value || "",
                                }))
                              }
		                          placeholder={
                                document && !sanitationGradeValue
                                  ? "Pending OCR/Admin verification"
                                  : "Select grade A, B, C, D, or F"
                              }
		                          style={[
                                styles.gradeDropdown,
                                !areDocumentFieldsEditable && styles.readOnlyInput,
                              ]}
		                          selectedTextStyle={styles.gradeDropdownText}
                              placeholderStyle={styles.gradeDropdownPlaceholder}
                              itemTextStyle={styles.gradeDropdownText}
                              renderRightIcon={() => (
                                <Ionicons
                                  name="chevron-down"
                                  size={18}
                                  color={
                                    areDocumentFieldsEditable
                                      ? AppColor.primary
                                      : AppColor.subText
                                  }
                                />
                              )}
		                        />
		                        <Text style={styles.expirationHelpText}>
		                          Select the grade printed on the document. Save & Run OCR locks the grade and checks the uploaded document. To revise it later, replace the document.
		                        </Text>
		                      </View>
		                    ) : null}
		                    {document ? (
	                      <View style={styles.uploadedDocumentRow}>
	                        <View style={styles.uploadedDocumentTextContainer}>
	                          <Text style={styles.uploadedDocumentLabel}>Uploaded</Text>
	                          <Text style={styles.uploadedDocumentName} numberOfLines={1}>
	                            {getDocumentName(document)}
	                          </Text>
                          <Text style={styles.uploadedDocumentDate}>
                            {formatDate(document.created_at || document.uploaded_at)}
                          </Text>
                          {getOcrStatusText(document) ? (
                            <Text
                              style={[
                                styles.ocrStatusText,
                                document.ocr_status === "failed" ||
                                document.ocr_status === "manual_review"
                                  ? styles.ocrStatusWarning
                                  : null,
                              ]}
                            >
                              {getOcrStatusText(document)}
                            </Text>
                          ) : null}
                        </View>
	                        {document.file_url ? (
	                          <TouchableOpacity
	                            onPress={() => openDocument(document)}
	                            style={styles.openDocumentButton}
	                          >
	                            <Text style={styles.openDocumentButtonText}>Open</Text>
	                          </TouchableOpacity>
	                        ) : null}
	                      </View>
	                    ) : null}
	                    <TouchableOpacity
	                      disabled={isUploading}
	                      onPress={() => {
                          if (document && !isDocumentRevision) {
                            startDocumentRevision(requirement);
                            return;
                          }
                          pickAndUpload(requirement);
                        }}
	                      style={styles.uploadButton}
	                    >
	                      {isUploading ? (
	                        <ActivityIndicator size="small" color={AppColor.white} />
	                      ) : (
	                        <>
	                          <Ionicons
                                name={
                                  document && !isDocumentRevision
                                    ? "pencil-outline"
                                    : "cloud-upload-outline"
                                }
                                size={18}
                                color={AppColor.white}
                              />
	                          <Text style={styles.uploadButtonText}>
	                            {document
                                  ? isDocumentRevision
                                    ? "Upload Replacement"
                                    : "Replace Document"
                                  : "Upload Document"}
	                          </Text>
	                        </>
	                      )}
	                    </TouchableOpacity>
	                  </>
	                ) : null}
	              </View>
	            );
	          })}

	          <TouchableOpacity
	            disabled={submittingOcr}
	            onPress={submitForOcr}
	            style={[styles.saveButton, submittingOcr && styles.disabledButton]}
	          >
	            {submittingOcr ? (
	              <ActivityIndicator size="small" color={AppColor.white} />
	            ) : (
	              <>
	                <Ionicons name="save-outline" size={18} color={AppColor.white} />
	                <Text style={styles.saveButtonText}>Save & Run OCR</Text>
	              </>
	            )}
	          </TouchableOpacity>
	          <DateTimePickerModal
            isVisible={!!datePickerRequirement}
            mode="date"
            minimumDate={new Date()}
            date={expirationDates[datePickerRequirement?.type] || new Date()}
            onConfirm={handleExpirationDateConfirm}
            onCancel={() => setDatePickerRequirement(null)}
          />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColor.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: Mulish700,
    fontSize: 18,
    color: AppColor.black,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  foodTruckSelectCard: {
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    backgroundColor: AppColor.white,
  },
  foodTruckSelectLabel: {
    fontFamily: Mulish700,
    fontSize: 14,
    color: AppColor.black,
    marginBottom: 8,
  },
  foodTruckDropdown: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FAFAFA",
  },
  disabledDropdown: {
    opacity: 0.75,
  },
  foodTruckDropdownText: {
    fontFamily: Mulish600,
    fontSize: 13,
    color: AppColor.black,
  },
  foodTruckDropdownItemText: {
    fontFamily: Mulish400,
    fontSize: 13,
    color: AppColor.black,
  },
  foodTruckSelectHelp: {
    fontFamily: Mulish400,
    fontSize: 11,
    color: AppColor.subText,
    lineHeight: 16,
    marginTop: 8,
  },
  scorePanel: {
    flexDirection: "row",
    borderWidth: 2,
    borderRadius: 8,
    padding: 14,
    marginBottom: 18,
    backgroundColor: "#FAFAFA",
  },
  scoreBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  scoreValue: {
    fontFamily: Mulish700,
    fontSize: 24,
    color: AppColor.white,
  },
  scoreTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  scoreTitle: {
    fontFamily: Mulish700,
    fontSize: 18,
    color: AppColor.black,
  },
  scoreBody: {
    fontFamily: Mulish400,
    fontSize: 13,
    color: AppColor.subText,
    marginTop: 4,
  },
	  supportText: {
	    fontFamily: Mulish600,
	    fontSize: 13,
	    color: AppColor.primary,
	    marginTop: 8,
	  },
  sectionTitle: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.black,
    marginBottom: 10,
    marginTop: 8,
  },
  documentCard: {
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    backgroundColor: AppColor.white,
  },
  documentHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3E8",
    marginRight: 10,
  },
  documentTitleContainer: {
    flex: 1,
  },
  documentTitle: {
    fontFamily: Mulish700,
    fontSize: 15,
    color: AppColor.black,
  },
  documentSubtitle: {
    fontFamily: Mulish400,
    fontSize: 12,
    color: AppColor.subText,
    marginTop: 2,
  },
	  statusPill: {
	    fontFamily: Mulish700,
	    fontSize: 12,
	  },
	  statusActive: {
	    color: SCORE_FALLBACK.green,
	  },
	  statusExpiring: {
	    color: SCORE_FALLBACK.yellow,
	  },
	  statusExpired: {
	    color: SCORE_FALLBACK.red,
	  },
	  expandIcon: {
	    marginLeft: 8,
	  },
  documentMeta: {
    fontFamily: Mulish400,
    fontSize: 12,
    color: AppColor.subText,
    marginTop: 10,
  },
  expirationInputGroup: {
    marginTop: 12,
  },
  expirationInputLabel: {
    fontFamily: Mulish600,
    fontSize: 12,
    color: AppColor.black,
  },
  fieldLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  editDocumentFieldButton: {
    alignItems: "center",
    borderColor: AppColor.primary,
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  expirationDateButton: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    backgroundColor: "#FAFAFA",
  },
  expirationDateText: {
    fontFamily: Mulish600,
    fontSize: 13,
    color: AppColor.black,
  },
  expirationDatePlaceholder: {
    color: AppColor.subText,
  },
  gradeDropdown: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FAFAFA",
  },
  gradeDropdownText: {
    fontFamily: Mulish600,
    fontSize: 13,
    color: AppColor.black,
  },
  gradeDropdownPlaceholder: {
    fontFamily: Mulish400,
    fontSize: 13,
    color: AppColor.subText,
  },
  readOnlyInput: {
    color: AppColor.subText,
    backgroundColor: "#F4F6F8",
  },
  expirationHelpText: {
    fontFamily: Mulish400,
    fontSize: 11,
    color: AppColor.subText,
    lineHeight: 16,
    marginTop: 6,
  },
  uploadedDocumentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    backgroundColor: "#FAFAFA",
  },
  uploadedDocumentTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  uploadedDocumentLabel: {
    fontFamily: Mulish700,
    fontSize: 11,
    color: AppColor.primary,
    textTransform: "uppercase",
  },
  uploadedDocumentName: {
    fontFamily: Mulish600,
    fontSize: 13,
    color: AppColor.black,
    marginTop: 2,
  },
  uploadedDocumentDate: {
    fontFamily: Mulish400,
    fontSize: 12,
    color: AppColor.subText,
    marginTop: 2,
  },
  ocrStatusText: {
    fontFamily: Mulish400,
    fontSize: 11,
    color: AppColor.subText,
    lineHeight: 15,
    marginTop: 4,
  },
  ocrStatusWarning: {
    color: SCORE_FALLBACK.yellow,
  },
  openDocumentButton: {
    minWidth: 62,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: AppColor.primary,
  },
  openDocumentButtonText: {
    fontFamily: Mulish700,
    fontSize: 13,
    color: AppColor.primary,
  },
  uploadButton: {
    height: 42,
    borderRadius: 8,
    backgroundColor: AppColor.primary,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
	  uploadButtonText: {
	    fontFamily: Mulish700,
	    fontSize: 14,
	    color: AppColor.white,
	    marginLeft: 8,
	  },
	  saveButton: {
	    height: 46,
	    borderRadius: 8,
	    backgroundColor: AppColor.primary,
	    marginTop: 8,
	    marginBottom: 18,
	    alignItems: "center",
	    justifyContent: "center",
	    flexDirection: "row",
	  },
	  saveButtonText: {
	    fontFamily: Mulish700,
	    fontSize: 15,
	    color: AppColor.white,
	    marginLeft: 8,
	  },
	  disabledButton: {
	    opacity: 0.7,
	  },
  historyRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
    paddingVertical: 12,
  },
  historyTitle: {
    fontFamily: Mulish600,
    fontSize: 14,
    color: AppColor.black,
  },
  historyMeta: {
    fontFamily: Mulish400,
    fontSize: 12,
    color: AppColor.subText,
    marginTop: 3,
  },
  historyOpenLink: {
    fontFamily: Mulish700,
    fontSize: 12,
    color: AppColor.primary,
    marginTop: 6,
  },
  emptyText: {
    fontFamily: Mulish400,
    fontSize: 13,
    color: AppColor.subText,
  },
});

export default VendorComplianceScreen;
