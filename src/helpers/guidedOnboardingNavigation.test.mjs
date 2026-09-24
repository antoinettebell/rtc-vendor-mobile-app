import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readScreen = (name) => readFile(
  new URL(`../screens/${name}`, import.meta.url),
  "utf8",
);

const [
  approvalScreen,
  profileScreen,
  complianceScreen,
  tapToPayScreen,
  paymentScreen,
] = await Promise.all([
  readScreen("authUnderReviewNoteScreen.js"),
  readScreen("authFoodTruckProfileScreen.js"),
  readScreen("vendorComplianceScreen.js"),
  readScreen("authTapToPaySetupScreen.js"),
  readScreen("authFoodTruckBankDetailScreen.js"),
]);

assert.match(
  approvalScreen,
  /setVendorOnboardingStep\("PROFILE"\)[\s\S]*name: "authFoodTruckProfileScreen"/,
  "approval must begin guided Food Vendor setup on Profile",
);
assert.match(
  profileScreen,
  /getNextFoodVendorGuidedStep\([\s\S]*"PROFILE"[\s\S]*includeTapToPay: Platform\.OS === "ios"/,
  "Profile must continue through the canonical guided-step sequence",
);
assert.match(
  profileScreen,
  /A valid 9-digit EIN or SSN is required/,
  "guided Profile setup must require the tax identifier used by compliance",
);
assert.match(
  complianceScreen,
  /setVendorOnboardingStep\("PROFILE"\)[\s\S]*name: "authFoodTruckProfileScreen"/,
  "Compliance Back must return to Profile",
);
assert.match(
  tapToPayScreen,
  /setVendorOnboardingStep\("COMPLIANCE"\)[\s\S]*name: "vendorComplianceScreen"/,
  "Tap to Pay Back must return to Compliance",
);
assert.match(
  paymentScreen,
  /getPreviousFoodVendorGuidedStep\([\s\S]*"PAYMENT"[\s\S]*previousStep === "TAP_TO_PAY"/,
  "Payment Back must use the preceding guided step",
);

console.log("Guided Food Vendor onboarding navigation tests passed.");
