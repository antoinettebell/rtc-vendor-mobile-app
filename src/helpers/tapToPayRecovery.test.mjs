import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => readFile(path.join(root, file), "utf8");

const [app, service, manager, bridge, setup, posCheckout, marketplaceCheckout] =
  await Promise.all([
    read("App.js"),
    read("src/services/tapToPay-service.js"),
    read("ios/FoodtruckVendor/TapToPayManager.swift"),
    read("ios/FoodtruckVendor/RTCTapToPay.swift"),
    read("src/screens/authTapToPaySetupScreen.js"),
    read("src/screens/vendorPosCheckoutScreen.js"),
    read("src/screens/vendorMarketplacePaymentScreen.js"),
  ]);

assert.match(app, /prepareTapToPayReader/);
const foregroundSync = service.slice(
  service.indexOf("export const syncTapToPayTerminalStatus"),
  service.indexOf("export const prepareTapToPayReader"),
);
assert.ok(
  foregroundSync.indexOf("getTapToPayTerminalState") <
    foregroundSync.indexOf("registerTapToPayTerminal_API"),
  "foreground sync must read the server control state before registering success",
);
assert.match(foregroundSync, /server\?\.reactivation_required/);
assert.match(foregroundSync, /server\?\.status === "HISTORICAL"/);
assert.match(manager, /preparedOnlineService/);
assert.match(manager, /preparedOnlineService = try await reader\.mposUIOnline\(\)/);
assert.match(manager, /prepared_online_session_reused/);
assert.match(manager, /preparedOnlineService = nil\s+logStage\("prepared_online_session_invalidated_after_activation"\)/);
assert.match(manager, /private var activeOperation: String\?/);
assert.match(manager, /keychain loading error/);
assert.doesNotMatch(manager, /validateReaderSession/);
assert.doesNotMatch(manager, /offline\.syncSession\(\)/);
assert.match(bridge, /E_TAP_TO_PAY_SETUP_REPAIR_REQUIRED/);
assert.match(setup, /repairRequested/);
assert.match(setup, /forceReactivation:/);

for (const checkout of [posCheckout, marketplaceCheckout]) {
  assert.match(checkout, /Tap to Pay Setup Needs Repair/);
  assert.match(checkout, /repairRequired: true/);
  assert.match(checkout, /The customer was not charged/);
}

console.log("Tap to Pay enrollment recovery tests passed.");
