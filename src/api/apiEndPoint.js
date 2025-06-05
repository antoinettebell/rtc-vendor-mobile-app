export const LOGIN = "/auth/vendor-login";
export const VERIFY_OTP = "/auth/verify-otp";
export const FORGOT_PASSWORD = "/auth/forgot-password";
export const CHANGE_PASSWORD = "/auth/change-password";
export const REGISTER_VENDOR = "auth/register/vendor";
export const RESEND_OTP = "/auth/resend-otp";
export const CUISINE = "/cuisine";
export const MEDIA_UPLOAD = "/file";
export const UPDATE_FOODTRUCK = "/food-truck";
export const GET_FOODTRUCK_DETAILS = "/food-truck";
export const UPDATE_PASSWORD = (user_id) => `/user/${user_id}/change-password`;
export const GET_USER_DETAILS = "/user";
export const UPDATE_USER_DETAILS = "/user";
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

// Food Item (Dish)
export const ADD_FOOD_ITEM = "/menu";
export const UPDATE_FOOD_ITEM = "/menu";
export const GET_FOOD_ITEM = "/menu";
export const REMOVE_FOOD_ITEM = "/menu";

// Plans
export const GET_PLANS_DATA = "/public/plan";

// Diet
export const GET_DIET_LIST = "/public/diet";

// Get Location Name from Lat Long
export const REVERSE_LOCATION =
  "https://maps.googleapis.com/maps/api/geocode/json?latlng=";
