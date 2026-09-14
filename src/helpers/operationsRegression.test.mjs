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
const inventory = await readFile(
  new URL("../screens/vendorInventoryScreen.js", import.meta.url),
  "utf8",
);

assert.match(operations, /Employee Inventory Review/);
assert.match(operations, /startEditing/);
assert.match(operations, /Close Inventory/);
assert.match(form, /CLOSED_INTO_INVENTORY/);
assert.match(form, /if \(!employeeInventoryReview\)/);
assert.match(form, /action: submit \? "CLOSED_INTO_INVENTORY" : "UPDATED"/);
assert.doesNotMatch(form, />Approve</);
for (const label of ["Update", "Close Inventory", "Archive", "Cancel"]) {
  assert.ok(form.includes(`"${label}"`) || form.includes(`>${label}<`));
}
assert.match(form, /form\.status === "SUBMITTED" && !isEmployee/);
assert.match(form, /editable && !isEmployee/);
assert.match(inventory, /Close Inventory Count/);
assert.match(inventory, /archiveOperationalInventoryItem_API/);
assert.match(inventory, /pending_close_draft/);
assert.match(inventory, /setSelected\(savedItem\)/);
assert.match(inventory, /formId: created\.form\._id/);
assert.match(inventory, /Archived Inventory Items/);
assert.match(home, /item\.type === "OPERATIONAL_COMPLIANCE"/);
assert.match(home, /formId: item\.form_id/);
assert.match(home, /acknowledgeMarketplaceNotifications_API/);
assert.match(home, /vendorHomeClearedNotifications/);
assert.match(home, /Clear Notifications/);
assert.match(home, /item\.acknowledged !== true/);

console.log("operations regression tests passed");
