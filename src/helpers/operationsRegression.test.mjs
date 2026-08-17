import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const operations = await readFile(
  new URL("../screens/operationsScreen.js", import.meta.url),
  "utf8",
);
const form = await readFile(
  new URL("../screens/operationalFormScreen.js", import.meta.url),
  "utf8",
);
const home = await readFile(
  new URL("../screens/homeScreen.js", import.meta.url),
  "utf8",
);

assert.match(operations, /!isEmployee \? <Text style=\{styles\.sectionTitle\}>Archive/);
assert.match(form, /form\.status === "SUBMITTED" && !isEmployee/);
assert.match(form, /editable && !isEmployee/);
assert.match(home, /item\.type === "OPERATIONAL_COMPLIANCE"/);
assert.match(home, /formId: item\.form_id/);
assert.match(home, /acknowledgeMarketplaceNotifications_API/);
assert.match(home, /vendorHomeClearedNotifications/);
assert.match(home, /Clear Notifications/);
assert.match(home, /item\.acknowledged !== true/);

console.log("operations regression tests passed");
