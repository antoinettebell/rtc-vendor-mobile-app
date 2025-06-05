import Config from "react-native-config";
import {
  ADD_FOOD_CATEGORY,
  ADD_FOOD_ITEM,
  CUISINE,
  GET_DIET_LIST,
  GET_FOODTRUCK_DETAILS,
  GET_FOOD_CATEGORY,
  GET_FOOD_ITEM,
  GET_PLANS_DATA,
  GET_USER_DETAILS,
  MEDIA_UPLOAD,
  REMOVE_FOOD_CATEGORY,
  REMOVE_FOOD_ITEM,
  REMOVE_LOCATION,
  REVERSE_LOCATION,
  UPDATE_FOODTRUCK,
  UPDATE_FOOD_CATEGORY,
  UPDATE_FOOD_ITEM,
  UPDATE_USER_DETAILS,
} from "./apiEndPoint";
import apiClient from "./apiClient";

// Reverse Location
export const getLocationName = async (payload) => {
  try {
    const { lat, long } = payload;
    const API_KEY = Config.GOOGLE_MAP_API_KEY;

    let URL = `${REVERSE_LOCATION}${lat},${long}&key=${API_KEY}`;

    const response = await fetch(URL);
    const data = await response.json();

    return data;
  } catch (error) {
    console.error("Error getting Location Name:", error);
    throw new Error(error || "Error getting location Name:");
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
    const URL = `${CUISINE}?page=${payload.page}&limit=100`;
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
