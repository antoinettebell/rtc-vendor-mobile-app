import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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
  returnMarketplaceVendorAgreement_API,
  startMarketplaceVendorAgreementSigning_API,
  submitMarketplaceApplication_API,
  uploadMarketplaceApplicationAttachment_API,
} from "../api/appAPI";
import usePermission from "../hooks/usePermission";
import { permission } from "../helpers/permission.helper";
import {
  MarketplaceHeader,
  formatDate,
  formatDuration,
  formatMoney,
  getEventLocation,
  getMarketplaceNotesError,
  getMarketplaceRequirementLabels,
  getVerifiedComplianceRequirementFiles,
  isApplicationRevisionRequested,
  normalizeMarketplaceRequirementLabel,
  styles,
} from "./vendorMarketplaceShared";

const ReadOnlyRow = ({ label, value }) => (
  <View style={{ marginTop: 12 }}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.meta}>{value || "None"}</Text>
  </View>
);
const boolText = (value) =>
  value === true ? "Yes" : value === false ? "No" : "Not answered";

const FormField = ({ label, children, full = false }) => (
  <View style={[styles.formGridField, full && styles.formGridFieldFull]}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
  </View>
);

const askWhetherToSignNewAgreement = () =>
  new Promise((resolve) => {
    Alert.alert(
      "Marketplace Agreements",
      "You already have a signed NDA and governance agreement on file. Would you like to sign a new one for this application?",
      [
        { text: "No, Use Existing", style: "cancel", onPress: () => resolve(false) },
        { text: "Yes, Sign New", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });

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
  const eventId = route?.params?.eventId || initialApplication?.event_id;
  const defaultContactName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ");
  const defaultCuisineText = foodTruckCuisineText(foodTruck);
  const initialDraft = {
    businessName: initialApplication?.business_name || foodTruck?.name || "",
    contactName: initialApplication?.contact_name || defaultContactName,
    phone: initialApplication?.phone || user?.phone || foodTruck?.phone || "",
    email: initialApplication?.email || user?.email || "",
    foodTypeCuisine:
      initialApplication?.food_type_cuisine || defaultCuisineText,
    menuDescription: initialApplication?.menu_description || "",
    notes: initialApplication?.notes || "",
  };
  const [event, setEvent] = useState(initialEvent);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [businessName, setBusinessName] = useState(initialDraft.businessName);
  const [contactName, setContactName] = useState(initialDraft.contactName);
  const [phone, setPhone] = useState(initialDraft.phone);
  const [email, setEmail] = useState(initialDraft.email);
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
  const isRevisionMode = isApplicationRevisionRequested(initialApplication);
  const [requirementFiles, setRequirementFiles] = useState(
    route?.params?.application?.attachments?.filter(
      (item) => item.attachment_type === "REQUIREMENT_DOCUMENT",
    ) || [],
  );
  const [uploadedMenuFiles, setUploadedMenuFiles] = useState(
    route?.params?.application?.attachments?.filter(
      (item) => item.attachment_type === "APPLICATION_MENU_PDF",
    ) || [],
  );
  const [uploadedFoodPhotoFiles, setUploadedFoodPhotoFiles] = useState(
    route?.params?.application?.attachments?.filter(
      (item) => item.attachment_type === "APPLICATION_IMAGE",
    ) || [],
  );
  const [selectedRequirementLabel, setSelectedRequirementLabel] = useState(
    "",
  );
  const [menuPdf, setMenuPdf] = useState(null);
  const [foodPhotos, setFoodPhotos] = useState([]);
  const pendingAgreementRef = useRef(null);
  const isLeavingRef = useRef(false);
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
          getVerifiedComplianceRequirementFiles(response.data?.compliance),
        );
      }
    } catch (error) {
      console.log("Marketplace profile requirement docs error", error);
    }
  }, [applyProfileRequirementFiles, foodTruck?._id]);

  const canSaveDraft = useMemo(
    () =>
      !!eventId &&
      !notesError,
    [eventId, notesError],
  );
  const applicationFieldsComplete =
    businessName.trim() &&
    contactName.trim() &&
    phone.trim() &&
    email.trim() &&
    foodTypeCuisine.trim();
  const canSubmit =
    canSaveDraft && applicationFieldsComplete && requirementsSatisfied;
  const hasUnsavedDraftContent = useMemo(() => {
    const initial = initialDraftRef.current;
    return (
      businessName !== initial.businessName ||
      contactName !== initial.contactName ||
      phone !== initial.phone ||
      email !== initial.email ||
      foodTypeCuisine !== initial.foodTypeCuisine ||
      menuDescription !== initial.menuDescription ||
      notes !== initial.notes ||
      !!menuPdf ||
      foodPhotos.length > 0
    );
  }, [
    businessName,
    contactName,
    email,
    foodPhotos.length,
    foodTypeCuisine,
    menuDescription,
    menuPdf,
    notes,
    phone,
  ]);

  const buildApplicationPayload = (applicationStatus) => ({
    business_name: businessName.trim(),
    contact_name: contactName.trim(),
    phone: phone.trim(),
    email: email.trim(),
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
    nda_acknowledged: applicationStatus === "SUBMITTED",
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
      setSavedApplication(response.data?.marketplaceApplication || null);
      initialDraftRef.current = {
        businessName,
        contactName,
        phone,
        email,
        foodTypeCuisine,
        menuDescription,
        notes,
      };
      return response.data?.marketplaceApplication || null;
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
    const response = await submitMarketplaceApplication_API({
      event_id: eventId,
      payload: buildApplicationPayload("SUBMITTED"),
    });

    if (response?.success) {
      const applicationId =
        response.data?.marketplaceApplication?.application_id;
      if (applicationId) {
        await uploadApplicationFiles(applicationId);
      }
      Alert.alert("Application Submitted", "Your application has been submitted.", [
        {
          text: "OK",
            onPress: () => {
              isLeavingRef.current = true;
              navigation.reset({
                index: 0,
                routes: [{ name: "homeScreen" }],
              });
            },
          },
        ]);
    }
  };

  const handleDocuSignReturn = async (url) => {
    const pendingAgreement = pendingAgreementRef.current;
    if (!pendingAgreement?.agreement_id) return;

    const statusMatch = String(url || "").match(/[?&]status=([^&]+)/);
    const eventMatch = String(url || "").match(/[?&]event=([^&]+)/);
    const rawStatus = decodeURIComponent(
      statusMatch?.[1] || eventMatch?.[1] || "error",
    );
    const status =
      rawStatus === "signing_complete" || rawStatus === "completed"
        ? "completed"
        : rawStatus === "decline" || rawStatus === "declined"
          ? "declined"
          : rawStatus === "cancel" || rawStatus === "cancelled"
            ? "cancelled"
            : "error";

    try {
      const response = await returnMarketplaceVendorAgreement_API({
        agreement_id: pendingAgreement.agreement_id,
        status,
      });
      pendingAgreementRef.current = null;
      if (response?.data?.marketplaceVendorAgreement?.status === "SIGNED") {
        await finalizeApplicationSubmission();
        return;
      }
      Alert.alert(
        "Signature Required",
        "The agreements must be signed before submission can continue. Your draft has been saved.",
      );
    } catch (error) {
      pendingAgreementRef.current = null;
      Alert.alert("Signing Error", error?.message || "Please try again.");
    }
  };

  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDocuSignReturn(url);
    });
    Linking.getInitialURL().then((url) => {
      if (url) handleDocuSignReturn(url);
    });
    return () => subscription.remove();
  }, [eventId, savedApplication, requirementFiles]);

  const submitApplication = async () => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    try {
      const draft = await saveApplicationDraft("PENDING_SIGNATURE");
      if (!draft?.application_id) {
        throw new Error("Unable to save application draft before signing.");
      }
      const signingResponse = await startMarketplaceVendorAgreementSigning_API({
        event_id: eventId,
        application_id: draft.application_id,
        return_url: "rounddacornervendor://docusign/return?status=completed",
      });

      if (signingResponse?.data?.already_signed) {
        const shouldSignNewAgreement = await askWhetherToSignNewAgreement();
        if (!shouldSignNewAgreement) {
          await finalizeApplicationSubmission();
          return;
        }

        const newSigningResponse = await startMarketplaceVendorAgreementSigning_API({
          event_id: eventId,
          application_id: draft.application_id,
          force_new_agreement: true,
          return_url: "rounddacornervendor://docusign/return?status=completed",
        });
        pendingAgreementRef.current =
          newSigningResponse?.data?.marketplaceVendorAgreement || null;
        if (!newSigningResponse?.data?.signing_url) {
          throw new Error("DocuSign signing URL was not returned.");
        }
        await Linking.openURL(newSigningResponse.data.signing_url);
        return;
      }

      pendingAgreementRef.current =
        signingResponse?.data?.marketplaceVendorAgreement || null;
      if (!signingResponse?.data?.signing_url) {
        throw new Error("DocuSign signing URL was not returned.");
      }
      await Linking.openURL(signingResponse.data.signing_url);
    } catch (error) {
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
        setSelectedMenuFile({
          uri: file.uri,
          name: file.name || "menu-upload",
          type: file.type || "application/octet-stream",
          size: file.size,
        });
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
      const image = await ImagePicker.openPicker({ mediaType: "photo" });
      setSelectedMenuFile({
        uri: image?.path,
        name: image?.filename || image?.path?.split("/").pop() || "menu.jpg",
        type: image?.mime || "image/jpeg",
        size: image?.size,
      });
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
      });
      setSelectedMenuFile({
        uri: image?.path,
        name: image?.filename || image?.path?.split("/").pop() || "menu.jpg",
        type: image?.mime || "image/jpeg",
        size: image?.size,
      });
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
        await uploadSelectedRequirementFile({
          uri: file.uri,
          name: file.name || `${selectedRequirementLabel}.pdf`,
          type: file.type || "application/pdf",
        });
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
      const image = await ImagePicker.openPicker({ mediaType: "photo" });
      await uploadSelectedRequirementFile({
        uri: image?.path,
        name:
          image?.filename ||
          image?.path?.split("/").pop() ||
          `${selectedRequirementLabel}.jpg`,
        type: image?.mime || "image/jpeg",
      });
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
      });
      await uploadSelectedRequirementFile({
        uri: image?.path,
        name:
          image?.filename ||
          image?.path?.split("/").pop() ||
          `${selectedRequirementLabel}.jpg`,
        type: image?.mime || "image/jpeg",
      });
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
      });
      setFoodPhotos((prev) => [
        ...prev,
        ...images.map((image) =>
          Platform.OS === "ios"
            ? {
                uri: image?.sourceURL || image?.path,
                name: image?.filename || `${Date.now()}.jpg`,
                type: image.mime,
              }
            : {
                uri: image?.path,
                name: `${image?.path?.split("/").pop()}`,
                type: image.mime,
              },
        ),
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
              <ReadOnlyRow label="Event Time" value={event?.event_time || "Not set"} />
              <ReadOnlyRow label="Duration" value={formatDuration(event)} />
              <ReadOnlyRow label="Location" value={getEventLocation(event)} />
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
                <FormField label="Contact Name *">
                  <TextInput
                    value={contactName}
                    onChangeText={setContactName}
                    style={styles.input}
                  />
                </FormField>
                <FormField label="Phone *">
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    style={styles.input}
                  />
                </FormField>
                <FormField label="Email *">
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
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
