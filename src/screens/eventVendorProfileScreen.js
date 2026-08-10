import React, { useCallback, useState } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import ImagePicker from "react-native-image-crop-picker";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getEventVendorProfile_API,
  saveEventVendorProfile_API,
  submitEventVendorProfile_API,
  uploadEventVendorLogo_API,
} from "../api/appAPI";
import { AppColor } from "../utils/theme";
import {
  getEventVendorAccessState,
  getProfileOnboardingDestination,
  getProfileActionPresentation,
  MERCHANDISE_CATEGORIES,
} from "../helpers/eventVendorProfile.helper";
import { updateUser } from "../redux/slices/userSlice";
import { clearUserSlice } from "../redux/slices/userSlice";
import {
  onOnBoard,
  onSignin,
  onUnderReview,
  setVendorOnboardingStep,
  onSignOut,
  setPendingEventVendorApplication,
} from "../redux/slices/authSlice";
import MarketplaceVendorScreenLayout from "../components/MarketplaceVendorScreenLayout";
import { getApprovedProfilePresentation } from "../helpers/eventVendorPresentation.helper";
import { getEventVendorSignOutKeys } from "../helpers/eventVendorApplicationDraft.helper";

const TYPES = ["MERCHANDISE", "SERVICE", "OTHER"];
export default function EventVendorProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.userReducer.user);
  const [profile, setProfile] = useState(null);
  const [businessName, setBusinessName] = useState(
    user?.eventVendorBusinessName || "",
  );
  const [description, setDescription] = useState("");
  const [vendorTypes, setVendorTypes] = useState([]);
  const [links, setLinks] = useState(["", ""]);
  const [merchandiseCategories, setMerchandiseCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const applyFields = (value) => {
    setBusinessName(value?.business_name || "");
    setDescription(value?.business_description || "");
    setVendorTypes(value?.vendor_types || []);
    setLinks([...(value?.social_links || []), "", ""].slice(0, 2));
    setMerchandiseCategories(value?.merchandise_categories || []);
  };
  const applyProfileState = (nextProfile, wasApproved = false) => {
    setProfile(nextProfile);
    dispatch(updateUser({ eventVendorProfile: nextProfile }));
    if (wasApproved && nextProfile?.review_status === "DRAFT") {
      dispatch(onSignin(false));
      dispatch(onOnBoard(true));
      dispatch(onUnderReview(false));
      dispatch(setVendorOnboardingStep(null));
      Alert.alert(
        "Review Required",
        "Your material profile changes were saved. Marketplace access is paused until the revised profile is approved.",
      );
    }
  };
  const load = useCallback(async () => {
    const response = await getEventVendorProfile_API().catch(() => null);
    const value = response?.data?.eventVendorProfile;
    if (value) {
      setProfile(value);
      applyFields(value);
      setSavedSnapshot(value);
      setIsEditing(value.review_status !== "APPROVED");
      dispatch(updateUser({ eventVendorProfile: value }));
    }
  }, [dispatch]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const toggleType = (type) =>
    setVendorTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type],
    );
  const toggleCategory = (category) =>
    setMerchandiseCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  const save = async () => {
    if (!businessName.trim() || !description.trim() || !vendorTypes.length)
      return Alert.alert(
        "Profile",
        "Business name, description, and at least one vendor type are required.",
      );
    setSaving(true);
    try {
      const response = await saveEventVendorProfile_API({
        business_name: businessName.trim(),
        business_description: description.trim(),
        vendor_types: vendorTypes,
        social_links: links.map((item) => item.trim()).filter(Boolean),
        merchandise_categories: vendorTypes.includes("MERCHANDISE")
          ? merchandiseCategories
          : [],
      });
      const savedProfile = response?.data?.eventVendorProfile;
      applyProfileState(savedProfile, access.canUseMarketplace);
      setSavedSnapshot(savedProfile);
      if (access.canUseMarketplace) {
        setIsEditing(false);
        return;
      }
      if (
        getProfileOnboardingDestination(vendorTypes) ===
        "EVENT_VENDOR_PHOTOS"
      ) {
        navigation.navigate("eventVendorPhotosScreen", {
          onboardingFlow: true,
        });
      } else {
        Alert.alert(
          "Profile Saved",
          "Add your business logo, then submit your profile for review.",
        );
      }
    } catch (e) {
      Alert.alert("Profile", e?.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };
  const submitForReview = async () => {
    setSaving(true);
    try {
      const response = await submitEventVendorProfile_API();
      const submittedProfile = response?.data?.eventVendorProfile;
      setProfile(submittedProfile);
      dispatch(updateUser({ eventVendorProfile: submittedProfile }));
      dispatch(onOnBoard(true));
      dispatch(onUnderReview(true));
      dispatch(setVendorOnboardingStep("AWAITING_APPROVAL"));
    } catch (e) {
      Alert.alert("Submit Profile", e?.message || "Unable to submit profile.");
    } finally {
      setSaving(false);
    }
  };
  const access = getEventVendorAccessState(profile);
  const presentation = getProfileActionPresentation(profile, vendorTypes);
  const approvedPresentation = getApprovedProfilePresentation(profile, isEditing);
  const fieldsEditable = access.canEdit && !approvedPresentation.readOnly;
  const uploadLogo = async () => {
    try {
      const image = await ImagePicker.openPicker({
        mediaType: "photo",
        cropping: true,
      });
      const form = new FormData();
      form.append("file", {
        uri: image.path,
        name: image.filename || `logo-${Date.now()}.jpg`,
        type: image.mime || "image/jpeg",
      });
      const response = await uploadEventVendorLogo_API(form);
      const nextProfile = response?.data?.eventVendorProfile;
      applyProfileState(nextProfile, access.canUseMarketplace);
    } catch (e) {
      if (e?.code !== "E_PICKER_CANCELLED")
        Alert.alert("Logo", e?.message || "Unable to upload logo.");
    }
  };
  const requestLogoUpload = () => {
    if (approvedPresentation.approved) {
      Alert.alert(
        "Replace Business Logo?",
        "Changing the approved business logo requires another profile review.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Replace Logo", onPress: uploadLogo },
        ],
      );
      return;
    }
    uploadLogo();
  };
  const requestSave = () => {
    if (approvedPresentation.approved && isEditing) {
      Alert.alert(
        "Save Profile Changes?",
        "Material business, type, category, description, or logo changes may require another approval before Marketplace access resumes.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Save Changes", onPress: save },
        ],
      );
      return;
    }
    save();
  };
  const cancelEdit = () => {
    applyFields(savedSnapshot || profile);
    setIsEditing(false);
  };
  const confirmSignOut = () =>
    Alert.alert("Sign Out", "Sign out of this Marketplace Vendor account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          const keys = await AsyncStorage.getAllKeys();
          const vendorId = String(user?._id || user?.id || "");
          const transient = getEventVendorSignOutKeys(keys, vendorId);
          if (transient.length) await AsyncStorage.multiRemove(transient);
          dispatch(setPendingEventVendorApplication(null));
          dispatch(onSignOut());
          dispatch(clearUserSlice());
          navigation.reset({ index: 0, routes: [{ name: "splash" }] });
        },
      },
    ]);
  return (
    <MarketplaceVendorScreenLayout
      title="Marketplace Vendor Profile"
      subtitle="Merchandise, artisans, services, nonprofits, and exhibitors."
      onSignOut={confirmSignOut}
    >
    <ScrollView contentContainerStyle={s.page}>
      {profile ? (
        <TouchableOpacity style={s.logoButton} onPress={requestLogoUpload} disabled={!fieldsEditable}>
          {profile?.logo_url ? (
            <Image source={{ uri: profile.logo_url }} style={s.logo} />
          ) : (
            <Text style={s.buttonText}>Add Business Logo</Text>
          )}
        </TouchableOpacity>
      ) : (
        <Text style={s.setupNotice}>Save the basic profile below before adding the logo.</Text>
      )}
      <Text style={s.label}>Type of Vendor *</Text>
      <View style={s.types}>
        {TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => toggleType(type)}
            disabled={!fieldsEditable}
            style={[s.chip, vendorTypes.includes(type) && s.chipOn]}
          >
            <Text
              style={vendorTypes.includes(type) ? s.chipTextOn : s.chipText}
            >
              {type[0] + type.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.label}>Business Name *</Text>
      <TextInput
        style={s.input}
        value={businessName}
        onChangeText={setBusinessName}
        maxLength={150}
        editable={fieldsEditable}
      />
      <Text style={s.label}>Brief description of what you sell *</Text>
      <TextInput
        style={[s.input, s.area]}
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={300}
        editable={fieldsEditable}
      />
      <Text style={s.count}>{description.length}/300</Text>
      {[0, 1].map((index) => (
        <View key={index}>
          <Text style={s.label}>Website / Social Link {index + 1}</Text>
          <TextInput
            style={s.input}
            autoCapitalize="none"
            keyboardType="url"
            value={links[index]}
            editable={fieldsEditable}
            onChangeText={(value) =>
              setLinks((current) =>
                current.map((item, i) => (i === index ? value : item)),
              )
            }
          />
        </View>
      ))}
      {vendorTypes.includes("MERCHANDISE") ? (
        <>
          <Text style={s.label}>Merchandise Categories *</Text>
          {MERCHANDISE_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.value}
              onPress={() => toggleCategory(category.value)}
              disabled={!fieldsEditable}
              style={[
                s.category,
                merchandiseCategories.includes(category.value) && s.chipOn,
              ]}
            >
              <Text style={merchandiseCategories.includes(category.value) ? s.chipTextOn : s.chipText}>{category.label}</Text>
              <Text style={[s.categoryDescription, merchandiseCategories.includes(category.value) && s.categoryDescriptionOn]}>{category.description}</Text>
            </TouchableOpacity>
          ))}
        </>
      ) : null}
      {profile?.rejection_reason ? (
        <Text style={s.rejection}>Rejection reason: {profile.rejection_reason}</Text>
      ) : null}
      {presentation.showApprovedStatus ? (
        <Text style={s.approved}>Profile approved. Material changes require another review.</Text>
      ) : null}
      <TouchableOpacity
        style={s.primary}
        onPress={approvedPresentation.readOnly ? () => setIsEditing(true) : requestSave}
        disabled={saving || (!access.canEdit && !approvedPresentation.approved)}
      >
        <Text style={s.buttonText}>{saving ? "Saving…" : approvedPresentation.primaryAction}</Text>
      </TouchableOpacity>
      {approvedPresentation.showCancel ? (
        <TouchableOpacity style={s.secondary} onPress={cancelEdit}>
          <Text style={s.secondaryText}>Cancel</Text>
        </TouchableOpacity>
      ) : null}
      {presentation.showSubmitFromProfile ? (
        <TouchableOpacity style={[s.submitReview, !profile?.logo_url && s.disabled]} onPress={submitForReview} disabled={saving || !profile?.logo_url}>
          <Text style={s.buttonText}>{access.canResubmit ? "Resubmit Profile for Review" : "Submit Profile for Review"}</Text>
        </TouchableOpacity>
      ) : presentation.showAwaitingApproval ? (
        <Text style={s.pending}>Profile submitted and awaiting approval.</Text>
      ) : null}
      {!vendorTypes.includes("MERCHANDISE") && profile && !profile.logo_url ? (
        <Text style={s.setupNotice}>Add the business logo before submitting for review.</Text>
      ) : null}
    </ScrollView>
    </MarketplaceVendorScreenLayout>
  );
}
const s = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingBottom: 60, backgroundColor: "#fff" },
  heading: { fontSize: 26, fontWeight: "800", color: "#172033" },
  sub: { color: "#64748b", marginTop: 6, marginBottom: 18 },
  label: {
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 7,
    color: "#172033",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 12,
    color: "#172033",
  },
  area: { minHeight: 100, textAlignVertical: "top" },
  count: { textAlign: "right", color: "#64748b" },
  types: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 10,
    borderRadius: 20,
  },
  chipOn: { backgroundColor: AppColor.primary, borderColor: AppColor.primary },
  chipText: { color: "#172033" },
  chipTextOn: { color: "#fff", fontWeight: "700" },
  primary: {
    backgroundColor: AppColor.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 14,
  },
  secondary: {
    borderWidth: 1,
    borderColor: AppColor.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 22,
  },
  secondaryText: { color: AppColor.primary, fontWeight: "800" },
  buttonText: { color: "#fff", fontWeight: "800" },
  category: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, padding: 12, marginBottom: 8 },
  categoryDescription: { color: "#64748b", marginTop: 4 },
  categoryDescriptionOn: { color: "#e2e8f0" },
  submitReview: { backgroundColor: "#166534", padding: 15, borderRadius: 12, alignItems: "center", marginTop: 12 },
  rejection: { color: "#991b1b", backgroundColor: "#fee2e2", padding: 12, borderRadius: 10, marginTop: 14 },
  pending: { color: "#92400e", backgroundColor: "#fef3c7", padding: 12, borderRadius: 10, marginTop: 12, textAlign: "center" },
  setupNotice: { color: "#475569", backgroundColor: "#f1f5f9", padding: 12, borderRadius: 10, marginBottom: 12 },
  disabled: { opacity: 0.5 },
  approved: { color: "#166534", backgroundColor: "#dcfce7", padding: 12, borderRadius: 10, marginTop: 12 },
  logoButton: {
    height: 120,
    borderRadius: 14,
    backgroundColor: AppColor.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    resizeMode: "contain",
  },
});
