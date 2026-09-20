const asArray = (value) => (Array.isArray(value) ? value : []);

const displayValue = (value) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  return String(value.name || value.label || "").trim();
};

const displayList = (values) =>
  asArray(values).map(displayValue).filter(Boolean).join(", ");

export const getOrderItemSelectionLines = (item) => {
  const lines = [];
  const addList = (label, values) => {
    const text = displayList(values);
    if (text) lines.push(`${label}: ${text}`);
  };

  addList("Flavors", item?.selectedFlavors || item?.displayFlavors);
  addList("Toppings", item?.selectedToppings || item?.displayToppings);
  addList("Sides", item?.selectedComboSides || item?.displayComboSides);

  const customization =
    item?.customizationInput ||
    item?.customization ||
    item?.specialInstructions ||
    item?.displayCustomization;
  if (typeof customization === "string" && customization.trim()) {
    lines.push(`Customizations: ${customization.trim()}`);
  }

  return lines;
};

export const getNestedOrderItemDetails = (item) =>
  asArray(item?.selectedSubItems || item?.comboItems).map((child) => {
    const qty = Math.max(1, Number(child?.qty) || 1);
    const isAddOn = !!child?.isAddOn;
    const calculatedCost = isAddOn
      ? (Number(child?.price) || 0) * qty
      : child?.hasAdditionalCost
        ? (Number(child?.additionalCost) || 0) * qty
        : 0;
    const cost = Number.isFinite(Number(child?.total))
      ? Number(child.total)
      : calculatedCost;

    return {
      name:
        child?.name ||
        child?.menuItem?.name ||
        child?.itemId?.name ||
        child?.comboMenuItemId?.name ||
        "Combo item",
      qty,
      isAddOn,
      cost,
      costLabel: cost > 0 ? `+$${cost.toFixed(2)}` : "Included in combo",
      selectionLines: getOrderItemSelectionLines(child),
    };
  });
