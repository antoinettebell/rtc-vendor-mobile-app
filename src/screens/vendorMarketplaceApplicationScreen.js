import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ImagePicker from "react-native-image-crop-picker";
import { RESULTS } from "react-native-permissions";
import DocumentPicker, { types } from "react-native-document-picker";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor } from "../utils/theme";
import {
  getMarketplaceEventById_API,
  getVendorComplianceSummary_API,
  deleteMarketplaceApplicationAttachment_API,
  submitMarketplaceApplication_API,
  uploadMarketplaceApplicationAttachment_API,
} from "../api/appAPI";
import { useMarketplaceAgreementCompletion } from "../hooks/useMarketplaceAgreementCompletion";
import { getFoodVendorMarketplaceCompletionReset } from "../helpers/marketplaceAgreementCompletion.helper";
import usePermission from "../hooks/usePermission";
import { permission } from "../helpers/permission.helper";
import {
  MarketplaceHeader,
  formatDate,
  formatEventDeadlineDate,
  formatDuration,
  formatMoney,
  formatTimeRange,
  getEventLocation,
  getMarketplaceNotesError,
  getMarketplaceRequirementLabels,
  getVerifiedComplianceRequirementFiles,
  isApplicationRevisionRequested,
  normalizeMarketplaceRequirementLabel,
  styles,
} from "./vendorMarketplaceShared";
import { getApplicationActionAvailability } from "../helpers/marketplaceBidEligibility.helper";
import {
  getFoodVendorMarketplaceCloseDate,
  getFoodVendorMarketplaceGuestRows,
} from "../helpers/foodVendorMarketplaceGuestCounts.helper";

const ReadOnlyRow = ({ label, value }) => (
  <View style={{ marginTop: 12 }}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.meta}>{value || "None"}</Text>
  </View>
);
const boolText = (value) =>
  value === true ? "Yes" : value === false ? "No" : "Not answered";

const PRE_AWARD_EDIT_STATUSES = ["SUBMITTED", "UNDER_REVIEW"];

const hasPendingApplicationUploads = (menuPdf, foodPhotos) =>
  !!menuPdf || foodPhotos.length > 0;

const isAlreadySubmittedError = (error) =>
  String(error?.message || error || "")
    .toLowerCase()
    .includes("already submitted");

const getPickedImageName = (image, fallbackPrefix = "photo") => {
  const pathName = image?.path?.split("/").pop();
  const sourceName =
    image?.filename || pathName || `${fallbackPrefix}-${Date.now()}`;
  return sourceName.replace(/\.(heic|heif)$/i, ".jpg");
};

const buildPickedImageFile = (image, fallbackPrefix = "photo") => ({
  uri: image?.path,
  name: getPickedImageName(image, fallbackPrefix),
  type:
    image?.mime === "image/heic" || image?.mime === "image/heif"
      ? "image/jpeg"
      : image?.mime || "image/jpeg",
  size: image?.size,
});

const normalizePickedDocumentFile = (file, fallbackName) => {
  const name = file?.name || fallbackName;
  const extension = String(name || "").split(".").pop()?.toLowerCase();
  const typeByExtension = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    heic: "image/heic",
    heif: "image/heif",
  };
  return {
    uri: file?.uri,
    name,
    type: typeByExtension[extension] || file?.type || "application/octet-stream",
    size: file?.size,
  };
};

const buildSavedAttachment = ({
  attachmentType,
  fileUrl,
  fileKey = null,
  originalName,
}) => ({
  attachment_id: fileKey || fileUrl,
  attachment_type: attachmentType,
  file_url: fileUrl,
  file_key: fileKey,
  original_name: originalName,
});

const getInitialApplicationAttachments = (application, attachmentType) =>
  Array.isArray(application?.attachments)
    ? application.attachments.filter(
        (item) => item.attachment_type === attachmentType,
      )
    : [];

