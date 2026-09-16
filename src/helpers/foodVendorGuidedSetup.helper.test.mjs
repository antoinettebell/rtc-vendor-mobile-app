import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./foodVendorGuidedSetup.helper.js", import.meta.url), "utf8");
const helper = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
assert.deepEqual(helper.getFoodVendorGuidedSteps({ slug: "SUB_BASIC" }), ["COMPLIANCE", "PAYMENT", "MENU"]);
assert.deepEqual(helper.getFoodVendorGuidedSteps({ slug: "SUB_PLATINUM" }), ["COMPLIANCE", "PAYMENT", "EMPLOYEES", "MENU"]);
assert.deepEqual(helper.getFoodVendorGuidedSteps({ slug: "SUB_ELITE" }), ["COMPLIANCE", "PAYMENT", "EMPLOYEES", "MENU"]);
assert.equal(helper.getNextFoodVendorGuidedStep({ slug: "SUB_BASIC" }, "MENU"), null);
assert.equal(helper.getNextFoodVendorGuidedStep({ slug: "SUB_PLATINUM" }, "PAYMENT"), "EMPLOYEES");
assert.equal(helper.getResumableFoodVendorGuidedStep({ slug: "SUB_PLATINUM" }, "EMPLOYEES"), "EMPLOYEES");
assert.equal(helper.getResumableFoodVendorGuidedStep({ slug: "SUB_BASIC" }, "EMPLOYEES"), "MENU");
const tapToPayPlan = {
  slug: "SUB_ELITE",
  capabilities: {
    walkUpPos: true,
    tapToPay: true,
    walkUpPosPaymentMethods: ["CASH", "TAP_TO_PAY"],
  },
};
assert.equal(helper.isTapToPaySetupEligible(tapToPayPlan), true);
assert.equal(
  helper.getResumableFoodVendorGuidedStep(
    tapToPayPlan,
    "TAP_TO_PAY",
    { includeTapToPay: true },
  ),
  "TAP_TO_PAY",
);
assert.equal(
  helper.getResumableFoodVendorGuidedStep(tapToPayPlan, "TAP_TO_PAY"),
  "COMPLIANCE",
  "non-iPhone sessions do not resume the iPhone-only setup stage",
);
assert.equal(
  helper.getEffectiveFoodVendorPlan({ user: { foodTruck: { plan: { slug: "SUB_ELITE" } } }, selectedPlan: { slug: "SUB_BASIC" } }).slug,
  "SUB_ELITE",
  "the backend food-truck plan wins over stale same-session selection",
);
console.log("Food Vendor guided setup tests passed.");
