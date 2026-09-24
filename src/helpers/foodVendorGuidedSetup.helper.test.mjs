import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./foodVendorGuidedSetup.helper.js", import.meta.url), "utf8");
const helper = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
assert.deepEqual(helper.getFoodVendorGuidedSteps({ slug: "SUB_BASIC" }), ["PROFILE", "PAYMENT", "MENU"]);
assert.deepEqual(helper.getFoodVendorGuidedSteps({ slug: "SUB_PLATINUM" }), ["PROFILE", "PAYMENT", "EMPLOYEES", "MENU"]);
assert.equal(helper.getNextFoodVendorGuidedStep({ slug: "SUB_BASIC" }, "MENU"), null);
assert.equal(helper.getNextFoodVendorGuidedStep({ slug: "SUB_PLATINUM" }, "PAYMENT"), "EMPLOYEES");
assert.equal(helper.getPreviousFoodVendorGuidedStep({ slug: "SUB_BASIC" }, "PAYMENT"), "PROFILE");
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
assert.deepEqual(
  helper.getFoodVendorGuidedSteps(tapToPayPlan, { includeTapToPay: true }),
  ["PROFILE", "COMPLIANCE", "TAP_TO_PAY", "PAYMENT", "EMPLOYEES", "MENU"],
);
assert.equal(helper.isTapToPaySetupEligible(tapToPayPlan), true);
assert.equal(
  helper.getNextFoodVendorGuidedStep(
    tapToPayPlan,
    "COMPLIANCE",
    { includeTapToPay: true },
  ),
  "TAP_TO_PAY",
);
assert.equal(
  helper.getPreviousFoodVendorGuidedStep(
    tapToPayPlan,
    "PAYMENT",
    { includeTapToPay: true },
  ),
  "TAP_TO_PAY",
);
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
  "PROFILE",
  "non-iPhone sessions do not resume the iPhone-only setup stage",
);
assert.equal(
  helper.getResumableFoodVendorGuidedStep({ slug: "SUB_BASIC" }, "COMPLIANCE"),
  "PROFILE",
  "non-Tap-to-Pay tiers bypass compliance",
);
assert.equal(
  helper.getEffectiveFoodVendorPlan({ user: { foodTruck: { plan: { slug: "SUB_ELITE" } } }, selectedPlan: { slug: "SUB_BASIC" } }).slug,
  "SUB_ELITE",
  "the backend food-truck plan wins over stale same-session selection",
);
console.log("Food Vendor guided setup tests passed.");
