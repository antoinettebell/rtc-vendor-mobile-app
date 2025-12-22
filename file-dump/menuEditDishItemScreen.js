import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator as NativeIndicator,
  Pressable,
  Dimensions,
  TextInput as NativeTextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import {
  ActivityIndicator,
  Divider,
  HelperText,
  IconButton,
  Switch,
  TextInput,
} from "react-native-paper";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import AntDesign from "react-native-vector-icons/AntDesign";
import Ionicons from "react-native-vector-icons/Ionicons";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor, Mulish700, Mulish400, Mulish600 } from "../utils/theme";
import MediaPickerDialog from "../components/MediaPickerDialog";
import ImagePicker from "react-native-image-crop-picker";
import FastImage from "@d11/react-native-fast-image";
import usePermission from "../hooks/usePermission";
import { permission } from "../helpers/permission.helper";
import { RESULTS } from "react-native-permissions";
import { Dropdown, MultiSelect } from "react-native-element-dropdown";
import ActionSheet from "react-native-actions-sheet";
import {
  getAllFoodItem_API,
  getDietList_API,
  getFoodItemByID_API,
  getMeatList_API,
  updateFooditemByID_API,
  uploadImage_API,
} from "../api/appAPI";
import { showSnackbar } from "../redux/slices/snackbarSlice";
import {
  setSelectedFoodCategory,
  setSelectedFoodItems,
} from "../redux/slices/foodTruckProfileSlice";
import {
  discountTypeList,
  dishNewFlagAllowPlanArray,
  foodTypeList,
  foodTypeStrings,
} from "../utils/constants";
import AppImage from "../components/AppImage";
import { getDiscountedPrice, editValidateItemName, editValidateItemDescription, editValidateItemPrice, editValidateItemDiscount, editValidateMinQt, editValidateMaxQt, editValidatePrepTime } from "../helpers/menu.helper";

const width = Dimensions.get("window").width;



const MenuEditDishItemScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const actionSheetRef = useRef(null);
  const Params = route.params;

  const { selectedFoodItems, selectedFoodCategory } = useSelector(
    (state) => state.foodTruckProfileReducer
  );
  const { selectedPlan } = useSelector((state) => state.userReducer);

  const { checkAndRequestPermission: photosPermissionStatus } = usePermission(
    permission.photos
  );
  const { checkAndRequestPermission: cameraPermissionStatus } = usePermission(
    permission.camera
  );

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [selectedDiscountType, setSelectedDiscountType] = useState("FIXED");
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [itemDiscount, setItemDiscount] = useState("0");
  const [newDishItemEnabled, setNewDishItemEnabled] = useState(false);
  const [popularDishItemEnabled, setPopularDishItemEnabled] = useState(false);
  const [minQt, setMinQt] = useState("1");
  const [maxQt, setMaxQt] = useState("10");
  const [prepTime, setPrepTime] = useState("10");
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [dietList, setDietList] = useState([]);
  const [selectedDiet, setSelectedDiet] = useState([]);
  const [selectedFoodType, setSelectedFoodType] = useState("");
  const [subItemList, setSubItemList] = useState([]);
  const [menuList, setMenuList] = useState([]);
  const [selectedMenus, setSelectedMenus] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [customization, setCustomization] = useState(false);
  const [meatList, setMeatList] = useState([]);
  const [selectedMeat, setSelectedMeat] = useState("");
  const [meatWellness, setMeatWellness] = useState("");
  const [errors, setErrors] = useState({
    itemName: "",
    itemPhotos: "",
    itemDescription: "",
    itemPrice: "",
    qtMin: "",
    qtMax: "",
    prepTime: "",
    comboItem: "",
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
      itemName: editValidateItemName(text),
    }));
  };

  const handleItemDescriptionChange = (text) => {
    setItemDescription(text);
    setErrors((prev) => ({
      ...prev,
      itemDescription: editValidateItemDescription(text),
    }));
  };

  const handleItemPriceChange = (text) => {
    // Only allow numbers and decimal point
    const cleanedText = text.replace(/[^0-9.]/g, "");
    setItemPrice(cleanedText);
    setErrors((prev) => ({
      ...prev,
      itemPrice: editValidateItemPrice(cleanedText),
    }));
  };

  const handleItemDiscountChange = (text) => {
    // Only allow numbers and decimal point
    const cleanedText = text.replace(/[^0-9.]/g, "");
    setItemDiscount(cleanedText);
    setErrors((prev) => ({
      ...prev,
      itemDiscount: editValidateItemDiscount(cleanedText),
    }));
  };

  const handleMinQtChange = (text) => {
    // Only allow numbers
    const cleanedText = text.replace(/[^0-9]/g, "");
    setMinQt(cleanedText);
    setErrors((prev) => ({
      ...prev,
      qtMin: editValidateMinQt(cleanedText, maxQt),
      qtMax: maxQt ? editValidateMaxQt(maxQt, cleanedText) : prev.qtMax,
    }));
  };

  const handleMaxQtChange = (text) => {
    // Only allow numbers
    const cleanedText = text.replace(/[^0-9]/g, "");
    setMaxQt(cleanedText);
    setErrors((prev) => ({
      ...prev,
      qtMax: editValidateMaxQt(cleanedText, minQt),
      qtMin: minQt ? editValidateMinQt(minQt, cleanedText) : prev.qtMin,
    }));
  };

  const handlePrepTimeChange = (text) => {
    // Only allow numbers
    const cleanedText = text.replace(/[^0-9]/g, "");
    setPrepTime(cleanedText);
    setErrors((prev) => ({
      ...prev,
      prepTime: editValidatePrepTime(cleanedText),
    }));
  };

  // Edit Food Item API Call
  const handleSaveBtnPress = async () => {
    // Calculate discounted price
    const discountedPrice = getDiscountedPrice(
      parseFloat(itemPrice), // actual price
      selectedDiscountType, // discount type
      parseFloat(itemDiscount) // discount value
    );

    // Validate all fields
    const newErrors = {
      itemName: editValidateItemName(itemName),
      itemDescription: editValidateItemDescription(itemDescription),
      itemPrice: editValidateItemPrice(itemPrice),
      qtMin: editValidateMinQt(minQt, maxQt),
      qtMax: editValidateMaxQt(maxQt, minQt),
      itemPhotos:
        selectedPhotos.length === 0 ? "At least one image is required" : "",
      prepTime: editValidatePrepTime(prepTime),
      comboItem:
        foodTypeStrings.combo === selectedFoodType
          ? selectedMenus?.length === 0
            ? "At least one dish is required"
            : ""
          : "",
    };

    // Only validate discount if toggle is enabled
    if (discountEnabled) {
      const discountError = editValidateItemDiscount(itemDiscount);
      if (discountError) {
        newErrors.itemDiscount = discountError;
      } else if (parseFloat(itemDiscount || 0) <= 0) {
        newErrors.itemDiscount = "Discount must be greater than 0";
      } else if (discountedPrice?.isPriceIncreased) {
        newErrors.itemDiscount = "Discount must be less than actual price";
      }
    } else {
      newErrors.itemDiscount = ""; // Clear discount error if toggle is off
    }

    setErrors(newErrors);

    // Check if there are any errors
    const hasErrors = Object.values(newErrors).some((error) => error !== "");
    if (hasErrors) {
      return;
    }

    // proceed with saving
    setLoading(true);
    try {
      const fooditem_id = Params?.foodItem?._id;
      let payload = {
        name: itemName,
        description: itemDescription,
        price: parseFloat(parseFloat(itemPrice).toFixed(2)),
        minQty: parseInt(minQt, 10),
        maxQty: parseInt(maxQt, 10),
        allowCustomize: customization,
        preparationTime: parseInt(prepTime || 0, 10),
        diet: selectedDiet?.length > 0 ? selectedDiet : [],
        newDish: newDishItemEnabled,
        popularDish: popularDishItemEnabled,
      };

      if (discountEnabled) {
        payload.discount = discountEnabled
          ? parseFloat(parseFloat(itemDiscount || 0).toFixed(2))
          : 0;
        payload.discountType = selectedDiscountType;
        payload.strikePrice = parseFloat(parseFloat(itemPrice).toFixed(2));
        payload.price = discountedPrice?.afterdiscountprice;
      }

      if (selectedMeat?.trim()?.length > 0) {
        payload.meatId = selectedMeat;
        payload.meatWellness = meatWellness;
      }

      if (selectedFoodType === foodTypeStrings.combo) {
        payload.subItem = selectedMenus?.map((item) => ({
          menuItem: item._id,
          qty: item.quantity,
        }));
      }

      // manage photos image upload
      const imageResult = [];
      for (const image of selectedPhotos) {
        if (image.old === undefined) {
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
        } else if (image.old) {
          imageResult.push(image.uri);
        }
      }
      payload.imgUrls = imageResult;

      const response = await updateFooditemByID_API({ payload, fooditem_id });
      if (response?.success && response?.data) {
        console.log("response => ", response);

        // Update item to food item for a category
        const temp = selectedFoodItems.map((item) =>
          item._id === fooditem_id ? { ...response.data.menu } : item
        );
        dispatch(setSelectedFoodItems(temp));

        // showing toast
        dispatch(
          showSnackbar({
            message: "Item has been updated.",
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

  // Convert API data to state
  const transformApiDataToState = (item) => {
    console.log("API Data => ", item);
    // Transform images array
    const transformedPhotos = item.imgUrls.map((uri) => ({
      uri,
      old: true,
    }));

    // Transform numeric values to strings
    const priceString = item.price.toString();
    const strikePriceString = (item?.strikePrice || item.price).toString(); // strike price is the actual prices for new changes & old data have actual price in "price" param
    const discountString = item.discount.toString();
    const minQtString = item.minQty.toString();
    const maxQtString = item.maxQty.toString();
    const prepTimeString = item.preparationTime?.toString() || "0";

    // Set all the states
    setItemName(item.name);
    setItemDescription(item.description);
    setItemPrice(strikePriceString);
    setSelectedDiscountType(item.discountType || "FIXED");
    setDiscountEnabled(item.discount > 0);
    setItemDiscount(item.discount > 0 ? discountString : "0");
    setNewDishItemEnabled(item?.newDish || false);
    setPopularDishItemEnabled(item?.popularDish || false);
    setSelectedMeat(item.meatId || "");
    setMeatWellness(item.meatWellness || "");
    setMinQt(minQtString);
    setMaxQt(maxQtString);
    setPrepTime(prepTimeString);
    setSelectedPhotos(transformedPhotos);
    setCustomization(item.allowCustomize);
    setSelectedDiet(item.diet.map((diet) => diet._id));
    setSelectedFoodType(item.itemType);
  };

  // Group menus by their category
  const groupMenusByCategory = () => {
    const grouped = {};
    menuList.forEach((menu) => {
      if (!grouped[menu.category._id]) {
        grouped[menu.category._id] = {
          categoryName: menu.category.name,
          items: [],
        };
      }
      grouped[menu.category._id].items.push(menu);
    });
    return grouped;
  };

  // Toggle category expansion
  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Handle item selection
  const handleItemSelect = (item) => {
    setSelectedMenus((prev) => {
      const isSelected = prev.some((selected) => selected._id === item._id);
      if (isSelected) {
        return prev.filter((selected) => selected._id !== item._id);
      } else {
        // Add item with default quantity of 1
        setErrors((prev) => ({
          ...prev,
          comboItem: "",
        }));
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  const handleIncreaseQuantity = (itemId) => {
    setSelectedMenus((prev) =>
      prev.map((item) =>
        item._id === itemId && item.quantity < 10
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const handleDecreaseQuantity = (itemId) => {
    setSelectedMenus((prev) =>
      prev.map((item) =>
        item._id === itemId && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    );
  };

  const getDataFromAPI = async () => {
    setDataLoading(true);
    try {
      const fooditem_id = Params?.foodItem?._id;
      const response = await getFoodItemByID_API(fooditem_id);
      console.log("response => ", response);
      if (response?.success && response?.data) {
        transformApiDataToState(response.data.menu);
        setSubItemList(response.data.menu.subItem);
      }

      const dietResponse = await getDietList_API();
      console.log("dietResponse => ", dietResponse);
      if (dietResponse?.success && dietResponse?.data) {
        setDietList(dietResponse.data.dietList);
      }
    } catch (error) {
      console.log("error => ", error);
      dispatch(
        showSnackbar({
          message: error.message,
          type: "error",
        })
      );
      navigation.goBack();
    } finally {
      setDataLoading(false);
    }
  };

  const getMenuListFromAPI = async () => {
    try {
      const response = await getAllFoodItem_API();
      console.log("response => ", response);
      if (response?.success && response?.data) {
        const tempAllMenu = response.data?.menuList || [];
        const tempFilteredMenu = tempAllMenu.filter(
          (item) =>
            item?.itemType === foodTypeStrings.individual &&
            item?.available === true // Only include available items
        );
        setMenuList(tempFilteredMenu); // only individual menu are considered
      }
    } catch (error) {
      console.log("error => ", error);
    }
  };

  const getMeatListFromAPI = async () => {
    try {
      const response = await getMeatList_API();
      console.log("response => ", response);
      if (response?.success && response?.data) {
        setMeatList(response.data.meatList);
      }
    } catch (error) {
      console.log("error => ", error);
    }
  };

  useEffect(() => {
    getDataFromAPI();
    getMenuListFromAPI();
    getMeatListFromAPI();
  }, []);

  useEffect(() => {
    if (!subItemList?.length || !menuList?.length) return;

    const matchedMenus = menuList.reduce((acc, menuItem) => {
      const matchingSubItem = subItemList.find(
        (subItem) => subItem.menuItem._id === menuItem._id
      );

      if (matchingSubItem) {
        acc.push({
          ...menuItem,
          quantity: matchingSubItem.qty || 0,
        });
      }

      return acc;
    }, []);

    setSelectedMenus(matchedMenus);
  }, [subItemList, menuList]);

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
        <View style={styles.headerIconContainer} />
      </View>

      {/* Content */}
      {dataLoading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingBottom: insets.bottom,
          }}
        >
          <NativeIndicator color={AppColor.primary} size="large" />
        </View>
      ) : (
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
              style={[
                styles.contentContainer,
                { paddingBottom: insets.bottom },
              ]}
            >
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{"Edit Food Item"}</Text>
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
                    <Text style={styles.uploadButtonText}>
                      {"Upload Photo"}
                    </Text>
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

              {/* Description / Cuisine */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>{"Description *"}</Text>
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

              {/* Diet Prefrences */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>{"Diet Prefrences"}</Text>
                <MultiSelect
                  // mode="modal"
                  inside={true}
                  data={dietList}
                  labelField="name"
                  valueField="_id"
                  value={selectedDiet}
                  onChange={(selected) => setSelectedDiet(selected)}
                  placeholder="Select Diet"
                  style={[styles.dropdown, { paddingVertical: 8 }]}
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

              {/* Meat Type Container */}
              <View style={styles.section}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Text style={[styles.inputLabel, { marginBottom: 0 }]}>
                    {"Meat"}
                  </Text>
                  {selectedMeat ? (
                    <Pressable
                      hitSlop={5}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedMeat("");
                        setMeatWellness("");
                      }}
                    >
                      <Text style={{ color: AppColor.textHighlighter }}>
                        {"Clear"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                <Dropdown
                  data={meatList}
                  labelField="name"
                  valueField="_id"
                  value={selectedMeat}
                  onChange={(selected) => setSelectedMeat(selected._id)}
                  placeholder="Select Meat"
                  style={styles.dropdown}
                  placeholderStyle={{
                    fontFamily: Mulish400,
                    color: AppColor.textHighlighter,
                  }}
                  itemTextStyle={{ fontFamily: Mulish400 }}
                  selectedTextStyle={{ fontFamily: Mulish400 }}
                />
              </View>

              {/* Meat Wellness */}
              {selectedMeat?.trim()?.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.inputLabel}>{"Meat Wellness"}</Text>
                  <TextInput
                    dense
                    value={meatWellness}
                    onChangeText={setMeatWellness}
                    style={styles.input}
                    contentStyle={styles.inputText}
                    placeholder=""
                    placeholderTextColor={AppColor.placeholderTextColor}
                    mode="outlined"
                    outlineColor={AppColor.border}
                    activeOutlineColor={AppColor.primary}
                    outlineStyle={{ borderRadius: 8 }}
                    autoCapitalize="sentences"
                    theme={{ colors: { onSurfaceVariant: "#777" } }}
                  />
                </View>
              ) : null}

              {/* Price Textinput */}
              <View style={styles.section}>
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

              {/* Discount Container */}
              <View style={styles.section}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={[styles.inputLabel, { marginBottom: 0 }]}
                  >
                    {"Discount"}
                  </Text>
                  <View>
                    <Switch
                      color={AppColor.primary}
                      value={discountEnabled}
                      onValueChange={(value) => setDiscountEnabled(value)}
                    />
                  </View>
                </View>
                {/* Discount Textinput */}
                {discountEnabled ? (
                  <>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: AppColor.border,
                        borderRadius: 8,
                        marginTop: 8,
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
                            name={
                              selectedDiscountType === "FIXED"
                                ? "dollar-sign"
                                : "percent"
                            }
                            size={18}
                            color={AppColor.textHighlighter}
                          />
                        </View>
                        <Dropdown
                          data={discountTypeList}
                          labelField="txt"
                          valueField="type"
                          value={selectedDiscountType}
                          onChange={(item) => {
                            setSelectedDiscountType(item.type);
                          }}
                          placeholder={""}
                          style={{
                            position: "absolute",
                            height: 46,
                            paddingHorizontal: 12,
                            paddingVertical: 14,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 5,
                          }}
                          containerStyle={{ width: width - 34 }}
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
                                flex: 1,
                                height: 46,
                                paddingHorizontal: 16,
                                justifyContent: "center",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 16,
                                  fontFamily: Mulish400,
                                  color: AppColor.text,
                                }}
                              >
                                {item.label}
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
                        value={itemDiscount}
                        onChangeText={handleItemDiscountChange}
                        style={{
                          flex: 1,
                          height: 46,
                          fontSize: 15,
                          fontFamily: Mulish400,
                          backgroundColor: AppColor.white,
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 8,
                        }}
                        placeholder={
                          selectedDiscountType === "FIXED" ? "0.00" : "0%"
                        }
                        placeholderTextColor={AppColor.placeholderTextColor}
                        keyboardType="number-pad"
                      />
                    </View>
                    {/* <TextInput
                      dense
                      value={itemDiscount}
                      onChangeText={handleItemDiscountChange}
                      style={[styles.input, { marginTop: 8 }]}
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
                    /> */}
                    {!!errors.itemDiscount && (
                      <HelperText
                        type="error"
                        visible={!!errors.itemDiscount}
                        style={styles.helper}
                      >
                        {errors.itemDiscount}
                      </HelperText>
                    )}
                  </>
                ) : null}
              </View>

              {/* Customisation Container */}
              <View style={styles.section}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={[styles.inputLabel, { marginBottom: 0 }]}
                  >
                    {"Allow Customization"}
                  </Text>
                  <View>
                    <Switch
                      color={AppColor.primary}
                      value={customization}
                      onValueChange={(value) => setCustomization(value)}
                    />
                  </View>
                </View>
              </View>

              {/* New Item Container */}
              {dishNewFlagAllowPlanArray.includes(selectedPlan.slug) ? (
                <View style={styles.section}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={[styles.inputLabel, { marginBottom: 0 }]}
                    >
                      {"New Dish/Item"}
                    </Text>
                    <View>
                      <Switch
                        color={AppColor.primary}
                        value={newDishItemEnabled}
                        onValueChange={(value) => setNewDishItemEnabled(value)}
                      />
                    </View>
                  </View>
                </View>
              ) : null}

              {/* Popular Item Container */}
              <View style={styles.section}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={[styles.inputLabel, { marginBottom: 0 }]}
                  >
                    {"Popular Dish/Item"}
                  </Text>
                  <View>
                    <Switch
                      color={AppColor.primary}
                      value={popularDishItemEnabled}
                      onValueChange={(value) =>
                        setPopularDishItemEnabled(value)
                      }
                    />
                  </View>
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
                <View
                  style={[styles.section, { flex: 1 / 2, paddingRight: 0 }]}
                >
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

              {/* Food Type Container */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>
                  {"Food Type"}
                  <Text style={{ fontSize: 12 }}>{" (*can not change)"}</Text>
                </Text>
                <Dropdown
                  disable={true}
                  data={foodTypeList}
                  labelField="label"
                  valueField="type"
                  value={selectedFoodType}
                  onChange={(selected) => setSelectedFoodType(selected.type)}
                  placeholder="Select Food Type"
                  style={styles.dropdown}
                  placeholderStyle={{
                    fontFamily: Mulish400,
                    color: AppColor.textHighlighter,
                  }}
                  itemTextStyle={{ fontFamily: Mulish400 }}
                  selectedTextStyle={{ fontFamily: Mulish400 }}
                />
              </View>

              {/* Item Selection Container for COMBO */}
              {selectedFoodType === foodTypeStrings.combo ? (
                <View>
                  {/* Label for selection */}
                  <Pressable
                    onPress={() => {
                      setExpandedCategories({});
                      actionSheetRef.current?.show();
                    }}
                    style={[
                      styles.section,
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      },
                    ]}
                  >
                    <Text style={styles.inputLabel}>
                      {"Select Dish/Item for Combo"}
                    </Text>
                    <AntDesign
                      name="plussquareo"
                      size={20}
                      color={AppColor.primary}
                    />
                  </Pressable>
                  {!!errors.comboItem && (
                    <HelperText
                      type="error"
                      visible={!!errors.comboItem}
                      style={[styles.helper, { marginHorizontal: 16 }]}
                    >
                      {errors.comboItem}
                    </HelperText>
                  )}
                  {/* Item list goes here */}
                  {selectedMenus.length > 0 && (
                    <View style={[styles.section, { marginTop: 0 }]}>
                      {selectedMenus.map((item, index) => (
                        <View key={item._id}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              paddingVertical: 12,
                            }}
                          >
                            <AppImage
                              uri={item.imgUrls?.[0]}
                              containerStyle={{
                                width: 50,
                                height: 50,
                                borderRadius: 8,
                              }}
                            />

                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text
                                style={{
                                  fontFamily: Mulish600,
                                  fontSize: 14,
                                  color: AppColor.text,
                                }}
                                numberOfLines={1}
                              >
                                {item.name}
                              </Text>
                              <Text
                                style={{
                                  fontFamily: Mulish400,
                                  fontSize: 12,
                                  color: AppColor.textHighlighter,
                                  marginTop: 4,
                                }}
                                numberOfLines={2}
                              >
                                {item.description}
                              </Text>
                              <Text
                                style={{
                                  fontFamily: Mulish600,
                                  fontSize: 14,
                                  color: AppColor.primary,
                                  marginTop: 4,
                                }}
                              >
                                ${(item.price * item.quantity).toFixed(2)} (
                                {item.quantity} x ${item.price.toFixed(2)})
                              </Text>
                            </View>

                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                              }}
                            >
                              <TouchableOpacity
                                onPress={() => handleDecreaseQuantity(item._id)}
                                disabled={item.quantity <= 1}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 14,
                                  backgroundColor:
                                    item.quantity <= 1
                                      ? AppColor.border
                                      : AppColor.primary,
                                  justifyContent: "center",
                                  alignItems: "center",
                                }}
                              >
                                <AntDesign
                                  name="minus"
                                  size={16}
                                  color={
                                    item.quantity <= 1
                                      ? AppColor.textHighlighter
                                      : AppColor.white
                                  }
                                />
                              </TouchableOpacity>

                              <Text
                                style={{
                                  fontFamily: Mulish600,
                                  fontSize: 16,
                                  marginHorizontal: 8,
                                  minWidth: 20,
                                  textAlign: "center",
                                }}
                              >
                                {item.quantity}
                              </Text>

                              <TouchableOpacity
                                onPress={() => handleIncreaseQuantity(item._id)}
                                disabled={item.quantity >= 10}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 14,
                                  backgroundColor:
                                    item.quantity >= 10
                                      ? AppColor.border
                                      : AppColor.primary,
                                  justifyContent: "center",
                                  alignItems: "center",
                                }}
                              >
                                <AntDesign
                                  name="plus"
                                  size={16}
                                  color={
                                    item.quantity >= 10
                                      ? AppColor.textHighlighter
                                      : AppColor.white
                                  }
                                />
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => handleItemSelect(item)}
                                style={{
                                  marginLeft: 12,
                                  padding: 4,
                                }}
                                hitSlop={{
                                  top: 10,
                                  bottom: 10,
                                  left: 10,
                                  right: 10,
                                }}
                              >
                                <AntDesign
                                  name="closecircle"
                                  size={20}
                                  color={AppColor.red}
                                />
                              </TouchableOpacity>
                            </View>
                          </View>

                          {selectedMenus?.length - 1 != index ? (
                            <Divider style={{ marginVertical: 2 }} />
                          ) : null}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : null}

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
      )}

      {/* Action Sheet */}
      <ActionSheet
        ref={actionSheetRef}
        headerAlwaysVisible={true}
        gestureEnabled={true}
        containerStyle={{
          backgroundColor: AppColor.white,
          height: "90%",
        }}
      >
        <View
          style={{
            padding: 16,
            paddingBottom: 0,
            height: "100%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontFamily: Mulish700,
                color: AppColor.text,
              }}
            >
              Select Items for Combo
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => actionSheetRef.current?.hide()}
            >
              <AntDesign name="close" size={24} color={AppColor.text} />
            </TouchableOpacity>
          </View>

          {selectedMenus.length > 0 && (
            <View
              style={{
                backgroundColor: AppColor.primary + "20",
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: Mulish600,
                  color: AppColor.primary,
                  marginBottom: 8,
                }}
              >
                Selected Items ({selectedMenus.length})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {selectedMenus.map((item) => (
                  <View
                    key={item._id}
                    style={{
                      backgroundColor: AppColor.white,
                      borderRadius: 8,
                      padding: 8,
                      marginRight: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <AppImage
                      uri={item.imgUrls?.[0]}
                      containerStyle={{
                        width: 30,
                        height: 30,
                        borderRadius: 4,
                      }}
                    />
                    <Text
                      style={{
                        fontFamily: Mulish400,
                        fontSize: 12,
                        maxWidth: 100,
                      }}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <TouchableOpacity
                      hitSlop={5}
                      activeOpacity={0.7}
                      style={{
                        backgroundColor: AppColor.primary,
                        borderRadius: 12,
                        padding: 4,
                      }}
                      onPress={() => handleItemSelect(item)}
                    >
                      <AntDesign
                        name="close"
                        size={12}
                        color={AppColor.white}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {menuList.length === 0 ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 40,
                flex: 1,
              }}
            >
              <Ionicons
                name="fast-food-outline"
                size={48}
                color={AppColor.border}
                style={{ marginBottom: 16 }}
              />
              <Text
                style={{
                  fontFamily: Mulish400,
                  color: AppColor.textHighlighter,
                  textAlign: "center",
                }}
              >
                No menu items available to add to combo
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {Object.entries(groupMenusByCategory()).map(
                ([categoryId, categoryData]) => (
                  <View key={categoryId} style={{ marginBottom: 16 }}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => toggleCategory(categoryId)}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: AppColor.border,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: Mulish700,
                          fontSize: 16,
                          color: AppColor.text,
                        }}
                      >
                        {categoryData.categoryName}
                      </Text>
                      <Ionicons
                        name={
                          expandedCategories[categoryId]
                            ? "chevron-up"
                            : "chevron-down"
                        }
                        size={20}
                        color={AppColor.text}
                      />
                    </TouchableOpacity>

                    {expandedCategories[categoryId] && (
                      <View style={{ marginTop: 8 }}>
                        {categoryData.items.map((item) => (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            key={item._id}
                            onPress={() => handleItemSelect(item)}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              paddingVertical: 12,
                              borderBottomWidth: 1,
                              borderBottomColor: AppColor.border + "50",
                            }}
                          >
                            <AppImage
                              uri={item.imgUrls?.[0]}
                              containerStyle={{
                                width: 50,
                                height: 50,
                                borderRadius: 8,
                              }}
                            />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text
                                style={{
                                  fontFamily: Mulish600,
                                  fontSize: 14,
                                  color: AppColor.text,
                                }}
                                numberOfLines={1}
                              >
                                {item.name}
                              </Text>
                              <Text
                                style={{
                                  fontFamily: Mulish400,
                                  fontSize: 12,
                                  color: AppColor.textHighlighter,
                                  marginTop: 4,
                                }}
                                numberOfLines={2}
                              >
                                {item.description}
                              </Text>
                              <Text
                                style={{
                                  fontFamily: Mulish600,
                                  fontSize: 14,
                                  color: AppColor.primary,
                                  marginTop: 4,
                                }}
                              >
                                ${item.price.toFixed(2)}
                              </Text>
                            </View>
                            <View
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: selectedMenus.some(
                                  (selected) => selected._id === item._id
                                )
                                  ? AppColor.primary
                                  : AppColor.border,
                                backgroundColor: selectedMenus.some(
                                  (selected) => selected._id === item._id
                                )
                                  ? AppColor.primary
                                  : "transparent",
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              {selectedMenus.some(
                                (selected) => selected._id === item._id
                              ) ? (
                                <AntDesign
                                  name="check"
                                  size={16}
                                  color={AppColor.white}
                                />
                              ) : (
                                <AntDesign
                                  name="plus"
                                  size={16}
                                  color={AppColor.border}
                                />
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )
              )}
            </ScrollView>
          )}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              // Handle the selected items here
              console.log("Selected items:", selectedMenus);
              actionSheetRef.current?.hide();
            }}
            style={{
              backgroundColor: AppColor.primary,
              borderRadius: 8,
              padding: 16,
              alignItems: "center",
              marginTop: 16,
            }}
          >
            <Text
              style={{
                fontFamily: Mulish700,
                fontSize: 16,
                color: AppColor.white,
              }}
            >
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </ActionSheet>

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

export default MenuEditDishItemScreen;

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
    width: 50,
    height: 50,
    borderRadius: 5,
  },

  // input
  inputLabel: {
    fontFamily: Mulish600,
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
