import Config from "react-native-config";

const normalizeBoolean = value => String(value || "").toLowerCase() === "true";

const tapToPayConfig = {
  enabled: normalizeBoolean(Config.TAP_TO_PAY_ENABLED),
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
