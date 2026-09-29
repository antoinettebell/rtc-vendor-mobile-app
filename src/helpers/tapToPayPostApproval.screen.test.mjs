import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../screens/vendorPosCheckoutScreen.js", import.meta.url),
  "utf8",
);

const completionStart = source.indexOf("const completeTapToPayPayment");
const completionEnd = source.indexOf("const summary =", completionStart);
const completionSource = source.slice(completionStart, completionEnd);

assert.match(completionSource, /Unable to Confirm Payment/);
assert.match(completionSource, /Do not retry or charge the customer again/);
assert.match(completionSource, /Call RTC Support/);
assert.match(source, /RTC_SUPPORT_PHONE_URL = "tel:8004107053"/);
assert.doesNotMatch(completionSource, /Tap to Pay on iPhone failed/);
assert.match(source, /setTapToPayApprovalPending\(true\)/);
assert.match(source, /disabled=\{!!paymentLoading \|\| tapToPayApprovalPending\}/);
assert.match(source, /Payment Approved — Pending/);
assert.match(source, /failure category:/);
assert.match(source, /developer info:/);
assert.match(source, /diagnostic\.trace/);

console.log("Tap to Pay post-approval screen tests passed");
