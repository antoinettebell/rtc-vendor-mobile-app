import Config from "react-native-config";
import {
  ADD_BANK_DETAIL,
  ADD_FOOD_CATEGORY,
  ADD_FOOD_ITEM,
  ADD_REVIEW,
  CUISINE,
  GET_ADD_ONS,
  GET_BANK_DETAIL,
  GET_DIET_LIST,
  GET_FOODTRUCK_DETAILS,
  GET_FOOD_CATEGORY,
  GET_FOOD_ITEM,
  GET_MEAT_LIST,
  GET_ORDER_BY_ID,
  GET_ORDER_LIST,
  GET_PLANS_DATA,
  GET_REVIEW_BY_FOODTRUCK_ID,
  GET_REVIEW_STATS_BY_FOODTRUCK_ID,
  GET_USER_DETAILS,
  MEDIA_UPLOAD,
  REGISTER_COMPLETE,
  REMOVE_ACCOUNT,
  REMOVE_FCM_TOKEN,
  REMOVE_FOOD_CATEGORY,
  REMOVE_FOOD_ITEM,
  REMOVE_LOCATION,
  REVERSE_LOCATION,
  SET_FCM_TOKEN,
  UPDATE_FCM_TOKEN,
  UPDATE_FOODTRUCK,
  UPDATE_FOOD_CATEGORY,
  UPDATE_FOOD_ITEM,
  UPDATE_ORDER_STATUS,
  UPDATE_REVIEW_BY_ID,
  UPDATE_SUBSCRIPTION_PLAN,
  UPDATE_USER_DETAILS,
} from "./apiEndPoint";
import apiClient from "./apiClient";

// Reverse Location for Place Detail
export const getLocationDetailsFromLatLong = async (payload) => {
  try {
    const { lat, long } = payload;
    const API_KEY = Config.GOOGLE_MAP_API_KEY;

    let URL = `${REVERSE_LOCATION}${lat},${long}&key=${API_KEY}`;

    const response = await fetch(URL);
    const data = await response.json();

    return data;
  } catch (error) {
    console.error("Error getting Location Data:", error);
    throw new Error(error || "Error getting location Data:");
  }
};

