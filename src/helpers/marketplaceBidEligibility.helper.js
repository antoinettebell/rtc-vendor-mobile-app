export const isBothPaymentArrangement = (event = {}) =>
  String(event.payment_responsibility || "").toUpperCase() === "BOTH" ||
  (Number(event.vendor_fee || 0) > 0 &&
    Number(event.budgeted_amount || 0) > 0);

export const supportsCoordinatorBid = (event, vendorPaysToAttend) =>
  !!event &&
  (isBothPaymentArrangement(event) || !vendorPaysToAttend);

export const getBidActionAvailability = ({
  eventId,
  coordinatorBidSupported,
  notesError,
  guestCoverage,
  fullyCateredEvent,
  fullBidAmount,
  fullBidNumber,
  regularGuestAmount,
  regularGuestAmountNumber,
  vipCateringAmount,
  vipCateringAmountNumber,
  pricePerGuest,
  pricePerGuestNumber,
  averagePricePerMeal,
  averagePricePerMealNumber,
  requirementsSatisfied,
}) => {
  const canSaveDraft =
    !!eventId &&
    coordinatorBidSupported &&
    !notesError &&
    (!String(fullBidAmount || "").trim() ||
      (!Number.isNaN(fullBidNumber) && fullBidNumber >= 0)) &&
    (guestCoverage !== "BOTH" ||
      ((!String(regularGuestAmount || "").trim() ||
        regularGuestAmountNumber >= 0) &&
        (!String(vipCateringAmount || "").trim() ||
          vipCateringAmountNumber >= 0))) &&
    (!pricePerGuest ||
      (!Number.isNaN(pricePerGuestNumber) && pricePerGuestNumber >= 0)) &&
    (!averagePricePerMeal ||
      (!Number.isNaN(averagePricePerMealNumber) &&
        averagePricePerMealNumber >= 0));
  const bidFieldsComplete =
    guestCoverage === "BOTH"
      ? (!fullyCateredEvent ||
          (String(regularGuestAmount).trim() && regularGuestAmountNumber > 0)) &&
        String(vipCateringAmount).trim() &&
        vipCateringAmountNumber > 0
      : String(fullBidAmount).trim() &&
        !Number.isNaN(fullBidNumber) &&
        fullBidNumber > 0;

  return {
    canSaveDraft,
    canSubmit: !!(canSaveDraft && bidFieldsComplete && requirementsSatisfied),
  };
};

export const getBidBlockingReasons = ({
  eventId,
  coordinatorBidSupported,
  notesError,
  guestCoverage,
  fullyCateredEvent,
  fullBidAmount,
  fullBidNumber,
  regularGuestAmount,
  regularGuestAmountNumber,
  vipCateringAmount,
  vipCateringAmountNumber,
  missingRequirementLabels = [],
}) => {
  const reasons = [];
  if (!eventId) reasons.push("Event details are unavailable.");
  if (!coordinatorBidSupported) {
    reasons.push("This event accepts the vendor-paid application workflow only.");
  }
  if (notesError) reasons.push(notesError);
  if (guestCoverage === "BOTH") {
    if (
      fullyCateredEvent &&
      (!String(regularGuestAmount || "").trim() || regularGuestAmountNumber <= 0)
    ) {
      reasons.push("Enter the Regular Guests Amount.");
    }
    if (
      !String(vipCateringAmount || "").trim() ||
      vipCateringAmountNumber <= 0
    ) {
      reasons.push("Enter the VIP Catering Amount.");
    }
  } else if (
    !String(fullBidAmount || "").trim() ||
    Number.isNaN(fullBidNumber) ||
    fullBidNumber <= 0
  ) {
    reasons.push("Enter the Bid Amount.");
  }
  if (missingRequirementLabels.length) {
    reasons.push(`Upload: ${missingRequirementLabels.join(", ")}.`);
  }
  return reasons;
};
