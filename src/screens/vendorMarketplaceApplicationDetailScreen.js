import React, { useCallback, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StatusBarManager from "../components/StatusBarManager";
import MarketplaceImageViewer from "../components/MarketplaceImageViewer";
import { getMarketplaceMyApplications_API } from "../api/appAPI";
import { canPayMarketplaceVendorFee } from "../helpers/marketplaceVendorFeeState.helper";
import {
  MarketplaceHeader,
  MarketplaceAttachmentPicker,
  formatDate,
  formatDuration,
  formatMoney,
  formatTimeRange,
  formatStatusLabel,
  getApplicationEvent,
  getEventLocation,
  isApplicationRevisionRequested,
  styles,
} from "./vendorMarketplaceShared";
import { getMarketplaceSubmissionDisplayStatus } from "../helpers/marketplaceSubmissionDisplay.helper";

const DetailRow = ({ label, value }) => (
  <View style={{ marginTop: 12 }}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.meta}>{value || "None"}</Text>
  </View>
);

const boolText = (value) => (value ? "Yes" : "No");

const PRE_AWARD_EDIT_STATUSES = ["SUBMITTED", "UNDER_REVIEW"];

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
  const routeApplication = route?.params?.application || {};
  const [application, setApplication] = useState(routeApplication);
  const applicationId = routeApplication.application_id;
  const event = route?.params?.event || getApplicationEvent(application);
  const attachments = Array.isArray(application.attachments)
    ? application.attachments
    : [];
  const imageAttachments = attachments.filter((item) =>
    String(item.mime_type || "").startsWith("image/") || item.attachment_type === "APPLICATION_IMAGE",
  );
  const documentAttachments = attachments.filter((item) => !imageAttachments.includes(item));
  const [viewer, setViewer] = useState(null);
  const status = String(application.application_status || "DRAFT").toUpperCase();
  const canPay = canPayMarketplaceVendorFee(application);
  const canRevise = isApplicationRevisionRequested(application);
  const canEditBeforeAward = PRE_AWARD_EDIT_STATUSES.includes(
    String(status).toUpperCase(),
  );
  const showEditButton = canRevise || canEditBeforeAward;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const refreshApplication = async () => {
        if (!applicationId) return;
        try {
          const response = await getMarketplaceMyApplications_API();
          const currentApplication = (
            response?.data?.marketplaceApplicationList || []
          ).find((item) => item.application_id === applicationId);
          if (active && currentApplication) {
            setApplication(currentApplication);
          }
        } catch (_error) {
          // Retain the last known details if a refresh is temporarily unavailable.
        }
      };
      refreshApplication();
      return () => {
        active = false;
      };
    }, [applicationId]),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <MarketplaceHeader title="Application Details" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <Text style={styles.title}>{event?.event_name || "Application"}</Text>
          {showEditButton ? (
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
              <Text style={styles.buttonText}>
                {canRevise ? "Revise Application" : "Edit Application"}
              </Text>
            </TouchableOpacity>
          ) : null}
          <DetailRow label="Event Type" value={event?.event_type} />
          <DetailRow label="Event Date" value={formatDate(event?.event_date)} />
          <DetailRow label="Event Time" value={formatTimeRange(event?.event_time)} />
          <DetailRow label="Duration" value={formatDuration(event)} />
          <DetailRow label="Location" value={getEventLocation(event)} />
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.secondaryButton, { marginBottom: 14 }]}
          onPress={() => navigation.navigate("vendorMarketplaceMessagesScreen", {
            eventId: application.event_id || event?.event_id,
            applicationId: application.application_id,
          })}
        >
          <Text style={styles.secondaryButtonText}>Message Coordinator</Text>
        </TouchableOpacity>

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
          <DetailRow
            label="Status"
            value={formatStatusLabel(getMarketplaceSubmissionDisplayStatus(application, status))}
          />
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
            attachments={documentAttachments}
            getLabel={attachmentPickerLabel}
            emptyText="No files uploaded for this application."
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
    </View>
  );
};

export default VendorMarketplaceApplicationDetailScreen;
