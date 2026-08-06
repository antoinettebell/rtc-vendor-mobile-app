import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useSelector } from "react-redux";
import {
  archiveOperationalComplianceForm_API,
  getCurrentOperationalComplianceForm_API,
  getOperationalComplianceForms_API,
  saveOperationalComplianceForm_API,
  submitOperationalComplianceForm_API,
  unlockOperationalComplianceForm_API,
} from "../api/appAPI";
import { AppColor } from "../utils/theme";
import { printOperationalComplianceForm } from "../helpers/print.helper";

const TITLES = {
  INVENTORY: "Inventory",
  OPENING_CHECKLIST: "Opening Checklist",
  CLOSING_CHECKLIST: "Closing Checklist",
};
const QUANTITIES = Array.from({ length: 100 }, (_, index) => index + 1);
const emptyInventoryItem = () => ({
  item_location: "",
  brand: "",
  item_name: "",
  purchased_from: "",
  date_purchased: null,
  use_by_date: null,
  beginning_quantity: 1,
  current_quantity: 1,
  max_quantity: 1,
  reorder_quantity: 0,
  notes: "",
});
const asDateLabel = (value) => value ? new Date(value).toLocaleDateString() : "Select date";

const OperationalTextField = ({
  editable,
  label,
  value,
  onChangeText,
  maxLength = 80,
  multiline = false,
}) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      editable={editable}
      maxLength={maxLength}
      multiline={multiline}
      onChangeText={onChangeText}
      style={[
        styles.input,
        multiline && styles.notesInput,
        !editable && styles.readonly,
      ]}
      value={value || ""}
    />
  </View>
);

