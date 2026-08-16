export const getMarketplaceSubmissionDisplayStatus = (record, status) =>
  record?.award_revoked_at ? "REVOKED" : status;
