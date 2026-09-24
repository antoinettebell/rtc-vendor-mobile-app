import { NativeModules, Platform } from "react-native";
import DeviceInfo from "react-native-device-info";
import {
  createTapToPayActivationCode_API,
  getTapToPayTerminalStatus_API,
  recordTapToPayTerminalEvent_API,
  registerTapToPayTerminal_API,
  createEventVendorTapToPayActivationCode_API,
  getEventVendorTapToPayTerminalStatus_API,
  registerEventVendorTapToPayTerminal_API,
} from "../api/appAPI";
import tapToPayConfig from "./tapToPay-config";

const nativeTapToPay = NativeModules.RTCTapToPay;

const responseData = (response) => response?.data || response || {};
const getDeviceLabel = async () => {
  try {
    return (await DeviceInfo.getDeviceName()) || DeviceInfo.getModel() || "iPhone";
  } catch {
    return DeviceInfo.getModel?.() || "iPhone";
  }
};

const safeActivationError = (error) => ({
  error_code: String(error?.code || error?.status || "ACTIVATION_FAILED").slice(0, 120),
  error_message: String(error?.message || error?.error || "Tap to Pay activation failed.").slice(0, 500),
});

const recordActivationEvent = async (eventType, details = {}, marketplaceVendor = false) => {
  if (marketplaceVendor) return;
  try {
    await recordTapToPayTerminalEvent_API({
      event_type: eventType,
      environment: tapToPayConfig.environment,
      ...details,
    });
  } catch {
    // Diagnostics are best effort and must never block activation or payment.
  }
};

export const isTapToPayAvailable = () =>
  Platform.OS === "ios" &&
  tapToPayConfig.enabled &&
  !!nativeTapToPay?.startSale;

const registerActivatedTerminal = async (result = {}, deviceLabel, marketplaceVendor = false) => {
  const deviceId = String(result?.deviceId || "").trim();
  if (!deviceId) {
    throw new Error(
      "Tap to Pay on iPhone activated, but no terminal serial ID was returned. Please contact RTC support."
    );
  }

  const registration = await (marketplaceVendor
    ? registerEventVendorTapToPayTerminal_API
    : registerTapToPayTerminal_API)({
    deviceId,
    deviceLabel,
    environment: tapToPayConfig.environment,
    activationStatus: "SUCCEEDED",
  });
  return {
    activated: result?.activated !== false,
    newDevice: result?.newDevice === true,
    terminalSerialSuffix: registration?.data?.terminal_serial_suffix
      || registration?.terminal_serial_suffix
      || deviceId.slice(-4),
  };
};

export const getLocalTapToPayActivationStatus = async () => {
  if (!isTapToPayAvailable() || !nativeTapToPay?.getActivationStatus) {
    return { activated: false };
  }
  return nativeTapToPay.getActivationStatus({
    environment: tapToPayConfig.environment,
  });
};

export const syncTapToPayTerminalStatus = async ({ marketplaceVendor = false } = {}) => {
  const local = await getLocalTapToPayActivationStatus();
  const deviceId = String(local?.deviceId || "").trim();
  if (!local?.activated || !deviceId) return { activated: false, known: false };
  const deviceLabel = await getDeviceLabel();
  await (marketplaceVendor ? registerEventVendorTapToPayTerminal_API : registerTapToPayTerminal_API)({
    deviceId,
    deviceLabel,
    environment: tapToPayConfig.environment,
  });
  const server = responseData(await (marketplaceVendor
    ? getEventVendorTapToPayTerminalStatus_API
    : getTapToPayTerminalStatus_API)({ deviceId }));
  return { ...server, activated: true, deviceId, deviceLabel };
};

export const prepareTapToPayReader = async () => {
  if (!isTapToPayAvailable() || !nativeTapToPay?.prepare) {
    return { prepared: false, available: false };
  }

  return nativeTapToPay.prepare({
    environment: tapToPayConfig.environment,
  });
};

const ensureTerminalReady = async ({ marketplaceVendor = false } = {}) => {
  const local = await getLocalTapToPayActivationStatus();
  const deviceId = String(local?.deviceId || "").trim();
  if (!local?.activated || !deviceId) {
    await activateTapToPay({ marketplaceVendor });
    return;
  }
  const server = responseData(await (marketplaceVendor
    ? getEventVendorTapToPayTerminalStatus_API
    : getTapToPayTerminalStatus_API)({ deviceId }));
  if (server?.status === "HISTORICAL") {
    throw new Error("This iPhone is marked as a historical Tap to Pay device. Contact RTC support to restore it.");
  }
  if (server?.reactivation_required) {
    await activateTapToPay({ forceReactivation: true, existingDeviceId: deviceId, marketplaceVendor });
    return;
  }
  await (marketplaceVendor ? registerEventVendorTapToPayTerminal_API : registerTapToPayTerminal_API)({
    deviceId,
    deviceLabel: await getDeviceLabel(),
    environment: tapToPayConfig.environment,
  });
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
  marketplaceVendor = false,
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

  await ensureTerminalReady({ marketplaceVendor });

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
      await (marketplaceVendor ? registerEventVendorTapToPayTerminal_API : registerTapToPayTerminal_API)({ deviceId });
    } catch {
      // Terminal registration is retried on the next Tap to Pay transaction.
      // A bookkeeping failure must not invalidate a completed card payment.
    }
  }

  const paymentResult = { ...(result || {}) };
  delete paymentResult.deviceId;
  return normalizeTapToPayResult(paymentResult);
};

export const activateTapToPay = async ({
  forceReactivation = false,
  existingDeviceId = null,
  marketplaceVendor = false,
} = {}) => {
  if (Platform.OS !== "ios") {
    throw new Error("Tap to Pay on iPhone setup requires a compatible iPhone.");
  }
  if (!tapToPayConfig.enabled) {
    throw new Error("Tap to Pay on iPhone is not enabled in this app build.");
  }
  if (!nativeTapToPay?.activate) {
    throw new Error("Tap to Pay on iPhone setup is unavailable in this app build.");
  }

  const deviceLabel = await getDeviceLabel();
  try {
    void recordActivationEvent("ACTIVATION_STARTED", {
      device_id: existingDeviceId,
      device_label: deviceLabel,
    }, marketplaceVendor);
    const activationResponse = await (marketplaceVendor
      ? createEventVendorTapToPayActivationCode_API
      : createTapToPayActivationCode_API)();
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
      forceReactivation,
    });
    const registered = await registerActivatedTerminal(result, deviceLabel, marketplaceVendor);
    void recordActivationEvent("ACTIVATION_SUCCEEDED", {
      device_id: result?.deviceId,
      device_label: deviceLabel,
    }, marketplaceVendor);
    return registered;
  } catch (error) {
    void recordActivationEvent("ACTIVATION_FAILED", {
      device_id: existingDeviceId,
      device_label: deviceLabel,
      ...safeActivationError(error),
    }, marketplaceVendor);
    throw error;
  }
};

export const showTapToPayMerchantEducation = async () => {
  if (!nativeTapToPay?.showMerchantEducation) {
    throw new Error("Tap to Pay on iPhone merchant education is unavailable in this build.");
  }

  return nativeTapToPay.showMerchantEducation();
};
