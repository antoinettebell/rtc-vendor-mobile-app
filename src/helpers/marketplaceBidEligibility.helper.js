export const isBothPaymentArrangement = (event = {}) =>
  String(event.payment_responsibility || "").toUpperCase() === "BOTH" ||
  (Number(event.vendor_fee || 0) > 0 &&
    Number(event.budgeted_amount || 0) > 0);

export const supportsCoordinatorBid = (event, vendorPaysToAttend) =>
  !!event &&
  (isBothPaymentArrangement(event) || !vendorPaysToAttend);

export const getApplicationActionAvailability = ({
  eventId,
  notesError,
  businessName,
  foodTypeCuisine,
  missingRequirementLabels = [],
}) => {
  const canSaveDraft = !!eventId && !notesError;
  const reasons = [];
  if (!eventId) reasons.push("Event details are unavailable.");
  if (notesError) reasons.push(notesError);
  if (!String(businessName || "").trim()) reasons.push("Enter the Business Name.");
  if (!String(foodTypeCuisine || "").trim()) reasons.push("Enter the Food Type / Cuisine.");
  missingRequirementLabels.forEach((label) => reasons.push(`Upload: ${label}.`));
  return {
    canSaveDraft,
    canSubmit: canSaveDraft && reasons.length === 0,
    reasons,
  };
};

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
  specialtyServices = [],
  specialtyOnly = false,
  dessertBidAmountNumber,
  dessertPricePerGuestNumber,
  drinksBidAmountNumber,
  drinksPricePerGuestNumber,
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
  const bidFieldsComplete = specialtyOnly && specialtyServices.length === 2
    ? true
    :
    String(pricePerGuest || "").trim() &&
    !Number.isNaN(pricePerGuestNumber) &&
    pricePerGuestNumber > 0 &&
    (guestCoverage === "BOTH"
      ? (!fullyCateredEvent ||
          (String(regularGuestAmount).trim() && regularGuestAmountNumber > 0)) &&
        String(vipCateringAmount).trim() &&
        vipCateringAmountNumber > 0
      : String(fullBidAmount).trim() &&
        !Number.isNaN(fullBidNumber) &&
        fullBidNumber > 0);

  const multipleServices = specialtyServices.length + (specialtyOnly ? 0 : 1) > 1;
  const specialtyPricingComplete =
    (!multipleServices || !specialtyServices.includes("DESSERTS") || (dessertBidAmountNumber > 0 && dessertPricePerGuestNumber > 0)) &&
    (!multipleServices || !specialtyServices.includes("DRINKS") || (drinksBidAmountNumber > 0 && drinksPricePerGuestNumber > 0));
  return {
    canSaveDraft,
    canSubmit: !!(canSaveDraft && bidFieldsComplete && specialtyPricingComplete && requirementsSatisfied),
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
  pricePerGuest,
  pricePerGuestNumber,
  missingRequirementLabels = [],
  specialtyServices = [],
  specialtyOnly = false,
  dessertBidAmountNumber,
  dessertPricePerGuestNumber,
  drinksBidAmountNumber,
  drinksPricePerGuestNumber,
}) => {
  const reasons = [];
  if (!eventId) reasons.push("Event details are unavailable.");
  if (!coordinatorBidSupported) {
    reasons.push("This event accepts the vendor-paid application workflow only.");
  }
  if (notesError) reasons.push(notesError);
  if (!(specialtyOnly && specialtyServices.length === 2) && (
    !String(pricePerGuest || "").trim() ||
    Number.isNaN(pricePerGuestNumber) ||
    pricePerGuestNumber <= 0
  )) {
    reasons.push("Enter the Price Per Guest.");
  }
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
  } else if (!(specialtyOnly && specialtyServices.length === 2) && (
    !String(fullBidAmount || "").trim() ||
    Number.isNaN(fullBidNumber) ||
    fullBidNumber <= 0
  )) {
    reasons.push("Enter the Bid Amount.");
  }
  const multipleServices = specialtyServices.length + (specialtyOnly ? 0 : 1) > 1;
  if (multipleServices && specialtyServices.includes("DESSERTS") && !(dessertBidAmountNumber > 0 && dessertPricePerGuestNumber > 0)) {
    reasons.push("Enter Desserts Bid Amount and Price Per Guest.");
  }
  if (multipleServices && specialtyServices.includes("DRINKS") && !(drinksBidAmountNumber > 0 && drinksPricePerGuestNumber > 0)) {
    reasons.push("Enter Drinks Bid Amount and Price Per Guest.");
  }
  if (missingRequirementLabels.length) {
    reasons.push(`Upload: ${missingRequirementLabels.join(", ")}.`);
  }
  return reasons;
};
