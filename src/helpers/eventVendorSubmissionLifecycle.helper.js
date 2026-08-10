export const EDITABLE_EVENT_VENDOR_STATUSES = ["SUBMITTED", "UNDER_REVIEW"];
export const AWARDED_EVENT_VENDOR_STATUSES = ["AWARDED", "PAYMENT_DUE", "PAID"];

export const resolveEventVendorParticipationPath = (application = {}, event = {}) => {
  if (["BID", "APPLICATION"].includes(application.participation_path)) return application.participation_path;
  const responsibility = String(event.payment_responsibility || event.who_pays || "NONE").toUpperCase();
  if (responsibility === "COORDINATOR") return "BID";
  if (responsibility === "VENDOR" || responsibility === "NONE") return "APPLICATION";
  // Before participation_path existed, Event Vendor records were applications.
  // Zero-dollar vendor fees therefore cannot safely imply a bid.
  return "APPLICATION";
};

export const canEditEventVendorSubmission = (application, event) =>
  EDITABLE_EVENT_VENDOR_STATUSES.includes(String(application?.status || "").toUpperCase())
  && ["OPEN", "REOPENED"].includes(String(event?.status || "").toUpperCase());

export const canWithdrawEventVendorSubmission = (application, event) =>
  canEditEventVendorSubmission(application, event);

export const splitEventVendorApplications = (applications = []) => {
  const awarded = applications.filter((item) =>
    AWARDED_EVENT_VENDOR_STATUSES.includes(String(item?.status || "").toUpperCase()));
  const active = applications.filter((item) =>
    !AWARDED_EVENT_VENDOR_STATUSES.includes(String(item?.status || "").toUpperCase()));
  return {
    bids: active.filter((item) => resolveEventVendorParticipationPath(item, item.event || {}) === "BID"),
    applications: active.filter((item) => resolveEventVendorParticipationPath(item, item.event || {}) === "APPLICATION"),
    awarded,
  };
};
