import React from "react";
import { Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StatusBarManager from "../components/StatusBarManager";
import {
  MarketplaceHeader,
  formatDate,
  formatDuration,
  formatMoney,
  formatStatusLabel,
  getBidEvent,
  getEventLocation,
  styles,
} from "./vendorMarketplaceShared";

const DetailRow = ({ label, value }) => (
  <View style={{ marginTop: 12 }}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.meta}>{value || "None"}</Text>
  </View>
);

const boolText = (value) => (value ? "Yes" : "No");

const attachmentLabel = (type) => {
  switch (type) {
    case "BID_MENU_PDF":
      return "Sample Menu";
    case "BID_IMAGE":
      return "Food Photo";
    case "PERMIT_LICENSE":
      return "Permit / License";
    case "AGREEMENT_DOCUMENT":
      return "Agreement Document";
    default:
      return "Attachment";
  }
};

const VendorMarketplaceBidDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const bid = route?.params?.bid || {};
  const event = route?.params?.event || getBidEvent(bid);
  const attachments = Array.isArray(bid.attachments) ? bid.attachments : [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <MarketplaceHeader title="Bid Details" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <Text style={styles.title}>{event?.event_name || "Marketplace Bid"}</Text>
          <DetailRow label="Event Type" value={event?.event_type} />
          <DetailRow label="Event Date" value={formatDate(event?.event_date)} />
          <DetailRow label="Event Time" value={event?.event_time || "Not set"} />
          <DetailRow label="Duration" value={formatDuration(event)} />
          <DetailRow label="Location" value={getEventLocation(event)} />
          <DetailRow
            label="Estimated Guests"
            value={
              event?.number_of_guests ? `${event.number_of_guests}` : "Not provided"
            }
          />
          <DetailRow
            label="Event Budget"
            value={formatMoney(event?.budgeted_amount)}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Bid Response</Text>
          <DetailRow label="Bid Status" value={formatStatusLabel(bid.bid_status)} />
          <DetailRow label="Bid Amount" value={formatMoney(bid.full_bid_amount)} />
          <DetailRow
            label="Price Per Guest"
            value={
              bid.price_per_guest != null
                ? formatMoney(bid.price_per_guest)
                : "Not provided"
            }
          />
          <DetailRow
            label="Average Price Per Meal"
            value={
              bid.average_price_per_meal != null
                ? formatMoney(bid.average_price_per_meal)
                : "Not provided"
            }
          />
          <DetailRow
            label="Menu Description"
            value={bid.menu_description || "Not provided"}
          />
          <DetailRow
            label="Special Notes to Event Coordinator"
            value={bid.notes || "Not provided"}
          />
          <DetailRow
            label="Submitted Date"
            value={bid.submitted_at ? formatDate(bid.submitted_at) : "Not submitted"}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Requirements</Text>
          <DetailRow
            label="Insurance Response"
            value={boolText(bid.insurance_confirmed)}
          />
          <DetailRow
            label="Permit Response"
            value={boolText(bid.permits_confirmed)}
          />
          <DetailRow
            label="Liquor License Response"
            value={boolText(bid.liquor_license_confirmed)}
          />
          <DetailRow
            label="NDA Agreement Response"
            value={boolText(bid.nda_acknowledged)}
          />
          {/* TODO: Route to DocuSign/signing status when the vendor bid signing flow is exposed. */}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Uploaded Files</Text>
          {attachments.length ? (
            attachments.map((attachment) => (
              <TouchableOpacity
                key={attachment.attachment_id || attachment.file_url}
                activeOpacity={0.7}
                style={[styles.secondaryButton, { marginTop: 10 }]}
                onPress={() =>
                  attachment.file_url ? Linking.openURL(attachment.file_url) : null
                }
              >
                <Text style={styles.secondaryButtonText} numberOfLines={1}>
                  {attachmentLabel(attachment.attachment_type)}:{" "}
                  {attachment.original_name || "Open file"}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No files uploaded for this bid.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default VendorMarketplaceBidDetailScreen;
