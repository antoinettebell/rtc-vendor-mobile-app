import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import {
  getEventVendorApplications_API,
  getEventVendorEvents_API,
  withdrawEventVendorApplication_API,
} from "../api/appAPI";
import { AppColor } from "../utils/theme";
import MarketplaceImageViewer from "../components/MarketplaceImageViewer";
import VendorMarketplaceNotificationBell from "../components/VendorMarketplaceNotificationBell";
import VendorMarketplaceLanding, { VENDOR_MARKETPLACE_NAVIGATION } from "../components/VendorMarketplaceLanding";
import { styles } from "./vendorMarketplaceShared";
import {
  VendorMarketplaceCard,
  VendorMarketplaceActionRow,
  VendorMarketplaceEmptyState,
  VendorMarketplaceLoadingState,
  VendorMarketplacePage,
  VendorMarketplacePrimaryAction,
  VendorMarketplaceSecondaryAction,
  VendorMarketplaceStatusBadge,
} from "../components/VendorMarketplacePrimitives";
import { getMarketplaceVendorEventPresentation } from "../helpers/eventVendorPresentation.helper";
import { getMarketplaceSubmissionDisplayStatus } from "../helpers/marketplaceSubmissionDisplay.helper";
import {
  canEditEventVendorSubmission,
  canWithdrawEventVendorSubmission,
  splitEventVendorApplications,
} from "../helpers/eventVendorSubmissionLifecycle.helper";

