const asArray = (value) => (Array.isArray(value) ? value : []);

const displayValue = (value) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  return String(
    value.name ||
      value.label ||
      value.menuItem?.name ||
      value.itemId?.name ||
      value.comboMenuItemId?.name ||
      ""
  ).trim();
};

const displayList = (values) =>
  asArray(values).map(displayValue).filter(Boolean).join(", ");

const itemName = (item) =>
  displayValue(item?.menuItem) ||
  displayValue(item?.itemId) ||
  displayValue(item?.comboMenuItemId) ||
  displayValue(item) ||
  "Included item";

const addSelectionDetails = (details, item, prefix = "") => {
  const addList = (label, values) => {
    const text = displayList(values);
    if (text) details.push(`${prefix}${label}: ${text}`);
  };
  const addText = (label, value) => {
    const text = typeof value === "string" ? value.trim() : "";
    if (text) details.push(`${prefix}${label}: ${text}`);
  };

  addList("Flavors", item?.selectedFlavors);
  addList("Toppings", item?.selectedToppings);
  addList("Sides", item?.selectedComboSides);
  addText(
    "Customizations",
    item?.customizationInput || item?.customization || item?.specialInstructions
  );
};

const addChildren = (details, children, heading) => {
  asArray(children).forEach((child) => {
    details.push(`${heading}: ${itemName(child)}`);
    addSelectionDetails(details, child, "  ");

    addChildren(
      details,
      child?.selectedSubItems || child?.comboItems,
      "  Included item"
    );
  });
};

/**
 * Returns every kitchen-relevant selection as individual display lines.
 * Supports both local POS cart fields and the populated order shape returned
 * by the API so checkout and printed tickets share the same level of detail.
 */
export const getOrderItemDetailLines = (item) => {
  const details = [];
  addSelectionDetails(details, item);
  addChildren(details, item?.selectedSubItems || item?.comboItems, "Included item");

  const discountFlavors = displayList(item?.selectedDiscountFlavors);
  const discountToppings = displayList(item?.selectedDiscountToppings);
  const discountSides = displayList(item?.selectedDiscountComboSides);
  const discountCustomization = String(
    item?.selectedDiscountCustomizationInput ||
      item?.selectedDiscountCustomization ||
      ""
  ).trim();

  const rewards = asArray(item?.bogoItems);
  const sameItemReward = rewards.find((reward) => reward?.isSameItem);
  const differentItemReward = rewards.find((reward) => !reward?.isSameItem);
  const discountItem = differentItemReward
    ? differentItemReward.menuItem || differentItemReward.itemId || differentItemReward
    : sameItemReward || item;
  if (
    discountFlavors ||
    discountToppings ||
    discountSides ||
    discountCustomization ||
    asArray(item?.selectedDiscountSubItems).length > 0
  ) {
    details.push(`Discount item: ${itemName(discountItem)}`);
  }

  if (discountFlavors) details.push(`Discount item flavors: ${discountFlavors}`);
  if (discountToppings) details.push(`Discount item toppings: ${discountToppings}`);
  if (discountSides) details.push(`Discount item sides: ${discountSides}`);
  if (discountCustomization) {
    details.push(`Discount item customizations: ${discountCustomization}`);
  }
  addChildren(
    details,
    item?.selectedDiscountSubItems,
    "Discount included item"
  );

  return details;
};
