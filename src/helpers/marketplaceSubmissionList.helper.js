export const matchesMarketplaceSubmissionStatus = (
  submissionStatus,
  selectedStatus,
) =>
  selectedStatus === "ALL" ||
  String(submissionStatus || "").toUpperCase() === selectedStatus;
