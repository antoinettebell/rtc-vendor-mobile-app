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
} = await loadHelper(
  "./marketplaceBidEligibility.helper.js",
);

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
