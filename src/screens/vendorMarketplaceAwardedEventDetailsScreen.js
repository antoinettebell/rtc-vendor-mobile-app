import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StatusBarManager from "../components/StatusBarManager";
import AppImage from "../components/AppImage";
import MarketplaceImageViewer from "../components/MarketplaceImageViewer";
import { createMarketplaceFinalPayment_API } from "../api/appAPI";
import { getPublicEventImages } from "../helpers/eventVendorPresentation.helper";
import {
  MarketplaceHeader,
  formatDate,
  formatDuration,
  formatMoney,
  formatTimeRange,
  formatStatusLabel,
  getApplicationEvent,
  getBidEvent,
  getEventLocation,
  getPaymentTypeLabel,
  isVendorPaysToAttendEvent,
  styles,
} from "./vendorMarketplaceShared";
import { getMarketplaceEventSupportId } from "../helpers/marketplaceSupportId.helper";

const RTC_EVENT_PROCESSING_RATE = 0.02;

const DetailRow = ({ label, value, strong }) => (
  <View style={{ marginTop: 12 }}>
    <Text style={styles.label}>{label}</Text>
    <Text style={strong ? styles.amountText : styles.meta}>
      {hasDisplayValue(value) ? value : "None"}
    </Text>
  </View>
);

const boolText = (value) => (value ? "Yes" : "No");

const hasDisplayValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const firstValue = (...values) =>
  values.find((value) => hasDisplayValue(value)) || null;

const getCoordinatorContact = (record = {}, event = {}) => {
  const contact =
    record.coordinatorContact ||
    record.coordinator_contact ||
    event.coordinatorContact ||
    event.coordinator_contact ||
    event.eventCoordinator ||
    event.coordinator ||
    event.customer ||
    (typeof event.customer_user_id === "object" ? event.customer_user_id : null);

  const nameFromContact = contact
    ? firstValue(
        contact.name,
        [contact.firstName, contact.lastName].filter(Boolean).join(" "),
        contact.full_name,
      )
    : null;

  return {
    businessName: firstValue(
      record.coordinatorBusinessName,
      record.coordinator_business_name,
      event.coordinatorBusinessName,
      event.coordinator_business_name,
      contact?.businessName,
      contact?.business_name,
    ),
    name: firstValue(
      record.coordinatorContactName,
      record.coordinator_contact_name,
      event.coordinatorContactName,
      event.coordinator_contact_name,
      nameFromContact,
    ),
    phone: firstValue(
      record.coordinatorPhone,
      record.coordinator_phone,
      event.coordinatorPhone,
      event.coordinator_phone,
      contact?.phone,
      contact?.phoneNumber,
      contact?.mobile,
    ),
    email: firstValue(
      record.coordinatorEmail,
      record.coordinator_email,
      event.coordinatorEmail,
      event.coordinator_email,
      contact?.email,
      contact?.emailAddress,
    ),
  };
};

const getBidPayoutStatus = (bid, event) => {
  if (bid?.final_payment_status === "PAID") {
    return "Paid to Vendor";
  }
  if (["PENDING", "FAILED"].includes(bid?.final_payment_status)) {
    return "Awaiting Coordinator Payment";
  }
  if (bid?.final_payment_status === "PROCESSING") {
    return "Payment Processing";
  }
  const explicitStatus =
    bid?.payout_status ||
    bid?.vendor_payout_status ||
    bid?.payment_status ||
    event?.award_payment_status;

  switch (explicitStatus) {
    case "PAID_TO_VENDOR":
      return "Paid to Vendor";
    case "PAYOUT_PROCESSING":
    case "PROCESSING":
      return "Payout Processing";
    case "PAID":
      return "Coordinator Paid";
    case "PENDING":
    case "NOT_REQUIRED":
    default:
      return "Pending Event Closing";
  }
};

const isPaidApplication = (application) =>
  application?.payment_status === "PAID" ||
  application?.application_status === "PAID" ||
  application?.application_status === "CONFIRMED" ||
  (application?.transaction_id && application?.payment_status === "PAID");

const getApplicationPaymentStatus = (application) => {
  if (application?.application_status === "CONFIRMED") {
    return "Confirmed";
  }
  if (isPaidApplication(application)) {
    return "Paid";
  }
  return "Payment Due";
};

