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
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor } from "../utils/theme";
import {
  askMarketplaceEventQuestion_API,
  getMarketplaceEventQuestions_API,
} from "../api/appAPI";
import {
  MarketplaceHeader,
  getMarketplaceMessageError,
  styles,
} from "./vendorMarketplaceShared";

const VendorMarketplaceMessagesScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const eventId = route?.params?.eventId;
  const bidId = route?.params?.bidId || null;
  const applicationId = route?.params?.applicationId || null;
  const [questions, setQuestions] = useState([]);
  const [qaArchived, setQaArchived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
                <View style={styles.rowBetween}>
                  <Text style={styles.label}>
                    {question.initiated_by_role === "CUSTOMER"
                      ? "Coordinator Message"
                      : question.vendor_display_id}
                  </Text>
                  <Text style={styles.meta}>{question.unread ? "Unread" : "Read"}</Text>
                </View>
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
            ))
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
