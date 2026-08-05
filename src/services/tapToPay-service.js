import { NativeModules, Platform } from "react-native";
import tapToPayConfig from "./tapToPay-config";

const nativeTapToPay = NativeModules.RTCTapToPay;

const normalizeTapToPayResult = (result = {}) => {
  const dataValue =
    result.opaqueToken?.dataValue ||
    result.opaqueData?.dataValue ||
    result.dataValue ||
    result.token;
  const dataDescriptor =
    result.opaqueToken?.dataDescriptor ||
    result.opaqueData?.dataDescriptor ||
    result.dataDescriptor ||
    null;

  if (dataValue) {
    return {
      type: "OPAQUE_TOKEN",
      opaqueToken: {
        dataValue,
        dataDescriptor,
      },
      raw: result,
    };
  }

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

  if (
    Platform.OS === "android" &&
    (!tapToPayConfig.merchantId || !tapToPayConfig.merchantSecret)
  ) {
    throw new Error(
      "Android Tap to Pay needs the CyberSource merchant ID and merchant secret in this app build."
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
    merchantId: tapToPayConfig.merchantId,
    merchantSecret: tapToPayConfig.merchantSecret,
    terminalId: tapToPayConfig.terminalId,
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
