import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";

import authReducer from "./slices/authSlice";
import userReducer from "./slices/userSlice";
import foodTruckProfileReducer from "./slices/foodTruckProfileSlice";
import snackbatReducer from "./slices/snackbarSlice";

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  whitelist: ["authReducer", "userReducer", "foodTruckProfileReducer"],
  blacklist: ["snackbatReducer"],
};

const rootReducer = combineReducers({
  authReducer,
  userReducer,
  foodTruckProfileReducer,
  snackbatReducer,
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
