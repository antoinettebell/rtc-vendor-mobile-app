import Config from "react-native-config";

const normalizeBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return String(value).toLowerCase() === "true";
};

const defaultTapToPayEnabled = false;
const defaultAppleTeamId = "5G26GFF98P";

const firstConfiguredValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const environment =
  firstConfiguredValue(
    Config.EXPO_PUBLIC_TAP_TO_PAY_ENV,
    Config.TAP_TO_PAY_ENVIRONMENT,
    Config.TAP_TO_PAY_ENV,
  ) || "production";

const tapToPayConfig = {
  enabled: normalizeBoolean(
    firstConfiguredValue(
      Config.EXPO_PUBLIC_TAP_TO_PAY_ENABLED,
      Config.TAP_TO_PAY_ENABLED,
    ),
    defaultTapToPayEnabled,
  ),
  mockMode: normalizeBoolean(Config.TAP_TO_PAY_MOCK),
  provider: Config.TAP_TO_PAY_PROVIDER || "CYBERSOURCE",
  environment,
  isTest: /^(sandbox|test|testing)$/i.test(environment),
  appleTeamId: Config.TAP_TO_PAY_APPLE_TEAM_ID || defaultAppleTeamId,
  sdkConfigId: Config.TAP_TO_PAY_SDK_CONFIG_ID || "",
  currency: Config.TAP_TO_PAY_CURRENCY || "USD",
};

export default tapToPayConfig;
