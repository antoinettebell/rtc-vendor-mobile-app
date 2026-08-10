import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  canEditEventVendorSubmission,
  canWithdrawEventVendorSubmission,
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
const split = splitEventVendorApplications([{ status: "SUBMITTED" }, { status: "PAYMENT_DUE" }, { status: "WITHDRAWN" }]);
assert.equal(split.applications.length, 2);
assert.equal(split.awarded.length, 1);
const screen = await readFile(new URL("../screens/eventVendorMarketplaceScreen.js", import.meta.url), "utf8");
assert.match(screen, /Marketplace \/ Near Me/);
assert.match(screen, /My Applications/);
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
