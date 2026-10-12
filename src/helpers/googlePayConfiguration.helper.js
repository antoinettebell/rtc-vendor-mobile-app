const text = (value) => (typeof value === "string" ? value.trim() : "");

export const assertGooglePayConfiguration = (config) => {
  const environment = text(config?.GOOGLE_PAY_ENVIRONMENT).toUpperCase();
  const gateway = text(config?.GOOGLE_PAY_GATEWAY).toLowerCase();
  const googlePayMerchantId = text(config?.GOOGLE_PAY_MERCHANT_ID);
  const cyberSourceMerchantId = text(config?.CYBERSOURCE_MERCHANT_ID);
  const allowLiveDebug = text(config?.GOOGLE_PAY_ALLOW_LIVE_DEBUG).toLowerCase() === "true";

  if (!["TEST", "PRODUCTION"].includes(environment)) {
    throw new Error("Google Pay configuration is missing GOOGLE_PAY_ENVIRONMENT (TEST or PRODUCTION).");
  }
  if (__DEV__ && environment === "PRODUCTION" && !allowLiveDebug) {
    throw new Error(
      "Google Pay debug builds using PRODUCTION require GOOGLE_PAY_ALLOW_LIVE_DEBUG=true.",
    );
  }
  if (gateway !== "cybersource") {
    throw new Error("Google Pay configuration must set GOOGLE_PAY_GATEWAY to cybersource.");
  }
  if (!googlePayMerchantId) {
    throw new Error(`Google Pay ${environment} configuration is missing GOOGLE_PAY_MERCHANT_ID.`);
  }
  if (!cyberSourceMerchantId) {
    throw new Error(`Google Pay ${environment} configuration is missing CYBERSOURCE_MERCHANT_ID.`);
  }
};
