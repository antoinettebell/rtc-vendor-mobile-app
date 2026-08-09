const WALLET_METHODS = ["CASHAPP", "PAYPAL", "VENMO"];
const BANK_METHODS = ["ACH", "CHECK"];

export const getPaymentMethodFields = (paymentMethod) => ({
  requiresBankDetails: BANK_METHODS.includes(paymentMethod),
  requiresRemittanceDetails: WALLET_METHODS.includes(paymentMethod),
  requiresQrCode: WALLET_METHODS.includes(paymentMethod),
});

export const buildPaymentMethodPayload = (paymentMethod, values) => {
  const { requiresBankDetails, requiresRemittanceDetails } =
    getPaymentMethodFields(paymentMethod);
  return {
    paymentMethod,
    ...(requiresBankDetails
      ? {
          accountHolderName: values.accountHolderName,
          bankName: values.bankName,
          accountNumber: values.accountNumber,
          routingNumber: values.routingNumber,
          accountType: values.accountType,
          bankAddressLine1: values.bankAddressLine1,
          bankAddressLine2: values.bankAddressLine2,
          bankCity: values.bankCity,
          bankState: values.bankState,
          bankPostal: values.bankPostal,
          ...(values.swiftCode !== undefined
            ? { swiftCode: values.swiftCode }
            : {}),
          ...(values.iban !== undefined ? { iban: values.iban } : {}),
        }
      : {}),
    ...(requiresRemittanceDetails
      ? {
          walletPaymentHandle: values.walletPaymentHandle,
          remittanceEmail: values.remittanceEmail,
          currency: values.currency,
          paymentQrCodeUrl: values.paymentQrCodeUrl,
        }
      : {}),
  };
};

export const hydratePaymentMethodDetails = (data = {}) => ({
  ...data,
  walletPaymentHandle:
    data.walletPaymentHandle ||
    (WALLET_METHODS.includes(data.paymentMethod)
      ? data.accountHolderName || ""
      : ""),
});
