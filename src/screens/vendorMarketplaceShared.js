import React from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import Entypo from "react-native-vector-icons/Entypo";
import {
  AppColor,
  vendorTheme,
  Mulish400,
  Mulish600,
  Mulish700,
} from "../utils/theme";

export const MARKETPLACE_PAYMENT_TYPES = {
  COORDINATOR_PAYS_VENDOR: "COORDINATOR_PAYS_VENDOR",
  VENDOR_PAYS_TO_ATTEND: "VENDOR_PAYS_TO_ATTEND",
};

export const EVENT_TYPES = [
  "Festival",
  "Wedding",
  "Corporate",
  "Private Party",
  "Fundraiser",
  "Conference",
  "Market",
  "Concert",
  "Other",
];

export const CUISINE_OPTIONS = [
  "BBQ",
  "Latin",
  "Vegan",
  "Soul/Caribbean",
  "Asian",
  "Kosher",
  "Halal",
];

export const formatDate = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

export const formatTime = (value) => {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return String(value || "Not set");
  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

export const formatTimeRange = (value) => {
  const parts = String(value || "")
    .split(/\s*(?:-|–|—|to)\s*/i)
    .filter(Boolean);
  if (!parts.length) return "Not set";
  return parts.map(formatTime).join(" - ");
};

export const formatMoney = (value) => {
  const amount = Number(value || 0);
  return `$${amount.toFixed(2)}`;
};

export const formatDuration = (event = {}) => {
  const rawMinutes = Number(event.event_duration_minutes || 0);
  const legacyHours = Number(event.event_duration_hours || 0);
  const totalMinutes = rawMinutes > 59
    ? rawMinutes
    : legacyHours > 0
    ? legacyHours * 60 + rawMinutes
    : rawMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [];

  if (hours > 0) parts.push(`${hours} hr${hours === 1 ? "" : "s"}`);
  if (minutes > 0) parts.push(`${minutes} min`);

  return parts.join(" ") || "Not set";
};

export const formatStatusLabel = (value) =>
  String(value || "DRAFT")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const listText = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || "None";
  return value || "None";
};

export const getEventLocation = (event) => {
  if (event?.exact_address_locked) {
    return (
      [event?.event_city, event?.event_state].filter(Boolean).join(", ") ||
      "Exact address unlocks after payment or match"
    );
  }

  return (
    event?.event_address ||
    event?.formatted_address ||
    [event?.event_city, event?.event_state].filter(Boolean).join(", ") ||
    "Location pending"
  );
};

export const getBidEvent = (bid) => bid?.marketplaceEvent || bid?.event || {};

export const getApplicationEvent = (application) =>
  application?.marketplaceEvent || application?.event || {};

export const isBidRevisionRequested = (bid) => {
  if (!bid?.revision_requested_at) return false;
  if (!bid.revision_submitted_at) return true;
  return new Date(bid.revision_requested_at) > new Date(bid.revision_submitted_at);
};

export const isApplicationRevisionRequested = (application) => {
  if (!application?.revision_requested_at) return false;
  if (!application.revision_submitted_at) return true;
  return new Date(application.revision_requested_at) > new Date(application.revision_submitted_at);
};

export const isEventAccessError = (error) =>
  Number(error?.code || error?.statusCode || error?.status) === 403 ||
  /accept event bookings/i.test(error?.message || "");

