import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../screens/vendorMarketplaceAwardedEventDetailsScreen.js", import.meta.url),
  "utf8",
);

assert.match(source, /closeState\.available_at/);
assert.match(source, /currentTime >= closeAvailableAt/);
assert.match(source, /Final payment becomes available when the event starts\./);
assert.match(source, /finalPaymentStatus !== "PAID"/);
assert.match(source, /!finalPayment\?\.payment_id/);
assert.match(source, />Collect Event Payment<\/Text>/);
assert.match(source, /navigation\.navigate\("vendorMarketplacePaymentScreen"/);
assert.doesNotMatch(source, />Close Event<\/Text>/);

console.log("Vendor final-event payment timing screen tests passed.");
