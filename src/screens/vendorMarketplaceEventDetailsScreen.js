import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StatusBarManager from "../components/StatusBarManager";
import AppImage from "../components/AppImage";
import { AppColor } from "../utils/theme";
import {
  askMarketplaceEventQuestion_API,
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
  getEventImageUrl,
  getEventLocation,
  getMarketplaceNotesError,
  getPaymentAmount,
  getPaymentAmountLabel,
  getPaymentTypeLabel,
  getPrimaryActionLabel,
  isVendorPaysToAttendEvent,
  listText,
  styles,
} from "./vendorMarketplaceShared";

const DetailRow = ({ label, value }) => (
  <View style={{ marginTop: 12 }}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.meta}>{value || "None"}</Text>
  </View>
);

const boolText = (value) => (value ? "Yes" : "No");

const idText = (value) => String(value || "");

const isEditableDraftStatus = (value) =>
  ["DRAFT", "PENDING_SIGNATURE"].includes(String(value || "DRAFT"));

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
  const [qaArchived, setQaArchived] = useState(false);
  const [qaLoading, setQaLoading] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [primaryActionLoading, setPrimaryActionLoading] = useState(false);

  const loadQuestions = async () => {
    if (!eventId) return;
    setQaLoading(true);
    try {
      const response = await getMarketplaceEventQuestions_API(eventId);
      if (response?.success) {
        setQuestions(response.data?.marketplaceQuestionList || []);
        setQaArchived(!!response.data?.qa_archived);
      }
    } catch (error) {
      console.log("Marketplace messages error", error);
    } finally {
      setQaLoading(false);
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

  const images = event?.images || [];
  const primaryImageUrl = getEventImageUrl(event);
  const vendorPays = isVendorPaysToAttendEvent(event);
  const isClosed =
    !["OPEN", "REOPENED"].includes(event?.status) ||
    (event?.event_close_date && new Date(event.event_close_date) <= new Date());
  const primaryActionRoute = vendorPays
    ? "VendorApplicationScreen"
    : "VendorBidResponseScreen";
  const questionError = getMarketplaceNotesError(questionText);

  const handlePrimaryAction = async () => {
    if (isClosed || primaryActionLoading) return;

    const currentEventId = event?.event_id || eventId;
    const params = {
      eventId: currentEventId,
      event,
    };

    setPrimaryActionLoading(true);
    try {
      if (vendorPays) {
        const response = await getMarketplaceMyApplications_API();
        const draft = (response?.data?.marketplaceApplicationList || []).find(
          (application) =>
            idText(application.event_id) === idText(currentEventId) &&
            isEditableDraftStatus(application.application_status),
        );
        navigation.navigate(primaryActionRoute, {
          ...params,
          application: draft || undefined,
          event: draft?.marketplaceEvent || draft?.event || event,
        });
        return;
      }

      const response = await getMarketplaceMyBids_API();
      const draft = (response?.data?.marketplaceBidList || []).find(
        (bid) =>
          idText(bid.event_id) === idText(currentEventId) &&
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

  const handleAskQuestion = async () => {
    const trimmedQuestion = questionText.trim();
    if (!trimmedQuestion) {
      Alert.alert("Messages", "Enter a question before posting.");
      return;
    }
    if (questionError) {
      Alert.alert("Messages", questionError);
      return;
    }

    setQuestionSubmitting(true);
    try {
      const response = await askMarketplaceEventQuestion_API({
        event_id: event?.event_id || eventId,
        question_text: trimmedQuestion,
      });
      if (response?.success) {
        setQuestionText("");
        await loadQuestions();
        if (response.data?.blocked) {
          Alert.alert("Messages", "This question was blocked by RTC moderation.");
        }
      } else if (response?.message) {
        Alert.alert("Messages", response.message);
      }
    } catch (error) {
      Alert.alert("Messages", error?.message || "Unable to post question.");
    } finally {
      setQuestionSubmitting(false);
    }
  };

  const renderMessages = () => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.title}>Messages</Text>
        {qaArchived ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ARCHIVED</Text>
          </View>
        ) : null}
      </View>
      {qaLoading ? (
        <ActivityIndicator
          color={AppColor.primary}
          size="small"
          style={{ marginTop: 16 }}
        />
      ) : questions.length ? (
        questions.map((question) => (
          <View
            key={question.question_id}
            style={{
              borderTopWidth: 1,
              borderTopColor: "#E7EAEF",
              marginTop: 14,
              paddingTop: 14,
            }}
          >
            <Text style={styles.label}>{question.vendor_display_id}</Text>
            <Text style={styles.meta}>{question.question_text}</Text>
            {question.answer_text ? (
              <>
                <Text style={styles.label}>Coordinator Response</Text>
                <Text style={styles.meta}>{question.answer_text}</Text>
              </>
            ) : null}
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No messages yet.</Text>
      )}

      {!qaArchived && !isClosed ? (
        <>
          <TextInput
            value={questionText}
            onChangeText={setQuestionText}
            placeholder="Question"
            placeholderTextColor={AppColor.textHighlighter}
            multiline
            style={[styles.input, styles.textarea, { marginTop: 14 }]}
          />
          {!!questionError && (
            <Text style={styles.errorText}>{questionError}</Text>
          )}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.button,
              { marginTop: 10 },
              (questionSubmitting || !!questionError) && styles.buttonDisabled,
            ]}
            disabled={questionSubmitting || !!questionError}
            onPress={handleAskQuestion}
          >
            <Text style={styles.buttonText}>
              {questionSubmitting ? "Posting..." : "Ask Question"}
            </Text>
          </TouchableOpacity>
        </>
      ) : null}
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
          <AppImage
            uri={primaryImageUrl}
            containerStyle={styles.heroImage}
          />
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
              {images.map((image) => (
                <AppImage
                  key={image.image_id || image.image_url}
                  uri={image.image_url}
                  containerStyle={{
                    height: 140,
                    width: 210,
                    borderRadius: 10,
                    marginRight: 12,
                  }}
                />
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Event Summary</Text>
            <DetailRow label="Event Type" value={event?.event_type} />
            <DetailRow
              label="Date"
              value={formatDate(event?.event_date)}
            />
            <DetailRow
              label="Time"
              value={event?.event_time || "Not set"}
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
          </View>

          <View
            style={[
              styles.card,
              vendorPays ? styles.feeSummaryCard : styles.summaryCard,
            ]}
          >
            <Text style={styles.title}>Payment Type</Text>
            <View
              style={[
                styles.badge,
                vendorPays ? styles.paymentBadgeOrange : styles.paymentBadgeGreen,
                { marginTop: 12 },
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
            <DetailRow
              label={getPaymentAmountLabel(event)}
              value={formatMoney(getPaymentAmount(event))}
            />
            <Text style={styles.meta}>
              {vendorPays
                ? "Set by Event Coordinator. Payment required only if accepted."
                : "Budget set by Event Coordinator"}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Requirements</Text>
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
            {/* TODO: Replace fallback once backend provides an event-level NDA flag. */}
            <DetailRow label="NDA Required" value={boolText(event?.nda_required)} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Event Needs</Text>
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
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.button,
              (isClosed || primaryActionLoading) && { opacity: 0.55 },
            ]}
            disabled={isClosed || primaryActionLoading}
            onPress={handlePrimaryAction}
          >
            <Text style={styles.buttonText}>
              {isClosed
                ? "Closed to Submissions"
                : primaryActionLoading
                  ? "Checking Draft..."
                  : getPrimaryActionLabel(event)}
            </Text>
          </TouchableOpacity>

          {renderMessages()}
        </ScrollView>
      )}
    </View>
  );
};

export default VendorMarketplaceEventDetailsScreen;
