import React, { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator as NativeIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  TextInput,
  IconButton,
  Snackbar,
  Menu,
  HelperText,
} from "react-native-paper";
import { AppColor, Mulish700, Mulish400, Mulish600 } from "../utils/theme";
import SimpleLineIcons from "react-native-vector-icons/SimpleLineIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AntDesign from "react-native-vector-icons/AntDesign";
import { useDispatch, useSelector } from "react-redux";
import {
  setSelectedCuisine,
  setSelectedLocations,
} from "../redux/slices/foodTruckProfileSlice";
import StatusBarManager from "../components/StatusBarManager";
import { showSnackbar } from "../redux/slices/snackbarSlice";
import {
  getFoodtruckDetail_API,
  removeFoodtruckLocation_API,
  updateLocationOrdering_API,
  updateFoodTruckProfile_API,
} from "../api/appAPI";
import { updateFoodTruck } from "../redux/slices/userSlice";
import Modal from "react-native-modal";

const RenameLocationModal = ({
  data,
  isModalVisible,
  onUpdatePress,
  onCancelPress,
  snackbarLocation,
  setSnackbarLocation,
}) => {
  const [title, setTitle] = useState(data?.title || "");
  const [titleError, setTitleError] = useState("");
  const [address, setAddress] = useState(data?.address || "");
  const [addressError, setAddressError] = useState("");
  const [zipCode, setZipCode] = useState(data?.zipcode || "");
  const [zipCodeError, setZipCodeError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data) {
      setTitle(data.title || "");
      setAddress(data.address || "");
      setZipCode(data.zipcode || "");
    }
  }, [data]);

  const resetStates = () => {
    setTitle("");
    setTitleError("");
    setAddress("");
    setAddressError("");
    setZipCode("");
    setZipCodeError("");
  };

  const validateText = (text) => {
    return text?.trim()?.length > 0;
  };

  const onValidateBtnPress = async () => {
    const titleErr = validateText(title) ? "" : "Title is required";
    const addressErr = validateText(address) ? "" : "Address is required";
    const zipCodeErr = validateText(zipCode) ? "" : "Zip Code is required";

    setTitleError(titleErr);
    setAddressError(addressErr);
    setZipCodeError(zipCodeErr);

    if (!!titleErr || !!addressErr || !!zipCodeErr) return;

    onUpdatePress({
      payload: {
        initialData: data,
        title,
        address,
        zipcode: zipCode,
      },
      setLoading,
    });
  };

  useEffect(() => {
    if (!isModalVisible) {
      setTimeout(() => {
        resetStates();
      }, 500);
    }
  }, [isModalVisible]);

  return (
    <Modal
      isVisible={isModalVisible}
      backdropOpacity={0.5}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}
      hideModalContentWhileAnimating={true}
      statusBarTranslucent={true}
    >
      <View style={styles.modalContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingVertical: 36,
              paddingHorizontal: 33,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Modal Title */}
            <Text style={styles.modalTitle}>{"Rename Location"}</Text>

            {/* Title Input */}
            <View>
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Title *"}
              </Text>
              <TextInput
                dense
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (validateText(text)) {
                    setTitleError("");
                  }
                }}
                style={styles.input}
                contentStyle={styles.inputText}
                placeholder="Enter Title"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                autoCapitalize="sentences"
                error={!!titleError}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                theme={{ colors: { onSurfaceVariant: "#777" } }}
              />
              {!!titleError ? (
                <HelperText
                  type="error"
                  visible={!!titleError}
                  style={styles.helper}
                >
                  {titleError}
                </HelperText>
              ) : null}
            </View>

            {/* Address Input */}
            <View>
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Address *"}
              </Text>
              <TextInput
                dense
                value={address}
                onChangeText={(text) => {
                  setAddress(text);
                  if (validateText(text)) {
                    setAddressError("");
                  }
                }}
                style={styles.input}
                contentStyle={[
                  styles.inputText,
                  { minHeight: 120, maxHeight: 200 },
                ]}
                placeholder="Enter Address"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                autoCapitalize="sentences"
                multiline={true}
                error={!!addressError}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                theme={{ colors: { onSurfaceVariant: "#777" } }}
              />
              {!!addressError ? (
                <HelperText
                  type="error"
                  visible={!!addressError}
                  style={styles.helper}
                >
                  {addressError}
                </HelperText>
              ) : null}
            </View>

            {/* Zip Code Input */}
            <View>
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Zip Code *"}
              </Text>
              <TextInput
                dense
                value={zipCode}
                onChangeText={(text) => {
                  setZipCode(text);
                  if (validateText(text)) {
                    setZipCodeError("");
                  }
                }}
                style={styles.input}
                contentStyle={styles.inputText}
                placeholder="Enter Zip Code"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                autoCapitalize="sentences"
                maxLength={6}
                error={!!zipCodeError}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                theme={{ colors: { onSurfaceVariant: "#777" } }}
              />
              {!!zipCodeError ? (
                <HelperText
                  type="error"
                  visible={!!zipCodeError}
                  style={styles.helper}
                >
                  {zipCodeError}
                </HelperText>
              ) : null}
            </View>

            {/* Button Update */}
            <TouchableOpacity
              style={[styles.locationModalBtnUpdate, { marginTop: 30 }]}
              activeOpacity={0.7}
              onPress={onValidateBtnPress}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={AppColor.white} />
              ) : (
                <Text style={styles.locationModalBtnText}>{"Update"}</Text>
              )}
            </TouchableOpacity>

            {/* Button Cancel */}
            <TouchableOpacity
              style={styles.locationModalBtnCancel}
              activeOpacity={0.7}
              onPress={onCancelPress}
              disabled={loading}
            >
              <Text
                style={[
                  styles.locationModalBtnText,
                  { color: AppColor.primary },
                ]}
              >
                {"Cancel"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* SnackBar */}
      <Snackbar
        visible={snackbarLocation.visible}
        onDismiss={() =>
          setSnackbarLocation({ ...snackbarLocation, visible: false })
        }
        duration={4000}
        style={{
          backgroundColor:
            snackbarLocation.type === "success"
              ? AppColor.snackbarSuccess
              : snackbarLocation.type === "error"
                ? AppColor.snackbarError
                : AppColor.snackbarDefault,
        }}
      >
        {snackbarLocation.message}
      </Snackbar>
    </Modal>
  );
};

const ProfileServingLocationScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { selectedLocations } = useSelector(
    (state) => state.foodTruckProfileReducer
  );
  const { user } = useSelector((state) => state.userReducer);

  const [availability, setAvailability] = useState([]);
  const [locationsData, setlocationsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const openNewestLocationOnSave = !!route?.params?.openNewestLocationOnSave;
  const [dataLoading, setDataLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(null);
  const [renameLocationData, setRenameLocationData] = useState(null);
  const [snackbarLocation, setSnackbarLocation] = useState({
    visible: false,
    message: "",
    type: "default",
  });

  const handleCallBackOfLocation = (
    newLocation,
    existingLocation,
    locationIndex
  ) => {
    if (existingLocation) {
      setlocationsData((prevLocations) =>
        prevLocations.map((item, index) =>
          index === locationIndex
            ? { ...item, ...newLocation } // merge newLocation into existing item
            : item
        )
      );

      // show rename location modal
      setRenameLocationData({
        ...newLocation,
        locationIndex: locationIndex,
        modalVisible: true,
      });
    } else {
      // show rename location modal
      setRenameLocationData({
        ...newLocation,
        locationIndex: locationsData.length,
        modalVisible: true,
      });
      setlocationsData((prevLocations) => [...prevLocations, newLocation]);
    }
  };

  const onRemoveLocationPress = async (index) => {
    const locationToRemove = locationsData[index];

    // Check if this location is used in availability
    const isUsedInAvailability = availability.some(
      (avail) => avail.locationId === locationToRemove._id
    );

    if (isUsedInAvailability) {
      Alert.alert(
        "Cannot Remove Location",
        "This location is currently being used in your weekly schedule. To remove it, please first update your availability by removing all time slots associated with this location.",
        [
          {
            text: "OK",
            onPress: () => {
              // Navigate to availability screen if you want
              // navigation.navigate("profileAvailabilityScreen");
            },
          },
        ]
      );
      return;
    }

    // If not used in availability, show confirmation
    Alert.alert(
      "Confirm Location Removal",
      "You're about to permanently remove this serving location. This action cannot be undone. Would you like to proceed?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              if (locationToRemove._id) {
                // Location exists in API - we should remove it there
                setDataLoading(true);
                const foodtruck_id = user?.foodTruck?._id;
                const response = await removeFoodtruckLocation_API({
                  foodtruck_id,
                  location_id: locationToRemove._id,
                });
                if (response?.success && response?.data) {
                  setAvailability(response.data.foodtruck.availability || []);

                  // update local state
                  const updatedLocations = locationsData.filter(
                    (_, i) => i !== index
                  );
                  setlocationsData(updatedLocations);
                  dispatch(setSelectedLocations(updatedLocations));

                  // Show success message
                  dispatch(
                    showSnackbar({
                      message: "Location has been successfully removed",
                      type: "success",
                    })
                  );
                }
              } else {
                // New location not yet saved to API - just remove from local state
                const updatedLocations = locationsData.filter(
                  (_, i) => i !== index
                );
                setlocationsData(updatedLocations);
              }
            } catch (error) {
              console.error("Error removing location:", error);
              dispatch(
                showSnackbar({
                  message: "We couldn't remove the location. Please try again.",
                  type: "error",
                })
              );
            } finally {
              setDataLoading(false);
            }
          },
        },
      ]
    );
  };

  const onEditLocationPress = ({ item, index }) => {
    console.log("Location item => ", item);
    navigation.navigate("profileMapScreen", {
      location: {
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.long),
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      },
      loactionTitle: item.title,
      loactionName: item.address,
      locationZipcode: item.zipcode,
      locationIndex: index,
      onGoBack: handleCallBackOfLocation,
    });
  };

  // Continue Btn API Call
  const handleLocationSavePress = async () => {
    for (let i = 0; i < locationsData.length; i++) {
      const location = locationsData[i];
      if (
        location.zipcode === "" ||
        location.zipcode === null ||
        location.zipcode === undefined
      ) {
        Alert.alert(
          "Zipcode required",
          `Please provide a valid zipcode for "${location.title}".`,
          [{ text: "OK" }]
        );
        return true; // Stop execution and indicate validation failure
      }
    }

    setLoading(true);
    try {
      const foodTruckPayload = {
        locations: locationsData,
      };
      const foodTruckId = user.foodTruck._id;
      const response = await updateFoodTruckProfile_API({
        payload: foodTruckPayload,
        foodTruckId,
      });
      if (response?.success && response?.data) {
        let updatedFoodTruck = response.data.foodtruck;
        if (openNewestLocationOnSave) {
          const savedLocations = updatedFoodTruck.locations || [];
          const newestDraftLocation = locationsData[locationsData.length - 1];
          const targetLocation =
            savedLocations.find(
              (location) =>
                location.title === newestDraftLocation?.title &&
                location.address === newestDraftLocation?.address
            ) ||
            savedLocations[savedLocations.length - 1] ||
            savedLocations[0];

          if (targetLocation?._id) {
            const orderingResponse = await updateLocationOrdering_API({
              foodtruck_id: foodTruckId,
              location_id: targetLocation._id,
              isOrderingOpen: true,
            });
            if (orderingResponse?.success && orderingResponse?.data?.foodtruck) {
              updatedFoodTruck = orderingResponse.data.foodtruck;
            }
          }
        }

        dispatch(updateFoodTruck(updatedFoodTruck));
        dispatch(setSelectedCuisine(updatedFoodTruck.cuisine));
        dispatch(setSelectedLocations(updatedFoodTruck.locations));
        dispatch(
          showSnackbar({
            message: openNewestLocationOnSave
              ? "Location added and ordering turned on."
              : "Location Updated!",
            type: "success",
          })
        );
        if (openNewestLocationOnSave) {
          navigation.navigate("homeScreen");
        } else {
          navigation.goBack();
        }
      }
    } catch (error) {
      console.log("error => ", error);
      dispatch(showSnackbar({ message: error.message, type: "error" }));
    } finally {
      setLoading(false);
    }
  };

  const handleLocationUpdatePress = async ({ payload, setLoading }) => {
    console.log("payload => ", payload);
    try {
      setLoading(true);

      const localStateUpdate = () => {
        const locationIndex = payload?.initialData?.locationIndex;
        const updatedLocations = locationsData.map((item, index) =>
          index === locationIndex
            ? {
                ...item,
                title: payload?.title,
                address: payload?.address,
                zipcode: payload?.zipcode,
              }
            : item
        );
        setlocationsData(updatedLocations);

        setRenameLocationData(null);
      };

      if (payload?.initialData?._id) {
        // update location in API and redux state

        const foodTruckId = user.foodTruck._id;
        const locationId = payload?.initialData?._id;
        const temp_location = selectedLocations.map((item) =>
          item._id === locationId
            ? {
                ...item,
                title: payload?.title,
                address: payload?.address,
                zipcode: payload?.zipcode,
              }
            : (() => {
                const newItem = { ...item };
                if (newItem.zipcode == null) delete newItem.zipcode; // Remove key if null/undefined
                return newItem;
              })()
        );
        const foodTruckPayload = {
          locations: temp_location,
        };

        const response = await updateFoodTruckProfile_API({
          payload: foodTruckPayload,
          foodTruckId,
        });
        if (response?.success && response?.data) {
          localStateUpdate();
          dispatch(
            showSnackbar({ message: "Location Updated!", type: "success" })
          );
        }
      } else {
        // update location in local state
        localStateUpdate();
      }
    } catch (error) {
      console.log("error => ", error);
      setSnackbarLocation({
        visible: true,
        message: error.message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    // Check if any object doesn't have "_id" key
    const hasMissingId = locationsData.some(
      (item) => !item.hasOwnProperty("_id")
    );

    if (hasMissingId) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Do you want to discard them?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              navigation.goBack();
            },
          },
        ],
        { cancelable: false }
      );
    } else {
      navigation.goBack();
    }
  };

  const getDataFromAPI = async () => {
    setDataLoading(true);
    try {
      const foodtruck_id = user?.foodTruck?._id;
      const response = await getFoodtruckDetail_API(foodtruck_id);
      if (response?.success && response?.data) {
        console.log("response => ", response);
        // dispatch(updateFoodTruck(response.data.foodtruck));
        // dispatch(setSelectedCuisine(response.data.foodtruck.cuisine));
        dispatch(setSelectedLocations(response.data.foodtruck.locations));

        setAvailability(response.data.foodtruck.availability || []);
      }
    } catch (error) {
      console.log("error => ", error);
      dispatch(showSnackbar({ message: error.message, type: "error" }));
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    getDataFromAPI();
  }, []);

  useEffect(() => {
    setlocationsData(selectedLocations);
  }, [selectedLocations]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBarManager />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.black}
          size={24}
          onPress={handleBackPress}
        />
        <Text style={styles.headerTitle}>{"Serving Locations"}</Text>
        <View style={styles.headerIconContainer}>
          {locationsData.length > 0 && (
            <TouchableOpacity
              hitSlop={10}
              onPress={() =>
                navigation.navigate("profileMapScreen", {
                  onGoBack: handleCallBackOfLocation,
                })
              }
              activeOpacity={0.7}
            >
              <AntDesign
                name="plussquareo"
                size={20}
                color={AppColor.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* content */}
      {dataLoading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <NativeIndicator color={AppColor.primary} size="large" />
        </View>
      ) : (
        <View style={{ flex: 1, marginBottom: 0 }}>
          <View style={styles.contentContainer}>
            <FlatList
              data={locationsData}
              extraData={locationsData}
              keyExtractor={(_, index) => index.toString()}
              contentContainerStyle={[
                styles.flatListContent,
                !locationsData ||
                  (locationsData?.length === 0 && { flexGrow: 1 }),
              ]}
              renderItem={({ item, index }) => (
                <View key={index} style={styles.locationContainer}>
                  <View style={[styles.locationItem, { marginBottom: 16 }]}>
                    <View
                      style={{
                        borderWidth: 1,
                        borderColor: AppColor.primary,
                        borderRadius: 5,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: Mulish400,
                          fontSize: 16,
                          color: AppColor.primary,
                        }}
                      >{`Location ${index + 1}`}</Text>
                    </View>
                    <Menu
                      mode="flat"
                      visible={menuVisible === index}
                      onDismiss={() => setMenuVisible(null)}
                      anchor={
                        <TouchableOpacity
                          onPress={() => setMenuVisible(index)}
                          style={{
                            height: 24,
                            width: 24,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <MaterialIcons
                            name="more-vert"
                            size={24}
                            color={AppColor.black}
                          />
                        </TouchableOpacity>
                      }
                      contentStyle={{
                        backgroundColor: AppColor.white,
                        borderWidth: 1,
                        borderColor: AppColor.border,
                        elevation: 1,
                        shadowColor: AppColor.black,
                        shadowOffset: {
                          width: 0,
                          height: 1,
                        },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                      }}
                    >
                      <Menu.Item
                        onPress={() => {
                          setMenuVisible(null);
                          setRenameLocationData({
                            ...item,
                            locationIndex: index,
                            modalVisible: true,
                          });
                        }}
                        title="Rename"
                        leadingIcon={"pencil"}
                      />
                      <Menu.Item
                        onPress={() => {
                          setMenuVisible(null);
                          onEditLocationPress({ item, index });
                        }}
                        title="Re-Locate"
                        leadingIcon={"google-maps"}
                      />
                      <Menu.Item
                        onPress={() => {
                          setMenuVisible(null);
                          onRemoveLocationPress(index);
                        }}
                        title="Remove"
                        leadingIcon={"trash-can"}
                      />
                    </Menu>
                  </View>
                  <View style={styles.locationItem}>
                    <SimpleLineIcons
                      name="location-pin"
                      size={27}
                      color={AppColor.primary}
                    />

                    <View style={{ flex: 1, paddingHorizontal: 12, gap: 2 }}>
                      <Text style={styles.locationTitle}>{item.title}</Text>
                      <Text style={styles.locationAddress}>{item.address}</Text>
                      <Text
                        style={styles.locationZipCode}
                      >{`ZipCode: ${item.zipcode || "N/A"}`}</Text>
                      {!item.zipcode ? (
                        <HelperText
                          type="error"
                          visible={!item.zipcode}
                          style={styles.helper}
                        >
                          {"Note: Zip Code is required"}
                        </HelperText>
                      ) : null}
                    </View>
                  </View>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={() => (
                <View style={styles.emptyListContainer}>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate("profileMapScreen", {
                        onGoBack: handleCallBackOfLocation,
                      })
                    }
                    activeOpacity={0.8}
                    style={styles.emptyListButton}
                  >
                    <AntDesign
                      name="pluscircle"
                      size={38}
                      color={AppColor.primary}
                    />
                    <Text style={styles.emptyListText}>
                      {"Add Your Serving\nLocations"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>

          {/* Continue Button */}
          {locationsData.length > 0 && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.continueButton}
                activeOpacity={0.7}
                onPress={handleLocationSavePress}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={AppColor.white} />
                ) : (
                  <Text style={styles.continueButtonText}>{"Continue"}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Rename Location Modal */}
      <RenameLocationModal
        data={renameLocationData}
        isModalVisible={renameLocationData?.modalVisible || false}
        onUpdatePress={handleLocationUpdatePress}
        onCancelPress={() => setRenameLocationData(null)}
        snackbarLocation={snackbarLocation}
        setSnackbarLocation={setSnackbarLocation}
      />
    </View>
  );
};

export default ProfileServingLocationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppColor.white,
    paddingHorizontal: 8,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderColor: "#E5E5EA",
  },
  headerTitle: {
    color: AppColor.black,
    fontSize: 20,
    fontFamily: Mulish700,
  },
  headerIconContainer: {
    width: 48,
    alignItems: "center",
  },

  // Content Container
  contentContainer: {
    flex: 1,
    // paddingTop: 8,
  },
  flatListContent: {
    borderRadius: 8,
    borderColor: "#F0F1F2",
  },

  // Location Container
  locationContainer: {
    paddingVertical: 15,
    paddingHorizontal: 12,
    marginHorizontal: 24,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: "#E5E5EA",
    backgroundColor: AppColor.white,
    ...Platform.select({
      ios: {
        shadowColor: AppColor.black,
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  locationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationTitle: {
    fontSize: 16,
    color: AppColor.black,
    fontFamily: Mulish600,
  },
  locationAddress: {
    fontSize: 14,
    color: AppColor.gray,
    fontFamily: Mulish400,
  },
  locationZipCode: {
    fontSize: 14,
    color: AppColor.text,
    fontFamily: Mulish400,
  },
  separator: {
    height: 4,
  },

  // Empty List Container
  emptyListContainer: {
    flex: 1,
    backgroundColor: AppColor.white,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 0,
  },
  emptyListButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyListText: {
    fontSize: 16,
    fontFamily: Mulish400,
    textAlign: "center",
    color: AppColor.text,
    marginTop: 10,
  },

  // Button Container
  buttonContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  continueButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginBottom: 20,
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
  continueButtonText: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.white,
  },

  // Modal
  modalContainer: {
    backgroundColor: AppColor.white,
    borderRadius: 24,
  },
  modalTitle: {
    marginBottom: 20,
    fontSize: 22,
    fontFamily: Mulish700,
    color: AppColor.text,
    textAlign: "center",
  },
  modalSubtitle: {
    marginBottom: 20,
    fontSize: 16,
    fontFamily: Mulish400,
    color: AppColor.textHighlighter,
    textAlign: "center",
  },
  locationModalBtnUpdate: {
    width: "100%",
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginTop: 15,
    ...Platform.select({
      ios: {
        shadowColor: AppColor.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  locationModalBtnCancel: {
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderRadius: 5,
    borderColor: AppColor.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },
  locationModalBtnText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontFamily: Mulish400,
    color: AppColor.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: AppColor.white,
  },
  inputText: {
    fontSize: 15,
    fontFamily: Mulish400,
  },
  helper: {
    // marginBottom: 8,
    paddingLeft: 0,
    // paddingTop: 0,
    fontFamily: Mulish400,
  },
});
