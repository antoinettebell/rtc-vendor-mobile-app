import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../screens/vendorPosCheckoutScreen.js", import.meta.url),
  "utf8",
);

const completionStart = source.indexOf("const completeTapToPayPayment");
const completionEnd = source.indexOf("const summary =", completionStart);
const completionSource = source.slice(completionStart, completionEnd);

assert.match(completionSource, /Payment Approved — Order Pending/);
assert.match(completionSource, /Do not charge the customer again/);
assert.doesNotMatch(completionSource, /Tap to Pay on iPhone failed/);
assert.match(source, /setTapToPayApprovalPending\(true\)/);
assert.match(source, /disabled=\{!!paymentLoading \|\| tapToPayApprovalPending\}/);
assert.match(source, /Payment Approved — Pending/);

console.log("Tap to Pay post-approval screen tests passed");
