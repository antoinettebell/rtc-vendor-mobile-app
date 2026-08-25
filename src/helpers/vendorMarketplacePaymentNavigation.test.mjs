import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../screens/vendorMarketplacePaymentScreen.js", import.meta.url),
  "utf8",
);

assert.match(source, /const returnAfterPayment = \(\) =>/);
assert.match(
  source,
  /returnScreen === "eventVendorMarketplaceScreen"[\s\S]*?navigation\.replace\("bottomRoot", \{[\s\S]*?screen: "eventVendorMarketplaceScreen"/,
);
assert.equal(
  (source.match(/navigation\.replace\(returnScreen\)/g) || []).length,
  1,
  "only the shared return helper may replace a non-nested return screen",
);
assert.doesNotMatch(source, /returnScreen \? navigation\.replace\(returnScreen\)/);

console.log("Vendor Marketplace payment navigation tests passed.");
