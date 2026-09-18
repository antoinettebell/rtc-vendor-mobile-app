import { PermissionsAndroid, Platform } from "react-native";
import { getInstallations, getId } from "@react-native-firebase/installations";
import {
  getMessaging,
  getAPNSToken,
  getToken,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
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
import { setFcmToken_API } from "../api/appAPI";

const installationsInstance = getInstallations();
const messagingInstance = getMessaging();

export const checkInstallationId = async () => {
  try {
    return await getId(installationsInstance);
  } catch (error) {
    console.log("Installation ID check failed.");
    return false;
  }
};

const isTooManyServerRequestsError = (error) =>
  `${error?.code || ""} ${error?.message || ""}`
    .toLowerCase()
    .includes("too many server requests");

const saveFcmToken = async (token) => {
  if (!token) return false;

  const deviceId = await checkInstallationId();
  if (!deviceId) {
    console.warn("FCM token could not be saved because the installation ID is unavailable.");
    return false;
  }

  try {
    await setFcmToken_API({ deviceId, token });
    console.log("Push notification token registered successfully.");
    return true;
  } catch (error) {
    console.warn(
      "Push notification token upload failed:",
      error?.code || "unknown error",
      error?.message || "",
    );
    return false;
  }
};

export const checkFcmToken = async () => {
  try {
    // Registration must finish before Firebase is asked for an FCM token.
    await registerDeviceForRemoteMessages(messagingInstance);

    if (Platform.OS === "ios") {
      const apnsToken = await getAPNSToken(messagingInstance);
      // Firebase cannot mint a valid iOS FCM token until Apple has supplied
      // the native APNs token. The guard avoids racing getToken() and lets the
      // onTokenRefresh stream capture the token as soon as it becomes ready.
      if (typeof apnsToken !== "string" || !apnsToken.trim()) {
        console.warn("APNs token not yet available. Waiting for stream...");
        return false;
      }
    }

    try {
      return await getToken(messagingInstance);
    } catch (error) {
      if (isTooManyServerRequestsError(error)) {
        console.warn(
          "FCM token request was throttled. Verify that the device network allows outbound TCP port 5223, or restart the physical iPhone to reset the native APNs daemon cache.",
        );
      }
      throw error;
    }
  } catch (error) {
    console.log(
      "FCM token check failed:",
      error?.code || "unknown error",
      error?.message || "",
    );
    return false;
  }
};

export const initializePushNotifications = async () => {
  const permissionGranted = await requestNotificationPermission();
  if (!permissionGranted) {
    console.warn("Push notification permission was not granted.");
    return false;
  }

  const token = await checkFcmToken();
  if (!token) return false;

  return saveFcmToken(token);
};

export const subscribeToPushTokenRefresh = () =>
  onTokenRefresh(messagingInstance, (token) => {
    saveFcmToken(token).catch((error) => {
      console.warn(
        "Push notification token refresh could not be saved:",
        error?.code || "unknown error",
        error?.message || "",
      );
    });
  });

export const requestNotificationPermission = async () => {
  try {
    if (Platform.OS === "android" && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
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

  if (
    notificationData?.activityType ===
    notificationTypes.employee_refund_cancel_request
  ) {
    const role = store.getState().userReducer.user?.role;
    navigate(role === "MANAGER" ? "managerEmployeesScreen" : "employeesScreen");
  }

  if (
    notificationData?.activityType ===
      notificationTypes.vendor_compliance_expiration ||
    notificationData?.activityType === notificationTypes.vendor_compliance_required
  ) {
    navigate("vendorComplianceScreen");
  }
};
