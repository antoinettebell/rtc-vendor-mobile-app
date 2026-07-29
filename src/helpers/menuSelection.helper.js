import { normalizeMenuOptions } from "./discount.helper";

const COMBO_ITEM_TYPE = "COMBO";

const SAVED_SELECTION_FIELDS = [
  "quantity",
  "customizationInput",
  "selectedFlavors",
  "selectedToppings",
  "selectedComboSides",
  "selectedSubItems",
  "selectedDiscountFlavors",
  "selectedDiscountToppings",
  "selectedDiscountComboSides",
  "selectedDiscountSubItems",
  "selectedDiscountCustomizationInput",
];

export const mergeMenuItemWithSavedSelections = (menuItem, savedItem) => {
  if (!savedItem) return menuItem;

  return SAVED_SELECTION_FIELDS.reduce(
    (merged, field) =>
      savedItem[field] === undefined
        ? merged
        : { ...merged, [field]: savedItem[field] },
    { ...menuItem }
  );
};

const getMenuItemId = (item) =>
  item?.menuItem?._id ||
  (item?.menuItem && typeof item.menuItem !== "object" ? item.menuItem : "") ||
  item?.itemId?._id ||
  (item?.itemId && typeof item.itemId !== "object" ? item.itemId : "") ||
  item?.comboMenuItemId ||
  item?._id ||
  "";

const getChildItem = (item) => item?.menuItem || item?.itemId || item;

const getSelectionLimit = (configuredLimit, optionCount) => {
  const numericLimit = Number(configuredLimit);
  if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
    return optionCount;
  }
  return Math.min(numericLimit, optionCount);
};

const isOptionSelectionComplete = (enabled, selectedOptions, limit) => {
  if (!enabled) return true;
  const count = Array.isArray(selectedOptions) ? selectedOptions.length : 0;
  return count > 0 && count <= limit;
};

const isChildSelectionComplete = (selection) => {
  const child = getChildItem(selection);
  const flavorOptions = normalizeMenuOptions(child, "flavor");
  const toppingOptions = normalizeMenuOptions(child, "topping");
  const comboSideOptions = Array.isArray(child?.comboSideOptions)
    ? child.comboSideOptions.filter(Boolean)
    : [];
  const hasFlavorChoices = !!child?.hasFlavors && flavorOptions.length > 0;
  const hasToppingChoices = !!child?.hasToppings && toppingOptions.length > 0;
  const hasComboSideChoices =
    child?.itemType === COMBO_ITEM_TYPE && comboSideOptions.length > 0;

  return (
    isOptionSelectionComplete(
      hasFlavorChoices,
      selection?.selectedFlavors,
      getSelectionLimit(child?.flavorsPerOrder, flavorOptions.length + 1),
    ) &&
    isOptionSelectionComplete(
      hasToppingChoices,
      selection?.selectedToppings,
      getSelectionLimit(child?.toppingsPerOrder, toppingOptions.length + 1),
    ) &&
    (!hasComboSideChoices ||
      (selection?.selectedComboSides || []).length ===
        getSelectionLimit(child?.comboSidesPerOrder, comboSideOptions.length))
  );
};

const findMissingOrIncompleteChild = (configuredItems, selectedItems) => {
  const selections = Array.isArray(selectedItems) ? selectedItems : [];

  for (const configuredItem of Array.isArray(configuredItems)
    ? configuredItems
    : []) {
    const child = getChildItem(configuredItem);
    const childId = getMenuItemId(configuredItem);
    const selection = selections.find(
      (candidate) => String(getMenuItemId(candidate)) === String(childId),
    );

    if (!selection || !isChildSelectionComplete(selection)) {
      return child;
    }
  }

  return null;
};

const getDiscountSourceItem = (item) => {
  const bogoItems = Array.isArray(item?.bogoItems) ? item.bogoItems : [];
  const sameItemReward = bogoItems.find((reward) => reward?.isSameItem);
  const differentItemReward = bogoItems.find((reward) => !reward?.isSameItem);

  if (sameItemReward || (!bogoItems.length && item?.discountRules?.discount > 0)) {
    return item;
  }

  return differentItemReward ? getChildItem(differentItemReward) : null;
};

export const getNestedSelectionError = (item) => {
  if (item?.itemType === COMBO_ITEM_TYPE) {
    const invalidChild = findMissingOrIncompleteChild(
      item?.subItem,
      item?.selectedSubItems,
    );
    if (invalidChild) {
      return `Complete the required options for ${invalidChild?.name || "the included combo item"}.`;
    }
  }

  const discountSource = getDiscountSourceItem(item);
  if (discountSource?.itemType === COMBO_ITEM_TYPE) {
    const invalidDiscountChild = findMissingOrIncompleteChild(
      discountSource?.subItem,
      item?.selectedDiscountSubItems,
    );
    if (invalidDiscountChild) {
      return `Complete the required options for ${invalidDiscountChild?.name || "the included discount item"}.`;
    }
  }

  return null;
};
