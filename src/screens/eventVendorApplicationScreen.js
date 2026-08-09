import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ImagePicker from "react-native-image-crop-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getEventVendorPhotos_API,
  getEventVendorProfile_API,
  getEventVendorEvents_API,
  removeEventVendorApplicationPhoto_API,
  submitEventVendorApplication_API,
  uploadEventVendorApplicationPhoto_API,
} from "../api/appAPI";
import { useMarketplaceAgreementCompletion } from "../hooks/useMarketplaceAgreementCompletion";
import { AppColor } from "../utils/theme";
import {
  MERCHANDISE_CATEGORIES,
  toggleApplicationPhoto,
} from "../helpers/eventVendorProfile.helper";
import {
  buildEventVendorApplicationDraft,
  clearEventVendorApplicationRecovery,
  EVENT_VENDOR_APPLICATION_RETURN_KEY,
  hydrateEventVendorApplication,
  isAuthoritativeApplicationUnavailable,
  getPhotoRemovalPersistenceMessage,
  persistApplicationPhotoSelection,
  normalizeApplicationBullets,
  updateApplicationBullets,
  applicationBulletItems,
  sanitizeApplicationCurrency,
  formatApplicationCurrency,
  applicationCurrencyNumber,
  getApprovedApplicationUploadCategories,
} from "../helpers/eventVendorApplicationDraft.helper";
import { useDispatch } from "react-redux";
import {
  onOnBoard,
  onSignin,
  onUnderReview,
  setVendorOnboardingStep,
} from "../redux/slices/authSlice";
export default function EventVendorApplicationScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const event = route.params.event;
  const [profile, setProfile] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selected, setSelected] = useState([]);
  const [types, setTypes] = useState([]);
  const [bullets, setBullets] = useState("• ");
  const [price, setPrice] = useState("");
  const [priceFocused, setPriceFocused] = useState(false);
  const [notes, setNotes] = useState("");
  const [electricity, setElectricity] = useState(null);
  const [feeAck, setFeeAck] = useState(false);
  const [hasPendingAgreement, setHasPendingAgreement] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("");
  const [saveUploadToRepository, setSaveUploadToRepository] = useState(false);
  const [hydrationAttempt, setHydrationAttempt] = useState(0);
  const draftKey = `event-vendor-application-draft:${event.event_id}`;
  useEffect(() => {
    hydrateEventVendorApplication({
      storage: AsyncStorage,
      draftKey,
      returnKey: EVENT_VENDOR_APPLICATION_RETURN_KEY,
      loadProfile: getEventVendorProfile_API,
      loadPhotos: () => getEventVendorPhotos_API(event.event_id),
      loadEvent: getEventVendorEvents_API,
      eventId: event.event_id,
    })
      .then(async ({ profile: hydratedProfile, photos: hydratedPhotos, draft }) => {
        setProfile(hydratedProfile);
        setPhotos(hydratedPhotos);
        if (draft) {
          setSelected(Array.isArray(draft.selected) ? draft.selected : []);
          setTypes(Array.isArray(draft.types) ? draft.types : []);
          setBullets(normalizeApplicationBullets(draft.bullets));
          setPrice(sanitizeApplicationCurrency(draft.price));
          setNotes(draft.notes || "");
          setElectricity(draft.electricity ?? null);
          setFeeAck(draft.feeAck === true);
          setHasPendingAgreement(draft.pendingAgreement === true);
        }
        await clearEventVendorApplicationRecovery({
          storage: AsyncStorage,
          returnKey: EVENT_VENDOR_APPLICATION_RETURN_KEY,
        }).catch(() => {});
      })
      .catch((error) => {
        const unavailable = isAuthoritativeApplicationUnavailable(error);
        Alert.alert(
          unavailable ? "Application Unavailable" : "Unable to Restore Application",
          unavailable
            ? error?.message || "This event is closed or no longer accepting applications."
            : "We could not restore your application right now. Check your connection and try again. Your saved return path has been preserved.",
          unavailable
            ? [{ text: "OK", onPress: () => navigation.replace("bottomRoot") }]
            : [
                { text: "Later", onPress: () => navigation.replace("bottomRoot") },
                { text: "Retry", onPress: () => setHydrationAttempt((value) => value + 1) },
              ],
        );
      });
  }, [draftKey, event.event_id, hydrationAttempt, navigation]);
  const eligible = (event.event_vendor_needs || []).filter((n) =>
    profile?.vendor_types?.includes(n.vendor_type),
  );
  const toggle = (v, setter, list) =>
    setter(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const currentDraft = (overrides = {}) =>
    buildEventVendorApplicationDraft(
      {
        selected,
        types,
        bullets,
        price,
        notes,
        electricity,
        feeAck,
        pendingAgreement: hasPendingAgreement,
      },
      overrides,
    );
  const persistDraft = async (overrides = {}) => {
    await AsyncStorage.setItem(draftKey, JSON.stringify(currentDraft(overrides)));
  };
  const saveDraft = async () => {
    try {
      await persistDraft();
      Alert.alert("Application Draft", "Your application draft was saved.");
    } catch (error) {
      Alert.alert("Application Draft", error?.message || "Unable to save this draft.");
    }
  };
  const returnToMarketplace = () =>
    navigation.navigate("bottomRoot", { screen: "eventVendorMarketplaceScreen" });
  const persistSelected = async (nextSelected, removedPhotoId = null) =>
    persistApplicationPhotoSelection({
      storage: AsyncStorage,
      draftKey,
      draft: currentDraft(),
      nextSelected,
      removedPhotoId,
    });
  const uploadPhonePhoto = async () => {
    if (selected.length >= 5) return Alert.alert("Application Photos", "Up to five photos may be selected.");
    const merchandiseVendor = profile?.vendor_types?.includes("MERCHANDISE");
    if (merchandiseVendor && !uploadCategory) {
      return Alert.alert("Application Photos", "Select a merchandise category for this photo.");
    }
    try {
      await persistDraft();
      const image = await ImagePicker.openPicker({ mediaType: "photo" });
      const form = new FormData();
      form.append("file", {
        uri: image.path,
        name: image.filename || `application-${Date.now()}.jpg`,
        type: image.mime || "image/jpeg",
      });
      form.append("event_id", event.event_id);
      if (uploadCategory) form.append("category", uploadCategory);
      form.append("save_to_repository", String(saveUploadToRepository));
      const response = await uploadEventVendorApplicationPhoto_API(form);
      const photo = response?.data?.photo;
      if (photo) {
        const nextSelected = [...selected, photo.photo_id];
        setPhotos((current) => [photo, ...current]);
        setSelected(nextSelected);
        await persistSelected(nextSelected);
      }
      if (response?.data?.requires_reapproval === true) {
        await AsyncStorage.setItem(
          EVENT_VENDOR_APPLICATION_RETURN_KEY,
          JSON.stringify({ event }),
        );
        dispatch(onSignin(false));
        dispatch(onOnBoard(true));
        dispatch(onUnderReview(false));
        dispatch(setVendorOnboardingStep(null));
        Alert.alert(
          "Review Required",
          "The photo was saved to your permanent portfolio. Your application remains a draft until the revised portfolio is approved.",
        );
      }
    } catch (e) {
      if (e?.code !== "E_PICKER_CANCELLED") Alert.alert("Application Photos", e?.message || "Unable to upload photo.");
    }
  };
  const toggleSelectedPhoto = async (photo) => {
    if (selected.includes(photo.photo_id) && photo.source === "APPLICATION") {
      try {
        await removeEventVendorApplicationPhoto_API(photo.photo_id);
      } catch (e) {
        Alert.alert("Application Photos", e?.message || "Unable to remove this upload.");
        return;
      }
      const nextSelected = selected.filter((id) => id !== photo.photo_id);
      setSelected(nextSelected);
      setPhotos((current) =>
        current.filter((item) => item.photo_id !== photo.photo_id),
      );
      try {
        await persistSelected(nextSelected, photo.photo_id);
      } catch (e) {
        Alert.alert(
          "Photo Removed",
          getPhotoRemovalPersistenceMessage(),
        );
      }
      return;
    }
    const nextSelected = toggleApplicationPhoto(selected, photo.photo_id);
    setSelected(nextSelected);
    try {
      await persistSelected(nextSelected);
    } catch (error) {
      Alert.alert("Application Draft", error?.message || "Unable to save this photo selection.");
    }
  };
  const submitApplication = async () => {
    try {
      await submitEventVendorApplication_API(event.event_id, {
        vendor_types: types,
        photo_ids: selected,
        offering_bullets: applicationBulletItems(bullets),
        average_price: applicationCurrencyNumber(price),
        additional_notes: notes,
        electricity_required: electricity,
        electricity_fee_acknowledged: feeAck,
      });
      await clearEventVendorApplicationRecovery({
        storage: AsyncStorage,
        draftKey,
        returnKey: EVENT_VENDOR_APPLICATION_RETURN_KEY,
      });
      setHasPendingAgreement(false);
      Alert.alert(
        "Application Submitted",
        "Your application was submitted to the coordinator.",
        [{ text: "Done", onPress: returnToMarketplace }],
      );
    } catch (e) {
      Alert.alert("Application", e?.message || "Unable to submit application.");
    }
  };
  const { beginSigning } = useMarketplaceAgreementCompletion({
    enabled: !!event?.event_id && hasPendingAgreement,
    getSigningPayload: () => ({
      event_id: event.event_id,
      return_url: "rounddacornervendor://docusign/return?status=completed",
    }),
    finalizeSubmission: submitApplication,
    submissionLabel: "Application",
    recoveryStorageKey: `docusign-recovery:event-vendor:${event.event_id}`,
    onTerminalStatus: async () => {
      setHasPendingAgreement(false);
      const value = await AsyncStorage.getItem(draftKey);
      if (value) {
        await AsyncStorage.setItem(
          draftKey,
          JSON.stringify({ ...JSON.parse(value), pendingAgreement: false }),
        );
      }
    },
  });
  const startSigningAndSubmit = async () => {
    try {
      await AsyncStorage.setItem(
        draftKey,
        JSON.stringify({
          selected,
          types,
          bullets,
          price,
          notes,
          electricity,
          feeAck,
          pendingAgreement: true,
        }),
      );
      setHasPendingAgreement(true);
      await beginSigning();
    } catch (e) {
      Alert.alert("Marketplace Agreements", e?.message || "Unable to start signing.");
    }
  };
  return (
    <ScrollView contentContainerStyle={[s.page, { paddingTop: insets.top + 12 }]}>
      <TouchableOpacity style={s.back} onPress={returnToMarketplace}>
        <Text style={s.backText}>‹ Back to Marketplace</Text>
      </TouchableOpacity>
      <Text style={s.heading}>{event.event_name}</Text>
      <Text style={s.meta}>
        Business: {profile?.business_name || "Complete profile"}
      </Text>
      <Text style={s.label}>Apply as *</Text>
      {eligible.map((n) => (
        <TouchableOpacity
          key={n.vendor_type}
          style={[s.choice, types.includes(n.vendor_type) && s.on]}
          onPress={() => toggle(n.vendor_type, setTypes, types)}
        >
          <Text>
            {n.vendor_type} · ${Number(n.fee || 0).toFixed(2)}
          </Text>
        </TouchableOpacity>
      ))}
      <Text style={s.label}>Application Photos (up to 5)</Text>
      {profile?.vendor_types?.includes("MERCHANDISE") ? (
        <>
          <Text style={s.help}>Select the merchandise category for this photo.</Text>
          {getApprovedApplicationUploadCategories(
            profile,
            MERCHANDISE_CATEGORIES,
          ).map((category) => (
            <TouchableOpacity key={category.value} style={[s.choice, uploadCategory === category.value && s.on]} onPress={() => setUploadCategory(category.value)}>
              <Text>{category.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[s.choice, saveUploadToRepository && s.on]} onPress={() => setSaveUploadToRepository(!saveUploadToRepository)}>
            <Text>Save phone upload to my permanent repository</Text>
          </TouchableOpacity>
        </>
      ) : null}
      <TouchableOpacity style={s.phoneUpload} onPress={uploadPhonePhoto}>
        <Text style={s.submitText}>Upload Photo from Phone</Text>
      </TouchableOpacity>
      <View style={s.grid}>
        {photos.map((p) => (
          <TouchableOpacity
            key={p.photo_id}
            style={[s.photoWrap, selected.includes(p.photo_id) && s.photoOn]}
            onPress={() => toggleSelectedPhoto(p)}
          >
            <Image source={{ uri: p.file_url }} style={s.photo} />
            {p.category && p.category !== "GENERAL" ? (
              <Text style={s.categoryLabel}>{MERCHANDISE_CATEGORIES.find((item) => item.value === p.category)?.label || p.category}</Text>
            ) : null}
            {selected.includes(p.photo_id) ? <Text style={s.selectedLabel}>Selected · tap to remove</Text> : null}
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.label}>Products / Services Offered *</Text>
      <Text style={s.help}>Enter one bullet item per line.</Text>
      <TextInput
        style={[s.input, s.area]}
        multiline
        value={bullets}
        onChangeText={(value) => setBullets(updateApplicationBullets(bullets, value))}
      />
      <Text style={s.label}>Average Price *</Text>
      <TextInput
        style={s.input}
        keyboardType="decimal-pad"
        value={priceFocused ? price : formatApplicationCurrency(price)}
        onChangeText={(value) => setPrice(sanitizeApplicationCurrency(value))}
        onFocus={() => setPriceFocused(true)}
        onBlur={() => setPriceFocused(false)}
      />
      <Text style={s.label}>Additional Notes</Text>
      <TextInput
        style={[s.input, s.area]}
        multiline
        maxLength={300}
        value={notes}
        onChangeText={setNotes}
      />
      <Text style={s.label}>
        Do you need electrical equipment connections? *
      </Text>
      <TouchableOpacity
        style={[s.choice, electricity === true && s.on]}
        onPress={() => setElectricity(true)}
      >
        <Text>Yes — I understand additional fees may apply.</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.choice, electricity === false && s.on]}
        onPress={() => {
          setElectricity(false);
          setFeeAck(false);
        }}
      >
        <Text>No — I don&apos;t need additional power utilities.</Text>
      </TouchableOpacity>
      {electricity === true ? (
        <TouchableOpacity
          style={[s.choice, feeAck && s.on]}
          onPress={() => setFeeAck(!feeAck)}
        >
          <Text>
            ☐ I acknowledge the $
            {Number(event.event_vendor_electricity_fee || 0).toFixed(2)}{" "}
            electricity fee.
          </Text>
        </TouchableOpacity>
      ) : null}
      <Text style={s.agreementNotice}>
        The Marketplace NDA and Governance Document must be signed in DocuSign before this application is submitted.
      </Text>
      <TouchableOpacity style={s.saveDraft} onPress={saveDraft}>
        <Text style={s.saveDraftText}>Save Draft</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.submit} onPress={startSigningAndSubmit}>
        <Text style={s.submitText}>Sign Agreements &amp; Submit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { padding: 18, paddingBottom: 60, backgroundColor: "#fff" },
  back: { alignSelf: "flex-start", paddingVertical: 8, marginBottom: 4 },
  backText: { color: AppColor.primary, fontWeight: "800", fontSize: 16 },
  heading: { fontSize: 25, fontWeight: "800", color: "#172033" },
  meta: { color: "#64748b", marginTop: 5 },
  label: {
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 7,
    color: "#172033",
  },
  help: { color: "#64748b", marginBottom: 6 },
  phoneUpload: { backgroundColor: AppColor.primary, padding: 12, borderRadius: 10, alignItems: "center", marginBottom: 10 },
  selectedLabel: { fontSize: 10, color: "#166534", padding: 4 },
  categoryLabel: { fontSize: 10, color: "#475569", paddingHorizontal: 4, paddingTop: 4 },
  choice: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 13,
    borderRadius: 10,
    marginBottom: 8,
  },
  on: { borderColor: AppColor.primary, backgroundColor: "#fff7ed" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 12,
    borderRadius: 10,
  },
  area: { minHeight: 90, textAlignVertical: "top" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  photoWrap: {
    width: "30%",
    margin: "1.5%",
    borderWidth: 3,
    borderColor: "transparent",
    borderRadius: 10,
  },
  photoOn: { borderColor: AppColor.primary },
  photo: { width: "100%", height: 90, borderRadius: 7 },
  submit: {
    backgroundColor: AppColor.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 18,
  },
  submitText: { color: "#fff", fontWeight: "800" },
  saveDraft: { borderWidth: 1, borderColor: AppColor.primary, padding: 14, borderRadius: 12, alignItems: "center", marginTop: 18 },
  saveDraftText: { color: AppColor.primary, fontWeight: "800" },
  agreementNotice: { marginTop: 18, color: "#475569", lineHeight: 20 },
});
