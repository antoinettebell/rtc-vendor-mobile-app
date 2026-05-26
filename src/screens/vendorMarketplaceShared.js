import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Entypo from "react-native-vector-icons/Entypo";
import { AppColor, Mulish400, Mulish600, Mulish700 } from "../utils/theme";

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
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatMoney = (value) => {
  const amount = Number(value || 0);
  return `$${amount.toFixed(2)}`;
};

export const listText = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || "None";
  return value || "None";
};

export const getEventLocation = (event) =>
  [event?.event_city, event?.event_state].filter(Boolean).join(", ") ||
  "Location pending";

export const getBidEvent = (bid) => bid?.marketplaceEvent || bid?.event || {};

export const isEventAccessError = (error) =>
  Number(error?.code || error?.statusCode || error?.status) === 403 ||
  /accept event bookings/i.test(error?.message || "");

export const MarketplaceHeader = ({ title, navigation, right }) => (
  <View style={styles.header}>
    {navigation?.canGoBack?.() ? (
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Entypo name="chevron-left" size={30} color={AppColor.black} />
      </TouchableOpacity>
    ) : null}
    <Text style={styles.headerTitle}>{title}</Text>
    {right ? <View style={styles.headerRight}>{right}</View> : null}
  </View>
);

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
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
    fontSize: 19,
    color: AppColor.black,
    textAlign: "center",
  },
  body: {
    flexGrow: 1,
    padding: 16,
  },
  card: {
    backgroundColor: AppColor.white,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
  },
  title: {
    fontFamily: Mulish700,
    fontSize: 18,
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
    fontSize: 14,
    color: AppColor.text,
    marginBottom: 8,
    marginTop: 14,
  },
  meta: {
    fontFamily: Mulish400,
    color: AppColor.textHighlighter,
    fontSize: 13,
    marginTop: 5,
    lineHeight: 19,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: Mulish400,
    fontSize: 14,
    color: AppColor.text,
    backgroundColor: AppColor.white,
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
    borderColor: AppColor.border,
    borderRadius: 18,
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
    minHeight: 46,
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
  badge: {
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#FFF1E6",
  },
  badgeText: {
    fontFamily: Mulish700,
    color: AppColor.primary,
    fontSize: 11,
  },
  emptyText: {
    fontFamily: Mulish400,
    color: AppColor.textHighlighter,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20,
  },
});
