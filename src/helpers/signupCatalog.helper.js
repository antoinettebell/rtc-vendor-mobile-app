export const isFoodVendorPlan = (plan) =>
  ["SUB_BASIC", "SUB_PLATINUM", "SUB_ELITE"].includes(
    String(plan?.slug || "").toUpperCase(),
  );

// Marketplace-only signup has no food-truck add-ons. Food-vendor signup keeps
// the existing catalog, including Bluetooth Order/Receipt Printing.
export const shouldShowPlanAddOns = ({ isSignupFlow, selectedPlan } = {}) =>
  !isSignupFlow || isFoodVendorPlan(selectedPlan);

export const getPlanAddOnsForFlow = ({
  isSignupFlow,
  selectedPlan,
  addOns = [],
} = {}) =>
  shouldShowPlanAddOns({ isSignupFlow, selectedPlan }) ? addOns : [];

// A Marketplace Vendor does not have food-truck add-ons. Reconcile selection
// state as soon as a plan changes so hidden IDs can never reach signup.
export const reconcileSelectedAddOnsForPlan = ({
  selectedPlan,
  selectedAddOns = [],
} = {}) => (isFoodVendorPlan(selectedPlan) ? selectedAddOns : []);
