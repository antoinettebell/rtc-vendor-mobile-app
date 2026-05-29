import Config from "react-native-config";
import { Platform } from "react-native";

const normalizeBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return String(value).toLowerCase() === "true";
};

const defaultTapToPayEnabled = Platform.OS === "ios";

const tapToPayConfig = {
  enabled: normalizeBoolean(Config.TAP_TO_PAY_ENABLED, defaultTapToPayEnabled),
  mockMode: normalizeBoolean(Config.TAP_TO_PAY_MOCK),
  provider: Config.TAP_TO_PAY_PROVIDER || "AUTHORIZE_NET",
  environment:
    Config.TAP_TO_PAY_ENVIRONMENT ||
    Config.AUTHORIZE_NET_ENV ||
    Config.PAYMENT_MODE ||
    "production",
  merchantId: Config.TAP_TO_PAY_MERCHANT_ID || "",
  terminalId: Config.TAP_TO_PAY_TERMINAL_ID || "",
  sdkConfigId: Config.TAP_TO_PAY_SDK_CONFIG_ID || "",
  currency: Config.TAP_TO_PAY_CURRENCY || "USD",
};

export default tapToPayConfig;
