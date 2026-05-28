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
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor } from "../utils/theme";
import {
  getMarketplaceEventById_API,
  submitMarketplaceApplication_API,
  uploadMarketplaceApplicationAttachment_API,
} from "../api/appAPI";
import usePermission from "../hooks/usePermission";
import { permission } from "../helpers/permission.helper";
import {
  MarketplaceHeader,
  formatDate,
  formatMoney,
  getEventLocation,
  styles,
} from "./vendorMarketplaceShared";

const ToggleRow = ({ label, value, onPress, required }) => (
  <TouchableOpacity
    activeOpacity={0.7}
    style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 }}
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

const ReadOnlyRow = ({ label, value }) => (
  <View style={{ marginTop: 12 }}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.meta}>{value || "None"}</Text>
  </View>
);

const VendorMarketplaceApplicationScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const user = useSelector((state) => state.userReducer.user);
  const foodTruck = user?.foodTruck || {};
  const eventId = route?.params?.eventId;
  const [event, setEvent] = useState(route?.params?.event || null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [businessName, setBusinessName] = useState(foodTruck?.name || "");
  const [contactName, setContactName] = useState(
    [user?.firstName, user?.lastName].filter(Boolean).join(" "),
  );
  const [phone, setPhone] = useState(user?.phone || foodTruck?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [foodTypeCuisine, setFoodTypeCuisine] = useState(
    Array.isArray(foodTruck?.cuisine)
      ? foodTruck.cuisine.map((item) => item?.name || item).filter(Boolean).join(", ")
      : "",
  );
  const [menuDescription, setMenuDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [insuranceConfirmed, setInsuranceConfirmed] = useState(false);
  const [permitsConfirmed, setPermitsConfirmed] = useState(false);
  const [liquorConfirmed, setLiquorConfirmed] = useState(false);
  const [ndaAcknowledged, setNdaAcknowledged] = useState(false);
  const [menuPdf, setMenuPdf] = useState(null);
  const [foodPhotos, setFoodPhotos] = useState([]);
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

  const requiresInsurance = !!event?.insurance_required;
  const requiresPermits =
    Array.isArray(event?.permits_required) && event.permits_required.length > 0;
  const requiresLiquor = !!event?.alcohol_required;
  // TODO: Replace fallback once backend provides an event-level NDA flag.
  const requiresNda = !!event?.nda_required;
  const requiresPermitUpload = requiresPermits || requiresLiquor;
  const hasPermitUpload = permitLicenseFiles.length > 0;

  const canSubmit = useMemo(
    () =>
      !!eventId &&
      businessName.trim() &&
      contactName.trim() &&
      phone.trim() &&
      email.trim() &&
      foodTypeCuisine.trim() &&
      (!requiresInsurance || insuranceConfirmed) &&
      (!requiresPermits || permitsConfirmed) &&
      (!requiresLiquor || liquorConfirmed) &&
      (!requiresPermitUpload || hasPermitUpload) &&
      (!requiresNda || ndaAcknowledged),
    [
      businessName,
      contactName,
      email,
      eventId,
      foodTypeCuisine,
      hasPermitUpload,
      insuranceConfirmed,
      liquorConfirmed,
      ndaAcknowledged,
      permitsConfirmed,
      phone,
      requiresInsurance,
      requiresLiquor,
      requiresNda,
      requiresPermitUpload,
      requiresPermits,
    ],
  );

  const uploadApplicationFile = async (applicationId, file, attachmentType) => {
    const formData = new FormData();
    formData.append("attachment_type", attachmentType);
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
    if (menuPdf) {
      await uploadApplicationFile(applicationId, menuPdf, "APPLICATION_MENU_PDF");
    }
    for (const image of foodPhotos) {
      await uploadApplicationFile(applicationId, image, "APPLICATION_IMAGE");
    }
    for (const file of permitLicenseFiles) {
      await uploadApplicationFile(applicationId, file, "PERMIT_LICENSE");
    }
  };

  const submitApplication = async () => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    try {
      const response = await submitMarketplaceApplication_API({
        event_id: eventId,
        payload: {
          business_name: businessName.trim(),
          contact_name: contactName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          food_type_cuisine: foodTypeCuisine.trim(),
          menu_description: menuDescription.trim(),
          notes: notes.trim(),
          insurance_confirmed: insuranceConfirmed,
          permits_confirmed: permitsConfirmed,
          liquor_license_confirmed: liquorConfirmed,
          nda_required: requiresNda,
          nda_acknowledged: ndaAcknowledged,
          application_status: "SUBMITTED",
        },
      });

      if (response?.success) {
        const applicationId =
          response.data?.marketplaceApplication?.application_id;
        let uploadWarning = false;
        if (applicationId) {
          try {
            await uploadApplicationFiles(applicationId);
          } catch (error) {
            uploadWarning = true;
            console.log("Marketplace application file upload error", error);
          }
        }

        Alert.alert(
          "Application Submitted",
          uploadWarning
            ? "Your application was submitted, but one or more files did not upload."
            : "Your application has been submitted.",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("VendorMyApplicationsScreen"),
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert(
        "Application Not Submitted",
        error?.message || "Please try again.",
      );
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
          },
        ]);
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert("File Not Selected", error?.message || "Please try again.");
      }
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
              <ReadOnlyRow label="Location" value={getEventLocation(event)} />
            </View>

            <View style={[styles.card, styles.feeSummaryCard]}>
              <Text style={styles.title}>Vendor Fee</Text>
              <ReadOnlyRow label="Vendor Fee" value={formatMoney(event?.vendor_fee)} />
              <Text style={styles.meta}>Set by Event Coordinator</Text>
              <Text style={styles.meta}>Payment required only if accepted.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Business Details</Text>
              <Text style={styles.label}>Business Name *</Text>
              <TextInput value={businessName} onChangeText={setBusinessName} style={styles.input} />
              <Text style={styles.label}>Contact Name *</Text>
              <TextInput value={contactName} onChangeText={setContactName} style={styles.input} />
              <Text style={styles.label}>Phone *</Text>
              <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} />
              <Text style={styles.label}>Email *</Text>
              <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={styles.input} />
              <Text style={styles.label}>Food Type / Cuisine *</Text>
              <TextInput value={foodTypeCuisine} onChangeText={setFoodTypeCuisine} style={styles.input} />
              <Text style={styles.label}>Menu Description</Text>
              <TextInput
                value={menuDescription}
                onChangeText={setMenuDescription}
                multiline
                placeholder="Describe what you would serve at this event."
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
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Requirements</Text>
              <ToggleRow label="Insurance response" required={requiresInsurance} value={insuranceConfirmed} onPress={() => setInsuranceConfirmed((value) => !value)} />
              <ToggleRow label="Permit response" required={requiresPermits} value={permitsConfirmed} onPress={() => setPermitsConfirmed((value) => !value)} />
              <ToggleRow label="Liquor license response" required={requiresLiquor} value={liquorConfirmed} onPress={() => setLiquorConfirmed((value) => !value)} />
              <ToggleRow label="NDA agreement response" required={requiresNda} value={ndaAcknowledged} onPress={() => setNdaAcknowledged((value) => !value)} />
              <Text style={styles.meta}>
                TODO: Route NDA response to the signing flow once vendor application signing is exposed.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Menu / Photos</Text>
              <Text style={styles.label}>Sample Menu Upload</Text>
              {menuPdf ? <Text style={styles.meta}>{menuPdf.name}</Text> : null}
              <TouchableOpacity activeOpacity={0.7} style={[styles.secondaryButton, { marginTop: 10 }]} onPress={pickMenuPdf} disabled={submitting}>
                <Text style={styles.secondaryButtonText}>Choose Sample Menu</Text>
              </TouchableOpacity>
              <Text style={styles.label}>Food Photos Upload</Text>
              {foodPhotos.map((image, index) => (
                <Text key={`${image.uri}-${index}`} style={styles.meta} numberOfLines={1}>{image.name}</Text>
              ))}
              <TouchableOpacity activeOpacity={0.7} style={[styles.secondaryButton, { marginTop: 10 }]} onPress={pickFoodPhotos} disabled={submitting}>
                <Text style={styles.secondaryButtonText}>Add Food Photos</Text>
              </TouchableOpacity>
              <Text style={styles.label}>Permit / Liquor License Upload{requiresPermitUpload ? " *" : ""}</Text>
              {permitLicenseFiles.map((file, index) => (
                <Text key={`${file.uri}-${index}`} style={styles.meta} numberOfLines={1}>{file.name}</Text>
              ))}
              <TouchableOpacity activeOpacity={0.7} style={[styles.secondaryButton, { marginTop: 10 }]} onPress={pickPermitLicenseFile} disabled={submitting}>
                <Text style={styles.secondaryButtonText}>Add Permit/License</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.meta, { textAlign: "center", marginBottom: 14 }]}>
              Payment is not required now. If accepted, you will receive a notification to pay the vendor fee.
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.button, (!canSubmit || submitting) && styles.buttonDisabled]}
              disabled={!canSubmit || submitting}
              onPress={submitApplication}
            >
              {submitting ? (
                <ActivityIndicator color={AppColor.white} />
              ) : (
                <Text style={styles.buttonText}>Submit Application</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

export default VendorMarketplaceApplicationScreen;
