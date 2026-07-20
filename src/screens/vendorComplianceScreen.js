import React, { useCallback, useEffect, useState } from "react";
import {
	  ActivityIndicator,
	  Alert,
	  Linking,
	  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DocumentPicker, { types } from "react-native-document-picker";
import ImagePicker from "react-native-image-crop-picker";
import { RESULTS } from "react-native-permissions";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getVendorComplianceHistory_API,
  getVendorComplianceSummary_API,
  uploadVendorComplianceDocument_API,
} from "../api/appAPI";
import StatusBarManager from "../components/StatusBarManager";
import usePermission from "../hooks/usePermission";
import { permission } from "../helpers/permission.helper";
import { AppColor, Mulish400, Mulish600, Mulish700 } from "../utils/theme";

const SCORE_FALLBACK = {
  red: "#D93025",
  yellow: "#F9AB00",
  blue: "#1A73E8",
  green: "#188038",
};

const EXPIRATION_WARNING_DAYS = 90;
const EXPIRING_DOCUMENT_TYPES = new Set([
  "HEALTH_PERMIT",
  "BUSINESS_LICENSE",
  "COI",
  "PERMIT",
  "LICENSE",
  "CERTIFICATION",
  "CERTIFICATE_OF_INSURANCE",
]);

const formatLabel = (value = "") =>
  String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value) => {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return date.toLocaleDateString();
};

const getExpiringDocumentStatus = (requirement = {}) => {
  const rawType = String(requirement.type || "").toUpperCase();
  const daysUntilExpiration = requirement.days_until_expiration;
  const hasExpirationStatus =
    EXPIRING_DOCUMENT_TYPES.has(rawType) && daysUntilExpiration !== null;

  if (!hasExpirationStatus) {
    return {
      label: formatLabel(requirement.status),
      countdown: "",
      tone: "neutral",
    };
  }

  if (Number(daysUntilExpiration) < 0) {
    return {
      label: "Expired",
      countdown: "Expired",
      tone: "expired",
    };
  }

  if (Number(daysUntilExpiration) <= EXPIRATION_WARNING_DAYS) {
    return {
      label: "Expiring",
      countdown: `${daysUntilExpiration} days left`,
      tone: "expiring",
    };
  }

  return {
    label: "Active",
    countdown: "",
    tone: "active",
  };
};

const VendorComplianceScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state) => state.userReducer);
  const foodTruckId = user?.foodTruck?._id;
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState(null);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const { checkAndRequestPermission: cameraPermissionStatus } = usePermission(
    permission.camera
  );

  const loadCompliance = useCallback(async () => {
    if (!foodTruckId) return;
    setLoading(true);
    try {
      const [summaryResponse, historyResponse] = await Promise.all([
        getVendorComplianceSummary_API({ foodtruck_id: foodTruckId }),
        getVendorComplianceHistory_API({ foodtruck_id: foodTruckId }),
      ]);
      setSummary(summaryResponse?.data?.compliance || null);
      setHistory(historyResponse?.data?.complianceDocumentList || []);
    } catch (error) {
      Alert.alert("Compliance", error?.message || "Compliance details unavailable.");
    } finally {
      setLoading(false);
    }
  }, [foodTruckId]);

  useEffect(() => {
    loadCompliance();
  }, [loadCompliance]);

  const uploadComplianceFile = async (requirement, file) => {
    const payload = new FormData();
    payload.append("document_type", requirement.type);
    payload.append("title", requirement.label);
    payload.append("file", {
      uri: file.uri,
      name: file.name || `${requirement.type}.pdf`,
      type: file.type || "application/octet-stream",
    });

    setUploadingType(requirement.type);
    await uploadVendorComplianceDocument_API({
      foodtruck_id: foodTruckId,
      payload,
    });
    await loadCompliance();
  };

  const pickFileAndUpload = async (requirement) => {
    try {
      const [file] = await DocumentPicker.pick({
        type: [types.pdf, types.images],
        allowMultiSelection: false,
      });

      await uploadComplianceFile(requirement, file);
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert("Upload Failed", error?.message || "Please try again.");
      }
    } finally {
      setUploadingType(null);
    }
  };

  const captureAndUpload = async (requirement) => {
    try {
      const cameraStatus = await cameraPermissionStatus();
      if (cameraStatus !== RESULTS.GRANTED) return;

      const image = await ImagePicker.openCamera({
        cropping: false,
        mediaType: "photo",
      });
      const file = {
        uri: image?.path,
        name:
          image?.filename ||
          image?.path?.split("/").pop() ||
          `${requirement.type}-${Date.now()}.jpg`,
        type: image?.mime || "image/jpeg",
      };

      await uploadComplianceFile(requirement, file);
    } catch (error) {
      Alert.alert("Upload Failed", error?.message || "Please try again.");
    } finally {
      setUploadingType(null);
    }
  };

  const pickPhotoAndUpload = async (requirement) => {
    try {
      const image = await ImagePicker.openPicker({
        cropping: false,
        mediaType: "photo",
      });
      const file = {
        uri: image?.path,
        name:
          image?.filename ||
          image?.path?.split("/").pop() ||
          `${requirement.type}-${Date.now()}.jpg`,
        type: image?.mime || "image/jpeg",
      };

      await uploadComplianceFile(requirement, file);
    } catch (error) {
      if (error?.code !== "E_PICKER_CANCELLED") {
        Alert.alert("Upload Failed", error?.message || "Please try again.");
      }
    } finally {
      setUploadingType(null);
    }
  };

  const pickAndUpload = (requirement) => {
    Alert.alert(`Upload ${requirement.label}`, "Choose how to add the document.", [
      { text: "Photo Library", onPress: () => pickPhotoAndUpload(requirement) },
      { text: "Camera", onPress: () => captureAndUpload(requirement) },
      { text: "Files", onPress: () => pickFileAndUpload(requirement) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

	  const scoreColor =
	    summary?.score_color_hex ||
	    SCORE_FALLBACK[summary?.score_color] ||
	    AppColor.primary;
	  const requirements = summary?.requirements || [];
	  const supportPhone = summary?.support_phone_number || "(800) 410-7053";
	  const supportPhoneDigits = String(supportPhone).replace(/\D/g, "");
	  const callSupport = () => {
	    if (!supportPhoneDigits) return;
	    Linking.openURL(`tel:${supportPhoneDigits}`).catch(() => {
	      Alert.alert("Support", `Please call ${supportPhone}.`);
	    });
	  };

  return (
    <View style={styles.container}>
      <StatusBarManager barStyle="dark-content" backgroundColor={AppColor.white} />
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 12, minHeight: insets.top + 72 },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color={AppColor.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compliance</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColor.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.scorePanel, { borderColor: scoreColor }]}>
            <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
              <Text style={styles.scoreValue}>{summary?.score || 0}</Text>
            </View>
            <View style={styles.scoreTextContainer}>
              <Text style={styles.scoreTitle}>{summary?.score_label || "Incomplete"}</Text>
              <Text style={styles.scoreBody}>
                {summary?.eligible
                  ? "Your compliance status is eligible."
                  : "Complete required documents before bidding or accepting orders."}
              </Text>
	              <TouchableOpacity onPress={callSupport} activeOpacity={0.7}>
	                <Text style={styles.supportText}>Support {supportPhone}</Text>
	              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Required Documents</Text>
          {requirements.map((requirement) => {
            const document = requirement.document;
	            const status = getExpiringDocumentStatus(requirement);
	            const isUploading = uploadingType === requirement.type;

            return (
              <View key={requirement.type} style={styles.documentCard}>
                <View style={styles.documentHeader}>
                  <View style={styles.documentIcon}>
                    <Ionicons name="document-text-outline" size={22} color={AppColor.primary} />
                  </View>
                  <View style={styles.documentTitleContainer}>
                    <Text style={styles.documentTitle}>{requirement.label}</Text>
	                    <Text style={styles.documentSubtitle}>{status.label}</Text>
	                  </View>
	                  <Text
	                    style={[
	                      styles.statusPill,
	                      status.tone === "expired" && styles.statusExpired,
	                      status.tone === "expiring" && styles.statusExpiring,
	                      status.tone === "active" && styles.statusActive,
	                      status.tone === "neutral" && { color: scoreColor },
	                    ]}
	                  >
	                    {status.countdown}
	                  </Text>
                </View>
                <Text style={styles.documentMeta}>
                  Expires {formatDate(document?.expiration_date)}
                </Text>
                <TouchableOpacity
                  disabled={isUploading}
                  onPress={() => pickAndUpload(requirement)}
                  style={styles.uploadButton}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color={AppColor.white} />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={18} color={AppColor.white} />
                      <Text style={styles.uploadButtonText}>
                        {document ? "Replace Document" : "Upload Document"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}

          <Text style={styles.sectionTitle}>History</Text>
          {history.length ? (
            history.map((document) => (
              <View key={document.document_id} style={styles.historyRow}>
                <Text style={styles.historyTitle}>{formatLabel(document.document_type)}</Text>
                <Text style={styles.historyMeta}>
                  v{document.version} · {formatLabel(document.review_status)} ·{" "}
                  {formatDate(document.created_at)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No compliance documents uploaded yet.</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColor.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: Mulish700,
    fontSize: 18,
    color: AppColor.black,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  scorePanel: {
    flexDirection: "row",
    borderWidth: 2,
    borderRadius: 8,
    padding: 14,
    marginBottom: 18,
    backgroundColor: "#FAFAFA",
  },
  scoreBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  scoreValue: {
    fontFamily: Mulish700,
    fontSize: 24,
    color: AppColor.white,
  },
  scoreTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  scoreTitle: {
    fontFamily: Mulish700,
    fontSize: 18,
    color: AppColor.black,
  },
  scoreBody: {
    fontFamily: Mulish400,
    fontSize: 13,
    color: AppColor.subText,
    marginTop: 4,
  },
	  supportText: {
	    fontFamily: Mulish600,
	    fontSize: 13,
	    color: AppColor.primary,
	    marginTop: 8,
	  },
  sectionTitle: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.black,
    marginBottom: 10,
    marginTop: 8,
  },
  documentCard: {
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    backgroundColor: AppColor.white,
  },
  documentHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3E8",
    marginRight: 10,
  },
  documentTitleContainer: {
    flex: 1,
  },
  documentTitle: {
    fontFamily: Mulish700,
    fontSize: 15,
    color: AppColor.black,
  },
  documentSubtitle: {
    fontFamily: Mulish400,
    fontSize: 12,
    color: AppColor.subText,
    marginTop: 2,
  },
	  statusPill: {
	    fontFamily: Mulish700,
	    fontSize: 12,
	  },
	  statusActive: {
	    color: SCORE_FALLBACK.green,
	  },
	  statusExpiring: {
	    color: SCORE_FALLBACK.yellow,
	  },
	  statusExpired: {
	    color: SCORE_FALLBACK.red,
	  },
  documentMeta: {
    fontFamily: Mulish400,
    fontSize: 12,
    color: AppColor.subText,
    marginTop: 10,
  },
  uploadButton: {
    height: 42,
    borderRadius: 8,
    backgroundColor: AppColor.primary,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  uploadButtonText: {
    fontFamily: Mulish700,
    fontSize: 14,
    color: AppColor.white,
    marginLeft: 8,
  },
  historyRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
    paddingVertical: 12,
  },
  historyTitle: {
    fontFamily: Mulish600,
    fontSize: 14,
    color: AppColor.black,
  },
  historyMeta: {
    fontFamily: Mulish400,
    fontSize: 12,
    color: AppColor.subText,
    marginTop: 3,
  },
  emptyText: {
    fontFamily: Mulish400,
    fontSize: 13,
    color: AppColor.subText,
  },
});

export default VendorComplianceScreen;
