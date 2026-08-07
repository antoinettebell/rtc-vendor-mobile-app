import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { getRefundCancelRequests_API } from "../api/appAPI";
import { AppColor, Mulish400, Mulish600, Mulish700 } from "../utils/theme";

const REFUND_BUCKETS = [
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

const formatDateTime = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString([], {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const EmployeeRefundRequestsScreen = ({ navigation, route }) => {
  const initialBucket = route?.params?.bucket || "PENDING";
  const [requests, setRequests] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState(initialBucket);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getRefundCancelRequests_API();
      if (response?.success && response?.data?.requests) {
        setRequests(response.data.requests);
      }
    } catch (error) {
      Alert.alert(
        "Refunds unavailable",
        error?.message || "Could not load refund requests.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests]),
  );

  const bucketCounts = useMemo(
    () =>
      REFUND_BUCKETS.reduce((counts, bucket) => {
        counts[bucket.value] = requests.filter(
          (request) =>
            String(request.request_status || "").toUpperCase() === bucket.value,
        ).length;
        return counts;
      }, {}),
    [requests],
  );

  const selectedBucketConfig =
    REFUND_BUCKETS.find((bucket) => bucket.value === selectedBucket) ||
    REFUND_BUCKETS[0];

  const filteredRequests = requests.filter(
    (request) =>
      String(request.request_status || "").toUpperCase() === selectedBucket,
  );

  const renderRequest = ({ item, index }) => {
    const key = item.request_id || item._id || `request-${index}`;
    const expanded = expandedId === key;
    return (
      <TouchableOpacity
        activeOpacity={0.86}
        style={styles.requestCard}
        onPress={() => setExpandedId(expanded ? null : key)}
      >
        <View style={styles.requestHeader}>
          <View style={styles.requestTitleBlock}>
            <Text style={styles.requestTitle}>
              Order #{item.orderNumber || item.order_id || "Unknown"}
            </Text>
            <Text style={styles.requestMeta}>
              {item.request_type || "Request"} | {item.reason_code || "No reason"}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={22}
            color={AppColor.primary}
          />
        </View>
        <Text style={styles.statusText}>
          Status: {item.request_status || "Not available"}
        </Text>
        {expanded ? (
          <View style={styles.detailsBox}>
            <Text style={styles.detailLine}>
              Submitted: {formatDateTime(item.requested_at)}
            </Text>
            <Text style={styles.detailLine}>
              Employee: {item.employee_login_id || "Employee"}
            </Text>
            <Text style={styles.detailLine}>
              Payment: {item.original_payment_method || "Not available"}
            </Text>
            <Text style={styles.detailLine}>
              Original status: {item.original_order_status || "Not available"}
            </Text>
            {item.employee_notes ? (
              <Text style={styles.detailLine}>Employee note: {item.employee_notes}</Text>
            ) : null}
            {item.vendor_response_notes ? (
              <Text style={styles.detailLine}>
                Vendor note: {item.vendor_response_notes}
              </Text>
            ) : null}
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={AppColor.black}
          />
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <Text style={styles.kicker}>Refunds</Text>
          <Text style={styles.title}>{selectedBucketConfig.label}</Text>
        </View>
      </View>

      <View style={styles.bucketRow}>
        {REFUND_BUCKETS.map((bucket) => {
          const selected = selectedBucket === bucket.value;
          return (
            <TouchableOpacity
              key={bucket.value}
              style={[styles.bucketCard, selected && styles.bucketCardActive]}
              onPress={() => {
                setSelectedBucket(bucket.value);
                setExpandedId(null);
              }}
            >
              <Text style={[styles.bucketCount, selected && styles.bucketTextActive]}>
                {bucketCounts[bucket.value] || 0}
              </Text>
              <Text style={[styles.bucketLabel, selected && styles.bucketTextActive]}>
                {bucket.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredRequests}
        keyExtractor={(item, index) => item.request_id || item._id || `request-${index}`}
        renderItem={renderRequest}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadRequests} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={AppColor.primary} style={styles.emptyLoader} />
          ) : (
            <Text style={styles.emptyText}>
              No {selectedBucketConfig.label.toLowerCase()} refund requests.
            </Text>
          )
        }
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
};

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
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    alignItems: "center",
    borderColor: AppColor.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    marginRight: 12,
    width: 40,
  },
  headerTextBlock: {
    flex: 1,
  },
  kicker: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 13,
  },
  title: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 22,
    marginTop: 3,
  },
  bucketRow: {
    backgroundColor: AppColor.white,
    borderBottomColor: AppColor.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  bucketCard: {
    alignItems: "center",
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 66,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  bucketCardActive: {
    backgroundColor: AppColor.primary,
    borderColor: AppColor.primary,
  },
  bucketCount: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 18,
  },
  bucketLabel: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish600,
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
  bucketTextActive: {
    color: AppColor.white,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  requestCard: {
    backgroundColor: AppColor.white,
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  requestHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  requestTitleBlock: {
    flex: 1,
    marginRight: 8,
  },
  requestTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 15,
  },
  requestMeta: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 12,
    marginTop: 4,
  },
  statusText: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 12,
    marginTop: 8,
  },
  detailsBox: {
    backgroundColor: "#F9FAFB",
    borderColor: AppColor.border,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 10,
    padding: 10,
  },
  detailLine: {
    color: AppColor.black,
    fontFamily: Mulish400,
    fontSize: 12,
    marginBottom: 5,
  },
  emptyLoader: {
    marginTop: 36,
  },
  emptyText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 14,
    marginTop: 36,
    textAlign: "center",
  },
});

export default EmployeeRefundRequestsScreen;
