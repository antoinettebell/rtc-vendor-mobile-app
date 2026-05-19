import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator as NativeIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "react-native-paper";
import moment from "moment";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor, Mulish400, Mulish600, Mulish700 } from "../utils/theme";
import {
  checkPosTax_API,
  paymentCheckout_API,
  placePosOrder_API,
  validatePosOrder_API,
} from "../api/appAPI";
import { clearPosOrder } from "../redux/slices/posOrderSlice";
import { foodTypeStrings } from "../utils/constants";
import { startTapToPaySale } from "../services/tapToPay-service";
import tapToPayConfig from "../services/tapToPay-config";

const toAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

const toMoneyNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
};

const TIP_OPTIONS = [
  { label: "10%", value: "10" },
  { label: "15%", value: "15" },
  { label: "20%", value: "20" },
  { label: "Custom", value: "custom" },
];

const VendorPosCheckoutScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const order = useSelector((state) => state.posOrderReducer.currentOrder);

  const { foodTruck, location, guestPhone } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(null);
  const [taxAmount, setTaxAmount] = useState(0);
  const [cashOrder, setCashOrder] = useState(null);
  const [tapOrder, setTapOrder] = useState(null);
  const [selectedTipOption, setSelectedTipOption] = useState("10");
  const [customTipInput, setCustomTipInput] = useState("");

  const tipAmount = useMemo(() => {
    if (selectedTipOption === "custom") {
      return toMoneyNumber(customTipInput);
    }

    return toMoneyNumber((order.subtotal * Number(selectedTipOption)) / 100);
  }, [customTipInput, order.subtotal, selectedTipOption]);

  const basePayload = useMemo(() => {
    return {
      foodTruckId: foodTruck?._id || order.foodTruckId,
      locationId: location?._id,
      orderSource: "VENDOR_POS",
      fulfillmentType: "PICKUP",
      guestCustomer: {
        phone: guestPhone || null,
      },
      taxAmount,
      tax: taxAmount,
      tipsAmount: tipAmount,
      items: order.items.map((item) => {
        const itemPayload = {
          menuItemId: item._id,
          qty: item.quantity,
        };

        if (item.allowCustomize && item.customizationInput?.trim()) {
          itemPayload.customization = item.customizationInput.trim();
        }

        if (item.hasFlavors && item.selectedFlavors?.length > 0) {
          itemPayload.selectedFlavors = item.selectedFlavors;
        }

        if (item.hasToppings && item.selectedToppings?.length > 0) {
          itemPayload.selectedToppings = item.selectedToppings;
        }

        if (item.selectedDiscountFlavors?.length > 0) {
          itemPayload.selectedDiscountFlavors = item.selectedDiscountFlavors;
        }

        if (item.selectedDiscountToppings?.length > 0) {
          itemPayload.selectedDiscountToppings = item.selectedDiscountToppings;
        }

        if (
          item.itemType === foodTypeStrings.combo &&
          item.selectedSubItems &&
          item.selectedSubItems.length > 0
        ) {
          itemPayload.comboItems = item.selectedSubItems.map((subItem) => ({
            comboMenuItemId: subItem._id,
            qty: item.quantity,
          }));
        }

        return itemPayload;
      }),
    };
  }, [foodTruck?._id, guestPhone, location?._id, order.foodTruckId, order.items, taxAmount, tipAmount]);

  useEffect(() => {
    const loadCheckout = async () => {
      if (!basePayload.foodTruckId || !basePayload.locationId || order.items.length === 0) {
        navigation.goBack();
        return;
      }

      setLoading(true);
      try {
        const taxResponse = await checkPosTax_API({
          foodTruck_id: basePayload.foodTruckId,
          location_id: basePayload.locationId,
          amount: order.subtotal,
        });
        const nextTax =
          Number(taxResponse?.data?.taxRate?.salesTaxAmount) ||
          Number(taxResponse?.data?.salesTaxAmount) ||
          0;
        setTaxAmount(nextTax);

        const cashValidation = await validatePosOrder_API({
          ...basePayload,
          taxAmount: nextTax,
          tax: nextTax,
          tipsAmount: tipAmount,
          paymentMethod: "CASH",
        });

        if (cashValidation?.success && cashValidation?.data?.order) {
          setCashOrder(cashValidation.data.order);
        }

        if (tapToPayConfig.enabled) {
          const tapValidation = await validatePosOrder_API({
            ...basePayload,
            taxAmount: nextTax,
            tax: nextTax,
            tipsAmount: tipAmount,
            paymentMethod: "TAP_TO_PAY",
          });

          if (tapValidation?.success && tapValidation?.data?.order) {
            setTapOrder(tapValidation.data.order);
          }
        } else {
          setTapOrder(null);
        }
      } catch (error) {
        Alert.alert("Checkout unavailable", error?.message || "Could not validate order.");
      } finally {
        setLoading(false);
      }
    };

    loadCheckout();
  }, [basePayload.foodTruckId, basePayload.locationId, navigation, order.items.length, order.subtotal, tipAmount]);

  const createOrder = async (paymentFields) => {
    const response = await placePosOrder_API({
      ...basePayload,
      ...paymentFields,
      taxAmount,
      tax: taxAmount,
    });

    if (!response?.success || !response?.data?.order) {
      throw new Error(response?.message || "Could not create order.");
    }

    return response.data.order;
  };

  const finishCheckout = (createdOrder) => {
    dispatch(clearPosOrder());
    navigation.replace("orderDetailsScreen", {
      orderId: createdOrder._id,
    });
  };

  const handleCash = async () => {
    Alert.alert(
      "Confirm cash collected",
      "Mark this walk-up order as paid by cash?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setPaymentLoading("cash");
            try {
              const createdOrder = await createOrder({
                paymentMethod: "CASH",
                paymentStatus: "PAID",
                tipsAmount: tipAmount,
              });

              finishCheckout(createdOrder);
            } catch (error) {
              Alert.alert("Cash checkout failed", error?.message || "Please try again.");
            } finally {
              setPaymentLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleTapToPay = async () => {
    if (!tapToPayConfig.enabled) {
      Alert.alert(
        "Tap to Pay not configured",
        "Tap to Pay is not enabled for this build yet."
      );
      return;
    }

    setPaymentLoading("tap");
    try {
      const amount = toAmount(tapOrder?.total || 0);
      const tapToPayResult = await startTapToPaySale({
        amount,
        currency: "USD",
        orderNumber: tapOrder?.orderNumber,
      });

      await completeTapToPayPayment(tapToPayResult);
    } catch (error) {
      Alert.alert("Tap to Pay unavailable", error?.message || "Please try again.");
      setPaymentLoading(null);
    }
  };

  const completeTapToPayPayment = async (tapToPayResult) => {
    try {
      const amount = toAmount(tapOrder?.total || 0);
      let payment = tapToPayResult;

      if (tapToPayResult?.type === "OPAQUE_TOKEN") {
        const paymentResponse = await paymentCheckout_API({
          paymentMethod: "TAP_TO_PAY",
          paymentData: tapToPayResult.opaqueToken,
          amount,
          taxAmount: String(taxAmount),
          subTotal: String(tapOrder?.subTotal || order.subtotal),
        });

        if (!paymentResponse?.success || !paymentResponse?.data?.paymentsData) {
          throw new Error(paymentResponse?.message || "Payment failed.");
        }

        payment = paymentResponse.data.paymentsData;
      }

      const createdOrder = await createOrder({
        paymentMethod: "TAP_TO_PAY",
        paymentStatus: "PAID",
        tipsAmount: tipAmount,
        transactionId: payment.transactionId,
        authCode: payment.authCode,
        invoiceNumber: payment.invoiceNumber,
        accountNumber: payment.accountNumber,
        accountType: payment.accountType,
      });

      finishCheckout(createdOrder);
    } catch (error) {
      Alert.alert("Tap to Pay failed", error?.message || "Please try again.");
    } finally {
      setPaymentLoading(null);
    }
  };

  useEffect(() => {
    const opaqueToken = route.params?.tapToPayToken;
    if (opaqueToken) {
      setPaymentLoading("tap");
      completeTapToPayPayment({
        type: "OPAQUE_TOKEN",
        opaqueToken: { dataValue: opaqueToken, dataDescriptor: null },
      });
    }
  }, [route.params?.tapToPayToken]);

  const summary = cashOrder || {
    subTotal: order.subtotal,
    discount: 0,
    taxAmount,
    tipsAmount: tipAmount,
    paymentProcessingFee: 0,
    total: order.subtotal + taxAmount + tipAmount,
  };
  const tapSummary = tapOrder || {
    ...summary,
    paymentProcessingFee: 0,
    total: summary.total,
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>POS Checkout</Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <NativeIndicator color={AppColor.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summaryBox}>
            <Text style={styles.sectionTitle}>Order summary</Text>
            <SummaryRow label="Item Total" value={`$${toAmount(summary.subTotal)}`} />
            <SummaryRow label="Discount" value={`-$${toAmount(summary.discount)}`} />
            <SummaryRow label="Sales Tax" value={`$${toAmount(summary.taxAmount)}`} />
            <SummaryRow label="Tip" value={`$${toAmount(summary.tipsAmount)}`} />
            <SummaryRow
              label="Processing Fee"
              value={`$${toAmount(tapSummary.paymentProcessingFee)}`}
            />
            <View style={styles.divider} />
            <SummaryRow label="Cash Total" value={`$${toAmount(summary.total)}`} bold />
            <SummaryRow label="Tap to Pay Total" value={`$${toAmount(tapSummary.total)}`} bold />
            {guestPhone ? (
              <Text style={styles.guestText}>Guest phone: {guestPhone}</Text>
            ) : null}
            <Text style={styles.guestText}>
              Created {moment().format("MMM D, h:mm A")}
            </Text>
          </View>

          <View style={styles.tipBox}>
            <Text style={styles.sectionTitle}>Tip</Text>
            <View style={styles.tipOptions}>
              {TIP_OPTIONS.map((option) => {
                const selected = selectedTipOption === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.tipOption,
                      selected && styles.tipOptionSelected,
                    ]}
                    onPress={() => setSelectedTipOption(option.value)}
                  >
                    <Text
                      style={[
                        styles.tipOptionText,
                        selected && styles.tipOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {selectedTipOption === "custom" ? (
              <TextInput
                value={customTipInput}
                onChangeText={(value) =>
                  setCustomTipInput(value.replace(/[^0-9.]/g, ""))
                }
                placeholder="0.00"
                keyboardType="decimal-pad"
                style={styles.tipInput}
              />
            ) : null}
            <Text style={styles.tipCalculatedText}>
              {`Tip amount: $${toAmount(tipAmount)}`}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Payment method</Text>
          <TouchableOpacity
            style={[
              styles.paymentButton,
              !tapToPayConfig.enabled && styles.paymentButtonDisabled,
            ]}
            onPress={handleTapToPay}
            disabled={!!paymentLoading || !tapToPayConfig.enabled}
          >
            <Text style={styles.paymentButtonText}>
              {paymentLoading === "tap"
                ? "Processing..."
                : `Tap to Pay $${toAmount(tapSummary.total)}`}
            </Text>
            <Text style={styles.paymentButtonSubText}>
              {tapToPayConfig.enabled
                ? "Card-present gateway payment"
                : "Requires Tap to Pay merchant setup"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.paymentButton}
            onPress={handleCash}
            disabled={!!paymentLoading}
          >
            <Text style={styles.paymentButtonText}>
              {paymentLoading === "cash"
                ? "Completing..."
                : `Cash $${toAmount(summary.total)}`}
            </Text>
            <Text style={styles.paymentButtonSubText}>No processing fee or gateway call</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const SummaryRow = ({ label, value, bold }) => (
  <View style={styles.summaryRow}>
    <Text style={[styles.summaryLabel, bold && styles.summaryBold]}>{label}</Text>
    <Text style={[styles.summaryValue, bold && styles.summaryBold]}>{value}</Text>
  </View>
);

export default VendorPosCheckoutScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColor.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: AppColor.border,
  },
  headerTitle: { fontFamily: Mulish700, fontSize: 20, color: AppColor.black },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 16 },
  summaryBox: {
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: { fontFamily: Mulish700, fontSize: 18, marginBottom: 10 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  summaryLabel: { fontFamily: Mulish400, color: AppColor.black },
  summaryValue: { fontFamily: Mulish600, color: AppColor.black },
  summaryBold: { fontFamily: Mulish700, fontSize: 16 },
  divider: { height: 1, backgroundColor: AppColor.border, marginVertical: 10 },
  guestText: { fontFamily: Mulish400, color: AppColor.gray, marginTop: 8 },
  tipBox: {
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    padding: 16,
  },
  tipOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  tipOption: {
    minWidth: 72,
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tipOptionSelected: {
    borderColor: AppColor.primary,
    backgroundColor: AppColor.primary,
  },
  tipOptionText: {
    fontFamily: Mulish700,
    color: AppColor.black,
  },
  tipOptionTextSelected: {
    color: AppColor.white,
  },
  tipInput: {
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: Mulish600,
    fontSize: 18,
    color: AppColor.black,
  },
  tipCalculatedText: {
    fontFamily: Mulish600,
    color: AppColor.black,
    marginTop: 8,
  },
  paymentButton: {
    borderWidth: 1,
    borderColor: AppColor.black,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  paymentButtonDisabled: {
    opacity: 0.6,
  },
  paymentButtonText: { fontFamily: Mulish700, fontSize: 18, color: AppColor.black },
  paymentButtonSubText: { fontFamily: Mulish400, color: AppColor.gray, marginTop: 4 },
});
