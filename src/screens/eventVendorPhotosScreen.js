import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import ImagePicker from "react-native-image-crop-picker";
import {
  getEventVendorPhotos_API,
  getEventVendorProfile_API,
  removeEventVendorPhoto_API,
  replaceEventVendorPhoto_API,
  submitEventVendorProfile_API,
  uploadEventVendorLogo_API,
  uploadEventVendorPhoto_API,
} from "../api/appAPI";
import { AppColor } from "../utils/theme";
import MarketplaceVendorScreenLayout from "../components/MarketplaceVendorScreenLayout";
import { getPhotoRepositoryPresentation } from "../helpers/eventVendorPresentation.helper";
import {
  groupPhotosByCategory,
  getMarketplaceApiErrorMessage,
  getMerchandisePortfolioProgress,
  getSelectedMerchandiseCategories,
} from "../helpers/eventVendorProfile.helper";
import { useDispatch } from "react-redux";
import { updateUser } from "../redux/slices/userSlice";
import {
  onOnBoard,
  onSignin,
  onUnderReview,
  setVendorOnboardingStep,
} from "../redux/slices/authSlice";

export default function EventVendorPhotosScreen({ route }) {
  const dispatch = useDispatch();
  const [photos, setPhotos] = useState([]);
  const [preview, setPreview] = useState(null);
  const [profile, setProfile] = useState(null);
  const onboardingFlow = route?.params?.onboardingFlow === true;
  const groupedPhotos = groupPhotosByCategory(photos);
  const selectedCategories = getSelectedMerchandiseCategories(profile);
  const portfolioProgress = getMerchandisePortfolioProgress(profile, photos);
  const canSubmitReview = !!profile?.logo_url && portfolioProgress.complete;
  const repositoryPresentation = getPhotoRepositoryPresentation(
    profile,
    portfolioProgress.activeCount,
  );
  const handleReapproval = (response) => {
    if (profile?.review_status === "APPROVED" || response?.data?.requires_reapproval !== true) return;
    dispatch(onSignin(false));
    dispatch(onOnBoard(true));
    dispatch(onUnderReview(false));
    dispatch(setVendorOnboardingStep(null));
    Alert.alert(
      "Review Required",
      "Your portfolio change was saved. Marketplace access is paused until the revised profile is approved.",
    );
  };
  const load = useCallback(async () => {
    const [response, profileResponse] = await Promise.all([
      getEventVendorPhotos_API(),
      getEventVendorProfile_API(),
    ]);
    setPhotos(response?.data?.photoList || []);
    const loadedProfile = profileResponse?.data?.eventVendorProfile || null;
    setProfile(loadedProfile);
    if (loadedProfile) dispatch(updateUser({ eventVendorProfile: loadedProfile }));
  }, [dispatch]);
  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load]),
  );
  const add = async (category, replacingPhoto = null) => {
    try {
      if (!replacingPhoto && photos.filter((photo) => photo.category === category).length >= 10)
        return Alert.alert(
          "Photos",
          "This category already contains 10 photos.",
        );
      const image = await ImagePicker.openPicker({ mediaType: "photo" });
      const form = new FormData();
      form.append("file", {
        uri: image.path,
        name: image.filename || `product-${Date.now()}.jpg`,
        type: image.mime || "image/jpeg",
      });
      form.append("category", category);
      if (replacingPhoto) {
        const response = await replaceEventVendorPhoto_API(replacingPhoto.photo_id, form);
        handleReapproval(response);
      } else {
        const response = await uploadEventVendorPhoto_API(form);
        handleReapproval(response);
      }
      await load();
    } catch (e) {
      if (e?.code !== "E_PICKER_CANCELLED")
        Alert.alert("Photos", getMarketplaceApiErrorMessage(e, "Unable to upload photo."));
    }
  };
  const uploadLogo = async () => {
    try {
      const image = await ImagePicker.openPicker({ mediaType: "photo", cropping: true });
      const form = new FormData();
      form.append("file", {
        uri: image.path,
        name: image.filename || `logo-${Date.now()}.jpg`,
        type: image.mime || "image/jpeg",
      });
      const response = await uploadEventVendorLogo_API(form);
      setProfile(response?.data?.eventVendorProfile || profile);
      dispatch(updateUser({ eventVendorProfile: response?.data?.eventVendorProfile || profile }));
      handleReapproval(response);
    } catch (e) {
      if (e?.code !== "E_PICKER_CANCELLED") Alert.alert("Logo", getMarketplaceApiErrorMessage(e, "Unable to upload logo."));
    }
  };
  const submitForReview = async () => {
    try {
      const response = await submitEventVendorProfile_API();
      const submittedProfile = response?.data?.eventVendorProfile;
      dispatch(updateUser({ eventVendorProfile: submittedProfile }));
      dispatch(onOnBoard(true));
      dispatch(onUnderReview(true));
      dispatch(setVendorOnboardingStep("AWAITING_APPROVAL"));
    } catch (e) {
      Alert.alert("Submit Profile", getMarketplaceApiErrorMessage(e, "Unable to submit profile."));
    }
  };
  const remove = (photo) =>
    Alert.alert(
      "Remove Photo",
      "Submitted applications retain an archived copy of this photo.",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const response = await removeEventVendorPhoto_API(photo.photo_id);
            handleReapproval(response);
            await load();
          },
        },
      ],
    );
  return (
    <MarketplaceVendorScreenLayout title="Photo Repository">
    <ScrollView style={s.page} contentContainerStyle={s.content}>
      <Text style={s.sub}>
        {repositoryPresentation.approved
          ? repositoryPresentation.progressLabel
          : `${photos.length}/40 photos · Up to 10 photos in each category.`}
      </Text>
      {!repositoryPresentation.approved ? (
        <Text style={s.progress}>{repositoryPresentation.progressLabel}</Text>
      ) : null}
      {onboardingFlow && !repositoryPresentation.approved ? (
        <View style={s.onboardingCard}>
          <Text style={s.sectionTitle}>Business Logo</Text>
          <TouchableOpacity style={s.logoButton} onPress={uploadLogo}>
            {profile?.logo_url ? <Image source={{ uri: profile.logo_url }} style={s.logo} /> : <Text style={s.addText}>Add Business Logo</Text>}
          </TouchableOpacity>
        </View>
      ) : null}
      {selectedCategories.map((category) => {
        const categoryPhotos = groupedPhotos[category.value] || [];
        return (
          <View key={category.value} style={s.section}>
            <Text style={s.sectionTitle}>{category.label}</Text>
            <Text style={s.sectionDescription}>{category.description}</Text>
            <Text style={s.count}>{categoryPhotos.length}/10</Text>
            <TouchableOpacity style={s.add} onPress={() => add(category.value)}>
              <Text style={s.addText}>Add Photo</Text>
            </TouchableOpacity>
            <FlatList
              scrollEnabled={false}
              data={categoryPhotos}
              numColumns={2}
              keyExtractor={(item) => item.photo_id}
              renderItem={({ item }) => (
                <View style={s.card}>
                  <TouchableOpacity onPress={() => setPreview(item)}>
                    <Image source={{ uri: item.file_url }} style={s.image} />
                  </TouchableOpacity>
                  <View style={s.actions}>
                    <TouchableOpacity onPress={() => add(category.value, item)}><Text style={s.action}>Replace</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => remove(item)}><Text style={[s.action, s.delete]}>Remove</Text></TouchableOpacity>
                  </View>
                </View>
              )}
            />
          </View>
        );
      })}
      {repositoryPresentation.approved ? (
        <TouchableOpacity
          style={s.submitReview}
          onPress={() => Alert.alert("Photos Saved", "Your photo repository is up to date.")}
        >
          <Text style={s.addText}>Save Photos</Text>
        </TouchableOpacity>
      ) : onboardingFlow ? (
        <TouchableOpacity style={[s.submitReview, !canSubmitReview && s.disabled]} onPress={submitForReview} disabled={!canSubmitReview}>
          <Text style={s.addText}>Submit Profile for Review</Text>
        </TouchableOpacity>
      ) : null}
      {onboardingFlow && !canSubmitReview ? <Text style={s.requirement}>Add a logo and at least 3 portfolio photos in your selected merchandise categories before submitting.</Text> : null}
      <Modal visible={!!preview} transparent onRequestClose={() => setPreview(null)}>
        <TouchableOpacity style={s.previewBackdrop} onPress={() => setPreview(null)}>
          {preview ? <Image source={{ uri: preview.file_url }} style={s.previewImage} resizeMode="contain" /> : null}
        </TouchableOpacity>
      </Modal>
    </ScrollView>
    </MarketplaceVendorScreenLayout>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 18, paddingBottom: 60 },
  heading: { fontSize: 26, fontWeight: "800", color: "#172033" },
  sub: { color: "#64748b", marginTop: 5 },
  progress: { color: "#166534", fontWeight: "700", marginTop: 8 },
  add: {
    backgroundColor: AppColor.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  addText: { color: "#fff", fontWeight: "800" },
  section: { marginTop: 22, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#172033" },
  sectionDescription: { color: "#64748b", marginTop: 4 },
  count: { color: "#475569", marginTop: 8, fontWeight: "700" },
  card: {
    width: "48%",
    margin: "1%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
  },
  image: { width: "100%", height: 150 },
  actions: { flexDirection: "row", justifyContent: "space-around", padding: 8 },
  action: { color: AppColor.primary, fontWeight: "700" },
  delete: { color: "#b91c1c" },
  previewBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.9)", justifyContent: "center" },
  previewImage: { width: "100%", height: "85%" },
  onboardingCard: { marginTop: 16, padding: 14, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12 },
  logoButton: { height: 120, marginTop: 10, borderRadius: 10, backgroundColor: AppColor.primary, alignItems: "center", justifyContent: "center" },
  logo: { width: "100%", height: "100%", resizeMode: "contain" },
  submitReview: { backgroundColor: "#166534", padding: 15, borderRadius: 12, alignItems: "center", marginTop: 24 },
  disabled: { opacity: 0.5 },
  requirement: { color: "#92400e", marginTop: 8, textAlign: "center" },
});