const canPayApplication = (application) =>
  ["ACCEPTED", "PAYMENT_DUE"].includes(application?.application_status) &&
  !isPaidApplication(application);

const getDocumentUrl = (document) =>
  typeof document === "string"
    ? document
    : document?.file_url ||
      document?.image_url ||
      document?.url ||
      document?.document_url;

const hasDocumentVisibility = (document = {}) =>
  document.documentVisibility !== undefined ||
  document.visibility !== undefined ||
  document.isPublic !== undefined ||
  document.isPrivate !== undefined ||
  document.is_public !== undefined ||
  document.is_private !== undefined;

const isPrivateDocument = (document = {}) => {
  const visibility = String(
    document.documentVisibility || document.visibility || "",
  ).toUpperCase();
  return (
    visibility === "PRIVATE" ||
    document.isPrivate === true ||
    document.is_private === true
  );
};

const isPublicDocument = (document = {}) => {
  const visibility = String(
    document.documentVisibility || document.visibility || "",
  ).toUpperCase();
  return (
    visibility === "PUBLIC" ||
    document.isPublic === true ||
    document.is_public === true
  );
};

const canShowDocument = (document, contactUnlocked, fallbackVisible = false) => {
  if (!hasDocumentVisibility(document)) {
    return fallbackVisible;
  }
  return isPublicDocument(document) || (contactUnlocked && isPrivateDocument(document));
};

const normalizeDocument = (document, source) => {
  const url = getDocumentUrl(document);
  if (!url) {
    return null;
  }

  return typeof document === "string"
    ? { file_url: document, original_name: "View Document", source }
    : { ...document, source };
};

const getAllowedDocuments = (record, event, contactUnlocked) => {
  const publicDocuments = [
    ...(Array.isArray(record?.publicDocuments) ? record.publicDocuments : []),
    ...(Array.isArray(record?.public_documents) ? record.public_documents : []),
    ...(Array.isArray(event?.publicDocuments) ? event.publicDocuments : []),
    ...(Array.isArray(event?.public_documents) ? event.public_documents : []),
  ];
  const privateDocuments = [
    ...(Array.isArray(record?.privateDocuments) ? record.privateDocuments : []),
    ...(Array.isArray(record?.private_documents) ? record.private_documents : []),
    ...(Array.isArray(event?.privateDocuments) ? event.privateDocuments : []),
    ...(Array.isArray(event?.private_documents) ? event.private_documents : []),
    ...(Array.isArray(record?.coordinatorDocuments)
      ? record.coordinatorDocuments
      : []),
    ...(Array.isArray(record?.coordinator_documents)
      ? record.coordinator_documents
      : []),
    ...(Array.isArray(event?.coordinatorDocuments)
      ? event.coordinatorDocuments
      : []),
    ...(Array.isArray(event?.coordinator_documents)
      ? event.coordinator_documents
      : []),
  ];
  const eventDocuments = Array.isArray(event?.documents) ? event.documents : [];
  const eventFlyers = Array.isArray(event?.flyers) ? event.flyers : [];
  const eventImages = Array.isArray(event?.images) ? event.images : [];
  const signedDocumentUrl =
    record?.signed_document_url ||
    record?.agreement_signed_document_url ||
    event?.signed_document_url;

  const existingEndpointDocuments = [
    ...eventDocuments.map((document) => normalizeDocument(document, "event")),
    ...eventFlyers.map((document) => normalizeDocument(document, "event")),
    ...eventImages.map((document) => normalizeDocument(document, "event")),
    signedDocumentUrl
      ? {
          file_url: signedDocumentUrl,
          original_name: "Signed NDA / Agreement",
          source: "agreement",
        }
      : null,
  ].filter(Boolean)
    .filter((document) => canShowDocument(document, contactUnlocked, true));

  const futureDocuments = [
    ...publicDocuments.map((document) => normalizeDocument(document, "public")),
    ...(contactUnlocked
      ? privateDocuments.map((document) => normalizeDocument(document, "private"))
      : []),
  ].filter(Boolean);

  const visibleFutureDocuments = futureDocuments.filter((document) =>
    canShowDocument(document, contactUnlocked, document.source === "public" || contactUnlocked),
  );

  const documentsByUrl = new Map();
  [...visibleFutureDocuments, ...existingEndpointDocuments].forEach(
    (document) => {
      const url = getDocumentUrl(document);
      if (url && !documentsByUrl.has(url)) {
        documentsByUrl.set(url, document);
      }
    },
  );

  return Array.from(documentsByUrl.values());
};

