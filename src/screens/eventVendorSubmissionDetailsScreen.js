import React, { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MarketplaceVendorScreenLayout from "../components/MarketplaceVendorScreenLayout";
import MarketplaceImageViewer from "../components/MarketplaceImageViewer";
import { VendorMarketplaceSectionCard } from "../components/VendorMarketplacePrimitives";
import { getMarketplaceVendorEventPresentation } from "../helpers/eventVendorPresentation.helper";
import { AppColor } from "../utils/theme";
import { styles as marketplaceStyles } from "./vendorMarketplaceShared";

const money = (value) => `$${Number(value || 0).toFixed(2)}`;
const statusLabel = (value) => String(value || "SUBMITTED").replace(/_/g, " ");

export default function EventVendorSubmissionDetailsScreen({ navigation, route }) {
  const application = route?.params?.application || {};
  const event = application.event || route?.params?.event || {};
  const presentation = getMarketplaceVendorEventPresentation(event);
  const [viewer, setViewer] = useState(null);
  const paymentDue = application.status === "PAYMENT_DUE" && application.payment_id;
  const photos = Array.isArray(application.photos) ? application.photos : [];
  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("bottomRoot", { screen: "eventVendorMarketplaceScreen" });
  };

  return (
    <MarketplaceVendorScreenLayout title="Event Submission" onBack={goBack} navigation={navigation} marketplace>
      <ScrollView contentContainerStyle={s.page}>
        <Text style={s.eventName}>{presentation.name || "Event"}</Text>
        <Text style={s.status}>Status: {statusLabel(application.status)}</Text>
        {presentation.description ? <Text style={s.text}>{presentation.description}</Text> : null}
        {presentation.date ? <Text style={s.text}>{String(presentation.date)}{presentation.startTime ? ` · ${presentation.startTime}` : ""}</Text> : null}
        {presentation.location ? <Text style={s.text}>{presentation.location}</Text> : null}
        <Text style={s.text}>GA Guests: {presentation.gaGuests || "Not provided"}</Text>
        {presentation.vipGuests > 0 ? <Text style={s.text}>VIP Guests: {presentation.vipGuests}</Text> : null}
        <VendorMarketplaceSectionCard style={s.section}>
          <Text style={s.heading}>Submitted vendor types</Text>
          <Text style={s.text}>{(application.vendor_types || []).map(statusLabel).join(", ") || "Not provided"}</Text>
          <Text style={s.heading}>Products / Services Offered</Text>
          <Text style={s.text}>{(application.offering_bullets || []).map((item) => `• ${item}`).join("\n") || "Not provided"}</Text>
          <Text style={s.heading}>Average Price</Text>
          <Text style={s.text}>{money(application.average_price)}</Text>
          <Text style={s.heading}>Additional Notes</Text>
          <Text style={s.text}>{application.additional_notes || "None"}</Text>
          <Text style={s.heading}>Electricity</Text>
          <Text style={s.text}>{application.electricity_required ? `Required · ${money(application.electricity_fee)}` : "Not required"}</Text>
          <Text style={s.heading}>Agreement</Text>
          <Text style={s.text}>{application.nda_accepted_at && application.governance_accepted_at ? "Signed" : "Not available"}</Text>
        </VendorMarketplaceSectionCard>
        <TouchableOpacity
          style={marketplaceStyles.secondaryButton}
          onPress={() => navigation.navigate("vendorMarketplaceMessagesScreen", {
            eventId: application.event_id || event.event_id,
            applicationId: application.application_id,
          })}
        >
          <Text style={marketplaceStyles.secondaryButtonText}>Message Coordinator</Text>
        </TouchableOpacity>
        {photos.length ? (
          <VendorMarketplaceSectionCard style={s.section}>
            <Text style={s.heading}>Submitted Photos</Text>
            <View style={s.photos}>
              {photos.map((photo, index) => (
                <TouchableOpacity key={`${photo.photo_id || "photo"}-${index}`} onPress={() => setViewer({ images: photos.map((item) => ({ image_url: item.file_url })), index })}>
                  <Image source={{ uri: photo.file_url }} style={s.photo} />
                  {photo.category ? <Text style={s.caption}>{statusLabel(photo.category)}</Text> : null}
                </TouchableOpacity>
              ))}
            </View>
          </VendorMarketplaceSectionCard>
        ) : null}
        {paymentDue ? (
          <TouchableOpacity style={marketplaceStyles.button} onPress={() => navigation.navigate("vendorMarketplacePaymentScreen", { paymentId: application.payment_id, returnScreen: "eventVendorMarketplaceScreen" })}>
            <Text style={marketplaceStyles.buttonText}>Complete Award Checkout</Text>
          </TouchableOpacity>
        ) : null}
        {["AWARDED", "PAID"].includes(application.status) ? (
          <Text style={s.awardNotice}>{application.status === "PAID" ? "Award payment completed. Event and authorized contact details remain available through this record." : "This submission was awarded and is read-only."}</Text>
        ) : null}
      </ScrollView>
      <MarketplaceImageViewer images={viewer?.images || []} initialIndex={viewer?.index || 0} visible={!!viewer} onClose={() => setViewer(null)} />
    </MarketplaceVendorScreenLayout>
  );
}

const s = StyleSheet.create({
  page: { padding: 18, paddingBottom: 60, backgroundColor: "#fff" },
  eventName: { fontSize: 24, fontWeight: "800", color: "#172033" },
  status: { color: AppColor.primary, fontWeight: "800", marginTop: 8 },
  text: { color: "#475569", lineHeight: 21, marginTop: 5 },
  section: { borderTopWidth: 1, borderTopColor: "#e2e8f0", marginTop: 18, paddingTop: 14 },
  heading: { color: "#172033", fontWeight: "800", marginTop: 10 },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  photo: { width: 104, height: 104, borderRadius: 10 },
  caption: { width: 104, color: "#64748b", fontSize: 11, marginTop: 3 },
  primary: { backgroundColor: AppColor.primary, padding: 15, borderRadius: 10, alignItems: "center", marginTop: 20 },
  primaryText: { color: "#fff", fontWeight: "800" },
  secondary: { borderWidth: 1, borderColor: AppColor.primary, padding: 14, borderRadius: 10, alignItems: "center", marginTop: 18 },
  secondaryText: { color: AppColor.primary, fontWeight: "800" },
  awardNotice: { backgroundColor: "#ecfdf5", color: "#166534", padding: 12, borderRadius: 10, marginTop: 16 },
});
