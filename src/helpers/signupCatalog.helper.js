export const isFoodVendorPlan = (plan) =>
  ["SUB_BASIC", "SUB_PLATINUM", "SUB_ELITE"].includes(
    String(plan?.slug || "").toUpperCase(),
  );

// The vendor app owns Food Vendor signup plus one full Marketplace Vendor
// experience.  Other plans in the shared catalog (for example coordinator or
// Tap-to-Pay-only plans) must never become vendor-signup choices.
export const isVendorSignupPlan = (plan) =>
  isFoodVendorPlan(plan) ||
  String(plan?.slug || "").toUpperCase() === "SUB_MARKETPLACE_VENDOR";

export const isAdSpaceAddOn = (addOn) =>
  /\bad\s*(space|vendor)\b/i.test(
    `${addOn?.slug || ""} ${addOn?.name || ""} ${addOn?.title || ""}`,
  );

// Marketplace-only signup has no food-truck add-ons. Food-vendor signup keeps
// the existing catalog, including Bluetooth Order/Receipt Printing.
export const shouldShowPlanAddOns = ({ isSignupFlow, selectedPlan } = {}) =>
  !isSignupFlow || isFoodVendorPlan(selectedPlan);

export const getPlanAddOnsForFlow = ({
  isSignupFlow,
  selectedPlan,
  addOns = [],
} = {}) => {
  if (!shouldShowPlanAddOns({ isSignupFlow, selectedPlan })) return [];
  return isSignupFlow ? addOns.filter((addOn) => !isAdSpaceAddOn(addOn)) : addOns;
};

// A Marketplace Vendor does not have food-truck add-ons. Reconcile selection
// state as soon as a plan changes so hidden IDs can never reach signup.
export const reconcileSelectedAddOnsForPlan = ({
  selectedPlan,
  selectedAddOns = [],
  addOns = [],
  isSignupFlow = false,
} = {}) => {
  if (!isFoodVendorPlan(selectedPlan)) return [];
  if (!isSignupFlow) return selectedAddOns;
  const visibleIds = new Set(
    getPlanAddOnsForFlow({ isSignupFlow, selectedPlan, addOns }).map((addOn) =>
      String(addOn?._id || addOn?.id || addOn),
    ),
  );
  return selectedAddOns.filter((id) => visibleIds.has(String(id)));
};
