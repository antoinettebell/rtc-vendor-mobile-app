import React, { useCallback, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  getEventVendorApplications_API,
  getEventVendorEvents_API,
} from "../api/appAPI";
import { AppColor } from "../utils/theme";

export default function EventVendorMarketplaceScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const [r, applicationResponse] = await Promise.all([
        getEventVendorEvents_API(),
        getEventVendorApplications_API(),
      ]);
      setEvents(r?.data?.marketplaceEventList || []);
      setApplications(applicationResponse?.data?.applicationList || []);
      setMessage("");
    } catch (e) {
      setMessage(
        e?.message ||
          "Complete your Marketplace Vendor profile to see matching events.",
      );
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  return (
    <View style={s.page}>
      <Text style={s.heading}>Event Marketplace</Text>
      <Text style={s.sub}>
        Only events requesting your vendor type are shown.
      </Text>
      {message ? <Text style={s.notice}>{message}</Text> : null}
      {applications
        .filter((item) => item.status === "PAYMENT_DUE")
        .map((item) => (
          <TouchableOpacity
            key={item.application_id}
            style={[s.card, s.paymentCard]}
            onPress={() =>
              navigation.navigate("vendorMarketplacePaymentScreen", {
                paymentId: item.payment_id,
                returnScreen: "eventVendorMarketplaceScreen",
              })
            }
          >
            <Text style={s.title}>Awarded Application</Text>
            <Text style={s.meta}>
              Checkout subtotal: $
              {Number(item.checkout_subtotal || 0).toFixed(2)}
            </Text>
            <Text style={s.apply}>Complete Award Checkout</Text>
          </TouchableOpacity>
        ))}
      <FlatList
        data={events}
        keyExtractor={(item) => item.event_id}
        ListEmptyComponent={
          <Text style={s.empty}>
            No matching events are accepting applications.
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() =>
              navigation.navigate("eventVendorApplicationScreen", {
                event: item,
              })
            }
          >
            <Text style={s.title}>{item.event_name}</Text>
            <Text style={s.meta}>
              {item.event_city}, {item.event_state}
            </Text>
            <Text style={s.meta}>
              {(item.event_vendor_needs || [])
                .map(
                  (need) =>
                    `${need.vendor_type}: ${need.quantity} needed · $${Number(need.fee || 0).toFixed(2)}`,
                )
                .join("\n")}
            </Text>
            <Text style={s.apply}>View & Apply</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, padding: 18, backgroundColor: "#fff" },
  heading: { fontSize: 26, fontWeight: "800", color: "#172033" },
  sub: { color: "#64748b", marginTop: 5, marginBottom: 14 },
  notice: {
    padding: 14,
    backgroundColor: "#fff7ed",
    color: "#9a3412",
    borderRadius: 10,
  },
  empty: { textAlign: "center", color: "#64748b", marginTop: 40 },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#172033" },
  meta: { color: "#64748b", marginTop: 6, lineHeight: 20 },
  apply: { color: AppColor.primary, fontWeight: "800", marginTop: 12 },
  paymentCard: { borderColor: AppColor.primary, backgroundColor: "#fff7ed" },
});
