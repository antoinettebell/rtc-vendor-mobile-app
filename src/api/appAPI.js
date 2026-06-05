import Config from "react-native-config";
import apiClient from "./apiClient";
import {
  ADD_BANK_DETAIL,
  ADD_FOOD_CATEGORY,
  ADD_FOOD_ITEM,
  ARCHIVE_VENDOR_EMPLOYEE,
  ADD_REVIEW,
  CHANGE_MENU_AVAILABILITY,
  CUISINE,
  GET_ADD_ONS,
  GET_BANK_DETAIL,
  GET_COMMON_LIST,
  GET_DEFAULT_CATEGORY,
  GET_DIET_LIST,
  GET_EARNINGS,
  GET_EARNINGS_HOMESCREEN,
  GET_EARNING_LIST,
  GET_FOODTRUCK_DETAILS,
  GET_FOOD_CATEGORY,
  GET_FOOD_ITEM,
  GET_MEAT_LIST,
  GET_ORDER_BY_ID,
  GET_ORDER_LIST,
  GET_PLANS_DATA,
  GET_TAX_OF_LOCATION,
  PAYMENT_CHECKOUT,
  PLACE_FOOD_ORDER,
  GET_REVIEW_BY_FOODTRUCK_ID,
  GET_REVIEW_STATS_BY_FOODTRUCK_ID,
  GET_USER_DETAILS,
  MARKETPLACE_APPLICATION_ATTACHMENTS,
  MARKETPLACE_APPLICATION_VENDOR_FEE_PAYMENT,
  MARKETPLACE_AWARDED_BIDS,
  MARKETPLACE_BID_ATTACHMENTS,
  MARKETPLACE_EVENT_APPLICATIONS,
  MARKETPLACE_EVENT_BIDS,
  MARKETPLACE_EVENT_BY_ID,
  MARKETPLACE_EVENT_QUESTIONS,
  MARKETPLACE_MY_APPLICATIONS,
  MARKETPLACE_MY_BIDS,
  MARKETPLACE_OPEN_EVENTS,
  MARKETPLACE_PAYMENT_BY_ID,
  MARKETPLACE_PAYMENT_CALL,
  MARKETPLACE_PAYMENT_CHECKOUT,
  MEDIA_UPLOAD,
  REGISTER_COMPLETE,
  REMOVE_ACCOUNT,
  REMOVE_FCM_TOKEN,
  REMOVE_FOOD_CATEGORY,
  REMOVE_FOOD_ITEM,
  REMOVE_LOCATION,
  REFUND_ORDER,
  REVERSE_LOCATION,
  SET_FCM_TOKEN,
  UPDATE_FCM_TOKEN,
  UPDATE_FOODTRUCK,
  UPDATE_FOOD_CATEGORY,
  UPDATE_FOOD_ITEM,
  UPDATE_LOCATION_ORDERING,
  UPDATE_ORDER_STATUS,
  UPDATE_REVIEW_BY_ID,
  UPDATE_SUBSCRIPTION_ADD_ONS,
  UPDATE_SUBSCRIPTION_PLAN,
  UPDATE_USER_DETAILS,
  VALIDATE_ORDER,
  EMPLOYEE_DASHBOARD,
  EMPLOYEE_ORDERS,
  EMPLOYEE_SHIFT_ACTION,
  END_EMPLOYEE_SESSION,
  TOGGLE_EMPLOYEE_DUTY,
  REFUND_CANCEL_REQUESTS,
  REVIEW_REFUND_CANCEL_REQUEST,
  RESET_VENDOR_EMPLOYEE_PIN,
  VENDOR_EMPLOYEE,
  VENDOR_EMPLOYEE_BY_ID,
} from "./apiEndPoint";

/**
 * Location-Related APIs
 */

/**
 * Get location details from latitude and longitude
 * @param {Object} payload - Request payload
 * @param {number} payload.lat - Latitude coordinate
 * @param {number} payload.long - Longitude coordinate
 * @returns {Promise<Object>} Location data from Google Maps API
 */
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

/**
 * Media-Related APIs
 */

