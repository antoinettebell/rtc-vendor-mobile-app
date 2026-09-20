import { normalizeMenuOptions } from "./discount.helper.js";

const asArray = (value) => (Array.isArray(value) ? value : []);

const displayValue = (value) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  return String(value.name || value.label || "").trim();
};

const money = (value) => (Number(value) || 0).toFixed(2);

export const formatSelectedOptionLabels = (item, type, selectedKey) => {
  const pricedOptions = normalizeMenuOptions(item, type);
  return asArray(item?.[selectedKey]).map((selected) => {
    const name = displayValue(selected);
    const match = pricedOptions.find(
      (option) => option.name.trim().toLowerCase() === name.toLowerCase()
    );
    const directCost =
      typeof selected === "object" && selected?.hasCost !== false
        ? Number(selected?.cost ?? selected?.price ?? 0) || 0
        : 0;
    const cost = match?.hasCost ? Number(match.cost) || 0 : directCost;
    return cost > 0 ? `${name} +$${money(cost)}` : name;
  });
};

export const formatSelectedSideLabels = (item) =>
  asArray(item?.selectedComboSides).map((selected) => {
    const name = displayValue(selected);
    const option = asArray(item?.comboSideOptionCosts).find(
      (candidate) => candidate?.name === name
    );
    const directCost =
      typeof selected === "object" && selected?.hasCost !== false
        ? Number(selected?.cost ?? selected?.price ?? 0) || 0
        : 0;
    const cost = option?.hasCost ? Number(option.cost) || 0 : directCost;
    return cost > 0 ? `${name} +$${money(cost)}` : name;
  });

export const getOrderItemSelectionLines = (item) => {
  const lines = [];
  const addList = (label, values) => {
    const text = asArray(values).filter(Boolean).join(", ");
    if (text) lines.push(`${label}: ${text}`);
  };

  const flavors = formatSelectedOptionLabels(item, "flavor", "selectedFlavors");
  const toppings = formatSelectedOptionLabels(item, "topping", "selectedToppings");
  const sides = formatSelectedSideLabels(item);
  addList(
    "Flavors",
    flavors.length > 0 ? flavors : asArray(item?.displayFlavors).map(displayValue)
  );
  addList(
    "Toppings",
    toppings.length > 0 ? toppings : asArray(item?.displayToppings).map(displayValue)
  );
  addList(
    "Sides",
    sides.length > 0 ? sides : asArray(item?.displayComboSides).map(displayValue)
  );

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
