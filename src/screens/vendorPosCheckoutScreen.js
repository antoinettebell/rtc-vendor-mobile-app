import React, { useEffect, useMemo, useRef, useState } from "react";
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
  cancelTapToPayAttempt_API,
  getEmployeeTapToPayTraining_API,
  getVendorComplianceSummary_API,
  placePosOrder_API,
  prepareTapToPayAttempt_API,
  startTapToPayAttempt_API,
  validatePosOrder_API,
} from "../api/appAPI";
import { clearPosOrder } from "../redux/slices/posOrderSlice";
import { foodTypeStrings } from "../utils/constants";
import {
  isTapToPayAvailable,
  startTapToPaySale,
} from "../services/tapToPay-service";
import {
  getVendorPaymentCapabilities,
  getWalkUpPosAccess,
  WALK_UP_PLAN_MESSAGE,
} from "../helpers/vendorPaymentCapabilities.helper";
import {
  calculateItemTotalWithDiscount,
  normalizeMenuOptions,
} from "../helpers/discount.helper";
import {
  getNestedOrderItemDetails,
} from "../helpers/orderItemDetails.helper";

const toAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

const tapToPayDiagnostic = (error) => {
  const parts = typeof error?.code === "string" ? error.code.split("|") : [];
  const hasNativeDiagnostic = parts.length >= 5 && parts[0] === "TAP_TO_PAY";
  let nativeDiagnostic;

  if (hasNativeDiagnostic) {
    try {
      nativeDiagnostic = JSON.parse(decodeURIComponent(parts.slice(4).join("|")));
    } catch (_) {
      nativeDiagnostic = undefined;
    }
  }

  return {
    stage: hasNativeDiagnostic ? parts[1] : "unavailable",
    outer: nativeDiagnostic || {
      domain: hasNativeDiagnostic ? parts[2] : "unavailable",
      code: hasNativeDiagnostic ? parts[3] : "unavailable",
      message: error?.message || "Tap to Pay on iPhone could not be completed.",
    },
  };
};

const safeDiagnosticText = (value) =>
  typeof value === "string" || typeof value === "number"
    ? String(value)
    : "Unavailable";

const formatNativeErrorDiagnostic = (label, diagnostic) => {
  if (!diagnostic) return [];

  const fields = [
    `${label} domain: ${safeDiagnosticText(diagnostic.domain)}`,
    `${label} code: ${safeDiagnosticText(diagnostic.code)}`,
    `${label} message: ${safeDiagnosticText(diagnostic.message)}`,
  ];

  if (typeof diagnostic.localizedFailureReason === "string") {
    fields.push(`${label} failure reason: ${diagnostic.localizedFailureReason}`);
  }

  if (Array.isArray(diagnostic.userInfoKeys)) {
    fields.push(`${label} userInfo keys: ${diagnostic.userInfoKeys.filter((key) => typeof key === "string").join(", ") || "None"}`);
  }

  return fields;
};

const isTapToPayCancellation = (error, diagnostic) => {
  const cancellationText = [
    error?.code,
    error?.message,
    diagnostic?.outer?.message,
    diagnostic?.outer?.localizedFailureReason,
    diagnostic?.outer?.developerInfo,
    diagnostic?.outer?.underlying?.message,
    diagnostic?.outer?.underlying?.localizedFailureReason,
  ]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return cancellationText.includes("cancel");
};

const toMoneyNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
};

const toCents = (value) => Math.round(Math.max(0, Number(value) || 0) * 100);
const centsToMoney = (value) => Number((Math.max(0, value) / 100).toFixed(2));
const calculateProcessingFeeAmount = (baseAmount, rate) =>
  centsToMoney(Math.round(toCents(baseAmount) * rate));