const getInitialApplicationMenuFiles = (application) => {
  const files = getInitialApplicationAttachments(
    application,
    "APPLICATION_MENU_PDF",
  );
  if (!files.length && application?.menu_pdf_url) {
    return [
      buildSavedAttachment({
        attachmentType: "APPLICATION_MENU_PDF",
        fileUrl: application.menu_pdf_url,
        fileKey: application.menu_pdf_key,
        originalName: "Saved menu",
      }),
    ];
  }
  return files;
};

const getInitialApplicationImageFiles = (application) => {
  const files = getInitialApplicationAttachments(
    application,
    "APPLICATION_IMAGE",
  );
  if (!files.length && Array.isArray(application?.image_urls)) {
    return application.image_urls.map((url, index) =>
      buildSavedAttachment({
        attachmentType: "APPLICATION_IMAGE",
        fileUrl: url,
        fileKey: application.image_keys?.[index],
        originalName: `Saved food photo ${index + 1}`,
      }),
    );
  }
  return files;
};

const FormField = ({ label, children, full = false }) => (
  <View style={[styles.formGridField, full && styles.formGridFieldFull]}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
  </View>
);

const foodTruckCuisineText = (foodTruck = {}) =>
  Array.isArray(foodTruck?.cuisine)
    ? foodTruck.cuisine.map((item) => item?.name || item).filter(Boolean).join(", ")
    : "";

const VendorMarketplaceApplicationScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const user = useSelector((state) => state.userReducer.user);
  const foodTruck = user?.foodTruck || {};
  const initialApplication = route?.params?.application || null;
  const initialEvent =
    route?.params?.event ||
    initialApplication?.marketplaceEvent ||
    initialApplication?.event ||
    null;
  const eventId =
    route?.params?.eventId || initialApplication?.event_id || initialEvent?.event_id;
  const defaultCuisineText = foodTruckCuisineText(foodTruck);
  const initialDraft = {
    businessName: initialApplication?.business_name || foodTruck?.name || "",
    foodTypeCuisine:
      initialApplication?.food_type_cuisine || defaultCuisineText,
    menuDescription: initialApplication?.menu_description || "",
    notes: initialApplication?.notes || "",
  };
  const [event, setEvent] = useState(initialEvent);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [businessName, setBusinessName] = useState(initialDraft.businessName);
  const [foodTypeCuisine, setFoodTypeCuisine] = useState(
    initialDraft.foodTypeCuisine,
  );
  const [menuDescription, setMenuDescription] = useState(
    initialDraft.menuDescription,
  );
  const [notes, setNotes] = useState(initialDraft.notes);
  const [savedApplication, setSavedApplication] = useState(
    initialApplication,
  );
  const initialApplicationStatus = String(
    initialApplication?.application_status || "",
  ).toUpperCase();
  const isRevisionMode = isApplicationRevisionRequested(initialApplication);
  const isPreAwardEditMode =
    PRE_AWARD_EDIT_STATUSES.includes(initialApplicationStatus) &&
    !isRevisionMode;
  const submittedApplicationStatus =
    initialApplicationStatus === "UNDER_REVIEW" ? "UNDER_REVIEW" : "SUBMITTED";
  const [requirementFiles, setRequirementFiles] = useState(
    route?.params?.application?.attachments?.filter(
      (item) => item.attachment_type === "REQUIREMENT_DOCUMENT",
    ) || [],
  );
  const [uploadedMenuFiles, setUploadedMenuFiles] = useState(() =>
    getInitialApplicationMenuFiles(route?.params?.application),
  );
  const [uploadedFoodPhotoFiles, setUploadedFoodPhotoFiles] = useState(() =>
    getInitialApplicationImageFiles(route?.params?.application),
  );
  const [selectedRequirementLabel, setSelectedRequirementLabel] = useState(
    "",
  );
  const [menuPdf, setMenuPdf] = useState(null);
  const [foodPhotos, setFoodPhotos] = useState([]);
  const isLeavingRef = useRef(false);
  const savedApplicationRef = useRef(initialApplication);
  const initialDraftRef = useRef(initialDraft);
  const { checkAndRequestPermission: photosPermissionStatus } = usePermission(
    permission.photos
  );
  const { checkAndRequestPermission: cameraPermissionStatus } = usePermission(
    permission.camera
  );

  const loadEvent = async () => {
    if (!eventId || event) return;
    setLoading(true);
    try {
      const response = await getMarketplaceEventById_API(eventId);
      if (response?.success) {
        setEvent(response.data?.marketplaceEvent);
      }
    } catch (error) {
      console.log("Marketplace application event error", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEvent();
    }, [eventId]),
  );

  const requiredRequirementLabels = useMemo(() => {
    return getMarketplaceRequirementLabels(event);
  }, [event]);
  const requiredPermitLabels = useMemo(
    () =>
      requiredRequirementLabels.filter(
        (label) => label !== "Insurance" && label !== "Liquor License",
      ),
    [requiredRequirementLabels],
  );
  const notesError = useMemo(() => getMarketplaceNotesError(notes), [notes]);
  const uploadedRequirementLabels = useMemo(
    () =>
      new Set(
        requirementFiles
          .map((file) =>
            normalizeMarketplaceRequirementLabel(file.requirement_label),
          )
          .filter(Boolean),
      ),
    [requirementFiles],
  );
  const requirementsSatisfied = requiredRequirementLabels.every((label) =>
    uploadedRequirementLabels.has(label),
  );

  const applyProfileRequirementFiles = useCallback(
    (profileFiles = []) => {
      if (!profileFiles.length) return;
      setRequirementFiles((prev) => {
        const labelsAlreadySelected = new Set(
          prev
            .map((file) => normalizeMarketplaceRequirementLabel(file.requirement_label))
            .filter(Boolean),
        );
        const missingProfileFiles = profileFiles.filter((file) => {
          const label = normalizeMarketplaceRequirementLabel(file.requirement_label);
          return label && !labelsAlreadySelected.has(label);
        });
        return missingProfileFiles.length ? [...prev, ...missingProfileFiles] : prev;
      });
    },
    [],
  );

  const loadProfileRequirementFiles = useCallback(async () => {
    try {
      const response = await getVendorComplianceSummary_API({
        foodtruck_id: foodTruck._id,
      });
      if (response?.success) {
        applyProfileRequirementFiles(
          getVerifiedComplianceRequirementFiles(
            response.data?.compliance,
            requiredRequirementLabels,
          ),
        );
      }
    } catch (error) {
      console.log("Marketplace profile requirement docs error", error);
    }
  }, [
    applyProfileRequirementFiles,
    foodTruck?._id,
    requiredRequirementLabels,
  ]);

  const missingRequirementLabels = requiredRequirementLabels.filter(
    (label) => !uploadedRequirementLabels.has(label),
  );
  const {
    canSaveDraft,
    canSubmit,
    reasons: applicationBlockingReasons,
  } = getApplicationActionAvailability({
    eventId,
    notesError,
    businessName,
    foodTypeCuisine,
    missingRequirementLabels,
  });
  const hasUnsavedDraftContent = useMemo(() => {
    const initial = initialDraftRef.current;
    return (
      businessName !== initial.businessName ||
      foodTypeCuisine !== initial.foodTypeCuisine ||
      menuDescription !== initial.menuDescription ||
      notes !== initial.notes ||
      !!menuPdf ||
      foodPhotos.length > 0
    );
  }, [
    businessName,
    foodPhotos.length,
    foodTypeCuisine,
    menuDescription,
    menuPdf,
    notes,
  ]);

  const buildApplicationPayload = (applicationStatus) => ({
    business_name: businessName.trim(),
    food_type_cuisine: foodTypeCuisine.trim(),
    menu_description: menuDescription.trim(),
    notes: notes.trim(),
    insurance_confirmed: uploadedRequirementLabels.has("Insurance"),
    permits_confirmed:
      requiredPermitLabels.length > 0
        ? requiredPermitLabels.every((label) => uploadedRequirementLabels.has(label))
        : false,
    liquor_license_confirmed: uploadedRequirementLabels.has("Liquor License"),
    nda_required: true,
    nda_acknowledged: applicationStatus !== "DRAFT",
    application_status: applicationStatus,
  });

  useEffect(() => {
    if (!requiredRequirementLabels.length) {
      setSelectedRequirementLabel("");
      return;
    }
    if (!requiredRequirementLabels.includes(selectedRequirementLabel)) {
      setSelectedRequirementLabel(requiredRequirementLabels[0]);
    }
  }, [requiredRequirementLabels, selectedRequirementLabel]);

  useEffect(() => {
    loadProfileRequirementFiles();
  }, [loadProfileRequirementFiles]);

  const saveApplicationDraft = async (applicationStatus = "DRAFT") => {
    if (notesError) {
      Alert.alert("Notes Not Allowed", notesError);
      return null;
    }
    if (!canSaveDraft) {
      Alert.alert("Draft Not Saved", "Fix the highlighted fields before saving.");
      return null;
    }

    const response = await submitMarketplaceApplication_API({
      event_id: eventId,
      payload: buildApplicationPayload(applicationStatus),
    });
    if (response?.success) {
      const marketplaceApplication =
        response.data?.marketplaceApplication || null;
      setSavedApplication(marketplaceApplication);
      savedApplicationRef.current = marketplaceApplication;
      initialDraftRef.current = {
        businessName,
        foodTypeCuisine,
        menuDescription,
        notes,
      };
      return marketplaceApplication;
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (isLeavingRef.current || submitting || !hasUnsavedDraftContent) return;

      event.preventDefault();
      const leaveScreen = () => {
        isLeavingRef.current = true;
        navigation.dispatch(event.data.action);
      };
      const actions = [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave Without Saving",
          style: "destructive",
          onPress: leaveScreen,
        },
      ];

      if (canSaveDraft) {
        actions.push({
          text: "Save Draft",
          onPress: async () => {
            const draft = await saveApplicationDraftWithFiles({ notify: false });
            if (draft?.application_id) leaveScreen();
          },
        });
      }

      Alert.alert(
        "Save Draft?",
        "Save this application before leaving the screen?",
        actions,
      );
    });

    return unsubscribe;
  }, [
    canSaveDraft,
    hasUnsavedDraftContent,
    navigation,
    saveApplicationDraftWithFiles,
    submitting,
  ]);

  const uploadApplicationFile = async (
    applicationId,
    file,
    attachmentType,
    requirementLabel = null,
  ) => {
    const formData = new FormData();
    formData.append("attachment_type", attachmentType);
    if (requirementLabel) {
      formData.append("requirement_label", requirementLabel);
    }
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    });
    return uploadMarketplaceApplicationAttachment_API({
      application_id: applicationId,
      payload: formData,
    });
  };

  const uploadApplicationFiles = async (applicationId) => {
    const uploadedMenus = [];
    const uploadedImages = [];

    if (menuPdf) {
      const response = await uploadApplicationFile(
        applicationId,
        menuPdf,
        "APPLICATION_MENU_PDF",
      );
      const attachment = response?.data?.marketplaceAttachment;
      if (attachment) uploadedMenus.push(attachment);
    }
    for (const image of foodPhotos) {
      const response = await uploadApplicationFile(
        applicationId,
        image,
        "APPLICATION_IMAGE",
      );
      const attachment = response?.data?.marketplaceAttachment;
      if (attachment) uploadedImages.push(attachment);
    }

    if (uploadedMenus.length) {
      setUploadedMenuFiles(uploadedMenus);
      setMenuPdf(null);
    }
    if (uploadedImages.length) {
      setUploadedFoodPhotoFiles((prev) => [...prev, ...uploadedImages]);
      setFoodPhotos([]);
    }
  };

  const uploadPendingApplicationFiles = async () => {
    if (!hasPendingApplicationUploads(menuPdf, foodPhotos)) return;

    const applicationId =
      savedApplicationRef.current?.application_id ||
      savedApplication?.application_id;

    if (!applicationId) {
      throw new Error("Unable to upload files before submitting.");
    }

    await uploadApplicationFiles(applicationId);
  };

  async function saveApplicationDraftWithFiles({ notify = true } = {}) {
    if (submitting) return null;
    setSubmitting(true);
    try {
      const draft = await saveApplicationDraft("DRAFT");
      if (draft?.application_id) {
        await uploadApplicationFiles(draft.application_id);
        if (notify) {
          Alert.alert("Draft Saved", "Your application draft has been saved.");
        }
      }
      return draft;
    } catch (error) {
      Alert.alert("Draft Not Saved", error?.message || "Please try again.");
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  const finalizeApplicationSubmission = async () => {
    await uploadPendingApplicationFiles();

    const response = await submitMarketplaceApplication_API({
      event_id: eventId,
      payload: buildApplicationPayload(submittedApplicationStatus),
    });

    if (response?.success) {
      const marketplaceApplication =
        response.data?.marketplaceApplication || savedApplicationRef.current;
      setSavedApplication(marketplaceApplication);
      savedApplicationRef.current = marketplaceApplication;
      Alert.alert(
        isPreAwardEditMode ? "Application Updated" : "Application Submitted",
        isPreAwardEditMode
          ? "Your application has been updated."
          : "Your application has been submitted.",
        [
        {
          text: "OK",
            onPress: () => {
              isLeavingRef.current = true;
              navigation.reset(getFoodVendorMarketplaceCompletionReset());
            },
          },
        ],
      );
    }
  };

  const { beginSigning: beginAgreementSigning } =
    useMarketplaceAgreementCompletion({
      enabled: !!eventId && !!savedApplication?.application_id,
      getSigningPayload: () => ({
        event_id: eventId,
        application_id: savedApplicationRef.current?.application_id,
        return_url: "rounddacornervendor://docusign/return?status=completed",
      }),
      finalizeSubmission: finalizeApplicationSubmission,
      submissionLabel: "Application",
      recoveryStorageKey: `docusign-recovery:application:${eventId}`,
    });

  const submitApplication = async () => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    try {
      if (isRevisionMode || isPreAwardEditMode) {
        await finalizeApplicationSubmission();
        return;
      }

      const draft = await saveApplicationDraft("PENDING_SIGNATURE");
      if (!draft?.application_id) {
        throw new Error("Unable to save application draft before signing.");
      }
      await beginAgreementSigning();
    } catch (error) {
      if (isAlreadySubmittedError(error)) {
        Alert.alert(
          "Application Already Submitted",
          error?.message || "Your application is already on file for this event.",
        );
        return;
      }

      Alert.alert(
        "Application Not Submitted",
        error?.message || "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const setSelectedMenuFile = (file) => {
    if (!file?.uri) return;
    setMenuPdf({
      uri: file.uri,
      name: file.name || "menu-upload",
      type: file.type || "application/octet-stream",
      size: file.size,
    });
  };

  const chooseMenuFile = async () => {
    try {
      const [file] = await DocumentPicker.pick({ type: [types.pdf, types.images] });
      if (file) {
        setSelectedMenuFile(normalizePickedDocumentFile(file, "menu-upload"));
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert("PDF Not Selected", error?.message || "Please try again.");
      }
    }
  };

  const chooseMenuPhoto = async () => {
    try {
      const photosStatus = await photosPermissionStatus();
      if (
        photosStatus !== RESULTS.GRANTED &&
        photosStatus !== RESULTS.LIMITED
      ) {
        return;
      }
      const image = await ImagePicker.openPicker({
        mediaType: "photo",
        forceJpg: true,
      });
      setSelectedMenuFile(buildPickedImageFile(image, "menu"));
    } catch (error) {
      if (error?.code !== "E_PICKER_CANCELLED") {
        Alert.alert("Photo Not Selected", error?.message || "Please try again.");
      }
    }
  };

  const takeMenuPhoto = async () => {
    try {
      const cameraStatus = await cameraPermissionStatus();
      if (cameraStatus !== RESULTS.GRANTED) return;
      const image = await ImagePicker.openCamera({
        cropping: false,
        mediaType: "photo",
        forceJpg: true,
      });
      setSelectedMenuFile(buildPickedImageFile(image, "menu"));
    } catch (error) {
      if (error?.code !== "E_PICKER_CANCELLED") {
        Alert.alert("Photo Not Taken", error?.message || "Please try again.");
      }
    }
  };

  const pickMenuPdf = () => {
    Alert.alert("Sample Menu", "Choose how to add your sample menu.", [
      { text: "Take Photo", onPress: takeMenuPhoto },
      { text: "Choose Photo", onPress: chooseMenuPhoto },
      { text: "Choose File or PDF", onPress: chooseMenuFile },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const uploadSelectedRequirementFile = async (file) => {
    const draft =
      savedApplication?.application_id ||
      (await saveApplicationDraft("DRAFT"))?.application_id;
    if (!draft || !file) return;
    const uploadResponse = await uploadApplicationFile(
      draft,
      file,
      "REQUIREMENT_DOCUMENT",
      selectedRequirementLabel,
    );
    if (uploadResponse?.data?.marketplaceAttachment) {
      setRequirementFiles((prev) => [
        ...prev.filter(
          (item) =>
            normalizeMarketplaceRequirementLabel(item.requirement_label) !==
            normalizeMarketplaceRequirementLabel(selectedRequirementLabel),
        ),
        uploadResponse.data.marketplaceAttachment,
      ]);
    }
  };

  const chooseRequirementFile = async () => {
    try {
      const [file] = await DocumentPicker.pick({
        type: [types.pdf, types.images],
      });
      if (file) {
        await uploadSelectedRequirementFile(
          normalizePickedDocumentFile(
            file,
            `${selectedRequirementLabel}.pdf`,
          ),
        );
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert("File Not Selected", error?.message || "Please try again.");
      }
    }
  };

  const chooseRequirementPhoto = async () => {
    try {
      const photosStatus = await photosPermissionStatus();
      if (
        photosStatus !== RESULTS.GRANTED &&
        photosStatus !== RESULTS.LIMITED
      ) {
        return;
      }
      const image = await ImagePicker.openPicker({
        mediaType: "photo",
        forceJpg: true,
      });
      await uploadSelectedRequirementFile(
        buildPickedImageFile(image, selectedRequirementLabel),
      );
    } catch (error) {
      if (error?.code !== "E_PICKER_CANCELLED") {
        Alert.alert("Photo Not Selected", error?.message || "Please try again.");
      }
    }
  };

  const takeRequirementPhoto = async () => {
    try {
      const cameraStatus = await cameraPermissionStatus();
      if (cameraStatus !== RESULTS.GRANTED) return;
      const image = await ImagePicker.openCamera({
        cropping: false,
        mediaType: "photo",
        forceJpg: true,
      });
      await uploadSelectedRequirementFile(
        buildPickedImageFile(image, selectedRequirementLabel),
      );
    } catch (error) {
      if (error?.code !== "E_PICKER_CANCELLED") {
        Alert.alert("Photo Not Taken", error?.message || "Please try again.");
      }
    }
  };

  const pickRequirementFile = () => {
    if (!selectedRequirementLabel) return;
    Alert.alert(`Upload ${selectedRequirementLabel}`, "Choose how to add the document.", [
      { text: "Take Photo", onPress: takeRequirementPhoto },
      { text: "Choose Photo", onPress: chooseRequirementPhoto },
      { text: "Choose File or PDF", onPress: chooseRequirementFile },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removeRequirementFile = async (file) => {
    try {
      if (
        savedApplication?.application_id &&
        file?.attachment_id &&
        !file?.from_profile_compliance
      ) {
        await deleteMarketplaceApplicationAttachment_API({
          application_id: savedApplication.application_id,
          attachment_id: file.attachment_id,
        });
      }
      setRequirementFiles((prev) =>
        prev.filter((item) => item.attachment_id !== file.attachment_id),
      );
    } catch (error) {
      Alert.alert("File Not Removed", error?.message || "Please try again.");
    }
  };

  const pickFoodPhotos = async () => {
    try {
      if (Platform.OS === "ios") {
        const photosStatus = await photosPermissionStatus();
        if (
          photosStatus !== RESULTS.GRANTED &&
          photosStatus !== RESULTS.LIMITED
        ) {
          return;
        }
      }

      const images = await ImagePicker.openPicker({
        multiple: true,
        mediaType: "photo",
        forceJpg: true,
      });
      setFoodPhotos((prev) => [
        ...prev,
        ...images.map((image) => buildPickedImageFile(image, "food-photo")),
      ]);
    } catch (error) {
      if (error?.code !== "E_PICKER_CANCELLED") {
        Alert.alert("Images Not Selected", error?.message || "Please try again.");
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <MarketplaceHeader title="Vendor Application" navigation={navigation} />
      {loading && !event ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={AppColor.primary} size="large" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={styles.body}>
            <View style={[styles.card, styles.feeSummaryCard]}>
              <Text style={styles.sectionHeader}>Event Summary</Text>
              <Text style={styles.title}>
                {event?.event_name || "Vendor Application"}
              </Text>
              <ReadOnlyRow label="Event Type" value={event?.event_type} />
              <ReadOnlyRow label="Event Date" value={formatDate(event?.event_date)} />
              <ReadOnlyRow label="Event Time" value={formatTimeRange(event?.event_time)} />
              <ReadOnlyRow label="Duration" value={formatDuration(event)} />
              <ReadOnlyRow label="Location" value={getEventLocation(event)} />
              {getFoodVendorMarketplaceGuestRows({
                event,
                participationPath: "APPLICATION",
              }).map((row) => (
                <ReadOnlyRow key={row.label} label={row.label} value={row.value} />
              ))}
              <ReadOnlyRow
                label="Application/Bid Deadline"
                value={formatEventDeadlineDate(getFoodVendorMarketplaceCloseDate(event), event)}
              />
              <ReadOnlyRow
                label="Free Food Offered"
                value={boolText(event?.free_food_offered)}
              />
              {event?.free_food_offered === true ? (
                <>
                  <ReadOnlyRow
                    label="Free Food Provider"
                    value={event?.free_food_provider || "Not set"}
                  />
                  <ReadOnlyRow
                    label="Vendors Must Give Away Food"
                    value={boolText(event?.vendors_required_to_giveaway_food)}
                  />
                </>
              ) : null}
            </View>

            <View style={[styles.card, styles.feeSummaryCard]}>
              <Text style={styles.title}>Vendor Fee</Text>
              <ReadOnlyRow label="Vendor Fee" value={formatMoney(event?.vendor_fee)} />
              <Text style={styles.meta}>Set by Event Coordinator</Text>
              <Text style={styles.meta}>Payment required only if accepted.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Business Details</Text>
              <View style={styles.formGrid}>
                <FormField label="Business Name *">
                  <TextInput
                    value={businessName}
                    onChangeText={setBusinessName}
                    style={styles.input}
                  />
                </FormField>
                <FormField label="Food Type / Cuisine *" full>
                  <TextInput
                    value={foodTypeCuisine}
                    onChangeText={setFoodTypeCuisine}
                    style={styles.input}
                  />
                </FormField>
                <FormField label="Menu Description" full>
                  <TextInput
                    value={menuDescription}
                    onChangeText={setMenuDescription}
                    multiline
                    placeholder="Describe what you would serve at this event."
                    placeholderTextColor={AppColor.placeholderTextColor}
                    style={[styles.input, styles.textarea]}
                  />
                </FormField>
                <FormField label="Special Notes to Event Coordinator" full>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    placeholder="Optional notes for the event coordinator."
                    placeholderTextColor={AppColor.placeholderTextColor}
                    style={[styles.input, styles.textarea]}
                  />
                </FormField>
              </View>
              {!!notesError && <Text style={styles.errorText}>{notesError}</Text>}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Requirements</Text>
              <View style={[styles.row, { flexWrap: "wrap", gap: 8 }]}>
                {requiredRequirementLabels.map((label) => (
                  <TouchableOpacity
                    key={label}
                    activeOpacity={0.7}
                    style={[
                      styles.secondaryButton,
                      {
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                        marginTop: 8,
                        borderColor:
                          selectedRequirementLabel === label
                            ? AppColor.primary
                            : AppColor.border,
                      },
                    ]}
                    onPress={() => setSelectedRequirementLabel(label)}
                    disabled={submitting}
                  >
                    <Text style={styles.secondaryButtonText}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {!requiredRequirementLabels.length ? (
                <Text style={styles.meta}>No document uploads required.</Text>
              ) : null}
              {requirementFiles.map((file) => (
                <View
                  key={file.attachment_id || file.file_url}
                  style={[styles.row, { alignItems: "center", marginTop: 10 }]}
                >
                  <Text style={[styles.meta, styles.flex]} numberOfLines={1}>
                    {file.requirement_label || "Requirement"}:{" "}
                    {file.original_name || file.name || "Uploaded file"}
                    {file.from_profile_compliance ? " (Profile document)" : ""}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => removeRequirementFile(file)}
                    disabled={submitting}
                  >
                    <Text style={styles.secondaryButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {requiredRequirementLabels.length ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.secondaryButton, { marginTop: 12 }]}
                  onPress={pickRequirementFile}
                  disabled={submitting || !canSaveDraft}
                >
                  <Text style={styles.secondaryButtonText}>
                    Upload {selectedRequirementLabel}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <Text style={styles.meta}>
                Governance and NDA agreements are signed through DocuSign when
                you submit.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Menu / Photos</Text>
              <Text style={styles.label}>Sample Menu Upload</Text>
              {uploadedMenuFiles.map((file) => (
                <Text
                  key={file.attachment_id || file.file_url}
                  style={styles.meta}
                  numberOfLines={1}
                >
                  {file.original_name || "Saved menu"}
                </Text>
              ))}
              {menuPdf ? <Text style={styles.meta}>{menuPdf.name}</Text> : null}
              <TouchableOpacity activeOpacity={0.7} style={[styles.secondaryButton, { marginTop: 10 }]} onPress={pickMenuPdf} disabled={submitting}>
                <Text style={styles.secondaryButtonText}>Choose Sample Menu</Text>
              </TouchableOpacity>
              <Text style={styles.label}>Food Photos Upload</Text>
              {uploadedFoodPhotoFiles.map((file) => (
                <Text
                  key={file.attachment_id || file.file_url}
                  style={styles.meta}
                  numberOfLines={1}
                >
                  {file.original_name || "Saved food photo"}
                </Text>
              ))}
              {foodPhotos.map((image, index) => (
                <Text key={`${image.uri}-${index}`} style={styles.meta} numberOfLines={1}>{image.name}</Text>
              ))}
              <TouchableOpacity activeOpacity={0.7} style={[styles.secondaryButton, { marginTop: 10 }]} onPress={pickFoodPhotos} disabled={submitting}>
                <Text style={styles.secondaryButtonText}>Add Food Photos</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.meta, { textAlign: "center", marginBottom: 14 }]}>
              Payment is not required now. If accepted, you will receive a notification to pay the vendor fee.
            </Text>

            {!isRevisionMode ? (
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.secondaryButton, { marginBottom: 12 }]}
                disabled={!canSaveDraft || submitting}
                onPress={() => saveApplicationDraftWithFiles()}
              >
                <Text style={styles.secondaryButtonText}>Save Draft</Text>
              </TouchableOpacity>
            ) : null}

            {!canSubmit && applicationBlockingReasons.length ? (
              <View style={styles.card}>
                <Text style={styles.sectionHeader}>Complete before submitting</Text>
                {applicationBlockingReasons.map((reason) => (
                  <Text key={reason} style={styles.meta}>• {reason}</Text>
                ))}
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.button, (!canSubmit || submitting) && styles.buttonDisabled]}
              disabled={!canSubmit || submitting}
              onPress={submitApplication}
            >
              {submitting ? (
                <ActivityIndicator color={AppColor.white} />
              ) : (
                <Text style={styles.buttonText}>
                  {isRevisionMode
                    ? "Submit Revised Application"
                    : "Submit Application"}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

export default VendorMarketplaceApplicationScreen;
