export const formatEIN = (text = "") => {
  // Remove all non-digit characters
  const cleaned = text.replace(/\D/g, "");

  // Apply formatting: XX-XXXXXXX
  if (cleaned.length <= 2) {
    return cleaned;
  }
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 9)}`;
};

export const formatSSN = (text = "") => {
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