const formatSelectedOptionLabels = (item, type, selectedKey) => {
  const pricedOptions = normalizeMenuOptions(item, type);
  return (item?.[selectedKey] || []).map((selected) => {
    const name =
      typeof selected === "string"
        ? selected
        : selected?.name || selected?.label || "";
    const match = pricedOptions.find(
      (option) => option.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    const directCost =
      typeof selected === "object" && selected?.hasCost !== false
        ? Number(selected?.cost ?? selected?.price ?? 0) || 0
        : 0;
    const cost = match?.hasCost ? Number(match.cost) || 0 : directCost;
    return cost > 0 ? `${name} +$${toAmount(cost)}` : name;
  });
};

const formatSelectedSideLabels = (item) =>
  (item?.selectedComboSides || []).map((selected) => {
    const name = typeof selected === "string" ? selected : selected?.name || "";
    const option = (item?.comboSideOptionCosts || []).find(
      (candidate) => candidate?.name === name
    );
    const directCost =
      typeof selected === "object" && selected?.hasCost !== false
        ? Number(selected?.cost ?? selected?.price ?? 0) || 0
        : 0;
    const cost = option?.hasCost ? Number(option.cost) || 0 : directCost;
    return cost > 0 ? `${name} +$${toAmount(cost)}` : name;
  });

const getActiveTruckUnits = (foodTruck) =>
  (foodTruck?.truck_units || []).filter((unit) => !unit.is_archived);

const resolveCheckoutTruckUnit = ({ foodTruck, location, truckUnit, user }) => {
  const activeTruckUnits = getActiveTruckUnits(foodTruck);
  const assignedTruckUnitId = user?.assigned_truck_unit_id?.toString();
  const locationId = location?._id?.toString();

  return (
    truckUnit ||
    activeTruckUnits.find((unit) => unit._id?.toString() === assignedTruckUnitId) ||
    activeTruckUnits.find((unit) =>
      (unit.open_locations || []).some(
        (openLocation) =>
          openLocation.locationId?.toString() === locationId &&
          openLocation.isOrderingOpen
      )
    ) ||
    activeTruckUnits.find((unit) => unit.is_primary) ||
    activeTruckUnits[0] ||
    null
  );
};

const buildComboItemPayload = (subItem, fallbackQty = 1) => {
  const menuItem = subItem?.menuItem || subItem;
  const comboMenuItemId = subItem?.comboMenuItemId || menuItem?._id;

  if (!comboMenuItemId) {
    return null;
  }

  const payload = {
    comboMenuItemId,
    qty: Number(subItem?.qty || fallbackQty || 1),
  };

  if (typeof subItem?.isAddOn === "boolean") {
    payload.isAddOn = subItem.isAddOn;
  }

  const customization =
    subItem?.customization || subItem?.customizationInput || "";
  if (typeof customization === "string" && customization.trim()) {
    payload.customization = customization.trim();
  }

  if (subItem?.selectedFlavors?.length > 0) {
    payload.selectedFlavors = subItem.selectedFlavors;
  }

  if (subItem?.selectedToppings?.length > 0) {
    payload.selectedToppings = subItem.selectedToppings;
  }

  if (subItem?.selectedComboSides?.length > 0) {
    payload.selectedComboSides = subItem.selectedComboSides;
  }

  return payload;
};

const getComboItemId = (item) =>
  item?.comboMenuItemId ||
  item?.menuItem?._id ||
  (typeof item?.menuItem === "string" ? item.menuItem : null) ||
  item?.itemId?._id ||
  (typeof item?.itemId === "string" ? item.itemId : null) ||
  item?._id ||
  null;

const buildConfiguredComboPayloads = ({
  configuredItems,
  selectedItems,
  fallbackQty,
}) =>
  (Array.isArray(configuredItems) ? configuredItems : [])
    .map((configuredItem) => {
      const configuredChild =
        configuredItem?.menuItem || configuredItem?.itemId || configuredItem;
      const configuredId = getComboItemId(configuredItem);
      const selectedItem = (Array.isArray(selectedItems) ? selectedItems : []).find(
        (candidate) => String(getComboItemId(candidate)) === String(configuredId),
      );

      if (!selectedItem || !configuredId) {
        return null;
      }

      return buildComboItemPayload(
        {
          ...configuredChild,
          ...selectedItem,
          comboMenuItemId: configuredId,
          isAddOn: !!configuredItem?.isAddOn,
          qty: configuredItem?.qty || selectedItem?.qty || fallbackQty,
        },
        fallbackQty,
      );
    })
    .filter(Boolean);

const TIP_OPTIONS = [
  { label: "10%", value: "10" },
  { label: "15%", value: "15" },
  { label: "20%", value: "20" },
  { label: "$1", value: "fixed-1" },
  { label: "Custom $", value: "custom" },
];

const TAP_TO_PAY_PROCESSING_FEE_RATE = 0.035;

const VendorPosCheckoutScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const order = useSelector((state) => state.posOrderReducer.currentOrder);
  const { user } = useSelector((state) => state.userReducer);

  const { foodTruck, location, truckUnit, guestPhone } = route.params || {};
  const isEmployeeSession =
    user?.userType === "EMPLOYEE" || user?.role === "EMPLOYEE";
  const ownerPaymentCapabilities = getVendorPaymentCapabilities(user, foodTruck);
  const walkUpAccess = getWalkUpPosAccess(user, foodTruck);
  const vendorCanUseTapToPay =
    isEmployeeSession
      ? !!user?.employeeCapabilities?.tapToPay
      : ownerPaymentCapabilities.tapToPay;
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(null);
  const [tapToPayCompliance, setTapToPayCompliance] = useState(null);
  const [tapToPayComplianceLoading, setTapToPayComplianceLoading] = useState(true);
  const [employeeTapToPayTraining, setEmployeeTapToPayTraining] = useState(null);
  const [employeeTrainingLoading, setEmployeeTrainingLoading] = useState(isEmployeeSession);
  const [taxAmount, setTaxAmount] = useState(0);
  const [cashOrder, setCashOrder] = useState(null);
  const [tapOrder, setTapOrder] = useState(null);
  const [tapToPayAttempt, setTapToPayAttempt] = useState(null);
  const [attemptRefreshKey, setAttemptRefreshKey] = useState(0);
  const [orderSummaryExpanded, setOrderSummaryExpanded] = useState(false);
  const [selectedTipOption, setSelectedTipOption] = useState("10");
  const [customTipInput, setCustomTipInput] = useState("");
  const checkoutAttemptKey = useRef(
    `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  useEffect(() => {
    let active = true;

    getVendorComplianceSummary_API()
      .then((response) => {
        if (active) setTapToPayCompliance(response?.data?.compliance || null);
      })
      .catch(() => {
        if (active) setTapToPayCompliance(null);
      })
      .finally(() => {
        if (active) setTapToPayComplianceLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?._id]);

  useEffect(() => {
    if (!isEmployeeSession) {
      setEmployeeTrainingLoading(false);
      return undefined;
    }
    let active = true;
    setEmployeeTrainingLoading(true);
    getEmployeeTapToPayTraining_API()
      .then((response) => {
        if (active) setEmployeeTapToPayTraining(response?.data?.training || null);
      })
      .catch(() => {
        if (active) setEmployeeTapToPayTraining(null);
      })
      .finally(() => {
        if (active) setEmployeeTrainingLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isEmployeeSession, user?._id]);

  const isTapToPayCompliant =
    !!tapToPayCompliance?.eligible && Number(tapToPayCompliance?.score) === 100;
  const tapToPayOptionAvailable =
    vendorCanUseTapToPay && isTapToPayAvailable();
  const canUseTapToPay =
    tapToPayOptionAvailable && isTapToPayCompliant;
  const checkoutTruckUnit = useMemo(
    () => resolveCheckoutTruckUnit({ foodTruck, location, truckUnit, user }),
    [foodTruck, location, truckUnit, user]
  );

  const tipAmount = useMemo(() => {
    if (selectedTipOption === "custom") {
      return toMoneyNumber(customTipInput);
    }

    if (selectedTipOption.startsWith("fixed-")) {
      return toMoneyNumber(selectedTipOption.replace("fixed-", ""));
    }

    const percentageTip = toMoneyNumber(
      (order.subtotal * Number(selectedTipOption)) / 100,
    );
    return order.subtotal > 0 && percentageTip === 0 ? 0.01 : percentageTip;
  }, [customTipInput, order.subtotal, selectedTipOption]);

  const basePayload = useMemo(() => {
    return {
      foodTruckId: foodTruck?._id || order.foodTruckId,
      locationId: location?._id,
      truckUnitId:
        checkoutTruckUnit?._id || user?.assigned_truck_unit_id || null,
      orderSource: isEmployeeSession ? "WALK_UP_EMPLOYEE" : "VENDOR_POS",
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

        const discountCustomization =
          item.selectedDiscountCustomization ||
          item.selectedDiscountCustomizationInput ||
          "";
        if (
          typeof discountCustomization === "string" &&
          discountCustomization.trim()
        ) {
          itemPayload.selectedDiscountCustomization =
            discountCustomization.trim();
        }

        if (item.selectedDiscountComboSides?.length > 0) {
          itemPayload.selectedDiscountComboSides =
            item.selectedDiscountComboSides;
        }

        if (item.selectedComboSides?.length > 0) {
          itemPayload.selectedComboSides = item.selectedComboSides;
        }

        if (item.selectedDiscountSubItems?.length > 0) {
          itemPayload.selectedDiscountSubItems = item.selectedDiscountSubItems
            .map((subItem) => buildComboItemPayload(subItem, item.quantity))
            .filter(Boolean);
        }

        if (
          item.itemType === foodTypeStrings.combo &&
          item.selectedSubItems &&
          item.selectedSubItems.length > 0
        ) {
          itemPayload.comboItems = buildConfiguredComboPayloads({
            configuredItems: item.subItem,
            selectedItems: item.selectedSubItems,
            fallbackQty: item.quantity,
          });
        }

        return itemPayload;
      }),
    };
  }, [
    foodTruck?._id,
    guestPhone,
    location?._id,
    order.foodTruckId,
    order.items,
    taxAmount,
    checkoutTruckUnit?._id,
    user?.assigned_truck_unit_id,
    tipAmount,
  ]);

  useEffect(() => {
    const loadCheckout = async () => {
      if (!walkUpAccess.allowed) {
        Alert.alert("Walk-up ordering unavailable", WALK_UP_PLAN_MESSAGE, [
          {
            text: "OK",
            onPress: () => {
              dispatch(clearPosOrder());
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate(isEmployeeSession ? "employeeSessionScreen" : "bottomRoot");
            },
          },
        ]);
        return;
      }
      if (
        !basePayload.foodTruckId ||
        !basePayload.locationId ||
        order.items.length === 0
      ) {
        navigation.goBack();
        return;
      }

      setLoading(true);
      setCashOrder(null);
      setTapOrder(null);
      setTapToPayAttempt(null);
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

        if (canUseTapToPay) {
          const tapValidation = await validatePosOrder_API({
            ...basePayload,
            taxAmount: nextTax,
            tax: nextTax,
            tipsAmount: tipAmount,
            paymentMethod: "TAP_TO_PAY",
          });

          if (tapValidation?.success && tapValidation?.data?.order) {
            const validatedTapOrder = tapValidation.data.order;
            setTapOrder(validatedTapOrder);
            const prepared = await prepareTapToPayAttempt_API({
              foodTruckId: basePayload.foodTruckId,
              checkoutKey: checkoutAttemptKey.current,
              amount: validatedTapOrder.total,
              currency: "USD",
            });
            setTapToPayAttempt(prepared?.data?.attempt || null);
          }
        } else {
          setTapOrder(null);
          setTapToPayAttempt(null);
        }
      } catch (error) {
        setCashOrder(null);
        setTapOrder(null);
        Alert.alert(
          "Checkout unavailable",
          error?.message || "Could not validate order.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadCheckout();
  }, [
    basePayload.foodTruckId,
    basePayload.locationId,
    basePayload.truckUnitId,
    attemptRefreshKey,
    canUseTapToPay,
    dispatch,
    isEmployeeSession,
    navigation,
    order.items.length,
    order.subtotal,
    tipAmount,
    walkUpAccess.allowed,
  ]);

  const createOrder = async (paymentFields) => {
    if (!walkUpAccess.allowed) {
      throw new Error(WALK_UP_PLAN_MESSAGE);
    }
    const orderPayload = {
      ...basePayload,
      ...paymentFields,
      taxAmount,
      tax: taxAmount,
    };

    const response = await placePosOrder_API(orderPayload);

    if (!response?.success || !response?.data?.order) {
      throw new Error(response?.message || "Could not create order.");
    }

    return response.data.order;
  };

  const finishCheckout = (createdOrder) => {
    dispatch(clearPosOrder());
    if (isEmployeeSession) {
      navigation.navigate(
        route.params?.returnScreen || "employeeSessionScreen",
      );
      return;
    }

    navigation.replace("orderDetailsScreen", {
      orderId: createdOrder._id,
    });
  };

  const handleCash = async () => {
    if (!cashOrder) {
      Alert.alert(
        "Checkout unavailable",
        "Please resolve the required order selections before checkout.",
      );
      return;
    }

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
              Alert.alert(
                "Cash checkout failed",
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

  const handleTapToPay = async () => {
    if (isEmployeeSession && employeeTrainingLoading) {
      Alert.alert(
        "Checking Tap to Pay Training",
        "Please wait while RTC verifies your annual training acknowledgment.",
      );
      return;
    }
    if (isEmployeeSession && !employeeTapToPayTraining?.compliant) {
      Alert.alert(
        "Tap to Pay Training Required",
        "Complete the Tap to Pay on iPhone Training and acknowledgment in your employee profile before accepting a Tap to Pay payment.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Go to Training",
            onPress: () => navigation.navigate("employeeTapToPayTrainingScreen"),
          },
        ],
      );
      return;
    }
    if (!canUseTapToPay) {
      Alert.alert(
        "Tap to Pay on iPhone unavailable",
        tapToPayComplianceLoading
          ? "Checking Tap to Pay on iPhone compliance status."
          : !isTapToPayCompliant
          ? "Please complete your compliance paperwork to receive Tap to Pay on iPhone services."
          : !vendorCanUseTapToPay && isEmployeeSession
          ? "Tap to Pay on iPhone is only available to employees on the Elite plan."
          : !vendorCanUseTapToPay
            ? "Tap to Pay on iPhone is not available for your current vendor plan."
            : "Tap to Pay on iPhone is not enabled in this build or this device is not ready.",
      );
      return;
    }
    if (!tapToPayAttempt?.id || !tapToPayAttempt?.reference) {
      Alert.alert(
        "Tap to Pay is preparing",
        "Tap to Pay will be ready soon. Please try again in a moment.",
      );
      return;
    }

    setPaymentLoading("tap");
    try {
      const amount = toAmount(tapSummary.total || 0);
      // Do not await this request. The native reader must retain its existing
      // one-second launch path while backend transaction reconciliation starts
      // in parallel.
      void startTapToPayAttempt_API(tapToPayAttempt.id).catch((error) => {
        console.warn("Tap to Pay timeout could not be started", error?.message);
      });
      const tapToPayResult = await startTapToPaySale({
        amount,
        currency: "USD",
        reference: tapToPayAttempt.reference,
      });

      await completeTapToPayPayment(tapToPayResult);
    } catch (error) {
      void cancelTapToPayAttempt_API(tapToPayAttempt.id).catch(() => {});
      checkoutAttemptKey.current = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
      setAttemptRefreshKey((value) => value + 1);
      if (error?.code === "E_TAP_TO_PAY_OS_UNSUPPORTED") {
        Alert.alert(
          "Software Update Required",
          error?.message ||
            "Tap to Pay on iPhone requires the latest version of iOS. Update this iPhone in Settings and try again.",
        );
        setPaymentLoading(null);
        return;
      }
      const diagnostic = tapToPayDiagnostic(error);
      if (isTapToPayCancellation(error, diagnostic)) {
        Alert.alert(
          "Tap to Pay Transaction Canceled",
          "The transaction was canceled and no payment was approved. Ask the customer to approve the transaction and present payment again when ready.",
          [{ text: "OK" }],
        );
        setPaymentLoading(null);
        return;
      }
      const outerDiagnostic = diagnostic.outer;
      const firstUnderlying = outerDiagnostic?.underlying;
      const secondUnderlying = firstUnderlying?.underlying;
      Alert.alert(
        "Tap to Pay on iPhone Diagnostic",
        [
          `Stage: ${diagnostic.stage}`,
          ...formatNativeErrorDiagnostic("Outer", outerDiagnostic),
          ...formatNativeErrorDiagnostic("Underlying 1", firstUnderlying),
          ...formatNativeErrorDiagnostic("Underlying 2", secondUnderlying),
        ].join("\n\n"),
      );
      setPaymentLoading(null);
    }
  };

  const completeTapToPayPayment = async (tapToPayResult) => {
    try {
      const amount = toAmount(tapSummary.total || 0);
      const payment = tapToPayResult;

      const createdOrder = await createOrder({
        paymentMethod: "TAP_TO_PAY",
        paymentStatus: "PAID",
        tipsAmount: tipAmount,
        transactionId: payment.transactionId,
        authCode: payment.authCode,
        invoiceNumber: payment.invoiceNumber,
        accountNumber: payment.accountNumber,
        accountType: payment.accountType,
        tapToPayAttemptId: tapToPayAttempt.id,
      });

      finishCheckout(createdOrder);
    } catch (error) {
      Alert.alert(
        "Tap to Pay on iPhone failed",
        error?.message || "Please try again.",
      );
    } finally {
      setPaymentLoading(null);
    }
  };

  const summary = cashOrder
    ? {
        ...cashOrder,
        tipsAmount: tipAmount,
        total: toMoneyNumber(
          Number(cashOrder.total || 0) -
            Number(cashOrder.tipsAmount || 0) +
            tipAmount
        ),
      }
    : {
        subTotal: toMoneyNumber(order.subtotal),
        discount: 0,
        taxAmount: toMoneyNumber(taxAmount),
        tipsAmount: tipAmount,
        paymentProcessingFee: 0,
        total: toMoneyNumber(
          Number(order.subtotal || 0) + Number(taxAmount || 0) + tipAmount
        ),
      };
  const tapFeeFromValidation = Number(tapOrder?.paymentProcessingFee || 0);
  const tapFeeBase = toMoneyNumber(
    Number(tapOrder?.totalAfterDiscount ?? summary.subTotal ?? order.subtotal) +
      Number(tapOrder?.tipsAmount ?? summary.tipsAmount ?? tipAmount),
  );
  const tapPaymentProcessingFee =
    tapFeeFromValidation > 0
      ? toMoneyNumber(tapFeeFromValidation)
      : calculateProcessingFeeAmount(tapFeeBase, TAP_TO_PAY_PROCESSING_FEE_RATE);
  const tapSummary = {
    ...(tapOrder || summary),
    paymentProcessingFee: tapPaymentProcessingFee,
    total:
      tapFeeFromValidation > 0 && tapOrder?.total
        ? toMoneyNumber(tapOrder.total)
        : toMoneyNumber(summary.total + tapPaymentProcessingFee),
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
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ expanded: orderSummaryExpanded }}
              accessibilityLabel="Expand Order Summary to verify totals"
              style={styles.summaryToggle}
              onPress={() => setOrderSummaryExpanded((expanded) => !expanded)}
            >
              <View style={styles.summaryToggleCopy}>
                <IconButton
                  icon="information-outline"
                  size={22}
                  style={styles.summaryInfoIcon}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
                <View style={styles.summaryToggleTextContainer}>
                  <Text style={styles.summaryToggleTitle}>Order Summary</Text>
                  <Text style={styles.summaryToggleHint}>
                    Expand Order Summary to verify totals.
                  </Text>
                </View>
              </View>
              <IconButton
                icon={orderSummaryExpanded ? "chevron-up" : "chevron-down"}
                size={24}
                style={styles.summaryChevron}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            </TouchableOpacity>

            {orderSummaryExpanded ? (
              <>
                <Text style={styles.expandedSectionTitle}>Full order</Text>
                {order.items.map((item, index) => {
                  const nestedItems = getNestedOrderItemDetails(item);
                  return (
                  <View
                    key={`${item._cartLineId || item._id || "checkout-item"}-${index}`}
                    style={styles.checkoutItem}
                  >
                    <View style={styles.checkoutItemHeader}>
                      <Text style={styles.checkoutItemName}>
                        {index + 1}. {item.name}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <IconButton
                          icon="pencil"
                          size={20}
                          accessibilityLabel={`Edit ${item.name}`}
                          onPress={() =>
                            navigation.navigate(
                              isEmployeeSession
                                ? "employeePosBoardScreen"
                                : "vendorPosMenuScreen",
                              {
                                editCartLineId: item._cartLineId || item._id,
                              }
                            )
                          }
                        />
                        <Text style={styles.checkoutItemPrice}>
                          ${toAmount(calculateItemTotalWithDiscount(item))}
                        </Text>
                      </View>
                    </View>
                    {[
                      formatSelectedOptionLabels(item, "flavor", "selectedFlavors").length
                        ? `Flavors: ${formatSelectedOptionLabels(item, "flavor", "selectedFlavors").join(", ")}`
                        : null,
                      formatSelectedOptionLabels(item, "topping", "selectedToppings").length
                        ? `Toppings: ${formatSelectedOptionLabels(item, "topping", "selectedToppings").join(", ")}`
                        : null,
                      formatSelectedSideLabels(item).length
                        ? `Sides: ${formatSelectedSideLabels(item).join(", ")}`
                        : null,
                      item.customizationInput
                        ? `Customizations: ${item.customizationInput}`
                        : null,
                    ].filter(Boolean).map((detail, detailIndex) => (
                        <Text key={`${index}-${detailIndex}`} style={styles.checkoutItemDetail}>
                          {detail}
                        </Text>
                      ))}
                    {nestedItems.map((nestedItem, nestedIndex) => (
                      <View
                        key={`${index}-nested-${nestedIndex}`}
                        style={styles.checkoutNestedItem}
                      >
                        <View style={styles.checkoutNestedHeader}>
                          <Text style={styles.checkoutNestedName}>
                            {nestedItem.isAddOn ? "Add On" : "Combo item"}: {nestedItem.name}
                          </Text>
                          <Text style={styles.checkoutNestedQty}>
                            ×{nestedItem.qty}
                          </Text>
                        </View>
                        {nestedItem.selectionLines.map((line, lineIndex) => (
                          <Text
                            key={`${index}-nested-${nestedIndex}-${lineIndex}`}
                            style={styles.checkoutItemDetail}
                          >
                            {line}
                          </Text>
                        ))}
                        <Text style={styles.checkoutNestedCost}>
                          {nestedItem.costLabel}
                        </Text>
                      </View>
                    ))}
                  </View>
                  );
                })}

                <SummaryRow
                  label="Item Total"
                  value={`$${toAmount(summary.subTotal)}`}
                />
                <SummaryRow
                  label="Discount"
                  value={`-$${toAmount(summary.discount)}`}
                />
                <SummaryRow
                  label="Sales Tax"
                  value={`$${toAmount(summary.taxAmount)}`}
                />
                <SummaryRow
                  label="Tip"
                  value={`$${toAmount(summary.tipsAmount)}`}
                />
                {tapToPayOptionAvailable ? (
                  <SummaryRow
                    label="Payment Processing Fee"
                    value={`$${toAmount(tapSummary.paymentProcessingFee)}`}
                  />
                ) : null}
                <View style={styles.divider} />
                <SummaryRow
                  label="Cash Total"
                  value={`$${toAmount(summary.total)}`}
                  bold
                />
                {tapToPayOptionAvailable ? (
                  <SummaryRow
                    label="Tap to Pay on iPhone Total"
                    value={`$${toAmount(tapSummary.total)}`}
                    bold
                  />
                ) : null}
                {guestPhone ? (
                  <Text style={styles.guestText}>Guest phone: {guestPhone}</Text>
                ) : null}
                <Text style={styles.guestText}>
                  Created {moment().format("MM/DD/YYYY h:mm A")}
                </Text>
              </>
            ) : null}
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
          {tapToPayOptionAvailable ? (
            <TouchableOpacity
              style={styles.paymentButton}
              onPress={handleTapToPay}
              disabled={!!paymentLoading}
            >
              <Text style={styles.paymentButtonText}>
                {paymentLoading === "tap"
                  ? "Processing..."
                  : `Tap to Pay $${toAmount(tapSummary.total)}`}
              </Text>
              <Text style={styles.paymentButtonSubText}>
                Card-present gateway payment
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[
              styles.paymentButton,
              styles.cashPaymentButton,
              (!cashOrder || !!paymentLoading) && styles.paymentButtonDisabled,
            ]}
            onPress={handleCash}
            disabled={!cashOrder || !!paymentLoading}
          >
            <Text style={[styles.paymentButtonText, styles.cashPaymentButtonText]}>
              {paymentLoading === "cash"
                ? "Completing..."
                : `Check Out $${toAmount(summary.total)}`}
            </Text>
            <Text style={[styles.paymentButtonSubText, styles.cashPaymentButtonSubText]}>
              No payment processing fee or gateway call
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const SummaryRow = ({ label, value, bold }) => (
  <View style={styles.summaryRow}>
    <Text style={[styles.summaryLabel, bold && styles.summaryBold]}>
      {label}
    </Text>
    <Text style={[styles.summaryValue, bold && styles.summaryBold]}>
      {value}
    </Text>
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
  sectionTitle: {
    fontFamily: Mulish700,
    fontSize: 18,
    color: AppColor.black,
    marginBottom: 10,
  },
  summaryToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryToggleCopy: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  summaryInfoIcon: { margin: 0, marginRight: 4 },
  summaryToggleTextContainer: { flex: 1 },
  summaryToggleTitle: {
    fontFamily: Mulish700,
    fontSize: 18,
    color: AppColor.black,
  },
  summaryToggleHint: {
    fontFamily: Mulish400,
    color: AppColor.black,
    fontSize: 13,
    marginTop: 2,
  },
  summaryChevron: { margin: 0, marginLeft: 8 },
  expandedSectionTitle: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.black,
    marginTop: 16,
    marginBottom: 2,
  },
  checkoutItem: {
    borderTopWidth: 1,
    borderTopColor: AppColor.border,
    paddingVertical: 10,
  },
  checkoutItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  checkoutItemName: { flex: 1, fontFamily: Mulish700, color: AppColor.black },
  checkoutItemPrice: { fontFamily: Mulish600, color: AppColor.black },
  checkoutItemDetail: {
    fontFamily: Mulish400,
    color: AppColor.black,
    fontSize: 13,
    marginTop: 3,
  },
  checkoutNestedItem: {
    marginTop: 8,
    marginLeft: 12,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: AppColor.primary,
  },
  checkoutNestedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  checkoutNestedName: {
    flex: 1,
    fontFamily: Mulish600,
    color: AppColor.black,
    fontSize: 13,
  },
  checkoutNestedQty: {
    fontFamily: Mulish700,
    color: AppColor.black,
    fontSize: 13,
  },
  checkoutNestedCost: {
    marginTop: 3,
    fontFamily: Mulish600,
    color: AppColor.gray,
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  summaryLabel: { fontFamily: Mulish400, color: AppColor.black },
  summaryValue: { fontFamily: Mulish600, color: AppColor.black },
  summaryBold: { fontFamily: Mulish700, fontSize: 16 },
  divider: { height: 1, backgroundColor: AppColor.border, marginVertical: 10 },
  guestText: { fontFamily: Mulish400, color: AppColor.black, marginTop: 8 },
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
  cashPaymentButton: {
    borderColor: AppColor.primary,
    backgroundColor: AppColor.primary,
  },
  paymentButtonDisabled: {
    opacity: 0.6,
  },
  paymentButtonText: {
    fontFamily: Mulish700,
    fontSize: 18,
    color: AppColor.black,
  },
  cashPaymentButtonText: {
    color: AppColor.white,
  },
  paymentButtonSubText: {
    fontFamily: Mulish400,
    color: AppColor.black,
    marginTop: 4,
  },
  cashPaymentButtonSubText: {
    color: AppColor.white,
    opacity: 0.85,
  },
});
