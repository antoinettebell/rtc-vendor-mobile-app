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
const notificationBell = await readFile(
  new URL("../components/VendorMarketplaceNotificationBell.js", import.meta.url),
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
assert.match(form, /Perform Count/);
assert.match(form, /beginEmployeeInventoryAdd/);
assert.match(form, /employeeInventoryMode === "COUNT"/);
assert.match(form, /inventory && !isEmployee \? <View style=\{styles\.inventoryReview\}/);
assert.match(inventory, /Close Inventory Count/);
assert.match(inventory, /archiveOperationalInventoryItem_API/);
assert.match(inventory, /Did you receive new products/);
assert.match(inventory, /No reorder is currently needed/);
assert.match(inventory, /Beginning quantity cannot exceed max quantity/);
assert.match(inventory, /Beginning, current, and max quantities must match/);
assert.match(inventory, /setSelected\(savedItem\)/);
assert.match(inventory, /formId: created\.form\._id/);
assert.match(inventory, /Archived Inventory Items/);
assert.match(home, /item\.type === "OPERATIONAL_COMPLIANCE"/);
assert.match(home, /formId: item\.form_id/);
assert.match(home, /reviewMode: item\.form_type === "INVENTORY" && !!item\.form_id && !item\.inventory_item_id/);
assert.match(notificationBell, /reviewMode: item\.form_type === "INVENTORY" && !!item\.form_id && !item\.inventory_item_id/);
assert.match(form, /reorder_items: payload\.inventory_items/);
assert.match(form, /Did you receive new products/);
assert.match(home, /acknowledgeMarketplaceNotifications_API/);
assert.match(home, /vendorHomeClearedNotifications/);
assert.match(home, /Clear Notifications/);
assert.match(home, /item\.acknowledged !== true/);

console.log("operations regression tests passed");
