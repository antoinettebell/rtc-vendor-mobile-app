import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	  ActivityIndicator,
	  Alert,
	  AppState,
	  Linking,
	  Platform,
	  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DocumentPicker, { types } from "react-native-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ImagePicker from "react-native-image-crop-picker";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { RESULTS } from "react-native-permissions";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Dropdown } from "react-native-element-dropdown";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getVendorFoodTruckList_API,
  getVendorComplianceSummary_API,
  submitVendorComplianceForOcr_API,
  startVendorComplianceVerification_API,
  startVendorComplianceW9Signing_API,
  completeVendorComplianceW9Signing_API,
  uploadVendorComplianceDocument_API,
} from "../api/appAPI";
import StatusBarManager from "../components/StatusBarManager";
import usePermission from "../hooks/usePermission";
import { permission } from "../helpers/permission.helper";
import { AppColor, Mulish400, Mulish600, Mulish700 } from "../utils/theme";
import { setVendorOnboardingStep } from "../redux/slices/authSlice";
import {
  getEffectiveFoodVendorPlan,
  isTapToPaySetupEligible,
} from "../helpers/foodVendorGuidedSetup.helper";
import {
  formatDateOnly,
  parseDateOnly,
  serializeDateOnly,
} from "../helpers/dateOnly.helper";

const SCORE_FALLBACK = {
  red: "#D93025",
  yellow: "#F9AB00",
  blue: "#1A73E8",
  green: "#188038",
};

const EXPIRATION_WARNING_DAYS = 90;
const EXPIRING_DOCUMENT_TYPES = new Set([
  "BUSINESS_LICENSE",
  "COI",
  "CERTIFICATE_OF_INSURANCE",
  "LIQUOR_LICENSE",
]);
const REQUIRED_EXPIRATION_DOCUMENT_TYPES = new Set([
  "BUSINESS_LICENSE",
  "COI",
  "CERTIFICATE_OF_INSURANCE",
  "LIQUOR_LICENSE",
]);
const SANITATION_GRADE_OPTIONS = ["A", "B", "C", "D", "F"].map(
  (grade) => ({ label: grade, value: grade })
);
const w9SigningStorageKey = (foodTruckId) => `vendor-compliance-w9-envelope:${foodTruckId}`;

const parsePendingW9Signing = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value)?.envelope_id || null;
  } catch (_error) {
    // Preserve recovery for signing sessions created by the prior client,
    // which stored the envelope id as a plain string.
    return value;
  }
};

const buildJpegPickerFile = (image, fallbackPrefix) => {
  const pathName = image?.path?.split("/").pop();
  const sourceName = pathName || image?.filename || `${fallbackPrefix}-${Date.now()}.jpg`;
  return {
    uri: image?.path,
    name: sourceName.replace(/\.(heic|heif)$/i, ".jpg"),
    type:
      image?.mime === "image/heic" || image?.mime === "image/heif"
        ? "image/jpeg"
        : image?.mime || "image/jpeg",
  };
};

const formatLabel = (value = "") =>
  String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value) => formatDateOnly(value);

const formatDateForPayload = (value) => serializeDateOnly(value);

const getSelectedDateLabel = (value, isInspectionDate = false) =>
  value
    ? formatDate(value)
    : isInspectionDate
      ? "Select inspection date"
      : "Select expiration date";

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

const getOcrExpirationDate = (document = {}) => {
  const fields = document?.extracted_fields || {};
  return fields.expiration_date
    || fields.expirationDate
    || fields.expiry_date
    || fields.expiryDate
    || fields.expires_at
    || fields.expiresAt
    || null;
};

const getOcrIssueDate = (document = {}) => {
  const fields = document?.extracted_fields || {};
  return fields.issue_date
    || fields.issueDate
    || fields.issued_date
    || fields.issuedDate
    || fields.effective_date
    || fields.effectiveDate
    || fields.inspection_date
    || fields.inspectionDate
    || null;
};

