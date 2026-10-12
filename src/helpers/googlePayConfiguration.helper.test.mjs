import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const helperSource = await readFile(
  new URL("./googlePayConfiguration.helper.js", import.meta.url),
  "utf8",
);
const helperModuleUrl = `data:text/javascript;base64,${Buffer.from(
  helperSource,
).toString("base64")}`;
globalThis.__DEV__ = false;
const { assertGooglePayConfiguration } = await import(helperModuleUrl);

assert.doesNotThrow(() => assertGooglePayConfiguration({
  GOOGLE_PAY_ENVIRONMENT: "PRODUCTION",
  GOOGLE_PAY_GATEWAY: "cybersource",
  GOOGLE_PAY_MERCHANT_ID: "google-pay-merchant-id",
  CYBERSOURCE_MERCHANT_ID: "cybersource-merchant-id",
}));
assert.throws(
  () => assertGooglePayConfiguration({
    GOOGLE_PAY_ENVIRONMENT: "TEST",
    GOOGLE_PAY_GATEWAY: "cybersource",
    CYBERSOURCE_MERCHANT_ID: "cybersource-merchant-id",
  }),
  /GOOGLE_PAY_MERCHANT_ID/,
);

console.log("Google Pay configuration helper tests passed");
