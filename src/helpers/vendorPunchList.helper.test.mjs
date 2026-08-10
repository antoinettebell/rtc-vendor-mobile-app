import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const loadHelper = async (relativePath) => {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  return import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  );
};

const {
  formatShiftEditDate,
  formatShiftEditTime,
  isValidShiftRange,
  mergeShiftDatePart,
  mergeShiftTimePart,
  getBreakMinuteOptions,
} = await loadHelper("./shiftHistoryEdit.helper.js");
const {
  buildPaymentMethodPayload,
  getPaymentMethodFields,
  hydratePaymentMethodDetails,
} = await loadHelper(
  "./paymentMethodDetails.helper.js",
);
const {
  getBidActionAvailability,
  getBidBlockingReasons,
  isBothPaymentArrangement,
  supportsCoordinatorBid,
  getApplicationActionAvailability,
} = await loadHelper(
  "./marketplaceBidEligibility.helper.js",
);
const { getStateCode, getStateLabel } = await loadHelper("../utils/usStates.js");

assert.equal(getStateCode("South Carolina"), "SC");
assert.equal(getStateCode("sc"), "SC");
assert.equal(getStateLabel("SC"), "South Carolina");

const start = new Date(2026, 7, 9, 13, 0);
const end = new Date(2026, 7, 9, 17, 0);
assert.equal(formatShiftEditDate(start), "08/09/2026");
assert.equal(formatShiftEditTime(start), "1:00 PM");
assert.equal(formatShiftEditTime(start).includes("13:00"), false);
assert.equal(mergeShiftDatePart(start, new Date(2026, 7, 10)).getHours(), 13);
assert.equal(mergeShiftTimePart(start, end).getHours(), 17);
assert.equal(isValidShiftRange(start, end), true);
assert.equal(isValidShiftRange(end, start), false);
assert.equal(
  isValidShiftRange(start, new Date(2026, 7, 10, 1, 0)),
  true,
  "a following end date supports an intentional overnight shift",
);
assert.deepEqual(
  getBreakMinuteOptions(15).slice(0, 4).map((option) => option.value),
  ["0", "5", "10", "15"],
);
assert.deepEqual(
  getApplicationActionAvailability({
    eventId: "event-1",
    notesError: "",
    businessName: "Food Truck",
    foodTypeCuisine: "Soul Food",
    missingRequirementLabels: [],
  }),
  { canSaveDraft: true, canSubmit: true, reasons: [] },
  "a complete application enables Save Draft and Submit Application without phone/email",
);
assert.deepEqual(
  getApplicationActionAvailability({
    eventId: "event-1",
    notesError: "",
    businessName: "Food Truck",
    foodTypeCuisine: "",
    missingRequirementLabels: ["Insurance"],
  }).reasons,
  ["Enter the Food Type / Cuisine.", "Upload: Insurance."],
  "application blockers are visible and specific",
);

for (const scenario of [
  { guestCoverage: "REGULAR", fullBidAmount: "500", fullBidNumber: 500, fullyCateredEvent: false },
  { guestCoverage: "VIP", fullBidAmount: "500", fullBidNumber: 500, fullyCateredEvent: false },
  { guestCoverage: "BOTH", fullBidAmount: "", fullBidNumber: 500, fullyCateredEvent: false, vipCateringAmount: "500", vipCateringAmountNumber: 500 },
  { guestCoverage: "BOTH", fullBidAmount: "", fullBidNumber: 900, fullyCateredEvent: true, regularGuestAmount: "400", regularGuestAmountNumber: 400, vipCateringAmount: "500", vipCateringAmountNumber: 500 },
]) {
  const availability = getBidActionAvailability({
    eventId: "event-1",
    coordinatorBidSupported: true,
    notesError: "",
    guestCoverage: scenario.guestCoverage,
    fullyCateredEvent: scenario.fullyCateredEvent,
    fullBidAmount: scenario.fullBidAmount,
    fullBidNumber: scenario.fullBidNumber,
    regularGuestAmount: scenario.regularGuestAmount || "",
    regularGuestAmountNumber: scenario.regularGuestAmountNumber || 0,
    vipCateringAmount: scenario.vipCateringAmount || "",
    vipCateringAmountNumber: scenario.vipCateringAmountNumber || 0,
    pricePerGuest: "",
    pricePerGuestNumber: null,
    averagePricePerMeal: "",
    averagePricePerMealNumber: null,
    requirementsSatisfied: true,
  });
  assert.equal(availability.canSaveDraft, true, `${scenario.guestCoverage} permits Save Draft`);
  assert.equal(availability.canSubmit, true, `${scenario.guestCoverage} permits Submit Bid`);
}