export const getMarketplaceNotesError = (value) => {
  const original = String(value || "").normalize("NFKC");
  const compact = original
    .toLowerCase()
    .replace(/\s+(?:\[\s*)?at(?:\s*\])?\s+/g, "@")
    .replace(/\s+(?:\[\s*)?dot(?:\s*\])?\s+/g, ".")
    .replace(/\s+/g, "");
  const text = `${original} ${compact}`;
  if (!text.trim()) return "";

  const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text);
  const hasUrl =
    /\b(?:https?:\/\/|www\.)\S+/i.test(text) ||
    /\b[A-Z0-9-]+\.(?:com|net|org|io|co|us|biz|info|me|app|food|catering)\b/i.test(
      text,
    );
  const hasPhone = /(?:\+?1[\s-.]*)?(?:\(?\d{3}\)?[\s-.]*)\d{3}[\s-.]*\d{4}\b/.test(
    text,
  );
  const hasSocialOrPayment =
    /\b(?:insta|instagram|ig|fb|facebook|meta|twitter|x|whatsapp|whats\s*app|cash\s*app|cashapp|paypal|pay\s*pal|venmo|zelle)\b/i.test(
      text,
    );
  const hasContactRequest =
    /\b(?:call|text|dm|message|email|reach|contact)\s+(?:me|us|my|our)\b/i.test(
      text,
    ) ||
    /\b(?:find|follow|add|look\s+up)\s+(?:me|us)\s+on\b/i.test(text) ||
    /\b(?:my|our)\s+(?:number|phone|email|cell|mobile|handle|username|user\s*name|cash\s*app|paypal|zelle)\b/i.test(
      text,
    );
  const hasSocialHandle = /(^|\s)@[A-Z0-9_.-]{2,}/i.test(text);
  const digitCount = original.replace(/\D/g, "").length;
  const hasObfuscatedNumber = digitCount >= 10 && digitCount <= 19;
  const hasPaymentHandle = /\$[a-z][a-z0-9_.-]{2,}/i.test(original);

  return hasEmail ||
    hasUrl ||
    hasPhone ||
    hasSocialOrPayment ||
    hasContactRequest ||
    hasSocialHandle ||
    hasObfuscatedNumber ||
    hasPaymentHandle
    ? "Notes cannot include contact info, social handles, payment handles, or requests to connect outside RTC."
    : "";
};

export const getMarketplaceMessageError = (value) => {
  const error = getMarketplaceNotesError(value);
  return error ? error.replace(/^Notes/, "Messages") : "";
};

export const normalizeMarketplaceRequirementLabel = (label) => {
  const value = String(label || "").trim();
  const normalized = value.toLowerCase();

  if (!value || normalized === "none") return "";
  if (
    normalized === "insurance" ||
    normalized === "certificate of insurance"
  ) {
    return "Insurance";
  }
  if (
    normalized === "sanitation grade" ||
    normalized === "health permit" ||
    normalized === "health department" ||
    normalized === "food handler permit"
  ) {
    return "Sanitation Grade";
  }
  if (normalized === "alcohol" || normalized === "liquor license") {
    return "Liquor License";
  }
  if (normalized === "fire permit") return "Fire Permit";
  if (
    normalized === "business license" ||
    normalized === "business license/permit" ||
    normalized === "license" ||
    normalized === "city permit"
  ) {
    return "City Permit";
  }
  if (normalized === "food vendor") return "Food Vendor Permit";
  if (normalized === "other") return "Other";

  return value;
};

export const getComplianceRequirementLabel = (documentType) => {
  const normalized = String(documentType || "").trim().toUpperCase();

  if (normalized === "COI") return "Insurance";
  if (normalized === "HEALTH_PERMIT") return "Sanitation Grade";
  if (normalized === "BUSINESS_LICENSE") return "Business License/Permit";
  if (normalized === "EIN") return "EIN";
  if (normalized === "W9") return "W-9";
  if (normalized === "LIQUOR_LICENSE") return "Liquor License";

  return normalizeMarketplaceRequirementLabel(documentType);
};

export const getVerifiedComplianceRequirementFiles = (
  compliance,
  requiredLabels = [],
) => {
  const isExcludedLabel = (label) =>
    ["ein", "w9", "w-9", "w_9", "form w9", "form w-9", "tax id", "tax_id"].includes(
      String(label || "").trim().toLowerCase(),
    );
  const requiredSet = new Set(
    (requiredLabels || [])
      .map((label) => normalizeMarketplaceRequirementLabel(label))
      .filter(Boolean),
  );

  if (!Array.isArray(compliance?.requirements)) {
    return [];
  }

  const now = Date.now();

  return compliance.requirements
    .map((requirement) => {
      const label = normalizeMarketplaceRequirementLabel(
        getComplianceRequirementLabel(requirement?.type || requirement?.document_type),
      );
      const document = requirement?.document;
      const expirationTime = document?.expiration_date
        ? new Date(document.expiration_date).getTime()
        : null;

      if (
        !label ||
        isExcludedLabel(label) ||
        (requiredSet.size && !requiredSet.has(label)) ||
        requirement?.status !== "verified" ||
        !document?.file_url ||
        (expirationTime && !Number.isNaN(expirationTime) && expirationTime < now)
      ) {
        return null;
      }

      return {
        attachment_id: `profile-${document.document_id || document.file_key || label}`,
        attachment_type: "REQUIREMENT_DOCUMENT",
        requirement_label: label,
        requirement_key: label.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
        file_url: document.file_url,
        file_key: document.file_key,
        original_name: document.original_name || document.title || label,
        name: document.original_name || document.title || label,
        from_profile_compliance: true,
        compliance_document_id: document.document_id,
      };
    })
    .filter(Boolean);
};

