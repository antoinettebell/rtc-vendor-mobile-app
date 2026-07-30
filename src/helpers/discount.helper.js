export const calculateRewardQty = (quantity, discountRules) => {
  if (!discountRules || discountRules.discount <= 0) return 0;

  const { buyQty = 1, getQty = 1, repeatable = true } = discountRules;
  const normalizedQuantity = Number(quantity) || 0;
  const normalizedBuyQty = Math.max(1, Number(buyQty) || 1);
  const normalizedGetQty = Math.max(1, Number(getQty) || 1);

  const eligibleSets = repeatable
    ? Math.floor(normalizedQuantity / normalizedBuyQty)
    : normalizedQuantity >= normalizedBuyQty
      ? 1
      : 0;

  return eligibleSets * normalizedGetQty;
};

export const normalizeMenuOptions = (item, type) => {
  const optionsKey = `${type}Options`;
  const legacyKey = type === "flavor" ? "flavors" : "toppings";
  const rawOptions =
    Array.isArray(item?.[optionsKey]) && item[optionsKey].length > 0
      ? item[optionsKey]
      : item?.[legacyKey];

  if (!Array.isArray(rawOptions)) {
    return [];
  }

  return rawOptions
    .map((option) => {
      if (typeof option === "string") {
        return { name: option, cost: 0, hasCost: false };
      }

      const name = option?.name || option?.label || "";
      const cost =
        Number(
          option?.cost ??
            option?.price ??
            option?.additionalCost ??
            option?.extraCost ??
            option?.optionCost ??
            0
        ) || 0;

      return {
        name,
        cost,
        hasCost: cost > 0 && option?.hasCost !== false,
      };
    })
    .filter((option) => option.name);
};

export const calculateSelectedOptionCost = (
  item,
  flavorKey = "selectedFlavors",
  toppingKey = "selectedToppings",
  optionSourceItem = item
) => {
  const selectedFlavors = Array.isArray(item?.[flavorKey])
    ? item[flavorKey]
    : [];
  const selectedToppings = Array.isArray(item?.[toppingKey])
    ? item[toppingKey]
    : [];

  const selectedCost = (type, selectedNames) => {
    const options = normalizeMenuOptions(optionSourceItem, type);
    return selectedNames.reduce((sum, selectedOption) => {
      const selectedName =
        typeof selectedOption === "string"
          ? selectedOption
          : selectedOption?.name || selectedOption?.label || "";
      const match = options.find((option) => option.name === selectedName);
      return sum + (match?.hasCost ? Number(match.cost) || 0 : 0);
    }, 0);
  };

  return (
    selectedCost("flavor", selectedFlavors) +
    selectedCost("topping", selectedToppings)
  );
};

export const calculateNestedSelectedOptionCost = (selectedItems = []) =>
  (Array.isArray(selectedItems) ? selectedItems : []).reduce(
    (sum, selectedItem) => {
      const quantity = Math.max(1, Number(selectedItem?.qty) || 1);
      const optionSourceItem =
        (selectedItem?.menuItem && typeof selectedItem.menuItem === "object"
          ? selectedItem.menuItem
          : null) ||
        (selectedItem?.itemId && typeof selectedItem.itemId === "object"
          ? selectedItem.itemId
          : null) ||
        selectedItem;
      const directOptionCost = calculateSelectedOptionCost(
        selectedItem,
        "selectedFlavors",
        "selectedToppings",
        optionSourceItem
      );
      const nestedOptionCost = calculateNestedSelectedOptionCost(
        selectedItem?.selectedSubItems
      );

      return sum + (directOptionCost + nestedOptionCost) * quantity;
    },
    0
  );

export const getDiscountSourceItem = (item) => {
  const safeItem = item || {};
  const bogoItems = Array.isArray(safeItem.bogoItems) ? safeItem.bogoItems : [];
  const sameItemReward = bogoItems.find((bi) => bi?.isSameItem);
  const differentItemReward = bogoItems.find((bi) => !bi?.isSameItem);

  if (
    sameItemReward ||
    (!bogoItems.length && safeItem?.discountRules?.discount > 0)
  ) {
    return safeItem;
  }

  return differentItemReward || safeItem;
};

export const calculateItemTotalWithDiscount = (item) => {
  const { price, quantity, discountType, discountRules } = item;
  const comboOptionCost = calculateNestedSelectedOptionCost(
    item?.selectedSubItems
  );
  const unitPrice =
    (Number(price) || 0) +
    calculateSelectedOptionCost(item) +
    comboOptionCost;
  let total = unitPrice * quantity;
  const discountSourceItem = getDiscountSourceItem(item);

  if (discountRules && discountRules.discount > 0) {
    const { discount: discountVal = 0 } = discountRules;
    const rewardQty = calculateRewardQty(quantity, discountRules);
    const basePrice = Number(price) || 0;
    const rewardOptionsCost = calculateSelectedOptionCost(
      item,
      "selectedDiscountFlavors",
      "selectedDiscountToppings",
      discountSourceItem
    ) + calculateNestedSelectedOptionCost(item?.selectedDiscountSubItems);

    const rewardTotal = rewardQty * (basePrice + rewardOptionsCost);
    const discountAmount = rewardQty * basePrice * discountVal;

    total = unitPrice * quantity + rewardTotal - discountAmount;
  } else if (discountType === "BOGO") {
    const rewardOptionsCost = calculateSelectedOptionCost(
      item,
      "selectedDiscountFlavors",
      "selectedDiscountToppings",
      discountSourceItem
    ) + calculateNestedSelectedOptionCost(item?.selectedDiscountSubItems);
    total = unitPrice * quantity + rewardOptionsCost * quantity;
  } else if (discountType === "BOGOHO") {
    const basePrice = Number(price) || 0;
    const rewardOptionsCost = calculateSelectedOptionCost(
      item,
      "selectedDiscountFlavors",
      "selectedDiscountToppings",
      discountSourceItem
    ) + calculateNestedSelectedOptionCost(item?.selectedDiscountSubItems);
    total =
      item.bogoHoPrice != null
        ? item.bogoHoPrice * quantity + rewardOptionsCost * quantity
        : unitPrice * quantity +
          (basePrice * 0.5 + rewardOptionsCost) * quantity;
  }

  return total;
};