/**
 * Upload images to the server
 * @param {FormData} payload - Form data containing images to upload
 * @returns {Promise<Object>} Uploaded image data
 */
export const uploadImage_API = async (payload) => {
  try {
    const URL = `${MEDIA_UPLOAD}`;
    const response = await apiClient.post(URL, payload, { formData: true });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Event Marketplace APIs
 */
export const getMarketplaceOpenEvents_API = async ({
  page = 1,
  limit = 50,
} = {}) => {
  try {
    const URL = `${MARKETPLACE_OPEN_EVENTS}?page=${page}&limit=${limit}`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const getMarketplaceEventById_API = async (event_id) => {
  try {
    const response = await apiClient.get(MARKETPLACE_EVENT_BY_ID(event_id), {
      skipToken: false,
    });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const getMarketplaceEventQuestions_API = async (event_id) => {
  try {
    const response = await apiClient.get(MARKETPLACE_EVENT_QUESTIONS(event_id), {
      skipToken: false,
    });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const askMarketplaceEventQuestion_API = async ({ event_id, question_text }) => {
  try {
    const response = await apiClient.post(
      MARKETPLACE_EVENT_QUESTIONS(event_id),
      { question_text },
      { skipToken: false },
    );
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const submitMarketplaceBid_API = async ({ event_id, payload }) => {
  try {
    const response = await apiClient.post(
      MARKETPLACE_EVENT_BIDS(event_id),
      payload,
      { skipToken: false },
    );
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const uploadMarketplaceBidAttachment_API = async ({ bid_id, payload }) => {
  try {
    const response = await apiClient.post(
      MARKETPLACE_BID_ATTACHMENTS(bid_id),
      payload,
      { formData: true, skipToken: false },
    );
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const submitMarketplaceApplication_API = async ({ event_id, payload }) => {
  try {
    const response = await apiClient.post(
      MARKETPLACE_EVENT_APPLICATIONS(event_id),
      payload,
      { skipToken: false },
    );
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const uploadMarketplaceApplicationAttachment_API = async ({
  application_id,
  payload,
}) => {
  try {
    const response = await apiClient.post(
      MARKETPLACE_APPLICATION_ATTACHMENTS(application_id),
      payload,
      { formData: true, skipToken: false },
    );
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const createMarketplaceApplicationVendorFeePayment_API = async (
  application_id,
) => {
  try {
    const response = await apiClient.post(
      MARKETPLACE_APPLICATION_VENDOR_FEE_PAYMENT(application_id),
      {},
      { skipToken: false },
    );
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const getMarketplaceMyBids_API = async () => {
  try {
    const response = await apiClient.get(MARKETPLACE_MY_BIDS, {
      skipToken: false,
    });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const getMarketplaceMyApplications_API = async () => {
  try {
    const response = await apiClient.get(MARKETPLACE_MY_APPLICATIONS, {
      skipToken: false,
    });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const getMarketplaceAwardedBids_API = async () => {
  try {
    const response = await apiClient.get(MARKETPLACE_AWARDED_BIDS, {
      skipToken: false,
    });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const getMarketplacePaymentById_API = async (payment_id) => {
  try {
    const response = await apiClient.get(MARKETPLACE_PAYMENT_BY_ID(payment_id), {
      skipToken: false,
    });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const callMarketplacePayment_API = async (payment_id) => {
  try {
    const response = await apiClient.post(
      MARKETPLACE_PAYMENT_CALL(payment_id),
      {},
      { skipToken: false },
    );
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const checkoutMarketplacePayment_API = async ({
  payment_id,
  payload,
}) => {
  try {
    const response = await apiClient.post(
      MARKETPLACE_PAYMENT_CHECKOUT(payment_id),
      payload,
      { skipToken: false },
    );
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * User-Related APIs
 */

/**
 * Get user details by user ID
 * @param {string} user_id - User ID to fetch details for
 * @returns {Promise<Object>} User details data
 */
export const getUserDetail_API = async (user_id) => {
  try {
    const URL = `${GET_USER_DETAILS}/${user_id}`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Update user details by user ID
 * @param {Object} params - Request parameters
 * @param {Object} params.payload - User data to update
 * @param {string} params.user_id - User ID to update details for
 * @returns {Promise<Object>} Updated user data
 */
export const updateUserDetail_API = async ({ payload, user_id }) => {
  try {
    const URL = `${UPDATE_USER_DETAILS}/${user_id}`;
    const response = await apiClient.put(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Delete user account
 * @returns {Promise<Object>} Account deletion confirmation
 */
export const deleteAccount_API = async () => {
  try {
    const URL = `${REMOVE_ACCOUNT}`;
    const response = await apiClient.delete(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Mark registration as complete
 * @returns {Promise<Object>} Registration completion confirmation
 */
export const registerComplete_API = async () => {
  try {
    const URL = `${REGISTER_COMPLETE}`;
    const response = await apiClient.patch(URL, undefined, {
      skipToken: false,
    });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Food Truck-Related APIs
 */

/**
 * Get food truck details by ID
 * @param {string} foodtruck_id - Food truck ID to fetch details for
 * @returns {Promise<Object>} Food truck details data
 */
export const getFoodtruckDetail_API = async (foodtruck_id) => {
  try {
    const URL = `${GET_FOODTRUCK_DETAILS}/${foodtruck_id}`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Update food truck profile
 * @param {Object} params - Request parameters
 * @param {Object} params.payload - Food truck data to update
 * @param {string} params.foodTruckId - Food truck ID to update
 * @returns {Promise<Object>} Updated food truck data
 */
export const updateFoodTruckProfile_API = async ({ payload, foodTruckId }) => {
  try {
    const URL = `${UPDATE_FOODTRUCK}/${foodTruckId}`;
    const response = await apiClient.put(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Remove food truck location
 * @param {Object} params - Request parameters
 * @param {string} params.foodtruck_id - Food truck ID
 * @param {string} params.location_id - Location ID to remove
 * @returns {Promise<Object>} Location removal confirmation
 */
export const removeFoodtruckLocation_API = async ({
  foodtruck_id,
  location_id,
}) => {
  try {
    const URL = REMOVE_LOCATION(foodtruck_id, location_id);
    const response = await apiClient.delete(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const updateLocationOrdering_API = async ({
  foodtruck_id,
  location_id,
  isOrderingOpen,
}) => {
  try {
    const URL = UPDATE_LOCATION_ORDERING(foodtruck_id, location_id);
    const response = await apiClient.patch(
      URL,
      { isOrderingOpen },
      { skipToken: false },
    );
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Category-Related APIs
 */

/**
 * Get all default categories
 * @returns {Promise<Object>} List of default categories
 */
export const getDefaultCategories_API = async () => {
  try {
    const URL = `${GET_DEFAULT_CATEGORY}?limit=100`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Get all food categories
 * @returns {Promise<Object>} List of food categories
 */
export const getAllCategory_API = async () => {
  try {
    const URL = `${GET_FOOD_CATEGORY}?limit=100`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Get category by ID
 * @param {string} category_id - Category ID to fetch
 * @returns {Promise<Object>} Category details
 */
export const getCategoryByID_API = async (category_id) => {
  try {
    const URL = `${GET_FOOD_CATEGORY}/${category_id}`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Add new food category
 * @param {Object} payload - Category data to add
 * @returns {Promise<Object>} Added category data
 */
export const addCategory_API = async (payload) => {
  try {
    const URL = `${ADD_FOOD_CATEGORY}`;
    const response = await apiClient.post(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Update category by ID
 * @param {Object} params - Request parameters
 * @param {Object} params.payload - Category data to update
 * @param {string} params.category_id - Category ID to update
 * @returns {Promise<Object>} Updated category data
 */
export const updateCategory_API = async ({ payload, category_id }) => {
  try {
    const URL = `${UPDATE_FOOD_CATEGORY}/${category_id}`;
    const response = await apiClient.put(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Remove category by ID
 * @param {string} category_id - Category ID to remove
 * @returns {Promise<Object>} Category removal confirmation
 */
export const removeCategory_API = async (category_id) => {
  try {
    const URL = `${REMOVE_FOOD_CATEGORY}/${category_id}`;
    const response = await apiClient.delete(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Food Item-Related APIs
 */

/**
 * Get all food items by category ID
 * @param {string} category_id - Category ID to filter food items
 * @returns {Promise<Object>} List of food items for the category
 */
export const getAllFoodItemsByCatID_API = async (category_id) => {
  try {
    const URL = `${GET_FOOD_ITEM}?categoryId=${category_id}&limit=100`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Get food item by ID
 * @param {string} fooditem_id - Food item ID to fetch
 * @returns {Promise<Object>} Food item details
 */
export const getFoodItemByID_API = async (fooditem_id) => {
  try {
    const URL = `${GET_FOOD_ITEM}/${fooditem_id}`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Get all food items
 * @returns {Promise<Object>} List of all food items
 */
export const getAllFoodItem_API = async () => {
  try {
    const URL = `${GET_FOOD_ITEM}?limit=1000`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Add new food item
 * @param {Object} payload - Food item data to add
 * @returns {Promise<Object>} Added food item data
 */
export const addFooditem_API = async (payload) => {
  try {
    const URL = `${ADD_FOOD_ITEM}`;
    const response = await apiClient.post(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Update food item by ID
 * @param {Object} params - Request parameters
 * @param {Object} params.payload - Food item data to update
 * @param {string} params.fooditem_id - Food item ID to update
 * @returns {Promise<Object>} Updated food item data
 */
export const updateFooditemByID_API = async ({ payload, fooditem_id }) => {
  try {
    const URL = `${UPDATE_FOOD_ITEM}/${fooditem_id}`;
    const response = await apiClient.put(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Update food availability by ID
 * @param {Object} params - Request parameters
 * @param {Object} params.payload - Food item data to update
 * @param {string} params.fooditem_id - Food item ID to update
 * @returns {Promise<Object>} Updated food item data
 */
export const updateFooditemAvailabilityByID_API = async ({
  payload,
  fooditem_id,
}) => {
  try {
    const URL = `${CHANGE_MENU_AVAILABILITY}/${fooditem_id}`;
    const response = await apiClient.put(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Remove food item by ID
 * @param {string} fooditem_id - Food item ID to remove
 * @returns {Promise<Object>} Food item removal confirmation
 */
export const removeFooditemByID_API = async (fooditem_id) => {
  try {
    const URL = `${REMOVE_FOOD_ITEM}/${fooditem_id}`;
    const response = await apiClient.delete(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Get cuisine list
 * @param {Object} payload - Request payload
 * @param {number} payload.page - Page number for pagination
 * @returns {Promise<Object>} List of cuisines
 */
export const cuisineList_API = async (payload) => {
  try {
    const URL = `${CUISINE}?page=${payload.page}&limit=1000`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response;
  }
};

/**
 * Get diet list
 * @returns {Promise<Object>} List of diets
 */
export const getDietList_API = async () => {
  try {
    const URL = `${GET_DIET_LIST}?limit=1000`;
    const response = await apiClient.get(URL, { skipToken: true });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Get meat list
 * @returns {Promise<Object>} List of meats
 */
export const getMeatList_API = async () => {
  try {
    const URL = `${GET_MEAT_LIST}?limit=1000`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Order-Related APIs
 */

/**
 * Get order list
 * @param {Object} params - Request parameters
 * @param {number} params.page - Page number for pagination (default: 1)
 * @param {number} params.limit - Number of items per page (default: 20)
 * @param {string} params.status - Order status filter (optional)
 * @param {boolean} params.advance - Advance order filter (optional)
 * @returns {Promise<Object>} List of orders
 */
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
    throw error?.response?.data || error;
  }
};

/**
 * Get order by ID
 * @param {string} order_id - Order ID to fetch
 * @returns {Promise<Object>} Order details
 */
export const getOrderByID_API = async (order_id) => {
  try {
    const URL = `${GET_ORDER_BY_ID}/${order_id}`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Update order status by ID
 * @param {Object} params - Request parameters
 * @param {string} params.order_id - Order ID to update
 * @param {Object} params.payload - Order status data to update
 * @returns {Promise<Object>} Updated order data
 */
export const updateOrderStatusByID_API = async ({ order_id, payload }) => {
  try {
    const URL = `${UPDATE_ORDER_STATUS}/${order_id}`;
    const response = await apiClient.put(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const validatePosOrder_API = async (payload) => {
  try {
    const response = await apiClient.post(VALIDATE_ORDER, payload, {
      skipToken: false,
    });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const placePosOrder_API = async (payload) => {
  try {
    const response = await apiClient.post(PLACE_FOOD_ORDER, payload, {
      skipToken: false,
    });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const paymentCheckout_API = async (payload) => {
  try {
    const response = await apiClient.post(PAYMENT_CHECKOUT, payload, {
      skipToken: false,
    });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const refundOrder_API = async ({ order_id, payload = {} }) => {
  try {
    const response = await apiClient.post(REFUND_ORDER(order_id), payload, {
      skipToken: false,
    });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const checkPosTax_API = async (params = {}) => {
  try {
    const URL = GET_TAX_OF_LOCATION(
      params?.foodTruck_id,
      params?.location_id,
      params?.amount,
    );
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Get earning by food truck ID
 * @param {string} foodTruck_id - Food truck ID to fetch
 * @param {string} startDate - Start date UTC for earning range (optional)
 * @param {string} endDate - End date UTC for earning range (optional)
 * @returns {Promise<Object>} Earning details
 */
export const getEarningByFoodTruckID_API = async ({
  foodTruck_id,
  startDate = null,
  endDate = null,
  locationId = null,
  employeeInternalId = null,
  paymentMethod = null,
  refundCancelStatus = null,
}) => {
  try {
    let URL = GET_EARNINGS;

    // Build query string with required and optional parameters
    const queryParams = [`foodTruckId=${foodTruck_id}`];

    if (startDate) {
      queryParams.push(`startDate=${startDate}`);
    }
    if (endDate) {
      queryParams.push(`endDate=${endDate}`);
    }
    if (locationId) {
      queryParams.push(`locationId=${locationId}`);
    }
    if (employeeInternalId) {
      queryParams.push(`employeeInternalId=${employeeInternalId}`);
    }
    if (paymentMethod) {
      queryParams.push(`paymentMethod=${paymentMethod}`);
    }
    if (refundCancelStatus) {
      queryParams.push(`refundCancelStatus=${refundCancelStatus}`);
    }

    URL += `?${queryParams.join("&")}`;

    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Get earning list by food truck ID
 * @param {string} foodTruck_id - Food truck ID to fetch
 * @param {string} startDate - Start date UTC for earning range (optional)
 * @param {string} endDate - End date UTC for earning range (optional)
 * @param {string} list - Type of list to fetch (default: "normal")
 * @param {string} listType - Earning list type (default: "weekly")
 * @returns {Promise<Object>} Earning details
 */
export const getEarningListByFoodTruckID_API = async ({
  foodTruck_id,
  page = 1,
  limit = 10,
  list = "normal",
  listType = "weekly",
  startDate = null,
  endDate = null,
}) => {
  try {
    let URL = GET_EARNING_LIST;

    // Build query string with required and optional parameters
    const queryParams = [
      `page=${page}`,
      `limit=${limit}`,
      `is_list=${list}`,
      `earning_list=${listType}`,
      `foodTruckId=${foodTruck_id}`,
    ];

    if (startDate) {
      queryParams.push(`startDate=${startDate}`);
    }
    if (endDate) {
      queryParams.push(`endDate=${endDate}`);
    }

    URL += `?${queryParams.join("&")}`;

    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Get earning data for homescreen by food truck ID
 * @param {string} foodTruck_id - Food truck ID to fetch
 * @returns {Promise<Object>} Earning details
 */
export const getEarningForHomeByFoodTruckID_API = async (foodTruck_id) => {
  try {
    const URL = `${GET_EARNINGS_HOMESCREEN}?foodTruckId=${foodTruck_id}`;

    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Review-Related APIs
 */

/**
 * Add review and rating
 * @param {Object} payload - Review and rating data
 * @returns {Promise<Object>} Added review data
 */
export const addReviewRating_API = async (payload) => {
  try {
    const URL = `${ADD_REVIEW}`;
    const response = await apiClient.post(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Update review and rating
 * @param {Object} params - Request parameters
 * @param {string} params.review_id - Review ID to update
 * @param {Object} params.payload - Review data to update
 * @returns {Promise<Object>} Updated review data
 */
export const updateReviewRating_API = async ({ review_id, payload }) => {
  try {
    const URL = UPDATE_REVIEW_BY_ID(review_id);
    const response = await apiClient.put(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Get review and rating stats for a food truck
 * @param {string} foodTruck_id - Food truck ID to get stats for
 * @returns {Promise<Object>} Review statistics
 */
export const getReviewRatingStats_API = async (foodTruck_id) => {
  try {
    const URL = GET_REVIEW_STATS_BY_FOODTRUCK_ID(foodTruck_id);
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Get reviews and ratings for a food truck
 * @param {Object} params - Request parameters
 * @param {string} params.foodTruck_id - Food truck ID to get reviews for
 * @param {number} params.page - Page number for pagination (default: 1)
 * @param {number} params.limit - Number of items per page (default: 10)
 * @returns {Promise<Object>} List of reviews
 */
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
    throw error?.response?.data || error;
  }
};

/**
 * Subscription/Plan-Related APIs
 */

/**
 * Get plans data
 * @returns {Promise<Object>} List of subscription plans
 */
export const getPlansData_API = async () => {
  try {
    const URL = `${GET_PLANS_DATA}`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Update food truck subscription
 * @param {Object} payload - Subscription data to update
 * @returns {Promise<Object>} Updated subscription data
 */
export const updateFoodtruckSubscription_API = async (payload) => {
  try {
    const URL = `${UPDATE_SUBSCRIPTION_PLAN}`;
    const response = await apiClient.put(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Update food truck subscription add-ons
 * @param {Object} payload - Subscription data to update
 * @returns {Promise<Object>} Updated subscription data
 */
export const updateFoodtruckAddons_API = async (payload) => {
  try {
    const URL = `${UPDATE_SUBSCRIPTION_ADD_ONS}`;
    const response = await apiClient.put(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Get add-ons for subscription
 * @returns {Promise<Object>} List of subscription add-ons
 */
export const getAddOnsPlans_API = async () => {
  try {
    const URL = `${GET_ADD_ONS}?limit=100`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const getVendorEmployees_API = async ({
  includeArchived = false,
  archivedOnly = false,
} = {}) => {
  try {
    const URL = `${VENDOR_EMPLOYEE}?includeArchived=${includeArchived}&archivedOnly=${archivedOnly}`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const createVendorEmployee_API = async (payload) => {
  try {
    const response = await apiClient.post(VENDOR_EMPLOYEE, payload, {
      skipToken: false,
    });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const updateVendorEmployee_API = async ({ employee_id, payload }) => {
  try {
    const response = await apiClient.put(
      VENDOR_EMPLOYEE_BY_ID(employee_id),
      payload,
      {
        skipToken: false,
      },
    );
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const resetVendorEmployeePin_API = async ({ employee_id, pin }) => {
  try {
    const response = await apiClient.put(
      RESET_VENDOR_EMPLOYEE_PIN(employee_id),
      { pin },
      { skipToken: false },
    );
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const archiveVendorEmployee_API = async (employee_id) => {
  try {
    const response = await apiClient.patch(
      ARCHIVE_VENDOR_EMPLOYEE(employee_id),
      {},
      {
        skipToken: false,
      },
    );
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const deleteVendorEmployee_API = async (employee_id) => {
  try {
    const response = await apiClient.delete(
      VENDOR_EMPLOYEE_BY_ID(employee_id),
      {
        skipToken: false,
      },
    );
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const getEmployeeDashboard_API = async () => {
  try {
    const response = await apiClient.get(EMPLOYEE_DASHBOARD, {
      skipToken: false,
    });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const endEmployeeSession_API = async () => {
  try {
    const response = await apiClient.post(
      END_EMPLOYEE_SESSION,
      {},
      { skipToken: false },
    );
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const toggleEmployeeDuty_API = async ({ is_working }) => {
  try {
    const response = await apiClient.post(
      TOGGLE_EMPLOYEE_DUTY,
      { is_working },
      { skipToken: false },
    );
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const employeeShiftAction_API = async ({ action }) => {
  try {
    const response = await apiClient.post(
      EMPLOYEE_SHIFT_ACTION,
      { action },
      { skipToken: false },
    );
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const getEmployeeOrders_API = async ({ status = null } = {}) => {
  try {
    const query = status ? `?status=${status}` : "";
    const response = await apiClient.get(`${EMPLOYEE_ORDERS}${query}`, {
      skipToken: false,
    });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const getRefundCancelRequests_API = async ({
  foodTruckId = null,
  orderId = null,
  status = null,
  employeeInternalId = null,
  locationId = null,
  limit = 50,
} = {}) => {
  try {
    const queryParams = [`limit=${limit}`];
    if (foodTruckId) queryParams.push(`foodTruckId=${foodTruckId}`);
    if (orderId) queryParams.push(`orderId=${orderId}`);
    if (status) queryParams.push(`status=${status}`);
    if (employeeInternalId) {
      queryParams.push(`employeeInternalId=${employeeInternalId}`);
    }
    if (locationId) queryParams.push(`locationId=${locationId}`);

    const response = await apiClient.get(
      `${REFUND_CANCEL_REQUESTS}?${queryParams.join("&")}`,
      { skipToken: false },
    );
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const submitRefundCancelRequest_API = async (payload) => {
  try {
    const response = await apiClient.post(REFUND_CANCEL_REQUESTS, payload, {
      skipToken: false,
    });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

export const reviewRefundCancelRequest_API = async ({
  request_id,
  payload,
}) => {
  try {
    const response = await apiClient.put(
      REVIEW_REFUND_CANCEL_REQUEST(request_id),
      payload,
      { skipToken: false },
    );
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Bank Detail-Related APIs
 */

/**
 * Add bank details
 * @param {Object} payload - Bank details data
 * @returns {Promise<Object>} Added bank details data
 */
export const addBankDetail_API = async (payload) => {
  try {
    const URL = `${ADD_BANK_DETAIL}`;
    const response = await apiClient.post(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Get bank details
 * @returns {Promise<Object>} Bank details data
 */
export const getBankDetail_API = async () => {
  try {
    const URL = `${GET_BANK_DETAIL}`;
    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Common List API
 */

/**
 * Get common list data
 * @param {string|null} type - Type of common list to fetch (default: null)
 * @returns {Promise<Object>} Common list data
 */
export const getCommonList_API = async (type = null) => {
  try {
    let URL = `${GET_COMMON_LIST}`;

    // Always add page=1 and limit=1000
    const queryParams = [`page=1`, `limit=1000`];

    // Add type query parameter only if it's not null
    if (type !== null) {
      queryParams.push(`type=${type}`);
    }

    URL += `?${queryParams.join("&")}`;

    const response = await apiClient.get(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Notification-Related APIs
 */

/**
 * Set FCM token
 * @param {Object} payload - FCM token data
 * @returns {Promise<Object>} FCM token set confirmation
 */
export const setFcmToken_API = async (payload) => {
  try {
    const URL = `${SET_FCM_TOKEN}`;
    const response = await apiClient.post(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Update FCM token
 * @param {Object} params - Request parameters
 * @param {string} params.deviceId - Device ID
 * @param {Object} params.payload - FCM token data to update
 * @returns {Promise<Object>} Updated FCM token data
 */
export const updateFcmToken_API = async ({ deviceId, payload }) => {
  try {
    const URL = UPDATE_FCM_TOKEN(deviceId);
    const response = await apiClient.put(URL, payload, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

/**
 * Remove FCM token
 * @param {string} device_id - Device ID to remove FCM token for
 * @returns {Promise<Object>} FCM token removal confirmation
 */
export const removeFcmToken_API = async (device_id) => {
  try {
    const URL = REMOVE_FCM_TOKEN(device_id);
    const response = await apiClient.delete(URL, { skipToken: false });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};