export const getMarketplaceRequirementLabels = (event = {}) => {
  const labels = [];
  const isExcludedLabel = (label) =>
    ["ein", "w9", "w-9", "w_9", "form w9", "form w-9", "tax id", "tax_id"].includes(
      String(label || "").trim().toLowerCase(),
    );
  const addLabel = (label) => {
    const normalizedLabel = normalizeMarketplaceRequirementLabel(label);
    if (
      normalizedLabel &&
      !isExcludedLabel(normalizedLabel) &&
      !labels.includes(normalizedLabel)
    ) {
      labels.push(normalizedLabel);
    }
  };

  if (event?.insurance_required) addLabel("Insurance");

  if (Array.isArray(event?.permits_required)) {
    event.permits_required.forEach((permit) => {
      if (String(permit || "").trim().toLowerCase() !== "alcohol") {
        addLabel(permit);
      }
    });
  }

  if (
    event?.alcohol_required ||
    (Array.isArray(event?.permits_required) &&
      event.permits_required.some(
        (permit) => String(permit || "").trim().toLowerCase() === "alcohol",
      ))
  ) {
    addLabel("Liquor License");
  }

  return labels;
};

export const getEventImageUrl = (event) =>
  event?.image_url ||
  event?.event_image_url ||
  event?.images?.find((image) => image?.image_url)?.image_url ||
  null;

export const getEventPaymentType = (event = {}) => {
  const explicitType = String(
    event.paymentType ||
      event.payment_type ||
      event.event_payment_type ||
      event.marketplace_payment_type ||
      "",
  ).toUpperCase();

  if (
    explicitType.includes("VENDOR_PAYS") ||
    explicitType.includes("VENDOR_PAYS_TO_ATTEND") ||
    explicitType.includes("APPLICATION")
  ) {
    return MARKETPLACE_PAYMENT_TYPES.VENDOR_PAYS_TO_ATTEND;
  }

  if (
    explicitType.includes("COORDINATOR") ||
    explicitType.includes("BID") ||
    explicitType.includes("COORDINATOR_PAYS_VENDOR")
  ) {
    return MARKETPLACE_PAYMENT_TYPES.COORDINATOR_PAYS_VENDOR;
  }

  // TODO: Replace this fallback once backend sends an explicit event payment type.
  return Number(event.vendor_fee || 0) > 0
    ? MARKETPLACE_PAYMENT_TYPES.VENDOR_PAYS_TO_ATTEND
    : MARKETPLACE_PAYMENT_TYPES.COORDINATOR_PAYS_VENDOR;
};

export const isVendorPaysToAttendEvent = (event) =>
  getEventPaymentType(event) === MARKETPLACE_PAYMENT_TYPES.VENDOR_PAYS_TO_ATTEND;

export const isBothPaymentEvent = (event = {}) =>
  String(event.payment_responsibility || "").toUpperCase() === "BOTH" ||
  (Number(event.vendor_fee || 0) > 0 && Number(event.budgeted_amount || 0) > 0);

export const getPaymentTypeLabel = (event) =>
  isVendorPaysToAttendEvent(event)
    ? "Vendor Pays to Attend"
    : "Coordinator Pays Vendor";

export const getPaymentAmountLabel = (event) =>
  isVendorPaysToAttendEvent(event) ? "Vendor Fee" : "Event Budget";

