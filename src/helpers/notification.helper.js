import { PermissionsAndroid, Platform } from "react-native";
import { getInstallations, getId } from "@react-native-firebase/installations";
import {
  getMessaging,
  getToken,
  requestPermission,
  AuthorizationStatus,
} from "@react-native-firebase/messaging";
import notifee from "@notifee/react-native";
import { notificationTypes } from "../utils/constants";
import { store } from "../redux/store";
import {
  addPushNotificationOrder,
  showAvailabilityPrompt,
} from "../redux/slices/pushNotificationSlice";
import { navigate } from "./navigation.helper";

const installationsInstance = getInstallations();
const messagingInstance = getMessaging();

export const checkInstallationId = async () => {
  try {
    const id = await getId(installationsInstance);
    console.log("Current Installation ID:", id);
    return id;
  } catch (error) {
    console.log("Current Installation ID Check Error:", error);
    return false;
  }
};

export const checkFcmToken = async () => {
  try {
    const token = await getToken(messagingInstance);
    console.log("Current FCM Token:", token);
    return token;
  } catch (error) {
    console.log("Current FCM Token Check Error:", error);
    return false;
  }
};

export const requestNotificationPermission = async () => {
  try {
    if (Platform.OS === "android" && Platform.Version >= 33) {
      const granted = PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      const authStatus = await requestPermission(messagingInstance);
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;
      return enabled;
    }
  } catch (error) {
    console.log("requestNotificationPermission error => ", error);
  }
};

export const createAndroidChannel = async () => {
  await notifee.createChannel({
    id: "default",
    name: "Default Channel",
  });
};

export const onDisplayNotification = async (remoteMessage) => {
  try {
    await notifee.displayNotification({
      title: remoteMessage.notification.title,
      body: remoteMessage.notification.body,
      android: {
        channelId: "default",
        pressAction: {
          id: "default",
        },
      },
      data: remoteMessage.data,
    });
  } catch (err) {
    console.log("onDisplayNotification Error => ", err);
  }
};

export const handleNotificationAction = async (notification) => {
  console.log("handleNotificationAction => ", notification);

  if (!notification?.data) return;
  const notificationData = notification.data;

  if (notificationData?.activityType === notificationTypes.new_order) {
    const isSignedIn = store.getState().authReducer.isSignedIn;

    console.log("New Order Notification");
    // TODO: Handle new order notification
    if (notificationData && notificationData?.orderId && isSignedIn) {
      store.dispatch(
        addPushNotificationOrder({ orderId: notificationData.orderId })
      );
    }
  }

  if (
    notificationData?.activityType ===
    notificationTypes.vendor_daily_location_check
  ) {
    store.dispatch(showAvailabilityPrompt(notificationData));
    navigate("homeScreen");
  }
};