const applicationScreenSource = await readFile(new URL("../screens/vendorMarketplaceApplicationScreen.js", import.meta.url), "utf8");
assert.doesNotMatch(applicationScreenSource, /label="Phone/);
assert.doesNotMatch(applicationScreenSource, /label="Email/);
assert.doesNotMatch(applicationScreenSource, /phone:\s*phone\.trim/);
assert.doesNotMatch(applicationScreenSource, /email:\s*email\.trim/);
assert.match(applicationScreenSource, /initialEvent\?\.event_id/);
assert.match(applicationScreenSource, /useMarketplaceAgreementCompletion/);
const bidScreenSource = await readFile(new URL("../screens/vendorMarketplaceBidResponseScreen.js", import.meta.url), "utf8");
assert.match(bidScreenSource, /initialEvent\?\.event_id/);
assert.match(bidScreenSource, /useMarketplaceAgreementCompletion/);
assert.match(bidScreenSource, /bidBlockingReasons/);

const [onboardingBankSource, editBankSource, employeeSessionSource] = await Promise.all([
  readFile(new URL("../screens/authFoodTruckBankDetailScreen.js", import.meta.url), "utf8"),
  readFile(new URL("../screens/editBankDetailScreen.js", import.meta.url), "utf8"),
  readFile(new URL("../screens/employeeSessionScreen.js", import.meta.url), "utf8"),
]);
assert.match(onboardingBankSource, /<StatePickerModal/);
assert.match(onboardingBankSource, /bankState: getStateCode\(bankState\)/);
assert.doesNotMatch(onboardingBankSource, /\["Bank State", bankState, setBankState/);
assert.match(editBankSource, /<StatePickerModal/);
assert.match(editBankSource, /setState\(getStateCode\(/);
assert.match(employeeSessionSource, /!canUseWalkUpPos/);
assert.match(employeeSessionSource, /WALK_UP_PLAN_MESSAGE/);
assert.deepEqual(
  getBidBlockingReasons({
    eventId: "event-1",
    coordinatorBidSupported: true,
    notesError: "",
    guestCoverage: "BOTH",
    fullyCateredEvent: false,
    vipCateringAmount: "",
    vipCateringAmountNumber: 0,
    missingRequirementLabels: ["Insurance"],
  }),
  ["Enter the VIP Catering Amount.", "Upload: Insurance."],
);
assert.equal(getBreakMinuteOptions(15).at(-1).value, "240");
assert.equal(getBreakMinuteOptions(245).at(-1).value, "245");
assert.equal(getBreakMinuteOptions(15).length, 49);

const values = {
  accountHolderName: "$truck",
  walletPaymentHandle: "$wallet-truck",
  bankName: "Saved Bank",
  accountNumber: "12345678",
  routingNumber: "123456789",
  accountType: "CHECKING",
  bankAddressLine1: "1 Main St",
  bankAddressLine2: "",
  bankCity: "Newark",
  bankState: "NJ",
  bankPostal: "07106",
  swiftCode: "BOFAUS3N",
  iban: "GB82WEST12345698765432",
  remittanceEmail: "pay@example.com",
  currency: "USD",
  paymentQrCodeUrl: "https://example.com/qr.png",
};

["CASHAPP", "PAYPAL", "VENMO"].forEach((method) => {
  assert.deepEqual(getPaymentMethodFields(method), {
    requiresBankDetails: false,
    requiresRemittanceDetails: true,
    requiresQrCode: true,
  });
  const payload = buildPaymentMethodPayload(method, values);
  assert.equal(payload.remittanceEmail, values.remittanceEmail);
  assert.equal(payload.currency, "USD");
  assert.equal(payload.paymentQrCodeUrl, values.paymentQrCodeUrl);
  assert.equal(payload.walletPaymentHandle, values.walletPaymentHandle);
  assert.equal("accountHolderName" in payload, false);
  assert.equal("routingNumber" in payload, false);
});

["ACH", "CHECK"].forEach((method) => {
  assert.deepEqual(getPaymentMethodFields(method), {
    requiresBankDetails: true,
    requiresRemittanceDetails: false,
    requiresQrCode: false,
  });
  const payload = buildPaymentMethodPayload(method, values);
  assert.equal(payload.routingNumber, values.routingNumber);
  assert.equal(payload.accountHolderName, values.accountHolderName);
  assert.equal(payload.swiftCode, values.swiftCode);
  assert.equal(payload.iban, values.iban);
  assert.equal("remittanceEmail" in payload, false);
  assert.equal("currency" in payload, false);
  assert.equal("paymentQrCodeUrl" in payload, false);
});

assert.equal(values.remittanceEmail, "pay@example.com");
assert.equal(values.bankName, "Saved Bank");
assert.equal(
  hydratePaymentMethodDetails({
    paymentMethod: "VENMO",
    accountHolderName: "@legacy-wallet",
  }).walletPaymentHandle,
  "@legacy-wallet",
);

assert.equal(
  isBothPaymentArrangement({ payment_responsibility: "BOTH" }),
  true,
);
assert.equal(
  supportsCoordinatorBid(
    {
      payment_responsibility: "BOTH",
      vendor_fee: 100,
      budgeted_amount: 500,
    },
    true,
  ),
  true,
  "BOTH permits the coordinator-paid bid even though the application path also exists",
);
assert.equal(supportsCoordinatorBid({ payment_responsibility: "VENDOR" }, true), false);
assert.deepEqual(
  getBidActionAvailability({
    eventId: "event-1",
    coordinatorBidSupported: true,
    notesError: "",
    guestCoverage: "BOTH",
    fullyCateredEvent: false,
    fullBidAmount: "",
    fullBidNumber: 500,
    regularGuestAmount: "",
    regularGuestAmountNumber: 0,
    vipCateringAmount: "500.00",
    vipCateringAmountNumber: 500,
    pricePerGuest: "",
    pricePerGuestNumber: null,
    averagePricePerMeal: "",
    averagePricePerMealNumber: null,
    requirementsSatisfied: true,
  }),
  { canSaveDraft: true, canSubmit: true },
  "a complete BOTH VIP bid enables Save Draft and Submit Bid",
);

console.log("vendor punch-list helper tests passed");
