import React, { useState } from "react";
import { Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StatusBarManager from "../components/StatusBarManager";
import AppImage from "../components/AppImage";
import MarketplaceImageViewer from "../components/MarketplaceImageViewer";
import {
  MarketplaceHeader,
  MarketplaceAttachmentPicker,
  formatDate,
  formatEventDeadlineDate,
  formatDuration,
  formatMoney,
  formatTimeRange,
  formatStatusLabel,
  getBidEvent,
  getEventLocation,
  isBidRevisionRequested,
  styles,
} from "./vendorMarketplaceShared";
import { getMarketplaceSubmissionDisplayStatus } from "../helpers/marketplaceSubmissionDisplay.helper";
import { getFoodVendorMarketplaceCloseDate, getFoodVendorMarketplaceGuestRows } from "../helpers/foodVendorMarketplaceGuestCounts.helper";
import { getMarketplaceEventSupportId } from "../helpers/marketplaceSupportId.helper";
import { getMarketplaceBidTotal } from "../helpers/marketplaceBidTotal.helper";
import { getPublicEventImages } from "../helpers/eventVendorPresentation.helper";

const DetailRow = ({ label, value }) => (
  <View style={{ marginTop: 12 }}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.meta}>{value || "None"}</Text>
  </View>
);

const boolText = (value) => (value ? "Yes" : "No");

const hasDisplayValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const firstValue = (...values) =>
  values.find((value) => hasDisplayValue(value)) || null;

const getCoordinatorContact = (record = {}, event = {}) => {
  const contact =
    record.coordinator_contact ||
    record.coordinatorContact ||
    event.coordinator_contact ||
    event.coordinatorContact ||
    null;

  return {
    businessName: firstValue(
      record.coordinator_business_name,
      record.coordinatorBusinessName,
      event.coordinator_business_name,
      event.coordinatorBusinessName,
      contact?.business_name,
      contact?.businessName,
    ),
    name: firstValue(
      record.coordinator_contact_name,
      record.coordinatorContactName,
      event.coordinator_contact_name,
      event.coordinatorContactName,
      contact?.name,
      [contact?.firstName, contact?.lastName].filter(Boolean).join(" "),
      contact?.full_name,
    ),
    phone: firstValue(
      record.coordinator_phone,
      record.coordinatorPhone,
      event.coordinator_phone,
      event.coordinatorPhone,
      contact?.phone,
      contact?.phoneNumber,
      contact?.mobile,
    ),
    email: firstValue(
      record.coordinator_email,
      record.coordinatorEmail,
      event.coordinator_email,
      event.coordinatorEmail,
      contact?.email,
      contact?.emailAddress,
    ),
  };
};

const attachmentLabel = (type) => {
  switch (type) {
    case "BID_MENU_PDF":
      return "Sample Menu";
    case "BID_IMAGE":
      return "Food Photo";
    case "PERMIT_LICENSE":
      return "Business License/Permit";
    case "REQUIREMENT_DOCUMENT":
      return "Requirement";
    case "AGREEMENT_DOCUMENT":
      return "Signed Agreement";
    default:
      return "Attachment";
  }
};

const attachmentPickerLabel = (attachment) =>
  `${attachment.requirement_label || attachmentLabel(attachment.attachment_type)}: ${
    attachment.original_name || "Open file"
  }`;

const VendorMarketplaceBidDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const bid = route?.params?.bid || {};
  const event = route?.params?.event || getBidEvent(bid);
  const eventImages = getPublicEventImages(event);
  const attachments = Array.isArray(bid.attachments) ? bid.attachments : [];
  const imageAttachments = attachments.filter((item) =>
    String(item.mime_type || "").startsWith("image/") || item.attachment_type === "BID_IMAGE",
  );
  const documentAttachments = attachments.filter((item) => !imageAttachments.includes(item));
  const [viewer, setViewer] = useState(null);
  const [eventImageViewer, setEventImageViewer] = useState(null);
  const canRevise = isBidRevisionRequested(bid) || !!bid.specialty_update_available_at;
  const supportId = getMarketplaceEventSupportId(event, bid);
  const detailsUnlocked =
    bid?.marketplace_unlock?.details_unlocked === true ||
    event?.marketplace_unlock?.details_unlocked === true;
  const coordinatorContact = getCoordinatorContact(bid, event);
  const hasCoordinatorContact = Object.values(coordinatorContact).some(hasDisplayValue);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <MarketplaceHeader title="Bid Details" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <Text style={styles.title}>{event?.event_name || "Marketplace Bid"}</Text>
          {supportId ? <DetailRow label="Event ID" value={supportId} /> : null}
          {canRevise ? (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.button, { marginTop: 14 }]}
              onPress={() =>
                navigation.navigate("VendorBidResponseScreen", {
                  eventId: bid.event_id || event?.event_id,
                  bid,
                  event,
                })
              }
            >
              <Text style={styles.buttonText}>{isBidRevisionRequested(bid) ? "Revise Bid" : "Update Bid"}</Text>
            </TouchableOpacity>
          ) : null}
          <DetailRow label="Event Type" value={event?.event_type} />
          <DetailRow label="Event Date" value={formatDate(event?.event_date)} />
          <DetailRow label="Event Time" value={formatTimeRange(event?.event_time)} />
          <DetailRow label="Duration" value={formatDuration(event)} />
          <DetailRow label="Location" value={getEventLocation(event)} />
          {getFoodVendorMarketplaceGuestRows({ event, participationPath: bid?.guest_coverage === "BOTH" ? "BOTH" : "BID", coverage: bid?.guest_coverage }).map((row) => <DetailRow key={row.label} label={row.label} value={row.value} />)}
          <DetailRow label="Application/Bid Deadline" value={formatEventDeadlineDate(getFoodVendorMarketplaceCloseDate(event), event)} />
          <DetailRow
            label="Event Budget"
            value={formatMoney(event?.budgeted_amount)}
          />
        </View>

        {eventImages.length ? (
          <View style={styles.card}>
            <Text style={styles.title}>Event Coordinator Images</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 12 }}
            >
              {eventImages.map((image, index) => (
                <TouchableOpacity
                  key={image.image_id || image.image_url}
                  activeOpacity={0.85}
                  onPress={() => setEventImageViewer(index)}
                >
                  <AppImage
                    uri={image.image_url}
                    containerStyle={{
                      height: 140,
                      width: 210,
                      borderRadius: 10,
                      marginRight: 12,
                    }}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.title}>Event Coordinator</Text>
          {detailsUnlocked && hasCoordinatorContact ? (
            <>
              {hasDisplayValue(coordinatorContact.businessName) ? (
                <DetailRow label="Business Name" value={coordinatorContact.businessName} />
              ) : null}
              {hasDisplayValue(coordinatorContact.name) ? (
                <DetailRow label="Name" value={coordinatorContact.name} />
              ) : null}
              {hasDisplayValue(coordinatorContact.phone) ? (
                <DetailRow label="Phone" value={coordinatorContact.phone} />
              ) : null}
              {hasDisplayValue(coordinatorContact.email) ? (
                <DetailRow label="Email" value={coordinatorContact.email} />
              ) : null}
              <View style={[styles.row, { marginTop: 14 }]}>
                {hasDisplayValue(coordinatorContact.phone) ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.secondaryButton, styles.flex]}
                    onPress={() => Linking.openURL(`tel:${coordinatorContact.phone}`)}
                  >
                    <Text style={styles.secondaryButtonText}>Call Event Coordinator</Text>
                  </TouchableOpacity>
                ) : null}
                {hasDisplayValue(coordinatorContact.email) ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.secondaryButton, styles.flex]}
                    onPress={() => Linking.openURL(`mailto:${coordinatorContact.email}`)}
                  >
                    <Text style={styles.secondaryButtonText}>Email Event Coordinator</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </>
          ) : detailsUnlocked ? (
            <Text style={styles.emptyText}>Coordinator contact will appear here once available.</Text>
          ) : (
            <Text style={styles.emptyText}>
              Coordinator contact unlocks after the coordinator's booking payment is complete.
            </Text>
          )}
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.secondaryButton, { marginBottom: 14 }]}
          onPress={() => navigation.navigate("vendorMarketplaceMessagesScreen", {
            eventId: bid.event_id || event?.event_id,
            bidId: bid.bid_id,
          })}
        >
          <Text style={styles.secondaryButtonText}>Message Coordinator</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.title}>Bid Response</Text>
          <DetailRow
            label="Bid Status"
            value={formatStatusLabel(getMarketplaceSubmissionDisplayStatus(bid, bid.bid_status))}
          />
          <DetailRow label="Bid Amount" value={formatMoney(bid.full_bid_amount)} />
          {bid.dessert_bid_amount != null ? <DetailRow label="Desserts Bid Amount" value={formatMoney(bid.dessert_bid_amount)} /> : null}
          {bid.dessert_price_per_guest != null ? <DetailRow label="Desserts Price Per Guest" value={formatMoney(bid.dessert_price_per_guest)} /> : null}
          {bid.drinks_bid_amount != null ? <DetailRow label="Drinks Bid Amount" value={formatMoney(bid.drinks_bid_amount)} /> : null}
          {bid.drinks_price_per_guest != null ? <DetailRow label="Drinks Price Per Guest" value={formatMoney(bid.drinks_price_per_guest)} /> : null}
          <DetailRow label="Total Bid Amount" value={formatMoney(getMarketplaceBidTotal(bid))} />
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
          <MarketplaceAttachmentPicker
            attachments={documentAttachments}
            getLabel={attachmentPickerLabel}
            emptyText="No files uploaded for this bid."
          />
          {imageAttachments.map((attachment, index) => (
            <TouchableOpacity key={attachment.attachment_id || attachment.file_url} onPress={() => setViewer(index)}>
              <Text style={[styles.secondaryButtonText, { marginTop: 12 }]}>View {attachmentPickerLabel(attachment)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <MarketplaceImageViewer
        images={imageAttachments.map((item) => item.file_url)}
        initialIndex={viewer || 0}
        visible={viewer !== null}
        onClose={() => setViewer(null)}
      />
      <MarketplaceImageViewer
        images={eventImages}
        initialIndex={eventImageViewer ?? 0}
        visible={eventImageViewer !== null}
        onClose={() => setEventImageViewer(null)}
      />
    </View>
  );
};

export default VendorMarketplaceBidDetailScreen;
