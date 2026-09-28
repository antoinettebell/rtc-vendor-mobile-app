export const getMarketplaceSubmissionDisplayStatus = (record, status) => {
  if (record?.award_revoked_at) return "REVOKED";
  if (record?.award_amendment_status === "AWAITING_VENDOR") return "REVISED";
  return status;
};
