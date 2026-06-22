// Auth
export const LOGIN = "/auth/vendor-login";
export const EMPLOYEE_LOGIN = "/auth/employee-login";
export const VERIFY_OTP = "/auth/verify-otp";
export const FORGOT_PASSWORD = "/auth/forgot-password";
export const CHANGE_PASSWORD = "/auth/change-password";
export const REGISTER_VENDOR = "/auth/register/vendor";
export const RESEND_OTP = "/auth/resend-otp";
export const REMOVE_ACCOUNT = "/user";

// Food Truck
export const CUISINE = "/cuisine";
export const MEDIA_UPLOAD = "/file";
export const UPDATE_FOODTRUCK = "/food-truck";
export const GET_FOODTRUCK_DETAILS = "/food-truck";
export const REGISTER_COMPLETE = "/food-truck/complete";
export const UPDATE_FOOD_TRUCK_UNITS = (foodtruck_id) =>
  `/food-truck/${foodtruck_id}/truck-units`;
export const UPDATE_FOOD_TRUCK_UNIT = (foodtruck_id, truck_unit_id) =>
  `/food-truck/${foodtruck_id}/truck-units/${truck_unit_id}`;

// Subscription
export const UPDATE_SUBSCRIPTION_PLAN = "/food-truck/change-plan";
export const UPDATE_SUBSCRIPTION_ADD_ONS = "/food-truck/change-add-on-plan";
export const VENDOR_EMPLOYEE = "/vendor-employee";
export const VENDOR_EMPLOYEE_BY_ID = (employee_id) =>
  `/vendor-employee/${employee_id}`;
export const ARCHIVE_VENDOR_EMPLOYEE = (employee_id) =>
  `/vendor-employee/${employee_id}/archive`;
export const RESET_VENDOR_EMPLOYEE_PIN = (employee_id) =>
  `/vendor-employee/${employee_id}/reset-pin`;
export const EMPLOYEE_DASHBOARD = "/vendor-employee/dashboard";
export const END_EMPLOYEE_SESSION = "/vendor-employee/session/end";
export const TOGGLE_EMPLOYEE_DUTY = "/vendor-employee/session/duty";
export const EMPLOYEE_SHIFT_ACTION = "/vendor-employee/session/action";
export const EMPLOYEE_ORDERS = "/vendor-employee/orders";
export const REFUND_CANCEL_REQUESTS = "/vendor-employee/refund-cancel-requests";
export const REVIEW_REFUND_CANCEL_REQUEST = (request_id) =>
  `/vendor-employee/refund-cancel-requests/${request_id}/review`;

// Add-ons
export const GET_ADD_ONS = "/public/add-ons";

// Event Marketplace
export const MARKETPLACE_OPEN_EVENTS = "/marketplace/events/open";
export const MARKETPLACE_EVENT_BY_ID = (event_id) =>
  `/marketplace/events/${event_id}`;
export const MARKETPLACE_EVENT_BIDS = (event_id) =>
  `/marketplace/events/${event_id}/bids`;
export const MARKETPLACE_EVENT_APPLICATIONS = (event_id) =>
  `/marketplace/events/${event_id}/applications`;
export const MARKETPLACE_EVENT_QUESTIONS = (event_id) =>
  `/marketplace/events/${event_id}/questions`;
export const MARKETPLACE_BID_ATTACHMENTS = (bid_id) =>
  `/marketplace/bids/${bid_id}/attachments`;
export const MARKETPLACE_APPLICATION_ATTACHMENTS = (application_id) =>
  `/marketplace/applications/${application_id}/attachments`;
export const MARKETPLACE_APPLICATION_VENDOR_FEE_PAYMENT = (application_id) =>
  `/marketplace/applications/${application_id}/vendor-fee-payment`;
export const MARKETPLACE_MY_BIDS = "/marketplace/bids/my";
export const MARKETPLACE_MY_APPLICATIONS = "/marketplace/applications/my";
export const MARKETPLACE_AWARDED_BIDS = "/marketplace/bids/awarded";
export const MARKETPLACE_PAYMENT_BY_ID = (payment_id) =>
  `/marketplace/payments/${payment_id}`;
