import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  EnvironmentEnum,
  PaymentMethodNameEnum,
  PaymentRequest,
  SupportedNetworkEnum,
} from "@rnw-community/react-native-payments";
import StatusBarManager from "../components/StatusBarManager";
import Config from "react-native-config";
import { AppColor } from "../utils/theme";
import {
  callMarketplacePayment_API,
  checkoutMarketplacePayment_API,
  getMarketplacePaymentById_API,
} from "../api/appAPI";
import {
  MarketplaceHeader,
  formatMoney,
  styles,
} from "./vendorMarketplaceShared";

const RTC_PHONE = "800-410-7053";
const APPLE_PAY_MERCHANT_ID =
  Config.APPLE_PAY_MERCHANT_ID || "merchant.roundthecorner.vendor";
const PAYMENT_COUNTRY_CODE = Config.PAYMENT_COUNTRY_CODE || "US";
const PAYMENT_CURRENCY_CODE = Config.PAYMENT_CURRENCY_CODE || "USD";
const ANDROID_PAYMENT_GATEWAY = Config.ANDROID_PAYMENT_GATEWAY || "authorizenet";
const ANDROID_PAYMENT_GATEWAY_MERCHANT_ID =
  Config.ANDROID_PAYMENT_GATEWAY_MERCHANT_ID || "2794197";

const APPLE_PAY_METHOD_DATA = {
  supportedMethods: PaymentMethodNameEnum.ApplePay,
  data: {
    merchantIdentifier: APPLE_PAY_MERCHANT_ID,
    supportedNetworks: [
      SupportedNetworkEnum.Visa,
      SupportedNetworkEnum.Mastercard,
    ],
    countryCode: PAYMENT_COUNTRY_CODE,
    currencyCode: PAYMENT_CURRENCY_CODE,
    requestBillingAddress: false,
    requestPayerEmail: false,
    requestShipping: false,
  },
};

const ANDROID_PAY_METHOD_DATA = {
  supportedMethods: PaymentMethodNameEnum.AndroidPay,
  data: {
    supportedNetworks: [
      SupportedNetworkEnum.Visa,
      SupportedNetworkEnum.Mastercard,
    ],
    environment: EnvironmentEnum.PRODUCTION,
    countryCode: PAYMENT_COUNTRY_CODE,
    currencyCode: PAYMENT_CURRENCY_CODE,
    requestBillingAddress: false,
    requestPayerEmail: false,
    requestShipping: false,
    gatewayConfig: {
      gateway: ANDROID_PAYMENT_GATEWAY,
      gatewayMerchantId: ANDROID_PAYMENT_GATEWAY_MERCHANT_ID,
    },
  },
};

const toAmount = (value) => Number(value || 0).toFixed(2);

const VendorMarketplacePaymentScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [payment, setPayment] = useState(route?.params?.payment || null);
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(null);
  const paymentId = route?.params?.paymentId || payment?.payment_id;
  const returnScreen = route?.params?.returnScreen;
  const successMessage = route?.params?.successMessage;

  const loadPayment = async () => {
    if (!paymentId) return;
    setLoading(true);
    try {
      const response = await getMarketplacePaymentById_API(paymentId);
      if (response?.success) {
        const nextPayment = response.data?.marketplacePayment;
        setPayment(nextPayment);
        if (nextPayment?.payment_status === "PAID" && returnScreen) {
          if (successMessage) {
            Alert.alert("Payment Successful", successMessage, [
              { text: "OK", onPress: () => navigation.replace(returnScreen) },
            ]);
          } else {
            navigation.replace(returnScreen);
          }
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

  const payWithWallet = async (method) => {
    if (!payment || paymentLoading) return;
    setPaymentLoading(method);
    let paymentRequest;
    let paymentResponse;
    try {
      const amount = toAmount(payment.total_amount);
      paymentRequest = new PaymentRequest(
        [Platform.OS === "ios" ? APPLE_PAY_METHOD_DATA : ANDROID_PAY_METHOD_DATA],
        {
          displayItems: [
            {
              label:
                payment.payment_type?.replaceAll("_", " ") ||
                "Marketplace Payment",
              amount: { currency: PAYMENT_CURRENCY_CODE, value: amount },
            },
          ],
          total: {
            label: "ROUND THE CORNER LLC",
            amount: { currency: PAYMENT_CURRENCY_CODE, value: amount },
          },
        },
      );

      const isPaymentPossible = await paymentRequest.canMakePayment();
      if (!isPaymentPossible) {
        Alert.alert("Wallet Unavailable", "Please use another payment option.");
        return;
      }

      paymentResponse = await paymentRequest.show();
      const paymentRawToken =
        Platform.OS === "ios"
          ? paymentResponse.details.applePayToken.paymentData
          : paymentResponse.details.androidPayToken.rawToken;

      const response = await checkoutMarketplacePayment_API({
        payment_id: payment.payment_id,
        payload: {
          payment_method: method === "googlePay" ? "GOOGLE_PAY" : "APPLE_PAY",
          payment_data: paymentRawToken,
        },
      });

      if (response?.success) {
        paymentResponse.complete("success");
        setPayment(response.data?.marketplacePayment);
        Alert.alert(
          "Payment Successful",
          successMessage || "Marketplace payment is confirmed.",
          [
            {
              text: "OK",
              onPress: () =>
                returnScreen ? navigation.replace(returnScreen) : navigation.goBack(),
            },
          ],
        );
      }
    } catch (error) {
      paymentResponse?.complete?.("fail");
      paymentRequest?.abort?.();
      Alert.alert("Payment Failed", error?.message || "Please try again.");
    } finally {
      setPaymentLoading(null);
    }
  };

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
            Use Apple Pay or Google Pay to complete this marketplace payment, or
            call RTC for help.
          </Text>
        </View>

        {loading ? <ActivityIndicator color={AppColor.primary} /> : null}

        {!paid ? (
          <>
            {Platform.OS === "ios" ? (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.button}
                disabled={!!paymentLoading}
                onPress={() => payWithWallet("applePay")}
              >
                <Text style={styles.buttonText}>
                  {paymentLoading === "applePay" ? "Processing..." : "Apple Pay"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.button}
                disabled={!!paymentLoading}
                onPress={() => payWithWallet("googlePay")}
              >
                <Text style={styles.buttonText}>
                  {paymentLoading === "googlePay" ? "Processing..." : "Google Pay"}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.secondaryButton, { marginTop: 12 }]}
              onPress={callRtc}
              disabled={!!paymentLoading}
            >
              <Text style={styles.secondaryButtonText}>
                Call RTC to Complete Payment
              </Text>
            </TouchableOpacity>
          </>
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
