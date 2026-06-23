import Config from "react-native-config";

const normalizeBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return String(value).toLowerCase() === "true";
};

const defaultTapToPayEnabled = false;
const defaultAppleTeamId = "5G26GFF98P";

const tapToPayConfig = {
  enabled: normalizeBoolean(Config.TAP_TO_PAY_ENABLED, defaultTapToPayEnabled),
  mockMode: normalizeBoolean(Config.TAP_TO_PAY_MOCK),
  provider: Config.TAP_TO_PAY_PROVIDER || "CYBERSOURCE",
  environment:
    Config.TAP_TO_PAY_ENVIRONMENT ||
    Config.AUTHORIZE_NET_ENV ||
    Config.PAYMENT_MODE ||
    "production",
  merchantId: Config.TAP_TO_PAY_MERCHANT_ID || "",
  terminalId: Config.TAP_TO_PAY_TERMINAL_ID || "",
  appleTeamId: Config.TAP_TO_PAY_APPLE_TEAM_ID || defaultAppleTeamId,
  sdkConfigId: Config.TAP_TO_PAY_SDK_CONFIG_ID || "",
  currency: Config.TAP_TO_PAY_CURRENCY || "USD",
};

export default tapToPayConfig;
