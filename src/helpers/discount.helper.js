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

export const calculateItemTotalWithDiscount = (item) => {
  const { price, quantity, discountType, discountRules } = item;
  let total = price * quantity;

  if (discountRules && discountRules.discount > 0) {
    const { discount: discountVal = 0 } = discountRules;
    const rewardQty = calculateRewardQty(quantity, discountRules);

    const rewardTotal = rewardQty * price;
    const discountAmount = rewardTotal * discountVal;

    total = price * quantity + rewardTotal - discountAmount;
  } else if (discountType === "BOGOHO") {
    const effectivePrice =
      item.bogoHoPrice != null ? item.bogoHoPrice : price * 1.5;
    total = effectivePrice * quantity;
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
            displayName: bi.isSameItem ? safeItem.name : bi.itemId?.name,
            displayImg: bi.isSameItem
              ? safeItem.imgUrls?.[0]
              : bi.itemId?.imgUrls?.[0],
            displayDesc: bi.isSameItem
              ? safeItem.description
              : bi.itemId?.description,
            displayFlavors: bi.isSameItem ? selectedDiscountFlavors : [],
            displayToppings: bi.isSameItem ? selectedDiscountToppings : [],
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
      displayFlavors: bi.isSameItem ? selectedDiscountFlavors : [],
      displayToppings: bi.isSameItem ? selectedDiscountToppings : [],
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
