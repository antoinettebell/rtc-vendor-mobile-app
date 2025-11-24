import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AntDesign from "react-native-vector-icons/AntDesign";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import StatusBarManager from "../components/StatusBarManager";
import { getUserDetail_API } from "../api/appAPI";
import { Divider, IconButton } from "react-native-paper";
import { setSelectedPlan, setUser } from "../redux/slices/userSlice";
import FastImage from "@d11/react-native-fast-image";
import {
  setSelectedCuisine,
  setSelectedLocations,
} from "../redux/slices/foodTruckProfileSlice";
import { formatEIN, formatSSN } from "../helpers/profile.helper";
import { addOrUpdateUser } from "../redux/slices/userInfoSlice";
import AppImage from "../components/AppImage";

const MEDIA_IMAGE_TYPE = {
  INSTAGRAM: require("../assets/images/instagram.png"),
  FACEBOOK: require("../assets/images/facebook.png"),
  TWITTER: require("../assets/images/twitter.png"),
  WEB: require("../assets/images/global.png"),
};

const UserProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state) => state.userReducer);

  const [getUserDetailLoading, setGetUserDetailLoading] = useState(false);
  const [socialMedia, setSocialMedia] = useState([]);

  const updateStateOnDataFetch = (USER_DATA, FOOD_TRUCK_DATA) => {
    setSocialMedia(FOOD_TRUCK_DATA?.socialMedia || []);

    dispatch(setSelectedCuisine(FOOD_TRUCK_DATA?.cuisine));
    dispatch(setSelectedLocations(FOOD_TRUCK_DATA?.locations));
    dispatch(setSelectedPlan(FOOD_TRUCK_DATA?.plan));
  };

  const onSocialLinkPress = async (url) => {
    try {
      // Add https:// if missing
      const processedUrl = url.includes("://") ? url : `https://${url}`;

      const supported = await Linking.canOpenURL(processedUrl);
      if (supported) {
        await Linking.openURL(processedUrl);
      } else {
        Alert.alert("Error", "Invalid URL! Cannot open URL.");
        console.log("Can't open URL:", processedUrl);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open URL");
      console.log("Error opening URL:", error);
    }
  };

  const getUserDetailFromAPI = async () => {
    setGetUserDetailLoading(true);
    try {
      const user_id = user?._id;
      const response = await getUserDetail_API(user_id);
      if (response?.success && response.data) {
        const USER_DATA = response.data.user;
        const FOOD_TRUCK_DATA = response.data.user.foodTruck;

        console.log("response => ", response);

        dispatch(setUser(USER_DATA));
        updateStateOnDataFetch(USER_DATA, FOOD_TRUCK_DATA); // update local states

        dispatch(
          addOrUpdateUser({
            emailid: USER_DATA.email,
            userData: {
              emailid: USER_DATA.email,
              username: FOOD_TRUCK_DATA?.name || "",
              imageUrl: FOOD_TRUCK_DATA.logo || null,
            },
          })
        );
      }
    } catch (error) {
      console.log("error => ", error);
    } finally {
      setGetUserDetailLoading(false);
    }
  };

  useEffect(() => {
    getUserDetailFromAPI();
  }, []);

  useEffect(() => {
    if (user?.foodTruck?.socialMedia) {
      setSocialMedia(user?.foodTruck?.socialMedia);
    }
  }, [user?.foodTruck?.socialMedia]);

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: insets.top,
          backgroundColor: AppColor.white,
          borderBottomWidth: 1,
          borderBlockColor: AppColor.border,
        }}
      >
        <View style={{ width: "20%" }}>
          <IconButton
            icon="arrow-left"
            iconColor={AppColor.black}
            size={24}
            onPress={() => navigation.goBack()}
          />
        </View>
        <Text
          style={{
            fontSize: 19.78,
            fontFamily: Mulish700,
            color: AppColor.black,
          }}
        >
          {"Your Profile"}
        </Text>
        <View style={{ width: "20%" }} />
      </View>

      {/* Main Container */}
      {getUserDetailLoading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingBottom: 0,
          }}
        >
          <ActivityIndicator size="large" color={AppColor.primary} />
        </View>
      ) : (
        <ScrollView
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* User Profile Data */}
          <View style={styles.contentContainer}>
            {/* Profile Picture and Name */}
            <View style={styles.profileHeaderContainer}>
              <AppImage
                uri={user?.foodTruck?.logo}
                containerStyle={styles.profileImage}
              />
              <View style={styles.profileInfoContainer}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {user?.foodTruck?.name}
                </Text>
                <Text style={styles.profileEmail} numberOfLines={1}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text style={styles.profileEmail} numberOfLines={1}>
                  {user?.email}
                </Text>
              </View>
            </View>

            {/* Edit Button */}
            <IconButton
              icon="pencil"
              iconColor={AppColor.black}
              size={24}
              onPress={() => navigation.navigate("editProfileScreen")}
              style={{
                position: "absolute",
                right: 0,
                top: -8,
                overflow: "hidden",
              }}
            />

            <Divider />

            {/* Mobile Number */}
            <View style={styles.itemContainer}>
              <View style={styles.itemIconContiner}>
                <Ionicons name="call-outline" size={24} color={AppColor.gray} />
              </View>
              <Text style={styles.itemText}>
                {user?.countryCode} {user?.mobileNumber}
              </Text>
            </View>
            <Divider />

            {/* EIN/SSN Number */}
            <View style={styles.itemContainer}>
              <View style={styles.itemIconContiner}>
                {user?.foodTruck?.ein ? (
                  <AntDesign name="idcard" size={24} color={AppColor.gray} />
                ) : (
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={24}
                    color={AppColor.gray}
                  />
                )}
              </View>
              <Text style={styles.itemText}>
                {user?.foodTruck?.ein
                  ? `EIN: ${formatEIN(user?.foodTruck?.ein || "") || "N/A"}`
                  : `SSN: ${formatSSN(user?.foodTruck?.ssn || "") || "N/A"}`}
              </Text>
            </View>
            <Divider />

            {/* Email - Removed as it's now in the profile header */}

            {socialMedia?.length > 0 && <Divider />}

            {/* Social Media */}
            {socialMedia?.length > 0 && (
              <View style={styles.socialMediaContainer}>
                <Text style={styles.socialMediaTitle}>Social Media</Text>
                {socialMedia?.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.7}
                    onPress={() => onSocialLinkPress(item.mediaUrl)}
                    style={styles.socialMediaItem}
                  >
                    <FastImage
                      source={MEDIA_IMAGE_TYPE[item.mediaType]}
                      style={styles.socialMediaIcon}
                    />
                    <Text style={styles.socialMediaText} numberOfLines={1}>
                      {item.mediaUrl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Divider />
            <View style={styles.socialMediaContainer}>
              <Text style={styles.socialMediaTitle}>Mailing Address</Text>

              <View style={[styles.itemContainer, { paddingVertical: 0 }]}>
                <View style={styles.itemIconContiner}>
                  <MaterialIcons
                    name="location-on"
                    size={24}
                    color={AppColor.gray}
                  />
                </View>
                <Text style={styles.itemText}>{user?.addressLine1}</Text>
              </View>

              <View style={[styles.itemContainer, { paddingVertical: 0 }]}>
                <View style={styles.itemIconContiner} />
                <Text style={styles.itemText}>{user?.addressLine2}</Text>
              </View>

              <View style={[styles.itemContainer, { paddingVertical: 0 }]}>
                <View style={styles.itemIconContiner} />
                <Text style={styles.itemText}>{user?.addressCity}</Text>
              </View>

              <View style={[styles.itemContainer, { paddingVertical: 0 }]}>
                <View style={styles.itemIconContiner} />
                <Text style={styles.itemText}>{user?.addressState}</Text>
              </View>

              <View style={[styles.itemContainer, { paddingVertical: 0 }]}>
                <View style={styles.itemIconContiner} />
                <Text style={styles.itemText}>{user?.addressPostal}</Text>
              </View>

              <View style={[styles.itemContainer, { paddingVertical: 0 }]}>
                <View style={styles.itemIconContiner} />
                <Text style={styles.itemText}>{user?.addressCountry}</Text>
              </View>

              {/* Edit Button */}
              <IconButton
                icon="pencil"
                iconColor={AppColor.black}
                size={24}
                onPress={() => navigation.navigate("editMailingAddressScreen")}
                style={{
                  position: "absolute",
                  right: -16,
                  top: 0,
                  overflow: "hidden",
                }}
              />
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default UserProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    margin: 16,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: AppColor.border,
  },

  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
  },
  itemIconContiner: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 16,
    fontFamily: Mulish400,
    color: AppColor.black,
    marginRight: 40, // padding of container + image width
  },

  profileHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    backgroundColor: AppColor.border,
  },
  profileInfoContainer: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontFamily: Mulish700,
    color: AppColor.black,
    marginBottom: 4,
    width: "90%",
  },
  profileEmail: {
    fontSize: 16,
    fontFamily: Mulish400,
    color: AppColor.subText,
  },

  socialMediaContainer: {
    paddingVertical: 16,
  },
  socialMediaTitle: {
    fontSize: 18,
    fontFamily: Mulish700,
    color: AppColor.black,
    marginBottom: 10,
  },
  socialMediaItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  socialMediaIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  socialMediaText: {
    fontSize: 16,
    fontFamily: Mulish400,
    color: "#0066cc",
    flex: 1,
  },

  addressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    margin: 16,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: AppColor.border,
  },
});
