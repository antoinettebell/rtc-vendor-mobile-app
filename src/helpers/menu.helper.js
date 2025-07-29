/**
 * Calculate the discounted price based on the discount type and value
 * @param {number|string} actualPrice - The original price
 * @param {string} discountType - The type of discount ("PERCENTAGE" or "FIXED")
 * @param {number|string} discountValue - The discount value
 * @returns {{afterdiscountprice: number, isPriceIncreased: boolean}} - An object containing the price after applying the discount and a flag indicating if the discounted price is greater than the actual price.
 */
export const getDiscountedPrice = (
  actualPrice,
  discountType,
  discountValue
) => {
  // Convert actualPrice to number if it's a string
  const numericActualPrice =
    typeof actualPrice === "string" ? parseFloat(actualPrice) : actualPrice;

  // Validate actualPrice is a valid number
  if (
    typeof numericActualPrice !== "number" ||
    isNaN(numericActualPrice) ||
    numericActualPrice < 0
  ) {
    return { afterdiscountprice: 0, isPriceIncreased: false }; // Return 0 if price is invalid
  }

  // Convert discountValue to number if it's a string
  const numericDiscountValue =
    typeof discountValue === "string"
      ? parseFloat(discountValue)
      : discountValue;

  // Validate discountValue is a valid number
  if (
    typeof numericDiscountValue !== "number" ||
    isNaN(numericDiscountValue) ||
    numericDiscountValue < 0
  ) {
    return { afterdiscountprice: numericActualPrice, isPriceIncreased: false }; // Return original price if discount is invalid
  }

  let afterdiscountprice;

  // Apply discount based on type
  if (discountType === "PERCENTAGE") {
    // Ensure percentage is not greater than 100%
    const validPercentage = Math.min(numericDiscountValue, 100);
    afterdiscountprice =
      numericActualPrice - (numericActualPrice * validPercentage) / 100;
  } else if (discountType === "FIXED") {
    // Ensure fixed discount doesn't exceed the actual price
    // const validDiscount = Math.min(numericDiscountValue, numericActualPrice);
    afterdiscountprice = numericActualPrice - numericDiscountValue;
  } else {
    // Return original price for unknown discount types
    afterdiscountprice = numericActualPrice;
  }

  const isPriceIncreased =
    afterdiscountprice <= 0 || afterdiscountprice > numericActualPrice;

  return { afterdiscountprice, isPriceIncreased };
};
