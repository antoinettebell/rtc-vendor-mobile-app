import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import StatusBarManager from "../components/StatusBarManager";
import AppImage from "../components/AppImage";
import { AppColor } from "../utils/theme";
import {
  getMarketplaceEventById_API,
  getMarketplaceEventQuestions_API,
  getMarketplaceMyApplications_API,
  getMarketplaceMyBids_API,
} from "../api/appAPI";
import {
  MarketplaceHeader,
  formatDate,
  formatDuration,
  formatMoney,
  formatTimeRange,
  getEventImageUrl,
  getEventLocation,
  getPrimaryActionLabel,
  isBothPaymentEvent,
  isVendorPaysToAttendEvent,
  listText,
  styles,
} from "./vendorMarketplaceShared";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const DetailRow = ({ label, value }) => (
  <View style={{ marginTop: 12 }}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.meta}>{value || "None"}</Text>
  </View>
);

const boolText = (value) => (value ? "Yes" : "No");

const idText = (value) => String(value || "");

const getEventImageObjectUrl = (image) =>
  typeof image === "string"
    ? image
    : image?.image_url || image?.file_url || image?.url || "";

const isEditableDraftStatus = (value) =>
  ["DRAFT", "PENDING_SIGNATURE"].includes(
    String(value || "DRAFT").toUpperCase(),
  );

const submissionEventIds = (submission) => [
  submission?.event_id,
  submission?.marketplaceEvent?.event_id,
  submission?.event?.event_id,
];

const isSubmissionForEvent = (submission, eventId) =>
  submissionEventIds(submission).some((candidate) => idText(candidate) === idText(eventId));

const getServiceSpecificRows = (event) => {
  if (!event) return [];

  if (event.primary_service_style === "Plated") {
    return [
      ["Number of Courses", event.plated_number_of_courses],
      ["Single Entree", event.plated_single_entree ? "Yes" : "No"],
      ["Choice of 2-3 Entrees", event.plated_choice_entrees ? "Yes" : "No"],
      ["Tableside Choice", event.plated_tableside_choice ? "Yes" : "No"],
      [
        "Bread/Salad/Dessert Included",
        event.plated_bread_salad_dessert ? "Yes" : "No",
      ],
    ];
  }

  if (event.primary_service_style === "Buffet") {
    return [["Buffet Options", listText(event.buffet_options)]];
  }

  if (event.primary_service_style === "Food Truck") {
    return [["Food Truck Options", listText(event.food_truck_options)]];
  }

  return [];
};

const VendorMarketplaceEventDetailsScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const eventId = route?.params?.eventId;
  const [event, setEvent] = useState(route?.params?.event || null);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [primaryActionLoading, setPrimaryActionLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    payment: true,
    requirements: true,
    needs: true,
  });
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [previewZoom, setPreviewZoom] = useState(1);

  const loadQuestions = async () => {
    if (!eventId) return;
    try {
      const response = await getMarketplaceEventQuestions_API(eventId);
      if (response?.success) {
        setQuestions(response.data?.marketplaceQuestionList || []);
      }
    } catch (error) {
      console.log("Marketplace messages error", error);
    }
  };

  const loadEvent = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const response = await getMarketplaceEventById_API(eventId);
      if (response?.success) {
        setEvent(response.data?.marketplaceEvent);
      }
      await loadQuestions();
    } catch (error) {
      console.log("Marketplace event detail error", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEvent();
    }, [eventId]),
  );

  const images = Array.isArray(event?.images) ? event.images : [];
  const primaryImageUrl = getEventImageUrl(event);
  const vendorPays = isVendorPaysToAttendEvent(event);
  const bothPay = isBothPaymentEvent(event);
  const isClosed =
    !["OPEN", "REOPENED"].includes(event?.status) ||
    (event?.event_close_date && new Date(event.event_close_date) <= new Date());
  const openSubmissionPath = async (submissionType) => {
    if (isClosed || primaryActionLoading) return;

    const currentEventId = event?.event_id || eventId;
    const isApplication = submissionType === "application";
    const primaryActionRoute = isApplication
      ? "VendorApplicationScreen"
      : "VendorBidResponseScreen";
    const params = {
      eventId: currentEventId,
      event,
    };

    setPrimaryActionLoading(true);
    try {
      const [applicationResponse, bidResponse] = await Promise.all([
        getMarketplaceMyApplications_API(),
        getMarketplaceMyBids_API(),
      ]);
      const applications = applicationResponse?.data?.marketplaceApplicationList || [];
      const bids = bidResponse?.data?.marketplaceBidList || [];
      const existingApplication = applications.find(
        (application) =>
          isSubmissionForEvent(application, currentEventId) &&
          String(application.application_status || "").toUpperCase() !== "WITHDRAWN",
      );
      const existingBid = bids.find(
        (bid) =>
          isSubmissionForEvent(bid, currentEventId) &&
          String(bid.bid_status || "").toUpperCase() !== "WITHDRAWN",
      );

      if (isApplication && existingBid) {
        Alert.alert(
          "Bid Option Already Selected",
          "You already chose the coordinator-paid bid option for this event. You cannot also submit an application.",
        );
        return;
      }
      if (!isApplication && existingApplication) {
        Alert.alert(
          "Application Option Already Selected",
          "You already chose the vendor-paid application option for this event. You cannot also submit a bid.",
        );
        return;
      }
      if (
        isApplication &&
        existingApplication &&
        !isEditableDraftStatus(existingApplication.application_status)
      ) {
        Alert.alert(
          "Application Already Submitted",
          "Your vendor-paid application has already been submitted for this event.",
        );
        return;
      }
      if (
        !isApplication &&
        existingBid &&
        !isEditableDraftStatus(existingBid.bid_status)
      ) {
        Alert.alert(
          "Bid Already Submitted",
          "Your coordinator-paid bid has already been submitted for this event.",
        );
        return;
      }

      if (isApplication) {
        const draft = applications.find(
          (application) =>
            isSubmissionForEvent(application, currentEventId) &&
            isEditableDraftStatus(application.application_status),
        );
        navigation.navigate(primaryActionRoute, {
          ...params,
          application: draft || undefined,
          event: draft?.marketplaceEvent || draft?.event || event,
        });
        return;
      }

      const draft = bids.find(
        (bid) =>
          isSubmissionForEvent(bid, currentEventId) &&
          isEditableDraftStatus(bid.bid_status),
      );
      navigation.navigate(primaryActionRoute, {
        ...params,
        bid: draft || undefined,
        event: draft?.marketplaceEvent || draft?.event || event,
      });
    } catch (error) {
      console.log("Marketplace draft lookup error", error);
      navigation.navigate(primaryActionRoute, params);
    } finally {
      setPrimaryActionLoading(false);
    }
  };

  const confirmSubmissionPath = (submissionType) => {
    if (!bothPay) {
      openSubmissionPath(submissionType);
      return;
    }
    const isApplication = submissionType === "application";
    Alert.alert(
      isApplication ? "Vendor-Paid Application" : "Coordinator-Paid Bid",
      isApplication
        ? "This option is for vendors paying to attend and sell at the event. Would you like to proceed?"
        : "This option is for vendors bidding for the coordinator-paid VIP catering award. Would you like to proceed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isApplication ? "Continue to Application" : "Continue to Bid",
          onPress: () => openSubmissionPath(submissionType),
        },
      ],
    );
  };

  const openImagePreview = (imageUrl) => {
    if (!imageUrl) return;
    setPreviewZoom(1);
    setPreviewImageUrl(imageUrl);
  };

  const closeImagePreview = () => {
    setPreviewImageUrl("");
    setPreviewZoom(1);
  };

  const adjustPreviewZoom = (delta) => {
    setPreviewZoom((current) =>
      Math.min(3, Math.max(1, Number((current + delta).toFixed(2))))
    );
  };

  const renderImagePreviewModal = () => {
    const previewHeight = Math.max(
      360,
      screenHeight - Math.max(insets.top, 0) - Math.max(insets.bottom, 0) - 170
    );

    return (
      <Modal
        transparent
        animationType="fade"
        visible={!!previewImageUrl}
        onRequestClose={closeImagePreview}
      >
        <View style={localStyles.imagePreviewOverlay}>
          <View
            style={[
              localStyles.imagePreviewHeader,
              { paddingTop: Math.max(insets.top, 16) },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              style={localStyles.imagePreviewIconButton}
              onPress={closeImagePreview}
            >
              <MaterialIcons name="close" size={24} color={AppColor.white} />
            </TouchableOpacity>
            <View style={localStyles.imagePreviewActions}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={localStyles.imagePreviewIconButton}
                onPress={() => adjustPreviewZoom(-0.25)}
                disabled={previewZoom <= 1}
              >
                <MaterialIcons
                  name="zoom-out"
                  size={24}
                  color={
                    previewZoom <= 1
                      ? "rgba(255,255,255,0.35)"
                      : AppColor.white
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={localStyles.imagePreviewIconButton}
                onPress={() => adjustPreviewZoom(0.25)}
                disabled={previewZoom >= 3}
              >
                <MaterialIcons
                  name="zoom-in"
                  size={24}
                  color={
                    previewZoom >= 3
                      ? "rgba(255,255,255,0.35)"
                      : AppColor.white
                  }
                />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            horizontal
            style={localStyles.imagePreviewScroll}
            contentContainerStyle={localStyles.imagePreviewHorizontalContent}
          >
            <ScrollView contentContainerStyle={localStyles.imagePreviewScrollContent}>
              <AppImage
                uri={previewImageUrl}
                resizeMode="contain"
                containerStyle={[
                  localStyles.imagePreviewImageContainer,
                  {
                    width: screenWidth * previewZoom,
                    height: previewHeight * previewZoom,
                  },
                ]}
                imageStyle={localStyles.imagePreviewImage}
              />
            </ScrollView>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderMessagesEntry = () => {
    const unreadCount = questions.filter((question) => question.unread).length;
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.card}
        onPress={() =>
          navigation.navigate("vendorMarketplaceMessagesScreen", { eventId })
        }
      >
        <View style={styles.rowBetween}>
          <Text style={styles.title}>Messages</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount ? `${unreadCount} UNREAD` : "READ"}
            </Text>
          </View>
        </View>
        <Text style={styles.meta}>
          {questions.length
            ? "Open event messages and coordinator responses."
            : "No messages yet."}
        </Text>
      </TouchableOpacity>
    );
  };

  const sectionKeys = ["summary", "payment", "requirements", "needs"];

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllSectionsExpanded = (expanded) => {
    setExpandedSections(
      sectionKeys.reduce((next, key) => ({ ...next, [key]: expanded }), {})
    );
  };

  const renderSectionControls = () => (
    <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.secondaryButton, { flex: 1, paddingVertical: 10 }]}
        onPress={() => setAllSectionsExpanded(true)}
      >
        <Text style={styles.secondaryButtonText}>Expand All</Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.secondaryButton, { flex: 1, paddingVertical: 10 }]}
        onPress={() => setAllSectionsExpanded(false)}
      >
        <Text style={styles.secondaryButtonText}>Collapse All</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCollapsibleSection = (key, title, children, cardStyle) => (
    <View style={[styles.card, cardStyle]}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.rowBetween}
        onPress={() => toggleSection(key)}
      >
        <Text style={styles.sectionHeader}>{title}</Text>
        <MaterialIcons
          name={expandedSections[key] ? "expand-less" : "expand-more"}
          size={24}
          color={AppColor.primary}
        />
      </TouchableOpacity>
      {expandedSections[key] ? children : null}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <MarketplaceHeader title="Event Details" navigation={navigation} />
      {loading && !event ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={AppColor.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {renderMessagesEntry()}

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!primaryImageUrl}
            onPress={() => openImagePreview(primaryImageUrl)}
          >
            <AppImage
              uri={primaryImageUrl}
              containerStyle={styles.heroImage}
            />
          </TouchableOpacity>
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={[styles.title, { flex: 1, paddingRight: 8 }]}>
                {event?.event_name || "Marketplace Event"}
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{event?.status || "OPEN"}</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              {event?.event_description || "No description provided."}
            </Text>
          </View>

          {images.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 14 }}
            >
              {images.map((image) => {
                const imageUrl = getEventImageObjectUrl(image);
                return (
                  <TouchableOpacity
                    key={image.image_id || imageUrl}
                    activeOpacity={0.85}
                    onPress={() => openImagePreview(imageUrl)}
                  >
                    <AppImage
                      uri={imageUrl}
                      containerStyle={{
                        height: 140,
                        width: 210,
                        borderRadius: 10,
                        marginRight: 12,
                      }}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          {renderSectionControls()}

          {renderCollapsibleSection("summary", "Event Summary", (
            <>
            <DetailRow label="Event Type" value={event?.event_type} />
            <DetailRow
              label="Who Pays"
              value={bothPay ? "Both" : vendorPays ? "Vendor" : "Coordinator"}
            />
            {(vendorPays || bothPay) && (
              <DetailRow label="Vendor Fee" value={formatMoney(event?.vendor_fee)} />
            )}
            {(!vendorPays || bothPay) && (
              <DetailRow
                label={event?.catered_vip_section_enabled && !event?.fully_catered_event
                  ? "Coordinator VIP Catering Budget"
                  : "Coordinator Event Budget"}
                value={formatMoney(event?.budgeted_amount)}
              />
            )}
            <DetailRow
              label="Catering Opportunity"
              value={event?.fully_catered_event
                ? "Fully Catered Event"
                : event?.catered_vip_section_enabled
                  ? "VIP Catering"
                  : "Event Catering"}
            />
            {event?.catered_vip_section_enabled ? (
              <DetailRow
                label="GA Food Sales"
                value={event?.ga_food_sales_allowed ? "Allowed" : "Not allowed"}
              />
            ) : null}
            {event?.ga_food_sales_allowed ? (
              <DetailRow
                label="Vendor Fee for Combined Award"
                value={event?.waive_vendor_fee_for_combined_award ? "Waived" : formatMoney(event?.vendor_fee)}
              />
            ) : null}
            {event?.vendor_fee_payment_deadline ? (
              <DetailRow
                label="Last Date to Accept Payments"
                value={formatDate(event.vendor_fee_payment_deadline)}
              />
            ) : null}
            <DetailRow
              label="Date"
              value={formatDate(event?.event_date)}
            />
            <DetailRow
              label="Time"
              value={formatTimeRange(event?.event_time)}
            />
            <DetailRow label="Duration" value={formatDuration(event)} />
            <DetailRow
              label="Location"
              value={getEventLocation(event)}
            />
            <DetailRow label="Estimated Guests" value={`${event?.number_of_guests || 0}`} />
            <DetailRow
              label="Application/Bid Deadline"
              value={formatDate(event?.event_close_date)}
            />
            {isClosed ? (
              <Text style={[styles.meta, { marginTop: 10 }]}>
                This event is closed to new submissions.
              </Text>
            ) : null}
            </>
          ))}

          {renderCollapsibleSection("requirements", "Requirements", (
            <>
            <DetailRow
              label="Insurance Required"
              value={boolText(event?.insurance_required)}
            />
            <DetailRow
              label="Permit Required"
              value={
                Array.isArray(event?.permits_required) &&
                event.permits_required.length
                  ? listText(event.permits_required)
                  : "No"
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
            {/* TODO: Replace fallback once backend provides an event-level NDA flag. */}
            <DetailRow label="NDA Required" value={boolText(event?.nda_required)} />
            </>
          ))}

          {renderCollapsibleSection("needs", "Event Needs", (
            <>
            <DetailRow label="Event Style" value={event?.event_style} />
            <DetailRow label="Service Type" value={event?.service_type} />
            <DetailRow
              label="Primary Service Style"
              value={event?.primary_service_style}
            />
            {getServiceSpecificRows(event).map(([label, value]) => (
              <DetailRow key={label} label={label} value={String(value || "None")} />
            ))}
            <DetailRow
              label="Vendors Needed"
              value={`${event?.number_of_vendors_needed || 0}`}
            />
            <DetailRow
              label="Power Requirements"
              value={listText(event?.power_required)}
            />
            <DetailRow
              label="Cuisine Preferences"
              value={listText(event?.cuisine_preferences)}
            />
            <DetailRow
              label="Dietary Restrictions"
              value={listText(event?.dietary_restrictions)}
            />
            <DetailRow
              label="Equipment Needed"
              value={listText(event?.equipment_needed)}
            />
            </>
          ))}

          {bothPay ? (
            <View style={{ gap: 12 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.button, (isClosed || primaryActionLoading) && { opacity: 0.55 }]}
                disabled={isClosed || primaryActionLoading}
                onPress={() => confirmSubmissionPath("application")}
              >
                <Text style={styles.buttonText}>
                  {isClosed ? "Closed to Submissions" : "Submit Application"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.secondaryButton, { paddingVertical: 14 }, (isClosed || primaryActionLoading) && { opacity: 0.55 }]}
                disabled={isClosed || primaryActionLoading}
                onPress={() => confirmSubmissionPath("bid")}
              >
                <Text style={styles.secondaryButtonText}>
                  {isClosed ? "Closed to Submissions" : "Submit VIP Catering Bid"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.button, (isClosed || primaryActionLoading) && { opacity: 0.55 }]}
              disabled={isClosed || primaryActionLoading}
              onPress={() => confirmSubmissionPath(vendorPays ? "application" : "bid")}
            >
              <Text style={styles.buttonText}>
                {isClosed
                  ? "Closed to Submissions"
                  : primaryActionLoading
                    ? "Checking Draft..."
                    : getPrimaryActionLabel(event)}
              </Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      )}
      {renderImagePreviewModal()}
    </View>
  );
};

const localStyles = StyleSheet.create({
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
  },
  imagePreviewHeader: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  imagePreviewActions: {
    flexDirection: "row",
    gap: 10,
  },
  imagePreviewIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  imagePreviewScroll: {
    flex: 1,
  },
  imagePreviewHorizontalContent: {
    flexGrow: 1,
    alignItems: "center",
  },
  imagePreviewScrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePreviewImageContainer: {
    backgroundColor: "transparent",
    borderRadius: 0,
  },
  imagePreviewImage: {
    width: "100%",
    height: "100%",
  },
});

export default VendorMarketplaceEventDetailsScreen;
