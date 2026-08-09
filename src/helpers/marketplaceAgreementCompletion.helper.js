export const parseDocuSignReturnStatus = (url) => {
  const value = String(url || "").toLowerCase();
  if (value.includes("signing_complete") || value.includes("completed")) {
    return "completed";
  }
  if (value.includes("decline")) return "declined";
  if (value.includes("cancel")) return "cancelled";
  return "error";
};

export const getAgreementRecoveryAction = ({ url, agreementId }) => {
  if (!String(url || "").includes("docusign/return") || !agreementId) {
    return { type: "RECONCILE" };
  }
  return {
    type: "RETURN",
    agreementId,
    status: parseDocuSignReturnStatus(url),
  };
};

export const getAgreementStatusMessage = (status) => {
  if (status === "DECLINED") {
    return "The DocuSign envelope was declined. Your draft remains saved.";
  }
  if (status === "CANCELLED" || status === "VOIDED") {
    return "Signing was cancelled. Your draft remains saved.";
  }
  if (status === "ERROR") {
    return "DocuSign could not confirm the signature. Your draft remains saved.";
  }
  return "The agreements are not yet complete. Your draft remains saved.";
};

export const createIdempotentAgreementFinalizer = (finalize) => {
  let inFlight = null;
  let completed = false;
  return async () => {
    if (completed) return false;
    if (inFlight) return inFlight;
    inFlight = Promise.resolve()
      .then(finalize)
      .then(() => {
        completed = true;
        return true;
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };
};
