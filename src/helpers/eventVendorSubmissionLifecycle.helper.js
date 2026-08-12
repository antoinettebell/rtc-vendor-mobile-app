export const EDITABLE_EVENT_VENDOR_STATUSES = ["SUBMITTED", "UNDER_REVIEW"];
export const AWARDED_EVENT_VENDOR_STATUSES = ["AWARDED", "PAYMENT_DUE", "PAID"];

export const resolveEventVendorParticipationPath = () => "APPLICATION";

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
    bids: [],
    applications: active,
    awarded,
  };
};
