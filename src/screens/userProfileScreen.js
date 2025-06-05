import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";
import StatusBarManager from "../components/StatusBarManager";
import { getUserDetail_API } from "../api/appAPI";
import { Divider, IconButton } from "react-native-paper";
import { setSelectedPlan, setUser } from "../redux/slices/userSlice";
import FastImage from "@d11/react-native-fast-image";
import {
  setSelectedCuisine,
  setSelectedLocations,
} from "../redux/slices/foodTruckProfileSlice";

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
    setSocialMedia(FOOD_TRUCK_DATA?.socialMedia);

    dispatch(setSelectedCuisine(FOOD_TRUCK_DATA?.cuisine));
    dispatch(setSelectedLocations(FOOD_TRUCK_DATA?.locations));
    dispatch(setSelectedPlan(FOOD_TRUCK_DATA?.plan));
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
        }}
      >
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.black}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text
          style={{
            fontSize: 19.78,
            fontFamily: Primary400,
            color: AppColor.black,
          }}
        >
          {"Your Profile"}
        </Text>
        <TouchableOpacity
          activeOpacity={0.7}
          style={{ width: "10%" }}
          onPress={() => navigation.navigate("editProfileScreen")}
        >
          <MaterialIcons name="edit" size={24} color={AppColor.black} />
        </TouchableOpacity>
      </View>

      {/* Main Container */}
      {getUserDetailLoading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingBottom: insets.bottom,
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
          <View style={styles.contentContainer}>
            {/* Name */}
            <View style={styles.itemContainer}>
              <View style={styles.itemIconContiner}>
                <FontAwesome name="user-o" size={24} color={"#8E8E93"} />
              </View>
              <Text style={styles.itemText}>{user?.firstName}</Text>
            </View>
            <Divider />

            {/* Mobile Number */}
            <View style={styles.itemContainer}>
              <View style={styles.itemIconContiner}>
                <Ionicons name="call-outline" size={24} color={"#8E8E93"} />
              </View>
              <Text style={styles.itemText}>
                {user?.countryCode} {user?.mobileNumber}
              </Text>
            </View>
            <Divider />

            {/* Email */}
            <View style={styles.itemContainer}>
              <View style={styles.itemIconContiner}>
                <Ionicons name="mail-outline" size={24} color={"#8E8E93"} />
              </View>
              <Text style={styles.itemText}>{user?.email}</Text>
            </View>

            {socialMedia?.length > 0 && <Divider />}

            {/* Social Media */}
            {socialMedia?.map((item, index) => (
              <View key={index}>
                <View style={styles.itemContainer}>
                  <View style={styles.itemIconContiner}>
                    <FastImage
                      source={MEDIA_IMAGE_TYPE[item.mediaType]}
                      style={{
                        height: 24,
                        width: 24,
                      }}
                    />
                  </View>
                  <Text style={styles.itemText}>{item.mediaUrl}</Text>
                </View>
                {index !== socialMedia?.length - 1 && <Divider />}
              </View>
            ))}
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
    fontFamily: Secondary400,
    color: AppColor.black,
  },
});
