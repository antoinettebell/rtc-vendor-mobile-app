import Config from "react-native-config";

const DEFAULT_API_URL = "http://157.245.6.61:8000";
const DEFAULT_API_PREFIX = "/api/v1";

const configuredApiUrl = Config.API_URL || "";
const configuredApiPrefix = Config.API_PREFIX || "";
const configuredGoogleMapApiKey = Config.GOOGLE_MAP_API_KEY || "";
const DEFAULT_GOOGLE_MAP_API_KEY = "AIzaSyCdjHeKOYBUcpocHw5-NsdfMy2-dHkBoFY";

export const runtimeConfig = {
  apiUrl: configuredApiUrl || DEFAULT_API_URL,
  apiPrefix: configuredApiPrefix || DEFAULT_API_PREFIX,
  apiUrlSource: configuredApiUrl ? "react-native-config" : "fallback",
  GOOGLE_MAP_API_KEY: configuredGoogleMapApiKey || DEFAULT_GOOGLE_MAP_API_KEY,
  googleMapApiKeySource: configuredGoogleMapApiKey
    ? "react-native-config"
    : "fallback",
  environment:
    Config.APP_ENV ||
    Config.ENVIRONMENT ||
    Config.NODE_ENV ||
    Config.EAS_BUILD_PROFILE ||
    (__DEV__ ? "development" : "production"),
};

export default runtimeConfig;
