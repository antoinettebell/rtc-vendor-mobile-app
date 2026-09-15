import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import {
  archiveOperationalInventoryItem_API,
  closeOperationalInventoryCount_API,
  createOperationalInventoryItem_API,
  getOperationalComplianceForms_API,
  saveOperationalInventoryItem_API,
  submitOperationalInventoryItem_API,
} from "../api/appAPI";
import { printOperationalComplianceForm } from "../helpers/print.helper";
import { AppColor } from "../utils/theme";

const DAY = 24 * 60 * 60 * 1000;
const emptyItem = () => ({
  item_location: "",
  brand: "",
  item_name: "",
  purchased_from: "",
  date_purchased: null,
  use_by_date: null,
  beginning_quantity: 0,
  current_quantity: 0,
  max_quantity: 1,
  reorder_quantity: 1,
  notes: "",
});
const clone = (value) => JSON.parse(JSON.stringify(value));
const unwrap = (response) => response?.data || response || {};
const dateLabel = (value) => value ? new Date(value).toLocaleDateString() : "Not set";

const inventoryEntries = (forms = []) => forms
  .filter((form) => form.form_type === "INVENTORY" && !form.employee_internal_id)
  .flatMap((form) => (form.inventory_items || []).map((item) => ({
    ...item,
    formId: form._id,
    truck: form.truck_unit || "Unassigned Truck",
    truckUnitId: form.truck_unit_id || null,
    lifecycle_status: form.status === "ARCHIVED"
      ? "ARCHIVED"
      : item.lifecycle_status || "ACTIVE",
    inventory_status: form.status === "ARCHIVED" || item.lifecycle_status === "ARCHIVED"
      ? "Archived"
      : item.record_status === "SUBMITTED" ? "Active" : "In Progress",
    archived_at: item.archived_at || (form.status === "ARCHIVED" ? form.archived_at : null),
    sourceForm: form,
  })));

const grouped = (entries) => Object.values(entries.reduce((result, item) => {
  result[item.truck] ||= { truck: item.truck, items: [] };
  result[item.truck].items.push(item);
  return result;
}, {})).sort((left, right) => left.truck.localeCompare(right.truck));

const Field = ({ label, value, editable, onChangeText, numeric = false, multiline = false }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      editable={editable}
      keyboardType={numeric ? "number-pad" : "default"}
      multiline={multiline}
      onChangeText={onChangeText}
      style={[styles.input, !editable && styles.readonly, multiline && styles.notes]}
      value={numeric ? String(value ?? "") : String(value || "")}
    />
  </View>
);

