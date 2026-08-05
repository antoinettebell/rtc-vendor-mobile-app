const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "..", ".env");

const envKeys = [
  "API_URL",
  "API_PREFIX",
  "APP_ENV",
  "GOOGLE_MAP_API_KEY",
  "TAP_TO_PAY_ENABLED",
  "TAP_TO_PAY_PROVIDER",
  "TAP_TO_PAY_ENVIRONMENT",
  "TAP_TO_PAY_MERCHANT_ID",
  "TAP_TO_PAY_MERCHANT_SECRET",
  "TAP_TO_PAY_TERMINAL_ID",
  "TAP_TO_PAY_APPLE_TEAM_ID",
  "TAP_TO_PAY_SDK_CONFIG_ID",
  "TAP_TO_PAY_CURRENCY",
  "TAP_TO_PAY_ENV",
];

const lines = envKeys
  .filter((key) => process.env[key] !== undefined)
  .map((key) => `${key}=${process.env[key]}`);

if (!lines.some((line) => line.startsWith("API_URL="))) {
  throw new Error("API_URL is required for EAS builds.");
}

if (!lines.some((line) => line.startsWith("API_PREFIX="))) {
  lines.push("API_PREFIX=/api/v1");
}

fs.writeFileSync(envPath, `${lines.join("\n")}\n`);
console.log(`Wrote ${lines.length} EAS environment values to .env`);
console.log(`API_URL=${process.env.API_URL}`);
