import React, { useCallback, useMemo, useState } from "react";
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
import {
  getEventVendorApplications_API,
  getEventVendorEvents_API,
  withdrawEventVendorApplication_API,
} from "../api/appAPI";
import { AppColor } from "../utils/theme";
import MarketplaceVendorScreenLayout from "../components/MarketplaceVendorScreenLayout";
import MarketplaceImageViewer from "../components/MarketplaceImageViewer";
import { getMarketplaceVendorEventPresentation } from "../helpers/eventVendorPresentation.helper";
import {
  canEditEventVendorSubmission,
  canWithdrawEventVendorSubmission,
  splitEventVendorApplications,
} from "../helpers/eventVendorSubmissionLifecycle.helper";

export default function EventVendorMarketplaceScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [message, setMessage] = useState("");
  const [viewer, setViewer] = useState(null);
  const [section, setSection] = useState("MARKETPLACE");
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
  const categorized = useMemo(() => splitEventVendorApplications(applications), [applications]);
  const withdraw = (application) => Alert.alert(
    "Withdraw Application",
    "Withdraw this event submission? It will remain in My Applications as history.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Withdraw",
        style: "destructive",
        onPress: async () => {
          try {
            await withdrawEventVendorApplication_API(application.application_id);
            await load();
          } catch (error) {
            Alert.alert("Withdraw Failed", error?.message || "Please try again.");
          }
        },
      },
    ],
  );
  const renderApplication = ({ item }) => {
    const event = item.event || {};
    const editable = canEditEventVendorSubmission(item, event);
    const withdrawable = canWithdrawEventVendorSubmission(item, event);
    return (
      <View style={s.card}>
        <Text style={s.title}>{event.event_name || "Event Submission"}</Text>
        <Text style={s.meta}>Status: {String(item.status || "SUBMITTED").replaceAll("_", " ")}</Text>
        <Text style={s.meta}>{(item.offering_bullets || []).map((value) => `• ${value}`).join("\n")}</Text>
        {editable ? (
          <View style={s.actions}>
            <View>
              <TouchableOpacity onPress={() => navigation.navigate("eventVendorSubmissionDetailsScreen", { application: item, event })}>
                <Text style={s.apply}>View Submission</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate("eventVendorApplicationScreen", { event, application: item })}>
                <Text style={s.apply}>Edit Event Submission</Text>
              </TouchableOpacity>
            </View>
            {withdrawable ? <TouchableOpacity onPress={() => withdraw(item)}>
              <Text style={s.withdraw}>Withdraw</Text>
            </TouchableOpacity> : null}
          </View>
        ) : item.status === "PAYMENT_DUE" ? (
          <View>
            <TouchableOpacity onPress={() => navigation.navigate("eventVendorSubmissionDetailsScreen", { application: item, event })}>
              <Text style={s.readOnly}>View Awarded Event</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate("vendorMarketplacePaymentScreen", { paymentId: item.payment_id, returnScreen: "eventVendorMarketplaceScreen" })}>
              <Text style={s.apply}>Complete Award Checkout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => navigation.navigate("eventVendorSubmissionDetailsScreen", { application: item, event })}>
            <Text style={s.readOnly}>{["AWARDED", "PAYMENT_DUE", "PAID"].includes(item.status) ? "View Awarded Event" : "View Submission"}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };
  return (
    <MarketplaceVendorScreenLayout
      title="Event Marketplace"
      subtitle="Only events requesting your vendor type are shown."
    >
      <View style={s.page}>
      <View style={s.sections}>
        {[['MARKETPLACE', 'Marketplace / Near Me'], ['BIDS', 'My Bids'], ['APPLICATIONS', 'My Applications'], ['AWARDED', 'Awarded Events']].map(([value, label]) => (
          <TouchableOpacity key={value} style={[s.sectionButton, section === value && s.sectionButtonActive]} onPress={() => setSection(value)}>
            <Text style={[s.sectionText, section === value && s.sectionTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {message ? <Text style={s.notice}>{message}</Text> : null}
      <FlatList
        data={section === "MARKETPLACE" ? events : section === "APPLICATIONS" ? categorized.applications : section === "AWARDED" ? categorized.awarded : []}
        keyExtractor={(item) => item.event_id || item.application_id}
        ListEmptyComponent={
          <Text style={s.empty}>
            {section === "BIDS" ? "Marketplace Vendors submit applications rather than food-vendor bids." : section === "MARKETPLACE" ? "No matching events are accepting applications." : "No submissions in this section."}
          </Text>
        }
        renderItem={section !== "MARKETPLACE" ? renderApplication : ({ item }) => {
          const event = getMarketplaceVendorEventPresentation(item);
          return (
          <TouchableOpacity
            style={s.card}
            onPress={() =>
              navigation.navigate("eventVendorApplicationScreen", {
                event: item,
              })
            }
          >
            {event.images[0] ? (
              <TouchableOpacity onPress={() => setViewer({ images: event.images, index: 0 })}>
                <Image source={{ uri: event.images[0].image_url }} style={s.eventImage} />
              </TouchableOpacity>
            ) : null}
            <Text style={s.title}>{event.name}</Text>
            <Text style={s.meta}>{event.location}</Text>
            {event.date ? <Text style={s.meta}>{String(event.date)}{event.startTime ? ` · ${event.startTime}` : ""}</Text> : null}
            <Text style={s.meta}>
              {event.needs
                .map(
                  (need) =>
                    `${need.vendorType}: ${need.remaining} remaining · $${need.fee.toFixed(2)}`,
                )
                .join("\n")}
            </Text>
            <Text style={s.apply}>View & Apply</Text>
          </TouchableOpacity>
          );
        }}
      />
      <MarketplaceImageViewer
        images={viewer?.images || []}
        initialIndex={viewer?.index || 0}
        visible={!!viewer}
        onClose={() => setViewer(null)}
      />
      </View>
    </MarketplaceVendorScreenLayout>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 18, backgroundColor: "#fff" },
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
  sections: { flexDirection: "row", gap: 6, marginBottom: 14 },
  sectionButton: { flex: 1, paddingVertical: 9, paddingHorizontal: 4, borderRadius: 8, backgroundColor: "#eef2f7" },
  sectionButtonActive: { backgroundColor: AppColor.primary },
  sectionText: { textAlign: "center", fontSize: 11, fontWeight: "700", color: "#475569" },
  sectionTextActive: { color: "#fff" },
  actions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  withdraw: { color: "#b91c1c", fontWeight: "800", marginTop: 12 },
  readOnly: { color: "#64748b", fontWeight: "700", marginTop: 12 },
  eventImage: { width: "100%", height: 150, borderRadius: 10, marginBottom: 12 },
});
