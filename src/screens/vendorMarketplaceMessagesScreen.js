import React, { useCallback, useMemo, useState } from "react";
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
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor } from "../utils/theme";
import {
  askMarketplaceEventQuestion_API,
  getEventVendorApplications_API,
  getEventVendorEvents_API,
  getMarketplaceEventQuestions_API,
  getMarketplaceMyApplications_API,
  getMarketplaceMyBids_API,
} from "../api/appAPI";
import {
  MarketplaceHeader,
  getApplicationEvent,
  getBidEvent,
  getMarketplaceMessageError,
  styles,
} from "./vendorMarketplaceShared";

const VendorMarketplaceMessagesScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const eventId = route?.params?.eventId;
  const bidId = route?.params?.bidId || null;
  const applicationId = route?.params?.applicationId || null;
  const user = useSelector((state) => state.userReducer.user);
  const [questions, setQuestions] = useState([]);
  const [qaArchived, setQaArchived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [openingAssociated, setOpeningAssociated] = useState(false);

  const loadQuestions = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const response = await getMarketplaceEventQuestions_API(eventId, {
        markRead: true,
        bid_id: bidId,
        application_id: applicationId,
      });
      if (response?.success) {
        setQuestions(response.data?.marketplaceQuestionList || []);
        setQaArchived(!!response.data?.qa_archived);
      }
    } catch (error) {
      Alert.alert("Messages", error?.message || "Unable to load messages.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadQuestions();
    }, [applicationId, bidId, eventId])
  );

  const questionError = getMarketplaceMessageError(questionText);
  const questionTooShort = questionText.trim().length < 3;
  const groupedQuestions = useMemo(
    () => ({
      unread: questions.filter((question) => question.unread),
      read: questions.filter((question) => !question.unread),
    }),
    [questions]
  );

  const openAssociatedEvent = async () => {
    if (!eventId || openingAssociated) return;
    setOpeningAssociated(true);
    try {
      if (user?.vendorSubtype !== "EVENT_VENDOR") {
        if (bidId) {
          const response = await getMarketplaceMyBids_API();
          const bid = (response?.data?.marketplaceBidList || []).find(
            (item) => item.bid_id === bidId
          );
          if (bid) {
            navigation.navigate("VendorBidDetailScreen", {
              bid,
              event: getBidEvent(bid),
            });
            return;
          }
        }
        if (applicationId) {
          const response = await getMarketplaceMyApplications_API();
          const application = (response?.data?.marketplaceApplicationList || []).find(
            (item) => item.application_id === applicationId
          );
          if (application) {
            navigation.navigate("VendorApplicationDetailScreen", {
              application,
              event: getApplicationEvent(application),
            });
            return;
          }
        }
        navigation.navigate("vendorMarketplaceEventDetailsScreen", { eventId });
        return;
      }

      const [eventsResponse, applicationsResponse] = await Promise.all([
        getEventVendorEvents_API(),
        getEventVendorApplications_API(),
      ]);
      const applications = applicationsResponse?.data?.applicationList || [];
      const application = applicationId
        ? applications.find((item) => item.application_id === applicationId)
        : null;
      if (application) {
        navigation.navigate("eventVendorSubmissionDetailsScreen", {
          application,
          event: application.event || {},
        });
        return;
      }
      const events = eventsResponse?.data?.marketplaceEventList || [];
      const event = events.find((item) => item.event_id === eventId);
      if (event) {
        navigation.navigate("eventVendorApplicationScreen", { event });
        return;
      }
      navigation.navigate("eventVendorMarketplaceScreen", { section: "APPLICATIONS" });
    } catch (error) {
      Alert.alert("Messages", error?.message || "Unable to open the associated event.");
    } finally {
      setOpeningAssociated(false);
    }
  };

  const renderQuestion = (question) => (
    <View
      key={question.question_id}
      style={{
        borderTopWidth: 1,
        borderTopColor: "#E7EAEF",
        marginTop: 14,
        paddingTop: 14,
      }}
    >
      <Text style={styles.label}>
        {question.initiated_by_role === "CUSTOMER"
          ? "Coordinator Message"
          : question.vendor_display_id}
      </Text>
      <Text style={styles.meta}>{question.question_text}</Text>
      {question.answer_text ? (
        <>
          <Text style={styles.label}>Coordinator Response</Text>
          <Text style={styles.meta}>{question.answer_text}</Text>
        </>
      ) : (
        <Text style={styles.meta}>Awaiting response.</Text>
      )}
    </View>
  );

  const handleAskQuestion = async () => {
    const trimmedQuestion = questionText.trim();
    if (trimmedQuestion.length < 3) {
      Alert.alert("Messages", "Enter at least 3 characters before posting.");
      return;
    }
    if (questionError) {
      Alert.alert("Messages", questionError);
      return;
    }

    setSubmitting(true);
    try {
      const response = await askMarketplaceEventQuestion_API({
        event_id: eventId,
        question_text: trimmedQuestion,
        bid_id: bidId,
        application_id: applicationId,
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
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <MarketplaceHeader title="Messages" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.body}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={18} color={AppColor.primary} />
          <Text style={styles.secondaryButtonText}>Back to Event</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.secondaryButton, { marginTop: 10 }]}
          disabled={openingAssociated}
          onPress={openAssociatedEvent}
        >
          <MaterialIcons name="open-in-new" size={18} color={AppColor.primary} />
          <Text style={styles.secondaryButtonText}>
            {openingAssociated ? "Opening..." : "Open Associated Event / Submission"}
          </Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.title}>Event Messages</Text>
            {qaArchived ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>READ ONLY</Text>
              </View>
            ) : null}
          </View>

          {loading ? (
            <ActivityIndicator
              color={AppColor.primary}
              size="small"
              style={{ marginTop: 16 }}
            />
          ) : questions.length ? (
            <>
              <Text style={[styles.label, { marginTop: 14 }]}>Unread Messages</Text>
              {groupedQuestions.unread.length ? groupedQuestions.unread.map(renderQuestion) : (
                <Text style={styles.meta}>No unread messages.</Text>
              )}
              <Text style={[styles.label, { marginTop: 20 }]}>Read Messages</Text>
              {groupedQuestions.read.length ? groupedQuestions.read.map(renderQuestion) : (
                <Text style={styles.meta}>No read messages.</Text>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>No messages yet.</Text>
          )}

          {!qaArchived ? (
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
                  (submitting || questionTooShort || !!questionError) && { opacity: 0.6 },
                ]}
                disabled={submitting || questionTooShort || !!questionError}
                onPress={handleAskQuestion}
              >
                <Text style={styles.buttonText}>
                  {submitting ? "Posting..." : "Ask Question"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={[styles.meta, { marginTop: 14 }]}>
              This event has been awarded. Messages are read-only.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default VendorMarketplaceMessagesScreen;
