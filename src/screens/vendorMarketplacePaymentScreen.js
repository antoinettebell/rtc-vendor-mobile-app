import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
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
  updateMarketplaceFinalPaymentTip_API,
} from "../api/appAPI";
import { startTapToPaySale } from "../services/tapToPay-service";
import { getVendorPaymentCapabilities } from "../helpers/vendorPaymentCapabilities.helper";
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
  const [tipInput, setTipInput] = useState(
    String(route?.params?.payment?.tip_amount || ""),
  );
  const { user } = useSelector((state) => state.userReducer);
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
        setTipInput(nextPayment?.tip_amount ? String(nextPayment.tip_amount) : "");
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
          expected_total: Number(payment.total_amount || 0),
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
  const processing = payment?.payment_status === "PROCESSING";
  const isFinalEventPayment = payment?.payment_type === "FINAL_EVENT_PAYMENT";
  const paymentCapabilities = getVendorPaymentCapabilities(user);
  const canUseCash =
    isFinalEventPayment && paymentCapabilities.cash;
  const canUseTapToPay =
    isFinalEventPayment && paymentCapabilities.tapToPay;

  const saveTipIfNeeded = async () => {
    const tipAmount = Number(tipInput || 0);
    if (!Number.isFinite(tipAmount) || tipAmount < 0) {
      throw new Error("Enter a valid tip amount.");
    }
    if (Number(payment?.tip_amount || 0) === tipAmount) return payment;
    const response = await updateMarketplaceFinalPaymentTip_API({
      payment_id: payment.payment_id,
      tip_amount: tipAmount,
    });
    const updatedPayment = response?.data?.marketplacePayment;
    if (!response?.success || !updatedPayment) {
      throw new Error("The tip could not be saved.");
    }
    setPayment(updatedPayment);
    return updatedPayment;
  };

  const payWithTapToPay = async () => {
    if (!payment || paymentLoading) return;
    setPaymentLoading("tapToPay");
    try {
      const paymentToCollect = await saveTipIfNeeded();
      const tapToPayResult = await startTapToPaySale({
        amount: Number(paymentToCollect.total_amount || 0),
        reference: paymentToCollect.payment_id,
        metadata: {
          paymentId: paymentToCollect.payment_id,
          paymentType: paymentToCollect.payment_type,
        },
      });
      const response = await checkoutMarketplacePayment_API({
        payment_id: paymentToCollect.payment_id,
        payload: {
          payment_method: "TAP_TO_PAY",
          payment_data: tapToPayResult?.opaqueToken || tapToPayResult,
          expected_total: Number(paymentToCollect.total_amount || 0),
        },
      });
      if (response?.success) {
        setPayment(response.data?.marketplacePayment);
        Alert.alert(
          "Payment Successful",
          successMessage || "Final event payment is confirmed.",
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
      Alert.alert("Tap to Pay Failed", error?.message || "Please try again.");
    } finally {
      setPaymentLoading(null);
    }
  };

  const payWithCash = async () => {
    if (!payment || paymentLoading) return;
    let paymentToCollect;
    try {
      setPaymentLoading("cashTip");
      paymentToCollect = await saveTipIfNeeded();
    } catch (error) {
      setPaymentLoading(null);
      Alert.alert("Tip", error?.message || "Unable to save the tip.");
      return;
    }
    setPaymentLoading(null);
    Alert.alert(
      "Confirm Cash Payment",
      `Confirm cash payment of ${formatMoney(paymentToCollect.total_amount || 0)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setPaymentLoading("cash");
            try {
              const response = await checkoutMarketplacePayment_API({
                payment_id: paymentToCollect.payment_id,
                payload: {
                  payment_method: "CASH",
                  expected_total: Number(paymentToCollect.total_amount || 0),
                },
              });
              if (response?.success) {
                setPayment(response.data?.marketplacePayment);
                Alert.alert(
                  "Payment Successful",
                  successMessage || "Final event cash payment is confirmed.",
                  [
                    {
                      text: "OK",
                      onPress: () =>
                        returnScreen
                          ? navigation.replace(returnScreen)
                          : navigation.goBack(),
                    },
                  ],
                );
              }
            } catch (error) {
              Alert.alert(
                "Cash Payment Failed",
                error?.message || "Please try again.",
              );
            } finally {
              setPaymentLoading(null);
            }
          },
        },
      ],
    );
  };

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
          {isFinalEventPayment ? (
            <>
              <Text style={styles.meta}>
                Original awarded amount: {formatMoney(
                  payment?.original_award_amount ?? payment?.base_amount ?? 0,
                )}
              </Text>
              <Text style={styles.meta}>
                Tip: {formatMoney(payment?.tip_amount || 0)}
              </Text>
            </>
          ) : null}
          <Text style={styles.meta}>
            Type: {payment?.payment_type?.replaceAll("_", " ") || "Vendor Event Fee"}
          </Text>
          <Text style={styles.meta}>Status: {payment?.payment_status || "PENDING"}</Text>
          <Text style={styles.meta}>
            {isFinalEventPayment
              ? "Use Tap to Pay or Cash to complete this final event payment."
              : "Use Apple Pay or Google Pay to complete this marketplace payment, or call RTC for help."}
          </Text>
        </View>

        {loading ? <ActivityIndicator color={AppColor.primary} /> : null}

        {isFinalEventPayment && !paid ? (
          <View style={styles.card}>
            <Text style={styles.label}>Optional Tip</Text>
            <Text style={styles.meta}>
              Ask the coordinator whether they would like to leave a tip before
              collecting payment.
            </Text>
            <TextInput
              value={tipInput}
              onChangeText={(value) => setTipInput(value.replace(/[^0-9.]/g, ""))}
              placeholder="0.00"
              keyboardType="decimal-pad"
              editable={!processing && !paymentLoading}
              style={styles.input}
            />
          </View>
        ) : null}

        {processing ? (
          <Text style={[styles.meta, { marginTop: 12 }]}>
            Payment is processing. Refresh to see the completed status.
          </Text>
        ) : null}

        {!paid && !processing ? (
          <>
            {canUseTapToPay ? (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.button}
                disabled={!!paymentLoading}
                onPress={payWithTapToPay}
              >
                <Text style={styles.buttonText}>
                  {paymentLoading === "tapToPay"
                    ? "Processing..."
                    : `Tap to Pay ${formatMoney(payment?.total_amount || 0)}`}
                </Text>
              </TouchableOpacity>
            ) : null}

            {canUseCash ? (
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.secondaryButton, { marginTop: 12 }]}
                disabled={!!paymentLoading}
                onPress={payWithCash}
              >
                <Text style={styles.secondaryButtonText}>
                  {["cash", "cashTip"].includes(paymentLoading)
                    ? "Processing..."
                    : `Cash ${formatMoney(payment?.total_amount || 0)}`}
                </Text>
              </TouchableOpacity>
            ) : null}

            {!isFinalEventPayment && Platform.OS === "ios" ? (
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.button, canUseTapToPay && { marginTop: 12 }]}
                disabled={!!paymentLoading}
                onPress={() => payWithWallet("applePay")}
              >
                <Text style={styles.buttonText}>
                  {paymentLoading === "applePay" ? "Processing..." : "Apple Pay"}
                </Text>
              </TouchableOpacity>
            ) : !isFinalEventPayment ? (
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
            ) : null}

            {!isFinalEventPayment ? (
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
            ) : null}
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
