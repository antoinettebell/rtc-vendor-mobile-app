import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
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
const normalizeStateAbbreviation = (value = "") => String(value).replace(/[^a-z]/gi, "").slice(0, 2).toUpperCase();
const formatStatus = (value) => String(value || "Pending").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const getOcrStatusText = (item = {}) => !item?.ocr_status ? "OCR: Pending" : `OCR: ${formatStatus(item.ocr_status)}${item.ocr_error_message ? ` - ${item.ocr_error_message}` : ""}`;
const getDocumentLifecycleText = (item = {}) => item?.review_status ? formatStatus(item.review_status) : ["queued", "processing"].includes(item?.ocr_status) ? "Pending Review" : item?.ocr_status === "completed" ? "Verified" : "Uploaded";
const getW9LifecycleText = (item = {}) => item?.verification_status === "PENDING" || ["queued", "processing"].includes(item?.ocr_status) ? "Pending Review" : item?.verification_status === "PASSED" ? "Verified" : item?.verification_status ? formatStatus(item.verification_status) : "Not signed";

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
  const [requestingVerification, setRequestingVerification] = useState(false);
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
      setRegistrationState(normalizeStateAbbreviation(next.registration_state));
      setBusinessAddress(next.business_address || "");
    }
  };
  const load = useCallback(async ({ background = false } = {}) => {
    // Polls must refresh the data in place. Toggling the full-screen loader
    // every five seconds makes an in-progress OCR review appear to blink.
    if (!background) setLoading(true);
    try { apply((await getEventVendorCompliance_API())?.data); }
    catch (error) { Alert.alert("Compliance", error?.message || "Unable to load compliance."); }
    finally { if (!background) setLoading(false); }
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

  // Match coordinator behavior: surface asynchronous OCR/provider outcomes
  // without requiring the vendor to navigate away and back.
  useEffect(() => {
    const required = partyType === "BUSINESS" ? "BUSINESS_LICENSE" : "DRIVER_LICENSE_FRONT";
    const uploaded = profile?.documents?.find((item) => item.document_type === required);
    const active = [uploaded?.ocr_status, session?.ocr_status].some((status) => ["queued", "processing"].includes(status)) || compliance?.external_verification?.status === "PENDING";
    if (!active) return undefined;
    const timer = setTimeout(() => load({ background: true }), 5000);
    return () => clearTimeout(timer);
  }, [compliance?.external_verification?.status, load, partyType, profile?.documents, session?.ocr_status]);

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
        registration_state: isBusiness ? registrationState.trim().toUpperCase() : null, business_address: isBusiness ? businessAddress.trim() : null,
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
    setRequestingVerification(true);
    try { await startEventVendorComplianceVerification_API(); await load(); }
    catch (error) { Alert.alert("Verification", error?.message || "Unable to start verification."); }
    finally { setRequestingVerification(false); }
  };
  const requiredType = partyType === "BUSINESS" ? "BUSINESS_LICENSE" : "DRIVER_LICENSE_FRONT";
  const uploaded = profile?.documents?.find((item) => item.document_type === requiredType);
  const verification = compliance?.external_verification || {};
  const verificationStatus = verification.status || "NOT_STARTED";
  const checksByType = Object.fromEntries((verification.checks || []).map((check) => [check.check_type, check]));
  const verificationChecks = [{ type: "TIN", label: "EIN Verification" }, { type: "SOS", label: "State Verification" }]
    .map((item) => ({ ...item, status: checksByType[item.type]?.status || "NOT_STARTED" }));
  const internalReady = (compliance?.requirements || []).filter((item) => !["EXTERNAL_IDENTITY_VERIFICATION", "COBALT_TIN", "COBALT_SOS"].includes(item.key)).every((item) => item.complete);
  const verificationDisabled = !internalReady || requestingVerification || verificationStatus === "PASSED";
  const openDocument = async (url) => {
    try {
      if (!url || !(await Linking.canOpenURL(url))) throw new Error("Document is unavailable.");
      await Linking.openURL(url);
    } catch (error) { Alert.alert("Compliance", error?.message || "Could not open the document."); }
  };
  if (loading) return <View style={s.loading}><ActivityIndicator color={AppColor.primary} /></View>;
  return <MarketplaceVendorScreenLayout title="Marketplace Vendor Compliance" onBack={() => navigation.goBack()}>
    <ScrollView contentContainerStyle={s.page}>
      <View style={[s.complianceCard, { borderColor: compliance?.score_color === "green" ? AppColor.primary : compliance?.score_color === "yellow" ? "#B77900" : "#F97316" }]}><View style={s.complianceHeader}><View style={s.complianceCopy}><Text style={s.title}>{compliance?.score_label || "Compliance"}</Text><Text style={s.copy}>{compliance?.remaining?.length ? `Remaining: ${compliance.remaining.join(" • ")}` : compliance ? "All currently applicable requirements are complete." : "Complete the required information below."}</Text></View><View style={s.scoreBadge}><Text style={s.scoreText}>{Number(compliance?.score || 0)}%</Text></View></View><View style={s.progressTrack}><View style={[s.progressFill, { width: `${Math.max(0, Math.min(100, Number(compliance?.score || 0)))}%` }]} /></View>{compliance?.provider_verification_pending ? <Text style={s.copy}>Documents are complete; identity verification is still pending.</Text> : null}</View>
      <View style={s.externalCard}><Text style={s.externalTitle}>External Verification</Text>{verification.provider === "COBALT" ? verificationChecks.map((check) => <View key={check.type} style={s.checkRow}><Text style={check.status === "PASSED" ? s.checkPassed : s.checkPending}>{check.status === "PASSED" ? "✓" : "□"}</Text><Text style={s.checkLabel}>{check.label}</Text><Text style={s.checkStatus}>{formatStatus(check.status)}</Text></View>) : <View style={s.checkRow}><Text style={verificationStatus === "PASSED" ? s.checkPassed : s.checkPending}>{verificationStatus === "PASSED" ? "✓" : "□"}</Text><Text style={s.checkLabel}>Identity Verification</Text><Text style={s.checkStatus}>{formatStatus(verificationStatus)}</Text></View>}</View>
      <Text style={s.label}>Account type</Text><View style={s.row}>{["BUSINESS", "INDIVIDUAL"].map((value) => <TouchableOpacity key={value} onPress={() => setPartyType(value)} style={[s.choice, partyType === value && s.choiceOn]}><Text style={partyType === value ? s.choiceTextOn : s.choiceText}>{value}</Text></TouchableOpacity>)}</View>
      <Text style={s.label}>Legal name *</Text><TextInput value={legalName} onChangeText={setLegalName} placeholder={`Legal Name must be exactly as printed on the ${partyType === "BUSINESS" ? "Business License" : "Driver License"}.`} placeholderTextColor="#526173" style={s.input} />
      {partyType === "BUSINESS" ? <><Text style={s.label}>DBA</Text><TextInput value={dbaName} onChangeText={setDbaName} style={s.input} /><Text style={s.label}>Entity type</Text><View style={s.row}>{entityTypes.map((value) => <TouchableOpacity key={value} onPress={() => setEntityType(value)} style={[s.choice, entityType === value && s.choiceOn]}><Text style={entityType === value ? s.choiceTextOn : s.choiceText}>{value.replaceAll("_", " ")}</Text></TouchableOpacity>)}</View><Text style={s.label}>State of registration *</Text><TextInput value={registrationState} onChangeText={(value) => setRegistrationState(normalizeStateAbbreviation(value))} autoCapitalize="characters" maxLength={2} style={s.input} /><Text style={s.label}>Business address *</Text><TextInput value={businessAddress} onChangeText={setBusinessAddress} style={s.input} /></> : null}
      <Text style={s.label}>{partyType === "BUSINESS" ? "EIN" : "SSN"} *</Text><TextInput value={taxId} onChangeText={setTaxId} keyboardType="number-pad" secureTextEntry placeholder={profile?.tax_id_masked || ""} placeholderTextColor="#526173" style={s.input} />
      {profile?.tax_id_masked ? <Text style={s.copy}>Saved {partyType === "BUSINESS" ? "EIN" : "SSN"}: {profile.tax_id_masked}</Text> : null}
      <View style={s.card}><Text style={s.label}>{partyType === "BUSINESS" ? "Business License" : "Driver License — Front Only"}</Text><Text style={s.copy}>Required before Marketplace Vendor participation can be verified.</Text><Text style={s.status}>{document ? `Ready to upload: ${document.name}` : uploaded ? getDocumentLifecycleText(uploaded) : "Not uploaded"}</Text>{uploaded ? <Text style={s.copy}>{getOcrStatusText(uploaded)}</Text> : null}{uploaded?.original_name ? <Text style={s.copy}>Uploaded: {uploaded.original_name}</Text> : null}{uploaded?.file_url ? <TouchableOpacity style={s.secondary} onPress={() => openDocument(uploaded.file_url)}><Text style={s.secondaryText}>Open</Text></TouchableOpacity> : null}<TouchableOpacity style={s.secondary} onPress={chooseDocument}><Text style={s.secondaryText}>{uploaded || document ? "Replace Document" : "Choose Document"}</Text></TouchableOpacity></View>
      <View style={s.card}><Text style={s.label}>Signed W-9</Text><Text style={s.copy}>Required before Marketplace Vendor participation can be verified.</Text><View style={s.infoRow}><Ionicons name="information-circle-outline" size={18} color={AppColor.primary} /><Text style={s.infoText}>Individual Name and Business Name must be exactly as printed on the Business License or Driver License.</Text></View><Text style={s.status}>{session?.status === "SIGNED" ? getW9LifecycleText(session) : session?.status === "SENT" ? "Waiting for DocuSign signature confirmation" : "Not signed"}</Text>{session?.status === "SIGNED" ? <Text style={s.copy}>{getOcrStatusText(session)}</Text> : null}{session?.signed_document_url ? <TouchableOpacity style={s.secondary} onPress={() => openDocument(session.signed_document_url)}><Text style={s.secondaryText}>Open</Text></TouchableOpacity> : null}<TouchableOpacity style={s.secondary} onPress={startW9}><Text style={s.secondaryText}>{session ? "Replace W-9" : "Sign W-9"}</Text></TouchableOpacity></View>
      <TouchableOpacity style={s.primary} disabled={saving} onPress={save}><Text style={s.primaryText}>{saving ? "Saving…" : "Save & Run OCR"}</Text></TouchableOpacity>
      <TouchableOpacity style={[s.primary, verificationDisabled && s.disabled]} disabled={verificationDisabled} onPress={verify}><Text style={s.primaryText}>{requestingVerification ? "Verifying…" : verificationStatus === "PENDING" ? "Verification Pending" : verificationStatus === "PASSED" ? "Verification Complete" : "Verification"}</Text></TouchableOpacity>
    </ScrollView>
  </MarketplaceVendorScreenLayout>;
}
const s = StyleSheet.create({ loading:{flex:1,alignItems:"center",justifyContent:"center"}, page:{padding:20,paddingBottom:50}, card:{borderWidth:1,borderColor:"#d7dee8",borderRadius:12,padding:14,marginTop:14}, complianceCard:{borderWidth:2,borderRadius:14,padding:16,marginBottom:18},complianceHeader:{flexDirection:"row",alignItems:"center",gap:12},complianceCopy:{flex:1},scoreBadge:{width:58,height:58,borderRadius:29,alignItems:"center",justifyContent:"center",backgroundColor:AppColor.primary},scoreText:{color:"#fff",fontWeight:"800"},progressTrack:{height:8,borderRadius:4,backgroundColor:"#e5e7eb",overflow:"hidden",marginTop:8},progressFill:{height:"100%",borderRadius:4,backgroundColor:AppColor.primary},externalCard:{borderWidth:1,borderColor:"#d7dee8",borderRadius:12,padding:14,marginBottom:18},externalTitle:{fontWeight:"800",color:"#172033",fontSize:17,marginBottom:10},checkRow:{flexDirection:"row",alignItems:"center",gap:8,marginTop:7},checkPassed:{color:AppColor.primary,fontWeight:"800",fontSize:19},checkPending:{color:"#64748B",fontSize:19},checkLabel:{flex:1,color:"#172033",fontWeight:"700"},checkStatus:{color:"#526173"},pill:{alignSelf:"flex-end",backgroundColor:"#64748B",borderRadius:14,paddingHorizontal:10,paddingVertical:5},pillText:{color:"#fff",fontWeight:"700",fontSize:12}, title:{fontSize:20,fontWeight:"800",color:"#172033"}, copy:{color:"#526173",marginTop:6}, infoRow:{flexDirection:"row",gap:6,alignItems:"flex-start",marginTop:10},infoText:{color:"#526173",fontSize:13,lineHeight:19,flex:1}, status:{color:AppColor.primary,fontWeight:"800",marginTop:10}, label:{fontWeight:"700",color:"#172033",marginTop:16,marginBottom:7}, input:{borderWidth:1,borderColor:"#cbd5e1",borderRadius:10,padding:12,color:"#172033"}, row:{flexDirection:"row",gap:8,flexWrap:"wrap"}, choice:{borderWidth:1,borderColor:"#cbd5e1",borderRadius:18,paddingHorizontal:10,paddingVertical:8}, choiceOn:{backgroundColor:AppColor.primary,borderColor:AppColor.primary}, choiceText:{color:"#172033",fontSize:12}, choiceTextOn:{color:"#fff",fontWeight:"700",fontSize:12}, primary:{backgroundColor:AppColor.primary,borderRadius:12,padding:15,alignItems:"center",marginTop:14}, disabled:{opacity:.5}, primaryText:{color:"#fff",fontWeight:"800"}, secondary:{borderWidth:1,borderColor:AppColor.primary,borderRadius:10,padding:11,alignItems:"center",marginTop:10}, secondaryText:{color:AppColor.primary,fontWeight:"800"} });
