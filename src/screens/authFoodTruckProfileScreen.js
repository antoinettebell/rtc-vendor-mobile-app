import React, { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Platform,
  FlatList,
  TextInput as NativeTextInput,
  Dimensions,
  Pressable,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import {
  ActivityIndicator,
  Divider,
  HelperText,
  IconButton,
  TextInput,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import Ionicons from "react-native-vector-icons/Ionicons";
import AntDesign from "react-native-vector-icons/AntDesign";
import { RESULTS } from "react-native-permissions";
import { Dropdown } from "react-native-element-dropdown";
import FastImage from "@d11/react-native-fast-image";
import ImagePicker from "react-native-image-crop-picker";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import usePermission from "../hooks/usePermission";
import { permission } from "../helpers/permission.helper";
import { setUser } from "../redux/slices/userSlice";
import { setSelectedLocations } from "../redux/slices/foodTruckProfileSlice";
import { updateFoodTruckProfile_API, uploadImage_API } from "../api/appAPI";
import MediaPickerDialog from "../components/MediaPickerDialog";
import StatusBarManager from "../components/StatusBarManager";
import { useFocusEffect } from "@react-navigation/native";
import { formatEIN, formatSSN } from "../helpers/profile.helper";
import { empNumberList } from "../utils/constants";
import AppImage from "../components/AppImage";

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

const validateEinNumber = (text) => {
  const digitsOnly = text.replace(/\D/g, "");
  return digitsOnly.length === 9;
};

const validateSsnNumber = (text) => {
  const digitsOnly = text.replace(/\D/g, "");
  return digitsOnly.length === 9;
};

const MediaLinksComponent = ({
  dropdownData,
  selectedSocialMedia,
  setSelectedSocialMedia,
  socialMediaLink,
  setSocialMediaLink,
}) => {
  // Handle onChange for website links
  const handleTextChange = (txt) => {
    if (selectedSocialMedia?.type === "web") {
      // If user is entering a website URL
      if (txt === "") {
        // If user clears the field, reset to https://
        setSocialMediaLink("https://");
      } else if (
        socialMediaLink === "https://" &&
        !txt.startsWith("https://")
      ) {
        // If current value is just https:// and new text doesn't start with it, don't allow clearing it
        setSocialMediaLink("https://");
      } else if (txt.startsWith("https://https://")) {
        // Fix for duplicate https:// prefix
        setSocialMediaLink("https://" + txt.substring(16));
      } else if (txt.startsWith("https://http://")) {
        // Fix for malformed duplicate prefix
        setSocialMediaLink("https://" + txt.substring(15));
      } else if (txt.startsWith("https://")) {
        // If text already has https://, use it as is
        setSocialMediaLink(txt);
      } else if (txt.startsWith("http://")) {
        // If text has http://, convert to https://
        setSocialMediaLink("https://" + txt.substring(7));
      }
    } else {
      // For non-website links, just set the value as is
      setSocialMediaLink(txt);
    }
  };

  // Initialize website fields with https://
  React.useEffect(() => {
    if (selectedSocialMedia?.type === "web" && !socialMediaLink) {
      setSocialMediaLink("https://");
    }
  }, [selectedSocialMedia]);

  // For website type, prepopulate with https:// in placeholder
  const getPlaceholder = () => {
    if (selectedSocialMedia?.type === "web") {
      return `Enter ${selectedSocialMedia?.label} Link (https://...)`;
    }
    return `Enter ${selectedSocialMedia?.label} Link`;
  };

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
            // Initialize with https:// for website type, otherwise clear
            if (item.type === "web") {
              setSocialMediaLink("https://");
            } else {
              setSocialMediaLink("");
            }
          }}
          placeholder=""
          style={styles.dropdownForMedia}
          containerStyle={{ width: width - 50 }}
          placeholderStyle={{
            fontFamily: Mulish400,
            color: AppColor.textHighlighter,
          }}
          itemTextStyle={{ fontFamily: Mulish400 }}
          selectedTextStyle={{ fontFamily: Mulish400 }}
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

      <NativeTextInput
        value={socialMediaLink}
        onChangeText={handleTextChange}
        style={styles.input}
        placeholder={getPlaceholder()}
        placeholderTextColor={AppColor.placeholderTextColor}
        autoCapitalize="none"
        onKeyPress={({ nativeEvent }) => {
          // Prevent deleting the https:// prefix for website type
          if (
            selectedSocialMedia?.type === "web" &&
            (socialMediaLink === "https://" || socialMediaLink.length <= 8) &&
            nativeEvent.key === "Backspace"
          ) {
            // Prevent default behavior
            return;
          }
        }}
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
  const [selectedEmpNumberType, setSelectedEmpNumberType] = useState("ein");
  const [selectedEmpNumberText, setSelectedEmpNumberText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType1, setSelectedType1] = useState(dropdownData[0]);
  const [selectedType2, setSelectedType2] = useState(dropdownData[0]);
  const [selectedType3, setSelectedType3] = useState(dropdownData[3]);
  const [selectedType4, setSelectedType4] = useState(dropdownData[3]);
  const [mediaLink1, setMediaLink1] = useState("");
  const [mediaLink2, setMediaLink2] = useState("");
  const [mediaLink3, setMediaLink3] = useState("https://"); // Initialize with https:// since it's a website type
  const [mediaLink4, setMediaLink4] = useState("https://"); // Initialize with https:// since it's a website type
  const [errors, setErrors] = useState({
    logo: "",
    photos: "",
    empNumber: "",
    cuisine: "",
    location: "",
  });

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
                  setErrors((prev) => ({
                    ...prev,
                    logo: "",
                  }));
                } else {
                  setSelectedPhotos((prev) => [...prev, imagedata]);
                  setErrors((prev) => ({
                    ...prev,
                    photos: "",
                  }));
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
                  setErrors((prev) => ({
                    ...prev,
                    logo: "",
                  }));
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
                  setErrors((prev) => ({
                    ...prev,
                    photos: "",
                  }));
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

    // Helper function to ensure website URLs have https:// and return null if only https:// is present
    const formatWebsiteUrl = (url, type) => {
      if (type.toLowerCase() === "website" || type.toUpperCase() === "WEB") {
        // If URL is just https:// with nothing after it, return null
        if (url === "https://" || url.trim() === "https://") {
          return null;
        }
        // If URL doesn't start with http:// or https://, add https://
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          return `https://${url}`;
        } else if (url.startsWith("http://")) {
          // Convert http:// to https://
          return `https://${url.substring(7)}`;
        }
      }
      return url; // Return unchanged for non-website URLs
    };

    // Check each media link and add to payload if not empty and not just https://
    if (mediaLink1) {
      const formattedUrl = formatWebsiteUrl(mediaLink1, selectedType1.value);
      if (formattedUrl) {
        socialMedia.push({
          mediaType: convertMediaType(selectedType1.value),
          mediaUrl: formattedUrl,
        });
      }
    }

    if (mediaLink2 && !isBasicPlan) {
      const formattedUrl = formatWebsiteUrl(mediaLink2, selectedType2.value);
      if (formattedUrl) {
        socialMedia.push({
          mediaType: convertMediaType(selectedType2.value),
          mediaUrl: formattedUrl,
        });
      }
    }

    if (mediaLink3) {
      const formattedUrl = formatWebsiteUrl(mediaLink3, selectedType3.value);
      if (formattedUrl) {
        socialMedia.push({
          mediaType: convertMediaType(selectedType3.value),
          mediaUrl: formattedUrl,
        });
      }
    }

    if (mediaLink4 && !isBasicPlan) {
      const formattedUrl = formatWebsiteUrl(mediaLink4, selectedType4.value);
      if (formattedUrl) {
        socialMedia.push({
          mediaType: convertMediaType(selectedType4.value),
          mediaUrl: formattedUrl,
        });
      }
    }

    return socialMedia?.length > 0 ? { socialMedia } : {};
  };

  const handleContinueBtnPress = async () => {
    // Validate all required fields
    const newErrors = {
      logo: selectedLogo ? "" : "Logo is required",
      photos: selectedPhotos.length > 0 ? "" : "At least one image is required",
      empNumber:
        selectedEmpNumberType === "ein"
          ? validateEinNumber(selectedEmpNumberText)
            ? ""
            : "Please enter a valid 9-digit EIN"
          : validateSsnNumber(selectedEmpNumberText)
            ? ""
            : "Please enter a valid 9-digit SSN",
      cuisine:
        selectedCuisine.length > 0 ? "" : "At least one Cuisine is required",
      location:
        selectedLocations.length > 0 ? "" : "At least one Location is required",
    };

    setErrors(newErrors);

    // Check if there are any errors
    const hasErrors = Object.values(newErrors).some((error) => error !== "");
    if (hasErrors) {
      return;
    }

    // proceed with saving
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
      if (selectedEmpNumberType === "ein") {
        payload.ein = selectedEmpNumberText;
        // payload.ssn = null;
      } else {
        // payload.ein = null;
        payload.ssn = selectedEmpNumberText;
      }
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

  useFocusEffect(
    useCallback(() => {
      setErrors((prev) => {
        const newErrors = { ...prev };

        // Conditionally update cuisine error
        if (selectedCuisine.length > 0) {
          newErrors.cuisine = ""; // Clear error if cuisine is selected
        }

        // Conditionally update location error
        if (selectedLocations.length > 0) {
          newErrors.location = ""; // Clear error if location is selected
        }

        return newErrors;
      });
    }, [selectedCuisine, selectedLocations])
  );

  return (
    <View style={styles.container}>
      <StatusBarManager barStyle="light-content" />

      {/* Header Container */}
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
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          pointerEvents={loading ? "none" : "auto"}
        >
          <View style={{ flex: 1 }}>
            {/* Step Indicator Container */}
            <View style={styles.stepContainer}>
              <View style={styles.stepSubContainer}>
                <View style={styles.filledCircle}>
                  <FontAwesome6 name="check" color={AppColor.white} size={18} />
                </View>
              </View>
              <View style={styles.line} />
              <View style={styles.stepSubContainer}>
                <View style={styles.filledCircle}>
                  <FontAwesome6
                    name="person-walking"
                    color={AppColor.white}
                    size={18}
                  />
                </View>
              </View>
              <View style={styles.line} />
              <View style={styles.stepSubContainer}>
                <View style={styles.emptyCircle} />
              </View>
              <View style={styles.line} />
              <View style={styles.stepSubContainer}>
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
                  {"Tell your customer about your food truck!!"}
                </Text>
              </View>

              <Divider />

              {/* Logo Upload */}
              <View style={styles.section}>
                <Text style={styles.label}>Select Logo</Text>
                <View style={styles.logoContainer}>
                  {selectedLogo?.uri ? (
                    <View style={styles.logoImageWrapper}>
                      <AppImage
                        uri={selectedLogo?.uri}
                        containerStyle={styles.logoImage}
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
                {!!errors.logo && (
                  <HelperText
                    type="error"
                    visible={!!errors.logo}
                    style={[styles.helper, { alignSelf: "center" }]}
                  >
                    {errors.logo}
                  </HelperText>
                )}
              </View>

              {/* Photos Upload */}
              <View style={styles.section}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <Text style={styles.label}>Select Food Truck Photos</Text>
                  {selectedPhotos?.length > 0 && (
                    <TouchableOpacity
                      hitSlop={5}
                      activeOpacity={0.7}
                      onPress={onPressUploadPhotos}
                    >
                      <AntDesign
                        name="plussquareo"
                        size={20}
                        color={AppColor.primary}
                      />
                    </TouchableOpacity>
                  )}
                </View>
                {selectedPhotos?.length === 0 && (
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
                )}

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
                          <AppImage
                            uri={item.uri}
                            containerStyle={styles.thumbnail}
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

                {!!errors.photos && (
                  <HelperText
                    type="error"
                    visible={!!errors.photos}
                    style={[styles.helper, { alignSelf: "center" }]}
                  >
                    {errors.photos}
                  </HelperText>
                )}
              </View>

              {/* EIN/SSN Number */}
              <View style={styles.section}>
                <Text style={styles.paperInputLabel}>{"EIN/SSN Number"}</Text>
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
                    <Dropdown
                      data={empNumberList}
                      labelField="label"
                      valueField="type"
                      value={selectedEmpNumberType}
                      onChange={(item) => {
                        setSelectedEmpNumberType(item.type);
                        if (!selectedEmpNumberText?.trim()?.length) {
                          setErrors((prev) => ({
                            ...prev,
                            empNumber: "",
                          }));
                          return;
                        }
                        if (item.type === "ein") {
                          setErrors((prev) => ({
                            ...prev,
                            empNumber: validateEinNumber(selectedEmpNumberText)
                              ? ""
                              : "Please enter a valid 9-digit EIN",
                          }));
                        } else {
                          setErrors((prev) => ({
                            ...prev,
                            empNumber: validateSsnNumber(selectedEmpNumberText)
                              ? ""
                              : "Please enter a valid 9-digit SSN",
                          }));
                        }
                      }}
                      placeholder={""}
                      style={{
                        height: 46,
                        paddingHorizontal: 12,
                      }}
                      containerStyle={{ width: width - 50 }}
                      placeholderStyle={{
                        fontFamily: Mulish400,
                        color: AppColor.textHighlighter,
                        position: "absolute",
                      }}
                      itemTextStyle={{ fontFamily: Mulish400 }}
                      selectedTextStyle={{ fontFamily: Mulish400 }}
                      renderItem={(item) => (
                        <View
                          style={{
                            paddingVertical: 10,
                            paddingHorizontal: 16,
                          }}
                        >
                          <Text
                            style={[styles.dropdownText, { marginLeft: 0 }]}
                          >
                            {`${item.label} Number`}
                          </Text>
                        </View>
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

                  <NativeTextInput
                    value={
                      selectedEmpNumberType === "ein"
                        ? formatEIN(selectedEmpNumberText)
                        : formatSSN(selectedEmpNumberText)
                    }
                    onChangeText={(txt) => {
                      if (selectedEmpNumberType === "ein") {
                        // Remove non-digits and limit to 9 characters
                        const digitsOnly = txt.replace(/\D/g, "").slice(0, 9);
                        setSelectedEmpNumberText(digitsOnly);

                        if (validateEinNumber(digitsOnly)) {
                          setErrors((prev) => ({
                            ...prev,
                            empNumber: "",
                          }));
                        }
                      } else {
                        // Remove non-digits and limit to 9 characters
                        const digitsOnly = txt.replace(/\D/g, "").slice(0, 9);
                        setSelectedEmpNumberText(digitsOnly);

                        if (validateSsnNumber(digitsOnly)) {
                          setErrors((prev) => ({
                            ...prev,
                            empNumber: "",
                          }));
                        }
                      }
                    }}
                    style={styles.input}
                    placeholder={
                      selectedEmpNumberType === "ein"
                        ? "XX-XXXXXXX"
                        : "XXX-XX-XXXX"
                    }
                    placeholderTextColor={AppColor.placeholderTextColor}
                    keyboardType="number-pad"
                    maxLength={11}
                  />
                </View>
                {!!errors.empNumber && (
                  <HelperText
                    type="error"
                    visible={!!errors.empNumber}
                    style={[styles.helper, { marginBottom: 0 }]}
                  >
                    {errors.empNumber}
                  </HelperText>
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
                  <Text style={styles.label}>Select Serving Cuisine</Text>
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
                {!!errors.cuisine && (
                  <HelperText
                    type="error"
                    visible={!!errors.cuisine}
                    style={styles.helper}
                  >
                    {errors.cuisine}
                  </HelperText>
                )}

                {selectedCuisine?.length === 0 && (
                  <Divider style={{ marginVertical: 8 }} />
                )}

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
                  <Text style={[styles.label]}>Select Serving Location</Text>
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
                {!!errors.location && (
                  <HelperText
                    type="error"
                    visible={!!errors.location}
                    style={styles.helper}
                  >
                    {errors.location}
                  </HelperText>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Continue Button */}
      <View
        style={{
          paddingBottom: insets.bottom,
          borderTopWidth: 1,
          borderColor: AppColor.border,
          backgroundColor: AppColor.white,
        }}
      >
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
    fontFamily: Mulish700,
  },

  // Step Indicator
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
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
  line: { width: "10%", height: 2, backgroundColor: AppColor.primary },

  // Content
  content: { flex: 1, backgroundColor: AppColor.white },
  section: { marginVertical: 16, paddingHorizontal: 24 },
  sectionTitle: { fontSize: 24, fontFamily: Mulish700, color: AppColor.text },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: Mulish400,
    color: AppColor.textHighlighter,
    marginTop: 4,
  },
  label: {
    fontSize: 18,
    fontFamily: Mulish400,
    color: AppColor.black,
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
    fontFamily: Mulish400,
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
    width: 80,
    height: 80,
    borderRadius: 5,
  },

  // EIN Number
  paperInputLabel: {
    fontFamily: Mulish400,
    fontSize: 15,
    color: AppColor.text,
    marginBottom: 8,
  },
  paperInput: {
    backgroundColor: AppColor.white,
  },
  paperInputText: {
    fontFamily: Mulish400,
    fontSize: 15,
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
    fontFamily: Mulish400,
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
    fontFamily: Mulish400,
  },

  // Input
  input: {
    flex: 1,
    height: 46,
    fontSize: 15,
    fontFamily: Mulish400,
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
    fontFamily: Mulish400,
  },

  // Continue Button
  continueButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginVertical: 10,
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
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.white,
  },
});
