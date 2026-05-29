import Config from "react-native-config";
import { Platform } from "react-native";

const normalizeBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return String(value).toLowerCase() === "true";
};

const defaultTapToPayEnabled = Platform.OS === "ios";
const defaultApplePayMerchantId = "merchant.roundthecorner.vendor";
const defaultAndroidGatewayMerchantId = "2794197";
const applePayMerchantId =
  Config.APPLE_PAY_MERCHANT_ID || defaultApplePayMerchantId;
const androidGatewayMerchantId =
  Config.ANDROID_PAYMENT_GATEWAY_MERCHANT_ID ||
  defaultAndroidGatewayMerchantId;
const defaultTapToPayMerchantId =
  Platform.OS === "ios" ? applePayMerchantId : androidGatewayMerchantId;

const tapToPayConfig = {
  enabled: normalizeBoolean(Config.TAP_TO_PAY_ENABLED, defaultTapToPayEnabled),
  mockMode: normalizeBoolean(Config.TAP_TO_PAY_MOCK),
  provider: Config.TAP_TO_PAY_PROVIDER || "AUTHORIZE_NET",
  environment:
    Config.TAP_TO_PAY_ENVIRONMENT ||
    Config.AUTHORIZE_NET_ENV ||
    Config.PAYMENT_MODE ||
    "production",
  merchantId: Config.TAP_TO_PAY_MERCHANT_ID || defaultTapToPayMerchantId,
  terminalId: Config.TAP_TO_PAY_TERMINAL_ID || androidGatewayMerchantId,
  sdkConfigId: Config.TAP_TO_PAY_SDK_CONFIG_ID || "",
  currency: Config.TAP_TO_PAY_CURRENCY || "USD",
};

export default tapToPayConfig;
