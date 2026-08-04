import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import ImagePicker from "react-native-image-crop-picker";
import {
  getEventVendorPhotos_API,
  removeEventVendorPhoto_API,
  uploadEventVendorPhoto_API,
} from "../api/appAPI";
import { AppColor } from "../utils/theme";

export default function EventVendorPhotosScreen() {
  const [photos, setPhotos] = useState([]);
  const load = useCallback(async () => {
    const response = await getEventVendorPhotos_API();
    setPhotos(response?.data?.photoList || []);
  }, []);
  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load]),
  );
  const add = async () => {
    try {
      if (photos.length >= 10)
        return Alert.alert(
          "Photos",
          "Your repository already contains 10 photos.",
        );
      const image = await ImagePicker.openPicker({ mediaType: "photo" });
      const form = new FormData();
      form.append("file", {
        uri: image.path,
        name: image.filename || `product-${Date.now()}.jpg`,
        type: image.mime || "image/jpeg",
      });
      await uploadEventVendorPhoto_API(form);
      await load();
    } catch (e) {
      if (e?.code !== "E_PICKER_CANCELLED")
        Alert.alert("Photos", e?.message || "Unable to upload photo.");
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
            await removeEventVendorPhoto_API(photo.photo_id);
            await load();
          },
        },
      ],
    );
  return (
    <View style={s.page}>
      <Text style={s.heading}>Photo Repository</Text>
      <Text style={s.sub}>
        {photos.length}/10 photos · Select up to 5 when applying to an event.
      </Text>
      <TouchableOpacity style={s.add} onPress={add}>
        <Text style={s.addText}>Add Photo</Text>
      </TouchableOpacity>
      <FlatList
        data={photos}
        numColumns={2}
        keyExtractor={(item) => item.photo_id}
        contentContainerStyle={{ paddingTop: 14 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onLongPress={() => remove(item)}>
            <Image source={{ uri: item.file_url }} style={s.image} />
            <Text style={s.remove}>Press and hold to remove</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, padding: 18, backgroundColor: "#fff" },
  heading: { fontSize: 26, fontWeight: "800", color: "#172033" },
  sub: { color: "#64748b", marginTop: 5 },
  add: {
    backgroundColor: AppColor.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  addText: { color: "#fff", fontWeight: "800" },
  card: {
    width: "48%",
    margin: "1%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
  },
  image: { width: "100%", height: 150 },
  remove: { fontSize: 11, color: "#64748b", padding: 8, textAlign: "center" },
});
