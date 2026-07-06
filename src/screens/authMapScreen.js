import React, { useEffect, useRef, useState } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  View,
  Platform,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import {
  ActivityIndicator,
  IconButton,
  Portal,
  Snackbar,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { promptForEnableLocationIfNeeded } from "react-native-android-location-enabler";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import Geolocation from "@react-native-community/geolocation";
import Config from "react-native-config";
import usePermission from "../hooks/usePermission";
import { permission } from "../helpers/permission.helper";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { getLocationDetailsFromLatLong } from "../api/appAPI";
import { RESULTS } from "react-native-permissions";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedLocations } from "../redux/slices/foodTruckProfileSlice";
import StatusBarManager from "../components/StatusBarManager";

const GOOGLE_MAP_API_KEY = Config.GOOGLE_MAP_API_KEY;

navigator.geolocation = require("@react-native-community/geolocation");

const initialRegion = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const AuthMapScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const searchTxtRef = useRef(null);
  const mapRef = useRef(null); // Ref for the MapView

  const Params = route.params;

  const { selectedLocations } = useSelector(
    (state) => state.foodTruckProfileReducer
  );

  const [loading, setLoading] = useState(false);
  const [searchTxt, setSearchTxt] = useState(null);
  const [title, setTitle] = useState("");
  const [locationName, setLocationName] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [currentRegion, setCurrentRegion] = useState(initialRegion);
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  const { checkAndRequestPermission: locationPermissionStatus } = usePermission(
    permission.location
  );

  const onSearchPress = () => {
    searchTxtRef?.current?.focus?.();
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        {
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 20000,
        }
      );
    });
  };

  const getPlaceName = async (lat, long, onlyZipCode = null) => {
    try {
      const payload = { lat, long };
      let response = await getLocationDetailsFromLatLong(payload);
      if (response.status === "OK" && response?.results?.length) {
        const adrsComponent = response.results[0].address_components;
        const zipCode = adrsComponent.find((item) =>
          item?.types?.includes("postal_code")
        )?.long_name;
        setZipcode(zipCode || "");

        if (!onlyZipCode) {
          const adrs = response.results[0].formatted_address;
          setTitle(adrs.split(",").slice(0, 1).join(",").trim());
          setLocationName(adrs);
        }
        return;
      } else {
        switch (response.status) {
          case "ZERO_RESULTS":
            setSnackbar({
              visible: true,
              message: "This is a remote location.",
              type: "error",
            });
            break;

          case "OVER_QUERY_LIMIT":
            setSnackbar({
              visible: true,
              message: "Please retry in some time!",
              type: "error",
            });
            break;

          case "REQUEST_DENIED":
            setSnackbar({
              visible: true,
              message: "Something went wrong.",
              type: "error",
            });
            break;

          case "INVALID_REQUEST":
            setSnackbar({
              visible: true,
              message: "Something is missing in your search parameters.",
              type: "error",
            });
            break;

          case "UNKNOWN_ERROR":
            setSnackbar({
              visible: true,
              message: "Try again in some time.",
              type: "error",
            });
            break;
        }
        console.log("Geocoding Error:", response.status);
        return null;
      }
    } catch (error) {
      console.error("Geocoding Request Failed:", error);
      return null;
    }
  };

  const onMapReadyCall = async (type = undefined) => {
    if (type !== "manually") return;
    setLoading(true);
    try {
      const locationStatus = await locationPermissionStatus();
      if (locationStatus !== RESULTS.GRANTED) {
        setSnackbar({
          visible: true,
          type: "info",
          message: "Allow permission to locate you.",
        });
        return;
      }

      // Await the wrapped Promise to get location
      const position = await getCurrentLocation();
      const { latitude, longitude } = position.coords;
      const region = {
        latitude,
        longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.0121,
      };
      getPlaceName(region?.latitude, region?.longitude);
      setCurrentRegion(region);
      setSearchTxt(null);
      // when user press locate me then if there is anything in search box then it will be emptied.
      if (searchTxtRef?.current) {
        searchTxtRef?.current.clear(); // Clears the visible text
        searchTxtRef?.current.setAddressText(""); // Clears internal state
      }

      // Wait a tick before animating to ensure state is applied
      setTimeout(() => {
        if (mapRef?.current) {
          mapRef.current.animateToRegion(region, 1500); // 1.5s smooth animation
        }
      }, 500);
    } catch (error) {
      if (error?.code === 2) {
        if (Platform.OS === "android") {
          try {
            const enableResult = await promptForEnableLocationIfNeeded();
            if (enableResult === "already-enabled") {
              onMapReadyCall("manually");
            } else if (enableResult === "enabled") {
              setTimeout(() => {
                onMapReadyCall("manually");
              }, 1000);
            }
          } catch (error) {
            if (error) {
              console.error(error.message);
              setSnackbar({
                visible: true,
                type: "info",
                message: "Please turn on device location.",
              });
            }
          }
        } else {
          setSnackbar({
            visible: true,
            type: "info",
            message: "Please turn on device location.",
          });
        }
      } else if (error?.code === 3) {
        setSnackbar({
          visible: true,
          type: "info",
          message: "Please select location manually.",
        });
      }
      console.log("Error getting location:", error);
    } finally {
      setLoading(false); // Stop loading after geolocation and animation
    }
  };

  const handleSaveBtn = () => {
    if (!locationName) return;
    const newLocation = {
      title: title,
      address: locationName,
      lat: String(currentRegion.latitude),
      long: String(currentRegion.longitude),
      zipcode: zipcode,
    };
    Params?.onGoBack(newLocation);
    // dispatch(setSelectedLocations([...(selectedLocations || []), payload]));
    navigation.goBack();
  };

  useEffect(() => {
    onMapReadyCall("manually");
  }, []);

  return (
    <View style={styles.container}>
      <StatusBarManager />

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
          {/* <Marker coordinate={currentRegion} /> */}
        </MapView>

        {/* Center Location Pin */}
        <View style={styles.locationPin}>
          {loading ? (
            <ActivityIndicator size="large" color={AppColor.primary} />
          ) : currentRegion ? (
            <MaterialIcons
              name="location-on"
              size={44}
              color={AppColor.primary}
              style={{ top: -insets.bottom }}
            />
          ) : null}
        </View>

        {/* Search Container */}
        <View style={styles.searchContainer}>
          <GooglePlacesAutocomplete
            ref={searchTxtRef}
            placeholder="Search Location"
            query={{
              key: GOOGLE_MAP_API_KEY,
              language: "en",
              types: "geocode|establishment",
            }}
            enablePoweredByContainer={false}
            numberOfLines={2}
            fetchDetails={true}
            suppressDefaultStyles={true}
            textInputProps={{
              placeholderTextColor: "#6F6F6F",
              multiline: false,
              numberOfLines: 1,
            }}
            predefinedPlaces={[]}
            keyboardShouldPersistTaps="always"
            minLength={2}
            timeout={20000}
            onPress={(data, details = null) => {
              if (!details) {
                setSnackbar({
                  visible: true,
                  message: "We couldn't find details for that location.",
                  type: "error",
                });
                return;
              }
              const adrs = data?.description || "";
              const region = {
                latitude: details?.geometry?.location?.lat,
                longitude: details?.geometry?.location?.lng,
                latitudeDelta: 0.015,
                longitudeDelta: 0.0121,
              };
              setCurrentRegion(region);
              setTitle(adrs.split(",").slice(0, 1).join(",").trim());
              setSearchTxt(adrs);
              setLocationName(adrs);
              if (details) {
                const adrsComponent = details.address_components;
                const zipCode = adrsComponent.find((item) =>
                  item?.types?.includes("postal_code")
                )?.long_name;
                if (zipCode) {
                  setZipcode(zipCode);
                } else {
                  getPlaceName(
                    details?.geometry?.location?.lat,
                    details?.geometry?.location?.lng,
                    true // this is for, only change the zipcode
                  );
                }
              } else {
                setZipcode("");
              }
              // Animate the map to the new coordinates
              mapRef.current?.animateToRegion(region);
              // when user press on the search result then if there is anything in search box then it will be emptied.
              if (searchTxtRef?.current) {
                searchTxtRef?.current.clear(); // Clears the visible text
                searchTxtRef?.current.setAddressText(""); // Clears internal state
              }
            }}
            onFail={(error) => {
              console.log("Google Places Autocomplete Error:", error);
              setSnackbar({
                visible: true,
                message: "Failed to search location. Please try again.",
                type: "error",
              });
            }}
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
        <View
          style={[
            styles.bottomBrnContainer,
            { bottom: Platform.OS === "android" ? 20 : insets.bottom },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onMapReadyCall("manually")}
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialIcons
              name="gps-fixed"
              size={26}
              color={AppColor.black}
              style={{ marginRight: 10 }}
            />
            <Text
              style={{
                fontSize: 16,
                fontFamily: Mulish700,
                color: AppColor.text,
              }}
            >
              {"Locate Me"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton]}
            activeOpacity={0.7}
            onPress={handleSaveBtn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={AppColor.white} />
            ) : (
              <Text style={styles.saveButtonText}>{"Save"}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Portal>
        <Snackbar
          visible={snackbar.visible}
          onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
          duration={4000}
          style={{
            backgroundColor:
              snackbar.type === "success"
                ? AppColor.snackbarSuccess
                : snackbar.type === "error"
                  ? AppColor.snackbarError
                  : AppColor.snackbarDefault,
          }}
        >
          {snackbar.message}
        </Snackbar>
      </Portal>
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
    fontFamily: Mulish700,
  },

  contentContainer: {
    flex: 1,
  },
  locationPin: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
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
    fontFamily: Mulish400,
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
    fontFamily: Mulish400,
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
    fontFamily: Mulish400,
  },

  bottomBrnContainer: { position: "absolute", right: 0, left: 0 },
  saveButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginTop: 20,
    marginHorizontal: 24,
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
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.white,
  },
});
