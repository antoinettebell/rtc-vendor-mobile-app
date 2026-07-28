export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,15}$/;

export const addressRegex = /^[a-zA-Z0-9\s,.-]*$/;

export const addressStateRegex = /^[A-Z]{2,3}$/;

export const addressCountryRegex = /^[A-Z]{2,3}$/;

export const addressPostalCodeRegex = /^[a-zA-Z0-9\s-]{3,10}$/;

export const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]{1,20}$/;

export const truckNameRegex = /^[a-zA-Z0-9\s-]{1,50}$/;

export const PROFILE_MENU_IMAGES = {
  yourProfile: require("../assets/images/yourProfileIcon.png"),
  servingLocations: require("../assets/images/servingLocationIcon.png"),
  cuisine: require("../assets/images/cuiniesIcon.png"),
  manageBusinessHours: require("../assets/images/openSign.png"),
  manageAvailability: require("../assets/images/manageAvailabilityIcon.png"),
  changePassword: require("../assets/images/changePasswordIcon.png"),
  bankDetail: require("../assets/images/profileBankIcon.png"),
  subscription: require("../assets/images/subscriptionIcon.png"),
  helpSupportTC: require("../assets/images/helpSupportTCIcon.png"),
  logout: require("../assets/images/logoutIcon.png"),
  deleteAccount: require("../assets/images/dltAccountIcon.png"),
};

export const PROFILE_AVATAR = "https://avatar.iran.liara.run/public/12";

export const orderStatusStrings = {
  placed: "PLACED",
  cancel: "CANCEL",
  accepted: "ACCEPTED",
  rejected: "REJECTED",
  preparing: "PREPARING",
  ready_for_pickup: "READY_FOR_PICKUP",
  driver_picked_up: "DRIVER_PICKED_UP",
  delivered: "DELIVERED",
  completed: "COMPLETED",
};

export const orderNextStatusNames = {
  PLACED: "Place",
  CANCEL: "Cancel",
  ACCEPTED: "Accept",
  REJECTED: "Reject",
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Ready for pickup",
  DRIVER_PICKED_UP: "Out for delivery",
  DELIVERED: "Delivered",
  COMPLETED: "Complete",
};

export const orderCurrentStatusNames = {
  PLACED: "Placed",
  CANCEL: "Cancel",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Ready for pickup",
  DRIVER_PICKED_UP: "Out for delivery",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
};

export const notificationTypes = {
  new_order: "NEW_ORDER",
  vendor_daily_location_check: "VENDOR_DAILY_LOCATION_CHECK",
  vendor_compliance_expiration: "VENDOR_COMPLIANCE_EXPIRATION",
  vendor_compliance_required: "VENDOR_COMPLIANCE_REQUIRED",
  order_cancelled: "ORDER_CANCELLED",
  order_accepted: "ORDER_ACCEPTED",
  order_rejected: "ORDER_REJECTED",
  order_preparing: "ORDER_PREPARING",
  order_ready_for_pickup: "ORDER_READY_FOR_PICKUP",
  order_driver_picked_up: "ORDER_DRIVER_PICKED_UP",
  order_delivered: "ORDER_DELIVERED",
  order_completed: "ORDER_COMPLETED",
};

export const vendorProfileStatus = {
  pending: "PENDING",
  approved: "APPROVED",
  rejected: "REJECTED",
};

export const fullDayNames = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

export const foodTypeStrings = {
  individual: "INDIVIDUAL",
  combo: "COMBO",
};

// This plans can allow to flag a dish to "NEW"
export const dishNewFlagAllowPlanArray = ["SUB_ELITE"];

export const bankAccountTypeList = [
  { label: "Checking", type: "CHECKING" },
  { label: "Savings", type: "SAVINGS" },
];

export const bankPaymentMethodList = [
  { label: "Cash App", type: "CASHAPP" },
  { label: "Zelle", type: "ZELLE" },
  { label: "PayPal", type: "PAYPAL" },
  { label: "Venmo", type: "VENMO" },
  { label: "Direct Deposit", type: "DIRECT_DEPOSIT" },
  { label: "ACH", type: "ACH" },
  { label: "CHECK", type: "CHECK" },
  { label: "ECHECK", type: "ECHECK" },
  { label: "WIRE", type: "WIRE" },
];

export const bankCurrencyList = [
  { label: "USD", type: "USD" },
  // { label: "AED", type: "AED" },
  // { label: "FJD", type: "FJD" },
];

export const empNumberList = [
  { label: "EIN", type: "ein" },
  { label: "SSN", type: "ssn" },
];

export const discountTypeList = [
  { label: "Percentage", type: "PERCENTAGE", txt: "" },
  { label: "Fixed", type: "FIXED", txt: "" },
];

export const PaymentMethodNames = {
  COD: "Cash on Pickup",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
};
