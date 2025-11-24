import apiClient from "./apiClient";
import {
  AGREEMENT,
  CHANGE_PASSWORD,
  CUISINE,
  FORGOT_PASSWORD,
  LOGIN,
  PRIVACY_POLICY,
  REGISTER_VENDOR,
  RESEND_OTP,
  TNC,
  UPDATE_PASSWORD,
  VERIFY_OTP,
} from "./apiEndPoint";

// Login API
export const login_API = async (payload) => {
  try {
    const URL = `${LOGIN}`;
    const response = await apiClient.post(URL, payload, { skipToken: true });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

// Verify OTP API
export const verifyOTP_API = async (payload) => {
  try {
    const URL = `${VERIFY_OTP}`;
    const response = await apiClient.post(URL, payload, { skipToken: true });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

// Resend OTP API
export const resendOTP_API = async (payload) => {
  try {
    const URL = `${RESEND_OTP}`;
    const response = await apiClient.post(URL, payload, { skipToken: true });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

// Forgot Password API
export const forgotPassword_API = async (payload) => {
  try {
    const URL = `${FORGOT_PASSWORD}`;
    const response = await apiClient.post(URL, payload, { skipToken: true });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

// Change Password API
export const changePassword_API = async (payload) => {
  try {
    const URL = `${CHANGE_PASSWORD}`;
    const response = await apiClient.post(URL, payload, { skipToken: true });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

// Register Vendor API (food truck profile page)
export const registerVendor_API = async (payload) => {
  try {
    const URL = `${REGISTER_VENDOR}`;
    const response = await apiClient.post(URL, payload, { skipToken: true });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

// Update Password API
export const updatePassword_API = async (payload, user_id) => {
  try {
    const URL = UPDATE_PASSWORD(user_id);
    const response = await apiClient.put(URL, payload);
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

// TnC API
export const tnc_API = async () => {
  try {
    const URL = `${TNC}`;
    const response = await apiClient.get(URL, { skipToken: true });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

// privacy pollicy API
export const privacyPolicy_API = async () => {
  try {
    const URL = `${PRIVACY_POLICY}`;
    const response = await apiClient.get(URL, { skipToken: true });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};

// Agreement API
export const agreement_API = async () => {
  try {
    const URL = `${AGREEMENT}`;
    const response = await apiClient.get(URL, { skipToken: true });
    return response?.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
};
