import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  Alert,
  Pressable,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";
import StatusBarManager from "../components/StatusBarManager";
import FastImage from "@d11/react-native-fast-image";
import CustomBanner from "../components/CustomBanner";
import { getUserDetail_API, updateFoodTruckProfile_API } from "../api/appAPI";
import { setUser, updateFoodTruck } from "../redux/slices/userSlice";
import LabeledSwitch from "../components/LabeledSwitch";
import { useSharedValue } from "react-native-reanimated";
import { Dropdown } from "react-native-element-dropdown";
import { showSnackbar } from "../redux/slices/snackbarSlice";

const HomeScreen = () => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state) => state.userReducer);

  const HEADER_HEIGHT = 60;
  const totalHeaderHeight = insets.top + HEADER_HEIGHT;

  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const isOn = useSharedValue(false);

  const handlePress = async () => {
    if (!selectedLocation && !isOn.value) {
      Alert.alert("Please select a location");
      return;
    }

    let temp_isOn = isOn.value;
    let temp_isOpen = isOpen;

    isOn.value = !temp_isOn;
    setIsOpen(!temp_isOpen);

    try {
      const foodtruck_id = user?.foodTruck?._id;
      const payload = {
        currentLocation: !isOn.value ? selectedLocation : null,
      };
      const response = await updateFoodTruckProfile_API({
        payload,
        foodTruckId: foodtruck_id,
      });
      if (response?.success && response.data) {
        console.log("response => ", response);
        dispatch(updateFoodTruck(response.data.foodtruck));

        dispatch(
          showSnackbar({
            message: "Currentlocation Status Updated!",
            type: "success",
          })
        );
      }
    } catch (error) {
      console.log("error => ", error);
      isOn.value = temp_isOn;
      setIsOpen(temp_isOpen);
      dispatch(
        showSnackbar({
          message: "Something went wrong!",
          type: "error",
        })
      );
    } finally {
    }
  };

  const getUserDataFromAPI = async () => {
    setBannerLoading(true);
    try {
      const user_id = user._id;
      const response = await getUserDetail_API(user_id);
      if (response?.success && response.data) {
        console.log("response => ", response);
        dispatch(setUser(response.data.user));
      }
    } catch (error) {
      console.log("error => ", error);
    } finally {
      setBannerLoading(false);
    }
  };

  const handleLocationChange = (selected) => {
    console.log("selected => ", selected);
    setSelectedLocation(selected?._id);
  };

  useEffect(() => {
    getUserDataFromAPI();
  }, []);

  useEffect(() => {
    setBannerVisible(user?.requestStatus === "PENDING" ? true : false);
  }, [user?.requestStatus]);

  useEffect(() => {
    setLocations(user?.foodTruck?.locations || []);
    setSelectedLocation(user?.foodTruck?.currentLocation);
    if (user?.foodTruck?.currentLocation) {
      isOn.value = true;
      setIsOpen(true);
    } else {
      isOn.value = false;
      setIsOpen(false);
    }
  }, [user?.foodTruck?.locations]);

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header */}
      <View
        style={{
          height: totalHeaderHeight,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          paddingTop: insets.top,
          paddingBottom: 10,
          backgroundColor: AppColor.white,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderColor: "#E5E5EA",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <FastImage
            source={{ uri: user?.foodTruck?.logo }}
            style={{ height: 44, width: 44, borderRadius: 22 }}
          />
          <Text
            numberOfLines={1}
            style={{
              fontSize: 18,
              fontFamily: Primary400,
              color: AppColor.black,
            }}
          >
            {user?.foodTruck?.name || ""}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          style={{
            width: "10%",
            alignItems: "flex-end",
          }}
        >
          <MaterialCommunityIcons
            name="bell-circle"
            size={38}
            color={AppColor.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Banner for pending status */}
      <CustomBanner
        visible={bannerVisible}
        initialOffsetY={totalHeaderHeight}
        actions={[
          {
            label: "Refresh",
            loading: bannerLoading,
            onPress: getUserDataFromAPI,
          },
        ]}
      >
        {"Your vendor profile is under review."}
      </CustomBanner>

      {/* Location and Switch */}
      {!bannerVisible ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <Dropdown
              data={locations}
              labelField="title"
              valueField="_id"
              value={selectedLocation}
              onChange={(selected) => handleLocationChange(selected)}
              placeholder="Select Location"
              style={styles.dropdown}
              placeholderStyle={{
                fontFamily: Secondary400,
                color: AppColor.textHighlighter,
              }}
              itemTextStyle={{ fontFamily: Secondary400 }}
              selectedTextStyle={{ fontFamily: Secondary400 }}
              disable={isOpen}
            />
            <Pressable
              onPress={() => {
                if (isOpen) {
                  Alert.alert(
                    "Cannot Change Location",
                    "Please close the food truck first to change location"
                  );
                }
              }}
              style={{
                flex: 1,
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: isOpen ? "flex" : "none",
              }}
            />
          </View>
          <View style={{ alignItems: "center" }}>
            <LabeledSwitch value={isOn} onPress={handlePress} />
            <Text
              style={{
                fontFamily: Secondary400,
                fontSize: 12,
                color: AppColor.black,
                marginTop: 5,
              }}
            >
              {isOpen ? "Open" : "Closed"}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.content}></View>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    flex: 1,
  },
  dropdown: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 12,
  },
});