export const MARKETPLACE_PAYMENT_CALL = (payment_id) =>
  `/marketplace/payments/${payment_id}/call`;
export const MARKETPLACE_PAYMENT_CHECKOUT = (payment_id) =>
  `/marketplace/payments/${payment_id}/checkout`;

// Bank Detail
export const ADD_BANK_DETAIL = "/user/bank-detail";
export const GET_BANK_DETAIL = "/user/bank-detail";

// User Profile
export const GET_USER_DETAILS = "/user";
export const UPDATE_USER_DETAILS = "/user";
export const UPDATE_PASSWORD = (user_id) => `/user/${user_id}/change-password`;
export const REMOVE_LOCATION = (foodtruck_id, location_id) =>
  `/food-truck/${foodtruck_id}/location/${location_id}`;
export const UPDATE_LOCATION_ORDERING = (foodtruck_id, location_id) =>
  `/food-truck/${foodtruck_id}/location/${location_id}/ordering-open`;

// TnC & Privacy-Policy & agreement
export const TNC = "/public/terms-conditions";
export const PRIVACY_POLICY = "/public/privacy-policy";
export const AGREEMENT = "/public/agreement";

// Menu
export const GET_DEFAULT_CATEGORY = "/categories";
export const GET_FOOD_CATEGORY = "/category";
export const ADD_FOOD_CATEGORY = "/category";
export const UPDATE_FOOD_CATEGORY = "/category";
export const REMOVE_FOOD_CATEGORY = "/category";

// Meat
export const GET_MEAT_LIST = "/meat";
export const GET_COMMON_LIST = "/public/common-list"; // type: discount | meat_wellness

// Food Item (Dish)
export const ADD_FOOD_ITEM = "/menu";
export const UPDATE_FOOD_ITEM = "/menu";
export const GET_FOOD_ITEM = "/menu";
export const REMOVE_FOOD_ITEM = "/menu";
export const CHANGE_MENU_AVAILABILITY = "/menu/change-availability";

// Plans
export const GET_PLANS_DATA = "/public/plan";

// Diet
export const GET_DIET_LIST = "/public/diet";

// Order
export const GET_ORDER_LIST = "/order";
export const GET_ORDER_BY_ID = "/order";
export const UPDATE_ORDER_STATUS = "/order";
export const VALIDATE_ORDER = "/order/validate-order";
export const PLACE_FOOD_ORDER = "/order";
export const PAYMENT_CHECKOUT = "/order/payment-checkout";
export const REFUND_ORDER = (order_id) => `/order/${order_id}/refund`;
export const GET_TAX_OF_LOCATION = (foodTruck_id, location_id, amount) =>
  `/public/avalaratax-rates-check?foodTruckId=${foodTruck_id}&locationId=${location_id}&amount=${amount}`;

// Notification
export const SET_FCM_TOKEN = "/user/set-fcm-token";
export const UPDATE_FCM_TOKEN = (device_id) =>
  `/user/update-fcm-token/${device_id}`;
export const REMOVE_FCM_TOKEN = (device_id) =>
  `/user/remove-fcm-token/${device_id}`;

// Ratings and Review
export const ADD_REVIEW = "/review";
export const UPDATE_REVIEW_BY_ID = (review_id) => `/review/${review_id}`;
export const GET_REVIEW_BY_FOODTRUCK_ID = "/review";
export const GET_REVIEW_STATS_BY_FOODTRUCK_ID = (foodTruck_id) =>
  `/review/stats?foodTruckId=${foodTruck_id}`;
export const GET_A_REVIEW_BY_ID = (review_id) => `/review/${review_id}`;
export const REMOVE_A_REVIEW_BY_ID = (review_id) => `/review/${review_id}`;

// earning
export const GET_EARNINGS = "/order/vendor/earnings";
export const GET_EARNING_LIST = "/order/vendor/earning_list";
export const GET_EARNINGS_HOMESCREEN = "/order/vendor/dashboard";

// Get Location Name from Lat Long
export const REVERSE_LOCATION =
  "https://maps.googleapis.com/maps/api/geocode/json?latlng=";
