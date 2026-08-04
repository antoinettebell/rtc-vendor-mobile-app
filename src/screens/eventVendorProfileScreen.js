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
import { useSelector } from "react-redux";
import {
  getEventVendorProfile_API,
  saveEventVendorProfile_API,
  uploadEventVendorLogo_API,
} from "../api/appAPI";
import { AppColor } from "../utils/theme";

const TYPES = ["MERCHANDISE", "SERVICE", "OTHER"];
export default function EventVendorProfileScreen({ navigation }) {
  const user = useSelector((state) => state.userReducer.user);
  const [profile, setProfile] = useState(null);
  const [businessName, setBusinessName] = useState(
    user?.eventVendorBusinessName || "",
  );
  const [description, setDescription] = useState("");
  const [vendorTypes, setVendorTypes] = useState([]);
  const [links, setLinks] = useState(["", ""]);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const response = await getEventVendorProfile_API().catch(() => null);
    const value = response?.data?.eventVendorProfile;
    if (value) {
      setProfile(value);
      setBusinessName(value.business_name || "");
      setDescription(value.business_description || "");
      setVendorTypes(value.vendor_types || []);
      setLinks([...(value.social_links || []), "", ""].slice(0, 2));
    }
  }, []);
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
      });
      setProfile(response?.data?.eventVendorProfile);
      Alert.alert("Profile", "Marketplace Vendor profile saved.");
    } catch (e) {
      Alert.alert("Profile", e?.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };
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
      setProfile(response?.data?.eventVendorProfile);
    } catch (e) {
      if (e?.code !== "E_PICKER_CANCELLED")
        Alert.alert("Logo", e?.message || "Unable to upload logo.");
    }
  };
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.heading}>Marketplace Vendor Profile</Text>
      <Text style={s.sub}>
        Merchandise, artisans, services, nonprofits, and exhibitors.
      </Text>
      <TouchableOpacity style={s.logoButton} onPress={uploadLogo}>
        {profile?.logo_url ? (
          <Image source={{ uri: profile.logo_url }} style={s.logo} />
        ) : (
          <Text style={s.buttonText}>Add Business Logo</Text>
        )}
      </TouchableOpacity>
      <Text style={s.label}>Type of Vendor *</Text>
      <View style={s.types}>
        {TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => toggleType(type)}
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
      />
      <Text style={s.label}>Brief description of what you sell *</Text>
      <TextInput
        style={[s.input, s.area]}
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={300}
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
            onChangeText={(value) =>
              setLinks((current) =>
                current.map((item, i) => (i === index ? value : item)),
              )
            }
          />
        </View>
      ))}
      <TouchableOpacity
        style={s.secondary}
        onPress={() => navigation.navigate("eventVendorPhotosScreen")}
      >
        <Text style={s.secondaryText}>Photo Repository (up to 10)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.primary} onPress={save} disabled={saving}>
        <Text style={s.buttonText}>{saving ? "Saving…" : "Save Profile"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { padding: 20, paddingBottom: 60, backgroundColor: "#fff" },
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
