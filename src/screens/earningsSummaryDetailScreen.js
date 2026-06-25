import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Entypo from "react-native-vector-icons/Entypo";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";

const EarningsSummaryDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const {
    title = "Summary",
    value = "0",
    detailLabel = "All food truck activity",
    dateLabel = "",
    breakdownRows = [],
    totals = {},
  } = route?.params || {};

  const totalRows = [
    { label: "Gross Sales", value: totals.grossSales },
    { label: "Orders", value: totals.orders },
    { label: "Refunds/Cancels", value: totals.refundsCancels },
    { label: "Avg. Ticket", value: totals.avgTicket },
  ].filter((item) => item.value !== undefined && item.value !== null);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back to earnings"
        >
          <Entypo name="chevron-small-left" size={28} color={AppColor.black} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.eyebrow}>Earnings</Text>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>{detailLabel}</Text>
          <Text style={styles.heroValue}>{value}</Text>
          {dateLabel ? <Text style={styles.dateText}>{dateLabel}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Summary</Text>
          <View style={styles.grid}>
            {totalRows.map((item) => (
              <View key={item.label} style={styles.metricCard}>
                <Text style={styles.metricLabel}>{item.label}</Text>
                <Text style={styles.metricValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Food Truck Breakdown</Text>
          {breakdownRows.length ? (
            breakdownRows.map((item) => (
              <View key={item.label} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel} numberOfLines={2}>
                  {item.label}
                </Text>
                <Text style={styles.breakdownValue}>{item.value}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No food truck activity found.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default EarningsSummaryDetailScreen;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F9FAFB",
    flex: 1,
  },
  header: {
    alignItems: "center",
    backgroundColor: AppColor.white,
    borderBottomColor: AppColor.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: AppColor.white,
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  headerTextWrap: {
    flex: 1,
  },
  eyebrow: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 13,
  },
  headerTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 22,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: AppColor.white,
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  heroLabel: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 13,
  },
  heroValue: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 30,
    marginTop: 8,
  },
  dateText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 13,
    marginTop: 8,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 16,
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    backgroundColor: AppColor.white,
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 72,
    padding: 12,
  },
  metricLabel: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 12,
  },
  metricValue: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 18,
    marginTop: 6,
  },
  breakdownRow: {
    alignItems: "center",
    backgroundColor: AppColor.white,
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  breakdownLabel: {
    color: AppColor.black,
    flex: 1,
    fontFamily: Mulish700,
    fontSize: 14,
    paddingRight: 10,
  },
  breakdownValue: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 16,
  },
  emptyText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 14,
  },
});
