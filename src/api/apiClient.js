import axios, { AxiosRequestConfig, AxiosError } from "axios";
import Config from "react-native-config";

import { store } from "../redux/store";

const API_URL = Config.API_URL;
const API_PREFIX = Config.API_PREFIX;
const APP_ENV = Config.APP_ENV;

// Axios instance
const apiClient = axios.create({
  baseURL: `${API_URL}${API_PREFIX}`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Setup request interceptor
apiClient.interceptors.request.use(
  async function (config) {
    // Add Authorization token unless skipped
    if (!config.skipToken) {
      const { authToken } = store.getState().userReducer;
      if (authToken) {
        config.headers["Authorization"] = authToken;
      }
    }

    // Set Content-Type to multipart/form-data if needed
    if (config.formData) {
      config.headers["Content-Type"] = "multipart/form-data";
    }

    console.log("Config ===> ", config);
    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

// Setup response interceptor
apiClient.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    // Handle 403 Forbidden (session expired)
    // if (error?.response?.status === 403) {
    //   // Perform action for 403 code [accestoken expire, not found]
    //     store.dispatch(logout());

    //     showToast({
    //       type: "error",
    //       title: "Logged Out",
    //       message: "Your session has expired. Please login again.",
    //     });
    //   return Promise.reject(error);
    // }

    return Promise.reject(error);
  }
);

export default apiClient;
