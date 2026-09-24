export const MAX_GENERAL_PURCHASE_TAX_RATE = 25;
export const GENERAL_PURCHASE_TAX_INFORMATION =
  "Taxes collected on sales will be paid out at 100% to you as the vendor. You are responsible for submitting applicable sales tax to the appropriate state. Please enter the correct sales tax rate for the location and type of product or commodity being sold.";

export const createGeneralPurchaseItem = (id = `${Date.now()}-${Math.random()}`) => ({
  id,
  description: "",
  quantity: "1",
  unitPrice: "",
});

export const addGeneralPurchaseItem = (items, item = createGeneralPurchaseItem()) => [...items, item];

export const removeGeneralPurchaseItem = (items, itemId) =>
  items.length > 1 ? items.filter((item) => item.id !== itemId) : items;

export const initialGeneralPurchaseState = () => ({
  items: [createGeneralPurchaseItem()],
  taxRate: "",
  customerPhone: "",
});

export const toGeneralPurchaseMoney = (value) =>
  Number((Math.round((Number(value) || 0) * 100) / 100).toFixed(2));

export const calculateGeneralPurchase = (items = [], taxRate = 0) => {
  const normalizedItems = items.map((item) => {
    const quantity = Math.max(0, Number(item.quantity) || 0);
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    return { ...item, quantity, unitPrice, lineTotal: toGeneralPurchaseMoney(quantity * unitPrice) };
  });
  const subtotal = toGeneralPurchaseMoney(normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0));
  const normalizedTaxRate = Math.min(MAX_GENERAL_PURCHASE_TAX_RATE, Math.max(0, Number(taxRate) || 0));
  const taxAmount = toGeneralPurchaseMoney(subtotal * normalizedTaxRate / 100);
  return { items: normalizedItems, subtotal, taxRate: normalizedTaxRate, taxAmount, total: toGeneralPurchaseMoney(subtotal + taxAmount) };
};

export const validateGeneralPurchase = ({ items, taxRate }) => {
  if (!items.length) return 'Add at least one item.';
  const invalidDescription = items.findIndex((item) => !String(item.description || '').trim());
  if (invalidDescription >= 0) return `Item ${invalidDescription + 1} requires a description.`;
  const invalidQuantity = items.findIndex((item) => !(Number(item.quantity) > 0));
  if (invalidQuantity >= 0) return `Item ${invalidQuantity + 1} quantity must be greater than zero.`;
  const invalidPrice = items.findIndex((item) => !Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 0);
  if (invalidPrice >= 0) return `Item ${invalidPrice + 1} price must be zero or greater.`;
  const rate = Number(taxRate || 0);
  if (!Number.isFinite(rate) || rate < 0 || rate > MAX_GENERAL_PURCHASE_TAX_RATE) return `Sales tax must be between 0 and ${MAX_GENERAL_PURCHASE_TAX_RATE} percent.`;
  return null;
};
