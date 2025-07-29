import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";

import authReducer from "./slices/authSlice";
import userReducer from "./slices/userSlice";
import userInfoReducer from "./slices/userInfoSlice";
import foodTruckProfileReducer from "./slices/foodTruckProfileSlice";
import snackbatReducer from "./slices/snackbarSlice";
import pushNotificationReducer from "./slices/pushNotificationSlice";

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  whitelist: [
    "authReducer",
    "userReducer",
    "userInfoReducer",
    "foodTruckProfileReducer",
    "pushNotificationReducer",
  ],
  blacklist: ["snackbatReducer"],
};

const rootReducer = combineReducers({
  authReducer,
  userReducer,
  userInfoReducer,
  foodTruckProfileReducer,
  snackbatReducer,
  pushNotificationReducer,
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