// Upload Images
export const uploadImage_API = async (payload) => {
  try {
    const URL = `${MEDIA_UPLOAD}`;
    const response = await apiClient.post(URL, payload, { formData: true });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Cuisine List API
export const cuisineList_API = async (payload) => {
  try {
    const URL = `${CUISINE}?page=${payload.page}&limit=1000`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response;
  }
};

// Update Food Truck Profile
export const updateFoodTruckProfile_API = async ({ payload, foodTruckId }) => {
  try {
    const URL = `${UPDATE_FOODTRUCK}/${foodTruckId}`;
    const response = await apiClient.put(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Get User Detail by user_id
export const getUserDetail_API = async (user_id) => {
  try {
    const URL = `${GET_USER_DETAILS}/${user_id}`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Update User Details by user_id
export const updateUserDetail_API = async ({ payload, user_id }) => {
  try {
    const URL = `${UPDATE_USER_DETAILS}/${user_id}`;
    const response = await apiClient.put(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Get Foodtruck Detail by foodtruck_id
export const getFoodtruckDetail_API = async (foodtruck_id) => {
  try {
    const URL = `${GET_FOODTRUCK_DETAILS}/${foodtruck_id}`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Remove Foodtruck location
export const removeFoodtruckLocation_API = async ({
  foodtruck_id,
  location_id,
}) => {
  try {
    const URL = REMOVE_LOCATION(foodtruck_id, location_id);
    const response = await apiClient.delete(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Get all category
export const getAllCategory_API = async () => {
  try {
    const URL = `${GET_FOOD_CATEGORY}?limit=100`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Get category by ID
export const getCategoryByID_API = async (category_id) => {
  try {
    const URL = `${GET_FOOD_CATEGORY}/${category_id}`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Add new category
export const addCategory_API = async (payload) => {
  try {
    const URL = `${ADD_FOOD_CATEGORY}`;
    const response = await apiClient.post(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Update category by ID
export const updateCategory_API = async ({ payload, category_id }) => {
  try {
    const URL = `${UPDATE_FOOD_CATEGORY}/${category_id}`;
    const response = await apiClient.put(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Remove category by ID
export const removeCategory_API = async (category_id) => {
  try {
    const URL = `${REMOVE_FOOD_CATEGORY}/${category_id}`;
    const response = await apiClient.delete(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Get all food items by category_id
export const getAllFoodItemsByCatID_API = async (category_id) => {
  try {
    const URL = `${GET_FOOD_ITEM}?categoryId=${category_id}&limit=100`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Get food item by food-item-id
export const getFoodItemByID_API = async (fooditem_id) => {
  try {
    const URL = `${GET_FOOD_ITEM}/${fooditem_id}`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Get all food item
export const getAllFoodItem_API = async () => {
  try {
    const URL = `${GET_FOOD_ITEM}?limit=1000`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Add new food itme
export const addFooditem_API = async (payload) => {
  try {
    const URL = `${ADD_FOOD_ITEM}`;
    const response = await apiClient.post(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Update food-item by ID
export const updateFooditemByID_API = async ({ payload, fooditem_id }) => {
  try {
    const URL = `${UPDATE_FOOD_ITEM}/${fooditem_id}`;
    const response = await apiClient.put(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Remove food-item by ID
export const removeFooditemByID_API = async (fooditem_id) => {
  try {
    const URL = `${REMOVE_FOOD_ITEM}/${fooditem_id}`;
    const response = await apiClient.delete(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Get Plans Data
export const getPlansData_API = async () => {
  try {
    const URL = `${GET_PLANS_DATA}`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Get Diet List
export const getDietList_API = async () => {
  try {
    const URL = `${GET_DIET_LIST}?limit=1000`;
    const response = await apiClient.get(URL, { skipToken: true });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Get Order List
export const getOrderList_API = async ({
  page = 1,
  limit = 20,
  status = null,
  advance = undefined,
} = {}) => {
  try {
    let URL = `${GET_ORDER_LIST}`;

    // Build query string with required and optional parameters
    const queryParams = [`page=${page}`, `limit=${limit}`];

    // Add optional parameters if they exist
    if (status) {
      queryParams.push(`orderStatus=${status}`);
    }
    if (advance !== undefined) {
      queryParams.push(`advance=${advance}`);
    }

    URL += `?${queryParams.join("&")}`;

    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Get Order by order id
export const getOrderByID_API = async (order_id) => {
  try {
    const URL = `${GET_ORDER_BY_ID}/${order_id}`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Update order status by order-id
export const updateOrderStatusByID_API = async ({ order_id, payload }) => {
  try {
    const URL = `${UPDATE_ORDER_STATUS}/${order_id}`;
    const response = await apiClient.put(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Set FCM Token
export const setFcmToken_API = async (payload) => {
  try {
    const URL = `${SET_FCM_TOKEN}`;
    const response = await apiClient.post(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Update FCM Token
export const updateFcmToken_API = async ({ deviceId, payload }) => {
  try {
    const URL = UPDATE_FCM_TOKEN(deviceId);
    const response = await apiClient.put(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Remove FCM Token
export const removeFcmToken_API = async (device_id) => {
  try {
    const URL = REMOVE_FCM_TOKEN(device_id);
    const response = await apiClient.delete(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Add review & reating
export const addReviewRating_API = async (payload) => {
  try {
    const URL = `${ADD_REVIEW}`;
    const response = await apiClient.post(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// Update review & reating
export const updateReviewRating_API = async ({ review_id, payload }) => {
  try {
    const URL = UPDATE_REVIEW_BY_ID(review_id);
    const response = await apiClient.put(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// get review & reating stats of food-truck
export const getReviewRatingStats_API = async (foodTruck_id) => {
  try {
    const URL = GET_REVIEW_STATS_BY_FOODTRUCK_ID(foodTruck_id);
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// get review & reating of food-truck
export const getReviewRating_API = async (params = {}) => {
  try {
    const { foodTruck_id, page = 1, limit = 10 } = params;
    let URL = `${GET_REVIEW_BY_FOODTRUCK_ID}`;

    // Build query string with required and optional parameters
    const queryParams = [
      `foodTruckId=${foodTruck_id}`,
      `page=${page}`,
      `limit=${limit}`,
    ];

    URL += `?${queryParams.join("&")}`;

    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// update foodtruck subscription
export const updateFoodtruckSubscription_API = async (payload) => {
  try {
    const URL = `${UPDATE_SUBSCRIPTION_PLAN}`;
    const response = await apiClient.put(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// add bank details
export const addBankDetail_API = async (payload) => {
  try {
    const URL = `${ADD_BANK_DETAIL}`;
    const response = await apiClient.post(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// get bank details
export const getBankDetail_API = async () => {
  try {
    const URL = `${GET_BANK_DETAIL}`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// get meat list
export const getMeatList_API = async () => {
  try {
    const URL = `${GET_MEAT_LIST}`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// delete account
export const deleteAccount_API = async () => {
  try {
    const URL = `${REMOVE_ACCOUNT}`;
    const response = await apiClient.delete(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// registration complete
export const registerComplete_API = async () => {
  try {
    const URL = `${REGISTER_COMPLETE}`;
    const response = await apiClient.patch(URL, undefined, {
      skipToken: false,
    });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};

// add-ons for subscription
export const getAddOnsPlans_API = async () => {
  try {
    const URL = `${GET_ADD_ONS}?limit=100`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data;
  }
};