const OperationalFormScreen = ({ navigation, route }) => {
  const { type, formId } = route.params || {};
  const { user } = useSelector((state) => state.userReducer);
  const isEmployee = user?.userType === "EMPLOYEE" || user?.role === "EMPLOYEE";
  const defaultPreparedByName = isEmployee
    ? [user?.first_name || user?.firstName, user?.last_name || user?.lastName].filter(Boolean).join(" ")
    : "Vendor";
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quantityTarget, setQuantityTarget] = useState(null);
  const [dateTarget, setDateTarget] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [truckUnits, setTruckUnits] = useState([]);
  const [truckUnitPickerVisible, setTruckUnitPickerVisible] = useState(false);

  const editable = form?.status === "DRAFT";
  const archived = form?.status === "ARCHIVED";
  const inventory = type === "INVENTORY";

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    setForm(null);
    try {
      let nextForm = null;
      let response = null;
      if (formId) {
        response = await getOperationalComplianceForms_API({ type });
        const forms = response?.data?.forms || response?.forms || [];
        nextForm = forms.find((item) => item._id === formId) || null;
      } else {
        response = await getCurrentOperationalComplianceForm_API(type);
        nextForm = response?.data?.form || response?.form || null;
      }
      if (!nextForm) throw new Error("The requested operations form was not found.");
      const responseTruckUnits = response?.data?.truckUnits || response?.truckUnits || [];
      setTruckUnits(responseTruckUnits);
      setForm({
        ...nextForm,
        prepared_by_name: nextForm.prepared_by_name || defaultPreparedByName,
      });
    } catch (error) {
      setLoadError(error?.message || "Unable to load the form.");
    } finally {
      setLoading(false);
    }
  }, [defaultPreparedByName, formId, type]);

  useEffect(() => { load(); }, [load]);

  const updateHeader = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateInventory = (index, field, value) => setForm((current) => {
    const items = [...(current.inventory_items || [])];
    const item = { ...items[index], [field]: value };
    const currentQty = Number(item.current_quantity) || 0;
    const maxQty = Number(item.max_quantity) || 0;
    item.reorder_quantity = Math.max(0, maxQty - currentQty);
    items[index] = item;
    return { ...current, inventory_items: items };
  });
  const updateChecklist = (index, field, value) => setForm((current) => {
    const items = [...(current.checklist_items || [])];
    items[index] = { ...items[index], [field]: value };
    return { ...current, checklist_items: items };
  });

  const payload = useMemo(() => ({
    prepared_by_name: form?.prepared_by_name || "",
    initials: form?.initials || "",
    truck_unit: form?.truck_unit || "",
    form_date: form?.form_date || new Date().toISOString(),
    inventory_items: form?.inventory_items || [],
    checklist_items: form?.checklist_items || [],
  }), [form]);

  const save = async (submit = false) => {
    setSaving(true);
    try {
      const response = submit
        ? await submitOperationalComplianceForm_API(form._id, payload)
        : await saveOperationalComplianceForm_API(form._id, payload);
      setForm(response?.data?.form || response?.form || form);
      Alert.alert(submit ? "Submitted" : "Saved", submit ? "The vendor can now review this form. No approval is required." : "Your changes were saved.");
    } catch (error) {
      Alert.alert("Operations", error?.message || "Unable to save this form.");
    } finally {
      setSaving(false);
    }
  };

  const unlock = async () => {
    try {
      const response = await unlockOperationalComplianceForm_API(form._id);
      setForm(response?.data?.form || response?.form || form);
    } catch (error) {
      Alert.alert("Operations", error?.message || "Unable to edit this form.");
    }
  };

  const archive = () => Alert.alert(
    "Archive Form",
    "This creates a permanent read-only snapshot. It cannot be edited afterward.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Archive", onPress: async () => {
        try {
          await archiveOperationalComplianceForm_API(form._id);
          navigation.goBack();
        } catch (error) {
          Alert.alert("Operations", error?.message || "Unable to archive this form.");
        }
      } },
    ],
  );

  const print = async () => {
    try {
      await printOperationalComplianceForm(form);
    } catch (error) {
      Alert.alert("Print", error?.message || "Unable to print this form.");
    }
  };

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><MaterialIcons name="arrow-back" size={27} color="#0F172A" /></TouchableOpacity>
        <Text style={styles.title}>{TITLES[type] || "Operations"}</Text>
      </View>
      <View style={styles.loading}><ActivityIndicator color={AppColor.primary} /></View>
    </SafeAreaView>
  );

  if (loadError || !form) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><MaterialIcons name="arrow-back" size={27} color="#0F172A" /></TouchableOpacity>
        <Text style={styles.title}>{TITLES[type] || "Operations"}</Text>
      </View>
      <View style={styles.loadErrorContainer}>
        <MaterialIcons name="error-outline" size={38} color="#B42318" />
        <Text style={styles.loadErrorTitle}>Unable to open this form</Text>
        <Text style={styles.loadErrorText}>{loadError || "Please try again."}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const QuantityField = ({ label, value, onSelect, readOnly = false }) => (
    <TouchableOpacity disabled={!editable || readOnly} style={styles.field} onPress={() => setQuantityTarget({ label, value, onSelect })}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.select, (!editable || readOnly) && styles.readonly]}>
        <Text style={styles.selectText}>{Number(value) || 0}</Text>
        {editable && !readOnly ? <MaterialIcons name="expand-more" size={22} color="#64748B" /> : null}
      </View>
    </TouchableOpacity>
  );

  const DateField = ({ label, value, onSelect }) => (
    <TouchableOpacity disabled={!editable} style={styles.field} onPress={() => setDateTarget({ value, onSelect })}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.select, !editable && styles.readonly]}><Text style={styles.selectText}>{asDateLabel(value)}</Text><MaterialIcons name="calendar-today" size={19} color="#64748B" /></View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><MaterialIcons name="arrow-back" size={27} color="#0F172A" /></TouchableOpacity>
        <View style={styles.headerCopy}><Text style={styles.title}>{TITLES[type]}</Text><Text style={styles.status}>{form.status}</Text></View>
        <View style={styles.headerActions}>
          <TouchableOpacity accessibilityLabel="Print form" onPress={print}><MaterialIcons name="print" size={25} color={AppColor.primary} /></TouchableOpacity>
          {form.status === "SUBMITTED" ? <TouchableOpacity onPress={unlock}><MaterialIcons name="edit" size={25} color={AppColor.primary} /></TouchableOpacity> : null}
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {archived ? <View style={styles.archiveBanner}><MaterialIcons name="image" size={20} color="#475569" /><Text style={styles.archiveText}>Archived read-only snapshot</Text></View> : null}
        <View style={styles.card}>
          <OperationalTextField editable={editable} label="Employee / Vendor Name" value={form.prepared_by_name} onChangeText={(value) => updateHeader("prepared_by_name", value)} />
          {!inventory ? <OperationalTextField editable={editable} label="Initials" value={form.initials} maxLength={10} onChangeText={(value) => updateHeader("initials", value)} /> : null}
          <DateField label="Date" value={form.form_date} onSelect={(value) => updateHeader("form_date", value)} />
          <TouchableOpacity
            disabled={!editable}
            style={styles.field}
            onPress={() => setTruckUnitPickerVisible(true)}
          >
            <Text style={styles.fieldLabel}>Truck Unit</Text>
            <View style={[styles.select, !editable && styles.readonly]}>
              <Text style={styles.selectText}>
                {form.truck_unit || "Select truck unit"}
              </Text>
              {editable ? <MaterialIcons name="expand-more" size={22} color="#64748B" /> : null}
            </View>
          </TouchableOpacity>
        </View>

        {inventory ? (form.inventory_items || []).map((item, index) => (
          <View key={item._id || index} style={styles.card}>
            <View style={styles.itemHeader}><Text style={styles.itemTitle}>Item {index + 1}</Text>{editable ? <TouchableOpacity onPress={() => updateHeader("inventory_items", form.inventory_items.filter((_, itemIndex) => itemIndex !== index))}><MaterialIcons name="delete-outline" size={22} color="#B91C1C" /></TouchableOpacity> : null}</View>
            <OperationalTextField editable={editable} label="Item Location" value={item.item_location} onChangeText={(value) => updateInventory(index, "item_location", value)} />
            <OperationalTextField editable={editable} label="Brand" value={item.brand} onChangeText={(value) => updateInventory(index, "brand", value)} />
            <OperationalTextField editable={editable} label="Item Name" value={item.item_name} onChangeText={(value) => updateInventory(index, "item_name", value)} />
            <OperationalTextField editable={editable} label="Purchased From" value={item.purchased_from} onChangeText={(value) => updateInventory(index, "purchased_from", value)} />
            <DateField label="Date Purchased" value={item.date_purchased} onSelect={(value) => updateInventory(index, "date_purchased", value)} />
            <DateField label="Use-By Date" value={item.use_by_date} onSelect={(value) => updateInventory(index, "use_by_date", value)} />
            <View style={styles.quantityRow}>
              <View style={styles.quantityColumn}><QuantityField label="Beginning Quantity" value={item.beginning_quantity} onSelect={(value) => updateInventory(index, "beginning_quantity", value)} /></View>
              <View style={styles.quantityColumn}><QuantityField label="Current Quantity" value={item.current_quantity} onSelect={(value) => updateInventory(index, "current_quantity", value)} /></View>
            </View>
            <View style={styles.quantityRow}>
              <View style={styles.quantityColumn}><QuantityField label="Max Quantity" value={item.max_quantity} onSelect={(value) => updateInventory(index, "max_quantity", value)} /></View>
              <View style={styles.quantityColumn}><QuantityField label="Reorder Quantity" value={item.reorder_quantity} readOnly /></View>
            </View>
            <OperationalTextField editable={editable} label="Notes" value={item.notes} maxLength={250} multiline onChangeText={(value) => updateInventory(index, "notes", value)} />
          </View>
        )) : (form.checklist_items || []).map((item, index) => (
          <View key={item._id || index} style={styles.card}>
            <TouchableOpacity disabled={!editable} style={styles.checkRow} onPress={() => updateChecklist(index, "completed", !item.completed)}>
              <MaterialIcons name={item.completed ? "check-box" : "check-box-outline-blank"} size={28} color={item.completed ? AppColor.primary : "#64748B"} />
              <TextInput editable={editable} maxLength={80} style={[styles.areaInput, !editable && styles.readonly]} value={item.area} onChangeText={(value) => updateChecklist(index, "area", value)} />
            </TouchableOpacity>
            <OperationalTextField editable={editable} label="Task" value={item.task} maxLength={250} multiline onChangeText={(value) => updateChecklist(index, "task", value)} />
            <OperationalTextField editable={editable} label="Notes" value={item.notes} maxLength={250} multiline onChangeText={(value) => updateChecklist(index, "notes", value)} />
          </View>
        ))}

        {inventory && editable ? <TouchableOpacity style={styles.secondaryButton} onPress={() => updateHeader("inventory_items", [...(form.inventory_items || []), emptyInventoryItem()])}><MaterialIcons name="add" size={21} color={AppColor.primary} /><Text style={styles.secondaryText}>Add Inventory Item</Text></TouchableOpacity> : null}
        {!inventory ? <Text style={styles.safetyNote}>Report damaged equipment, unsafe temperatures, leaks, or other concerns to a manager before leaving.</Text> : null}
        {editable ? <View style={styles.actions}><TouchableOpacity disabled={saving} style={styles.secondaryButton} onPress={() => save(false)}><Text style={styles.secondaryText}>Save Draft</Text></TouchableOpacity><TouchableOpacity disabled={saving} style={styles.primaryButton} onPress={() => save(true)}><Text style={styles.primaryText}>{saving ? "Saving..." : "Submit"}</Text></TouchableOpacity></View> : null}
        {form.status === "SUBMITTED" && !isEmployee ? <TouchableOpacity style={styles.archiveButton} onPress={archive}><Text style={styles.primaryText}>Archive Form</Text></TouchableOpacity> : null}
      </ScrollView>

      <Modal transparent visible={!!quantityTarget} animationType="slide" onRequestClose={() => setQuantityTarget(null)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>{quantityTarget?.label}</Text><FlatList data={QUANTITIES} keyExtractor={(item) => String(item)} renderItem={({ item }) => <TouchableOpacity style={styles.quantityOption} onPress={() => { quantityTarget?.onSelect(item); setQuantityTarget(null); }}><Text style={styles.quantityOptionText}>{item}</Text></TouchableOpacity>} /><TouchableOpacity style={styles.modalClose} onPress={() => setQuantityTarget(null)}><Text style={styles.secondaryText}>Cancel</Text></TouchableOpacity></View></View>
      </Modal>
      <Modal
        transparent
        visible={truckUnitPickerVisible}
        animationType="slide"
        onRequestClose={() => setTruckUnitPickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Truck Unit</Text>
            <FlatList
              data={truckUnits}
              keyExtractor={(item) => String(item._id || item.name)}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No active truck units are available.</Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.quantityOption}
                  onPress={() => {
                    updateHeader("truck_unit", item.name);
                    setTruckUnitPickerVisible(false);
                  }}
                >
                  <Text style={styles.quantityOptionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setTruckUnitPickerVisible(false)}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <DateTimePickerModal isVisible={!!dateTarget} mode="date" date={dateTarget?.value ? new Date(dateTarget.value) : new Date()} onConfirm={(date) => { dateTarget?.onSelect(date.toISOString()); setDateTarget(null); }} onCancel={() => setDateTarget(null)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" }, loading: { alignItems: "center", flex: 1, justifyContent: "center" },
  loadErrorContainer: { alignItems: "center", flex: 1, justifyContent: "center", padding: 28 },
  loadErrorTitle: { color: "#912018", fontSize: 18, fontWeight: "700", marginTop: 10 },
  loadErrorText: { color: "#B42318", fontSize: 14, marginTop: 6, textAlign: "center" },
  retryButton: { backgroundColor: AppColor.primary, borderRadius: 9, marginTop: 16, paddingHorizontal: 24, paddingVertical: 11 },
  retryText: { color: "white", fontSize: 15, fontWeight: "700" },
  header: { alignItems: "center", backgroundColor: "white", borderBottomColor: "#E2E8F0", borderBottomWidth: 1, flexDirection: "row", padding: 18 }, headerCopy: { flex: 1, marginLeft: 15 }, headerActions: { alignItems: "center", flexDirection: "row", gap: 16 }, title: { color: "#0F172A", fontSize: 22, fontWeight: "700" }, status: { color: "#64748B", fontSize: 12, marginTop: 2 },
  content: { padding: 16, paddingBottom: 50 }, card: { backgroundColor: "white", borderColor: "#E2E8F0", borderRadius: 14, borderWidth: 1, marginBottom: 14, padding: 15 },
  archiveBanner: { alignItems: "center", backgroundColor: "#E2E8F0", borderRadius: 10, flexDirection: "row", gap: 8, marginBottom: 14, padding: 12 }, archiveText: { color: "#475569", fontWeight: "600" },
  field: { marginBottom: 12 }, fieldLabel: { color: "#475569", fontSize: 12, fontWeight: "600", marginBottom: 5 }, input: { backgroundColor: "white", borderColor: "#CBD5E1", borderRadius: 9, borderWidth: 1, color: "#0F172A", fontSize: 15, minHeight: 44, paddingHorizontal: 12, paddingVertical: 9 }, notesInput: { minHeight: 74, textAlignVertical: "top" }, readonly: { backgroundColor: "#F1F5F9", color: "#475569" },
  select: { alignItems: "center", backgroundColor: "white", borderColor: "#CBD5E1", borderRadius: 9, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 44, paddingHorizontal: 12 }, selectText: { color: "#0F172A", fontSize: 15 },
  itemHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }, itemTitle: { color: "#0F172A", fontSize: 17, fontWeight: "700" }, quantityRow: { flexDirection: "row", gap: 10 }, quantityColumn: { flex: 1 },
  checkRow: { alignItems: "center", flexDirection: "row", gap: 10, marginBottom: 12 }, areaInput: { borderBottomColor: "#CBD5E1", borderBottomWidth: 1, color: "#0F172A", flex: 1, fontSize: 16, fontWeight: "700", paddingVertical: 7 }, safetyNote: { color: "#475569", fontSize: 13, fontStyle: "italic", lineHeight: 19, marginBottom: 18 },
  actions: { flexDirection: "row", gap: 10 }, primaryButton: { alignItems: "center", backgroundColor: AppColor.primary, borderRadius: 10, flex: 1, justifyContent: "center", minHeight: 48, padding: 12 }, primaryText: { color: "white", fontSize: 15, fontWeight: "700" }, secondaryButton: { alignItems: "center", backgroundColor: "white", borderColor: AppColor.primary, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 6, justifyContent: "center", marginBottom: 12, minHeight: 48, padding: 12 }, secondaryText: { color: AppColor.primary, fontSize: 15, fontWeight: "700" }, archiveButton: { alignItems: "center", backgroundColor: "#475569", borderRadius: 10, marginTop: 12, padding: 14 },
  modalBackdrop: { backgroundColor: "rgba(15,23,42,0.45)", flex: 1, justifyContent: "flex-end" }, modalCard: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "65%", padding: 18 }, modalTitle: { color: "#0F172A", fontSize: 20, fontWeight: "700", marginBottom: 10 }, quantityOption: { alignItems: "center", borderBottomColor: "#E2E8F0", borderBottomWidth: 1, padding: 13 }, quantityOptionText: { color: "#0F172A", fontSize: 17 }, modalClose: { alignItems: "center", paddingTop: 14 },
  emptyText: { color: "#64748B", padding: 18, textAlign: "center" },
});

export default OperationalFormScreen;
