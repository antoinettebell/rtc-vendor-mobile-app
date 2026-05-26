import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor } from "../utils/theme";
import {
  callMarketplacePayment_API,
  getMarketplacePaymentById_API,
} from "../api/appAPI";
import {
  MarketplaceHeader,
  formatMoney,
  styles,
} from "./vendorMarketplaceShared";

const RTC_PHONE = "800-410-7053";

const VendorMarketplacePaymentScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [payment, setPayment] = useState(route?.params?.payment || null);
  const [loading, setLoading] = useState(false);
  const paymentId = route?.params?.paymentId || payment?.payment_id;
  const returnScreen = route?.params?.returnScreen;

  const loadPayment = async () => {
    if (!paymentId) return;
    setLoading(true);
    try {
      const response = await getMarketplacePaymentById_API(paymentId);
      if (response?.success) {
        const nextPayment = response.data?.marketplacePayment;
        setPayment(nextPayment);
        if (nextPayment?.payment_status === "PAID" && returnScreen) {
          navigation.replace(returnScreen);
        }
      }
    } catch (error) {
      Alert.alert("Payment Status", error?.message || "Unable to refresh payment.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPayment();
    }, [paymentId]),
  );

  const callRtc = async () => {
    try {
      if (paymentId) {
        const response = await callMarketplacePayment_API(paymentId);
        if (response?.data?.marketplacePayment) {
          setPayment(response.data.marketplacePayment);
        }
      }
    } catch (error) {
      Alert.alert("Call Payment", error?.message || "Unable to update payment status.");
    }
    Linking.openURL("tel:8004107053");
  };

  const paid = payment?.payment_status === "PAID";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <MarketplaceHeader title="Marketplace Payment" navigation={navigation} />
      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {paid ? "Payment Confirmed" : "Awaiting Payment Confirmation"}
          </Text>
          <Text style={styles.meta}>
            Amount due: {formatMoney(payment?.total_amount || 0)}
          </Text>
          <Text style={styles.meta}>
            Type: {payment?.payment_type?.replaceAll("_", " ") || "Vendor Event Fee"}
          </Text>
          <Text style={styles.meta}>Status: {payment?.payment_status || "PENDING"}</Text>
          <Text style={styles.meta}>
            Vendor wallet setup is a future native dependency task for this app.
            Use Call RTC to complete payment, then refresh after admin confirms.
          </Text>
        </View>

        {loading ? <ActivityIndicator color={AppColor.primary} /> : null}

        {!paid ? (
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.button}
            onPress={callRtc}
          >
            <Text style={styles.buttonText}>Call RTC to Complete Payment</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.secondaryButton, { marginTop: 12 }]}
          onPress={loadPayment}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>
            {loading ? "Refreshing..." : "Refresh Payment Status"}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.meta, { marginTop: 12 }]}>
          RTC phone: {RTC_PHONE}
        </Text>
      </View>
    </View>
  );
};

export default VendorMarketplacePaymentScreen;
