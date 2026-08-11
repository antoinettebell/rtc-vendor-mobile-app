const EMPLOYEE_TIERS = new Set(["SUB_PLATINUM", "SUB_ELITE"]);

export const isEmployeeSetupEligible = (plan) =>
  EMPLOYEE_TIERS.has(String(plan?.slug || "").toUpperCase());

export const getEffectiveFoodVendorPlan = ({ user, selectedPlan } = {}) => {
  const backendPlan = user?.foodTruck?.plan || user?.foodTruck?.planId;
  const hasTierIdentity = backendPlan && typeof backendPlan === "object" &&
    (backendPlan.slug || backendPlan.name || backendPlan.rate !== undefined);
  return hasTierIdentity ? backendPlan : selectedPlan || backendPlan || null;
};

export const getFoodVendorGuidedSteps = (plan) => [
  "COMPLIANCE",
  "PAYMENT",
  ...(isEmployeeSetupEligible(plan) ? ["EMPLOYEES"] : []),
  "MENU",
];

export const getNextFoodVendorGuidedStep = (plan, currentStep) => {
  const steps = getFoodVendorGuidedSteps(plan);
  const index = steps.indexOf(currentStep);
  return index >= 0 ? steps[index + 1] || null : steps[0];
};

export const getResumableFoodVendorGuidedStep = (plan, checkpoint) => {
  const steps = getFoodVendorGuidedSteps(plan);
  if (checkpoint === "EMPLOYEES" && !isEmployeeSetupEligible(plan)) return "MENU";
  return steps.includes(checkpoint) ? checkpoint : "COMPLIANCE";
};
