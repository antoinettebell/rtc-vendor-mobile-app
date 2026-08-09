import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer, createTransform } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";

import authReducer from "./slices/authSlice";
import userReducer from "./slices/userSlice";
import userInfoReducer from "./slices/userInfoSlice";
import foodTruckProfileReducer from "./slices/foodTruckProfileSlice";
import snackbarReducer from "./slices/snackbarSlice";
import pushNotificationReducer from "./slices/pushNotificationSlice";
import posOrderReducer from "./slices/posOrderSlice";

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  whitelist: [
    "authReducer",
    "userReducer",
    "userInfoReducer",
    "foodTruckProfileReducer",
    "pushNotificationReducer",
    "posOrderReducer",
  ],
  blacklist: ["snackbarReducer"],
  transforms: [
    createTransform(
      (state) => ({
        ...state,
        eventVendorOnboardingSessionActive: false,
      }),
      (state) => state,
      { whitelist: ["authReducer"] },
    ),
  ],
};

const rootReducer = combineReducers({
  authReducer,
  userReducer,
  userInfoReducer,
  foodTruckProfileReducer,
  snackbarReducer,
  pushNotificationReducer,
  posOrderReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);
