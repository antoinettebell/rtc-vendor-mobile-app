import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Platform,
  FlatList,
  Alert,
} from "react-native";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";
import { ActivityIndicator, IconButton } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import Octicons from "react-native-vector-icons/Octicons";
import Ionicons from "react-native-vector-icons/Ionicons";
import { RESULTS } from "react-native-permissions";
import ImagePicker from "react-native-image-crop-picker";
import usePermission from "../hooks/usePermission";
import { permission } from "../utils/permissions";
import MediaPickerDialog from "../components/MediaPickerDialog";
import { useDispatch, useSelector } from "react-redux";
import { updateFoodTruckProfile_API, uploadImage_API } from "../api/appAPI";
import { clearUserSlice, setUser } from "../redux/slices/userSlice";
import {
  clearFoodTruckProfileSlice,
  setSelectedLocations,
} from "../redux/slices/foodTruckProfileSlice";
import { onSignOut } from "../redux/slices/authSlice";
import StatusBarManager from "../components/StatusBarManager";

const AuthFoodTruckProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const { selectedCuisine, selectedLocations } = useSelector(
    (state) => state.foodTruckProfileReducer
  );
  const { user } = useSelector((state) => state.userReducer);

  const { checkAndRequestPermission: photosPermissionStatus } = usePermission(
    permission.photos
  );
  const { checkAndRequestPermission: cameraPermissionStatus } = usePermission(
    permission.camera
  );

  const [loading, setLoading] = useState(false);
  const [infoType, setInfoType] = useState("Food Truck");
  const [selectedMediaType, setSelectedMediaType] = useState(null);
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  const onPressUploadLogo = () => {
    setSelectedMediaType("logo");
    setModalVisible(true);
  };

  const onPressUploadPhotos = () => {
    setSelectedMediaType("photos");
    setModalVisible(true);
  };

  const onMediaModalClose = () => {
    setModalVisible(false);
    setSelectedMediaType(null);
  };

  const handleCameraPress = async (mediaType) => {
    setModalVisible(false);
    try {
      const cameraStatus = await cameraPermissionStatus();
      if (cameraStatus !== RESULTS.GRANTED) return;

      setTimeout(
        async () => {
          // Permission granted, open the camera
          await ImagePicker.openCamera({
            cropping: true,
            mediaType: "photo",
          })
            .then(async (image) => {
              try {
                const imagedata = {
                  mode: "camera",
                  uri: image?.path,
                  name: `${image?.path?.split("/").pop()}`, // did this because not able to get filename in ios
                  type: image.mime,
                };
                if (mediaType === "logo") {
                  setSelectedLogo(imagedata);
                } else {
                  setSelectedPhotos((prev) => [...prev, imagedata]);
                }
              } catch (error) {
                console.log("error => ", error);
              } finally {
                setSelectedMediaType(null);
              }
            })
            .catch((error) => {
              console.log("error => ", error);
            });
        },
        Platform.OS === "ios" ? 600 : 0
      );
    } catch (error) {
      console.error("error => ", error);
    } finally {
    }
  };

  const handleGalleryPress = async (mediaType) => {
    setModalVisible(false);
    try {
      const photosStatus = await photosPermissionStatus();
      if (photosStatus !== RESULTS.GRANTED && photosStatus !== RESULTS.LIMITED)
        return;

      setTimeout(
        async () => {
          await ImagePicker.openPicker({
            multiple: mediaType === "logo" ? false : true,
            mediaType: "photo",
          })
            .then((images) => {
              try {
                if (mediaType === "logo") {
                  const payload =
                    Platform.OS == "ios"
                      ? {
                          mode: "media",
                          uri: images?.sourceURL,
                          name: images?.filename,
                          type: images.mime,
                        }
                      : {
                          mode: "media",
                          uri: images?.path,
                          name: images?.filename,
                          type: images.mime,
                        };
                  setSelectedLogo(payload);
                } else {
                  const tempImages = images.map((i) =>
                    Platform.OS == "ios"
                      ? {
                          mode: "media",
                          uri: i?.sourceURL,
                          name: i?.filename,
                          type: i.mime,
                        }
                      : {
                          mode: "media",
                          uri: i?.path,
                          name: i?.filename,
                          type: i.mime,
                        }
                  );
                  setSelectedPhotos((prev) => [...prev, ...tempImages]);
                }
              } catch (error) {
                console.log("error => ", error);
              } finally {
                setSelectedMediaType(null);
              }
            })
            .catch((error) => {
              console.log("error => ", error);
            });
        },
        Platform.OS === "ios" ? 600 : 0
      );
    } catch (error) {
      console.error("error => ", error);
    } finally {
    }
  };

  const onPhotosRemovePress = (index) => {
    const tempPhotos = selectedPhotos.filter((_, i) => i !== index);
    setSelectedPhotos(tempPhotos);
  };

  const handleContinueBtnPress = async () => {
    setLoading(true);
    try {
      // upload logo
      let logoResult = null;
      if (selectedLogo) {
        const formData = new FormData();
        formData.append("file", {
          uri: selectedLogo.uri,
          name: selectedLogo.name,
          type: selectedLogo.type,
        });
        console.log("logo => ", formData);
        try {
          const response = await uploadImage_API(formData);
          if (response.success && response.data)
            logoResult = {
              ...selectedLogo,
              serverResponse: response.data.file,
            };
        } catch (error) {
          console.log("error => ", error);
        }
      }

      // upload selected photos
      const imageResult = [];
      for (const image of selectedPhotos) {
        console.log("image => ", image);
        const formData = new FormData();
        formData.append("file", {
          uri: image.uri,
          name: image.name,
          type: image.type,
        });
        console.log("photo => ", formData);
        try {
          const response = await uploadImage_API(formData);
          if (response.success && response.data)
            imageResult.push({
              ...image,
              serverResponse: response.data.file,
            });
        } catch (error) {
          console.log("error => ", error);
        }
      }

      let payload = {
        infoType: infoType === "Food Truck" ? "truck" : "caterer",
      };
      if (logoResult) {
        payload.logo = logoResult.serverResponse;
      }
      if (imageResult?.length > 0) {
        const tempURL = imageResult.map((item) => item.serverResponse);
        payload.photos = tempURL;
      }
      if (selectedLocations?.length > 0) {
        payload.locations = selectedLocations;
      }
      if (selectedCuisine?.length > 0) {
        const tempIDs = selectedCuisine.map((item) => item._id);
        payload.cuisine = tempIDs;
      }

      console.log("payload ===> ", payload);
      console.log("foodTruckId ===> ", user?.foodTruck?._id);

      const response = await updateFoodTruckProfile_API({
        payload,
        foodTruckId: user?.foodTruck?._id,
      });
      if (response.success && response.data) {
        console.log("response => ", response);
        dispatch(setSelectedLocations(response.data.foodtruck.locations));
        console.log("USER => ", {
          ...user,
          foodTruck: response.data.foodtruck,
        });
        dispatch(setUser({ ...user, foodTruck: response.data.foodtruck }));
        navigation.navigate("authAvailabilityScreen");
      }
    } catch (error) {
      console.error("error => ", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignout = async () => {
    Alert.alert(
      "Exit Registration?",
      "Any unsaved data will be lost. Do you want to sign-out anyway?",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Signout",
          onPress: () => {
            dispatch(clearUserSlice());
            dispatch(clearFoodTruckProfileSlice());
            dispatch(onSignOut());
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBarManager barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon={(props) => (
            <Octicons
              name="sign-out"
              size={props.size}
              color={AppColor.white}
            />
          )}
          onPress={handleSignout}
        />
        <Text style={styles.headerTitle}>Food Truck Profile</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        enabled={Platform.OS === "ios"}
        behavior="padding"
        style={{ flex: 1, marginBottom: -insets.bottom }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          pointerEvents={loading ? "none" : "auto"}
        >
          <View style={{ flex: 1 }}>
            {/* Step Indicator */}
            <View style={styles.stepContainer}>
              <View style={styles.stepSubContainer}>
                <View style={styles.filledCircle}>
                  <FontAwesome6 name="check" color={AppColor.white} size={18} />
                </View>
              </View>
              <View style={styles.line} />
              <View style={styles.stepContainer}>
                <View style={styles.emptyCircle} />
              </View>
            </View>

            {/* Main Form */}
            <View
              style={[styles.content, { paddingBottom: insets.bottom + 20 }]}
            >
              {/* Food Truck Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Food truck info</Text>
                <Text style={styles.sectionSubtitle}>
                  Tell your customer about your food truck!!
                </Text>
              </View>

              <View style={styles.hr} />

              {/* Logo Upload */}
              <View style={styles.section}>
                <Text style={styles.label}>Select Logo</Text>
                <View style={styles.logoContainer}>
                  {selectedLogo?.uri ? (
                    <View style={styles.logoImageWrapper}>
                      <Image
                        source={{ uri: selectedLogo?.uri }}
                        style={styles.logoImage}
                      />
                    </View>
                  ) : (
                    <View
                      style={{
                        width: 140,
                        height: 140,
                        borderRadius: 70,
                        marginTop: 10,
                        backgroundColor: AppColor.primary,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FontAwesome6
                        name="truck-fast"
                        color={AppColor.white}
                        size={50}
                      />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={onPressUploadLogo}
                  >
                    <FontAwesome6
                      name="upload"
                      color={AppColor.black}
                      size={20}
                    />
                    <Text style={styles.uploadButtonText}>Upload Photo</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Photos Upload */}
              <View style={styles.section}>
                <Text style={styles.label}>Select Food Truck Photos</Text>
                <TouchableOpacity
                  style={styles.photoUploadContainer}
                  onPress={onPressUploadPhotos}
                >
                  <FontAwesome6
                    name="upload"
                    color={AppColor.black}
                    size={20}
                  />
                  <Text style={styles.uploadButtonText}>Upload Photos</Text>
                </TouchableOpacity>

                {selectedPhotos?.length > 0 && (
                  <View>
                    <FlatList
                      data={selectedPhotos}
                      extraData={selectedPhotos}
                      horizontal
                      keyExtractor={(item) => item.uri}
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ marginTop: 10 }}
                      renderItem={({ item, index }) => (
                        <View style={{ marginRight: 15 }}>
                          <Image
                            source={{ uri: item.uri }}
                            style={styles.thumbnail}
                          />
                          <TouchableOpacity
                            hitSlop={5}
                            style={{
                              position: "absolute",
                              right: -8,
                              top: -8,
                              backgroundColor: AppColor.primary,
                              borderRadius: 10,
                              height: 20,
                              width: 20,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            onPress={() => onPhotosRemovePress(index)}
                            activeOpacity={0.7}
                          >
                            <FontAwesome6
                              name="minus"
                              size={14}
                              color={AppColor.white}
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                  </View>
                )}
              </View>

              {/* Radio Buttons */}
              <View style={styles.radioContainer}>
                {["Food Truck", "Food Caterer"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.radioButton}
                    onPress={() => setInfoType(type)}
                  >
                    <View style={styles.radioOuterCircle}>
                      {infoType === type && (
                        <View style={styles.radioInnerCircle} />
                      )}
                    </View>
                    <Text style={styles.radioLabel}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Cuisine and Location */}
              <View style={styles.section}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate("authSelectCuisineScreen")}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 10,
                  }}
                >
                  <Text style={styles.label}>Serving Cuisine</Text>
                  <FontAwesome6
                    name="angle-right"
                    color={AppColor.black}
                    size={18}
                  />
                </TouchableOpacity>

                {selectedCuisine?.map((item) => (
                  <View key={item._id} style={styles.dropdown}>
                    <Ionicons
                      name="fast-food-outline"
                      size={18}
                      color={AppColor.primary}
                    />

                    <Text style={styles.dropdownText}>{item.name}</Text>
                  </View>
                ))}

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate("authServingLocationScreen")
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 10,
                  }}
                >
                  <Text style={[styles.label]}>Serving Location</Text>
                  <FontAwesome6
                    name="angle-right"
                    color={AppColor.black}
                    size={18}
                  />
                </TouchableOpacity>
                {selectedLocations?.map((item) => (
                  <View key={item._id} style={styles.dropdown}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={AppColor.primary}
                    />

                    <Text style={styles.dropdownText}>{item.title}</Text>
                  </View>
                ))}
              </View>

              {/* Continue Button */}
              <TouchableOpacity
                onPress={handleContinueBtnPress}
                activeOpacity={0.7}
                style={styles.continueButton}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={AppColor.white} />
                ) : (
                  <Text style={styles.continueButtonText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Media Picker Modal */}
      <MediaPickerDialog
        isVisible={modalVisible}
        onCameraPress={() => handleCameraPress(selectedMediaType)}
        onGalleryPress={() => handleGalleryPress(selectedMediaType)}
        onClosePress={onMediaModalClose}
      />
    </View>
  );
};

export default AuthFoodTruckProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppColor.primary,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTitle: {
    color: AppColor.white,
    fontSize: 20,
    fontFamily: Primary400,
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  stepSubContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  filledCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColor.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: AppColor.primary,
  },
  line: { width: "25%", height: 2, backgroundColor: AppColor.primary },
  content: { flex: 1, backgroundColor: AppColor.white },
  section: { marginVertical: 16, paddingHorizontal: 24 },
  sectionTitle: { fontSize: 24, fontFamily: Primary400, color: AppColor.text },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: Secondary400,
    color: AppColor.textHighlighter,
    marginTop: 4,
  },
  hr: {
    height: 1,
    backgroundColor: "#E5E5EA",
    width: "100%",
  },
  label: {
    fontSize: 18,
    fontFamily: Secondary400,
    color: AppColor.black,
    marginBottom: 8,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 30,
  },
  logoImageWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginTop: 10,
    overflow: "hidden",
  },
  logoImage: { width: "100%", height: "100%" },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppColor.black,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: AppColor.black,
    fontFamily: Secondary400,
  },
  photoUploadContainer: {
    height: 104,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: AppColor.gray,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  thumbnailContainer: { flexDirection: "row" },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 5,
  },
  radioContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 24,
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
  },
  radioOuterCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: AppColor.black,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AppColor.black,
  },
  radioLabel: {
    marginLeft: 8,
    fontSize: 15,
    fontFamily: Secondary400,
    color: AppColor.black,
  },
  dropdown: {
    width: "100%",
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  dropdownText: {
    color: AppColor.text,
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    fontFamily: Secondary400,
  },
  continueButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginVertical: 20,
    marginHorizontal: 24,
    ...Platform.select({
      ios: {
        shadowColor: AppColor.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  continueButtonText: {
    fontFamily: Secondary400,
    fontSize: 16,
    color: AppColor.white,
  },
});
