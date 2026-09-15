import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { discardEmployeeInventoryDraft_API, getOperationalComplianceForms_API, reviewEmployeeInventory_API } from "../api/appAPI";
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
  const [employeeInventory, setEmployeeInventory] = useState([]);
  const [error, setError] = useState("");
  const [reviewingId, setReviewingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getOperationalComplianceForms_API();
      const forms = response?.data?.forms || response?.forms;
      if (!Array.isArray(forms)) {
        throw new Error("Operations returned an invalid response.");
      }
      setEmployeeInventory(forms.filter((item) => (
        item.form_type === "INVENTORY" &&
        ["DRAFT", "SUBMITTED"].includes(item.status) &&
        item.employee_internal_id &&
        !item.inventory_review_action
      )));
    } catch (loadError) {
      setEmployeeInventory([]);
      setError(loadError?.message || "Unable to load operations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = (type, formId, startEditing = false) => navigation.navigate("operationalFormScreen", { type, formId, startEditing, reviewMode: !!formId && type === "INVENTORY" });
  const review = (form, action) => Alert.alert(
    action === "ARCHIVED" ? "Archive Employee Inventory" : "Close Inventory",
    action === "ARCHIVED"
      ? "Do you want to remove these submitted items from current inventory?"
      : "Are you sure you want to close this employee inventory review into current inventory?",
    [
      { text: "No", style: "cancel" },
      { text: "Yes", onPress: async () => {
        try {
          setReviewingId(form._id);
          await reviewEmployeeInventory_API(form._id, { action });
          await load();
        } catch (caught) {
          Alert.alert("Employee Inventory Review", caught?.message || "Unable to review this inventory submission.");
        } finally {
          setReviewingId("");
        }
      } },
    ],
  );

  const discardDraft = (form) => Alert.alert(
    "Discard Draft",
    `Discard ${form.prepared_by_name || "this employee"}'s inventory draft? This cannot be undone.`,
    [
      { text: "Cancel", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: async () => {
        try {
          setReviewingId(form._id);
          await discardEmployeeInventoryDraft_API(form._id);
          await load();
        } catch (caught) {
          Alert.alert("Employee Inventory Review", caught?.message || "Unable to discard this inventory draft.");
        } finally {
          setReviewingId("");
        }
      } },
    ],
  );

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

        {!isEmployee ? <Text style={styles.sectionTitle}>Employee Inventory Review</Text> : null}
        {!isEmployee ? <Text style={styles.sectionCopy}>Draft counts are visible as read-only while employees work. Review actions become available after submission.</Text> : null}
        {!isEmployee && loading ? <ActivityIndicator color={AppColor.primary} /> : null}
        {!isEmployee && !loading && !error && employeeInventory.map((form) => (
          <View key={form._id} style={styles.recordCard}>
            <TouchableOpacity disabled={form.status !== "SUBMITTED"} style={styles.record} onPress={() => open(form.form_type, form._id)}>
              <View style={styles.recordCopy}><View style={styles.recordTitleRow}><Text style={styles.recordTitle}>{form.prepared_by_name || "Employee"}</Text><Text style={form.status === "DRAFT" ? styles.draftBadge : styles.submittedBadge}>{form.status === "DRAFT" ? "In Progress" : "Submitted"}</Text></View><Text style={styles.detail}>{form.truck_unit || "Food truck"} · {new Date(form.submitted_at || form.updatedAt || form.createdAt || form.form_date).toLocaleString()}</Text></View>
              {form.status === "SUBMITTED" ? <MaterialIcons name="chevron-right" size={22} color="#64748B" /> : null}
            </TouchableOpacity>
            <View style={styles.inventoryPreview}>{(form.inventory_items || []).filter((item) => item.employee_modified_at).map((item, index) => <View key={item._id || index} style={styles.inventoryPreviewRow}><Text style={styles.inventoryItemName}>{item.item_name || `Item ${index + 1}`}</Text><Text style={styles.detail}>Current {Number(item.current_quantity) || 0} · Reorder {Number(item.reorder_quantity) || 0}</Text></View>)}</View>
            {form.status === "DRAFT" ? <><Text style={styles.draftNote}>Read only until the employee submits this inventory count.</Text><View style={styles.reviewActions}><TouchableOpacity disabled={reviewingId === form._id} style={styles.smallDangerButton} onPress={() => discardDraft(form)}><Text style={styles.smallDangerText}>{reviewingId === form._id ? "Discarding..." : "Discard Draft"}</Text></TouchableOpacity></View></> : <View style={styles.reviewActions}>
              <TouchableOpacity disabled={reviewingId === form._id} style={styles.smallButton} onPress={() => open(form.form_type, form._id, true)}><Text style={styles.smallButtonText}>Edit</Text></TouchableOpacity>
              <TouchableOpacity disabled={reviewingId === form._id} style={styles.smallButton} onPress={() => open(form.form_type, form._id, true)}><Text style={styles.smallButtonText}>Close Inventory</Text></TouchableOpacity>
              <TouchableOpacity disabled={reviewingId === form._id} style={styles.smallDangerButton} onPress={() => review(form, "ARCHIVED")}><Text style={styles.smallDangerText}>{reviewingId === form._id ? "Working..." : "Archive"}</Text></TouchableOpacity>
            </View>}
          </View>
        ))}
        {!isEmployee && !loading && !error && !employeeInventory.length ? <Text style={styles.empty}>No employee inventory submissions need review.</Text> : null}
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
  sectionCopy: { color: "#64748B", fontSize: 13, lineHeight: 18, marginBottom: 10 },
  recordCard: { backgroundColor: "white", borderRadius: 10, marginBottom: 9, padding: 12 },
  record: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", padding: 4 },
  recordCopy: { flex: 1 },
  recordTitleRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  recordTitle: { color: "#0F172A", fontSize: 15, fontWeight: "600" },
  draftBadge: { backgroundColor: "#FEF3C7", borderRadius: 10, color: "#92400E", fontSize: 10, fontWeight: "700", overflow: "hidden", paddingHorizontal: 7, paddingVertical: 3 },
  submittedBadge: { backgroundColor: "#DCFCE7", borderRadius: 10, color: "#166534", fontSize: 10, fontWeight: "700", overflow: "hidden", paddingHorizontal: 7, paddingVertical: 3 },
  inventoryPreview: { borderTopColor: "#E2E8F0", borderTopWidth: 1, marginTop: 9, paddingTop: 6 },
  inventoryPreviewRow: { borderBottomColor: "#F1F5F9", borderBottomWidth: 1, paddingVertical: 7 },
  inventoryItemName: { color: "#0F172A", fontSize: 13, fontWeight: "600" },
  draftNote: { color: "#92400E", fontSize: 12, marginTop: 9 },
  reviewActions: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 10 },
  smallButton: { borderColor: AppColor.primary, borderRadius: 7, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  smallButtonText: { color: AppColor.primary, fontSize: 12, fontWeight: "700" },
  smallDangerButton: { borderColor: "#DC2626", borderRadius: 7, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  smallDangerText: { color: "#B91C1C", fontSize: 12, fontWeight: "700" },
  empty: { color: "#64748B", fontSize: 14 },
  errorCard: { alignItems: "center", backgroundColor: "#FEF3F2", borderColor: "#FDA29B", borderRadius: 12, borderWidth: 1, marginTop: 8, padding: 18 },
  errorTitle: { color: "#912018", fontSize: 16, fontWeight: "700", marginTop: 8 },
  errorText: { color: "#B42318", fontSize: 13, marginTop: 4, textAlign: "center" },
  retryButton: { backgroundColor: AppColor.primary, borderRadius: 8, marginTop: 12, paddingHorizontal: 22, paddingVertical: 10 },
  retryText: { color: "white", fontSize: 14, fontWeight: "700" },
});

export default OperationsScreen;
