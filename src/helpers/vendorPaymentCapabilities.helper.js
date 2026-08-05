const getPlan = (user = {}, foodTruck = null) =>
  foodTruck?.plan ||
  foodTruck?.planId ||
  user?.foodTruck?.plan ||
  user?.foodTruck?.planId ||
  {};

export const getVendorPaymentCapabilities = (user = {}, foodTruck = null) => {
  const plan = getPlan(user, foodTruck);
  const capabilities = plan?.capabilities || {};
  const planText = `${plan?.slug || ""} ${plan?.name || ""} ${plan?.title || ""}`;
  const isElite = /elite/i.test(planText) || Number(plan?.rate) === 5.5;
  const methods = Array.isArray(capabilities.walkUpPosPaymentMethods)
    ? capabilities.walkUpPosPaymentMethods
    : isElite
      ? ["CASH", "TAP_TO_PAY"]
      : [];

  return {
    cash: methods.includes("CASH"),
    tapToPay: capabilities.tapToPay === true || methods.includes("TAP_TO_PAY") || isElite,
  };
};
