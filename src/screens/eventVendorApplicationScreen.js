import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getEventVendorPhotos_API,
  getEventVendorProfile_API,
  returnMarketplaceVendorAgreement_API,
  startMarketplaceVendorAgreementSigning_API,
  submitEventVendorApplication_API,
} from "../api/appAPI";
import { AppColor } from "../utils/theme";
export default function EventVendorApplicationScreen({ navigation, route }) {
  const event = route.params.event;
  const [profile, setProfile] = useState(null);
  const [photos, setPhotos] = useState([]);
  const pendingAgreementRef = useRef(null);
  const [selected, setSelected] = useState([]);
  const [types, setTypes] = useState([]);
  const [bullets, setBullets] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [electricity, setElectricity] = useState(null);
  const [feeAck, setFeeAck] = useState(false);
  useEffect(() => {
    Promise.all([
      getEventVendorProfile_API(),
      getEventVendorPhotos_API(),
    ]).then(([p, x]) => {
      setProfile(p?.data?.eventVendorProfile);
      setPhotos(x?.data?.photoList || []);
    });
  }, []);
  const eligible = (event.event_vendor_needs || []).filter((n) =>
    profile?.vendor_types?.includes(n.vendor_type),
  );
  const toggle = (v, setter, list) =>
    setter(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const submitApplication = async () => {
    try {
      await submitEventVendorApplication_API(event.event_id, {
        vendor_types: types,
        photo_ids: selected,
        offering_bullets: bullets
          .split("\n")
          .map((x) => x.replace(/^[-•]\s*/, "").trim())
          .filter(Boolean),
        average_price: Number(price),
        additional_notes: notes,
        electricity_required: electricity,
        electricity_fee_acknowledged: feeAck,
      });
      Alert.alert(
        "Application Submitted",
        "Your application was submitted to the coordinator.",
        [{ text: "Done", onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      Alert.alert("Application", e?.message || "Unable to submit application.");
    }
  };
  const startSigningAndSubmit = async () => {
    try {
      const response = await startMarketplaceVendorAgreementSigning_API({
        event_id: event.event_id,
        return_url: "rounddacornervendor://docusign/return?status=completed",
      });
      if (response?.data?.already_signed) {
        await submitApplication();
        return;
      }
      pendingAgreementRef.current = response?.data?.marketplaceVendorAgreement;
      if (!response?.data?.signing_url) throw new Error("DocuSign signing URL was not returned.");
      await Linking.openURL(response.data.signing_url);
    } catch (e) {
      Alert.alert("Marketplace Agreements", e?.message || "Unable to start signing.");
    }
  };
  useEffect(() => {
    const handleReturn = async ({ url }) => {
      const agreement = pendingAgreementRef.current;
      if (!agreement?.agreement_id) return;
      const value = String(url || "");
      const status = value.includes("signing_complete") || value.includes("completed")
        ? "completed"
        : value.includes("decline") ? "declined" : value.includes("cancel") ? "cancelled" : "error";
      try {
        const response = await returnMarketplaceVendorAgreement_API({ agreement_id: agreement.agreement_id, status });
        pendingAgreementRef.current = null;
        if (response?.data?.marketplaceVendorAgreement?.status === "SIGNED") await submitApplication();
        else Alert.alert("Signature Required", "Both Marketplace agreements must be signed before submission.");
      } catch (e) {
        pendingAgreementRef.current = null;
        Alert.alert("Marketplace Agreements", e?.message || "Unable to confirm signing.");
      }
    };
    const subscription = Linking.addEventListener("url", handleReturn);
    return () => subscription.remove();
  });
  return (
    <ScrollView contentContainerStyle={s.page}>
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
      <View style={s.grid}>
        {photos.map((p) => (
          <TouchableOpacity
            key={p.photo_id}
            style={[s.photoWrap, selected.includes(p.photo_id) && s.photoOn]}
            onPress={() =>
              selected.includes(p.photo_id) || selected.length < 5
                ? toggle(p.photo_id, setSelected, selected)
                : null
            }
          >
            <Image source={{ uri: p.file_url }} style={s.photo} />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.label}>Products / Services Offered *</Text>
      <Text style={s.help}>Enter one bullet item per line.</Text>
      <TextInput
        style={[s.input, s.area]}
        multiline
        value={bullets}
        onChangeText={setBullets}
      />
      <Text style={s.label}>Average Price *</Text>
      <TextInput
        style={s.input}
        keyboardType="decimal-pad"
        value={price}
        onChangeText={setPrice}
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
      <TouchableOpacity style={s.submit} onPress={startSigningAndSubmit}>
        <Text style={s.submitText}>Sign Agreements &amp; Submit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { padding: 18, paddingBottom: 60, backgroundColor: "#fff" },
  heading: { fontSize: 25, fontWeight: "800", color: "#172033" },
  meta: { color: "#64748b", marginTop: 5 },
  label: {
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 7,
    color: "#172033",
  },
  help: { color: "#64748b", marginBottom: 6 },
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
  agreementNotice: { marginTop: 18, color: "#475569", lineHeight: 20 },
});
