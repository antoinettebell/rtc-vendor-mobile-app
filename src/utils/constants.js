export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,15}$/;

export const PROFILE_MENU_IMAGES = {
  yourProfile: require("../assets/images/yourProfileIcon.png"),
  servingLocations: require("../assets/images/servingLocationIcon.png"),
  cuisine: require("../assets/images/cuiniesIcon.png"),
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
  completed: "COMPLETED",
};

export const orderNextStatusNames = {
  PLACED: "Place",
  CANCEL: "Cancel",
  ACCEPTED: "Accept",
  REJECTED: "Reject",
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Ready for pickup",
  COMPLETED: "Complete",
};

export const orderCurrentStatusNames = {
  PLACED: "Placed",
  CANCEL: "Cancel",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Ready for pickup",
  COMPLETED: "Completed",
};

export const notificationTypes = {
  new_order: "NEW_ORDER",
  order_cancelled: "ORDER_CANCELLED",
  order_accepted: "ORDER_ACCEPTED",
  order_rejected: "ORDER_REJECTED",
  order_preparing: "ORDER_PREPARING",
  order_ready_for_pickup: "ORDER_READY_FOR_PICKUP",
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

export const foodTypeList = [
  { label: "Individual", type: "INDIVIDUAL" },
  { label: "Combo", type: "COMBO" },
];

export const foodTypeStrings = {
  individual: "INDIVIDUAL",
  combo: "COMBO",
};

// This plans can allow to flag a dish to "NEW"
export const dishNewFlagAllowPlanArray = ["SUB_PLATINUM", "SUB_ELITE"];

export const bankAccountTypeList = [
  { label: "Checking", type: "CHECKING" },
  { label: "Savings", type: "SAVINGS" },
];

export const empNumberList = [
  { label: "EIN", type: "ein" },
  { label: "SSN", type: "ssn" },
];

export const discountTypeList = [
  { label: "Percentage", type: "PERCENTAGE", txt: "" },
  { label: "Fixed", type: "FIXED", txt: "" },
];
