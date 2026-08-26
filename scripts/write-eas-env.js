const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "..", ".env");

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

fs.writeFileSync(envPath, `${lines.join("\n")}\n`);
console.log(`Wrote ${lines.length} EAS environment values to .env`);
console.log(`API_URL=${process.env.API_URL}`);
