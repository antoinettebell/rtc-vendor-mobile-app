import React, { useRef, useState } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  View,
  Platform,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";
import { IconButton } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { promptForEnableLocationIfNeeded } from "react-native-android-location-enabler";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import Config from "react-native-config";
import usePermission from "../hooks/usePermission";
import { permission } from "../utils/permissions";
import Ionicons from "react-native-vector-icons/Ionicons";

const GOOGLE_MAP_API_KEY = Config.GOOGLE_MAP_API_KEY;

navigator.geolocation = require("@react-native-community/geolocation");

const initialRegion = {
  latitude: 23.0225,
  longitude: 72.5714,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const AuthMapScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const searchTxtRef = useRef(null);
  const mapRef = useRef(null); // Ref for the MapView

  const [searchTxt, setSearchTxt] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [currentRegion, setCurrentRegion] = useState(null);

  const { checkAndRequestPermission: locationPermissionStatus } = usePermission(
    permission.location
  );

  const onSearchBackPress = () => {
    navigation.goBack();
  };

  const onSearchPress = () => {
    if (searchTxtRef?.current) {
      searchTxtRef?.current?.focus();
    }
  };

  const getPlaceName = async (lat, long) => {
    try {
      const payload = { lat, long };
      // let response = await getLocationName(payload);
      // if (response.status === "OK") {
      //   setLocationName(response.results[0].formatted_address);
      //   return;
      // } else {
      //   switch (response.status) {
      //     case "ZERO_RESULTS":
      //       showToast({
      //         type: "error",
      //         title: "Error!",
      //         message: "This is a remote location.",
      //       });
      //       break;

      //     case "OVER_QUERY_LIMIT":
      //       showToast({
      //         type: "error",
      //         title: "Please retry in some time!",
      //         message: "You are over your quota.",
      //       });
      //       break;

      //     case "REQUEST_DENIED":
      //       showToast({
      //         type: "error",
      //         title: "Error!",
      //         message: "Something went wrong.",
      //       });
      //       break;

      //     case "INVALID_REQUEST":
      //       showToast({
      //         type: "error",
      //         title: "Error!",
      //         message: "Something is missing in your search parameters.",
      //       });
      //       break;

      //     case "UNKNOWN_ERROR":
      //       showToast({
      //         type: "error",
      //         title: "Error!",
      //         message: "Try again in some time.",
      //       });
      //       break;
      //   }
      //   console.log("Geocoding Error:", response.status);
      //   return null;
      // }
    } catch (error) {
      console.error("Geocoding Request Failed:", error);
      return null;
    }
  };

  return (
    <View
      style={[
        styles.container,
        // {
        //   paddingBottom: insets.bottom,
        // },
      ]}
    >
      <StatusBar backgroundColor={AppColor.white} barStyle="light-content" />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            borderBottomWidth: 1,
            borderColor: "#E5E5EA",
          },
        ]}
      >
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.black}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>{"Map"}</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          onMapReady={() => {}}
          loadingEnabled={true}
          loadingIndicatorColor={AppColor.primary}
          initialRegion={initialRegion}
          region={currentRegion}
          onRegionChangeComplete={(Region, { isGesture }) => {
            if (isGesture) {
              setCurrentRegion(Region);
              setSearchTxt(null);
              getPlaceName(Region?.latitude, Region?.longitude);
              if (searchTxtRef?.current) {
                searchTxtRef?.current.clear(); // Clears the visible text
                searchTxtRef?.current.setAddressText(""); // Clears internal state
              }
            }
          }}
        >
          <Marker coordinate={currentRegion} />
        </MapView>

        {/* Search Container */}
        <View style={styles.searchContainer}>
          <GooglePlacesAutocomplete
            ref={searchTxtRef}
            placeholder="Search Location"
            query={{ key: GOOGLE_MAP_API_KEY, language: "en" }}
            enablePoweredByContainer={false}
            numberOfLines={2}
            fetchDetails={true}
            suppressDefaultStyles={true}
            textInputProps={{
              placeholderTextColor: "#6F6F6F",
              multiline: false,
              numberOfLines: 1,
            }}
            onPress={(data, details = null) => {
              const region = {
                latitude: details?.geometry?.location?.lat,
                longitude: details?.geometry?.location?.lng,
                latitudeDelta: 0.015,
                longitudeDelta: 0.0121,
              };
              setCurrentRegion(region);
              setSearchTxt(data?.description || "");
              setLocationName(data?.description);
              // Animate the map to the new coordinates
              mapRef.current?.animateToRegion(region);
            }}
            onFail={(error) => console.log(error)}
            renderRightButton={() => (
              <Pressable
                onPress={onSearchPress}
                style={{ paddingHorizontal: 14 }}
              >
                <Ionicons name="search" size={26} color="#C5C5C7" />
              </Pressable>
            )}
            styles={{
              container: styles.GPAC_Container,
              textInputContainer: styles.GPAC_Input_Container,
              textInput: styles.GPAC_Input,
              listView: styles.GPAC_Listview,
              separator: styles.GPAC_Separator,
              row: styles.GPAC_Row,
              description: styles.GPAC_Description,
              loader: styles.GPAC_Loadder,
            }}
          />
          {locationName && locationName !== "" && (
            <View style={styles.locationNameView}>
              <Text style={styles.locationNameTxt}>
                {locationName || "Loading..."}
              </Text>
            </View>
          )}
        </View>

        {/* Button */}
        <TouchableOpacity
          style={[styles.saveButton, { bottom: insets.bottom }]}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.saveButtonText}>{"Save"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AuthMapScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColor.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppColor.white,
    paddingHorizontal: 8,
    paddingBottom: 5,
  },
  headerTitle: {
    color: AppColor.black,
    fontSize: 20,
    fontFamily: Primary400,
  },

  contentContainer: {
    flex: 1,
  },

  // GPAC CONTAINER
  searchContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    margin: 16,
  },
  GPAC_Container: {
    borderRadius: 6,
    backgroundColor: AppColor.white,
    shadowColor: AppColor.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  GPAC_Input_Container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  GPAC_Input: {
    flex: 1,
    height: 44,
    paddingVertical: 0,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: Secondary400,
  },
  GPAC_Listview: {
    borderRadius: 6,
  },
  GPAC_Separator: {
    height: 1,
    backgroundColor: AppColor.gray,
  },
  GPAC_Row: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: AppColor.white,
    borderTopWidth: 0.5,
    borderTopColor: AppColor.gray,
  },
  GPAC_Description: {
    fontSize: 13,
    fontFamily: Secondary400,
  },
  GPAC_Loadder: {
    flexDirection: "row",
    justifyContent: "flex-end",
    height: 20,
  },

  locationNameView: {
    backgroundColor: AppColor.white,
    marginTop: 10,
    width: "100%",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  locationNameTxt: {
    fontFamily: Secondary400,
  },

  saveButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginTop: 24,
    marginHorizontal: 24,
    position: "absolute",
    right: 0,
    left: 0,
    ...Platform.select({
      ios: {
        shadowColor: AppColor.black,
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  saveButtonText: {
    fontFamily: Secondary400,
    fontSize: 16,
    color: AppColor.white,
  },
});
