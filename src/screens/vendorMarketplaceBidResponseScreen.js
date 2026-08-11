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
  deleteMarketplaceBidAttachment_API,
  submitMarketplaceBid_API,
  uploadMarketplaceBidAttachment_API,
} from "../api/appAPI";
import { useMarketplaceAgreementCompletion } from "../hooks/useMarketplaceAgreementCompletion";
import usePermission from "../hooks/usePermission";
import { permission } from "../helpers/permission.helper";
import {
  MarketplaceHeader,
  formatDate,
  formatDuration,
  formatMoney,
  formatTimeRange,
  getEventLocation,
  getMarketplaceNotesError,
  getMarketplaceRequirementLabels,
  getVerifiedComplianceRequirementFiles,
  isBidRevisionRequested,
  isVendorPaysToAttendEvent,
  normalizeMarketplaceRequirementLabel,
  styles,
} from "./vendorMarketplaceShared";
import { getFoodVendorMarketplaceCloseDate, getFoodVendorMarketplaceGuestRows } from "../helpers/foodVendorMarketplaceGuestCounts.helper";
import {
  getBidActionAvailability,
  getBidBlockingReasons,
  supportsCoordinatorBid,
} from "../helpers/marketplaceBidEligibility.helper";

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

const normalizeCurrencyInput = (value) =>
  String(value || "").replace(/[^0-9.]/g, "");

const formatCurrencyInput = (value, setter) => {
  const amount = Number(normalizeCurrencyInput(value));
  setter(Number.isNaN(amount) ? "" : amount.toFixed(2));
};

const currencyDraftValue = (value) =>
  value === null || value === undefined || value === "" ? "" : String(value);

const VendorMarketplaceBidResponseScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const user = useSelector((state) => state.userReducer.user);
  const foodTruck = user?.foodTruck || {};
  const initialBid = route?.params?.bid || null;
  const initialEvent =
    route?.params?.event ||
    initialBid?.marketplaceEvent ||
    initialBid?.event ||
    null;
  const eventId = route?.params?.eventId || initialBid?.event_id || initialEvent?.event_id;
  const initialDraft = {
    pricePerGuest: currencyDraftValue(initialBid?.price_per_guest),
    averagePricePerMeal: currencyDraftValue(initialBid?.average_price_per_meal),
    fullBidAmount: currencyDraftValue(initialBid?.full_bid_amount),
    guestCoverage: initialBid?.guest_coverage || "REGULAR",
    regularGuestAmount: currencyDraftValue(initialBid?.regular_guest_amount),
    vipCateringAmount: currencyDraftValue(initialBid?.vip_catering_amount),
    menuDescription: initialBid?.menu_description || "",
    notes: initialBid?.notes || "",
  };
  const [event, setEvent] = useState(initialEvent);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pricePerGuest, setPricePerGuest] = useState(
    initialDraft.pricePerGuest,
  );
  const [averagePricePerMeal, setAveragePricePerMeal] = useState(
    initialDraft.averagePricePerMeal,
  );
  const [fullBidAmount, setFullBidAmount] = useState(initialDraft.fullBidAmount);
  const [guestCoverage, setGuestCoverage] = useState(initialDraft.guestCoverage);
  const [regularGuestAmount, setRegularGuestAmount] = useState(
    initialDraft.regularGuestAmount,
  );
  const [vipCateringAmount, setVipCateringAmount] = useState(
    initialDraft.vipCateringAmount,
  );
  const [menuDescription, setMenuDescription] = useState(
    initialDraft.menuDescription,
  );
  const [notes, setNotes] = useState(initialDraft.notes);
  const [savedBid, setSavedBid] = useState(initialBid);
  const savedBidRef = useRef(initialBid);
  const isRevisionMode = isBidRevisionRequested(initialBid);
  const [requirementFiles, setRequirementFiles] = useState(
    route?.params?.bid?.attachments?.filter(
      (item) => item.attachment_type === "REQUIREMENT_DOCUMENT",
    ) || [],
  );
  const [uploadedMenuFiles, setUploadedMenuFiles] = useState(
    route?.params?.bid?.attachments?.filter(
      (item) => item.attachment_type === "BID_MENU_PDF",
    ) || [],
  );
  const [uploadedBidImageFiles, setUploadedBidImageFiles] = useState(
    route?.params?.bid?.attachments?.filter(
      (item) => item.attachment_type === "BID_IMAGE",
    ) || [],
  );
  const [selectedRequirementLabel, setSelectedRequirementLabel] = useState(
    "",
  );
  const [menuPdf, setMenuPdf] = useState(null);
  const [bidImages, setBidImages] = useState([]);
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
      console.log("Marketplace bid event error", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEvent();
    }, [eventId]),
  );

  const cateredVipEnabled = event?.catered_vip_section_enabled === true;
  const fullyCateredEvent = event?.fully_catered_event === true;
  const allowedCoverages = useMemo(() => {
    if (fullyCateredEvent) {
      return Number(event?.number_of_guests || 0) > 0 && Number(event?.vip_guest_count || 0) > 0
        ? [["REGULAR", "GA Catering"], ["VIP", "VIP Catering"], ["BOTH", "VIP Catering + GA Sales"]]
        : Number(event?.vip_guest_count || 0) > 0
          ? [["VIP", "VIP Catering"]]
          : [["REGULAR", "All Guests"]];
    }
    if (cateredVipEnabled) {
      return event?.ga_food_sales_allowed
        ? [["VIP", "VIP Catering"], ["BOTH", "VIP Catering + GA Sales"]]
        : [["VIP", "VIP Catering"]];
    }
    return [["REGULAR", "Event Catering"]];
  }, [cateredVipEnabled, event?.ga_food_sales_allowed, event?.number_of_guests, event?.vip_guest_count, fullyCateredEvent]);
  useEffect(() => {
    if (!allowedCoverages.some(([value]) => value === guestCoverage)) {
      setGuestCoverage(allowedCoverages[0]?.[0] || "REGULAR");
    }
  }, [allowedCoverages, guestCoverage]);
  const regularGuestAmountNumber = Number(regularGuestAmount);
  const vipCateringAmountNumber = Number(vipCateringAmount);
  const fullBidNumber = guestCoverage === "BOTH"
    ? fullyCateredEvent
      ? regularGuestAmountNumber + vipCateringAmountNumber
      : vipCateringAmountNumber
    : Number(fullBidAmount);
  const pricePerGuestNumber = pricePerGuest ? Number(pricePerGuest) : null;
  const averagePricePerMealNumber = averagePricePerMeal
    ? Number(averagePricePerMeal)
    : null;
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
  const missingRequirementLabels = requiredRequirementLabels.filter(
    (label) => !uploadedRequirementLabels.has(label),
  );
  const isCoordinatorPaysEvent = event
    ? supportsCoordinatorBid(event, isVendorPaysToAttendEvent(event))
    : true;

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

  const { canSaveDraft, canSubmit } = getBidActionAvailability({
    eventId,
    coordinatorBidSupported: isCoordinatorPaysEvent,
    notesError,
    guestCoverage,
    fullyCateredEvent,
    fullBidAmount,
    fullBidNumber,
    regularGuestAmount,
    regularGuestAmountNumber,
    vipCateringAmount,
    vipCateringAmountNumber,
    pricePerGuest,
    pricePerGuestNumber,
    averagePricePerMeal,
    averagePricePerMealNumber,
    requirementsSatisfied,
  });
  const bidBlockingReasons = getBidBlockingReasons({
    eventId,
    coordinatorBidSupported: isCoordinatorPaysEvent,
    notesError,
    guestCoverage,
    fullyCateredEvent,
    fullBidAmount,
    fullBidNumber,
    regularGuestAmount,
    regularGuestAmountNumber,
    vipCateringAmount,
    vipCateringAmountNumber,
    missingRequirementLabels,
  });
  const hasUnsavedDraftContent = useMemo(() => {
    const initial = initialDraftRef.current;
    return (
      pricePerGuest !== initial.pricePerGuest ||
      averagePricePerMeal !== initial.averagePricePerMeal ||
      fullBidAmount !== initial.fullBidAmount ||
      guestCoverage !== initial.guestCoverage ||
      regularGuestAmount !== initial.regularGuestAmount ||
      vipCateringAmount !== initial.vipCateringAmount ||
      menuDescription !== initial.menuDescription ||
      notes !== initial.notes ||
      !!menuPdf ||
      bidImages.length > 0
    );
  }, [
    averagePricePerMeal,
    bidImages.length,
    fullBidAmount,
    guestCoverage,
    menuDescription,
    menuPdf,
    notes,
    pricePerGuest,
    regularGuestAmount,
    vipCateringAmount,
  ]);

  const buildBidPayload = (bidStatus) => ({
    price_per_guest: pricePerGuestNumber,
    average_price_per_meal: averagePricePerMealNumber,
    full_bid_amount:
      guestCoverage === "BOTH" || fullBidAmount.trim() ? fullBidNumber : null,
    guest_coverage: guestCoverage,
    regular_guest_amount:
      fullyCateredEvent && guestCoverage === "BOTH"
        ? regularGuestAmountNumber
        : null,
    vip_catering_amount:
      guestCoverage === "BOTH"
        ? vipCateringAmountNumber
        : null,
    menu_description: menuDescription.trim(),
    notes: notes.trim(),
    insurance_confirmed: uploadedRequirementLabels.has("Insurance"),
    permits_confirmed:
      requiredPermitLabels.length > 0
        ? requiredPermitLabels.every((label) => uploadedRequirementLabels.has(label))
        : false,
    liquor_license_confirmed: uploadedRequirementLabels.has("Liquor License"),
    nda_required: true,
    nda_acknowledged: bidStatus === "SUBMITTED",
    bid_status: bidStatus,
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

  const saveBidDraft = async (bidStatus = "DRAFT") => {
    if (notesError) {
      Alert.alert("Notes Not Allowed", notesError);
      return null;
    }
    if (!canSaveDraft) {
      Alert.alert("Draft Not Saved", "Fix the highlighted fields before saving.");
      return null;
    }

    const response = await submitMarketplaceBid_API({
      event_id: eventId,
      payload: buildBidPayload(bidStatus),
    });
    if (response?.success) {
      const marketplaceBid = response.data?.marketplaceBid || null;
      setSavedBid(marketplaceBid);
      savedBidRef.current = marketplaceBid;
      initialDraftRef.current = {
        pricePerGuest,
        averagePricePerMeal,
        fullBidAmount,
        guestCoverage,
        regularGuestAmount,
        vipCateringAmount,
        menuDescription,
        notes,
      };
      return response.data?.marketplaceBid || null;
    }
    return null;
  };

  const uploadBidFile = async (bidId, file, attachmentType, requirementLabel = null) => {
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
    return uploadMarketplaceBidAttachment_API({
      bid_id: bidId,
      payload: formData,
    });
  };

  const uploadBidFiles = async (bidId) => {
    const uploadedMenus = [];
    const uploadedImages = [];

    if (menuPdf) {
      const response = await uploadBidFile(bidId, menuPdf, "BID_MENU_PDF");
      const attachment = response?.data?.marketplaceAttachment;
      if (attachment) uploadedMenus.push(attachment);
    }

    for (const image of bidImages) {
      const response = await uploadBidFile(bidId, image, "BID_IMAGE");
      const attachment = response?.data?.marketplaceAttachment;
      if (attachment) uploadedImages.push(attachment);
    }

    if (uploadedMenus.length) {
      setUploadedMenuFiles(uploadedMenus);
      setMenuPdf(null);
    }
    if (uploadedImages.length) {
      setUploadedBidImageFiles((prev) => [...prev, ...uploadedImages]);
      setBidImages([]);
    }
  };

  async function saveBidDraftWithFiles({ notify = true } = {}) {
    if (submitting) return null;
    setSubmitting(true);
    try {
      const draft = await saveBidDraft("DRAFT");
      if (draft?.bid_id) {
        await uploadBidFiles(draft.bid_id);
        if (notify) {
          Alert.alert("Draft Saved", "Your bid draft has been saved.");
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

  const finalizeBidSubmission = async () => {
    const response = await submitMarketplaceBid_API({
      event_id: eventId,
      payload: buildBidPayload("SUBMITTED"),
    });

    if (response?.success) {
      const bidId = response.data?.marketplaceBid?.bid_id;
      if (bidId) {
        await uploadBidFiles(bidId);
      }
      Alert.alert("Bid Submitted", "Your bid has been submitted.", [
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

  const { beginSigning: beginAgreementSigning } =
    useMarketplaceAgreementCompletion({
      enabled: !!eventId && !!savedBid?.bid_id,
      getSigningPayload: () => ({
        event_id: eventId,
        bid_id: savedBidRef.current?.bid_id,
        return_url: "rounddacornervendor://docusign/return?status=completed",
      }),
      finalizeSubmission: finalizeBidSubmission,
      submissionLabel: "Bid",
      recoveryStorageKey: `docusign-recovery:bid:${eventId}`,
    });

  const submitBid = async () => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    try {
      const draft = await saveBidDraft("PENDING_SIGNATURE");
      if (!draft?.bid_id) {
        throw new Error("Unable to save bid draft before signing.");
      }
      await beginAgreementSigning();
    } catch (error) {
      Alert.alert("Bid Not Submitted", error?.message || "Please try again.");
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
    const draft = savedBid?.bid_id ? savedBid : await saveBidDraft("DRAFT");
    if (!draft?.bid_id || !file) return;
    const uploadResponse = await uploadBidFile(
      draft.bid_id,
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
            const draft = await saveBidDraftWithFiles({ notify: false });
            if (draft?.bid_id) leaveScreen();
          },
        });
      }

      Alert.alert(
        "Save Draft?",
        "Save this bid response before leaving the screen?",
        actions,
      );
    });

    return unsubscribe;
  }, [
    canSaveDraft,
    hasUnsavedDraftContent,
    navigation,
    saveBidDraftWithFiles,
    submitting,
  ]);

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
          size: file.size,
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
      if (savedBid?.bid_id && file?.attachment_id && !file?.from_profile_compliance) {
        await deleteMarketplaceBidAttachment_API({
          bid_id: savedBid.bid_id,
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

  const pickBidImages = async () => {
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
      const selectedImages = images.map((image) =>
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
            }
      );
      setBidImages((prev) => [...prev, ...selectedImages]);
    } catch (error) {
      if (error?.code !== "E_PICKER_CANCELLED") {
        Alert.alert("Images Not Selected", error?.message || "Please try again.");
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <MarketplaceHeader title="Bid Response" navigation={navigation} />
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
            <View style={[styles.card, styles.summaryCard]}>
              <Text style={styles.sectionHeader}>Event Summary</Text>
              <Text style={styles.title}>{event?.event_name || "Event Bid"}</Text>
              <ReadOnlyRow label="Event Type" value={event?.event_type} />
              <ReadOnlyRow label="Event Date" value={formatDate(event?.event_date)} />
              <ReadOnlyRow label="Event Time" value={formatTimeRange(event?.event_time)} />
              <ReadOnlyRow label="Duration" value={formatDuration(event)} />
              <ReadOnlyRow label="Location" value={getEventLocation(event)} />
              {getFoodVendorMarketplaceGuestRows({ event, participationPath: guestCoverage === "BOTH" ? "BOTH" : "BID", coverage: guestCoverage }).map((row) => <ReadOnlyRow key={row.label} label={row.label} value={row.value} />)}
              <ReadOnlyRow label="Application/Bid Deadline" value={formatDate(getFoodVendorMarketplaceCloseDate(event))} />
              <ReadOnlyRow
                label="Event Budget"
                value={formatMoney(event?.budgeted_amount)}
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

            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Pricing Details</Text>
              {allowedCoverages.length > 1 ? (
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.fieldLabel}>Participation Type *</Text>
                  <View style={[styles.row, { flexWrap: "wrap", gap: 8, marginTop: 8 }]}>
                    {allowedCoverages.map(([value, label]) => (
                      <TouchableOpacity
                        key={value}
                        activeOpacity={0.8}
                        style={[
                          styles.secondaryButton,
                          guestCoverage === value
                            ? { borderColor: AppColor.primary, backgroundColor: "#FFF1E6" }
                            : null,
                        ]}
                        onPress={() => setGuestCoverage(value)}
                      >
                        <Text style={styles.secondaryButtonText}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}
              <View style={styles.formGrid}>
                {guestCoverage !== "BOTH" ? <FormField label="Bid Amount *">
                  <TextInput
                    value={fullBidAmount}
                    onChangeText={(value) =>
                      setFullBidAmount(normalizeCurrencyInput(value))
                    }
                    onBlur={() =>
                      formatCurrencyInput(fullBidAmount, setFullBidAmount)
                    }
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={AppColor.placeholderTextColor}
                    style={styles.input}
                  />
                </FormField> : (
                  <>
                    {fullyCateredEvent ? (
                    <FormField label="Regular Guests Amount *">
                      <TextInput value={regularGuestAmount} onChangeText={(value) => setRegularGuestAmount(normalizeCurrencyInput(value))} onBlur={() => formatCurrencyInput(regularGuestAmount, setRegularGuestAmount)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={AppColor.placeholderTextColor} style={styles.input} />
                    </FormField>
                    ) : null}
                    <FormField label="VIP Catering Amount *">
                      <TextInput value={vipCateringAmount} onChangeText={(value) => setVipCateringAmount(normalizeCurrencyInput(value))} onBlur={() => formatCurrencyInput(vipCateringAmount, setVipCateringAmount)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={AppColor.placeholderTextColor} style={styles.input} />
                    </FormField>
                    <FormField label="Total Bid Amount" full>
                      <Text style={styles.meta}>{formatMoney(fullBidNumber)}</Text>
                    </FormField>
                    {!fullyCateredEvent ? (
                      <Text style={styles.meta}>
                        You are bidding for the coordinator-paid VIP catering opportunity and also applying to sell to GA guests at this event.
                        {`\n`}Expected VIP Guests: {event?.vip_guest_count || 0}
                        {`\n`}Coordinator VIP Catering Budget: {formatMoney(event?.budgeted_amount)}
                        {`\n`}Expected GA Guests: {event?.number_of_guests || 0}
                        {`\n`}Vendor Fee: {event?.waive_vendor_fee_for_combined_award ? "Waived if awarded both services" : formatMoney(event?.vendor_fee)}
                        {!event?.waive_vendor_fee_for_combined_award && event?.vendor_fee_payment_deadline
                          ? `${"\n"}Payment Deadline: ${formatDate(event.vendor_fee_payment_deadline)}`
                          : ""}
                      </Text>
                    ) : null}
                  </>
                )}
                <FormField label="Price Per Guest">
                  <TextInput
                    value={pricePerGuest}
                    onChangeText={(value) =>
                      setPricePerGuest(normalizeCurrencyInput(value))
                    }
                    onBlur={() =>
                      formatCurrencyInput(pricePerGuest, setPricePerGuest)
                    }
                    keyboardType="decimal-pad"
                    placeholder="Optional"
                    placeholderTextColor={AppColor.placeholderTextColor}
                    style={styles.input}
                  />
                </FormField>
                <FormField label="Average Price Per Meal">
                  <TextInput
                    value={averagePricePerMeal}
                    onChangeText={(value) =>
                      setAveragePricePerMeal(normalizeCurrencyInput(value))
                    }
                    onBlur={() =>
                      formatCurrencyInput(
                        averagePricePerMeal,
                        setAveragePricePerMeal,
                      )
                    }
                    keyboardType="decimal-pad"
                    placeholder="Optional"
                    placeholderTextColor={AppColor.placeholderTextColor}
                    style={styles.input}
                  />
                </FormField>
                <FormField label="Menu Description" full>
                  <TextInput
                    value={menuDescription}
                    onChangeText={setMenuDescription}
                    multiline
                    placeholder="Describe the menu you are bidding with."
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
              <Text style={styles.meta}>
                Accepted: PDF, JPG, PNG, HEIC. Maximum file size is 10 MB.
              </Text>

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
              {menuPdf ? (
                <View style={[styles.row, { alignItems: "center" }]}>
                  <Text style={[styles.meta, styles.flex]} numberOfLines={1}>
                    {menuPdf.name}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setMenuPdf(null)}
                  >
                    <Text style={styles.secondaryButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.secondaryButton, { marginTop: 10 }]}
                onPress={pickMenuPdf}
                disabled={submitting}
              >
                <Text style={styles.secondaryButtonText}>Choose Sample Menu</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Food Photos Upload</Text>
              {uploadedBidImageFiles.map((file) => (
                <Text
                  key={file.attachment_id || file.file_url}
                  style={styles.meta}
                  numberOfLines={1}
                >
                  {file.original_name || "Saved food image"}
                </Text>
              ))}
              {bidImages.map((image, index) => (
                <View
                  key={`${image.uri}-${index}`}
                  style={[styles.row, { alignItems: "center", marginTop: 8 }]}
                >
                  <Text style={[styles.meta, styles.flex]} numberOfLines={1}>
                    {image.name}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() =>
                      setBidImages((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    <Text style={styles.secondaryButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.secondaryButton, { marginTop: 10 }]}
                onPress={pickBidImages}
                disabled={submitting}
              >
                <Text style={styles.secondaryButtonText}>Add Food Images</Text>
              </TouchableOpacity>

            </View>

            {!isRevisionMode ? (
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.secondaryButton, { marginBottom: 12 }]}
                disabled={!canSaveDraft || submitting}
                onPress={() => saveBidDraftWithFiles()}
              >
                <Text style={styles.secondaryButtonText}>Save Draft</Text>
              </TouchableOpacity>
            ) : null}

            {!canSubmit && bidBlockingReasons.length ? (
              <View style={styles.card}>
                <Text style={styles.sectionHeader}>Before submitting</Text>
                {bidBlockingReasons.map((reason) => (
                  <Text key={reason} style={styles.meta}>
                    • {reason}
                  </Text>
                ))}
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.button, (!canSubmit || submitting) && styles.buttonDisabled]}
              disabled={!canSubmit || submitting}
              onPress={submitBid}
            >
              {submitting ? (
                <ActivityIndicator color={AppColor.white} />
              ) : (
                <Text style={styles.buttonText}>
                  {isRevisionMode ? "Submit Revised Bid" : "Submit Bid"}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

export default VendorMarketplaceBidResponseScreen;
