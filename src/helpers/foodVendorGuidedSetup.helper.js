const EMPLOYEE_TIERS = new Set(["SUB_PLATINUM", "SUB_ELITE"]);

export const isEmployeeSetupEligible = (plan) =>
  EMPLOYEE_TIERS.has(String(plan?.slug || "").toUpperCase());

export const isTapToPaySetupEligible = (plan) => {
  const capabilities = plan?.capabilities || {};
  const methods = Array.isArray(capabilities.walkUpPosPaymentMethods)
    ? capabilities.walkUpPosPaymentMethods
    : [];
  const walkUpPos = capabilities.walkUpPos === true
    || capabilities.employeeWalkUpPos === true;
  return walkUpPos
    && (capabilities.tapToPay === true || methods.includes("TAP_TO_PAY"));
};

export const getEffectiveFoodVendorPlan = ({ user, selectedPlan } = {}) => {
  const backendPlan = user?.foodTruck?.plan || user?.foodTruck?.planId;
  const hasTierIdentity = backendPlan && typeof backendPlan === "object" &&
    (backendPlan.slug || backendPlan.name || backendPlan.rate !== undefined);
  return hasTierIdentity ? backendPlan : selectedPlan || backendPlan || null;
};

export const getFoodVendorGuidedSteps = (
  plan,
  { includeTapToPay = false } = {},
) => [
  "PROFILE",
  ...(isTapToPaySetupEligible(plan)
    ? ["COMPLIANCE", ...(includeTapToPay ? ["TAP_TO_PAY"] : [])]
    : []),
  "PAYMENT",
  ...(isEmployeeSetupEligible(plan) ? ["EMPLOYEES"] : []),
  "MENU",
];

export const getNextFoodVendorGuidedStep = (
  plan,
  currentStep,
  options,
) => {
  const steps = getFoodVendorGuidedSteps(plan, options);
  const index = steps.indexOf(currentStep);
  return index >= 0 ? steps[index + 1] || null : steps[0];
};

export const getPreviousFoodVendorGuidedStep = (
  plan,
  currentStep,
  options,
) => {
  const steps = getFoodVendorGuidedSteps(plan, options);
  const index = steps.indexOf(currentStep);
  return index > 0 ? steps[index - 1] : null;
};

export const getResumableFoodVendorGuidedStep = (
  plan,
  checkpoint,
  { includeTapToPay = false } = {},
) => {
  const steps = getFoodVendorGuidedSteps(plan, { includeTapToPay });
  if (checkpoint === "EMPLOYEES" && !isEmployeeSetupEligible(plan)) return "MENU";
  return steps.includes(checkpoint) ? checkpoint : steps[0] || null;
};
