import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, AppState, Linking } from "react-native";
import { useSelector } from "react-redux";
import {
  returnMarketplaceVendorAgreement_API,
  startMarketplaceVendorAgreementSigning_API,
} from "../api/appAPI";
import {
  createIdempotentAgreementFinalizer,
  buildAgreementRecoveryRecord,
  parseAgreementRecoveryRecord,
  getAgreementRetryDelay,
  getAgreementRecoveryAction,
  getAgreementStatusMessage,
} from "../helpers/marketplaceAgreementCompletion.helper";

export const useMarketplaceAgreementCompletion = ({
  enabled = true,
  getSigningPayload,
  finalizeSubmission,
  submissionLabel,
  recoveryStorageKey,
  onTerminalStatus,
}) => {
  const recoveryAccountId = useSelector(
    (state) => state.userReducer?.user?._id || state.userReducer?.user?.id || null,
  );
  const scopedRecoveryStorageKey =
    recoveryStorageKey && recoveryAccountId
      ? `${recoveryStorageKey}:vendor:${recoveryAccountId}`
      : null;
  const pendingAgreementRef = useRef(null);
  const idempotentFinalizerRef = useRef(null);
  const payloadRef = useRef(getSigningPayload);
  const finalizeRef = useRef(finalizeSubmission);
  const onTerminalRef = useRef(onTerminalStatus);
  const [recoveryLoaded, setRecoveryLoaded] = useState(!scopedRecoveryStorageKey);
  const [recoveryStopped, setRecoveryStopped] = useState(false);
  const [confirmingAgreement, setConfirmingAgreement] = useState(false);
  const retryAttemptRef = useRef(0);
  const retryTimerRef = useRef(null);
  payloadRef.current = getSigningPayload;
  finalizeRef.current = finalizeSubmission;
  onTerminalRef.current = onTerminalStatus;

  useEffect(() => {
    let mounted = true;
    if (!scopedRecoveryStorageKey) {
      setRecoveryLoaded(true);
      return () => { mounted = false; };
    }
    setRecoveryLoaded(false);
    AsyncStorage.getItem(scopedRecoveryStorageKey)
      .then((value) => {
        const recovery = parseAgreementRecoveryRecord(value);
        if (mounted) {
          setRecoveryStopped(recovery?.signing_state === "STOPPED");
          if (recovery?.agreement_id) pendingAgreementRef.current = recovery;
        }
      })
      .finally(() => {
        if (mounted) setRecoveryLoaded(true);
      });
    return () => {
      mounted = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [scopedRecoveryStorageKey]);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const persistPendingAgreement = useCallback(async (agreement, payload, state = "PENDING") => {
    pendingAgreementRef.current = agreement;
    if (scopedRecoveryStorageKey) {
      await AsyncStorage.setItem(
        scopedRecoveryStorageKey,
        JSON.stringify(buildAgreementRecoveryRecord({ agreement, payload, state })),
      );
    }
  }, [scopedRecoveryStorageKey]);

  const setTerminalRecoveryStopped = useCallback(async (stopped) => {
    setRecoveryStopped(stopped);
    if (scopedRecoveryStorageKey) {
      if (stopped) await AsyncStorage.setItem(scopedRecoveryStorageKey, "stopped");
      else await AsyncStorage.removeItem(scopedRecoveryStorageKey);
    }
  }, [scopedRecoveryStorageKey]);

  if (!idempotentFinalizerRef.current) {
    idempotentFinalizerRef.current = createIdempotentAgreementFinalizer(() =>
      finalizeRef.current(),
    );
  }
  const finalizeOnce = idempotentFinalizerRef.current;

  const handleAgreementResponse = useCallback(
    async (response, { quiet = false } = {}) => {
      const agreement = response?.data?.marketplaceVendorAgreement;
      if (response?.data?.already_signed || agreement?.status === "SIGNED") {
        pendingAgreementRef.current = null;
        await setTerminalRecoveryStopped(false);
        clearRetryTimer();
        if (scopedRecoveryStorageKey) await AsyncStorage.removeItem(scopedRecoveryStorageKey);
        setConfirmingAgreement(false);
        retryAttemptRef.current = 0;
        await finalizeOnce();
        return true;
      }
      const terminalStatus = ["CANCELLED", "DECLINED", "VOIDED", "ERROR"].includes(
        agreement?.status,
      );
      if (terminalStatus) {
        clearRetryTimer();
        pendingAgreementRef.current = null;
        await setTerminalRecoveryStopped(true);
        await onTerminalRef.current?.(agreement.status);
      }
      if (
        (!quiet || terminalStatus) &&
        (agreement?.status || response?.data?.signing_incomplete)
      ) {
        Alert.alert(
          "Signature Required",
          getAgreementStatusMessage(agreement?.status),
        );
      }
      return false;
    },
    [clearRetryTimer, finalizeOnce, scopedRecoveryStorageKey, setTerminalRecoveryStopped],
  );

  const reconcile = useCallback(
    async ({ quiet = true } = {}) => {
      const payload = payloadRef.current?.();
      if (
        !enabled ||
        !recoveryLoaded ||
        recoveryStopped ||
        !payload?.event_id
      ) return false;
      try {
        setConfirmingAgreement(true);
        const agreementId = pendingAgreementRef.current?.agreement_id;
        const response = agreementId
          ? await returnMarketplaceVendorAgreement_API({
              agreement_id: agreementId,
              status: "completed",
            })
          : await startMarketplaceVendorAgreementSigning_API({
              ...payload,
              reconcile_only: true,
            });
        const complete = await handleAgreementResponse(response, { quiet: true });
        if (complete) return true;
        const delay = getAgreementRetryDelay(retryAttemptRef.current);
        if (delay !== null) {
          retryAttemptRef.current += 1;
          retryTimerRef.current = setTimeout(() => {
            reconcile({ quiet: true }).catch(() => {});
          }, delay);
        } else {
          setConfirmingAgreement(false);
        }
        return false;
      } catch (error) {
        const delay = getAgreementRetryDelay(retryAttemptRef.current);
        if (delay !== null) {
          retryAttemptRef.current += 1;
          retryTimerRef.current = setTimeout(() => {
            reconcile({ quiet: true }).catch(() => {});
          }, delay);
          return false;
        }
        setConfirmingAgreement(false);
        if (!quiet) {
          Alert.alert(
            "Unable to Confirm Agreements",
            "Your signed agreements are still saved. Please try again when your connection is available.",
          );
        }
        return false;
      }
    },
    [enabled, handleAgreementResponse, recoveryLoaded, recoveryStopped],
  );

  const handleReturnUrl = useCallback(
    async (url) => {
      if (!String(url || "").includes("docusign/return")) return;
      try {
        const agreementId = pendingAgreementRef.current?.agreement_id;
        const action = getAgreementRecoveryAction({ url, agreementId });
        if (action.type === "RECONCILE") {
          await reconcile({ quiet: false });
          return;
        }
        const response = await returnMarketplaceVendorAgreement_API({
          agreement_id: action.agreementId,
          status: action.status,
        });
        const complete = await handleAgreementResponse(response, { quiet: true });
        if (!complete) await reconcile({ quiet: true });
      } catch (error) {
        Alert.alert(
          `${submissionLabel} Not Submitted`,
          error?.message || "Unable to confirm DocuSign completion.",
        );
      }
    },
    [handleAgreementResponse, reconcile, submissionLabel],
  );

  const beginSigning = useCallback(async () => {
    await setTerminalRecoveryStopped(false);
    const payload = payloadRef.current?.();
    const response = await startMarketplaceVendorAgreementSigning_API(payload);
    if (await handleAgreementResponse(response)) return;
    await persistPendingAgreement(
      response?.data?.marketplaceVendorAgreement || null,
      payload,
    );
    if (!response?.data?.signing_url) {
      throw new Error(
        getAgreementStatusMessage(pendingAgreementRef.current?.status),
      );
    }
    await Linking.openURL(response.data.signing_url);
  }, [handleAgreementResponse, persistPendingAgreement, setTerminalRecoveryStopped]);

  useEffect(() => {
    if (!enabled || !recoveryLoaded || recoveryStopped) return undefined;
    const linkSubscription = Linking.addEventListener("url", ({ url }) => {
      handleReturnUrl(url);
    });
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") reconcile({ quiet: true }).catch(() => {});
    });
    Linking.getInitialURL().then((url) => {
      if (url) handleReturnUrl(url);
      else reconcile({ quiet: true }).catch(() => {});
    });
    return () => {
      clearRetryTimer();
      linkSubscription.remove();
      appStateSubscription.remove();
    };
  }, [clearRetryTimer, enabled, handleReturnUrl, reconcile, recoveryLoaded, recoveryStopped]);

  return { beginSigning, reconcile, confirmingAgreement };
};
