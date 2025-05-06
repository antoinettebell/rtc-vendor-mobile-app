import Config from "react-native-config";
import {
  CUISINE,
  MEDIA_UPLOAD,
  REVERSE_LOCATION,
  UPDATE_FOODTRUCK,
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
    const URL = `${CUISINE}?page=${payload.page}&limit=50`;
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
