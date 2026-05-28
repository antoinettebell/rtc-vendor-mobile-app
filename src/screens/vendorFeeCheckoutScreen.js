import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor } from "../utils/theme";
import { createMarketplaceApplicationVendorFeePayment_API } from "../api/appAPI";
import {
  MarketplaceHeader,
  formatDate,
  formatMoney,
  getApplicationEvent,
  getEventLocation,
  isVendorPaysToAttendEvent,
  styles,
} from "./vendorMarketplaceShared";

const RTC_EVENT_PROCESSING_RATE = 0.02;

const SummaryRow = ({ label, value, strong }) => (
  <View style={[styles.rowBetween, { marginTop: 12 }]}>
    <Text style={styles.label}>{label}</Text>
    <Text style={strong ? styles.amountText : styles.meta}>{value}</Text>
  </View>
);

const VendorFeeCheckoutScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const application = route?.params?.application || {};
  const event = route?.params?.event || getApplicationEvent(application);
  const applicationStatus = application.application_status;
  const paymentStatus = application.payment_status;
  const alreadyPaid =
    paymentStatus === "PAID" ||
    (application.transaction_id && paymentStatus === "PAID");
  const canCheckout =
    isVendorPaysToAttendEvent(event) &&
    ["ACCEPTED", "PAYMENT_DUE"].includes(applicationStatus) &&
    !alreadyPaid;

  const amounts = useMemo(() => {
    const vendorFee = Number(event?.vendor_fee || 0);
    const rtcEventProcessingFee = Number(
      (vendorFee * RTC_EVENT_PROCESSING_RATE).toFixed(2),
    );
    const totalDue = Number((vendorFee + rtcEventProcessingFee).toFixed(2));

    return {
      vendorFee,
      rtcEventProcessingFee,
      totalDue,
      coordinatorPayoutAmount: vendorFee,
    };
  }, [event?.vendor_fee]);

  const startPayment = async () => {
    if (!canCheckout) {
      Alert.alert(
        "Payment Unavailable",
        "Payment is only available after your application is accepted by the event coordinator.",
      );
      return;
    }

    setLoading(true);
    try {
      const response = await createMarketplaceApplicationVendorFeePayment_API(
        application.application_id,
      );
      const payment = response?.data?.marketplacePayment;
      if (!payment) {
        throw new Error("Unable to create vendor fee payment.");
      }
      navigation.navigate("vendorMarketplacePaymentScreen", {
        payment,
        paymentId: payment.payment_id,
        returnScreen: "VendorMyApplicationsScreen",
        successMessage: `Your payment for ${event?.event_name || "this event"} was successful. Your spot is confirmed.`,
      });
    } catch (error) {
      Alert.alert("Payment Error", error?.message || "Unable to start payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <MarketplaceHeader title="Vendor Fee Checkout" navigation={navigation} />
      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.title}>{event?.event_name || "Vendor Fee"}</Text>
          <SummaryRow label="Event Date" value={formatDate(event?.event_date)} />
          <SummaryRow label="Location" value={getEventLocation(event)} />
        </View>

        <View style={[styles.card, styles.feeSummaryCard]}>
          <Text style={styles.title}>Checkout Summary</Text>
          <SummaryRow
            label="Vendor Fee"
            value={formatMoney(amounts.vendorFee)}
          />
          <SummaryRow
            label="RTC Event Processing Fee (2%)"
            value={formatMoney(amounts.rtcEventProcessingFee)}
          />
          <SummaryRow
            label="Total Due"
            value={formatMoney(amounts.totalDue)}
            strong
          />
          <SummaryRow
            label="Coordinator Receives"
            value={formatMoney(amounts.coordinatorPayoutAmount)}
          />
        </View>

        {!canCheckout ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>
              Payment is only available after your application is accepted by the
              event coordinator.
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.button, (!canCheckout || loading) && styles.buttonDisabled]}
          disabled={!canCheckout || loading}
          onPress={startPayment}
        >
          {loading ? (
            <ActivityIndicator color={AppColor.white} />
          ) : (
            <Text style={styles.buttonText}>
              Pay {formatMoney(amounts.totalDue)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default VendorFeeCheckoutScreen;