export const getRewardItemsDisplay = (item, quantityToUseArg) => {
  const safeItem = item || {};
  const quantityToUse =
    quantityToUseArg ?? safeItem.quantity ?? safeItem.qty ?? 0;

  const { discountRules, bogoItems, discountType } = safeItem;
  const selectedDiscountFlavors = Array.isArray(safeItem.selectedDiscountFlavors)
    ? safeItem.selectedDiscountFlavors
    : [];
  const selectedDiscountToppings = Array.isArray(safeItem.selectedDiscountToppings)
    ? safeItem.selectedDiscountToppings
    : [];
  const selectedDiscountCustomization =
    safeItem.selectedDiscountCustomization ||
    safeItem.selectedDiscountCustomizationInput ||
    "";
  const selectedDiscountComboSides = Array.isArray(
    safeItem.selectedDiscountComboSides
  )
    ? safeItem.selectedDiscountComboSides
    : [];
  let rewardItems = [];

  if (discountRules && discountRules.discount > 0) {
    const { discount: discountVal = 0 } = discountRules;
    const rewardQty = calculateRewardQty(quantityToUse, discountRules);

    if (rewardQty > 0) {
      if (bogoItems && bogoItems.length > 0) {
        rewardItems = bogoItems.map((bi) => {
          const biQty = Number(bi.qty);
          const biQtySafe = Number.isFinite(biQty) && biQty > 0 ? biQty : 1;
          const displayQty =
            biQtySafe === rewardQty && rewardQty > 0
              ? rewardQty
              : rewardQty * biQtySafe;
          const rewardDisplayPrice =
            bi.isSameItem &&
            bi.discountVal != null &&
            Number.isFinite(Number(bi.price))
              ? Number(bi.price)
              : (Number(bi.isSameItem ? safeItem.price : bi.itemId?.price) ||
                  0) *
                (1 - discountVal);

          return {
            ...bi,
            displayQty,
            displayName: bi.isSameItem ? safeItem.name : bi.itemId?.name || bi.name,
            displayImg: bi.isSameItem
              ? safeItem.imgUrls?.[0]
              : bi.itemId?.imgUrls?.[0] || bi.imgUrls?.[0],
            displayDesc: bi.isSameItem
              ? safeItem.description
              : bi.itemId?.description || bi.description,
            displayFlavors: selectedDiscountFlavors,
            displayToppings: selectedDiscountToppings,
            displayCustomization: bi.allowCustomize
              ? selectedDiscountCustomization
              : null,
            displayComboSides: selectedDiscountComboSides,
            displayPrice:
              rewardDisplayPrice <= 0
                ? "Free"
                : `$${rewardDisplayPrice.toFixed(2)}`,
          };
        });
      } else {
        rewardItems = [
          {
            _id: "same-item-reward",
            displayName: safeItem.name,
            displayImg: safeItem.imgUrls?.[0],
            displayDesc: safeItem.description,
            displayFlavors: selectedDiscountFlavors,
            displayToppings: selectedDiscountToppings,
            displayCustomization: safeItem.allowCustomize
              ? selectedDiscountCustomization
              : null,
            displayComboSides: selectedDiscountComboSides,
            displayQty: rewardQty,
            displayPrice:
              discountVal === 1
                ? "Free"
                : `$${((safeItem.price || 0) * (1 - discountVal)).toFixed(2)}`,
          },
        ];
      }
    }
  } else if (bogoItems && bogoItems.length > 0) {
    rewardItems = bogoItems.map((bi) => ({
      ...bi,
      displayQty: quantityToUse * (bi.qty || 1),
      displayName: bi.itemId?.name || bi.name,
      displayImg: bi.itemId?.imgUrls?.[0] || bi.imgUrls?.[0],
      displayDesc: bi.itemId?.description || bi.description,
      displayFlavors: selectedDiscountFlavors,
      displayToppings: selectedDiscountToppings,
      displayCustomization: bi.allowCustomize
        ? selectedDiscountCustomization
        : null,
      displayComboSides: selectedDiscountComboSides,
      displayPrice:
        discountType === "BOGO" && bi.isSameItem && Number(bi.price) > 0
          ? `$${Number(bi.price).toFixed(2)}`
          : discountType === "BOGO"
            ? "Free"
            : "Discounted",
    }));
  }

  return rewardItems;
};
