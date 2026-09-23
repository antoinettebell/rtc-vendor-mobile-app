export const formatEIN = (text) => {
  // Remove all non-digit characters
  const cleaned = text.replace(/\D/g, "");

  // Apply formatting: XX-XXXXXXX
  if (cleaned.length <= 2) {
    return cleaned;
  }
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 9)}`;
};

export const formatSSN = (text) => {
  // Remove all non-digit characters
  const cleaned = text.replace(/\D/g, "");

  // Apply formatting: XXX-XX-XXXX
  if (cleaned.length <= 3) {
    return cleaned;
  }
  if (cleaned.length <= 5) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}`;
  }
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 9)}`;
};

export const getTaxIdentifierEditState = (foodTruck = {}) => {
  const type =
    String(foodTruck?.tax_identifier_type || "").toLowerCase() === "ssn" ||
    (!foodTruck?.ein && Boolean(foodTruck?.ssn))
      ? "ssn"
      : "ein";
  const value = type === "ssn" ? foodTruck?.ssn : foodTruck?.ein;
  const maskedValue = foodTruck?.tax_identifier_masked ||
    (String(value || "").includes("*") ? value : "");

  return {
    type,
    originalType: type,
    inputValue: maskedValue ? "" : String(value || ""),
    maskedValue: String(maskedValue || ""),
    hasExisting: Boolean(maskedValue || value),
  };
};

export const buildTaxIdentifierUpdate = ({ type, inputValue }) => {
  const value = String(inputValue || "").trim();
  if (!value) return {};

  return type === "ssn"
    ? { ein: null, ssn: value }
    : { ein: value, ssn: null };
};

export const getPhoneDigits = (text = "") => text.replace(/\D/g, "").slice(-10);

export const formatPhoneNumber = (text = "") => {
  const cleaned = getPhoneDigits(text);
  if (cleaned.length <= 3) {
    return cleaned;
  }
  if (cleaned.length <= 6) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
};
