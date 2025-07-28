// Auth
export const LOGIN = "/auth/vendor-login";
export const VERIFY_OTP = "/auth/verify-otp";
export const FORGOT_PASSWORD = "/auth/forgot-password";
export const CHANGE_PASSWORD = "/auth/change-password";
export const REGISTER_VENDOR = "auth/register/vendor";
export const RESEND_OTP = "/auth/resend-otp";
export const REMOVE_ACCOUNT = "/user";

// Food Truck
export const CUISINE = "/cuisine";
export const MEDIA_UPLOAD = "/file";
export const UPDATE_FOODTRUCK = "/food-truck";
export const GET_FOODTRUCK_DETAILS = "/food-truck";

// Subscription
export const UPDATE_SUBSCRIPTION_PLAN = "/food-truck/change-plan";

// Bank Detail
export const ADD_BANK_DETAIL = "/user/bank-detail";
export const GET_BANK_DETAIL = "/user/bank-detail";

// User Profile
export const GET_USER_DETAILS = "/user";
export const UPDATE_USER_DETAILS = "/user";
export const UPDATE_PASSWORD = (user_id) => `/user/${user_id}/change-password`;
export const REMOVE_LOCATION = (foodtruck_id, location_id) =>
  `/food-truck/${foodtruck_id}/location/${location_id}`;

// TnC & Privacy-Policy & agreement
export const TNC = "/public/terms-conditions";
export const PRIVACY_POLICY = "/public/privacy-policy";
export const AGREEMENT = "/public/agreement";

// Menu
export const GET_FOOD_CATEGORY = "/category";
export const ADD_FOOD_CATEGORY = "/category";
export const UPDATE_FOOD_CATEGORY = "/category";
export const REMOVE_FOOD_CATEGORY = "/category";

// Meat
export const GET_MEAT_LIST = "/meat";

// Food Item (Dish)
export const ADD_FOOD_ITEM = "/menu";
export const UPDATE_FOOD_ITEM = "/menu";
export const GET_FOOD_ITEM = "/menu";
export const REMOVE_FOOD_ITEM = "/menu";

// Plans
export const GET_PLANS_DATA = "/public/plan";

// Diet
export const GET_DIET_LIST = "/public/diet";

// Order
export const GET_ORDER_LIST = "/order";
export const GET_ORDER_BY_ID = "/order";
export const UPDATE_ORDER_STATUS = "/order";

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

// Get Location Name from Lat Long
export const REVERSE_LOCATION =
  "https://maps.googleapis.com/maps/api/geocode/json?latlng=";