export default function EventVendorMarketplaceScreen({ navigation, route }) {
  const [events, setEvents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [message, setMessage] = useState("");
  const [viewer, setViewer] = useState(null);
  const [loading, setLoading] = useState(false);
  const requestedSection = route?.params?.section || null;
  const section = requestedSection === "BIDS" ? null : requestedSection;
  const marketplaceVendorNavigation = VENDOR_MARKETPLACE_NAVIGATION.filter(
    (item) => item.key !== "BIDS",
  );
  const load = useCallback(async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const categorized = useMemo(() => splitEventVendorApplications(applications), [applications]);
  const withdraw = (application) => {
    return Alert.alert(
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
  };
  const renderApplication = ({ item }) => {
    const event = item.event || {};
    const editable = canEditEventVendorSubmission(item, event);
    const withdrawable = canWithdrawEventVendorSubmission(item, event);
    return (
      <VendorMarketplaceCard style={s.card}>
        <Text style={styles.title}>{event.event_name || "Event Submission"}</Text>
        <VendorMarketplaceStatusBadge
          status={getMarketplaceSubmissionDisplayStatus(item, item.status)}
          style={{ alignSelf: "flex-start", marginTop: 8 }}
        />
        <Text style={styles.meta}>{(item.offering_bullets || []).map((value) => `• ${value}`).join("\n")}</Text>
        {editable ? (
          <VendorMarketplaceActionRow vertical>
            <View>
              <VendorMarketplaceSecondaryAction label="View Submission" onPress={() => navigation.navigate("eventVendorSubmissionDetailsScreen", { application: item, event })} />
              <VendorMarketplacePrimaryAction label="Edit Event Submission" style={{ marginTop: 10 }} onPress={() => navigation.navigate("eventVendorApplicationScreen", { event, application: item })} />
            </View>
            {withdrawable ? <VendorMarketplaceSecondaryAction label="Withdraw" destructive style={{ marginTop: 10 }} onPress={() => withdraw(item)} /> : null}
          </VendorMarketplaceActionRow>
        ) : item.status === "PAYMENT_DUE" ? (
          <View>
            <VendorMarketplaceSecondaryAction label="View Awarded Event" onPress={() => navigation.navigate("eventVendorSubmissionDetailsScreen", { application: item, event })} />
            <VendorMarketplacePrimaryAction label="Complete Award Checkout" style={{ marginTop: 10 }} onPress={() => navigation.navigate("vendorMarketplacePaymentScreen", { paymentId: item.payment_id, returnScreen: "eventVendorMarketplaceScreen" })} />
          </View>
        ) : (
          <VendorMarketplaceSecondaryAction label={["AWARDED", "PAYMENT_DUE", "PAID"].includes(item.status) ? "View Awarded Event" : "View Submission"} onPress={() => navigation.navigate("eventVendorSubmissionDetailsScreen", { application: item, event })} />
        )}
      </VendorMarketplaceCard>
    );
  };
  const goToLanding = () => navigation.setParams({ section: undefined });
  const openNotification = (item) => {
    if (["MARKETPLACE_APPLICATION", "MARKETPLACE_EVENT_CLOSED"].includes(item.type)) {
      navigation.setParams({
        section: ["AWARDED", "PAYMENT_DUE", "PAID"].includes(item.status)
          ? "AWARDED"
          : "APPLICATIONS",
      });
      return;
    }
    navigation.setParams({ section: "MARKETPLACE" });
  };
  const sectionTitle = {
    MARKETPLACE: "Marketplace / Near Me",
    APPLICATIONS: "My Applications",
    AWARDED: "Awarded Events",
  }[section];
  const data = section === "MARKETPLACE"
    ? events
    : section === "APPLICATIONS"
      ? categorized.applications
      : section === "AWARDED"
        ? categorized.awarded
        : [];
  return (
    <VendorMarketplacePage
      title={sectionTitle || "Marketplace"}
      navigation={navigation}
      onBack={section ? goToLanding : undefined}
      hideBack={!section}
      right={
        <View style={s.headerActions}>
          <TouchableOpacity disabled={loading} onPress={load} style={s.refreshButton}>
            <MaterialIcons name="refresh" size={25} color={loading ? AppColor.gray : AppColor.primary} />
          </TouchableOpacity>
          <VendorMarketplaceNotificationBell
            navigation={navigation}
            onOpenNotification={openNotification}
          />
        </View>
      }
    >
      {!section ? (
        <ScrollView contentContainerStyle={styles.body}>
          <VendorMarketplaceLanding
            intro="Discover event opportunities, track applications, and manage awarded events."
            cards={marketplaceVendorNavigation.map((item) => item.key === "MARKETPLACE"
              ? { ...item, subtitle: "View sourcing events and Marketplace Vendor opportunities near you." }
              : item)}
            onSelect={(item) => navigation.setParams({ section: item.key })}
          />
        </ScrollView>
      ) : loading ? (
        <VendorMarketplaceLoadingState />
      ) : message ? (
        <ScrollView contentContainerStyle={styles.body}>
          <VendorMarketplaceEmptyState title="No open events found" message={message} />
        </ScrollView>
      ) : (
      <View style={s.page}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.event_id || item.application_id}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={AppColor.primary} />}
        ListEmptyComponent={
          <VendorMarketplaceEmptyState title="Nothing here yet" message={section === "MARKETPLACE" ? "No matching events are accepting applications." : "No submissions in this section."} />
        }
        renderItem={section !== "MARKETPLACE" ? renderApplication : ({ item }) => {
          const event = getMarketplaceVendorEventPresentation(item);
          return (
          <VendorMarketplaceCard
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
            <Text style={styles.title}>{event.name}</Text>
            <Text style={styles.meta}>{event.location}</Text>
            {event.date ? <Text style={styles.meta}>{String(event.date)}{event.startTime ? ` · ${event.startTime}` : ""}</Text> : null}
            <Text style={styles.meta}>
              {event.needs
                .map(
                  (need) =>
                    `${need.vendorType}: ${need.remaining} remaining · $${need.fee.toFixed(2)}`,
                )
                .join("\n")}
            </Text>
            <Text style={styles.secondaryButtonText}>View & Apply</Text>
          </VendorMarketplaceCard>
          );
        }}
      />
      </View>
      )}
      <MarketplaceImageViewer
        images={viewer?.images || []}
        initialIndex={viewer?.index || 0}
        visible={!!viewer}
        onClose={() => setViewer(null)}
      />
    </VendorMarketplacePage>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 18, backgroundColor: "#fff" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  refreshButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerActions: { alignItems: "center", flexDirection: "row" },
  heading: { fontSize: 26, fontWeight: "800", color: "#172033" },
  sub: { color: "#64748b", marginTop: 5, marginBottom: 14 },
  notice: {
    padding: 14,
    backgroundColor: "#fff7ed",
    color: "#9a3412",
    borderRadius: 10,
  },
  empty: { textAlign: "center", color: "#64748b", marginTop: 40 },
  card: { marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "800", color: "#172033" },
  meta: { color: "#64748b", marginTop: 6, lineHeight: 20 },
  apply: { color: AppColor.primary, fontWeight: "800", marginTop: 12 },
  paymentCard: { borderColor: AppColor.primary, backgroundColor: "#fff7ed" },
  actions: { marginTop: 12 },
  withdraw: { color: "#b91c1c", fontWeight: "800", marginTop: 12 },
  readOnly: { color: "#64748b", fontWeight: "700", marginTop: 12 },
  eventImage: { width: "100%", height: 150, borderRadius: 10, marginBottom: 12 },
});
