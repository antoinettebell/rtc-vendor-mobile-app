import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import {
  ActivityIndicator,
  Divider,
  HelperText,
  IconButton,
  TextInput,
} from "react-native-paper";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import AntDesign from "react-native-vector-icons/AntDesign";
import Ionicons from "react-native-vector-icons/Ionicons";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import MediaPickerDialog from "../components/MediaPickerDialog";
import ImagePicker from "react-native-image-crop-picker";
import FastImage from "@d11/react-native-fast-image";
import usePermission from "../hooks/usePermission";
import { permission } from "../helpers/permission.helper";
import { RESULTS } from "react-native-permissions";
import { MultiSelect } from "react-native-element-dropdown";
import {
  addFooditem_API,
  getDietList_API,
  uploadImage_API,
} from "../api/appAPI";
import { showSnackbar } from "../redux/slices/snackbarSlice";
import {
  setSelectedFoodCategory,
  setSelectedFoodItems,
} from "../redux/slices/foodTruckProfileSlice";

const validateItemName = (value) => {
  if (!value.trim()) {
    return "Dish/Item name is required";
  }
  return "";
};

const validateItemDescription = (value) => {
  if (!value.trim()) {
    // return "Description is required";
    return "Cuisine is required";
  }
  return "";
};

const validateItemPrice = (value) => {
  if (!value.trim()) {
    return "Price is required";
  }
  if (!/^\d*\.?\d*$/.test(value)) {
    return "Only numbers and decimal point allowed";
  }
  return "";
};

const validateItemDiscount = (value) => {
  if (!/^\d*\.?\d*$/.test(value)) {
    return "Only numbers and decimal point allowed";
  }
  return "";
};

const validateMinQt = (value, maxQtValue) => {
  if (!value.trim()) {
    return "Min quantity is required";
  }
  if (!/^\d+$/.test(value)) {
    return "Only whole numbers allowed";
  }
  const num = parseInt(value, 10);
  if (num < 1) {
    return "Minimum value is 1";
  }
  if (num > 99) {
    return "Maximum value is 99";
  }
  if (maxQtValue && num > parseInt(maxQtValue, 10)) {
    return "Must be ≤ Max quantity";
  }
  return "";
};

const validateMaxQt = (value, minQtValue) => {
  if (!value.trim()) {
    return "Max quantity is required";
  }
  if (!/^\d+$/.test(value)) {
    return "Only whole numbers allowed";
  }
  const num = parseInt(value, 10);
  if (num > 99) {
    return "Maximum value is 99";
  }
  if (minQtValue && num < parseInt(minQtValue, 10)) {
    return "Must be ≥ Min quantity";
  }
  return "";
};

const validatePrepTime = (value) => {
  if (!value.trim()) {
    // return "Preparation time is required";
    value = 0; // Default value for logic only
  }
  if (!/^\d+$/.test(value)) {
    return "Only whole numbers allowed";
  }
  const num = parseInt(value, 10);
  if (num > 120) {
    return "Maximum value is 120";
  }
  return "";
};

const MenuAddDishItemScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { selectedFoodItems, selectedFoodCategory } = useSelector(
    (state) => state.foodTruckProfileReducer
  );

  const Params = route.params;

  const { checkAndRequestPermission: photosPermissionStatus } = usePermission(
    permission.photos
  );
  const { checkAndRequestPermission: cameraPermissionStatus } = usePermission(
    permission.camera
  );

  const [loading, setLoading] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemDiscount, setItemDiscount] = useState("0");
  const [minQt, setMinQt] = useState("1");
  const [maxQt, setMaxQt] = useState("10");
  const [prepTime, setPrepTime] = useState("10");
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [dietList, setDietList] = useState([]);
  const [selectedDiet, setSelectedDiet] = useState([]);
  const [customization, setCustomization] = useState(false);
  const [errors, setErrors] = useState({
    itemName: "",
    itemPhotos: "",
    itemDescription: "",
    itemPrice: "",
    qtMin: "",
    qtMax: "",
    prepTime: "",
  });

  const onPressUploadPhotos = () => {
    setModalVisible(true);
  };

  const onMediaModalClose = () => {
    setModalVisible(false);
  };

  const handleCameraPress = async () => {
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

                setSelectedPhotos((prev) => [...prev, imagedata]);
                setErrors((prev) => ({
                  ...prev,
                  itemPhotos: "",
                }));
              } catch (error) {
                console.log("error => ", error);
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
            multiple: true,
            mediaType: "photo",
          })
            .then((images) => {
              try {
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
                  itemPhotos: "",
                }));
              } catch (error) {
                console.log("error => ", error);
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

  const handleItemNameChange = (text) => {
    setItemName(text);
    setErrors((prev) => ({
      ...prev,
      itemName: validateItemName(text),
    }));
  };

  const handleItemDescriptionChange = (text) => {
    setItemDescription(text);
    setErrors((prev) => ({
      ...prev,
      itemDescription: validateItemDescription(text),
    }));
  };

  const handleItemPriceChange = (text) => {
    // Only allow numbers and decimal point
    const cleanedText = text.replace(/[^0-9.]/g, "");
    setItemPrice(cleanedText);
    setErrors((prev) => ({
      ...prev,
      itemPrice: validateItemPrice(cleanedText),
    }));
  };

  const handleItemDiscountChange = (text) => {
    // Only allow numbers and decimal point
    const cleanedText = text.replace(/[^0-9.]/g, "");
    setItemDiscount(cleanedText);
    setErrors((prev) => ({
      ...prev,
      itemDiscount: validateItemDiscount(cleanedText),
    }));
  };

  const handleMinQtChange = (text) => {
    // Only allow numbers
    const cleanedText = text.replace(/[^0-9]/g, "");
    // Limit to 99
    const limitedText = parseInt(cleanedText) > 99 ? "99" : cleanedText;
    setMinQt(limitedText);
    setErrors((prev) => ({
      ...prev,
      qtMin: validateMinQt(limitedText, maxQt),
      qtMax: maxQt ? validateMaxQt(maxQt, limitedText) : prev.qtMax,
    }));
  };

  const handleMaxQtChange = (text) => {
    // Only allow numbers
    const cleanedText = text.replace(/[^0-9]/g, "");
    // Limit to 99
    const limitedText = parseInt(cleanedText) > 99 ? "99" : cleanedText;
    setMaxQt(limitedText);
    setErrors((prev) => ({
      ...prev,
      qtMax: validateMaxQt(limitedText, minQt),
      qtMin: minQt ? validateMinQt(minQt, limitedText) : prev.qtMin,
    }));
  };

  const handlePrepTimeChange = (text) => {
    // Only allow numbers
    const cleanedText = text.replace(/[^0-9]/g, "");
    setPrepTime(cleanedText);
    setErrors((prev) => ({
      ...prev,
      prepTime: validatePrepTime(cleanedText),
    }));
  };

  // Add Food Item API Call
  const handleSaveBtnPress = async () => {
    // Validate all fields
    const newErrors = {
      itemName: validateItemName(itemName),
      itemDescription: validateItemDescription(itemDescription),
      itemPrice: validateItemPrice(itemPrice),
      itemDiscount: validateItemDiscount(itemDiscount),
      qtMin: validateMinQt(minQt, maxQt),
      qtMax: validateMaxQt(maxQt, minQt),
      itemPhotos:
        selectedPhotos.length === 0 ? "At least one image is required" : "",
      prepTime: validatePrepTime(prepTime),
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
      let payload = {
        name: itemName,
        description: itemDescription,
        price: parseFloat(parseFloat(itemPrice).toFixed(2)),
        minQty: parseInt(minQt, 10),
        maxQty: parseInt(maxQt, 10),
        itemType: "INDIVIDUAL",
        categoryId: Params?.category?._id,
        allowCustomize: customization,
        preparationTime: parseInt(prepTime || 0, 10),
        discount: parseFloat(parseFloat(itemDiscount || 0).toFixed(2)),
        diet: selectedDiet?.length > 0 ? selectedDiet : [],
      };

      // manage photos image upload
      const imageResult = [];
      for (const image of selectedPhotos) {
        const formData = new FormData();
        formData.append("file", {
          uri: image.uri,
          name: image.name,
          type: image.type,
        });
        try {
          const response = await uploadImage_API(formData);
          if (response?.success && response?.data)
            imageResult.push(response.data.file);
        } catch (error) {
          console.log("photo upload error => ", error);
        }
      }
      payload.imgUrls = imageResult;

      const response = await addFooditem_API(payload);
      if (response?.success && response?.data) {
        console.log("response => ", response);
        // Add item to food item for a category
        const tempData = [...selectedFoodItems, { ...response.data.menu }];
        dispatch(setSelectedFoodItems(tempData));

        // Add item count to category list
        const temp = selectedFoodCategory.map((item) =>
          item._id === Params?.category?._id
            ? { ...item, menuCount: item.menuCount + 1 }
            : item
        );
        dispatch(setSelectedFoodCategory(temp));

        // showing toast
        dispatch(
          showSnackbar({
            message: "New item has been added.",
            type: "success",
          })
        );
        navigation.goBack();
      }
    } catch (error) {
      console.log("Save error:", error);
      dispatch(
        showSnackbar({
          message: error.message,
          type: "error",
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const getDietListFromAPI = async () => {
    try {
      const response = await getDietList_API();
      if (response?.success && response?.data) {
        console.log("response => ", response);
        setDietList(response.data.dietList);
      }
    } catch (error) {
      console.log("error => ", error);
    }
  };

  useEffect(() => {
    getDietListFromAPI();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.black}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>{Params?.category?.name || ""}</Text>
        <View style={styles.headerIconContainer}></View>
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
          <View
            style={[styles.contentContainer, { paddingBottom: insets.bottom }]}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{"Add New Food Item"}</Text>
              <Divider />
            </View>

            {/* Dish/Item Name */}
            <View style={styles.section}>
              <Text style={[styles.inputLabel, { marginTop: 10 }]}>
                {"Dish/Item Name *"}
              </Text>
              <TextInput
                dense
                value={itemName}
                onChangeText={handleItemNameChange}
                style={styles.input}
                contentStyle={styles.inputText}
                placeholder=""
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                error={!!errors.itemName}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                autoCapitalize="sentences"
                theme={{ colors: { onSurfaceVariant: "#777" } }}
              />
              {!!errors.itemName && (
                <HelperText
                  type="error"
                  visible={!!errors.itemName}
                  style={styles.helper}
                >
                  {errors.itemName}
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
                <Text style={[styles.inputLabel, { marginBottom: 0 }]}>
                  {"Item Images *"}
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
                  style={styles.photoUploadContainer}
                  onPress={onPressUploadPhotos}
                >
                  <FontAwesome6
                    name="upload"
                    color={AppColor.black}
                    size={20}
                  />
                  <Text style={styles.uploadButtonText}>{"Upload Photo"}</Text>
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
                        <FastImage
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

              {!!errors.itemPhotos && (
                <HelperText
                  type="error"
                  visible={!!errors.itemPhotos}
                  style={[styles.helper, { alignSelf: "center" }]}
                >
                  {errors.itemPhotos}
                </HelperText>
              )}
            </View>

            {/* Description / Cuisine*/}
            <View style={styles.section}>
              <Text style={styles.inputLabel}>{"Cuisine *"}</Text>
              <TextInput
                dense
                value={itemDescription}
                onChangeText={handleItemDescriptionChange}
                style={styles.input}
                contentStyle={[styles.inputText, { minHeight: 120 }]}
                placeholder=""
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                multiline={true}
                error={!!errors.itemDescription}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                autoCapitalize="sentences"
                theme={{ colors: { onSurfaceVariant: "#777" } }}
              />
              {!!errors.itemDescription && (
                <HelperText
                  type="error"
                  visible={!!errors.itemDescription}
                  style={styles.helper}
                >
                  {errors.itemDescription}
                </HelperText>
              )}
            </View>

            {/* Customization */}
            <View style={styles.section}>
              <View style={styles.customizationContainer}>
                <TouchableOpacity
                  hitSlop={5}
                  onPress={() => setCustomization(!customization)}
                >
                  <Ionicons
                    name={customization ? "checkbox" : "square-outline"}
                    size={22}
                    color={AppColor.primary}
                  />
                </TouchableOpacity>

                <Text style={styles.customizationText}>
                  {"Allow Customization"}
                </Text>
              </View>
            </View>

            {/* Diet Preferences */}
            <View style={[styles.section, { marginBottom: 10 }]}>
              <Text style={styles.inputLabel}>{"Diet Preferences"}</Text>
              <MultiSelect
                // mode="modal"
                data={dietList}
                labelField="name"
                valueField="_id"
                value={selectedDiet}
                onChange={(selected) => setSelectedDiet(selected)}
                placeholder="Select Diet"
                style={styles.dropdown}
                placeholderStyle={{
                  fontFamily: Mulish400,
                  color: AppColor.textHighlighter,
                }}
                containerStyle={{
                  // maxHeight: "60%",
                  maxHeight: 200,
                  // borderRadius: 8,
                  // overflow: "hidden",
                }}
                itemContainerStyle={{
                  marginVertical: 1,
                }}
                itemTextStyle={{
                  fontFamily: Mulish400,
                }}
                selectedTextStyle={{
                  fontFamily: Mulish400,
                }}
                renderSelectedItem={(item, unSelect) => (
                  <TouchableOpacity
                    onPress={() => unSelect && unSelect(item)}
                    activeOpacity={0.7}
                    style={styles.dropdownSelectedItem}
                  >
                    <Text style={styles.dropdownSelectedItemText}>
                      {item.name}
                    </Text>
                    <AntDesign
                      name="closecircleo"
                      size={16}
                      color={AppColor.red}
                    />
                  </TouchableOpacity>
                )}
              />
            </View>

            {/* Price and Discount */}
            <View
              style={{ flexDirection: "row", alignItems: "baseline", gap: 16 }}
            >
              {/* Price Textinput */}
              <View style={[styles.section, { flex: 1 / 2, paddingRight: 0 }]}>
                <Text style={styles.inputLabel}>{"Item Price *"}</Text>
                <TextInput
                  dense
                  value={itemPrice}
                  onChangeText={handleItemPriceChange}
                  style={styles.input}
                  contentStyle={styles.inputText}
                  placeholder=""
                  placeholderTextColor={AppColor.placeholderTextColor}
                  mode="outlined"
                  keyboardType="numeric"
                  error={!!errors.itemPrice}
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                  autoCapitalize="none"
                  left={
                    <TextInput.Icon
                      icon={"currency-usd"}
                      color={AppColor.textHighlighter}
                      size={20}
                    />
                  }
                  theme={{ colors: { onSurfaceVariant: "#777" } }}
                />
                {!!errors.itemPrice && (
                  <HelperText
                    type="error"
                    visible={!!errors.itemPrice}
                    style={styles.helper}
                  >
                    {errors.itemPrice}
                  </HelperText>
                )}
              </View>
              {/* Discount Textinput */}
              <View style={[styles.section, { flex: 1 / 2, paddingLeft: 0 }]}>
                <Text style={styles.inputLabel}>{"Discount"}</Text>
                <TextInput
                  dense
                  value={itemDiscount}
                  onChangeText={handleItemDiscountChange}
                  style={styles.input}
                  contentStyle={styles.inputText}
                  placeholder=""
                  placeholderTextColor={AppColor.placeholderTextColor}
                  mode="outlined"
                  keyboardType="numeric"
                  error={!!errors.itemDiscount}
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                  autoCapitalize="none"
                  left={
                    <TextInput.Icon
                      icon={"currency-usd"}
                      color={AppColor.textHighlighter}
                      size={20}
                    />
                  }
                  theme={{ colors: { onSurfaceVariant: "#777" } }}
                />
                {!!errors.itemDiscount && (
                  <HelperText
                    type="error"
                    visible={!!errors.itemDiscount}
                    style={styles.helper}
                  >
                    {errors.itemDiscount}
                  </HelperText>
                )}
              </View>
            </View>

            {/* Min-Max quantity */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                gap: 16,
              }}
            >
              {/* Min qnt */}
              <View style={[styles.section, { flex: 1 / 2, paddingRight: 0 }]}>
                <Text style={styles.inputLabel}>{"Min Order Qty *"}</Text>
                <TextInput
                  dense
                  value={minQt}
                  onChangeText={handleMinQtChange}
                  style={styles.input}
                  contentStyle={styles.inputText}
                  placeholder=""
                  placeholderTextColor={AppColor.placeholderTextColor}
                  mode="outlined"
                  keyboardType="numeric"
                  error={!!errors.qtMin}
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                  autoCapitalize="none"
                  left={
                    <TextInput.Icon
                      icon={"cart-minus"}
                      color={AppColor.textHighlighter}
                      size={20}
                    />
                  }
                  theme={{ colors: { onSurfaceVariant: "#777" } }}
                />
                {!!errors.qtMin && (
                  <HelperText
                    type="error"
                    visible={!!errors.qtMin}
                    style={styles.helper}
                  >
                    {errors.qtMin}
                  </HelperText>
                )}
              </View>

              {/* Max qnt */}
              <View style={[styles.section, { flex: 1 / 2, paddingLeft: 0 }]}>
                <Text style={styles.inputLabel}>{"Max Order Qty *"}</Text>
                <TextInput
                  dense
                  value={maxQt}
                  onChangeText={handleMaxQtChange}
                  style={styles.input}
                  contentStyle={styles.inputText}
                  placeholder=""
                  placeholderTextColor={AppColor.placeholderTextColor}
                  mode="outlined"
                  keyboardType="numeric"
                  error={!!errors.qtMax}
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                  autoCapitalize="none"
                  left={
                    <TextInput.Icon
                      icon={"cart-plus"}
                      color={AppColor.textHighlighter}
                      size={20}
                    />
                  }
                  theme={{ colors: { onSurfaceVariant: "#777" } }}
                />
                {!!errors.qtMax && (
                  <HelperText
                    type="error"
                    visible={!!errors.qtMax}
                    style={styles.helper}
                  >
                    {errors.qtMax}
                  </HelperText>
                )}
              </View>
            </View>

            {/* Preparation Time */}
            <View style={styles.section}>
              <Text style={[styles.inputLabel, { marginTop: 10 }]}>
                {"Preparation Time in Minutes *"}
              </Text>
              <TextInput
                dense
                value={prepTime}
                onChangeText={handlePrepTimeChange}
                style={styles.input}
                contentStyle={styles.inputText}
                placeholder=""
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                error={!!errors.prepTime}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                autoCapitalize="none"
                keyboardType="numeric"
                left={
                  <TextInput.Icon
                    icon={"clock-outline"}
                    color={AppColor.textHighlighter}
                    size={20}
                  />
                }
                theme={{ colors: { onSurfaceVariant: "#777" } }}
              />
              {!!errors.prepTime && (
                <HelperText
                  type="error"
                  visible={!!errors.prepTime}
                  style={styles.helper}
                >
                  {errors.prepTime}
                </HelperText>
              )}
            </View>

            {/* save btn */}
            <View style={styles.section}>
              <TouchableOpacity
                onPress={handleSaveBtnPress}
                activeOpacity={0.7}
                disabled={loading}
                style={styles.saveButton}
              >
                {loading ? (
                  <ActivityIndicator color={AppColor.white} />
                ) : (
                  <Text style={styles.buttonLabel}>{"Save"}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Media Picker Modal */}
      <MediaPickerDialog
        isVisible={modalVisible}
        onCameraPress={() => handleCameraPress()}
        onGalleryPress={() => handleGalleryPress()}
        onClosePress={onMediaModalClose}
      />
    </View>
  );
};

export default MenuAddDishItemScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppColor.white,
    paddingHorizontal: 8,
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

  // content
  contentContainer: { flex: 1, backgroundColor: AppColor.white },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 20,
    fontFamily: Mulish700,
    color: AppColor.text,
    marginBottom: 16,
  },
  label: {
    fontSize: 18,
    fontFamily: Mulish400,
    color: AppColor.black,
    marginBottom: 8,
  },
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

  // input
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
    marginBottom: 8,
    paddingLeft: 0,
    paddingTop: 0,
    fontFamily: Mulish400,
  },

  // btn
  saveButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginVertical: 20,
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
  dropdownSelectedItem: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginTop: 8,
    marginRight: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: AppColor.white,
    shadowColor: AppColor.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    gap: 10,
  },
  dropdownSelectedItemText: {
    fontSize: 14,
    fontFamily: Mulish400,
  },

  // Customization btn
  customizationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customizationText: {
    fontSize: 15,
    color: AppColor.text,
    fontFamily: Mulish400,
  },
});
