import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor, Mulish400, Mulish600, Mulish700 } from "../utils/theme";
import {
  cancelEventVendorGeneralPurchase_API,
  completeEventVendorGeneralPurchase_API,
  getEventVendorGeneralPurchases_API,
  prepareEventVendorGeneralPurchase_API,
  refundEventVendorGeneralPurchase_API,
} from "../api/appAPI";
import { isTapToPayAvailable, startTapToPaySale } from "../services/tapToPay-service";
import {
  GENERAL_PURCHASE_TAX_INFORMATION,
  addGeneralPurchaseItem,
  calculateGeneralPurchase,
  createGeneralPurchaseItem,
  initialGeneralPurchaseState,
  removeGeneralPurchaseItem,
  validateGeneralPurchase,
} from "../helpers/marketplaceGeneralPurchase.helper";

const currency = (value) => `$${Number(value || 0).toFixed(2)}`;

export default function EventVendorGeneralPurchaseScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState(() => initialGeneralPurchaseState().items);
  const [taxRate, setTaxRate] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState([]);
  const checkoutKey = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const totals = useMemo(() => calculateGeneralPurchase(items, taxRate), [items, taxRate]);

  const loadHistory = useCallback(() => {
    getEventVendorGeneralPurchases_API()
      .then((response) => setHistory(response?.data?.purchaseList || []))
      .catch(() => setHistory([]));
  }, []);
  useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));

  const updateItem = (id, field, value) => setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  const reset = () => {
    const initial = initialGeneralPurchaseState();
    setItems(initial.items);
    setTaxRate("");
    setCustomerPhone("");
    checkoutKey.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };

  const checkout = async () => {
    const validation = validateGeneralPurchase({ items, taxRate });
    if (validation) return Alert.alert("General Purchase", validation);
    if (!isTapToPayAvailable()) return Alert.alert("Tap to Pay unavailable", "Tap to Pay on iPhone is not enabled or available on this device.");
    setProcessing(true);
    let prepared;
    let paymentApproved = false;
    try {
      const response = await prepareEventVendorGeneralPurchase_API({
        checkout_key: checkoutKey.current,
        items: items.map((item) => ({ description: item.description.trim(), quantity: Number(item.quantity), unit_price: Number(item.unitPrice) })),
        tax_rate: Number(taxRate || 0),
        customer_phone: customerPhone.trim() || null,
      });
      prepared = response?.data?.purchase;
      if (!prepared?.id || !prepared?.reference) throw new Error("General Purchase could not be prepared.");
      const payment = await startTapToPaySale({
        amount: Number(prepared.total).toFixed(2),
        currency: "USD",
        reference: prepared.reference,
        marketplaceVendor: true,
      });
      paymentApproved = true;
      await completeEventVendorGeneralPurchase_API(prepared.id, {
        transaction_id: payment.transactionId,
        auth_code: payment.authCode,
        invoice_number: payment.invoiceNumber,
        account_number: payment.accountNumber,
        account_type: payment.accountType,
      });
      reset();
      loadHistory();
      Alert.alert("Payment Approved", `General Purchase completed for ${currency(prepared.total)}.`);
    } catch (error) {
      if (prepared?.id && !paymentApproved) {
        void cancelEventVendorGeneralPurchase_API(prepared.id).catch(() => {});
        checkoutKey.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      }
      Alert.alert("General Purchase", error?.message || "Tap to Pay could not be completed. Your entries were preserved.");
    } finally {
      setProcessing(false);
    }
  };

  const refund = (purchase) => Alert.alert(
    "Refund General Purchase?",
    `Refund ${currency(purchase.total)} to the original payment method?`,
    [
      { text: "Cancel", style: "cancel" },
      { text: "Refund", style: "destructive", onPress: async () => {
        try {
          await refundEventVendorGeneralPurchase_API(purchase.purchase_id);
          loadHistory();
          Alert.alert("Refund Complete", "The General Purchase was refunded.");
        } catch (error) {
          Alert.alert("Refund", error?.message || "The refund could not be completed.");
        }
      } },
    ],
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBarManager barStyle="dark-content" backgroundColor={AppColor.white} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={28} color={AppColor.black} /></TouchableOpacity>
        <Text style={s.headerTitle}>General Purchase</Text><View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 36 }]}>
        <Text style={s.instructions}>Enter the items being purchased, quantity, price, and applicable sales-tax percentage.</Text>
        {items.map((item, index) => (
          <View key={item.id} style={s.card}>
            <View style={s.rowBetween}><Text style={s.cardTitle}>Item {index + 1}</Text>{items.length > 1 ? <TouchableOpacity onPress={() => setItems((current) => removeGeneralPurchaseItem(current, item.id))}><Text style={s.remove}>Remove Item</Text></TouchableOpacity> : null}</View>
            <Text style={s.label}>Description *</Text><TextInput style={s.input} value={item.description} onChangeText={(value) => updateItem(item.id, "description", value)} maxLength={200} />
            <View style={s.twoColumns}>
              <View style={s.column}><Text style={s.label}>Purchase Qty *</Text><TextInput style={s.input} value={item.quantity} onChangeText={(value) => updateItem(item.id, "quantity", value.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" /></View>
              <View style={s.column}><Text style={s.label}>Purchase Price *</Text><TextInput style={s.input} value={item.unitPrice} onChangeText={(value) => updateItem(item.id, "unitPrice", value.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" placeholder="0.00" /></View>
            </View>
            <Text style={s.lineTotal}>Line total: {currency(totals.items[index]?.lineTotal)}</Text>
          </View>
        ))}
        <TouchableOpacity style={s.secondary} onPress={() => setItems((current) => addGeneralPurchaseItem(current, createGeneralPurchaseItem()))}><Text style={s.secondaryText}>+ Add Item</Text></TouchableOpacity>
        <View style={s.taxLabelRow}><Text style={s.label}>Tax Rate %</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Sales tax information" onPress={() => Alert.alert("Tax Rate %", GENERAL_PURCHASE_TAX_INFORMATION)}><Ionicons name="information-circle-outline" size={20} color={AppColor.primary} /></TouchableOpacity></View><TextInput style={s.input} value={taxRate} onChangeText={(value) => setTaxRate(value.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" placeholder="0" />
        <Text style={s.note}>Enter the sales-tax rate that applies to this purchase. Maximum 25%.</Text>
        <Text style={s.label}>Customer Mobile Number (Optional)</Text><TextInput style={s.input} value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" placeholder="For an SMS receipt" />
        <View style={s.summary}><View style={s.rowBetween}><Text>Subtotal</Text><Text>{currency(totals.subtotal)}</Text></View><View style={s.rowBetween}><Text>Sales Tax Amount</Text><Text>{currency(totals.taxAmount)}</Text></View><View style={[s.rowBetween, s.totalRow]}><Text style={s.total}>Final Amount Due</Text><Text style={s.total}>{currency(totals.total)}</Text></View></View>
        <TouchableOpacity style={[s.primary, processing && s.disabled]} onPress={checkout} disabled={processing}>{processing ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Tap to Pay {currency(totals.total)}</Text>}</TouchableOpacity>
        {history.length ? <><Text style={s.sectionTitle}>Recent General Purchases</Text>{history.map((purchase) => <View key={purchase.purchase_id} style={s.historyCard}><View style={s.rowBetween}><Text style={s.cardTitle}>{currency(purchase.total)}</Text><Text style={s.status}>{String(purchase.status).replaceAll("_", " ")}</Text></View><Text style={s.note}>{new Date(purchase.createdAt).toLocaleString()}</Text>{purchase.status === "COMPLETED" ? <TouchableOpacity style={s.refundButton} onPress={() => refund(purchase)}><Text style={s.remove}>Refund</Text></TouchableOpacity> : null}</View>)}</> : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" }, headerTitle: { fontFamily: Mulish700, fontSize: 20, color: "#172033" }, content: { padding: 18, gap: 12 }, instructions: { fontFamily: Mulish400, color: "#475569", lineHeight: 20 }, card: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 12, padding: 14 }, cardTitle: { fontFamily: Mulish700, fontSize: 16, color: "#172033" }, rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, taxLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 }, label: { fontFamily: Mulish600, color: "#172033", marginTop: 10, marginBottom: 6 }, input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, padding: 12, color: "#172033" }, twoColumns: { flexDirection: "row", gap: 12 }, column: { flex: 1 }, lineTotal: { textAlign: "right", fontFamily: Mulish600, marginTop: 10 }, remove: { color: "#b91c1c", fontFamily: Mulish700 }, secondary: { borderWidth: 1, borderColor: AppColor.primary, borderRadius: 10, padding: 13, alignItems: "center" }, secondaryText: { color: AppColor.primary, fontFamily: Mulish700 }, note: { color: "#64748b", fontFamily: Mulish400, fontSize: 13 }, summary: { backgroundColor: "#f8fafc", borderRadius: 12, padding: 16, gap: 10 }, totalRow: { borderTopWidth: 1, borderTopColor: "#cbd5e1", paddingTop: 10 }, total: { fontFamily: Mulish700, fontSize: 18 }, primary: { backgroundColor: AppColor.primary, borderRadius: 12, padding: 16, alignItems: "center" }, primaryText: { color: "#fff", fontFamily: Mulish700, fontSize: 17 }, disabled: { opacity: 0.6 }, sectionTitle: { fontFamily: Mulish700, fontSize: 20, marginTop: 18, color: "#172033" }, historyCard: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 12, gap: 6 }, status: { fontFamily: Mulish600, color: "#166534" }, refundButton: { alignSelf: "flex-start", marginTop: 6, paddingVertical: 6 },
});
