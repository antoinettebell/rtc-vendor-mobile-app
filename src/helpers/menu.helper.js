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

/**
 * Validate dish/item name
 * @param {string} value - The dish name to validate
 * @returns {string} - Error message if validation fails, empty string otherwise
 */
export const addValidateItemName = (value) => {
  if (!value.trim()) {
    return "Dish/Item name is required";
  }
  return "";
};

/**
 * Validate dish/item description
 * @param {string} value - The description to validate
 * @returns {string} - Error message if validation fails, empty string otherwise
 */
export const addValidateItemDescription = (value) => {
  if (!value.trim()) {
    return "Description is required";
  }
  return "";
};

/**
 * Validate dish/item price
 * @param {string} value - The price to validate
 * @returns {string} - Error message if validation fails, empty string otherwise
 */
export const addValidateItemPrice = (value) => {
  if (!value.trim()) {
    return "Price is required";
  }
  if (!/^\d*\.?\d*$/.test(value)) {
    return "Only numbers and decimal point allowed";
  }
  return "";
};

/**
 * Validate dish/item discount
 * @param {string} value - The discount to validate
 * @returns {string} - Error message if validation fails, empty string otherwise
 */
export const addValidateItemDiscount = (value) => {
  if (!/^\d*\.?\d*$/.test(value)) {
    return "Only numbers and decimal point allowed";
  }
  return "";
};

/**
 * Validate minimum quantity
 * @param {string} value - The minimum quantity to validate
 * @param {string} maxQtValue - The maximum quantity value for comparison
 * @returns {string} - Error message if validation fails, empty string otherwise
 */
export const addValidateMinQt = (value, maxQtValue) => {
  if (!value.trim()) {
    return "Min quantity is required";
  }
  if (!/^\d+$/.test(value)) {
    return "Only whole numbers allowed";
  }
  const num = parseInt(value, 10);
  if (num < 1) {
    return "Minimum value is 1";
  }
  if (num > 99) {
    return "Maximum value is 99";
  }
  if (maxQtValue && num > parseInt(maxQtValue, 10)) {
    return "Must be ≤ Max quantity";
  }
  return "";
};

/**
 * Validate maximum quantity
 * @param {string} value - The maximum quantity to validate
 * @param {string} minQtValue - The minimum quantity value for comparison
 * @returns {string} - Error message if validation fails, empty string otherwise
 */
export const addValidateMaxQt = (value, minQtValue) => {
  if (!value.trim()) {
    return "Max quantity is required";
  }
  if (!/^\d+$/.test(value)) {
    return "Only whole numbers allowed";
  }
  const num = parseInt(value, 10);
  if (num > 99) {
    return "Maximum value is 99";
  }
  if (minQtValue && num < parseInt(minQtValue, 10)) {
    return "Must be ≥ Min quantity";
  }
  return "";
};

/**
 * Validate preparation time
 * @param {string} value - The preparation time to validate
 * @returns {string} - Error message if validation fails, empty string otherwise
 */
export const addValidatePrepTime = (value) => {
  if (!value.trim()) {
    // return "Preparation time is required";
    value = 0; // Default value for logic only
  }
  if (!/^\d+$/.test(value)) {
    return "Only whole numbers allowed";
  }
  const num = parseInt(value, 10);
  if (num > 120) {
    return "Maximum value is 120";
  }
  return "";
};

/**
 * Validate dish/item name for edit operation
 * @param {string} value - The dish name to validate
 * @returns {string} - Error message if validation fails, empty string otherwise
 */
export const editValidateItemName = (value) => {
  if (!value.trim()) {
    return "Dish/Item name is required";
  }
  return "";
};

/**
 * Validate dish/item description for edit operation
 * @param {string} value - The description to validate
 * @returns {string} - Error message if validation fails, empty string otherwise
 */
export const editValidateItemDescription = (value) => {
  if (!value.trim()) {
    return "Description is required";
  }
  return "";
};

/**
 * Validate dish/item price for edit operation
 * @param {string} value - The price to validate
 * @returns {string} - Error message if validation fails, empty string otherwise
 */
export const editValidateItemPrice = (value) => {
  if (!value.trim()) {
    return "Price is required";
  }
  if (!/^\d*\.?\d*$/.test(value)) {
    return "Only numbers and decimal point allowed";
  }
  return "";
};

/**
 * Validate dish/item discount for edit operation
 * @param {string} value - The discount to validate
 * @returns {string} - Error message if validation fails, empty string otherwise
 */
