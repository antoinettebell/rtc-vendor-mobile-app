import React, { useCallback, useEffect, useState } from "react";
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
import {
  updateFoodTruckProfile_API,
  uploadImage_API,
} from "../api/appAPI";
import MediaPickerDialog from "../components/MediaPickerDialog";
import StatusBarManager from "../components/StatusBarManager";
import { useFocusEffect } from "@react-navigation/native";
import {
  buildTaxIdentifierUpdate,
  formatEIN,
  formatSSN,
  getTaxIdentifierEditState,
} from "../helpers/profile.helper";
import {
  getEffectiveFoodVendorPlan,
  getNextFoodVendorGuidedStep,
} from "../helpers/foodVendorGuidedSetup.helper";
import { empNumberList } from "../utils/constants";
import AppImage from "../components/AppImage";
import {
  onOnBoard,
  setVendorOnboardingStep,
} from "../redux/slices/authSlice";
import {
  SOCIAL_MEDIA_PLATFORMS,
  blankSocialMedia,
  displaySocialMediaHandle,
  normalizeSocialMediaHandle,
  normalizeSocialMediaObject,
} from "../helpers/socialMedia.helper";

const SOCIAL_ICON_NAMES = {
  instagram: "instagram",
  facebook: "facebook",
  x: "x-twitter",
  threads: "threads",
  tiktok: "tiktok",
};

const dropdownData = SOCIAL_MEDIA_PLATFORMS.map((platform) => ({
  ...platform,
  value: platform.key,
  iconName: SOCIAL_ICON_NAMES[platform.key],
  txt: "",
  disable: false,
}));

const { width } = Dimensions.get("window");

const getStableItemKey = (item, prefix, index) =>
  `${prefix}-${index ?? "item"}-${item?._id || item?.id || item?.uri || item?.value || item?.label || item?.name || item?.title || "unknown"}`;

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
          <FontAwesome6
            name={selectedSocialMedia?.iconName || dropdownData[0].iconName}
            size={24}
            color={AppColor.textHighlighter}
          />
        </View>
        <Dropdown
          data={dropdownData}
          labelField="txt"
          valueField="value"
          value={selectedSocialMedia}
          onChange={(item) => {
            setSelectedSocialMedia(item);
            setSocialMediaLink("");
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
              key={getStableItemKey(item, "media-option")}
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
              <FontAwesome6
                name={item.iconName}
                size={24}
                color={AppColor.textHighlighter}
              />
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
        onChangeText={setSocialMediaLink}
        style={styles.input}
        placeholder={`${selectedSocialMedia?.label || "Social media"} handle`}
        placeholderTextColor={AppColor.placeholderTextColor}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={(selectedSocialMedia?.maxLength || 75) + 1}
      />
    </View>
  );
};

const AuthFoodTruckProfileScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { selectedCuisine, selectedLocations } = useSelector(
    (state) => state.foodTruckProfileReducer
  );
  const { user, selectedPlan } = useSelector((state) => state.userReducer);
  const isOnboardingFlow = route?.params?.onboardingFlow === true;

  const { checkAndRequestPermission: photosPermissionStatus } = usePermission(
    permission.photos
  );
  const { checkAndRequestPermission: cameraPermissionStatus } = usePermission(
    permission.camera
  );

  useEffect(() => {
    const foodTruck = user?.foodTruck;
    if (!foodTruck) return;

    if (!selectedLogo && foodTruck.logo) {
      setSelectedLogo({ uri: foodTruck.logo, old: true });
    }

    if (!selectedPhotos.length && foodTruck.photos?.length) {
      setSelectedPhotos(
        foodTruck.photos.map((photo) => ({ uri: photo, old: true }))
      );
    }

    const normalized = normalizeSocialMediaObject(foodTruck.socialMedia || {});
    const planLimit = selectedPlan?.slug === "SUB_ELITE"
      ? 4
      : selectedPlan?.slug === "SUB_PLATINUM"
        ? 2
        : 1;
    const entries = SOCIAL_MEDIA_PLATFORMS
      .filter(({ key }) => normalized[key])
      .slice(0, planLimit);
    const setters = [
      [setSelectedType1, setMediaLink1],
      [setSelectedType2, setMediaLink2],
      [setSelectedType3, setMediaLink3],
      [setSelectedType4, setMediaLink4],
    ];
    setters.forEach(([setType, setLink], index) => {
      const entry = entries[index];
      const platform = dropdownData.find((item) => item.value === entry?.key) || dropdownData[0];
      setType(platform);
      setLink(entry ? displaySocialMediaHandle(normalized[entry.key], entry.key) : "");
    });
  }, [user?.foodTruck?._id, selectedPlan?.slug]);

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
  const [selectedType3, setSelectedType3] = useState(dropdownData[0]);
  const [selectedType4, setSelectedType4] = useState(dropdownData[0]);
  const [mediaLink1, setMediaLink1] = useState("");
  const [mediaLink2, setMediaLink2] = useState("");
  const [mediaLink3, setMediaLink3] = useState("");
  const [mediaLink4, setMediaLink4] = useState("");
  const [errors, setErrors] = useState({
    logo: "",
    photos: "",
    empNumber: "",
    cuisine: "",
    location: "",
    socialMedia: "",
  });

  const savedTaxIdentifier = getTaxIdentifierEditState(user?.foodTruck);
  const hasValidSavedTaxIdentifier = Boolean(savedTaxIdentifier.maskedValue)
    || String(savedTaxIdentifier.inputValue || "").replace(/\D/g, "").length === 9;
  const hasUsableSavedTaxIdentifier = hasValidSavedTaxIdentifier
    && selectedEmpNumberType === savedTaxIdentifier.originalType
    && !selectedEmpNumberText;

  useEffect(() => {
    if (!selectedEmpNumberText && savedTaxIdentifier.hasExisting) {
      setSelectedEmpNumberType(savedTaxIdentifier.type);
    }
  }, [
    savedTaxIdentifier.hasExisting,
    savedTaxIdentifier.type,
    selectedEmpNumberText,
  ]);

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
      if (Platform.OS === "ios") {
        const photosStatus = await photosPermissionStatus();
        if (
          photosStatus !== RESULTS.GRANTED &&
          photosStatus !== RESULTS.LIMITED
        )
          return;
      }

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
    const socialMedia = blankSocialMedia();
    const slots = [
      [selectedType1, mediaLink1],
      ...(!isBasicPlan ? [[selectedType2, mediaLink2]] : []),
      ...(isElitePlan ? [[selectedType3, mediaLink3], [selectedType4, mediaLink4]] : []),
    ];
    for (const [platform, value] of slots) {
      const handle = normalizeSocialMediaHandle(value, platform.value);
      if (!handle) continue;
      if (socialMedia[platform.value]) {
        throw new Error(`Choose ${platform.label} only once.`);
      }
      socialMedia[platform.value] = handle;
    }
    return socialMedia;
  };

  const saveFoodTruckProfile = async ({ exitAfterSave = false } = {}) => {
    // Validate all required fields
    let normalizedSocialMedia = null;
    let socialMediaError = "";
    try {
      normalizedSocialMedia = createSocialMediaPayload();
    } catch (error) {
      socialMediaError = error.message;
    }
    const newErrors = {
      logo: selectedLogo ? "" : "Logo is required",
      photos: selectedPhotos.length > 0 ? "" : "At least one image is required",
      empNumber:
        selectedEmpNumberText?.length > 0
          ? selectedEmpNumberType === "ein"
            ? validateEinNumber(selectedEmpNumberText)
              ? ""
              : "Please enter a valid 9-digit EIN"
            : validateSsnNumber(selectedEmpNumberText)
              ? ""
              : "Please enter a valid 9-digit SSN"
          : isOnboardingFlow && !hasUsableSavedTaxIdentifier
            ? "A valid 9-digit EIN or SSN is required"
            : "",
      cuisine:
        selectedCuisine.length > 0 ? "" : "At least one Cuisine is required",
      location:
        selectedLocations.length > 0 ? "" : "At least one Location is required",
      socialMedia: socialMediaError,
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
      if (selectedLogo && selectedLogo.old === undefined) {
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
      } else if (selectedLogo && selectedLogo.old) {
        logoResult = {
          ...selectedLogo,
          serverResponse: selectedLogo.uri,
        };
      }

      // upload selected photos
      const imageResult = [];
      for (const image of selectedPhotos) {
        console.log("image => ", image);
        if (image.old) {
          imageResult.push({
            ...image,
            serverResponse: image.uri,
          });
          continue;
        }
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
        socialMedia: normalizedSocialMedia,
        infoType: infoType === "Food Truck" ? "truck" : "caterer",
        planId: selectedPlan?._id,
        locations: selectedLocations?.length ? selectedLocations : [],
      };

      payload = {
        ...payload,
        ...buildTaxIdentifierUpdate({
          type: selectedEmpNumberType,
          inputValue: selectedEmpNumberText,
        }),
      };

      if (logoResult) {
        payload.logo = logoResult.serverResponse;
      }

      if (imageResult?.length > 0) {
        const tempURL = imageResult.map((item) => item.serverResponse);
        payload.photos = tempURL;
      }

      const tempIDs = (selectedCuisine || []).map((item) => item._id);
      payload.cuisine = tempIDs;

      payload.addOns = route?.params?.addOns?.length
        ? route?.params?.addOns
        : [];

      console.log("payload ===> ", payload);
      console.log("foodTruckId ===> ", user?.foodTruck?._id);

      const response = await updateFoodTruckProfile_API({
        payload,
        foodTruckId: user?.foodTruck?._id,
      });
      if (response?.success && response?.data) {
        const updatedFoodTruck = response.data.foodtruck;
        console.log("response => ", response);
        dispatch(setSelectedLocations(updatedFoodTruck.locations));
        console.log("USER => ", {
          ...user,
          foodTruck: updatedFoodTruck,
        });
        dispatch(setUser({ ...user, foodTruck: updatedFoodTruck }));
        if (exitAfterSave) {
          if (isOnboardingFlow) {
            dispatch(setVendorOnboardingStep("PROFILE"));
            dispatch(onOnBoard(false));
          } else {
            navigation.reset({
              index: 0,
              routes: [{ name: "homeScreen" }],
            });
          }
        } else if (isOnboardingFlow) {
          const nextStep = getNextFoodVendorGuidedStep(
            getEffectiveFoodVendorPlan({ user: { ...user, foodTruck: updatedFoodTruck }, selectedPlan }),
            "PROFILE",
            { includeTapToPay: Platform.OS === "ios" },
          ) || "PAYMENT";
          dispatch(setVendorOnboardingStep(nextStep));
          navigation.reset({
            index: 0,
            routes: [
              {
                name: nextStep === "COMPLIANCE"
                  ? "vendorComplianceScreen"
                  : "authFoodTruckBankDetailScreen",
                params: { onboardingFlow: true },
              },
            ],
          });
        } else {
          navigation.navigate("authSetBusinessHrsScreen");
          // navigation.navigate("authAvailabilityScreen");
        }
      }
    } catch (error) {
      console.error("error => ", error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueBtnPress = () => saveFoodTruckProfile();

  const handleSaveExitPress = () =>
    saveFoodTruckProfile({ exitAfterSave: true });

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
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ width: 48 }} />
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
              {/* <View style={styles.line} />
              <View style={styles.stepSubContainer}>
                <View style={styles.emptyCircle} />
              </View> */}
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
                      keyExtractor={(item, index) =>
                        getStableItemKey(item, "photo", index)
                      }
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
                          key={getStableItemKey(item, "emp-number-option")}
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
                      const digitsOnly = txt.replace(/\D/g, "").slice(0, 9);
                      setSelectedEmpNumberText(digitsOnly);

                      if (digitsOnly.length === 0) {
                        setErrors((prev) => ({
                          ...prev,
                          empNumber: "",
                        }));
                      } else if (selectedEmpNumberType === "ein") {
                        if (validateEinNumber(digitsOnly)) {
                          setErrors((prev) => ({
                            ...prev,
                            empNumber: "",
                          }));
                        }
                      } else {
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
                <View style={styles.infoHeadingRow}>
                  <Text style={styles.sectionSubtitle}>Social Media Handles</Text>
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={AppColor.textHighlighter}
                  />
                </View>
                <Text style={styles.socialMediaHelpText}>
                  Enter handles only. These may be used to tag your social account in customized marketing ads featuring your business.
                </Text>

                {/* media link 1 */}
                <MediaLinksComponent
                  // dropdownData={
                  //   isElitePlan
                  //     ? dropdownData
                  //     : dropdownData.map((item) =>
                  //         item.type === "web"
                  //           ? { ...item, disable: true }
                  //           : item
                  //       )
                  // }
                  dropdownData={dropdownData}
                  selectedSocialMedia={selectedType1}
                  setSelectedSocialMedia={setSelectedType1}
                  socialMediaLink={mediaLink1}
                  setSocialMediaLink={setMediaLink1}
                />

                {/* media link 2 */}
                {!isBasicPlan ? (
                  <MediaLinksComponent
                    // dropdownData={
                    //   isElitePlan
                    //     ? dropdownData
                    //     : dropdownData.map((item) =>
                    //         item.type === "web"
                    //           ? { ...item, disable: true }
                    //           : item
                    //       )
                    // }
                    dropdownData={dropdownData}
                    selectedSocialMedia={selectedType2}
                    setSelectedSocialMedia={setSelectedType2}
                    socialMediaLink={mediaLink2}
                    setSocialMediaLink={setMediaLink2}
                  />
                ) : null}

                {/* media link 3 */}
                {isElitePlan ? (
                  <MediaLinksComponent
                    // dropdownData={
                    //   isElitePlan
                    //     ? dropdownData
                    //     : dropdownData.map((item) =>
                    //         item.type === "social"
                    //           ? { ...item, disable: true }
                    //           : item
                    //       )
                    // }
                    dropdownData={dropdownData}
                    selectedSocialMedia={selectedType3}
                    setSelectedSocialMedia={setSelectedType3}
                    socialMediaLink={mediaLink3}
                    setSocialMediaLink={setMediaLink3}
                  />
                ) : null}
                {/* media link 4 */}
                {isElitePlan ? (
                  <MediaLinksComponent
                    // dropdownData={
                    //   isElitePlan
                    //     ? dropdownData
                    //     : dropdownData.map((item) =>
                    //         item.type === "social"
                    //           ? { ...item, disable: true }
                    //           : item
                    //       )
                    // }
                    dropdownData={dropdownData}
                    selectedSocialMedia={selectedType4}
                    setSelectedSocialMedia={setSelectedType4}
                    socialMediaLink={mediaLink4}
                    setSocialMediaLink={setMediaLink4}
                  />
                ) : null}
                {!!errors.socialMedia && (
                  <HelperText type="error" visible style={styles.helper}>
                    {errors.socialMedia}
                  </HelperText>
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
                  <Text style={styles.label}>Select Serving Cuisine</Text>
                  <FontAwesome6
                    name="angle-right"
                    color={AppColor.black}
                    size={18}
                  />
                </TouchableOpacity>
                {selectedCuisine?.map((item, index) => (
                  <View
                    key={getStableItemKey(item, "cuisine", index)}
                    style={styles.dropdown}
                  >
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
                  <Text style={[styles.label]} numberOfLines={1}>
                    Select Primary Serving Location
                  </Text>
                  <FontAwesome6
                    name="angle-right"
                    color={AppColor.black}
                    size={18}
                  />
                </TouchableOpacity>
                {selectedLocations?.map((item, index) => (
                  <View
                    key={getStableItemKey(item, "location", index)}
                    style={styles.dropdown}
                  >
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
          paddingTop: 12,
          borderTopWidth: 1,
          borderColor: AppColor.border,
          backgroundColor: AppColor.white,
        }}
      >
        <TouchableOpacity
          onPress={handleSaveExitPress}
          activeOpacity={0.7}
          style={styles.saveExitButton}
          disabled={loading}
        >
          <Text style={styles.saveExitButtonText}>Save & Exit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleContinueBtnPress}
          activeOpacity={0.7}
          style={styles.continueButton}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={AppColor.white} />
          ) : (
            <Text style={styles.continueButtonText}>
              {isOnboardingFlow ? "Next: Payment Details" : "Continue"}
            </Text>
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
    backgroundColor: AppColor.header,
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
  infoHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  socialMediaHelpText: {
    fontSize: 13,
    fontFamily: Mulish400,
    color: AppColor.textHighlighter,
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
  saveExitButton: {
    height: 48,
    borderColor: AppColor.primary,
    borderRadius: 5,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.white,
    marginHorizontal: 24,
  },
  saveExitButtonText: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.primary,
  },
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