const getExpiringDocumentStatus = (requirement = {}) => {
  const rawType = String(requirement.type || "").toUpperCase();
  const daysUntilExpiration = requirement.days_until_expiration;
  const reviewStatus = String(requirement.status || "").toLowerCase();
  const hasExpirationStatus =
    EXPIRING_DOCUMENT_TYPES.has(rawType) && daysUntilExpiration !== null;

  // An unexpired date is not the same as a verified compliance document.
  // Keep the server's review/OCR state visible until validation completes.
  if (reviewStatus && reviewStatus !== "verified") {
    return {
      label: formatLabel(reviewStatus),
      countdown: reviewStatus === "expired" ? "Expired" : "",
      tone: reviewStatus === "expired" ? "expired" : "neutral",
    };
  }

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

const VendorComplianceScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { user, selectedSignupAddOns } = useSelector(
    (state) => state.userReducer
  );
  const { vendorOnboardingStep } = useSelector(
    (state) => state.authReducer
  );
  const isOnboardingFlow =
    route?.params?.onboardingFlow === true ||
    vendorOnboardingStep === "COMPLIANCE";
  const isTapToPayUpgradeFlow = route?.params?.tapToPayUpgradeFlow === true;
  const isRequiredSetupFlow = isOnboardingFlow || isTapToPayUpgradeFlow;
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
  const [requestingVerification, setRequestingVerification] = useState(false);
  const [summary, setSummary] = useState(null);
  const [expirationDates, setExpirationDates] = useState({});
  const [manualSanitationGrades, setManualSanitationGrades] = useState({});
  const [documentRevisionTypes, setDocumentRevisionTypes] = useState({});
  const [uploadedRevisionTypes, setUploadedRevisionTypes] = useState({});
  const [expandedDocuments, setExpandedDocuments] = useState({});
  const [datePickerSelection, setDatePickerSelection] = useState(null);
  const [signingW9, setSigningW9] = useState(false);
  const pendingW9EnvelopeRef = useRef(null);
  const completingW9Ref = useRef(false);
  const w9RecoveryRetryRef = useRef(null);
  const w9RecoveryAttemptRef = useRef(0);
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

  const loadCompliance = useCallback(async ({ silent = false } = {}) => {
    if (!foodTruckId) return;
    if (!silent) setLoading(true);
    try {
      const summaryResponse = await getVendorComplianceSummary_API({
        foodtruck_id: foodTruckId,
      });
      setSummary(summaryResponse?.data?.compliance || null);
    } catch (error) {
      if (!silent) {
        Alert.alert("Compliance", error?.message || "Compliance details unavailable.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [foodTruckId]);

  useEffect(() => {
    loadCompliance();
  }, [loadCompliance]);

  const clearW9RecoveryRetry = useCallback(() => {
    if (w9RecoveryRetryRef.current) {
      clearTimeout(w9RecoveryRetryRef.current);
      w9RecoveryRetryRef.current = null;
    }
  }, []);

  const getPendingW9EnvelopeId = useCallback(async () => {
    if (pendingW9EnvelopeRef.current) return pendingW9EnvelopeRef.current;
    const storedValue = await AsyncStorage.getItem(w9SigningStorageKey(foodTruckId));
    const envelopeId = parsePendingW9Signing(storedValue);
    if (envelopeId) pendingW9EnvelopeRef.current = envelopeId;
    return envelopeId;
  }, [foodTruckId]);

  const completeW9Signing = useCallback(async (envelopeId, { quiet = false } = {}) => {
    if (!envelopeId || !foodTruckId || completingW9Ref.current) return false;
    completingW9Ref.current = true;
    setSigningW9(true);
    let completed = false;
    try {
      const response = await completeVendorComplianceW9Signing_API({
        foodtruck_id: foodTruckId,
        envelope_id: envelopeId,
      });
      setSummary(response?.data?.compliance || summary);
      Alert.alert(
        "W-9 Submitted",
        "Your signed W-9 was received. We will verify that its EIN or SSN matches your vendor profile."
      );
      await loadCompliance();
      completed = true;
      return true;
    } catch (error) {
      if (!quiet) {
        Alert.alert("W-9 Verification", error?.message || "We could not confirm the signed W-9 yet.");
      }
      return false;
    } finally {
      if (completed) {
        clearW9RecoveryRetry();
        w9RecoveryAttemptRef.current = 0;
        pendingW9EnvelopeRef.current = null;
        await AsyncStorage.removeItem(w9SigningStorageKey(foodTruckId));
      }
      completingW9Ref.current = false;
      setSigningW9(false);
    }
  }, [clearW9RecoveryRetry, foodTruckId, loadCompliance, summary]);

  const reconcilePendingW9 = useCallback(async ({ quiet = true } = {}) => {
    const envelopeId = await getPendingW9EnvelopeId();
    if (!envelopeId || completingW9Ref.current) return false;
    const completed = await completeW9Signing(envelopeId, { quiet });
    if (completed) return true;

    // DocuSign may return to the app milliseconds before its API reports the
    // envelope as completed. Mirror the marketplace agreement recovery flow
    // with a small, bounded retry rather than losing the signed W-9.
    const retryDelays = [1500, 4000, 8000];
    const delay = retryDelays[w9RecoveryAttemptRef.current];
    if (delay !== undefined) {
      w9RecoveryAttemptRef.current += 1;
      clearW9RecoveryRetry();
      w9RecoveryRetryRef.current = setTimeout(() => {
        reconcilePendingW9({ quiet: true }).catch(() => {});
      }, delay);
    }
    return false;
  }, [clearW9RecoveryRetry, completeW9Signing, getPendingW9EnvelopeId]);

  useEffect(() => {
    const handleUrl = async ({ url }) => {
      if (!String(url || "").includes("docusign/return")) return;
      reconcilePendingW9({ quiet: false }).catch(() => {});
    };
    const subscription = Linking.addEventListener("url", handleUrl);
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") reconcilePendingW9({ quiet: true }).catch(() => {});
    });
    // DocuSign can relaunch the app rather than resume its existing JS runtime.
    // Recover the stored envelope in that cold-start case, then also reconcile
    // an in-progress session if the browser did not deliver a deep link.
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
      else reconcilePendingW9({ quiet: true }).catch(() => {});
    });
    return () => {
      clearW9RecoveryRetry();
      subscription.remove();
      appStateSubscription.remove();
    };
  }, [clearW9RecoveryRetry, reconcilePendingW9]);

  useEffect(() => {
    const shouldRefresh = (summary?.requirements || []).some((requirement) => {
      const document = requirement?.document;
      return ["queued", "processing"].includes(document?.ocr_status);
    });
    const hasPendingProviderVerification = summary?.external_verification?.status === "PENDING";
    if (!shouldRefresh && !hasPendingProviderVerification) return undefined;
    const timer = setTimeout(() => loadCompliance({ silent: true }), 5000);
    return () => clearTimeout(timer);
  }, [loadCompliance, summary]);

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
    const isHealthPermit = requirement.type === "HEALTH_PERMIT";
    if (isHealthPermit && !selectedExpirationDate) {
      Alert.alert(
        "Inspection Date Required",
        "Please enter the inspection date shown on the document before uploading."
      );
      return;
    }
    if (REQUIRED_EXPIRATION_DOCUMENT_TYPES.has(requirement.type) && !selectedExpirationDate) {
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
    if (selectedExpirationDate && isHealthPermit) {
      payload.append("issue_date", formatDateForPayload(selectedExpirationDate));
    } else if (selectedExpirationDate) {
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
      const file = buildJpegPickerFile(image, requirement.type);

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
      const file = buildJpegPickerFile(image, requirement.type);

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

  const startW9Signing = async () => {
    if (!foodTruckId) return;
    setSigningW9(true);
    try {
      const response = await startVendorComplianceW9Signing_API({ foodtruck_id: foodTruckId });
      const data = response?.data || response || {};
      if (!data.signing_url || !data.envelope_id) {
        throw new Error("DocuSign did not provide a W-9 signing session.");
      }
      pendingW9EnvelopeRef.current = data.envelope_id;
      w9RecoveryAttemptRef.current = 0;
      await AsyncStorage.setItem(
        w9SigningStorageKey(foodTruckId),
        JSON.stringify({ envelope_id: data.envelope_id, started_at: new Date().toISOString() }),
      );
      await Linking.openURL(data.signing_url);
    } catch (error) {
      pendingW9EnvelopeRef.current = null;
      Alert.alert("W-9 Signing", error?.message || "Unable to start DocuSign.");
    } finally {
      setSigningW9(false);
    }
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
    const existingDocumentDate = requirement.type === "HEALTH_PERMIT"
      ? requirement.document?.issue_date
      : requirement.document?.expiration_date;
    if (existingDocumentDate) {
      setExpirationDates((current) => ({
        ...current,
        [requirement.type]: parseDateOnly(existingDocumentDate),
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
    setDatePickerSelection({ requirement, field: "expiration" });
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
        "Your changed documents were submitted for OCR review."
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

  const requestVerification = async () => {
    if (!foodTruckId) return;
    setRequestingVerification(true);
    try {
      const response = await startVendorComplianceVerification_API({
        foodtruck_id: foodTruckId,
      });
      setSummary(response?.data?.compliance || summary);
      await loadCompliance({ silent: true });
      Alert.alert(
        "Verification Requested",
        "Your identity verification request was submitted. The compliance status will update when the provider responds.",
      );
    } catch (error) {
      Alert.alert("Verification", error?.message || "Unable to request identity verification.");
    } finally {
      setRequestingVerification(false);
    }
  };

  const handleExpirationDateConfirm = (date) => {
    const requirementType = datePickerSelection?.requirement?.type;
    if (requirementType) {
      setExpirationDates((prev) => ({ ...prev, [requirementType]: date }));
    }
    setDatePickerSelection(null);
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
	  const coreComponents = summary?.core_components || [];
	  const cobaltChecksByType = Object.fromEntries(
	    (summary?.external_verification?.checks || []).map((check) => [check.check_type, check]),
	  );
	  const cobaltVerificationChecks = [
	    { type: "TIN", label: "EIN Verification" },
	    { type: "SOS", label: "State Verification" },
	  ].map((item) => ({ ...item, status: cobaltChecksByType[item.type]?.status || "NOT_STARTED" }));
	  const cobaltStateCanRetry = summary?.external_verification?.provider === "COBALT" && ["FAILED", "RETRYABLE_ERROR"].includes(cobaltChecksByType.SOS?.status);
	  const cobaltStateCanRefresh = summary?.external_verification?.provider === "COBALT" && cobaltChecksByType.SOS?.status === "PENDING" && Boolean(cobaltChecksByType.SOS?.provider_reference);
	  const verifiedCoreComponents = coreComponents.filter((component) => component.verified).length;
	  const incompleteCoreLabels = coreComponents
	    .filter((component) => !component.verified)
	    .map((component) => component.label)
	    .join(" • ");
	  const missingOnboardingDocuments = requirements.filter(
	    (requirement) => requirement.required && !requirement.document
	  );
	  const supportPhone = summary?.support_phone_number || "(800) 410-7053";
	  const supportPhoneDigits = String(supportPhone).replace(/\D/g, "");
	  const callSupport = () => {
	    if (!supportPhoneDigits) return;
	    Linking.openURL(`tel:${supportPhoneDigits}`).catch(() => {
	      Alert.alert("Support", `Please call ${supportPhone}.`);
	    });
	  };

  const handleBack = () => {
    if (isTapToPayUpgradeFlow) {
      navigation.goBack();
      return;
    }
    if (isOnboardingFlow) {
      dispatch(setVendorOnboardingStep("PROFILE"));
      navigation.reset({
        index: 0,
        routes: [{
          name: "authFoodTruckProfileScreen",
          params: {
            onboardingFlow: true,
            addOns: selectedSignupAddOns,
          },
        }],
      });
      return;
    }
    navigation.goBack();
  };

  const chooseDifferentPlan = () => {
    navigation.reset({
      index: 0,
      routes: [{
        name: "authFoodTruckPlansScreen",
        params: { changePlanDuringOnboarding: true },
      }],
    });
  };

  const continueToPayment = ({ skip = false } = {}) => {
    const effectivePlan = getEffectiveFoodVendorPlan({ user });
    const requiresTapToPaySetup = Platform.OS === "ios"
      && isTapToPaySetupEligible(effectivePlan);
    if (!skip && missingOnboardingDocuments.length > 0) {
      Alert.alert(
        "Complete Required Documents",
        `Please upload ${missingOnboardingDocuments
          .map((requirement) => requirement.label)
          .join(", ")} before continuing.`
      );
      return;
    }

    if (
      requiresTapToPaySetup
      && (summary?.eligible !== true || Number(summary?.score) !== 100)
    ) {
      Alert.alert(
        "Compliance Required",
        "This plan requires 100% compliance before Tap to Pay on iPhone can be activated. Complete review or choose a different plan.",
      );
      return;
    }

    const showTapToPaySetup = requiresTapToPaySetup;
    const nextStep = showTapToPaySetup ? "TAP_TO_PAY" : "PAYMENT";
    dispatch(setVendorOnboardingStep(nextStep));
    navigation.reset({
      index: 0,
      routes: [
        {
          name: showTapToPaySetup
            ? "authTapToPaySetupScreen"
            : "authFoodTruckBankDetailScreen",
          params: {
            onboardingFlow: isOnboardingFlow,
            tapToPayUpgradeFlow: isTapToPayUpgradeFlow,
          },
        },
      ],
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
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
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
              <Text style={styles.scoreValue}>{summary?.score || 0}%</Text>
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
	              {coreComponents.length ? (
	                <Text style={styles.coreComplianceText}>
	                  Core compliance: {verifiedCoreComponents}/{coreComponents.length} verified
	                  {incompleteCoreLabels ? ` · Remaining: ${incompleteCoreLabels}` : ""}
	                </Text>
	              ) : null}
            </View>
          </View>

          {summary?.external_verification?.provider === "COBALT" ? <View style={[styles.externalVerificationRow, styles.cobaltExternalVerificationRow]}>
            <Text style={styles.externalVerificationLabel}>External Verification</Text>
            <View style={styles.verificationChecks}>
              {cobaltVerificationChecks.map((check) => <View key={check.type} style={styles.verificationCheck}>
                <Ionicons name={check.status === "PASSED" ? "checkbox" : "square-outline"} size={19} color={check.status === "PASSED" ? "#176B43" : "#64748B"} />
                <Text style={styles.verificationCheckText}>{check.label}</Text>
                <Text style={styles.verificationCheckStatus}>{String(check.status).replace(/_/g, " ")}</Text>
              </View>)}
            </View>
          </View> : <View style={styles.externalVerificationRow}>
            <Text style={styles.externalVerificationLabel}>External Verification</Text>
            <View style={[
              styles.externalVerificationPill,
              summary?.external_verification?.status === "PASSED" ? styles.externalVerificationPassed
                : summary?.external_verification?.status === "PENDING" ? styles.externalVerificationPending
                  : summary?.external_verification?.status === "MANUAL_REVIEW" ? styles.externalVerificationReview
                    : summary?.external_verification?.status === "FAILED" ? styles.externalVerificationFailed
                      : styles.externalVerificationNotStarted,
            ]}>
              <Text style={styles.externalVerificationPillText}>
                {summary?.external_verification?.status === "PASSED" ? "Passed"
                  : summary?.external_verification?.status === "PENDING" ? "Pending"
                    : summary?.external_verification?.status === "MANUAL_REVIEW" ? "Manual Review"
                      : summary?.external_verification?.status === "FAILED" ? "Not Verified"
                        : "Not Started"}
              </Text>
            </View>
          </View>}

          <Text style={styles.sectionTitle}>Compliance Documents</Text>
          {requirements.map((requirement) => {
            const document = requirement.document;
		            const status = getExpiringDocumentStatus(requirement);
		            const isUploading = uploadingType === requirement.type;
            const requiresExpirationDate = EXPIRING_DOCUMENT_TYPES.has(
              requirement.type
            );
	            const isHealthPermit = requirement.type === "HEALTH_PERMIT";
	            const selectedExpirationDate = expirationDates[requirement.type];
            const displayExpirationDate = Object.prototype.hasOwnProperty.call(
              expirationDates,
              requirement.type
            )
              ? selectedExpirationDate
              : isHealthPermit
                ? document?.issue_date
                : document?.expiration_date;
            const isExpanded =
              expandedDocuments[requirement.type] ?? !document;
            const isDocumentRevision =
              !!documentRevisionTypes[requirement.type];
            const areDocumentFieldsEditable =
              !document || isDocumentRevision;
            const manualReviewUsesIssueDate =
              isHealthPermit || /OCR (issue|inspection) date/i.test(
                String(document?.ocr_error_message || "")
              );
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
	                    {isHealthPermit ? (
                        <Text style={styles.documentMeta}>
                          Inspected {formatDate(document?.issue_date)}
                        </Text>
                      ) : null}
                      {requiresExpirationDate ? (
                        <Text style={styles.documentMeta}>
                          Expires {formatDate(document?.expiration_date)}
                        </Text>
                      ) : null}
	                  {isHealthPermit &&
	                  getSanitationGradeFromDocument(document) ? (
	                    <Text style={styles.documentMeta}>
	                      Grade {String(getSanitationGradeFromDocument(document)).toUpperCase()}
	                    </Text>
	                  ) : null}
	                  {requiresExpirationDate || isHealthPermit ? (
		                      <View style={styles.expirationInputGroup}>
		                        <View style={styles.fieldLabelRow}>
		                          <Text style={styles.expirationInputLabel}>
	                            {isHealthPermit
                                ? "Inspection date on document *"
                                : REQUIRED_EXPIRATION_DOCUMENT_TYPES.has(requirement.type)
                                  ? "Expiration date on document *"
                                  : "Expiration date on document (optional)"}
		                          </Text>
                              {document ? (
                                <TouchableOpacity
                                  activeOpacity={0.7}
                                  accessibilityRole="button"
                                  accessibilityLabel={
                                    isDocumentRevision
                                      ? `Cancel ${requirement.label} replacement`
                                      : `Replace ${requirement.label} to edit ${
                                          isHealthPermit ? "inspection" : "expiration"
                                        } date`
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
	                              !displayExpirationDate &&
	                                styles.expirationDatePlaceholder,
	                            ]}
	                          >
	                            {getSelectedDateLabel(displayExpirationDate, isHealthPermit)}
	                          </Text>
	                          <Ionicons
	                            name="calendar-outline"
	                            size={18}
	                            color={AppColor.primary}
	                          />
	                        </TouchableOpacity>
	                        {!isHealthPermit &&
                              !REQUIRED_EXPIRATION_DOCUMENT_TYPES.has(requirement.type) &&
                              areDocumentFieldsEditable &&
                              displayExpirationDate ? (
                              <TouchableOpacity
                                onPress={() => setExpirationDates((current) => ({
                                  ...current,
                                  [requirement.type]: null,
                                }))}
                              >
                                <Text style={styles.supportText}>No expiration date on this license</Text>
                              </TouchableOpacity>
                            ) : null}
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
                          {document.ocr_status === "manual_review" ? (
                            <Text style={styles.ocrComparisonText}>
                              Vendor entered {formatDate(
                                manualReviewUsesIssueDate
                                  ? document.vendor_entered_issue_date || document.issue_date
                                  : document.vendor_entered_expiration_date || document.expiration_date
                              )} · OCR detected {formatDate(
                                manualReviewUsesIssueDate
                                  ? getOcrIssueDate(document)
                                  : getOcrExpirationDate(document)
                              )}
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
	                      disabled={isUploading || (requirement.type === "W9" && signingW9)}
	                      onPress={() => {
                          if (requirement.type === "W9") {
                            startW9Signing();
                            return;
                          }
                          if (document && !isDocumentRevision) {
                            startDocumentRevision(requirement);
                            return;
                          }
                          pickAndUpload(requirement);
                        }}
	                      style={styles.uploadButton}
	                    >
	                      {isUploading || (requirement.type === "W9" && signingW9) ? (
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
	                            {requirement.type === "W9"
                                  ? document ? "Replace W-9" : "Sign W-9"
                                  : document
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
	          <TouchableOpacity
	            disabled={!summary?.internal_core_compliant || requestingVerification || summary?.external_verification?.status === "PASSED" || (summary?.external_verification?.status === "PENDING" && summary?.external_verification?.provider !== "COMPLYCUBE" && !cobaltStateCanRetry && !cobaltStateCanRefresh)}
	            onPress={requestVerification}
	            style={[
	              styles.saveButton,
	              (!summary?.internal_core_compliant || requestingVerification || summary?.external_verification?.status === "PASSED" || (summary?.external_verification?.status === "PENDING" && summary?.external_verification?.provider !== "COMPLYCUBE" && !cobaltStateCanRetry && !cobaltStateCanRefresh)) && styles.disabledButton,
	            ]}
	          >
	            {requestingVerification ? (
	              <ActivityIndicator size="small" color={AppColor.white} />
	            ) : (
	              <Text style={styles.saveButtonText}>
	                {summary?.external_verification?.status === "PENDING"
	                  ? cobaltStateCanRetry ? "Retry State Verification" : cobaltStateCanRefresh ? "Check State Verification Status" : summary?.external_verification?.provider === "COMPLYCUBE" ? "Check Verification Status" : "Verification Pending"
	                  : summary?.external_verification?.status === "PASSED"
	                    ? "Verification Complete"
	                    : "Verification"}
	              </Text>
	            )}
	          </TouchableOpacity>
          {isRequiredSetupFlow ? (
            <>
              <TouchableOpacity onPress={continueToPayment} style={styles.onboardingContinueButton}>
                <Text style={styles.onboardingContinueButtonText}>
                  {Platform.OS === "ios"
                    && isTapToPaySetupEligible(getEffectiveFoodVendorPlan({ user }))
                    ? "Next: Set Up Tap to Pay"
                    : "Next: Payment Details"}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={AppColor.white} />
              </TouchableOpacity>
              {isOnboardingFlow && (Platform.OS !== "ios"
                || !isTapToPaySetupEligible(getEffectiveFoodVendorPlan({ user }))) ? (
                <TouchableOpacity onPress={() => continueToPayment({ skip: true })} style={styles.onboardingSkipButton}>
                  <Text style={styles.onboardingSkipButtonText}>Skip</Text>
                </TouchableOpacity>
              ) : isOnboardingFlow ? (
                <TouchableOpacity onPress={chooseDifferentPlan} style={styles.onboardingSkipButton}>
                  <Text style={styles.onboardingSkipButtonText}>Choose a Different Plan</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}
	          <DateTimePickerModal
            isVisible={!!datePickerSelection}
            mode="date"
            minimumDate={
              datePickerSelection?.field === "issue" ||
              datePickerSelection?.requirement?.type === "HEALTH_PERMIT"
                ? undefined
                : new Date()
            }
            maximumDate={
              datePickerSelection?.field === "issue" ||
              datePickerSelection?.requirement?.type === "HEALTH_PERMIT"
                ? new Date()
                : undefined
            }
            date={
              expirationDates[datePickerSelection?.requirement?.type] || new Date()
            }
            onConfirm={handleExpirationDateConfirm}
            onCancel={() => setDatePickerSelection(null)}
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
    fontSize: 16,
    color: AppColor.white,
  },
  scoreTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  externalVerificationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e6ea",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 18,
  },
  cobaltExternalVerificationRow: {
    alignItems: "stretch",
    flexDirection: "column",
    gap: 10,
  },
  verificationChecks: {
    gap: 8,
  },
  verificationCheck: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  verificationCheckText: {
    color: AppColor.black,
    flex: 1,
    fontFamily: Mulish700,
    fontSize: 13,
  },
  verificationCheckStatus: {
    color: AppColor.subText,
    fontFamily: Mulish400,
    fontSize: 12,
  },
  externalVerificationLabel: {
    fontFamily: Mulish700,
    fontSize: 14,
    color: AppColor.black,
  },
  externalVerificationPill: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  externalVerificationPillText: {
    fontFamily: Mulish700,
    fontSize: 12,
    color: AppColor.white,
  },
  externalVerificationPassed: { backgroundColor: "#176B43" },
  externalVerificationPending: { backgroundColor: "#B77900" },
  externalVerificationReview: { backgroundColor: "#B77900" },
  externalVerificationFailed: { backgroundColor: "#C53030" },
  externalVerificationNotStarted: { backgroundColor: "#64748B" },
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
  coreComplianceText: {
    fontFamily: Mulish400,
    fontSize: 12,
    color: AppColor.subText,
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
  ocrComparisonText: {
    fontFamily: Mulish400,
    fontSize: 11,
    color: AppColor.subText,
    lineHeight: 15,
    marginTop: 4,
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
  onboardingContinueButton: {
    height: 48,
    borderRadius: 8,
    backgroundColor: AppColor.primary,
    marginBottom: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  onboardingContinueButtonText: {
    fontFamily: Mulish700,
    fontSize: 15,
    color: AppColor.white,
  },
  onboardingSkipButton: { alignItems: "center", paddingVertical: 14 },
  onboardingSkipButtonText: { color: AppColor.primary, fontFamily: Mulish700, fontSize: 15 },
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
