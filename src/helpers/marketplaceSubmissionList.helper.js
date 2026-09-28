export const matchesMarketplaceSubmissionStatus = (
  submissionStatus,
  selectedStatus,
) => {
  const normalizedStatus = String(submissionStatus || "").toUpperCase();
  return selectedStatus === "ALL" ||
    normalizedStatus === selectedStatus ||
    (selectedStatus === "DRAFT" && normalizedStatus === "PENDING_SIGNATURE") ||
    (selectedStatus === "NOT_AWARDED" && normalizedStatus === "DECLINED");
};