const openPhone = (phone) => {
  if (phone) {
    Linking.openURL(`tel:${phone}`);
  }
};

const openEmail = (email) => {
  if (email) {
    Linking.openURL(`mailto:${email}`);
  }
};

const PaymentTypeBadge = ({ event }) => {
  const vendorPays = isVendorPaysToAttendEvent(event);
  return (
    <View
      style={[
        styles.badge,
        vendorPays ? styles.paymentBadgeOrange : styles.paymentBadgeGreen,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          vendorPays
            ? styles.paymentBadgeTextOrange
            : styles.paymentBadgeTextGreen,
        ]}
      >
        {getPaymentTypeLabel(event)}
      </Text>
    </View>
  );
};

const VendorMarketplaceAwardedEventDetailsScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const itemType = route?.params?.itemType || "BID";
  const bid = route?.params?.bid || {};
  const application = route?.params?.application || {};
  const record = itemType === "APPLICATION" ? application : bid;
  const event =
    route?.params?.event ||
    (itemType === "APPLICATION"
      ? getApplicationEvent(application)
      : getBidEvent(bid));
  const eventImages = getPublicEventImages(event);
  const supportId = getMarketplaceEventSupportId(event, bid, application);
  const vendorPays = isVendorPaysToAttendEvent(event);
  const unlockState =
    record?.marketplace_unlock || event?.marketplace_unlock || {};
  const contactUnlocked =
    unlockState.details_unlocked === true ||
    (unlockState.details_unlocked == null &&
      (itemType === "BID"
        ? bid?.bid_status === "AWARDED"
        : isPaidApplication(application)));
  const coordinatorContact = getCoordinatorContact(record, event);
  const hasCoordinatorContact =
    hasDisplayValue(coordinatorContact.businessName) ||
    hasDisplayValue(coordinatorContact.name) ||
    hasDisplayValue(coordinatorContact.phone) ||
    hasDisplayValue(coordinatorContact.email);
  const documents = getAllowedDocuments(record, event, contactUnlocked);
  const vendorFee = Number(event?.vendor_fee || 0);
  const rtcEventProcessingFee = Number(
    (vendorFee * RTC_EVENT_PROCESSING_RATE).toFixed(2),
  );
  const totalPaid =
    record.totalPaidByVendor ||
    record.total_paid_by_vendor ||
    record.total_amount ||
    vendorFee + rtcEventProcessingFee;

  const showConfirmation = vendorPays && isPaidApplication(application);
  const [finalPayment, setFinalPayment] = useState(
    record?.final_payment_id
      ? {
          payment_id: record.final_payment_id,
          payment_status: record.final_payment_status,
        }
      : null,
  );
  const [closingEvent, setClosingEvent] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const closeState = record?.vendor_event_close || {};
  const closeAvailableAt = closeState.available_at
    ? new Date(closeState.available_at).getTime()
    : null;
  const canVendorCloseEvent =
    !vendorPays &&
    itemType === "BID" &&
    bid?.bid_status === "AWARDED" &&
    !finalPayment?.payment_id &&
    (closeState.can_close === true ||
      (Number.isFinite(closeAvailableAt) && currentTime >= closeAvailableAt));
  const showVendorCloseEvent =
    !vendorPays &&
    itemType === "BID" &&
    bid?.bid_status === "AWARDED" &&
    !finalPayment?.payment_id;
  const finalPaymentId = finalPayment?.payment_id || record?.final_payment_id;
  const finalPaymentStatus =
    finalPayment?.payment_status || record?.final_payment_status || "NOT_REQUIRED";
  const canAcceptFinalEventPayment =
    !!finalPaymentId && finalPaymentStatus !== "PAID";

  useEffect(() => {
    if (!showVendorCloseEvent || !Number.isFinite(closeAvailableAt)) return undefined;
    const interval = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(interval);
  }, [closeAvailableAt, showVendorCloseEvent]);

  const openCoordinatorPaymentCheckout = async () => {
    if (!canVendorCloseEvent || closingEvent) return;
    setClosingEvent(true);
    try {
      const response = await createMarketplaceFinalPayment_API({
        event_id: event?.event_id || bid?.event_id,
        bid_id: bid?.bid_id,
      });
      const payment = response?.data?.marketplacePayment;
      if (!response?.success || !payment?.payment_id) {
        throw new Error("Final event payment was not created.");
      }
      setFinalPayment(payment);
      navigation.navigate("vendorMarketplacePaymentScreen", {
        payment,
        paymentId: payment.payment_id,
        returnScreen: "VendorAwardedEventsScreen",
        successMessage: "Final event payment is confirmed.",
      });
    } catch (error) {
      Alert.alert(
        "Event Payment",
        error?.message || "Unable to open the coordinator payment checkout.",
      );
    } finally {
      setClosingEvent(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <MarketplaceHeader title="Awarded Event Details" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <PaymentTypeBadge event={event} />
          <Text style={[styles.title, { marginTop: 12 }]}>
            {event?.event_name || "Marketplace Event"}
          </Text>
          {supportId ? <Text style={styles.label}>Event ID: {supportId}</Text> : null}
          <DetailRow label="Event Date" value={formatDate(event?.event_date)} />
          <DetailRow label="Event Time" value={formatTimeRange(event?.event_time)} />
          <DetailRow label="Duration" value={formatDuration(event)} />
          <DetailRow label="Location" value={getEventLocation(event)} />
          <DetailRow
            label="Event Description"
            value={event?.event_description || "Not provided"}
          />
        </View>

        {eventImages.length ? (
          <View style={styles.card}>
            <Text style={styles.title}>Event Images</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 12 }}
            >
              {eventImages.map((image, index) => (
                <TouchableOpacity
                  key={image.image_id || image.image_url}
                  activeOpacity={0.85}
                  onPress={() => setImageViewerIndex(index)}
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

        <View
          style={[
            styles.card,
            vendorPays ? styles.feeSummaryCard : styles.summaryCard,
          ]}
        >
          <Text style={styles.title}>Marketplace Status</Text>
          <DetailRow
            label="Payment Type"
            value={
              vendorPays
                ? "Vendor Pays to Attend"
                : "Coordinator Pays Vendor"
            }
          />
          {vendorPays ? (
            <>
              <DetailRow label="Vendor Fee" value={formatMoney(vendorFee)} />
              <DetailRow
                label="Payment Status"
                value={getApplicationPaymentStatus(application)}
              />
            </>
          ) : (
            <>
              <DetailRow
                label="Event Budget"
                value={formatMoney(event?.budgeted_amount)}
              />
              <DetailRow
                label="Your Bid Amount"
                value={formatMoney(bid?.full_bid_amount)}
              />
              <DetailRow
                label="Payout Status"
                value={getBidPayoutStatus(bid, event)}
              />
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Event Coordinator</Text>
          {contactUnlocked && hasCoordinatorContact ? (
            <>
              {hasDisplayValue(coordinatorContact.businessName) ? (
                <DetailRow
                  label="Business Name"
                  value={coordinatorContact.businessName}
                />
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
                    activeOpacity={0.8}
                    style={[styles.secondaryButton, styles.flex]}
                    onPress={() => openPhone(coordinatorContact.phone)}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Call Event Coordinator
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {hasDisplayValue(coordinatorContact.email) ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.secondaryButton, styles.flex]}
                    onPress={() => openEmail(coordinatorContact.email)}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Email Event Coordinator
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </>
          ) : contactUnlocked ? (
            <Text style={styles.emptyText}>
              Coordinator contact will appear here once available.
            </Text>
          ) : (
            <Text style={styles.emptyText}>
              Coordinator contact unlocks after the required payment or match condition.
            </Text>
          )}
          {/* TODO: Replace the fallback copy when backend returns coordinator
          private contact details on awarded/accepted marketplace records. */}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Requirements</Text>
          <DetailRow
            label="Insurance Required"
            value={boolText(event?.insurance_required)}
          />
          <DetailRow
            label="Permit Required"
            value={
              Array.isArray(event?.permits_required)
                ? event.permits_required.join(", ") || "No"
                : boolText(event?.permits_required)
            }
          />
          <DetailRow
            label="Liquor License Required"
            value={boolText(event?.alcohol_required)}
          />
          <DetailRow
            label="Free Food Offered"
            value={boolText(event?.free_food_offered)}
          />
          {event?.free_food_offered === true ? (
            <>
              <DetailRow
                label="Free Food Provider"
                value={event?.free_food_provider || "Not set"}
              />
              <DetailRow
                label="Vendors Must Give Away Food"
                value={boolText(event?.vendors_required_to_giveaway_food)}
              />
            </>
          ) : null}
          <DetailRow
            label="NDA Required"
            value={boolText(record?.nda_required || event?.nda_required)}
          />
          <DetailRow
            label="Agreement Status"
            value={formatStatusLabel(
              record?.agreement_status || event?.agreement_status || "NOT_REQUIRED",
            )}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Documents</Text>
          {documents.length ? (
            documents.map((document, index) => {
              const url = getDocumentUrl(document);
              return (
                <TouchableOpacity
                  key={url || index}
                  activeOpacity={0.8}
                  style={[styles.secondaryButton, { marginTop: 10 }]}
                  onPress={() => (url ? Linking.openURL(url) : null)}
                >
                  <Text style={styles.secondaryButtonText} numberOfLines={1}>
                    {document.original_name ||
                      document.name ||
                      document.title ||
                      "View Document"}
                  </Text>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.emptyText}>
              No event documents are available yet.
            </Text>
          )}
          {/* TODO: Add separate private/public document flags when backend
          exposes event document repository permissions. Existing endpoint
          documents remain visible until explicit flags are available. */}
        </View>

        {showConfirmation ? (
          <View style={styles.card}>
            <Text style={styles.title}>Payment Confirmation</Text>
            <DetailRow label="Event Name" value={event?.event_name} />
            <DetailRow label="Vendor Fee" value={formatMoney(vendorFee)} />
            <DetailRow
              label="RTC Event Processing Fee (2%)"
              value={formatMoney(
                record.rtcEventProcessingFee ||
                  record.rtc_event_processing_fee ||
                  rtcEventProcessingFee,
              )}
            />
            <DetailRow label="Total Paid" value={formatMoney(totalPaid)} />
            <DetailRow
              label="Payment Date"
              value={record.paid_at ? formatDate(record.paid_at) : "Not provided"}
            />
            <DetailRow
              label="Transaction ID"
              value={record.transaction_id || "Not provided"}
            />
            <DetailRow label="Status" value="Confirmed" strong />
          </View>
        ) : null}

        {vendorPays && canPayApplication(application) ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.button, { marginBottom: 12 }]}
            onPress={() =>
              navigation.navigate("VendorFeeCheckoutScreen", {
                application,
                event,
              })
            }
          >
            <Text style={styles.buttonText}>Pay Vendor Fee</Text>
          </TouchableOpacity>
        ) : vendorPays ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.secondaryButton, { marginBottom: 12 }]}
          >
            <Text style={styles.secondaryButtonText}>
              View Payment Confirmation
            </Text>
          </TouchableOpacity>
        ) : null}

        {showVendorCloseEvent ? (
          <>
            <TouchableOpacity
              activeOpacity={canVendorCloseEvent ? 0.8 : 1}
              style={[
                styles.button,
                { marginBottom: 12, opacity: canVendorCloseEvent ? 1 : 0.5 },
              ]}
              onPress={openCoordinatorPaymentCheckout}
              disabled={!canVendorCloseEvent || closingEvent}
            >
              {closingEvent ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Collect Event Payment</Text>
              )}
            </TouchableOpacity>
            {!canVendorCloseEvent ? (
              <Text style={[styles.emptyText, { marginBottom: 12 }]}>
                Final payment becomes available when the event starts.
              </Text>
            ) : null}
          </>
        ) : canAcceptFinalEventPayment ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.button, { marginBottom: 12 }]}
	            onPress={() =>
	              navigation.navigate("vendorMarketplacePaymentScreen", {
	                paymentId: finalPaymentId,
	                returnScreen: "VendorAwardedEventsScreen",
	                successMessage: "Final event payment is confirmed.",
	              })
	            }
          >
            <Text style={styles.buttonText}>Collect Event Payment</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
      <MarketplaceImageViewer
        images={eventImages}
        initialIndex={imageViewerIndex ?? 0}
        visible={imageViewerIndex !== null}
        onClose={() => setImageViewerIndex(null)}
      />
    </View>
  );
};

export default VendorMarketplaceAwardedEventDetailsScreen;
