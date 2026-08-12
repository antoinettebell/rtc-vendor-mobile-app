export const normalizeMarketplaceRequirementLabel = (label) => {
  const value = String(label || "").trim();
  const normalized = value.toLowerCase();

  if (!value || normalized === "none") return "";
  if (
    normalized === "insurance" ||
    normalized === "certificate of insurance"
  ) {
    return "Insurance";
  }
  if (
    normalized === "sanitation grade" ||
    normalized === "health permit" ||
    normalized === "health department" ||
    normalized === "food handler permit"
  ) {
    return "Sanitation Grade";
  }
  if (normalized === "alcohol" || normalized === "liquor license") {
    return "Liquor License";
  }
  if (normalized === "fire permit") return "Fire Permit";
  if (
    normalized === "business license" ||
    normalized === "business license/permit" ||
    normalized === "license" ||
    normalized === "city permit" ||
    normalized === "food vendor" ||
    normalized === "food vendor permit"
  ) {
    return "City Permit";
  }
  if (normalized === "other") return "Other";

  return value;
};
