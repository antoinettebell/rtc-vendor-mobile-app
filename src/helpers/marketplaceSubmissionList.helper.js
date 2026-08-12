export const matchesMarketplaceSubmissionStatus = (
  submissionStatus,
  selectedStatus,
) => {
  const normalizedStatus = String(submissionStatus || "").toUpperCase();
  return selectedStatus === "ALL" ||
    normalizedStatus === selectedStatus ||
    (selectedStatus === "NOT_AWARDED" && normalizedStatus === "DECLINED");
};
