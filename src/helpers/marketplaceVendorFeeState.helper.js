const normalizeStatus = (value) => String(value || "").toUpperCase();

export const isMarketplaceVendorFeePaid = (application = {}) =>
  normalizeStatus(application.payment_status) === "PAID" ||
  ["PAID", "CONFIRMED"].includes(
    normalizeStatus(application.application_status),
  );

export const canPayMarketplaceVendorFee = (application = {}) =>
  ["ACCEPTED", "PAYMENT_DUE"].includes(
    normalizeStatus(application.application_status),
  ) && !isMarketplaceVendorFeePaid(application);
