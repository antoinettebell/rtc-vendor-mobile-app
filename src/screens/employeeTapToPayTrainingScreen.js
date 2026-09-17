import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import {
  acknowledgeEmployeeTapToPayTraining_API,
  getEmployeeTapToPayTraining_API,
} from "../api/appAPI";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor, Mulish400, Mulish600, Mulish700 } from "../utils/theme";

const TRAINING_ITEMS = [
  {
    key: "PREBUILT_MENU_ONLY",
    text: "I will use Tap to Pay only while on duty, assigned to a food truck and location, and processing customer orders made from RTC's prebuilt menu items.",
  },
  {
    key: "FOLLOW_ACTIVATION_INSTRUCTIONS",
    text: "I will follow the Tap to Pay on iPhone setup instructions shown in RTC and all Apple and CyberSource activation prompts.",
  },
  {
    key: "AUTHORIZED_TO_ACCEPT_TERMS",
    text: "I am authorized to accept the applicable Tap to Pay on iPhone Terms and Conditions on behalf of my employer.",
  },
  {
    key: "RTC_USE_ONLY",
    text: "I will not use Tap to Pay outside the RTC application.",
  },
  {
    key: "ACCESS_ENDS_WITH_EMPLOYMENT",
    text: "I understand that my Tap to Pay access ends if my employment is terminated or my employee profile is archived.",
  },
];

const todayValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
};

const EmployeeTapToPayTrainingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state) => state.userReducer);
  const [training, setTraining] = useState(null);
  const [checked, setChecked] = useState([]);
  const [typedName, setTypedName] = useState("");
  const [signedDate, setSignedDate] = useState(todayValue());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadTraining = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getEmployeeTapToPayTraining_API();
      setTraining(response?.data?.training || null);
    } catch (error) {
      Alert.alert("Training unavailable", error?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTraining();
  }, [loadTraining]);

  const expectedName = useMemo(
    () =>
      [user?.first_name || user?.firstName, user?.last_name || user?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim(),
    [user],
  );
  const allChecked = checked.length === TRAINING_ITEMS.length;
  const canSubmit = allChecked && typedName.trim().length > 1 && signedDate === todayValue();

  const toggleItem = (key) => {
    setChecked((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  const submit = async () => {
    if (!canSubmit) {
      Alert.alert(
        "Training incomplete",
        "Check every statement, type your full name, and use today's date before acknowledging.",
      );
      return;
    }
    setSaving(true);
    try {
      const response = await acknowledgeEmployeeTapToPayTraining_API({
        typed_name: typedName.trim(),
        signed_date: signedDate,
        checked_items: checked,
      });
      setTraining(response?.data?.training || training);
      Alert.alert(
        "Training Complete",
        "Your Tap to Pay on iPhone training is valid for one year.",
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      Alert.alert("Unable to acknowledge training", error?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBarManager />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={26} color={AppColor.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tap to Pay Training</Text>
        <View style={styles.headerButton} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={AppColor.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}>
          <View style={styles.complianceCard}>
            <View style={styles.complianceHeader}>
              <Text style={styles.complianceTitle}>Training Compliance</Text>
              <Text style={styles.compliancePercent}>{training?.score || 0}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${training?.score || 0}%` }]} />
            </View>
            <Text style={styles.helper}>
              {training?.compliant
                ? `Current through ${formatDate(training?.current?.expires_at)}`
                : "Complete all five acknowledgments to enable Tap to Pay setup and use."}
            </Text>
          </View>

          {training?.compliant ? (
            <View style={styles.completeCard}>
              <Ionicons name="checkmark-circle" size={28} color={AppColor.primary} />
              <View style={styles.completeText}>
                <Text style={styles.completeTitle}>Annual training complete</Text>
                <Text style={styles.helper}>Signed {formatDate(training?.current?.acknowledged_at)}</Text>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.intro}>
                Read and check every statement. Your acknowledgment expires one year after signing.
              </Text>
              {TRAINING_ITEMS.map((item) => {
                const selected = checked.includes(item.key);
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => toggleItem(item.key)}
                    activeOpacity={0.75}
                    style={[styles.item, selected && styles.itemSelected]}
                  >
                    <Ionicons
                      name={selected ? "checkbox" : "square-outline"}
                      size={26}
                      color={AppColor.primary}
                    />
                    <Text style={styles.itemText}>{item.text}</Text>
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.label}>Full legal name</Text>
              <TextInput
                value={typedName}
                onChangeText={setTypedName}
                autoCapitalize="words"
                placeholder={expectedName || "Type your full name"}
                placeholderTextColor={AppColor.textPlaceholder}
                style={styles.input}
              />
              <Text style={styles.label}>Date signed</Text>
              <TextInput
                value={signedDate}
                onChangeText={setSignedDate}
                keyboardType="numbers-and-punctuation"
                placeholder="YYYY-MM-DD"
                maxLength={10}
                style={styles.input}
              />

              <TouchableOpacity
                onPress={submit}
                disabled={saving}
                style={[styles.submitButton, saving && styles.savingButton]}
              >
                {saving ? (
                  <ActivityIndicator color={AppColor.white} />
                ) : (
                  <Text style={styles.submitText}>I Have Read and Acknowledge This Training</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {(training?.history || []).filter((item) => item.is_archived).length ? (
            <View style={styles.archiveSection}>
              <Text style={styles.archiveTitle}>Archived Training</Text>
              {(training.history || [])
                .filter((item) => item.is_archived)
                .map((item) => (
                  <View key={item._id || item.acknowledged_at} style={styles.archiveRow}>
                    <Text style={styles.archiveName}>{item.signed_name}</Text>
                    <Text style={styles.helper}>
                      Signed {formatDate(item.acknowledged_at)} · Expired {formatDate(item.expires_at)}
                    </Text>
                  </View>
                ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColor.white },
  header: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: AppColor.border, paddingBottom: 12 },
  headerButton: { width: 52, alignItems: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontFamily: Mulish700, fontSize: 21, color: AppColor.black },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 20 },
  complianceCard: { borderWidth: 1, borderColor: AppColor.border, borderRadius: 14, padding: 16, marginBottom: 18 },
  complianceHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  complianceTitle: { fontFamily: Mulish700, fontSize: 18, color: AppColor.black },
  compliancePercent: { fontFamily: Mulish700, fontSize: 22, color: AppColor.primary },
  progressTrack: { height: 10, borderRadius: 5, backgroundColor: "#E8ECEF", overflow: "hidden", marginVertical: 12 },
  progressFill: { height: "100%", backgroundColor: AppColor.primary },
  helper: { fontFamily: Mulish400, fontSize: 14, color: AppColor.subText, lineHeight: 20 },
  completeCard: { flexDirection: "row", borderRadius: 14, backgroundColor: "#EAF6EF", padding: 18, alignItems: "center" },
  completeText: { flex: 1, marginLeft: 12 },
  completeTitle: { fontFamily: Mulish700, fontSize: 17, color: AppColor.primary },
  intro: { fontFamily: Mulish600, fontSize: 16, color: AppColor.black, lineHeight: 23, marginBottom: 14 },
  item: { flexDirection: "row", alignItems: "flex-start", borderWidth: 1, borderColor: AppColor.border, borderRadius: 12, padding: 14, marginBottom: 10 },
  itemSelected: { backgroundColor: "#F0F8F3", borderColor: AppColor.primary },
  itemText: { flex: 1, marginLeft: 10, fontFamily: Mulish400, fontSize: 15, lineHeight: 22, color: AppColor.black },
  label: { fontFamily: Mulish600, fontSize: 15, color: AppColor.black, marginTop: 12, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: AppColor.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontFamily: Mulish400, fontSize: 16, color: AppColor.black },
  submitButton: { marginTop: 22, backgroundColor: AppColor.primary, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 18, alignItems: "center" },
  savingButton: { opacity: 0.7 },
  submitText: { fontFamily: Mulish700, fontSize: 15, color: AppColor.white, textAlign: "center" },
  archiveSection: { marginTop: 24, borderTopWidth: 1, borderTopColor: AppColor.border, paddingTop: 18 },
  archiveTitle: { fontFamily: Mulish700, fontSize: 18, color: AppColor.black, marginBottom: 10 },
  archiveRow: { borderWidth: 1, borderColor: AppColor.border, borderRadius: 10, padding: 12, marginBottom: 8 },
  archiveName: { fontFamily: Mulish600, fontSize: 15, color: AppColor.black, marginBottom: 3 },
});

export default EmployeeTapToPayTrainingScreen;