export default function VendorInventoryScreen({ navigation, inventoryItemId }) {
  const [forms, setForms] = useState([]);
  const [truckUnits, setTruckUnits] = useState([]);
  const [expandedCurrent, setExpandedCurrent] = useState({});
  const [expandedArchive, setExpandedArchive] = useState({});
  const [selected, setSelected] = useState(null);
  const [original, setOriginal] = useState(null);
  const [editing, setEditing] = useState(false);
  const [closing, setClosing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [truckPicker, setTruckPicker] = useState(false);
  const [dateTarget, setDateTarget] = useState(null);
  const [openedInitialItem, setOpenedInitialItem] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = unwrap(await getOperationalComplianceForms_API({ type: "INVENTORY" }));
      setForms(response.forms || []);
      setTruckUnits(response.truckUnits || []);
    } catch (caught) {
      setError(caught?.message || "Unable to load inventory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const entries = useMemo(() => inventoryEntries(forms), [forms]);
  const currentGroups = useMemo(
    () => grouped(entries.filter((item) => item.lifecycle_status === "ACTIVE")),
    [entries],
  );
  const archiveGroups = useMemo(() => grouped(entries.filter((item) => (
    item.lifecycle_status === "ARCHIVED" &&
    item.archived_at &&
    Date.now() - new Date(item.archived_at).getTime() <= 30 * DAY
  ))), [entries]);

  useEffect(() => {
    if (!inventoryItemId || openedInitialItem || !entries.length) return;
    const target = entries.find((item) => String(item._id) === String(inventoryItemId));
    if (target) openItem(target);
    setOpenedInitialItem(true);
  }, [entries, inventoryItemId, openedInitialItem]);

  const beginAdd = () => {
    const next = { ...emptyItem(), formId: null, truck: "", truckUnitId: null };
    setSelected(next);
    setOriginal(clone(next));
    setEditing(true);
    setClosing(false);
  };
  const openItem = (item) => {
    setSelected(clone(item));
    setOriginal(clone(item));
    setEditing(false);
    setClosing(false);
  };
  const patch = (field, value) => setSelected((current) => {
    const next = { ...current, [field]: value };
    if (["current_quantity", "max_quantity"].includes(field)) {
      next.reorder_quantity = Math.max(0, Number(next.max_quantity || 0) - Number(next.current_quantity || 0));
    }
    return next;
  });
  const beginClose = () => {
    const reorderQuantity = Number(selected.reorder_quantity || 0);
    if (reorderQuantity === 0) {
      Alert.alert("Close Inventory Count", "No reorder is currently needed for this inventory item.");
      return;
    }
    Alert.alert(
      "Close Inventory Count",
      "Did you receive new products for this inventory item?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: () => {
            setOriginal(clone(selected));
            setSelected(selected.pending_close_draft ? {
              ...selected,
              ...selected.pending_close_draft,
            } : {
              ...selected,
              date_purchased: null,
              use_by_date: null,
              beginning_quantity: null,
              current_quantity: null,
              max_quantity: null,
              reorder_quantity: 0,
            });
            setClosing(true);
            setEditing(true);
          },
        },
      ],
    );
  };
  const payload = () => ({
    item_location: selected.item_location,
    brand: selected.brand,
    item_name: selected.item_name,
    purchased_from: selected.purchased_from,
    date_purchased: selected.date_purchased,
    use_by_date: selected.use_by_date,
    beginning_quantity: closing && selected.beginning_quantity == null ? null : Number(selected.beginning_quantity || 0),
    current_quantity: closing && selected.current_quantity == null ? null : Number(selected.current_quantity || 0),
    max_quantity: closing && selected.max_quantity == null ? null : Math.max(1, Number(selected.max_quantity || 1)),
    notes: selected.notes,
  });

  const persist = async (submit = false) => {
    if (!String(selected?.item_name || "").trim()) {
      Alert.alert("Inventory", "Enter an inventory item name.");
      return;
    }
    if (Number(selected.beginning_quantity || 0) > Number(selected.max_quantity || 0)) {
      Alert.alert("Inventory", "Beginning quantity cannot exceed max quantity.");
      return;
    }
    setSaving(true);
    try {
      if (!selected.formId) {
        if (!selected.truckUnitId) throw new Error("Choose a food truck.");
        const created = unwrap(await createOperationalInventoryItem_API({
          truck_unit_id: selected.truckUnitId,
          truck_unit: selected.truck,
          item: payload(),
        }));
        if (!created.form?._id || !created.item?._id) {
          throw new Error("Inventory item was created without a saved identifier.");
        }
        const savedItem = {
          ...selected,
          ...created.item,
          formId: created.form._id,
          truck: created.form.truck_unit || selected.truck,
          truckUnitId: created.form.truck_unit_id || selected.truckUnitId,
        };
        setSelected(savedItem);
        setOriginal(clone(savedItem));
        if (submit) {
          await submitOperationalInventoryItem_API(created.form._id, created.item._id, payload());
        }
      } else if (closing && submit) {
        if (!selected.date_purchased || !selected.use_by_date) {
          throw new Error("Enter the new item purchase and use-by dates.");
        }
        const beginning = Number(selected.beginning_quantity);
        const current = Number(selected.current_quantity);
        const maximum = Number(selected.max_quantity);
        if (beginning <= 0 || beginning !== current || current !== maximum) {
          throw new Error("Beginning, current, and max quantities must match the received quantity.");
        }
        await new Promise((resolve) => Alert.alert(
          "Close Inventory Count",
          "Are you sure you want to close out this item's monthly inventory count?",
          [
            { text: "No", style: "cancel", onPress: () => resolve(false) },
            { text: "Yes", onPress: () => resolve(true) },
          ],
          { cancelable: false },
        )).then(async (confirmed) => {
          if (!confirmed) return;
          await closeOperationalInventoryCount_API(selected.formId, selected._id, payload());
          setSelected(null);
          await load();
        });
        return;
      } else {
        const action = submit ? submitOperationalInventoryItem_API : saveOperationalInventoryItem_API;
        await action(selected.formId, selected._id, closing && !submit ? { ...payload(), close_count_draft: true } : payload());
      }
      setSelected(null);
      setEditing(false);
      setClosing(false);
      await load();
      Alert.alert("Inventory", submit ? "Inventory item submitted." : "Inventory draft saved.");
    } catch (caught) {
      Alert.alert("Inventory", caught?.message || "Unable to save this inventory item.");
    } finally {
      setSaving(false);
    }
  };

  const archive = () => Alert.alert(
    "Archive Inventory Item",
    "Do you want to remove this item from your inventory? This cannot be undone.",
    [
      { text: "No", style: "cancel" },
      { text: "Yes", style: "destructive", onPress: async () => {
        try {
          setSaving(true);
          await archiveOperationalInventoryItem_API(selected.formId, selected._id);
          setSelected(null);
          await load();
        } catch (caught) {
          Alert.alert("Inventory", caught?.message || "Unable to archive this item.");
        } finally {
          setSaving(false);
        }
      } },
    ],
  );

  const printGroup = async (group, status) => {
    try {
      await printOperationalComplianceForm({
        form_type: "INVENTORY",
        status,
        prepared_by_name: "Vendor",
        truck_unit: group.truck,
        form_date: new Date().toISOString(),
        inventory_items: group.items,
      });
    } catch (caught) {
      Alert.alert("Print", caught?.message || "Unable to print inventory.");
    }
  };

  const renderGroups = (groups, expanded, setExpanded, archived = false) => groups.length
    ? groups.map((group) => {
      const open = !!expanded[group.truck];
      return <View key={`${archived ? "archive" : "current"}-${group.truck}`} style={styles.group}>
        <View style={styles.groupHeader}>
          <TouchableOpacity style={styles.groupToggle} onPress={() => setExpanded((current) => ({ ...current, [group.truck]: !open }))}>
            <MaterialIcons name={open ? "expand-less" : "expand-more"} size={25} color={AppColor.primary} />
            <View><Text style={styles.groupTitle}>{group.truck}</Text><Text style={styles.meta}>{group.items.length} item{group.items.length === 1 ? "" : "s"}</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.print} onPress={() => printGroup(group, archived ? "Archived Inventory" : "Current Inventory")}>
            <MaterialIcons name="print" size={21} color={AppColor.primary} />
          </TouchableOpacity>
        </View>
        {open ? <View style={styles.groupItems}>{group.items.map((item) => (
          <TouchableOpacity key={`${item.formId}-${item._id}`} style={styles.itemRow} onPress={() => openItem(item)}>
            <View style={styles.itemCopy}><Text style={styles.itemName}>{item.item_name}</Text><Text style={styles.meta}>Current {Number(item.current_quantity) || 0} · Reorder {Number(item.reorder_quantity) || 0}</Text><Text style={styles.meta}>Use-by {dateLabel(item.use_by_date)}</Text></View><Text style={archived ? styles.archivedBadge : item.inventory_status === "In Progress" ? styles.inProgressBadge : styles.activeBadge}>{archived ? "Archived" : item.inventory_status}</Text>
            <MaterialIcons name="chevron-right" size={22} color="#64748B" />
          </TouchableOpacity>
        ))}</View> : null}
      </View>;
    })
    : <Text style={styles.empty}>No inventory items.</Text>;

  if (selected) {
    const archived = selected.lifecycle_status === "ARCHIVED";
    const inProgress = !archived && selected.record_status !== "SUBMITTED";
    return <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSelected(null)}><MaterialIcons name="arrow-back" size={27} color="#0F172A" /></TouchableOpacity>
        <View style={styles.headerCopy}><Text style={styles.title}>{selected.item_name || "Add Inventory Item"}</Text><Text style={styles.meta}>{archived ? "Archived Inventory" : `${selected.truck || "Choose food truck"}${selected.formId && inProgress ? " · In Progress" : ""}`}</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {!selected.formId ? <TouchableOpacity style={styles.field} onPress={() => setTruckPicker(true)}><Text style={styles.label}>Food Truck</Text><View style={styles.select}><Text>{selected.truck || "Choose food truck"}</Text><MaterialIcons name="expand-more" size={22} color="#64748B" /></View></TouchableOpacity> : null}
        {closing ? <Text style={styles.closeNotice}>Enter the new product lot. Date Purchased and Use-By Date are required. Beginning, Current, and Max quantities must all match the quantity received.</Text> : null}
        <View style={styles.card}>
          <Field editable={editing} label="Item Location" value={selected.item_location} onChangeText={(value) => patch("item_location", value)} />
          <Field editable={editing} label="Brand" value={selected.brand} onChangeText={(value) => patch("brand", value)} />
          <Field editable={editing} label="Item Name" value={selected.item_name} onChangeText={(value) => patch("item_name", value)} />
          <Field editable={editing} label="Purchased From" value={selected.purchased_from} onChangeText={(value) => patch("purchased_from", value)} />
          {[['Date Purchased', 'date_purchased'], ['Use-By Date', 'use_by_date']].map(([label, field]) => <TouchableOpacity key={field} disabled={!editing} style={styles.field} onPress={() => setDateTarget(field)}><Text style={styles.label}>{label}</Text><View style={[styles.select, !editing && styles.readonly]}><Text>{dateLabel(selected[field])}</Text><MaterialIcons name="calendar-today" size={18} color="#64748B" /></View></TouchableOpacity>)}
          <View style={styles.quantityRow}><View style={styles.half}><Field numeric editable={editing} label="Beginning Quantity" value={selected.beginning_quantity} onChangeText={(value) => patch("beginning_quantity", value)} /></View><View style={styles.half}><Field numeric editable={editing} label="Current Quantity" value={selected.current_quantity} onChangeText={(value) => patch("current_quantity", value)} /></View></View>
          <View style={styles.quantityRow}><View style={styles.half}><Field numeric editable={editing} label="Max Quantity" value={selected.max_quantity} onChangeText={(value) => patch("max_quantity", value)} /></View><View style={styles.half}><Field numeric editable={false} label="Reorder Quantity" value={selected.reorder_quantity} onChangeText={() => {}} /></View></View>
          <Field multiline editable={editing} label="Notes" value={selected.notes} onChangeText={(value) => patch("notes", value)} />
        </View>
        {editing ? <View style={styles.actions}>
          <TouchableOpacity disabled={saving} style={styles.secondaryButton} onPress={() => { setSelected(original?.formId ? clone(original) : null); setEditing(false); setClosing(false); }}><Text style={styles.secondaryText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity disabled={saving} style={styles.secondaryButton} onPress={() => persist(false)}><Text style={styles.secondaryText}>Save Draft</Text></TouchableOpacity>
          <TouchableOpacity disabled={saving} style={styles.primaryButton} onPress={() => persist(true)}><Text style={styles.primaryText}>Submit</Text></TouchableOpacity>
        </View> : !archived ? <>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setEditing(true)}><MaterialIcons name="edit" size={20} color={AppColor.primary} /><Text style={styles.secondaryText}>Edit</Text></TouchableOpacity>
          {!inProgress ? <TouchableOpacity style={styles.secondaryButton} onPress={beginClose}><Text style={styles.secondaryText}>Close Inventory Count</Text></TouchableOpacity> : null}
          <TouchableOpacity disabled={saving} style={styles.archiveButton} onPress={archive}><Text style={styles.archiveText}>Archive</Text></TouchableOpacity>
        </> : null}
      </ScrollView>
      <Modal transparent visible={truckPicker} animationType="slide" onRequestClose={() => setTruckPicker(false)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>Choose Food Truck</Text>{truckUnits.map((unit) => <TouchableOpacity key={unit._id} style={styles.modalOption} onPress={() => { patch("truck", unit.name); patch("truckUnitId", unit._id); setTruckPicker(false); }}><Text style={styles.itemName}>{unit.name}</Text></TouchableOpacity>)}<TouchableOpacity style={styles.modalOption} onPress={() => setTruckPicker(false)}><Text style={styles.secondaryText}>Cancel</Text></TouchableOpacity></View></View></Modal>
      <DateTimePickerModal isVisible={!!dateTarget} mode="date" date={selected[dateTarget] ? new Date(selected[dateTarget]) : new Date()} onConfirm={(date) => { patch(dateTarget, date.toISOString()); setDateTarget(null); }} onCancel={() => setDateTarget(null)} />
    </SafeAreaView>;
  }

  return <SafeAreaView style={styles.container}>
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}><MaterialIcons name="arrow-back" size={27} color="#0F172A" /></TouchableOpacity>
      <Text style={styles.title}>Inventory</Text>
      <TouchableOpacity accessibilityLabel="Add inventory item" style={styles.addButton} onPress={beginAdd}><MaterialIcons name="add" size={27} color="white" /></TouchableOpacity>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={AppColor.primary} /> : <>
        <Text style={styles.sectionTitle}>Current Inventory by Food Truck</Text>
        <Text style={styles.intro}>Review active inventory items. Print is available inside each food truck section.</Text>
        <View style={styles.guidance}><Text style={styles.guideLine}><Text style={styles.guideTitle}>Edit existing inventory</Text> if there was a miscount. Update quantities to fix the miscount.</Text><Text style={styles.guideLine}><Text style={styles.guideTitle}>Close Inventory Count</Text> records received replacement products when an item needs reordering. The existing lot remains active until it expires or is archived.</Text><Text style={styles.guideLine}><Text style={styles.guideTitle}>Archive</Text> removes an item from inventory. This cannot be undone.</Text></View>
        {renderGroups(currentGroups, expandedCurrent, setExpandedCurrent)}
        <Text style={styles.sectionTitle}>Archived Inventory Items</Text>
        <Text style={styles.intro}>Inventory archived during the last 30 days.</Text>
        {renderGroups(archiveGroups, expandedArchive, setExpandedArchive, true)}
      </>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#F8FAFC", flex: 1 },
  header: { alignItems: "center", backgroundColor: "white", borderBottomColor: "#E2E8F0", borderBottomWidth: 1, flexDirection: "row", gap: 15, padding: 18 },
  headerCopy: { flex: 1 }, title: { color: "#0F172A", flex: 1, fontSize: 23, fontWeight: "700" }, addButton: { alignItems: "center", backgroundColor: AppColor.primary, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  content: { padding: 16, paddingBottom: 50 }, sectionTitle: { color: "#0F172A", fontSize: 19, fontWeight: "700", marginTop: 12 }, intro: { color: "#64748B", fontSize: 13, lineHeight: 19, marginBottom: 12, marginTop: 4 },
  guidance: { backgroundColor: "#EFF6F2", borderRadius: 12, marginBottom: 15, padding: 13 }, guideLine: { color: "#475569", fontSize: 12, lineHeight: 18, marginBottom: 5 }, guideTitle: { color: "#0F5132", fontWeight: "700" },
  group: { backgroundColor: "white", borderColor: "#E2E8F0", borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: "hidden" }, groupHeader: { alignItems: "center", flexDirection: "row", padding: 13 }, groupToggle: { alignItems: "center", flex: 1, flexDirection: "row", gap: 8 }, groupTitle: { color: "#0F172A", fontSize: 16, fontWeight: "700" }, print: { borderColor: AppColor.primary, borderRadius: 8, borderWidth: 1, padding: 8 }, groupItems: { borderTopColor: "#E2E8F0", borderTopWidth: 1, paddingHorizontal: 13 }, itemRow: { alignItems: "center", borderBottomColor: "#E2E8F0", borderBottomWidth: 1, flexDirection: "row", paddingVertical: 13 }, itemCopy: { flex: 1 }, itemName: { color: "#0F172A", fontSize: 15, fontWeight: "600" }, meta: { color: "#64748B", fontSize: 12, marginTop: 3 }, empty: { color: "#64748B", marginBottom: 16, padding: 12, textAlign: "center" }, error: { backgroundColor: "#FEF3F2", color: "#B42318", marginBottom: 12, padding: 12 },
  activeBadge: { backgroundColor: "#DCFCE7", borderRadius: 12, color: "#166534", fontSize: 11, fontWeight: "700", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4 }, inProgressBadge: { backgroundColor: "#FEF3C7", borderRadius: 12, color: "#92400E", fontSize: 11, fontWeight: "700", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4 }, archivedBadge: { backgroundColor: "#E2E8F0", borderRadius: 12, color: "#475569", fontSize: 11, fontWeight: "700", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4 },
  card: { backgroundColor: "white", borderColor: "#E2E8F0", borderRadius: 14, borderWidth: 1, padding: 15 }, field: { marginBottom: 12 }, label: { color: "#475569", fontSize: 12, fontWeight: "600", marginBottom: 5 }, input: { backgroundColor: "white", borderColor: "#CBD5E1", borderRadius: 9, borderWidth: 1, color: "#0F172A", fontSize: 15, minHeight: 44, paddingHorizontal: 12, paddingVertical: 9 }, readonly: { backgroundColor: "#F1F5F9", color: "#475569" }, notes: { minHeight: 74, textAlignVertical: "top" }, select: { alignItems: "center", backgroundColor: "white", borderColor: "#CBD5E1", borderRadius: 9, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 44, paddingHorizontal: 12 }, quantityRow: { flexDirection: "row", gap: 10 }, half: { flex: 1 }, closeNotice: { backgroundColor: "#FFF7ED", borderRadius: 10, color: "#9A3412", lineHeight: 19, marginBottom: 12, padding: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }, primaryButton: { alignItems: "center", backgroundColor: AppColor.primary, borderRadius: 10, flex: 1, justifyContent: "center", minHeight: 48, padding: 11 }, primaryText: { color: "white", fontWeight: "700" }, secondaryButton: { alignItems: "center", backgroundColor: "white", borderColor: AppColor.primary, borderRadius: 10, borderWidth: 1, flex: 1, flexDirection: "row", gap: 5, justifyContent: "center", marginTop: 12, minHeight: 48, padding: 10 }, secondaryText: { color: AppColor.primary, fontWeight: "700" }, archiveButton: { alignItems: "center", borderColor: "#DC2626", borderRadius: 10, borderWidth: 1, marginTop: 12, padding: 13 }, archiveText: { color: "#B91C1C", fontWeight: "700" },
  modalBackdrop: { backgroundColor: "rgba(15,23,42,0.45)", flex: 1, justifyContent: "flex-end" }, modalCard: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18 }, modalTitle: { color: "#0F172A", fontSize: 19, fontWeight: "700", marginBottom: 10 }, modalOption: { borderBottomColor: "#E2E8F0", borderBottomWidth: 1, padding: 14 },
});
