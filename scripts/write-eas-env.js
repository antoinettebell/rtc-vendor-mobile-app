const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "..", ".env");
const nativeTapToPayConfigPath = path.resolve(
  __dirname,
  "..",
  "ios",
  "FoodtruckVendor",
  "TapToPay.local.xcconfig"
);

const envKeys = [
  "API_URL",
  "API_PREFIX",
  "APP_ENV",
  "GOOGLE_MAP_API_KEY",
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
  console.log("Wrote native Tap to Pay credential configuration.");
}

fs.writeFileSync(envPath, `${lines.join("\n")}\n`);
console.log(`Wrote ${lines.length} EAS environment values to .env`);
console.log(`API_URL=${process.env.API_URL}`);
