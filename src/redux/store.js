import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";

import authReducer from "./slices/authSlice";
import userReducer from "./slices/userSlice";
import foodTruckProfileReducer from "./slices/foodTruckProfileSlice";

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  whitelist: ["authReducer", "userReducer", "foodTruckProfileReducer"],
};

const rootReducer = combineReducers({
  authReducer,
  userReducer,
  foodTruckProfileReducer,
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