export const editValidateItemDiscount = (value) => {
  if (!/^\d*\.?\d*$/.test(value)) {
    return "Only numbers and decimal point allowed";
  }
  return "";
};

/**
 * Validate minimum quantity for edit operation
 * @param {string} value - The minimum quantity to validate
 * @param {string} maxQtValue - The maximum quantity value for comparison
 * @returns {string} - Error message if validation fails, empty string otherwise
 */
export const editValidateMinQt = (value, maxQtValue) => {
  if (!value.trim()) {
    return "Min quantity is required";
  }
  if (!/^\d+$/.test(value)) {
    return "Only whole numbers allowed";
  }
  const num = parseInt(value, 10);
  if (num < 1) {
    return "Minimum value is 1";
  }
  if (maxQtValue && num > parseInt(maxQtValue, 10)) {
    return "Must be ≤ Max quantity";
  }
  return "";
};

/**
 * Validate maximum quantity for edit operation
 * @param {string} value - The maximum quantity to validate
 * @param {string} minQtValue - The minimum quantity value for comparison
 * @returns {string} - Error message if validation fails, empty string otherwise
 */
export const editValidateMaxQt = (value, minQtValue) => {
  if (!value.trim()) {
    return "Max quantity is required";
  }
  if (!/^\d+$/.test(value)) {
    return "Only whole numbers allowed";
  }
  const num = parseInt(value, 10);
  if (minQtValue && num < parseInt(minQtValue, 10)) {
    return "Must be ≥ Min quantity";
  }
  return "";
};

/**
 * Validate preparation time for edit operation
 * @param {string} value - The preparation time to validate
 * @returns {string} - Error message if validation fails, empty string otherwise
 */
export const editValidatePrepTime = (value) => {
  if (!value.trim()) {
    // return "Preparation time is required";
    value = 0; // Default value for logic only
  }
  if (!/^\d+$/.test(value)) {
    return "Only whole numbers allowed";
  }
  const num = parseInt(value, 10);
  if (num > 120) {
    return "Maximum value is 120";
  }
  return "";
};

/**
 * Evaluates whether a given string is NOT one of the specified exclusion categories.
 * If the category is "Beverages", or "Desserts", it returns false.
 * For all other categories, it returns true.
 * * @param {string} categoryName - The category name to be checked.
 * @returns {boolean} - True if the input string is NOT an exclusion category, false otherwise.
 */
export const isValidCategoryForMeat = (categoryName) => {
  // 1. Handle Null/Empty Input
  if (!categoryName) {
    // Treat null/empty as a valid (non-excluded) category, or change this
    // to return false if you want strict validation. We'll return true
    // since it's not one of the *excluded* names.
    return true;
  }

  // 2. Define Exclusion Categories
  // All comparisons will be case-insensitive.
  const EXCLUSION_CATEGORIES = ["beverages", "desserts"];

  // 3. Normalize Input
  const normalizedCategoryName = categoryName.trim().toLowerCase();

  // 4. Check for Exclusion
  // Array.includes() efficiently checks if the normalized input matches any item in the array.
  const isExcluded = EXCLUSION_CATEGORIES.includes(normalizedCategoryName);

  // 5. Return the Inverse Result
  // We want to return TRUE if it is NOT excluded, and FALSE if it IS excluded.
  return !isExcluded;
};

/**
 * Evaluates whether a given string is NOT one of the specified exclusion categories.
 * If the category is "Beverages", or "Desserts", it returns false.
 * For all other categories, it returns true.
 * * @param {string} categoryName - The category name to be checked.
 * @returns {boolean} - True if the input string is NOT an exclusion category, false otherwise.
 */
export const isValidCategoryForMeatWellness = (categoryName) => {
  // 1. Handle Null/Empty Input
  // A null or empty string is not one of the *explicitly excluded* categories,
  // so we return true.
  if (!categoryName) {
    return true;
  }

  // 2. Define Exclusion Categories (in lowercase for case-insensitive comparison)
  const EXCLUSION_CATEGORIES = ["beverages", "desserts"];

  // 3. Normalize Input
  // Trim whitespace and convert to lowercase for case-insensitive matching.
  const normalizedCategoryName = categoryName.trim().toLowerCase();

  // 4. Check for Exclusion
  // Use .includes() for an efficient exact match check against the exclusion list.
  const isExcluded = EXCLUSION_CATEGORIES.includes(normalizedCategoryName);

  // 5. Return the Inverse Result
  // Return TRUE if it is NOT excluded, and FALSE if it IS excluded.
  return !isExcluded;
};
