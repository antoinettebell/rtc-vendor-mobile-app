import React, { useCallback, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { getOperationalComplianceForms_API } from "../api/appAPI";
import { AppColor } from "../utils/theme";

const TYPES = [
  { type: "INVENTORY", title: "Inventory", detail: "Food inventory and reorder quantities", icon: "inventory-2" },
  { type: "OPENING_CHECKLIST", title: "Opening Checklist", detail: "Complete before opening the truck", icon: "wb-sunny" },
  { type: "CLOSING_CHECKLIST", title: "Closing Checklist", detail: "Complete before leaving", icon: "nightlight-round" },
];

const OperationsScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.userReducer);
  const isEmployee = user?.userType === "EMPLOYEE" || user?.role === "EMPLOYEE";
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState([]);
  const [archived, setArchived] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getOperationalComplianceForms_API();
      const forms = response?.data?.forms || response?.forms;
      if (!Array.isArray(forms)) {
        throw new Error("Operations returned an invalid response.");
      }
      setSubmitted(forms.filter((item) => item.status === "SUBMITTED"));
      setArchived(forms.filter((item) => item.status === "ARCHIVED"));
    } catch (loadError) {
      setSubmitted([]);
      setArchived([]);
      setError(loadError?.message || "Unable to load operations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = (type, formId) => navigation.navigate("operationalFormScreen", { type, formId });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><MaterialIcons name="arrow-back" size={27} color="#0F172A" /></TouchableOpacity>
        <Text style={styles.title}>Operations</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {TYPES.map((item) => (
          <TouchableOpacity key={item.type} style={styles.card} onPress={() => open(item.type)}>
            <MaterialIcons name={item.icon} size={27} color={AppColor.primary} />
            <View style={styles.copy}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.detail}>{item.detail}</Text></View>
            <MaterialIcons name="chevron-right" size={25} color="#64748B" />
          </TouchableOpacity>
        ))}

        {error ? (
          <View style={styles.errorCard}>
            <MaterialIcons name="error-outline" size={28} color="#B42318" />
            <Text style={styles.errorTitle}>Operations could not load</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Submitted for Review</Text>
        {loading ? <ActivityIndicator color={AppColor.primary} /> : error ? null : submitted.length ? submitted.map((form) => (
          <TouchableOpacity key={form._id} style={styles.record} onPress={() => open(form.form_type, form._id)}>
            <Text style={styles.recordTitle}>{TYPES.find((x) => x.type === form.form_type)?.title}</Text>
            <Text style={styles.detail}>{new Date(form.submitted_at).toLocaleString()}</Text>
          </TouchableOpacity>
        )) : <Text style={styles.empty}>No submitted forms.</Text>}

        {!isEmployee ? <Text style={styles.sectionTitle}>Archive</Text> : null}
        {!isEmployee && !error && archived.map((form) => (
          <TouchableOpacity key={form._id} style={styles.record} onPress={() => open(form.form_type, form._id)}>
            <View><Text style={styles.recordTitle}>{TYPES.find((x) => x.type === form.form_type)?.title}</Text><Text style={styles.detail}>{new Date(form.archived_at).toLocaleString()}</Text></View>
            <MaterialIcons name="image" size={22} color="#64748B" />
          </TouchableOpacity>
        ))}
        {!isEmployee && !loading && !error && !archived.length ? <Text style={styles.empty}>No archived forms.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { alignItems: "center", backgroundColor: "white", borderBottomColor: "#E2E8F0", borderBottomWidth: 1, flexDirection: "row", gap: 16, padding: 18 },
  title: { color: "#0F172A", fontSize: 24, fontWeight: "700" },
  content: { padding: 18, paddingBottom: 40 },
  card: { alignItems: "center", backgroundColor: "white", borderColor: "#E2E8F0", borderRadius: 14, borderWidth: 1, flexDirection: "row", marginBottom: 12, padding: 16 },
  copy: { flex: 1, marginLeft: 14 },
  cardTitle: { color: "#0F172A", fontSize: 17, fontWeight: "700" },
  detail: { color: "#64748B", fontSize: 13, marginTop: 3 },
  sectionTitle: { color: "#334155", fontSize: 16, fontWeight: "700", marginBottom: 10, marginTop: 22 },
  record: { alignItems: "center", backgroundColor: "white", borderRadius: 10, flexDirection: "row", justifyContent: "space-between", marginBottom: 9, padding: 14 },
  recordTitle: { color: "#0F172A", fontSize: 15, fontWeight: "600" },
  empty: { color: "#64748B", fontSize: 14 },
  errorCard: { alignItems: "center", backgroundColor: "#FEF3F2", borderColor: "#FDA29B", borderRadius: 12, borderWidth: 1, marginTop: 8, padding: 18 },
  errorTitle: { color: "#912018", fontSize: 16, fontWeight: "700", marginTop: 8 },
  errorText: { color: "#B42318", fontSize: 13, marginTop: 4, textAlign: "center" },
  retryButton: { backgroundColor: AppColor.primary, borderRadius: 8, marginTop: 12, paddingHorizontal: 22, paddingVertical: 10 },
  retryText: { color: "white", fontSize: 14, fontWeight: "700" },
});

export default OperationsScreen;
