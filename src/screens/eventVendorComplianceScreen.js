import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import DocumentPicker, { types } from "react-native-document-picker";
import ImagePicker from "react-native-image-crop-picker";
import { RESULTS } from "react-native-permissions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppColor } from "../utils/theme";
import MarketplaceVendorScreenLayout from "../components/MarketplaceVendorScreenLayout";
import usePermission from "../hooks/usePermission";
import { permission } from "../helpers/permission.helper";
import {
  completeEventVendorW9Signing_API,
  getEventVendorCompliance_API,
  saveEventVendorComplianceProfile_API,
  startEventVendorComplianceVerification_API,
  startEventVendorW9Signing_API,
  submitEventVendorComplianceOcr_API,
  uploadEventVendorComplianceDocument_API,
} from "../api/appAPI";

const entityTypes = ["SOLE_PROPRIETOR", "LLC", "CORPORATION", "PARTNERSHIP", "S_CORPORATION"];
const W9_SIGNING_STORAGE_KEY = "marketplace-vendor-compliance-w9-envelope";

export default function EventVendorComplianceScreen({ navigation }) {
  const { checkAndRequestPermission: cameraPermissionStatus } = usePermission(permission.camera);
  const { checkAndRequestPermission: photosPermissionStatus } = usePermission(permission.photos);
  const [profile, setProfile] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [session, setSession] = useState(null);
  const [partyType, setPartyType] = useState("BUSINESS");
  const [legalName, setLegalName] = useState("");
  const [dbaName, setDbaName] = useState("");
  const [entityType, setEntityType] = useState("LLC");
  const [registrationState, setRegistrationState] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const pendingW9EnvelopeRef = useRef(null);
  const completingW9Ref = useRef(false);

  const apply = (data) => {
    const next = data?.profile || null;
    setProfile(next);
    setCompliance(data?.compliance || null);
    setSession(data?.w9_session || null);
    if (next) {
      setPartyType(next.party_type || "BUSINESS");
      setLegalName(next.legal_name || "");
      setDbaName(next.dba_name || "");
      setEntityType(next.entity_type || "LLC");
      setRegistrationState(next.registration_state || "");
      setBusinessAddress(next.business_address || "");
    }
  };
  const load = useCallback(async () => {
    setLoading(true);
    try { apply((await getEventVendorCompliance_API())?.data); }
    catch (error) { Alert.alert("Compliance", error?.message || "Unable to load compliance."); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const completeW9Signing = useCallback(async (envelopeId, { quiet = false } = {}) => {
    if (!envelopeId || completingW9Ref.current) return false;
    completingW9Ref.current = true;
    try {
      const response = await completeEventVendorW9Signing_API(envelopeId);
      if (!response?.success) throw new Error(response?.message || "DocuSign has not confirmed the signed W-9 yet.");
      setSession(response?.data?.w9_session || null);
      pendingW9EnvelopeRef.current = null;
      await AsyncStorage.removeItem(W9_SIGNING_STORAGE_KEY);
      await load();
      if (!quiet) Alert.alert("W-9 Submitted", "Your signed W-9 was received and submitted for verification.");
      return true;
    } catch (error) {
      if (!quiet && error?.code !== 409) Alert.alert("W-9", error?.message || "Unable to receive the signed W-9.");
      return false;
    } finally {
      completingW9Ref.current = false;
    }
  }, [load]);

  useEffect(() => {
    const reconcilePendingW9 = async ({ quiet = true } = {}) => {
      const stored = await AsyncStorage.getItem(W9_SIGNING_STORAGE_KEY);
      let envelopeId = pendingW9EnvelopeRef.current;
      if (!envelopeId && stored) {
        try { envelopeId = JSON.parse(stored)?.envelope_id || null; } catch (_) { envelopeId = null; }
      }
      if (!envelopeId && session?.status === "SENT") envelopeId = session.envelope_id;
      if (envelopeId) await completeW9Signing(envelopeId, { quiet });
    };
    const handleUrl = ({ url }) => {
      if (String(url || "").includes("docusign/return")) reconcilePendingW9({ quiet: false });
    };
    const linkSubscription = Linking.addEventListener("url", handleUrl);
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") reconcilePendingW9({ quiet: true });
    });
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
      else reconcilePendingW9({ quiet: true });
    });
    return () => { linkSubscription.remove(); appStateSubscription.remove(); };
  }, [completeW9Signing, session?.envelope_id, session?.status]);

  const setImageDocument = (image) => {
    setDocument({
      uri: image.path,
      name: image.filename || `${partyType === "BUSINESS" ? "BUSINESS_LICENSE" : "DRIVER_LICENSE_FRONT"}.jpg`,
      type: image.mime || "image/jpeg",
    });
  };
  const chooseFile = async () => {
    try {
      const [file] = await DocumentPicker.pick({ type: [types.pdf, types.images], allowMultiSelection: false });
      setDocument({ uri: file.uri, name: file.name || "compliance-document", type: file.type || "application/octet-stream" });
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) Alert.alert("Document", error?.message || "Unable to choose document.");
    }
  };
  const choosePhoto = async () => {
    try {
      if ((await photosPermissionStatus()) !== RESULTS.GRANTED) return;
      setImageDocument(await ImagePicker.openPicker({ cropping: false, mediaType: "photo", forceJpg: true }));
    } catch (error) {
      if (error?.code !== "E_PICKER_CANCELLED") Alert.alert("Document", error?.message || "Unable to choose photo.");
    }
  };
  const takePhoto = async () => {
    try {
      if ((await cameraPermissionStatus()) !== RESULTS.GRANTED) return;
      setImageDocument(await ImagePicker.openCamera({ cropping: false, mediaType: "photo", forceJpg: true }));
    } catch (error) {
      if (error?.code !== "E_PICKER_CANCELLED") Alert.alert("Document", error?.message || "Unable to take photo.");
    }
  };
  const chooseDocument = () => Alert.alert(
    partyType === "BUSINESS" ? "Upload Business License" : "Upload Driver License",
    "Choose how to add the document.",
    [
      { text: "Photo Library", onPress: choosePhoto },
      { text: "Camera", onPress: takePhoto },
      { text: "Files", onPress: chooseFile },
      { text: "Cancel", style: "cancel" },
    ],
  );
  const save = async () => {
    const isBusiness = partyType === "BUSINESS";
    if (!legalName.trim()) return Alert.alert("Compliance", "Enter the legal name.");
    if (taxId && !taxId.replace(/\D/g, "").match(/^\d{9}$/)) return Alert.alert("Compliance", `Enter a nine-digit ${isBusiness ? "EIN" : "SSN"}.`);
    if (!taxId && !profile?.tax_id_masked) return Alert.alert("Compliance", `Enter a nine-digit ${isBusiness ? "EIN" : "SSN"}.`);
    if (isBusiness && (!registrationState.trim() || !businessAddress.trim())) return Alert.alert("Compliance", "Business address and state of registration are required.");
    setSaving(true);
    try {
      const saved = await saveEventVendorComplianceProfile_API({
        party_type: partyType, legal_name: legalName.trim(), dba_name: dbaName.trim(), entity_type: isBusiness ? entityType : null,
        registration_state: isBusiness ? registrationState.trim() : null, business_address: isBusiness ? businessAddress.trim() : null,
        ...(taxId ? { tax_id_type: isBusiness ? "EIN" : "SSN", tax_id: taxId.replace(/\D/g, "") } : {}),
      });
      if (document) {
        const body = new FormData();
        body.append("document_type", isBusiness ? "BUSINESS_LICENSE" : "DRIVER_LICENSE_FRONT");
        body.append("file", document);
        await uploadEventVendorComplianceDocument_API(body);
        setDocument(null);
      }
      await submitEventVendorComplianceOcr_API();
      apply((await getEventVendorCompliance_API())?.data);
      setTaxId("");
      Alert.alert("Compliance", saved?.message || "Compliance information saved and submitted for review.");
    } catch (error) { Alert.alert("Compliance", error?.message || "Unable to save compliance."); }
    finally { setSaving(false); }
  };
  const startW9 = async () => {
    if (!profile?.tax_id_masked) {
      return Alert.alert("W-9", "Save your legal name and nine-digit EIN or SSN before starting DocuSign.");
    }
    try {
      const response = await startEventVendorW9Signing_API();
      const envelopeId = response?.data?.envelope_id;
      const next = response?.data?.w9_session;
      const signingUrl = response?.data?.signing_url;
      if (!envelopeId || !signingUrl) throw new Error("DocuSign signing link is unavailable.");
      setSession(next);
      pendingW9EnvelopeRef.current = envelopeId;
      await AsyncStorage.setItem(W9_SIGNING_STORAGE_KEY, JSON.stringify({ envelope_id: envelopeId, started_at: new Date().toISOString() }));
      await Linking.openURL(signingUrl);
    } catch (error) { Alert.alert("W-9", error?.message || "Unable to start DocuSign."); }
  };
  const verify = async () => {
    const incompleteInternal = (compliance?.requirements || []).filter((item) => ![
      "EXTERNAL_IDENTITY_VERIFICATION", "COBALT_TIN", "COBALT_SOS",
    ].includes(item.key) && !item.complete);
    if (incompleteInternal.length) {
      return Alert.alert("Verification", `Complete ${incompleteInternal.map((item) => item.label).join(", ")} before verification.`);
    }
    try { await startEventVendorComplianceVerification_API(); await load(); }
    catch (error) { Alert.alert("Verification", error?.message || "Unable to start verification."); }
  };
  const requiredType = partyType === "BUSINESS" ? "BUSINESS_LICENSE" : "DRIVER_LICENSE_FRONT";
  const uploaded = profile?.documents?.find((item) => item.document_type === requiredType);
  if (loading) return <View style={s.loading}><ActivityIndicator color={AppColor.primary} /></View>;
  return <MarketplaceVendorScreenLayout title="Marketplace Vendor Compliance" onBack={() => navigation.goBack()}>
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.card}><Text style={s.title}>Compliance {compliance?.score || 0}/100</Text><Text style={s.copy}>Complete compliance is required before event applications and general-purchase checkout.</Text></View>
      <Text style={s.label}>Account type</Text><View style={s.row}>{["BUSINESS", "INDIVIDUAL"].map((value) => <TouchableOpacity key={value} onPress={() => setPartyType(value)} style={[s.choice, partyType === value && s.choiceOn]}><Text style={partyType === value ? s.choiceTextOn : s.choiceText}>{value}</Text></TouchableOpacity>)}</View>
      <Text style={s.label}>Legal name *</Text><TextInput value={legalName} onChangeText={setLegalName} style={s.input} />
      {partyType === "BUSINESS" ? <><Text style={s.label}>DBA</Text><TextInput value={dbaName} onChangeText={setDbaName} style={s.input} /><Text style={s.label}>Entity type</Text><View style={s.row}>{entityTypes.map((value) => <TouchableOpacity key={value} onPress={() => setEntityType(value)} style={[s.choice, entityType === value && s.choiceOn]}><Text style={entityType === value ? s.choiceTextOn : s.choiceText}>{value.replaceAll("_", " ")}</Text></TouchableOpacity>)}</View><Text style={s.label}>State of registration *</Text><TextInput value={registrationState} onChangeText={setRegistrationState} maxLength={2} style={s.input} /><Text style={s.label}>Business address *</Text><TextInput value={businessAddress} onChangeText={setBusinessAddress} style={s.input} /></> : null}
      <Text style={s.label}>{partyType === "BUSINESS" ? "EIN" : "SSN"} *</Text><TextInput value={taxId} onChangeText={setTaxId} keyboardType="number-pad" secureTextEntry placeholder={profile?.tax_id_masked || ""} placeholderTextColor="#526173" style={s.input} />
      {profile?.tax_id_masked ? <Text style={s.copy}>Saved {partyType === "BUSINESS" ? "EIN" : "SSN"}: {profile.tax_id_masked}</Text> : null}
      <View style={s.card}><Text style={s.label}>{partyType === "BUSINESS" ? "Business License" : "Driver License — Front Only"}</Text><Text style={s.copy}>{document ? document.name : uploaded ? "Uploaded" : "Required"}</Text><TouchableOpacity style={s.secondary} onPress={chooseDocument}><Text style={s.secondaryText}>{uploaded || document ? "Replace Document" : "Choose Document"}</Text></TouchableOpacity></View>
      <View style={s.card}><Text style={s.label}>Signed W-9</Text><Text style={s.copy}>{session?.status === "SIGNED" ? "Signed; verification in progress." : session?.status === "SENT" ? "Waiting for DocuSign signature confirmation." : "Required for Marketplace Vendor participation."}</Text><TouchableOpacity style={s.secondary} onPress={startW9}><Text style={s.secondaryText}>{session ? "Replace W-9" : "Sign W-9"}</Text></TouchableOpacity></View>
      <TouchableOpacity style={s.primary} disabled={saving} onPress={save}><Text style={s.primaryText}>{saving ? "Saving…" : "Save & Run OCR"}</Text></TouchableOpacity>
      <TouchableOpacity style={s.primary} onPress={verify}><Text style={s.primaryText}>Run Verification</Text></TouchableOpacity>
    </ScrollView>
  </MarketplaceVendorScreenLayout>;
}
const s = StyleSheet.create({ loading:{flex:1,alignItems:"center",justifyContent:"center"}, page:{padding:20,paddingBottom:50}, card:{borderWidth:1,borderColor:"#d7dee8",borderRadius:12,padding:14,marginTop:14}, title:{fontSize:20,fontWeight:"800",color:"#172033"}, copy:{color:"#526173",marginTop:6}, label:{fontWeight:"700",color:"#172033",marginTop:16,marginBottom:7}, input:{borderWidth:1,borderColor:"#cbd5e1",borderRadius:10,padding:12,color:"#172033"}, row:{flexDirection:"row",gap:8,flexWrap:"wrap"}, choice:{borderWidth:1,borderColor:"#cbd5e1",borderRadius:18,paddingHorizontal:10,paddingVertical:8}, choiceOn:{backgroundColor:AppColor.primary,borderColor:AppColor.primary}, choiceText:{color:"#172033",fontSize:12}, choiceTextOn:{color:"#fff",fontWeight:"700",fontSize:12}, primary:{backgroundColor:AppColor.primary,borderRadius:12,padding:15,alignItems:"center",marginTop:14}, primaryText:{color:"#fff",fontWeight:"800"}, secondary:{borderWidth:1,borderColor:AppColor.primary,borderRadius:10,padding:11,alignItems:"center",marginTop:10}, secondaryText:{color:AppColor.primary,fontWeight:"800"} });
