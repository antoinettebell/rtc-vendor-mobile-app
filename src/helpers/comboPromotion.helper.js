export const hasActiveBogoPromotion = (item = {}) =>
  item.hasDiscount === true &&
  ["BOGO", "BOGOHO"].includes(String(item.discountType || "").toUpperCase());

export const filterComboChildCandidates = (items = []) =>
  (Array.isArray(items) ? items : []).filter(
    (item) => !hasActiveBogoPromotion(item),
  );
