const getPlan = (user = {}, foodTruck = null) =>
  foodTruck?.plan ||
  foodTruck?.planId ||
  user?.foodTruck?.plan ||
  user?.foodTruck?.planId ||
  {};

export const getVendorPaymentCapabilities = (user = {}, foodTruck = null) => {
  const plan = getPlan(user, foodTruck);
  const capabilities = plan?.capabilities || {};
  const methods = Array.isArray(capabilities.walkUpPosPaymentMethods)
    ? capabilities.walkUpPosPaymentMethods
    : [];
  const walkUpPos = capabilities.walkUpPos === true
    || capabilities.employeeWalkUpPos === true;

  return {
    walkUpPos,
    cash: walkUpPos && methods.includes("CASH"),
    tapToPay: walkUpPos && (capabilities.tapToPay === true || methods.includes("TAP_TO_PAY")),
  };
};

export const WALK_UP_PLAN_MESSAGE =
  "Walk-up ordering is not included in your current plan. Upgrade your plan to use this feature.";

export const getWalkUpPosAccess = (user = {}, foodTruck = null) => {
  if (user?.userType === "EMPLOYEE" || user?.role === "EMPLOYEE") {
    const capabilities = user?.employeeCapabilities || {};
    return {
      allowed: capabilities.employeeWalkUpPos === true,
      cash: (capabilities.walkUpPosPaymentMethods || []).includes("CASH"),
      tapToPay: capabilities.tapToPay === true,
    };
  }
  const capabilities = getVendorPaymentCapabilities(user, foodTruck);
  return { allowed: capabilities.walkUpPos, ...capabilities };
};
