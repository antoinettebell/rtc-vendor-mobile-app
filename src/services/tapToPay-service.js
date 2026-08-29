import { NativeModules, Platform } from "react-native";
import tapToPayConfig from "./tapToPay-config";

const nativeTapToPay = NativeModules.RTCTapToPay;

export const isTapToPayAvailable = () =>
  Platform.OS === "ios" &&
  tapToPayConfig.enabled &&
  !!nativeTapToPay?.startSale;

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

  throw new Error("Tap to Pay did not return a usable payment result.");
};

export const startTapToPaySale = async ({
  amount,
  currency = "USD",
  orderNumber,
  orderId,
  reference,
}) => {
  if (Platform.OS !== "ios") {
    throw new Error("Tap to Pay is not enabled on Android in this build.");
  }

  if (!tapToPayConfig.enabled && !tapToPayConfig.mockMode) {
    throw new Error(
      "Tap to Pay is included with Elite, but it is not enabled in this app build. Install the Tap to Pay-enabled build or contact RTC support."
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
      "Tap to Pay native module is not installed. Add the iOS/Android Tap to Pay SDK bridge as RTCTapToPay."
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

  return normalizeTapToPayResult(result);
};

export const showTapToPayMerchantEducation = async () => {
  if (!nativeTapToPay?.showMerchantEducation) {
    throw new Error("Tap to Pay merchant education is unavailable in this build.");
  }

  return nativeTapToPay.showMerchantEducation();
};
