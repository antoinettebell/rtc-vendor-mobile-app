import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, AppState, Linking } from "react-native";
import {
  returnMarketplaceVendorAgreement_API,
  startMarketplaceVendorAgreementSigning_API,
} from "../api/appAPI";
import {
  createIdempotentAgreementFinalizer,
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
  const pendingAgreementRef = useRef(null);
  const idempotentFinalizerRef = useRef(null);
  const payloadRef = useRef(getSigningPayload);
  const finalizeRef = useRef(finalizeSubmission);
  const onTerminalRef = useRef(onTerminalStatus);
  const [recoveryLoaded, setRecoveryLoaded] = useState(!recoveryStorageKey);
  const [recoveryStopped, setRecoveryStopped] = useState(false);
  payloadRef.current = getSigningPayload;
  finalizeRef.current = finalizeSubmission;
  onTerminalRef.current = onTerminalStatus;

  useEffect(() => {
    let mounted = true;
    if (!recoveryStorageKey) {
      setRecoveryLoaded(true);
      return () => { mounted = false; };
    }
    setRecoveryLoaded(false);
    AsyncStorage.getItem(recoveryStorageKey)
      .then((value) => {
        if (mounted) setRecoveryStopped(value === "stopped");
      })
      .finally(() => {
        if (mounted) setRecoveryLoaded(true);
      });
    return () => { mounted = false; };
  }, [recoveryStorageKey]);

  const setTerminalRecoveryStopped = useCallback(async (stopped) => {
    setRecoveryStopped(stopped);
    if (recoveryStorageKey) {
      if (stopped) await AsyncStorage.setItem(recoveryStorageKey, "stopped");
      else await AsyncStorage.removeItem(recoveryStorageKey);
    }
  }, [recoveryStorageKey]);

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
        await finalizeOnce();
        return true;
      }
      const terminalStatus = ["CANCELLED", "DECLINED", "VOIDED", "ERROR"].includes(
        agreement?.status,
      );
      if (terminalStatus) {
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
    [finalizeOnce, setTerminalRecoveryStopped],
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
      const response = await startMarketplaceVendorAgreementSigning_API({
        ...payload,
        reconcile_only: true,
      });
      return handleAgreementResponse(response, { quiet });
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
        pendingAgreementRef.current = null;
        await handleAgreementResponse(response, { quiet: false });
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
    pendingAgreementRef.current =
      response?.data?.marketplaceVendorAgreement || null;
    if (!response?.data?.signing_url) {
      throw new Error(
        getAgreementStatusMessage(pendingAgreementRef.current?.status),
      );
    }
    await Linking.openURL(response.data.signing_url);
  }, [handleAgreementResponse, setTerminalRecoveryStopped]);

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
      linkSubscription.remove();
      appStateSubscription.remove();
    };
  }, [enabled, handleReturnUrl, reconcile, recoveryLoaded, recoveryStopped]);

  return { beginSigning, reconcile };
};
