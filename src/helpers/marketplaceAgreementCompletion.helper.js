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

export const buildAgreementRecoveryRecord = ({ agreement, payload, state = "PENDING" }) => ({
  agreement_id: agreement?.agreement_id || null,
  envelope_id: agreement?.envelope_id || null,
  event_id: payload?.event_id || agreement?.event_id || null,
  event_vendor_profile_id: agreement?.event_vendor_profile_id || null,
  application_id: payload?.application_id || agreement?.application_id || null,
  application_draft_id: payload?.application_draft_id || agreement?.application_draft_id || null,
  signing_state: state,
  saved_at: new Date().toISOString(),
});

export const parseAgreementRecoveryRecord = (value) => {
  if (!value || value === "stopped") return value === "stopped" ? { signing_state: "STOPPED" } : null;
  try {
    const parsed = JSON.parse(value);
    return parsed?.event_id ? parsed : null;
  } catch {
    return null;
  }
};

export const getAgreementRetryDelay = (attempt, maximumAttempts = 4) =>
  attempt >= maximumAttempts ? null : Math.min(8000, 1000 * (2 ** attempt));

export const getFoodVendorMarketplaceCompletionReset = () => ({
  index: 1,
  routes: [
    { name: "vendorMarketplaceScreen" },
    { name: "vendorMarketplaceNearMeScreen" },
  ],
});
