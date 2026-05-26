import React, { useCallback, useMemo, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor } from "../utils/theme";
import {
  getMarketplaceEventById_API,
  submitMarketplaceBid_API,
  uploadMarketplaceBidAttachment_API,
} from "../api/appAPI";
import usePermission from "../hooks/usePermission";
import { permission } from "../helpers/permission.helper";
import {
  MarketplaceHeader,
  formatMoney,
  getEventLocation,
  styles,
} from "./vendorMarketplaceShared";

const ToggleRow = ({ label, value, onPress, required }) => (
  <TouchableOpacity
    activeOpacity={0.7}
    style={{
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      gap: 10,
    }}
    onPress={onPress}
  >
    <MaterialIcons
      name={value ? "check-box" : "check-box-outline-blank"}
      size={24}
      color={value ? AppColor.primary : AppColor.gray}
    />
    <Text style={[styles.meta, { flex: 1, marginTop: 0 }]}>
      {label}
      {required ? " *" : ""}
    </Text>
  </TouchableOpacity>
);

const VendorMarketplaceBidResponseScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const eventId = route?.params?.eventId;
  const [event, setEvent] = useState(route?.params?.event || null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pricePerGuest, setPricePerGuest] = useState("");
  const [fullBidAmount, setFullBidAmount] = useState("");
  const [menuDescription, setMenuDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [insuranceConfirmed, setInsuranceConfirmed] = useState(false);
  const [permitsConfirmed, setPermitsConfirmed] = useState(false);
  const [liquorConfirmed, setLiquorConfirmed] = useState(false);
  const [ndaAcknowledged, setNdaAcknowledged] = useState(false);
  const [menuPdf, setMenuPdf] = useState(null);
  const [bidImages, setBidImages] = useState([]);
  const [permitLicenseFiles, setPermitLicenseFiles] = useState([]);
  const { checkAndRequestPermission: photosPermissionStatus } = usePermission(
    permission.photos
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
  const requiresInsurance = !!event?.insurance_required;
  const requiresPermits =
    Array.isArray(event?.permits_required) && event.permits_required.length > 0;
  const requiresLiquor = !!event?.alcohol_required;
  const vendorFee = Number(event?.vendor_fee || 0);

  const canSubmit = useMemo(
    () =>
      !!eventId &&
      fullBidAmount.trim() &&
      !Number.isNaN(fullBidNumber) &&
      fullBidNumber >= 0 &&
      (!pricePerGuest || (!Number.isNaN(pricePerGuestNumber) && pricePerGuestNumber >= 0)) &&
      menuDescription.trim() &&
      (!requiresInsurance || insuranceConfirmed) &&
      (!requiresPermits || permitsConfirmed) &&
      (!requiresLiquor || liquorConfirmed) &&
      ndaAcknowledged,
    [
      eventId,
      fullBidAmount,
      fullBidNumber,
      insuranceConfirmed,
      liquorConfirmed,
      menuDescription,
      ndaAcknowledged,
      permitsConfirmed,
      pricePerGuest,
      pricePerGuestNumber,
      requiresInsurance,
      requiresLiquor,
      requiresPermits,
    ],
  );

  const submitBid = async () => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    try {
      const response = await submitMarketplaceBid_API({
        event_id: eventId,
        payload: {
          price_per_guest: pricePerGuestNumber,
          full_bid_amount: fullBidNumber,
          menu_description: menuDescription.trim(),
          notes: notes.trim(),
          insurance_confirmed: insuranceConfirmed,
          permits_confirmed: permitsConfirmed,
          liquor_license_confirmed: liquorConfirmed,
          nda_required: true,
          nda_acknowledged: ndaAcknowledged,
          bid_status: "SUBMITTED",
        },
      });

      if (response?.success) {
        const bidId = response.data?.marketplaceBid?.bid_id;
        const marketplacePayment = response.data?.marketplacePayment;
        let uploadWarning = false;
        if (bidId) {
          try {
            await uploadBidFiles(bidId);
          } catch (error) {
            uploadWarning = true;
            console.log("Marketplace bid file upload error", error);
          }
        }

        if (response.data?.requires_payment && marketplacePayment) {
          Alert.alert(
            "Event Registration Saved",
            uploadWarning
              ? "Your bid was saved, but one or more files did not upload. Complete payment after reviewing the status."
              : "Complete the event registration payment to submit your bid.",
            [
              {
                text: "Continue",
                onPress: () =>
                  navigation.navigate("vendorMarketplacePaymentScreen", {
                    payment: marketplacePayment,
                    paymentId: marketplacePayment.payment_id,
                    returnScreen: "vendorMarketplaceMyBidsScreen",
                  }),
              },
            ],
          );
          return;
        }

        Alert.alert(
          "Bid Submitted",
          uploadWarning
            ? "Your bid was submitted, but one or more files did not upload. You can retry file upload in a later document-management phase."
            : "Your bid has been submitted.",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("vendorMarketplaceMyBidsScreen"),
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert("Bid Not Submitted", error?.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const uploadBidFile = async (bidId, file, attachmentType) => {
    const formData = new FormData();
    formData.append("attachment_type", attachmentType);
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
    if (menuPdf) {
      await uploadBidFile(bidId, menuPdf, "BID_MENU_PDF");
    }

    for (const image of bidImages) {
      await uploadBidFile(bidId, image, "BID_IMAGE");
    }

    for (const file of permitLicenseFiles) {
      await uploadBidFile(bidId, file, "PERMIT_LICENSE");
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

  const pickPermitLicenseFile = async () => {
    try {
      const [file] = await DocumentPicker.pick({
        type: [types.pdf, types.images],
      });
      if (file) {
        setPermitLicenseFiles((prev) => [
          ...prev,
          {
            uri: file.uri,
            name: file.name || "permit-license",
            type: file.type || "application/pdf",
            size: file.size,
          },
        ]);
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert("File Not Selected", error?.message || "Please try again.");
      }
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
            <View style={styles.card}>
              <Text style={styles.title}>{event?.event_name || "Event Bid"}</Text>
              <Text style={styles.meta}>
                {getEventLocation(event)} | Vendor fee {formatMoney(vendorFee)}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Price Per Guest</Text>
              <TextInput
                value={pricePerGuest}
                onChangeText={setPricePerGuest}
                keyboardType="decimal-pad"
                placeholder="Optional"
                placeholderTextColor={AppColor.placeholderTextColor}
                style={styles.input}
              />
              <Text style={styles.label}>Full Bid Amount *</Text>
              <TextInput
                value={fullBidAmount}
                onChangeText={setFullBidAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={AppColor.placeholderTextColor}
                style={styles.input}
              />
              <Text style={styles.label}>Menu Description *</Text>
              <TextInput
                value={menuDescription}
                onChangeText={setMenuDescription}
                multiline
                placeholder="Describe the menu you are bidding with."
                placeholderTextColor={AppColor.placeholderTextColor}
                style={[styles.input, styles.textarea]}
              />
              <Text style={styles.label}>Notes/Comments</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Optional notes for the event coordinator."
                placeholderTextColor={AppColor.placeholderTextColor}
                style={[styles.input, styles.textarea]}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Requirements</Text>
              <ToggleRow
                label="Insurance confirmed"
                required={requiresInsurance}
                value={insuranceConfirmed}
                onPress={() => setInsuranceConfirmed((value) => !value)}
              />
              <ToggleRow
                label="Permits/licenses confirmed"
                required={requiresPermits}
                value={permitsConfirmed}
                onPress={() => setPermitsConfirmed((value) => !value)}
              />
              <ToggleRow
                label="Liquor license confirmed"
                required={requiresLiquor}
                value={liquorConfirmed}
                onPress={() => setLiquorConfirmed((value) => !value)}
              />
              <ToggleRow
                label="NDA/agreement acknowledged"
                required
                value={ndaAcknowledged}
                onPress={() => setNdaAcknowledged((value) => !value)}
              />
              <Text style={styles.meta}>
                Menu PDFs, food images, and permit/license files upload to the
                marketplace repository. Agreement documents remain placeholders
                for a future signing phase.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Bid Files</Text>
              <Text style={styles.meta}>
                Accepted: PDF, JPG, PNG, HEIC. Maximum file size is 10 MB.
              </Text>

              <Text style={styles.label}>Menu PDF</Text>
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
                <Text style={styles.secondaryButtonText}>Choose Menu PDF</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Food/Menu Images</Text>
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

              <Text style={styles.label}>Permit/License Files</Text>
              {permitLicenseFiles.map((file, index) => (
                <View
                  key={`${file.uri}-${index}`}
                  style={[styles.row, { alignItems: "center", marginTop: 8 }]}
                >
                  <Text style={[styles.meta, styles.flex]} numberOfLines={1}>
                    {file.name}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() =>
                      setPermitLicenseFiles((prev) =>
                        prev.filter((_, i) => i !== index)
                      )
                    }
                  >
                    <Text style={styles.secondaryButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.secondaryButton, { marginTop: 10 }]}
                onPress={pickPermitLicenseFile}
                disabled={submitting}
              >
                <Text style={styles.secondaryButtonText}>Add Permit/License</Text>
              </TouchableOpacity>
            </View>

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
                  {vendorFee > 0
                    ? "Complete Event Registration"
                    : "Submit Bid"}
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
