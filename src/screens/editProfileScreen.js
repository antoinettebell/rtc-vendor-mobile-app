import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput as NativeTextInput,
  ActivityIndicator as NativeIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  HelperText,
  IconButton,
  TextInput,
} from "react-native-paper";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import AntDesign from "react-native-vector-icons/AntDesign";
import { useDispatch, useSelector } from "react-redux";
import ImagePicker from "react-native-image-crop-picker";
import { RESULTS } from "react-native-permissions";
import FastImage from "@d11/react-native-fast-image";
import usePermission from "../hooks/usePermission";
import { permission } from "../helpers/permission.helper";
import StatusBarManager from "../components/StatusBarManager";
import MediaPickerDialog from "../components/MediaPickerDialog";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import { CountryPicker } from "react-native-country-codes-picker";
import {
  emailRegex,
  empNumberList,
  nameRegex,
  truckNameRegex,
} from "../utils/constants";
import {
  getUserDetail_API,
  updateFoodTruckProfile_API,
  updateUserDetail_API,
  uploadImage_API,
} from "../api/appAPI";
import { setUser, updateFoodTruck } from "../redux/slices/userSlice";
import { Dropdown } from "react-native-element-dropdown";
import { formatEIN, formatSSN } from "../helpers/profile.helper";
import AppImage from "../components/AppImage";
import { addOrUpdateUser } from "../redux/slices/userInfoSlice";
import { showSnackbar } from "../redux/slices/snackbarSlice";

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
      } else {
        // If text doesn't have any protocol, prepend https://
        setSocialMediaLink("https://" + txt);
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
          containerStyle={{ width: width - 34 }}
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
        style={styles.inputForMedia}
        placeholder={getPlaceholder()}
        placeholderTextColor={AppColor.placeholderTextColor}
        autoCapitalize="none"
        onKeyPress={({ nativeEvent }) => {
          // Prevent deleting or modifying the https:// prefix for website type
          if (
            selectedSocialMedia?.type === "web" &&
            (socialMediaLink === "https://" || socialMediaLink.length <= 8) &&
            nativeEvent.key === "Backspace"
          ) {
            // Prevent default behavior - don't allow deleting the https:// prefix
            return;
          }
        }}
      />
    </View>
  );
};

const EditProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

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

  const [infoType, setInfoType] = useState("Food Truck");
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [selectedMediaType, setSelectedMediaType] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [foodTruckName, setFoodTruckName] = useState("");
  const [selectedEmpNumberType, setSelectedEmpNumberType] = useState("ein");
  const [selectedEmpNumberText, setSelectedEmpNumberText] = useState("");
  const [email, setEmail] = useState("");
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [countryCode, setCountryCode] = useState("+1");
  const [mobileNumber, setMobileNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [getDataLoading, setGetDataLoading] = useState(false);
  const [selectedType1, setSelectedType1] = useState(dropdownData[0]);
  const [selectedType2, setSelectedType2] = useState(dropdownData[0]);
  const [selectedType3, setSelectedType3] = useState(dropdownData[0]);
  const [selectedType4, setSelectedType4] = useState(dropdownData[0]);
  const [mediaLink1, setMediaLink1] = useState("");
  const [mediaLink2, setMediaLink2] = useState("");
  const [mediaLink3, setMediaLink3] = useState("");
  const [mediaLink4, setMediaLink4] = useState("");

  const [errors, setErrors] = useState({
    firstName: "",
    foodTruckName: "",
    mobileNumber: "",
    empNumber: "",
    einNumber: "",
    snnNumber: "",
    email: "",
    logo: "",
    photos: "",
  });

  const validateFirstName = (value) => {
    if (!value.trim()) return "First Name is required";
    if (!nameRegex.test(value)) return "Enter a valid first name";
    return "";
  };

  const validateLastName = (value) => {
    if (!value.trim()) return "Last Name is required";
    if (!nameRegex.test(value)) return "Enter a valid last name";
    return "";
  };

  const validateFoodTruckName = (value) => {
    if (!value.trim()) return "Food truck name is required";
    if (!truckNameRegex.test(value)) return "Enter a valid food truck name";
    return "";
  };

  const validateMobileNumber = (value) => {
    if (!value.trim()) return "Mobile number is required";
    if (value?.length < 10) return "Enter a valid 10-digit number";
    return "";
  };

  const validateEinNumber = (text) => {
    const digitsOnly = text.replace(/\D/g, "");
    return digitsOnly.length === 9 ? "" : "Please enter a valid 9-digit EIN";
  };

  const validateSsnNumber = (text) => {
    const digitsOnly = text.replace(/\D/g, "");
    return digitsOnly.length === 9 ? "" : "Please enter a valid 9-digit SSN";
  };

  const onPressUploadLogo = () => {
    setSelectedMediaType("logo");
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

  const onPressUploadPhotos = () => {
    setSelectedMediaType("photos");
    setModalVisible(true);
  };

  const onPhotosRemovePress = (index) => {
    const tempPhotos = selectedPhotos.filter((_, i) => i !== index);
    setSelectedPhotos(tempPhotos);
  };

  const processSocialMediaResponse = (response, plan) => {
    if (!plan) return;
    console.log("response => ", response);
    console.log("plan => ", plan);

    response.forEach((item, index) => {
      const mediaType = item.mediaType.toLowerCase();
      const url = item.mediaUrl;
      const dropdownItem =
        dropdownData.find((d) => d.value === mediaType) ||
        (mediaType === "web" ? dropdownData[3] : dropdownData[0]);

      if (index === 0) {
        setSelectedType1(dropdownItem);
        setMediaLink1(url);
      } else if (index === 1 && (plan === "platinum" || plan === "elite")) {
        setSelectedType2(dropdownItem);
        setMediaLink2(url);
      } else if (index === 2 && plan === "elite") {
        setSelectedType3(dropdownItem);
        setMediaLink3(url);
      } else if (index === 3 && plan === "elite") {
        setSelectedType4(dropdownItem);
        setMediaLink4(url);
      }
    });
  };

  const updateStateOnDataFetch = (USER_DATA, FOOD_TRUCK_DATA) => {
    // manage logo
    setSelectedLogo(
      FOOD_TRUCK_DATA?.logo ? { uri: FOOD_TRUCK_DATA.logo, old: true } : null
    );

    // manage photos
    const TEMP_PHOTOS = [];
    FOOD_TRUCK_DATA?.photos?.map((item) =>
      TEMP_PHOTOS.push({ uri: item, old: true })
    );
    setSelectedPhotos(TEMP_PHOTOS);

    // manage info type
    setInfoType(
      FOOD_TRUCK_DATA?.infoType === "caterer" ? "Food Caterer" : "Food Truck"
    );

    // manage user f-name
    setFirstName(USER_DATA?.firstName ? USER_DATA.firstName : "");

    // manage user l-name
    setLastName(USER_DATA?.lastName ? USER_DATA.lastName : "");

    // manage food truck name
    setFoodTruckName(FOOD_TRUCK_DATA?.name ? FOOD_TRUCK_DATA.name : "");

    // manage emp number
    setSelectedEmpNumberText(
      FOOD_TRUCK_DATA?.ein
        ? FOOD_TRUCK_DATA.ein
        : FOOD_TRUCK_DATA?.ssn
          ? FOOD_TRUCK_DATA.ssn
          : ""
    );
    setSelectedEmpNumberType(
      FOOD_TRUCK_DATA?.ein ? "ein" : FOOD_TRUCK_DATA?.ssn ? "ssn" : "ein"
    );

    // manage social media links
    processSocialMediaResponse(
      FOOD_TRUCK_DATA?.socialMedia || [],
      isElitePlan
        ? "elite"
        : isPlatinumPlan
          ? "platinum"
          : isBasicPlan
            ? "basic"
            : null
    );

    // manage country code
    setCountryCode(USER_DATA?.countryCode ? USER_DATA.countryCode : "+1");

    // manage mobile number
    setMobileNumber(USER_DATA?.mobileNumber ? USER_DATA.mobileNumber : "");

    // manage email address
    setEmail(USER_DATA?.email ? USER_DATA.email : "");
  };

  const getUserDetailFromAPI = async () => {
    setGetDataLoading(true);
    try {
      const user_id = user._id;
      const response = await getUserDetail_API(user_id);
      if (response?.success && response.data) {
        const USER_DATA = response.data.user;
        const FOOD_TRUCK_DATA = response.data.user.foodTruck;

        dispatch(setUser(USER_DATA));
        updateStateOnDataFetch(USER_DATA, FOOD_TRUCK_DATA); // update local states
      }
    } catch (error) {
      console.log("error => ", error);
    } finally {
      setGetDataLoading(false);
    }
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

    if (mediaLink3 && isElitePlan) {
      const formattedUrl = formatWebsiteUrl(mediaLink3, selectedType3.value);
      if (formattedUrl) {
        socialMedia.push({
          mediaType: convertMediaType(selectedType3.value),
          mediaUrl: formattedUrl,
        });
      }
    }

    if (mediaLink4 && isElitePlan) {
      const formattedUrl = formatWebsiteUrl(mediaLink4, selectedType4.value);
      if (formattedUrl) {
        socialMedia.push({
          mediaType: convertMediaType(selectedType4.value),
          mediaUrl: formattedUrl,
        });
      }
    }

    return { socialMedia };
  };

  const handleUpdatePress = async () => {
    // Validate all fields
    const fnameError = validateFirstName(firstName);
    const lnameError = validateLastName(lastName);
    const foodTruckNameError = validateFoodTruckName(foodTruckName);
    const mobileNumberError = validateMobileNumber(mobileNumber);
    const empNumberError =
      selectedEmpNumberText?.length > 0
        ? selectedEmpNumberType === "ein"
          ? validateEinNumber(selectedEmpNumberText)
          : validateSsnNumber(selectedEmpNumberText)
        : "";

    // Additional validations
    let logoError = "";
    let photosError = "";
    let emailError = "";

    if (!selectedLogo?.uri) {
      logoError = "Logo is required";
    }

    if (selectedPhotos?.length === 0) {
      photosError = "At least one photo is required";
    }

    if (!email.trim()) {
      emailError = "Email is required";
    } else if (!emailRegex.test(email)) {
      emailError = "Enter a valid email address";
    }

    // Update errors state
    setErrors({
      firstName: fnameError,
      lastName: lnameError,
      foodTruckName: foodTruckNameError,
      mobileNumber: mobileNumberError,
      empNumber: empNumberError,
      email: emailError,
      logo: logoError,
      photos: photosError,
    });

    // Check if there are any errors
    const hasErrors =
      fnameError ||
      lnameError ||
      foodTruckNameError ||
      mobileNumberError ||
      empNumberError ||
      emailError ||
      logoError ||
      photosError;

    if (hasErrors) {
      return; // Don't proceed if there are errors
    }

    // user api: user-name fname, mobile number, countrycode
    // foodtruck api: name, logo, photos, socialmedia links

    setLoading(true);
    try {
      // User detail update
      const user_id = user?._id;
      const userPayload = {
        firstName: firstName,
        lastName: lastName,
        countryCode: countryCode,
        mobileNumber: mobileNumber,
      };
      const userResponse = await updateUserDetail_API({
        payload: userPayload,
        user_id,
      });
      if (userResponse.success && userResponse.data) {
        console.log("userResponse => ", userResponse.data);
        dispatch(setUser(userResponse.data.user));
      }

      // Foodtruck detail payload
      const foodTruckId = user?.foodTruck?._id;
      let foodTruckPayload = {
        name: foodTruckName,
        infoType: infoType === "Food Truck" ? "truck" : "caterer",
        socialMedia: createSocialMediaPayload().socialMedia,
      };
      if (selectedEmpNumberText?.length > 0) {
        if (selectedEmpNumberType === "ein") {
          foodTruckPayload.ein = selectedEmpNumberText;
          foodTruckPayload.ssn = null;
        } else {
          foodTruckPayload.ein = null;
          foodTruckPayload.ssn = selectedEmpNumberText;
        }
      } else {
        foodTruckPayload.ein = null;
        foodTruckPayload.ssn = null;
      }
      //   manage logo image upload
      if (selectedLogo && selectedLogo.old === undefined) {
        // for new file
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
            foodTruckPayload.logo = response.data.file;
        } catch (error) {
          console.log("logo upload error => ", error);
        }
      } else if (selectedLogo && selectedLogo.old) {
        // for existing file
        foodTruckPayload.logo = selectedLogo.uri;
      }

      //   manage photos image upload
      const imageResult = [];
      for (const image of selectedPhotos) {
        console.log("image of selectedPhotos => ", image);
        if (image.old === undefined) {
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
              imageResult.push(response.data.file);
          } catch (error) {
            console.log("photo upload error => ", error);
          }
        } else if (image.old) {
          imageResult.push(image.uri);
        }
      }
      foodTruckPayload.photos = imageResult;

      // Foodtruck detail update
      const foodTruckResponse = await updateFoodTruckProfile_API({
        payload: foodTruckPayload,
        foodTruckId,
      });
      if (foodTruckResponse.success && foodTruckResponse.data) {
        console.log("foodTruckResponse => ", foodTruckResponse.data);
        dispatch(updateFoodTruck(foodTruckResponse.data.foodtruck));
        dispatch(
          addOrUpdateUser({
            emailid: user.email,
            userData: {
              emailid: user.email,
              username: foodTruckResponse?.data?.foodtruck?.name || "",
              imageUrl: foodTruckResponse?.data?.foodtruck.logo || null,
            },
          })
        );
      }

      dispatch(
        showSnackbar({
          visible: true,
          message: "Profile Updated!",
          type: "success",
        })
      );

      navigation.goBack();
    } catch (error) {
      console.log("error => ", error);
      dispatch(
        showSnackbar({
          visible: true,
          message: error.message,
          type: "error",
        })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUserDetailFromAPI();
  }, []);

  return (
    <View style={[styles.container]}>
      <StatusBarManager />

      {/* Header Container */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: insets.top,
          borderBottomWidth: 1,
          borderBottomColor: AppColor.border,
          backgroundColor: AppColor.white,
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
          {"Edit Profile"}
        </Text>
        <View style={{ width: "20%" }} />
      </View>

      {/* Scrolling Container */}
      {getDataLoading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingBottom: 0,
          }}
        >
          <NativeIndicator size="large" color={AppColor.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          enabled={Platform.OS === "ios"}
          behavior="padding"
          style={{
            flex: 1,
            paddingBottom: insets.bottom,
          }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingTop: 20,
            }}
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={{
                paddingTop: 16,
                backgroundColor: AppColor.white,
              }}
            >
              {/* Logo Upload */}
              <View style={[styles.section, { marginTop: 10 }]}>
                <Text style={styles.label}>{"Change Logo"}</Text>
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
                  <Text style={[styles.label, { marginBottom: 0 }]}>
                    Change Food Truck Photos
                  </Text>
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
                    style={[
                      styles.photoUploadContainer,
                      {
                        borderColor: !!errors.photos
                          ? AppColor.red
                          : AppColor.gray,
                      },
                    ]}
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

              {/* F-Name Text Input */}
              <View style={[styles.section, { marginBottom: 0 }]}>
                <Text style={styles.inputLabel}>{"Your First Name *"}</Text>
                <TextInput
                  dense
                  value={firstName}
                  onChangeText={(text) => {
                    setFirstName(text);
                    if (!validateFirstName(text)) {
                      setErrors((prev) => ({
                        ...prev,
                        firstName: "",
                      }));
                    }
                  }}
                  style={styles.input}
                  contentStyle={styles.inputText}
                  placeholder="Enter Your First Name"
                  placeholderTextColor={AppColor.placeholderTextColor}
                  mode="outlined"
                  error={!!errors.firstName}
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                  autoCapitalize="sentences"
                  theme={{ colors: { onSurfaceVariant: "#777" } }}
                />
                {!!errors.firstName && (
                  <HelperText
                    type="error"
                    visible={!!errors.firstName}
                    style={styles.helper}
                  >
                    {errors.firstName}
                  </HelperText>
                )}
              </View>

              {/* L-Name Text Input */}
              <View style={[styles.section, { marginBottom: 0 }]}>
                <Text style={styles.inputLabel}>{"Your Last Name *"}</Text>
                <TextInput
                  dense
                  value={lastName}
                  onChangeText={(text) => {
                    setLastName(text);
                    if (!validateLastName(text)) {
                      setErrors((prev) => ({
                        ...prev,
                        lastName: "",
                      }));
                    }
                  }}
                  style={styles.input}
                  contentStyle={styles.inputText}
                  placeholder="Enter Your Last Name"
                  placeholderTextColor={AppColor.placeholderTextColor}
                  mode="outlined"
                  error={!!errors.lastName}
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                  autoCapitalize="sentences"
                  theme={{ colors: { onSurfaceVariant: "#777" } }}
                />
                {!!errors.lastName && (
                  <HelperText
                    type="error"
                    visible={!!errors.lastName}
                    style={styles.helper}
                  >
                    {errors.lastName}
                  </HelperText>
                )}
              </View>

              {/* Food Truck Name Text Input */}
              <View style={[styles.section, { marginBottom: 0 }]}>
                <Text style={styles.inputLabel}>{"Food Truck Name *"}</Text>
                <TextInput
                  dense
                  value={foodTruckName}
                  onChangeText={(text) => {
                    setFoodTruckName(text);
                    if (validateFoodTruckName(text)) {
                      setErrors((prev) => ({
                        ...prev,
                        foodTruckName: "",
                      }));
                    }
                  }}
                  style={styles.input}
                  contentStyle={styles.inputText}
                  placeholder="Enter Food Truck Name"
                  placeholderTextColor={AppColor.placeholderTextColor}
                  mode="outlined"
                  error={!!errors.foodTruckName}
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                  autoCapitalize="sentences"
                  theme={{ colors: { onSurfaceVariant: "#777" } }}
                />
                {!!errors.foodTruckName && (
                  <HelperText
                    type="error"
                    visible={!!errors.foodTruckName}
                    style={styles.helper}
                  >
                    {errors.foodTruckName}
                  </HelperText>
                )}
              </View>

              {/* EIN/SSN Number */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>{"EIN/SSN Number"}</Text>
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
                            empNumber: validateEinNumber(selectedEmpNumberText),
                          }));
                        } else {
                          setErrors((prev) => ({
                            ...prev,
                            empNumber: validateSsnNumber(selectedEmpNumberText),
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
                      // Remove non-digits and limit to 9 characters
                      const digitsOnly = txt.replace(/\D/g, "").slice(0, 9);
                      setSelectedEmpNumberText(digitsOnly);

                      if (digitsOnly.length === 0 || digitsOnly.length === 9) {
                        setErrors((prev) => ({
                          ...prev,
                          empNumber: "",
                        }));
                      }
                    }}
                    style={styles.inputForMedia}
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
                  // dropdownData={
                  //   isElitePlan
                  //     ? dropdownData
                  //     : dropdownData.map((item) =>
                  //         item.type === "web" ? { ...item, disable: true } : item
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
              </View>

              {/* Mobile Number Input */}
              <View style={[styles.section, { marginBottom: 0 }]}>
                <Text style={styles.inputLabel}>{"Enter mobile no. *"}</Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setCountryPickerVisible(true)}
                    style={styles.countryPickerButton}
                  >
                    <Text style={styles.countryCodeText}>{countryCode}</Text>
                    <AntDesign
                      name="caretdown"
                      color={AppColor.textHighlighter}
                      size={14}
                    />
                  </TouchableOpacity>

                  <TextInput
                    dense
                    value={mobileNumber}
                    onChangeText={(text) => {
                      setMobileNumber(text);
                      if (!validateMobileNumber(text)) {
                        setErrors((prev) => ({
                          ...prev,
                          mobileNumber: "",
                        }));
                      }
                    }}
                    style={[styles.input, { flex: 1 }]}
                    contentStyle={styles.inputText}
                    placeholder="Enter Mobile No."
                    placeholderTextColor={AppColor.placeholderTextColor}
                    mode="outlined"
                    error={!!errors.mobileNumber}
                    maxLength={10}
                    outlineColor={AppColor.border}
                    activeOutlineColor={AppColor.primary}
                    outlineStyle={{ borderRadius: 8 }}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    theme={{ colors: { onSurfaceVariant: "#777" } }}
                  />
                </View>
                {!!errors.mobileNumber && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View style={{ width: "25%" }} />
                    <HelperText
                      type="error"
                      visible={!!errors.mobileNumber}
                      style={styles.helper}
                    >
                      {errors.mobileNumber}
                    </HelperText>
                  </View>
                )}
              </View>

              {/* Email id Input */}
              <View style={[styles.section, { marginBottom: 20 }]}>
                <Text style={styles.inputLabel}>{"Email ID"}</Text>
                <TextInput
                  dense
                  value={email}
                  editable={false}
                  style={styles.input}
                  contentStyle={styles.inputText}
                  placeholder="Email ID"
                  placeholderTextColor={AppColor.placeholderTextColor}
                  mode="outlined"
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                  autoCapitalize="none"
                  theme={{ colors: { onSurfaceVariant: "#777" } }}
                />
              </View>

              {/* Update Button */}
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingTop: 20,
                  paddingBottom: 16 + insets.bottom,
                  backgroundColor: "#F9FAFB",
                }}
              >
                <TouchableOpacity
                  onPress={handleUpdatePress}
                  activeOpacity={0.7}
                  disabled={loading}
                  style={styles.updateButton}
                >
                  {loading ? (
                    <ActivityIndicator color={AppColor.white} />
                  ) : (
                    <Text style={styles.buttonLabel}>{"Update"}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Media Picker Modal */}
      <MediaPickerDialog
        isVisible={modalVisible}
        onCameraPress={() => handleCameraPress(selectedMediaType)}
        onGalleryPress={() => handleGalleryPress(selectedMediaType)}
        onClosePress={onMediaModalClose}
      />

      {/* Country picker modal */}
      <CountryPicker
        show={countryPickerVisible}
        style={{
          modal: { height: "70%" },
          backdrop: { backgroundColor: "rgba(0,0,0,0.1)" },
          line: {},
          itemsList: {},
          textInput: {},
          countryButtonStyles: { paddingVertical: 0 },
          searchMessageText: {},
          countryMessageContainer: {},
          flag: {},
          dialCode: {},
          countryName: {},
        }}
        pickerButtonOnPress={(item) => {
          setCountryCode(item.dial_code);
          setCountryPickerVisible(false);
        }}
        onBackdropPress={() => setCountryPickerVisible(false)}
      />
    </View>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },

  //   Logo, Photos
  label: {
    fontSize: 15,
    fontFamily: Mulish400,
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

  //   Radio Buttons
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

  //   Textinputs
  inputLabel: {
    fontFamily: Mulish400,
    fontSize: 15,
    color: AppColor.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: AppColor.white,
  },
  inputText: {
    fontFamily: Mulish400,
    fontSize: 15,
  },
  inputTextWithLine: {
    fontFamily: Mulish400,
    fontSize: 15,
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: AppColor.border,
  },
  helper: {
    marginBottom: 0,
    paddingLeft: 0,
    paddingTop: 0,
    fontFamily: Mulish400,
  },

  //   country code input
  countryPickerButton: {
    height: "100%",
    width: "25%",
    backgroundColor: AppColor.white,
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    gap: 5,
  },
  countryCodeText: {
    color: AppColor.text,
    fontSize: 15,
    fontFamily: Mulish400,
  },

  //   Update btn
  updateButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
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
  buttonLabel: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.white,
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
  inputForMedia: {
    flex: 1,
    height: 46,
    fontSize: 15,
    fontFamily: Mulish400,
    backgroundColor: AppColor.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
