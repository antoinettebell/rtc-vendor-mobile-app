import { NativeModules, Platform } from "react-native";
import {
  createTapToPayActivationCode_API,
  registerTapToPayTerminal_API,
} from "../api/appAPI";
import tapToPayConfig from "./tapToPay-config";

const nativeTapToPay = NativeModules.RTCTapToPay;

export const isTapToPayAvailable = () =>
  Platform.OS === "ios" &&
  tapToPayConfig.enabled &&
  !!nativeTapToPay?.startSale;

const registerActivatedTerminal = async (result = {}) => {
  const deviceId = String(result?.deviceId || "").trim();
  if (!deviceId) {
    throw new Error(
      "Tap to Pay on iPhone activated, but no terminal serial ID was returned. Please contact RTC support."
    );
  }

  const registration = await registerTapToPayTerminal_API({ deviceId });
  return {
    activated: result?.activated !== false,
    newDevice: result?.newDevice === true,
    terminalSerialSuffix: registration?.data?.terminal_serial_suffix
      || registration?.terminal_serial_suffix
      || deviceId.slice(-4),
  };
};

const normalizeTapToPayResult = (result = {}) => {
  if (result.transactionId || result.transId) {
    return {
      type: "PROCESSED_TRANSACTION",
      transactionId: result.transactionId || result.transId,
      authCode: result.authCode || null,
      invoiceNumber: result.invoiceNumber || null,
      accountNumber: result.accountNumber || null,
      accountType: result.accountType || null,
      raw: result,
    };
  }

  throw new Error("Tap to Pay on iPhone did not return a usable payment result.");
};

export const startTapToPaySale = async ({
  amount,
  currency = "USD",
  orderNumber,
  orderId,
  reference,
}) => {
  if (Platform.OS !== "ios") {
    throw new Error("Tap to Pay on iPhone is not enabled on Android in this build.");
  }

  if (!tapToPayConfig.enabled && !tapToPayConfig.mockMode) {
    throw new Error(
      "Tap to Pay on iPhone is included with Elite, but it is not enabled in this app build. Install the Tap to Pay on iPhone-enabled build or contact RTC support."
    );
  }
  if (tapToPayConfig.mockMode) {
    const invoiceNumber = orderNumber
      ? `MOCK-${String(orderNumber)}`
      : `MOCK-${Date.now()}`;

    return {
      type: "PROCESSED_TRANSACTION",
      transactionId: `mock_tap_${Date.now()}`,
      authCode: "MOCKED",
      invoiceNumber,
      accountNumber: "XXXX1111",
      accountType: "VISA",
      raw: {
        amount: Number(amount).toFixed(2),
        currency: currency || tapToPayConfig.currency,
        orderId: orderId ? String(orderId) : null,
        provider: tapToPayConfig.provider,
        environment: tapToPayConfig.environment,
        mockMode: true,
      },
    };
  }

  if (!nativeTapToPay?.startSale) {
    throw new Error(
      "The Tap to Pay on iPhone native module is not installed. Add the iOS Tap to Pay on iPhone SDK bridge as RTCTapToPay."
    );
  }

  const result = await nativeTapToPay.startSale({
    amount: Number(amount).toFixed(2),
    currency: currency || tapToPayConfig.currency,
    orderNumber: orderNumber ? String(orderNumber) : reference ? String(reference) : null,
    orderId: orderId ? String(orderId) : null,
    platform: Platform.OS,
    provider: tapToPayConfig.provider,
    environment: tapToPayConfig.environment,
    appleTeamId: tapToPayConfig.appleTeamId,
    sdkConfigId: tapToPayConfig.sdkConfigId,
  });

  const deviceId = String(result?.deviceId || "").trim();
  if (deviceId) {
    try {
      await registerTapToPayTerminal_API({ deviceId });
    } catch {
      // Terminal registration is retried on the next Tap to Pay transaction.
      // A bookkeeping failure must not invalidate a completed card payment.
    }
  }

  const paymentResult = { ...(result || {}) };
  delete paymentResult.deviceId;
  return normalizeTapToPayResult(paymentResult);
};

export const activateTapToPay = async () => {
  if (Platform.OS !== "ios") {
    throw new Error("Tap to Pay on iPhone setup requires a compatible iPhone.");
  }
  if (!tapToPayConfig.enabled) {
    throw new Error("Tap to Pay on iPhone is not enabled in this app build.");
  }
  if (!nativeTapToPay?.activate) {
    throw new Error("Tap to Pay on iPhone setup is unavailable in this app build.");
  }

  const activationResponse = await createTapToPayActivationCode_API();
  const activationCode = String(
    activationResponse?.data?.activation_code
      || activationResponse?.activation_code
      || "",
  ).trim();
  if (!activationCode) {
    throw new Error("A secure Tap to Pay activation code could not be generated. Please try again.");
  }

  const result = await nativeTapToPay.activate({
    environment: tapToPayConfig.environment,
    provider: tapToPayConfig.provider,
    activationCode,
  });
  return registerActivatedTerminal(result);
};

export const showTapToPayMerchantEducation = async () => {
  if (!nativeTapToPay?.showMerchantEducation) {
    throw new Error("Tap to Pay on iPhone merchant education is unavailable in this build.");
  }

  return nativeTapToPay.showMerchantEducation();
};
