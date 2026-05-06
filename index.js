/**
 * @format
 */

import { AppRegistry, LogBox } from "react-native";
import React, { useEffect } from "react";
import App from "./App";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { DefaultTheme, PaperProvider } from "react-native-paper";
import { persistor, store } from "./src/redux/store";
import Config from "react-native-config";
import notifee, { EventType } from "@notifee/react-native";
import { getMessaging } from "@react-native-firebase/messaging";
import "react-native-get-random-values";
import {
  handleNotificationAction,
  onDisplayNotification,
} from "./src/helpers/notification.helper";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const appName = "FoodtruckVendor";

console.log(Config);

const processOnNotification = async (notification) => {
  // Android: when user clicked on backgroud state notification
  console.log("processOnNotification => ", notification);
  await handleNotificationAction(notification);
};

const setupNotificationListeners = () => {
  try {
    const messaging = getMessaging();
    const unsubscribeMessage = messaging.onMessage(async (notification) => {
      console.log("Forground Remote-Message => ", notification);
      await onDisplayNotification(notification);
      await handleNotificationAction(notification);
    });

    const unsubscribeOpened =
      messaging.onNotificationOpenedApp(processOnNotification);

    const unsubscribeForeground = notifee.onForegroundEvent(
      // android/ios both: function trigger when any notification trigger on foreground state
      // also triggred when onDisplayNotification called, beacuse onDisplayNotification is displaying notification for foreground state
      ({ type, detail }) => {
        switch (type) {
          case EventType.DISMISSED:
            console.log("User dismissed notification", detail.notification);
            break;
          case EventType.PRESS:
            console.log("User pressed notification", detail.notification);
            processOnNotification(detail.notification);
            break;
        }
      }
    );

    return () => {
      unsubscribeMessage?.();
      unsubscribeOpened?.();
      unsubscribeForeground?.();
    };
  } catch (error) {
    console.log("Notification listener setup error => ", error);
    return undefined;
  }
};

LogBox.ignoreLogs([
  "VirtualizedLists should never be nested inside plain ScrollViews with the same orientation",
]);

const RnApp = () => {
  useEffect(() => setupNotificationListeners(), []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <PaperProvider theme={DefaultTheme}>
            <App />
          </PaperProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
};

AppRegistry.registerComponent(appName, () => RnApp);
