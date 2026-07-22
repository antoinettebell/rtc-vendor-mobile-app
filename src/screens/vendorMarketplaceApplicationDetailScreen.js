import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StatusBarManager from "../components/StatusBarManager";
import {
  MarketplaceHeader,
  MarketplaceAttachmentPicker,
  formatDate,
  formatDuration,
  formatMoney,
  formatStatusLabel,
  getApplicationEvent,
  getEventLocation,
  isApplicationRevisionRequested,
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
    case "APPLICATION_MENU_PDF":
      return "Sample Menu";
    case "APPLICATION_IMAGE":
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

const VendorMarketplaceApplicationDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const application = route?.params?.application || {};
  const event = route?.params?.event || getApplicationEvent(application);
  const attachments = Array.isArray(application.attachments)
    ? application.attachments
    : [];
  const status = application.application_status || "DRAFT";
  const canPay = status === "ACCEPTED" || status === "PAYMENT_DUE";
  const canRevise = isApplicationRevisionRequested(application);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <MarketplaceHeader title="Application Details" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <Text style={styles.title}>{event?.event_name || "Application"}</Text>
          {canRevise ? (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.button, { marginTop: 14 }]}
              onPress={() =>
                navigation.navigate("VendorApplicationScreen", {
                  eventId: application.event_id || event?.event_id,
                  application,
                  event,
                })
              }
            >
              <Text style={styles.buttonText}>Revise Application</Text>
            </TouchableOpacity>
          ) : null}
          <DetailRow label="Event Type" value={event?.event_type} />
          <DetailRow label="Event Date" value={formatDate(event?.event_date)} />
          <DetailRow label="Event Time" value={event?.event_time || "Not set"} />
          <DetailRow label="Duration" value={formatDuration(event)} />
          <DetailRow label="Location" value={getEventLocation(event)} />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Vendor Fee</Text>
          <DetailRow label="Vendor Fee" value={formatMoney(event?.vendor_fee)} />
          <Text style={styles.meta}>Set by Event Coordinator</Text>
          <Text style={styles.meta}>Payment required only if accepted.</Text>
          {canPay ? (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.button, { marginTop: 14 }]}
              onPress={() =>
                navigation.navigate("VendorFeeCheckoutScreen", {
                  application,
                  event,
                })
              }
            >
              <Text style={styles.buttonText}>Pay Vendor Fee</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Application</Text>
          <DetailRow label="Status" value={formatStatusLabel(status)} />
          <DetailRow label="Business Name" value={application.business_name} />
          <DetailRow label="Contact Name" value={application.contact_name} />
          <DetailRow label="Phone" value={application.phone} />
          <DetailRow label="Email" value={application.email} />
          <DetailRow
            label="Food Type / Cuisine"
            value={application.food_type_cuisine}
          />
          <DetailRow
            label="Menu Description"
            value={application.menu_description || "Not provided"}
          />
          <DetailRow
            label="Special Notes to Event Coordinator"
            value={application.notes || "Not provided"}
          />
          <DetailRow
            label="Submitted Date"
            value={
              application.submitted_at
                ? formatDate(application.submitted_at)
                : "Not submitted"
            }
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Requirements</Text>
          <DetailRow
            label="Insurance Response"
            value={boolText(application.insurance_confirmed)}
          />
          <DetailRow
            label="Permit Response"
            value={boolText(application.permits_confirmed)}
          />
          <DetailRow
            label="Liquor License Response"
            value={boolText(application.liquor_license_confirmed)}
          />
          <DetailRow
            label="NDA Agreement Response"
            value={boolText(application.nda_acknowledged)}
          />
          {/* TODO: Route to signing status when vendor application signing is exposed. */}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Uploaded Files</Text>
          <MarketplaceAttachmentPicker
            attachments={attachments}
            getLabel={attachmentPickerLabel}
            emptyText="No files uploaded for this application."
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default VendorMarketplaceApplicationDetailScreen;
