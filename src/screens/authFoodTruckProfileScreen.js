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
  TextInput,
  Dimensions,
  Pressable,
} from "react-native";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";
import { ActivityIndicator, Divider, IconButton } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import Octicons from "react-native-vector-icons/Octicons";
import Ionicons from "react-native-vector-icons/Ionicons";
import { RESULTS } from "react-native-permissions";
import ImagePicker from "react-native-image-crop-picker";
import usePermission from "../hooks/usePermission";
import { permission } from "../helpers/permission.helper";
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
import { Dropdown } from "react-native-element-dropdown";
import FastImage from "@d11/react-native-fast-image";

const dropdownData = [
  {
    label: "Facebook",
    value: "facebook",
    icon: require("../assets/images/facebook.png"),
    type: "social",
    txt: "",
    disable: false,
  },
  {
    label: "Twitter",
    value: "twitter",
    icon: require("../assets/images/twitter.png"),
    type: "social",
    txt: "",
    disable: false,
  },
  {
    label: "Instagram",
    value: "instagram",
    icon: require("../assets/images/instagram.png"),
    type: "social",
    txt: "",
    disable: false,
  },
  {
    label: "Website",
    value: "website",
    icon: require("../assets/images/global.png"),
    type: "web",
    txt: "",
    disable: false,
  },
];

const { width } = Dimensions.get("window");

const MediaLinksComponent = ({
  dropdownData,
  selectedSocialMedia,
  setSelectedSocialMedia,
  socialMediaLink,
  setSocialMediaLink,
}) => {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: AppColor.border,
        borderRadius: 8,
      }}
    >
      <View style={{ width: 80 }}>
        <View
          style={{
            justifyContent: "center",
            paddingLeft: 16,
            height: 46,
          }}
        >
          <FastImage
            source={
              selectedSocialMedia
                ? selectedSocialMedia.icon
                : dropdownData[0].icon
            }
            style={{ width: 24, height: 24 }}
          />
        </View>
        <Dropdown
          data={dropdownData}
          labelField="txt"
          valueField="value"
          value={selectedSocialMedia}
          onChange={(item) => {
            setSelectedSocialMedia(item);
          }}
          placeholder=""
          style={styles.dropdownForMedia}
          containerStyle={{ width: width - 50 }}
          placeholderStyle={{
            fontFamily: Secondary400,
            color: AppColor.textHighlighter,
          }}
          itemTextStyle={{ fontFamily: Secondary400 }}
          selectedTextStyle={{ fontFamily: Secondary400 }}
          renderItem={(item) => (
            <Pressable
              disabled={!item.disable} // for dropdown condition works opposite
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingVertical: 8,
                paddingHorizontal: 16,
                opacity: !item.disable ? 1 : 0.5,
              }}
            >
              <FastImage source={item.icon} style={{ width: 24, height: 24 }} />
              <Text style={styles.dropdownText}>{item.label}</Text>
            </Pressable>
          )}
        />
      </View>

      <View
        style={{
          width: 1,
          height: "100%",
          backgroundColor: AppColor.border,
        }}
      />

      <TextInput
        value={socialMediaLink}
        onChangeText={(txt) => {
          setSocialMediaLink(txt);
        }}
        style={styles.input}
        placeholder={`Enter ${selectedSocialMedia?.label} Link`}
        placeholderTextColor={AppColor.placeholderTextColor}
        autoCapitalize="none"
      />
    </View>
  );
};

const AuthFoodTruckProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { selectedCuisine, selectedLocations } = useSelector(
    (state) => state.foodTruckProfileReducer
  );
  const { user, selectedPlan } = useSelector((state) => state.userReducer);

  const { checkAndRequestPermission: photosPermissionStatus } = usePermission(
    permission.photos
  );
  const { checkAndRequestPermission: cameraPermissionStatus } = usePermission(
    permission.camera
  );

  const getPlanLimits = () => {
    switch (selectedPlan?.slug) {
      case "SUB_BASIC":
        return "isBasicPlan";
      case "SUB_PLATINUM":
        return "isPlatinumPlan";
      case "SUB_ELITE":
        return "isElitePlan";
      default:
        return false;
    }
  };

  const isBasicPlan = getPlanLimits() === "isBasicPlan";
  const isPlatinumPlan = getPlanLimits() === "isPlatinumPlan";
  const isElitePlan = getPlanLimits() === "isElitePlan";

  const [loading, setLoading] = useState(false);
  const [infoType, setInfoType] = useState("Food Truck");
  const [selectedMediaType, setSelectedMediaType] = useState(null);
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType1, setSelectedType1] = useState(dropdownData[0]);
  const [selectedType2, setSelectedType2] = useState(dropdownData[0]);
  const [selectedType3, setSelectedType3] = useState(dropdownData[3]);
  const [selectedType4, setSelectedType4] = useState(dropdownData[3]);
  const [mediaLink1, setMediaLink1] = useState("");
  const [mediaLink2, setMediaLink2] = useState("");
  const [mediaLink3, setMediaLink3] = useState("");
  const [mediaLink4, setMediaLink4] = useState("");

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
            cropping: false,
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
                          name: `${images?.path?.split("/").pop()}`, // did this because in android > choose from gallary; not have filename
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
                          name: `${i?.path?.split("/").pop()}`, // did this because in android > choose from gallary; not have filename
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

  const createSocialMediaPayload = () => {
    const socialMedia = [];

    // Helper function to convert your format to the API's expected format
    const convertMediaType = (value) => {
      switch (value.toLowerCase()) {
        case "facebook":
          return "FACEBOOK";
        case "instagram":
          return "INSTAGRAM";
        case "twitter":
          return "TWITTER";
        case "linkedin":
          return "LINKEDIN";
        case "tiktok":
          return "TIKTOK";
        case "youtube":
          return "YOUTUBE";
        case "snapchat":
          return "SNAPCHAT";
        case "pinterest":
          return "PINTEREST";
        case "reddit":
          return "REDDIT";
        case "website":
          return "WEB";
        default:
          return value.toUpperCase(); // fallback
      }
    };

    // Check each media link and add to payload if not empty
    if (mediaLink1) {
      socialMedia.push({
        mediaType: convertMediaType(selectedType1.value),
        mediaUrl: mediaLink1,
      });
    }

    if (mediaLink2 && !isBasicPlan) {
      socialMedia.push({
        mediaType: convertMediaType(selectedType2.value),
        mediaUrl: mediaLink2,
      });
    }

    if (mediaLink3) {
      socialMedia.push({
        mediaType: convertMediaType(selectedType3.value),
        mediaUrl: mediaLink3,
      });
    }

    if (mediaLink4 && !isBasicPlan) {
      socialMedia.push({
        mediaType: convertMediaType(selectedType4.value),
        mediaUrl: mediaLink4,
      });
    }

    return socialMedia?.length > 0 ? { socialMedia } : {};
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
          if (response?.success && response?.data)
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
          if (response?.success && response?.data)
            imageResult.push({
              ...image,
              serverResponse: response.data.file,
            });
        } catch (error) {
          console.log("error => ", error);
        }
      }

      let payload = {
        ...(createSocialMediaPayload()?.socialMedia?.length > 0 && {
          socialMedia: createSocialMediaPayload().socialMedia,
        }),
        infoType: infoType === "Food Truck" ? "truck" : "caterer",
        planId: selectedPlan?._id,
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
      if (response?.success && response?.data) {
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

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBarManager barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.white}
          size={24}
          onPress={() => navigation.goBack()}
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

              <Divider />

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

              {/* Social Media */}
              <View style={[styles.section, { gap: 10 }]}>
                {/* media link 1 */}
                <MediaLinksComponent
                  dropdownData={
                    isElitePlan
                      ? dropdownData
                      : dropdownData.map((item) =>
                          item.type === "web"
                            ? { ...item, disable: true }
                            : item
                        )
                  }
                  selectedSocialMedia={selectedType1}
                  setSelectedSocialMedia={setSelectedType1}
                  socialMediaLink={mediaLink1}
                  setSocialMediaLink={setMediaLink1}
                />

                {/* media link 2 */}
                {!isBasicPlan ? (
                  <MediaLinksComponent
                    dropdownData={
                      isElitePlan
                        ? dropdownData
                        : dropdownData.map((item) =>
                            item.type === "web"
                              ? { ...item, disable: true }
                              : item
                          )
                    }
                    selectedSocialMedia={selectedType2}
                    setSelectedSocialMedia={setSelectedType2}
                    socialMediaLink={mediaLink2}
                    setSocialMediaLink={setMediaLink2}
                  />
                ) : null}

                {/* media link 3 */}
                <MediaLinksComponent
                  dropdownData={
                    isElitePlan
                      ? dropdownData
                      : dropdownData.map((item) =>
                          item.type === "social"
                            ? { ...item, disable: true }
                            : item
                        )
                  }
                  selectedSocialMedia={selectedType3}
                  setSelectedSocialMedia={setSelectedType3}
                  socialMediaLink={mediaLink3}
                  setSocialMediaLink={setMediaLink3}
                />

                {/* media link 4 */}
                {!isBasicPlan ? (
                  <MediaLinksComponent
                    dropdownData={
                      isElitePlan
                        ? dropdownData
                        : dropdownData.map((item) =>
                            item.type === "social"
                              ? { ...item, disable: true }
                              : item
                          )
                    }
                    selectedSocialMedia={selectedType4}
                    setSelectedSocialMedia={setSelectedType4}
                    socialMediaLink={mediaLink4}
                    setSocialMediaLink={setMediaLink4}
                  />
                ) : null}
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

  // Header
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

  // Step Indicator
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
  line: { width: "18%", height: 2, backgroundColor: AppColor.primary },

  // Content
  content: { flex: 1, backgroundColor: AppColor.white },
  section: { marginVertical: 16, paddingHorizontal: 24 },
  sectionTitle: { fontSize: 24, fontFamily: Primary400, color: AppColor.text },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: Secondary400,
    color: AppColor.textHighlighter,
    marginTop: 4,
  },
  label: {
    fontSize: 18,
    fontFamily: Secondary400,
    color: AppColor.black,
    marginBottom: 8,
  },

  // Image [Logo, Photos]
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

  // Radio Buttons
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

  // Dropdown
  dropdownForMedia: {
    position: "absolute",
    height: 46,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
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

  // Input
  input: {
    flex: 1,
    height: 46,
    fontSize: 15,
    fontFamily: Secondary400,
    backgroundColor: AppColor.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    // borderWidth: 1,
    // borderColor: AppColor.border,
  },
  helper: {
    marginBottom: 8,
    paddingLeft: 0,
    paddingTop: 0,
  },

  // Continue Button
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
