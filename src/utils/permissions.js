import { Platform } from "react-native";
import { PERMISSIONS } from "react-native-permissions";

export const permission =
  Platform.OS === "ios"
    ? {
        location: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        photos: PERMISSIONS.IOS.PHOTO_LIBRARY,
        camera: PERMISSIONS.IOS.CAMERA,
      }
    : {
        location: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        photos:
          parseInt(Platform.Version) < 33
            ? PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE
            : PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
        camera: PERMISSIONS.ANDROID.CAMERA,
      };
