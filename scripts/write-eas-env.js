const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "..", ".env");
const productionEnvPath = path.resolve(
  __dirname,
  "..",
  ".env.live-google-production"
);
const gradlePropertiesPath = path.resolve(
  __dirname,
  "..",
  "android",
  "gradle.properties"
);
const nativeTapToPayConfigPath = path.resolve(
  __dirname,
  "..",
  "ios",
  "FoodtruckVendor",
  "TapToPay.local.xcconfig"
);
const androidTapToPayConfigPath = path.resolve(
  __dirname,
  "..",
  "android",
  "TapToPay.local.properties"
);

const envKeys = [
  "API_URL",
  "API_PREFIX",
  "APP_ENV",
  "GOOGLE_MAP_API_KEY",
  "APPLE_PAY_MERCHANT_ID",
  "PAYMENT_COUNTRY_CODE",
  "PAYMENT_CURRENCY_CODE",
  "GOOGLE_PAY_ENVIRONMENT",
  "GOOGLE_PAY_GATEWAY",
  "GOOGLE_PAY_MERCHANT_ID",
  "CYBERSOURCE_MERCHANT_ID",
  "EXPO_PUBLIC_TAP_TO_PAY_ENABLED",
  "EXPO_PUBLIC_TAP_TO_PAY_ENV",
  "TAP_TO_PAY_PROVIDER",
  "TAP_TO_PAY_APPLE_TEAM_ID",
  "TAP_TO_PAY_SDK_CONFIG_ID",
  "TAP_TO_PAY_CURRENCY",
];

const lines = envKeys
  .filter((key) => process.env[key] !== undefined)
  .map((key) => `${key}=${process.env[key]}`);

const tapToPayEnabled =
  process.env.EXPO_PUBLIC_TAP_TO_PAY_ENABLED || process.env.TAP_TO_PAY_ENABLED;
const tapToPayEnvironment =
  process.env.EXPO_PUBLIC_TAP_TO_PAY_ENV ||
  process.env.TAP_TO_PAY_ENVIRONMENT ||
  process.env.TAP_TO_PAY_ENV;

if (tapToPayEnabled !== undefined) {
  lines.push(`TAP_TO_PAY_ENABLED=${tapToPayEnabled}`);
}

if (tapToPayEnvironment !== undefined) {
  lines.push(`TAP_TO_PAY_ENVIRONMENT=${tapToPayEnvironment}`);
}

if (!lines.some((line) => line.startsWith("API_URL="))) {
  throw new Error("API_URL is required for EAS builds.");
}

if (!lines.some((line) => line.startsWith("API_PREFIX="))) {
  lines.push("API_PREFIX=/api/v1");
}

const acceptanceDevicesMerchantId = process.env.CYBERSOURCE_TTP_MERCHANT_ID;
const acceptanceDevicesSecret = process.env.CYBERSOURCE_TTP_ACCEPTANCE_DEVICE_SECRET;

if (Boolean(acceptanceDevicesMerchantId) !== Boolean(acceptanceDevicesSecret)) {
  throw new Error(
    "CYBERSOURCE_TTP_MERCHANT_ID and CYBERSOURCE_TTP_ACCEPTANCE_DEVICE_SECRET must be supplied together."
  );
}

if (acceptanceDevicesMerchantId && acceptanceDevicesSecret) {
  fs.writeFileSync(
    nativeTapToPayConfigPath,
    [
      "// Generated during the EAS build. Do not commit this file.",
      `CYBERSOURCE_TTP_MERCHANT_ID = ${acceptanceDevicesMerchantId}`,
      `CYBERSOURCE_TTP_ACCEPTANCE_DEVICE_SECRET = ${acceptanceDevicesSecret}`,
      "CYBERSOURCE_TTP_DEVICE_ID =",
      "CYBERSOURCE_TTP_RESET_ENROLLMENT = NO",
      "",
    ].join("\n")
  );
  fs.writeFileSync(
    androidTapToPayConfigPath,
    [
      "# Generated during the EAS build. Do not commit this file.",
      `CYBERSOURCE_TTP_MERCHANT_ID=${acceptanceDevicesMerchantId}`,
      `CYBERSOURCE_TTP_ACCEPTANCE_DEVICE_SECRET=${acceptanceDevicesSecret}`,
      "",
    ].join("\n")
  );
  console.log("Wrote native Tap to Pay credential configuration.");
}

const envContents = `${lines.join("\n")}\n`;
fs.writeFileSync(envPath, envContents);

// Android's production flavor reads this file through react-native-config.
// EAS injects its values as process environment variables, so materialize the
// flavor-specific file only during a production cloud build.
if (process.env.EAS_BUILD_PROFILE === "production") {
  fs.writeFileSync(productionEnvPath, envContents);

  // The geolocation module's New Architecture codegen currently omits
  // RNCGeolocationSpec.h during the Android CMake release build. The local
  // Gradle properties file is intentionally untracked because it holds
  // signing settings, so apply the safe architecture setting in EAS instead.
  if (fs.existsSync(gradlePropertiesPath)) {
    const gradleProperties = fs.readFileSync(gradlePropertiesPath, "utf8");
    const updatedGradleProperties = /(^|\n)newArchEnabled=.*/m.test(
      gradleProperties
    )
      ? gradleProperties.replace(/(^|\n)newArchEnabled=.*/m, "$1newArchEnabled=false")
      : `${gradleProperties.trimEnd()}\nnewArchEnabled=false\n`;
    fs.writeFileSync(gradlePropertiesPath, updatedGradleProperties);
  }
}
console.log(`Wrote ${lines.length} EAS environment values to .env`);
console.log(`API_URL=${process.env.API_URL}`);