export const getPaymentAmount = (event) =>
  isVendorPaysToAttendEvent(event) ? event?.vendor_fee : event?.budgeted_amount;

export const getPrimaryActionLabel = (event) =>
  isVendorPaysToAttendEvent(event) ? "Submit Application" : "Submit Bid";

export const MarketplaceHeader = ({ title, navigation, right, onBack }) => (
  <View style={styles.header}>
    {onBack || navigation?.canGoBack?.() ? (
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.backButton}
        onPress={onBack || (() => navigation.goBack())}
      >
        <Entypo name="chevron-left" size={30} color={AppColor.black} />
      </TouchableOpacity>
    ) : null}
    <Text style={styles.headerTitle}>{title}</Text>
    {right ? <View style={styles.headerRight}>{right}</View> : null}
  </View>
);

export const MarketplaceAttachmentPicker = ({
  attachments = [],
  getLabel,
  emptyText = "No files uploaded.",
}) => {
  const visibleAttachments = React.useMemo(() => {
    const imageTypes = new Set(["BID_IMAGE", "APPLICATION_IMAGE"]);
    const seenExactFiles = new Set();
    const latestBySlot = new Map();
    const images = [];

    attachments.forEach((attachment) => {
      const exactKey =
        attachment.file_key || attachment.file_url || attachment.attachment_id;
      if (exactKey && seenExactFiles.has(exactKey)) {
        return;
      }
      if (exactKey) {
        seenExactFiles.add(exactKey);
      }

      if (imageTypes.has(attachment.attachment_type)) {
        images.push(attachment);
        return;
      }

      const slotKey = [
        attachment.attachment_type,
        attachment.requirement_key,
        attachment.requirement_label,
      ]
        .filter(Boolean)
        .join(":");
      latestBySlot.set(slotKey || exactKey || attachment.attachment_id, attachment);
    });

    return [...latestBySlot.values(), ...images];
  }, [attachments]);

  const options = React.useMemo(
    () =>
      visibleAttachments.map((attachment, index) => ({
        label:
          getLabel?.(attachment) ||
          attachment.original_name ||
          attachment.name ||
          "Uploaded file",
        value: attachment.attachment_id || attachment.file_url || `${index}`,
        attachment,
      })),
    [visibleAttachments, getLabel],
  );
  const [selectedValue, setSelectedValue] = React.useState(
    options[0]?.value || null,
  );

  React.useEffect(() => {
    if (!options.length) {
      setSelectedValue(null);
      return;
    }
    if (!options.some((option) => option.value === selectedValue)) {
      setSelectedValue(options[0].value);
    }
  }, [options, selectedValue]);

  const selectedOption =
    options.find((option) => option.value === selectedValue) || options[0];
  const selectedAttachment = selectedOption?.attachment;

  if (!options.length) {
    return <Text style={styles.emptyText}>{emptyText}</Text>;
  }

  return (
    <View style={styles.filePickerRow}>
      <Dropdown
        data={options}
        labelField="label"
        valueField="value"
        value={selectedValue}
        placeholder="Select document"
        style={styles.fileDropdown}
        placeholderStyle={styles.fileDropdownText}
        selectedTextStyle={styles.fileDropdownText}
        itemTextStyle={styles.fileDropdownText}
        containerStyle={styles.fileDropdownMenu}
        onChange={(item) => setSelectedValue(item.value)}
      />
      <TouchableOpacity
        activeOpacity={0.7}
        style={[
          styles.secondaryButton,
          styles.fileOpenButton,
          !selectedAttachment?.file_url && styles.buttonDisabled,
        ]}
        disabled={!selectedAttachment?.file_url}
        onPress={() => Linking.openURL(selectedAttachment.file_url)}
      >
        <Text style={styles.secondaryButtonText}>Open</Text>
      </TouchableOpacity>
    </View>
  );
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    minHeight: 60,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 0,
    backgroundColor: AppColor.white,
    paddingHorizontal: 48,
  },
  backButton: {
    position: "absolute",
    left: 16,
    height: 42,
    width: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRight: {
    position: "absolute",
    right: 16,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: Mulish700,
    fontSize: 17,
    color: AppColor.black,
    textAlign: "center",
  },
  body: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: AppColor.white,
    borderWidth: 1,
    borderColor: "#E7EAEF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    fontFamily: Mulish700,
    fontSize: 17,
    color: AppColor.text,
  },
  subtitle: {
    fontFamily: Mulish400,
    fontSize: 13,
    color: AppColor.textHighlighter,
    marginTop: 4,
    lineHeight: 19,
  },
  label: {
    fontFamily: Mulish600,
    fontSize: 13,
    color: AppColor.text,
    marginBottom: 8,
    marginTop: 14,
  },
  fieldLabel: {
    fontFamily: Mulish600,
    fontSize: 13,
    color: AppColor.text,
    marginBottom: 8,
    marginTop: 0,
  },
  meta: {
    fontFamily: Mulish400,
    color: AppColor.textHighlighter,
    fontSize: 13,
    marginTop: 5,
    lineHeight: 19,
  },
  errorText: {
    fontFamily: Mulish400,
    color: AppColor.red,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#DDE2EA",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: Mulish400,
    fontSize: 14,
    color: AppColor.text,
    backgroundColor: AppColor.white,
    textAlignVertical: "center",
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    columnGap: 10,
    rowGap: 12,
    marginTop: 14,
  },
  formGridField: {
    flexBasis: "48%",
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 145,
  },
  formGridFieldFull: {
    flexBasis: "100%",
    minWidth: "100%",
  },
  textarea: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#DDE2EA",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: AppColor.white,
  },
  chipActive: {
    borderColor: AppColor.primary,
    backgroundColor: "#FFF1E6",
  },
  chipText: {
    fontFamily: Mulish600,
    fontSize: 12,
    color: AppColor.textHighlighter,
  },
  chipTextActive: {
    color: AppColor.primary,
  },
  button: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColor.primary,
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    backgroundColor: "#C7C7CC",
  },
  buttonText: {
    fontFamily: Mulish700,
    color: AppColor.white,
    fontSize: 15,
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: AppColor.primary,
    paddingHorizontal: 16,
    backgroundColor: AppColor.white,
  },
  secondaryButtonText: {
    fontFamily: Mulish700,
    color: AppColor.primary,
    fontSize: 14,
  },
  filePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  fileDropdown: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#DDE2EA",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: AppColor.white,
  },
  fileDropdownMenu: {
    borderRadius: 8,
  },
  fileDropdownText: {
    fontFamily: Mulish400,
    fontSize: 13,
    color: AppColor.text,
  },
  fileOpenButton: {
    width: 92,
    paddingHorizontal: 12,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#FFF1E6",
  },
  badgeText: {
    fontFamily: Mulish700,
    color: AppColor.primary,
    fontSize: 11,
  },
  paymentBadgeGreen: {
    backgroundColor: vendorTheme.status.successSoft,
    borderColor: vendorTheme.status.success,
    borderWidth: 1,
  },
  paymentBadgeOrange: {
    backgroundColor: vendorTheme.status.pendingSoft,
    borderColor: vendorTheme.status.pending,
    borderWidth: 1,
  },
  paymentBadgeTextGreen: {
    color: vendorTheme.status.success,
  },
  paymentBadgeTextOrange: {
    color: vendorTheme.status.pending,
  },
  cardImage: {
    height: 132,
    width: "100%",
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#F2F2F7",
  },
  sectionHeader: {
    fontFamily: Mulish700,
    fontSize: 14,
    color: AppColor.text,
    marginBottom: 10,
  },
  summaryCard: {
    borderColor: "#B8E2C3",
    backgroundColor: "#F4FBF6",
  },
  feeSummaryCard: {
    borderColor: "#FFD1B0",
    backgroundColor: "#FFF8F2",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  amountText: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.text,
  },
  heroImage: {
    height: 170,
    width: "100%",
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#F2F2F7",
  },
  screenIntro: {
    fontFamily: Mulish400,
    fontSize: 13,
    color: AppColor.textHighlighter,
    lineHeight: 19,
    marginBottom: 12,
  },
  emptyText: {
    fontFamily: Mulish400,
    color: AppColor.textHighlighter,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20,
  },
});
