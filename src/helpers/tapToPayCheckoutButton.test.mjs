import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => readFile(path.join(root, file), "utf8");

const [
  buttonContent,
  nativeBridge,
  nativeExports,
  posCheckout,
  marketplacePayment,
  generalPurchase,
  launchHero,
] = await Promise.all([
  read("src/components/TapToPayCheckoutButtonContent.js"),
  read("ios/FoodtruckVendor/RTCTapToPay.swift"),
  read("ios/FoodtruckVendor/RTCTapToPay.m"),
  read("src/screens/vendorPosCheckoutScreen.js"),
  read("src/screens/vendorMarketplacePaymentScreen.js"),
  read("src/screens/eventVendorGeneralPurchaseScreen.js"),
  read("src/components/TapToPayLaunchHero.js"),
]);

assert.match(buttonContent, />Tap to Pay on iPhone</);
assert.match(buttonContent, /requireNativeComponent\("RTCTapToPaySymbol"\)/);
assert.match(nativeBridge, /systemName: "wave\.3\.right\.circle\.fill"/);
assert.match(nativeExports, /RCT_EXTERN_MODULE\(RTCTapToPaySymbolManager, RCTViewManager\)/);

for (const source of [posCheckout, marketplacePayment, generalPurchase]) {
  assert.match(source, /TapToPayCheckoutButtonContent/);
  assert.match(source, /accessibilityLabel="Tap to Pay on iPhone"/);
}

assert.doesNotMatch(posCheckout, /`Tap to Pay \$\{/);
assert.doesNotMatch(marketplacePayment, /`Tap to Pay \$\{/);
assert.doesNotMatch(generalPurchase, />Tap to Pay \{currency/);

assert.match(launchHero, /tapToPayHeroCardToIPhone9x16\.jpg/);
assert.match(launchHero, />Get started</);
assert.match(launchHero, /borderColor: AppColor\.black/);
assert.match(launchHero, /borderRadius: 999/);
assert.match(launchHero, /borderWidth: 1\.5/);

console.log("Tap to Pay checkout button tests passed.");
