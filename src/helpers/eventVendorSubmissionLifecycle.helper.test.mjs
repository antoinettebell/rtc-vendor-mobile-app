import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  canEditEventVendorSubmission,
  canWithdrawEventVendorSubmission,
  resolveEventVendorParticipationPath,
  splitEventVendorApplications,
} from "./eventVendorSubmissionLifecycle.helper.js";

const open = { status: "OPEN" };
assert.equal(canEditEventVendorSubmission({ status: "SUBMITTED" }, open), true);
assert.equal(canWithdrawEventVendorSubmission({ status: "UNDER_REVIEW" }, open), true);
for (const status of ["AWARDED", "PAYMENT_DUE", "PAID", "WITHDRAWN"]) {
  assert.equal(canEditEventVendorSubmission({ status }, open), false);
  assert.equal(canWithdrawEventVendorSubmission({ status }, open), false);
}
assert.equal(canEditEventVendorSubmission({ status: "SUBMITTED" }, { status: "CLOSED" }), false);
assert.equal(resolveEventVendorParticipationPath({}, { payment_responsibility: "COORDINATOR" }), "BID");
assert.equal(resolveEventVendorParticipationPath({}, { payment_responsibility: "VENDOR" }), "APPLICATION");
assert.equal(resolveEventVendorParticipationPath({ participation_path: "BID" }, { payment_responsibility: "BOTH" }), "BID");
assert.equal(resolveEventVendorParticipationPath({ participation_path: "APPLICATION" }, { payment_responsibility: "BOTH" }), "APPLICATION");
assert.equal(resolveEventVendorParticipationPath({ category_fee: 25 }, { payment_responsibility: "BOTH" }), "APPLICATION");
assert.equal(resolveEventVendorParticipationPath({ category_fee: 0 }, { payment_responsibility: "BOTH" }), "APPLICATION");
assert.equal(resolveEventVendorParticipationPath({ category_fee: 0, electricity_fee: 20, checkout_subtotal: 20 }, { payment_responsibility: "BOTH" }), "APPLICATION");
const legacyBoth = { application_id: "legacy", status: "SUBMITTED", category_fee: 0, electricity_fee: 20, checkout_subtotal: 20, event: { payment_responsibility: "BOTH" } };
const legacyBefore = structuredClone(legacyBoth);
assert.deepEqual(splitEventVendorApplications([legacyBoth]), { bids: [], applications: [legacyBoth], awarded: [] });
assert.deepEqual(legacyBoth, legacyBefore, "opening/classifying a legacy submission does not recalculate or mutate it");
const split = splitEventVendorApplications([
  { application_id: "bid", status: "SUBMITTED", participation_path: "BID" },
  { application_id: "application", status: "UNDER_REVIEW", participation_path: "APPLICATION" },
  { application_id: "award", status: "PAYMENT_DUE", participation_path: "BID" },
  { application_id: "withdrawn", status: "WITHDRAWN", participation_path: "APPLICATION" },
]);
assert.deepEqual(split.bids.map((item) => item.application_id), ["bid"]);
assert.deepEqual(split.applications.map((item) => item.application_id), ["application", "withdrawn"]);
assert.equal(split.awarded.length, 1);
assert.equal(new Set([...split.bids, ...split.applications, ...split.awarded].map((item) => item.application_id)).size, 4);
const screen = await readFile(new URL("../screens/eventVendorMarketplaceScreen.js", import.meta.url), "utf8");
assert.match(screen, /Marketplace \/ Near Me/);
assert.match(screen, /My Applications/);
assert.match(screen, /categorized\.bids/);
assert.match(screen, /Awarded Events/);
assert.match(screen, /Edit Event Submission/);
assert.match(screen, /Withdraw Application/);
assert.match(screen, /useFocusEffect/);
assert.match(screen, /eventVendorSubmissionDetailsScreen/);
assert.match(screen, /Complete Award Checkout/);
const details = await readFile(new URL("../screens/eventVendorSubmissionDetailsScreen.js", import.meta.url), "utf8");
for (const label of [
  "Submitted vendor types", "Products / Services Offered", "Average Price",
  "Additional Notes", "Electricity", "Agreement", "Submitted Photos",
]) assert.match(details, new RegExp(label));
assert.match(details, /Complete Award Checkout/);
assert.doesNotMatch(details, /TextInput|submitEventVendorApplication_API/);
console.log("event vendor submission lifecycle tests passed");
