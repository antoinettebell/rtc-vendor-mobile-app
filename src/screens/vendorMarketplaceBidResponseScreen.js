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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor } from "../utils/theme";
import {
  getMarketplaceEventById_API,
  deleteMarketplaceBidAttachment_API,
  returnMarketplaceVendorAgreement_API,
  startMarketplaceVendorAgreementSigning_API,
  submitMarketplaceBid_API,
  uploadMarketplaceBidAttachment_API,
} from "../api/appAPI";
import usePermission from "../hooks/usePermission";
import { permission } from "../helpers/permission.helper";
import { maybeShowComplianceError } from "../helpers/compliance.helper";
import {
  MarketplaceHeader,
  formatDate,
  formatDuration,
  formatMoney,
  getEventLocation,
  getMarketplaceNotesError,
  getMarketplaceRequirementLabels,
  isVendorPaysToAttendEvent,
  normalizeMarketplaceRequirementLabel,
  styles,
} from "./vendorMarketplaceShared";

const ReadOnlyRow = ({ label, value }) => (
  <View style={{ marginTop: 12 }}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.meta}>{value || "None"}</Text>
  </View>
);

const askWhetherToSignNewAgreement = () =>
  new Promise((resolve) => {
    Alert.alert(
      "Marketplace Agreements",
      "You already have a signed NDA and governance agreement on file. Would you like to sign a new one for this bid?",
      [
        { text: "No, Use Existing", style: "cancel", onPress: () => resolve(false) },
        { text: "Yes, Sign New", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });

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
  const initialBid = route?.params?.bid || null;
  const initialEvent =
    route?.params?.event ||
    initialBid?.marketplaceEvent ||
    initialBid?.event ||
    null;
  const eventId = route?.params?.eventId || initialBid?.event_id;
  const initialDraft = {
    pricePerGuest: currencyDraftValue(initialBid?.price_per_guest),
    averagePricePerMeal: currencyDraftValue(initialBid?.average_price_per_meal),
    fullBidAmount: currencyDraftValue(initialBid?.full_bid_amount),
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
  const [menuDescription, setMenuDescription] = useState(
    initialDraft.menuDescription,
  );
  const [notes, setNotes] = useState(initialDraft.notes);
  const [savedBid, setSavedBid] = useState(initialBid);
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

  const fullBidNumber = Number(fullBidAmount);
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
  const isCoordinatorPaysEvent = event ? !isVendorPaysToAttendEvent(event) : true;

  const canSaveDraft = useMemo(
    () =>
      !!eventId &&
      isCoordinatorPaysEvent &&
      !notesError &&
      (!fullBidAmount.trim() ||
        (!Number.isNaN(fullBidNumber) && fullBidNumber >= 0)) &&
      (!pricePerGuest || (!Number.isNaN(pricePerGuestNumber) && pricePerGuestNumber >= 0)) &&
      (!averagePricePerMeal ||
        (!Number.isNaN(averagePricePerMealNumber) &&
          averagePricePerMealNumber >= 0)),
    [
      averagePricePerMeal,
      averagePricePerMealNumber,
      eventId,
      fullBidAmount,
      fullBidNumber,
      isCoordinatorPaysEvent,
      notesError,
      pricePerGuest,
      pricePerGuestNumber,
    ],
  );
  const bidFieldsComplete =
    fullBidAmount.trim() &&
    !Number.isNaN(fullBidNumber) &&
    fullBidNumber >= 0;
  const canSubmit = canSaveDraft && bidFieldsComplete && requirementsSatisfied;
  const hasUnsavedDraftContent = useMemo(() => {
    const initial = initialDraftRef.current;
    return (
      pricePerGuest !== initial.pricePerGuest ||
      averagePricePerMeal !== initial.averagePricePerMeal ||
      fullBidAmount !== initial.fullBidAmount ||
      menuDescription !== initial.menuDescription ||
      notes !== initial.notes ||
      !!menuPdf ||
      bidImages.length > 0
    );
  }, [
    averagePricePerMeal,
    bidImages.length,
    fullBidAmount,
    menuDescription,
    menuPdf,
    notes,
    pricePerGuest,
  ]);

  const buildBidPayload = (bidStatus) => ({
    price_per_guest: pricePerGuestNumber,
    average_price_per_meal: averagePricePerMealNumber,
    full_bid_amount: fullBidAmount.trim() ? fullBidNumber : null,
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
      setSavedBid(response.data?.marketplaceBid || null);
      initialDraftRef.current = {
        pricePerGuest,
        averagePricePerMeal,
        fullBidAmount,
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
            navigation.navigate("VendorMyBidsScreen");
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
        await finalizeBidSubmission();
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
  }, [eventId, savedBid, requirementFiles]);

  const submitBid = async () => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    try {
      const draft = await saveBidDraft("PENDING_SIGNATURE");
      if (!draft?.bid_id) {
        throw new Error("Unable to save bid draft before signing.");
      }
      const signingResponse = await startMarketplaceVendorAgreementSigning_API({
        event_id: eventId,
        bid_id: draft.bid_id,
        return_url: "rounddacornervendor://docusign/return?status=completed",
      });

      if (signingResponse?.data?.already_signed) {
        const shouldSignNewAgreement = await askWhetherToSignNewAgreement();
        if (!shouldSignNewAgreement) {
          await finalizeBidSubmission();
          return;
        }

        const newSigningResponse = await startMarketplaceVendorAgreementSigning_API({
          event_id: eventId,
          bid_id: draft.bid_id,
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
      if (!maybeShowComplianceError(error, navigation)) {
        Alert.alert("Bid Not Submitted", error?.message || "Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const pickMenuPdf = async () => {
    try {
      const [file] = await DocumentPicker.pick({ type: [types.pdf] });
      if (file) {
        setMenuPdf({
          uri: file.uri,
          name: file.name || "menu.pdf",
          type: file.type || "application/pdf",
          size: file.size,
        });
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert("PDF Not Selected", error?.message || "Please try again.");
      }
    }
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
          (item) => item.requirement_label !== selectedRequirementLabel,
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
      if (savedBid?.bid_id && file?.attachment_id) {
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
              <ReadOnlyRow label="Event Time" value={event?.event_time || "Not set"} />
              <ReadOnlyRow label="Duration" value={formatDuration(event)} />
              <ReadOnlyRow label="Location" value={getEventLocation(event)} />
              <ReadOnlyRow
                label="Estimated Guests"
                value={
                  event?.number_of_guests
                    ? `${event.number_of_guests}`
                    : "Not provided"
                }
              />
              <ReadOnlyRow
                label="Event Budget"
                value={formatMoney(event?.budgeted_amount)}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Pricing Details</Text>
              <Text style={styles.label}>Bid Amount *</Text>
              <TextInput
                value={fullBidAmount}
                onChangeText={(value) =>
                  setFullBidAmount(normalizeCurrencyInput(value))
                }
                onBlur={() => formatCurrencyInput(fullBidAmount, setFullBidAmount)}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={AppColor.placeholderTextColor}
                style={styles.input}
              />
              <Text style={styles.label}>Price Per Guest</Text>
              <TextInput
                value={pricePerGuest}
                onChangeText={(value) =>
                  setPricePerGuest(normalizeCurrencyInput(value))
                }
                onBlur={() => formatCurrencyInput(pricePerGuest, setPricePerGuest)}
                keyboardType="decimal-pad"
                placeholder="Optional"
                placeholderTextColor={AppColor.placeholderTextColor}
                style={styles.input}
              />
              <Text style={styles.label}>Average Price Per Meal</Text>
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
              <Text style={styles.label}>Menu Description</Text>
              <TextInput
                value={menuDescription}
                onChangeText={setMenuDescription}
                multiline
                placeholder="Describe the menu you are bidding with."
                placeholderTextColor={AppColor.placeholderTextColor}
                style={[styles.input, styles.textarea]}
              />
              <Text style={styles.label}>Special Notes to Event Coordinator</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Optional notes for the event coordinator."
                placeholderTextColor={AppColor.placeholderTextColor}
                style={[styles.input, styles.textarea]}
              />
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

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.secondaryButton, { marginBottom: 12 }]}
              disabled={!canSaveDraft || submitting}
              onPress={() => saveBidDraftWithFiles()}
            >
              <Text style={styles.secondaryButtonText}>Save Draft</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.button, (!canSubmit || submitting) && styles.buttonDisabled]}
              disabled={!canSubmit || submitting}
              onPress={submitBid}
            >
              {submitting ? (
                <ActivityIndicator color={AppColor.white} />
              ) : (
                <Text style={styles.buttonText}>Submit Bid</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

export default VendorMarketplaceBidResponseScreen;
