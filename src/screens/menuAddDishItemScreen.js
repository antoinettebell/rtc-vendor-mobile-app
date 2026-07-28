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
  Pressable,
  Dimensions,
  TextInput as NativeTextInput,
  ActivityIndicator as NativeIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import {
  ActivityIndicator,
  HelperText,
  IconButton,
  Switch,
  TextInput,
} from "react-native-paper";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import AntDesign from "react-native-vector-icons/AntDesign";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor, Mulish700, Mulish400, Mulish600 } from "../utils/theme";
import MediaPickerDialog from "../components/MediaPickerDialog";
import ImagePicker from "react-native-image-crop-picker";
import usePermission from "../hooks/usePermission";
import { permission } from "../helpers/permission.helper";
import { RESULTS } from "react-native-permissions";
import { Dropdown, MultiSelect } from "react-native-element-dropdown";
import {
  addFooditem_API,
  getAllFoodItem_API,
  getDietList_API,
  getMeatList_API,
  uploadImage_API,
  getCommonList_API,
  getFoodItemByID_API,
  updateFooditemByID_API,
} from "../api/appAPI";
import { showSnackbar } from "../redux/slices/snackbarSlice";
import { discountTypeList, foodTypeStrings } from "../utils/constants";
import AppImage from "../components/AppImage";
import {
  getDiscountedPrice,
  addValidateItemName,
  addValidateItemDescription,
  addValidateItemPrice,
  addValidateItemDiscount,
  addValidateMinQt,
  addValidateMaxQt,
  addValidatePrepTime,
  isValidCategoryForMeat,
  isValidCategoryForMeatWellness,
  getFoodType,
} from "../helpers/menu.helper";
import BogoItemsActionSheet from "../components/BogoItemsActionSheet";
import ComboItemsActionSheet from "../components/ComboItemsActionSheet";
import { toTitleCase } from "../utils/textFormat";

const width = Dimensions.get("window").width;
const flavorCountOptions = Array.from({ length: 15 }, (_, index) => ({
  label: `${index + 1}`,
  value: index + 1,
}));
const flavorsPerOrderOptions = Array.from({ length: 5 }, (_, index) => ({
  label: `${index + 1}`,
  value: index + 1,
}));
const flavorCategoryNames = ["individual", "dessert", "desserts", "side", "sides"];

export default function MenuAddDishItemScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const bogoActionSheetRef = useRef(null);
  const comboActionSheetRef = useRef(null);
  const Params = React.useMemo(() => route.params, [route.params]);

  const { selectedPlan } = useSelector((state) => state.userReducer);
  const canHighlightNewDish = !!selectedPlan?.capabilities?.newDishHighlight;

  const isMeatDisable = React.useMemo(
    () => !isValidCategoryForMeat(Params?.category?.name),
    [Params?.category?.name]
  );

  const isMeatWellnessDisable = React.useMemo(
    () => !isValidCategoryForMeatWellness(Params?.category?.name),
    [Params?.category?.name]
  );

  const foodType = React.useMemo(
    () => getFoodType(Params?.category?.name),
    [Params?.category?.name]
  );
  const canUseFlavors = React.useMemo(
    () => {
      const categoryName = String(Params?.category?.name || "")
        .trim()
        .toLowerCase();
      return (
        foodType === foodTypeStrings.combo ||
        flavorCategoryNames.some((name) => categoryName.includes(name))
      );
    },
    [Params?.category?.name, foodType]
  );

  const { checkAndRequestPermission: photosPermissionStatus } = usePermission(
    permission.photos
  );
  const { checkAndRequestPermission: cameraPermissionStatus } = usePermission(
    permission.camera
  );

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [selectedDiscountType, setSelectedDiscountType] = useState("FIXED");
  const [itemDiscount, setItemDiscount] = useState("0");
  const [newDishItemEnabled, setNewDishItemEnabled] = useState(false);
  const [minQt, setMinQt] = useState("1");
  const [maxQt, setMaxQt] = useState("10");
  const [prepTime, setPrepTime] = useState("10");
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [dietList, setDietList] = useState([]);
  const [selectedDiet, setSelectedDiet] = useState([]);
  const [menuList, setMenuList] = useState([]);
  const [bogoItems, setBogoItems] = useState([]);
  const [comboItems, setComboItems] = useState([]);
  const [customization, setCustomization] = useState(false);
  const [hasFlavors, setHasFlavors] = useState(false);
  const [flavorCount, setFlavorCount] = useState(1);
  const [flavorsPerOrder, setFlavorsPerOrder] = useState(1);
  const [flavors, setFlavors] = useState(["Plain"]);
  const [hasFlavorCosts, setHasFlavorCosts] = useState(false);
  const [flavorCostEnabled, setFlavorCostEnabled] = useState([false]);
  const [flavorCosts, setFlavorCosts] = useState(["0"]);
  const [hasToppings, setHasToppings] = useState(false);
  const [toppingCount, setToppingCount] = useState(1);
  const [toppingsPerOrder, setToppingsPerOrder] = useState(1);
  const [toppings, setToppings] = useState(["Plain"]);
  const [hasToppingCosts, setHasToppingCosts] = useState(false);
  const [toppingCostEnabled, setToppingCostEnabled] = useState([false]);
  const [toppingCosts, setToppingCosts] = useState(["0"]);
  const [meatList, setMeatList] = useState([]);
  const [selectedMeat, setSelectedMeat] = useState("");
  const [meatWellness, setMeatWellness] = useState("");
  const [discountList, setDiscountList] = useState([]);
  const [meatWellnessList, setMeatWellnessList] = useState([]);
  const [discountSource, setDiscountSource] = useState("custom"); // 'custom' or 'predefined'
  const [selectedPredefinedDiscount, setSelectedPredefinedDiscount] =
    useState(null);
  const [buyQty, setBuyQty] = useState("1");
  const [getQty, setGetQty] = useState("1");
  const [isSameItemForBogo, setIsSameItemForBogo] = useState(false);
  const [discountRuleVal, setDiscountRuleVal] = useState("1.0"); // 1.0 for BOGO, 0.5 for BOGOHO
  const [activeSection, setActiveSection] = useState("basic"); // 'basic', 'pricing', 'details'
  const [errors, setErrors] = useState({
    itemName: "",
    itemPhotos: "",
    customDiscount: "",
    predefinedDiscount: "",
    comboItems: "",
    itemDescription: "",
    itemPrice: "",
    qtMin: "",
    qtMax: "",
    prepTime: "",
    flavors: "",
    toppings: "",
  });

  const memoizedMenuList = React.useMemo(() => menuList, [menuList]);

  // Handle upload photos press
  const onPressUploadPhotos = () => {
    setModalVisible(true);
  };

  // Handle media modal close
  const onMediaModalClose = () => {
    setModalVisible(false);
  };

  // Handle camera press
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

  // Handle gallery press
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

  // Handle photos remove press
  const onPhotosRemovePress = (index) => {
    const tempPhotos = selectedPhotos.filter((_, i) => i !== index);
    setSelectedPhotos(tempPhotos);
  };

  // Handle item name change
  const handleItemNameChange = (text) => {
    setItemName(text);
    setErrors((prev) => ({
      ...prev,
      itemName: addValidateItemName(text),
    }));
  };

  // Handle item description change
  const handleItemDescriptionChange = (text) => {
    setItemDescription(text);
    setErrors((prev) => ({
      ...prev,
      itemDescription: addValidateItemDescription(text),
    }));
  };

  // Handle item price change
  const handleItemPriceChange = (text) => {
    // Only allow numbers and decimal point
    const cleanedText = text.replace(/[^0-9.]/g, "");
    setItemPrice(cleanedText);
    setErrors((prev) => ({
      ...prev,
      itemPrice: addValidateItemPrice(cleanedText),
    }));

    // If "Same item for free/reward" is enabled, update the BOGO item price
    if (isSameItemForBogo) {
      setBogoItems((prev) =>
        prev.map((item) =>
          item._id === "SAME_ITEM"
            ? { ...item, price: parseFloat(cleanedText) || 0 }
            : item
        )
      );
    }
  };

  // Handle item discount (text input value) change
  const handleItemDiscountChange = (text) => {
    // Only allow numbers and decimal point
    const cleanedText = text.replace(/[^0-9.]/g, "");
    setItemDiscount(cleanedText);
    setErrors((prev) => ({
      ...prev,
      customDiscount: addValidateItemDiscount(cleanedText),
    }));
  };

  // Handle min quantity change
  const handleMinQtChange = (text) => {
    // Only allow numbers
    const cleanedText = text.replace(/[^0-9]/g, "");
    // Limit to 99
    const limitedText = parseInt(cleanedText) > 99 ? "99" : cleanedText;
    setMinQt(limitedText);
    setErrors((prev) => ({
      ...prev,
      qtMin: addValidateMinQt(limitedText, maxQt),
      qtMax: maxQt ? addValidateMaxQt(maxQt, limitedText) : prev.qtMax,
    }));
  };

  // Handle max quantity change
  const handleMaxQtChange = (text) => {
    // Only allow numbers
    const cleanedText = text.replace(/[^0-9]/g, "");
    // Limit to 99
    const limitedText = parseInt(cleanedText) > 99 ? "99" : cleanedText;
    setMaxQt(limitedText);
    setErrors((prev) => ({
      ...prev,
      qtMax: addValidateMaxQt(limitedText, minQt),
      qtMin: minQt ? addValidateMinQt(minQt, limitedText) : prev.qtMin,
    }));
  };

  // Handle prep time change
  const handlePrepTimeChange = (text) => {
    // Only allow numbers
    const cleanedText = text.replace(/[^0-9]/g, "");
    setPrepTime(cleanedText);
    setErrors((prev) => ({
      ...prev,
      prepTime: addValidatePrepTime(cleanedText),
    }));
  };

  const handleFlavorCountChange = (selected) => {
    const nextCount = selected.value;
    setFlavorCount(nextCount);
    setFlavorsPerOrder((currentValue) => Math.min(currentValue, nextCount, 5));
    setFlavors((currentFlavors) => {
      const nextFlavors = ["Plain"];
      for (let index = 1; index < nextCount; index += 1) {
        nextFlavors[index] = currentFlavors[index] || "";
      }
      return nextFlavors;
    });
    setFlavorCostEnabled((currentValues) =>
      Array.from({ length: nextCount }, (_, index) => currentValues[index] || false)
    );
    setFlavorCosts((currentValues) =>
      Array.from({ length: nextCount }, (_, index) => currentValues[index] || "0")
    );
    setErrors((prev) => ({ ...prev, flavors: "" }));
  };

  const handleFlavorNameChange = (text, index) => {
    setFlavors((currentFlavors) => {
      const nextFlavors = [...currentFlavors];
      nextFlavors[index] = text;
      return nextFlavors;
    });
    setErrors((prev) => ({ ...prev, flavors: "" }));
  };

  const handleToppingCountChange = (selected) => {
    const nextCount = selected.value;
    setToppingCount(nextCount);
    setToppingsPerOrder((currentValue) => Math.min(currentValue, nextCount));
    setToppings((currentToppings) => {
      const nextToppings = ["Plain"];
      for (let index = 1; index < nextCount; index += 1) {
        nextToppings[index] = currentToppings[index] || "";
      }
      return nextToppings;
    });
    setToppingCostEnabled((currentValues) =>
      Array.from({ length: nextCount }, (_, index) => currentValues[index] || false)
    );
    setToppingCosts((currentValues) =>
      Array.from({ length: nextCount }, (_, index) => currentValues[index] || "0")
    );
    setErrors((prev) => ({ ...prev, toppings: "" }));
  };

  const handleToppingNameChange = (text, index) => {
    setToppings((currentToppings) => {
      const nextToppings = [...currentToppings];
      nextToppings[index] = text;
      return nextToppings;
    });
    setErrors((prev) => ({ ...prev, toppings: "" }));
  };

  const handleOptionCostToggle = (setter, index) => {
    setter((currentValues) => {
      const nextValues = [...currentValues];
      nextValues[index] = !nextValues[index];
      return nextValues;
    });
  };

  const handleOptionCostChange = (setter, text, index) => {
    const cleanedText = text.replace(/[^0-9.]/g, "");
    setter((currentValues) => {
      const nextValues = [...currentValues];
      nextValues[index] = cleanedText;
      return nextValues;
    });
  };

  const validateFlavors = () => {
    if (!canUseFlavors || !hasFlavors) {
      return "";
    }

    const requiredFlavors = flavors.slice(0, flavorCount);
    const missingFlavorIndex = requiredFlavors.findIndex(
      (flavor, index) => index > 0 && !String(flavor || "").trim()
    );

    if (missingFlavorIndex !== -1) {
      return `Flavor ${missingFlavorIndex + 1} is required`;
    }

    const normalizedFlavors = requiredFlavors.map((flavor) =>
      String(flavor || "").trim().toLowerCase()
    );
    if (new Set(normalizedFlavors).size !== normalizedFlavors.length) {
      return "Flavor names must be unique";
    }

    if (flavorsPerOrder > flavorCount) {
      return "Flavors per order cannot exceed total flavors";
    }

    const missingCostIndex = requiredFlavors.findIndex(
      (_, index) =>
        hasFlavorCosts &&
        flavorCostEnabled[index] &&
        (parseFloat(flavorCosts[index] || "0") <= 0)
    );
    if (missingCostIndex !== -1) {
      return `Flavor ${missingCostIndex + 1} cost must be greater than 0`;
    }

    return "";
  };

  const validateToppings = () => {
    if (!hasToppings) {
      return "";
    }

    const requiredToppings = toppings.slice(0, toppingCount);
    const missingToppingIndex = requiredToppings.findIndex(
      (topping) => !String(topping || "").trim()
    );

    if (missingToppingIndex !== -1) {
      return `Topping ${missingToppingIndex + 1} is required`;
    }

    const normalizedToppings = requiredToppings.map((topping) =>
      String(topping || "").trim().toLowerCase()
    );
    if (new Set(normalizedToppings).size !== normalizedToppings.length) {
      return "Topping names must be unique";
    }

    const missingCostIndex = requiredToppings.findIndex(
      (_, index) =>
        hasToppingCosts &&
        toppingCostEnabled[index] &&
        (parseFloat(toppingCosts[index] || "0") <= 0)
    );
    if (missingCostIndex !== -1) {
      return `Topping ${missingCostIndex + 1} cost must be greater than 0`;
    }

    return "";
  };

  // open BOGO action sheet
  const openBogoSheet = () => {
    bogoActionSheetRef.current?.show();
  };

  // open Combo action sheet
  const openComboSheet = () => {
    comboActionSheetRef.current?.show();
  };

  // Handle BOGO items change
  const handleBogoItemsChange = (selectedItems) => {
    setBogoItems(selectedItems);
    if (selectedItems.length === 0) {
      setErrors((prev) => ({
        ...prev,
        predefinedDiscount: "Please select BOGO/BOGOHO items",
      }));
    } else {
      setErrors((prev) => ({
        ...prev,
        predefinedDiscount: "",
      }));
    }
  };

  // Handle BOGO same item toggle
  const handleBogoSameItemToggle = (value) => {
    setIsSameItemForBogo(value);
    if (value) {
      // Automatically set to same item
      const sameItem = {
        _id: "SAME_ITEM",
        name: "Same Item",
        isSameItem: true,
        imgUrls: [],
        price: parseFloat(itemPrice) || 0,
      };
      setBogoItems([sameItem]);
      setErrors((prev) => ({
        ...prev,
        predefinedDiscount: "",
      }));
    } else {
      // Clear BOGO items when toggled off to allow manual selection
      setBogoItems([]);
    }
  };

  // Handle Combo items change
  const handleComboItemsChange = (selectedItems) => {
    setComboItems(selectedItems);
    if (selectedItems.length === 0) {
      setErrors((prev) => ({
        ...prev,
        comboItems: "Please select Combo items",
      }));
    } else {
      setErrors((prev) => ({
        ...prev,
        comboItems: "",
      }));
    }
  };

  // Handle BOGO item remove press
  const onBogoItemRemovePress = (index) => {
    const tempBogoItems = bogoItems.filter((_, i) => i !== index);
    setBogoItems(tempBogoItems);
  };

  // Handle Combo item remove press
  const onComboItemRemovePress = (index) => {
    const tempComboItems = comboItems.filter((_, i) => i !== index);
    setComboItems(tempComboItems);
  };

  // validation function for basic info tab
  const validateBasicInfo = () => {
    const newErrors = {
      itemName: addValidateItemName(itemName),
      itemDescription: addValidateItemDescription(itemDescription),
	      itemPhotos:
	        selectedPhotos.length === 0 ? "At least one image is required" : "",
	      flavors: validateFlavors(),
	      toppings: validateToppings(),
	    };
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return !Object.values(newErrors).some((error) => error !== "");
  };

  // validation function for princing tab
  const validatePricing = () => {
    const newErrors = {
      itemPrice: addValidateItemPrice(itemPrice),
    };
    // Only validate discount if toggle is enabled
    if (discountEnabled) {
      if (discountSource === "custom") {
        const discountError = addValidateItemDiscount(itemDiscount);
        if (discountError) {
          newErrors.customDiscount = discountError;
        } else if (parseFloat(itemDiscount || 0) <= 0) {
          newErrors.customDiscount = "Discount must be greater than 0";
        } else {
          // Calculate discounted price for custom discount
          const discountedObject = getDiscountedPrice(
            parseFloat(itemPrice),
            selectedDiscountType,
            parseFloat(itemDiscount || 0)
          );

          if (discountedObject?.isPriceIncreased) {
            newErrors.customDiscount =
              "Discount must be less than actual price";
          }
        }
      } else if (discountSource === "predefined") {
        if (!selectedPredefinedDiscount) {
          newErrors.predefinedDiscount = "Please select a predefined discount";
        } else if (
          ["BOGO", "BOGOHO"].includes(selectedPredefinedDiscount?.key)
        ) {
          if (bogoItems.length === 0) {
            newErrors.predefinedDiscount =
              selectedPredefinedDiscount?.key === "BOGO"
                ? "Please select BOGO items"
                : "Please select BOGOHO items";
          }
        }
      }
    } else {
      newErrors.customDiscount = ""; // Clear discount error if toggle is off
      newErrors.predefinedDiscount = ""; // Clear predefined discount error if toggle is off
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return !Object.values(newErrors).some((error) => error !== "");
  };

  // validation function for details tab
  const validateDetails = () => {
    const newErrors = {
      qtMin: addValidateMinQt(minQt, maxQt),
      qtMax: addValidateMaxQt(maxQt, minQt),
      prepTime: addValidatePrepTime(prepTime),
    };
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return !Object.values(newErrors).some((error) => error !== "");
  };

  // Handle Next or Save button click
  const handleNextOrSave = async () => {
    if (activeSection === "basic") {
      if (validateBasicInfo()) {
        setActiveSection("pricing");
      }
      return;
    }
    if (activeSection === "pricing") {
      if (validatePricing()) {
        setActiveSection("details");
      }
      return;
    }
    if (activeSection === "details") {
      if (validateDetails()) {
        if (!validateBasicInfo()) {
          setActiveSection("basic");
          return;
        }
        if (!validatePricing()) {
          setActiveSection("pricing");
          return;
        }
        await saveMenuAPI();
      }
      return;
    }
  };

  // Transform API data to component state
  const transformApiDataToState = (item) => {
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
    setDiscountEnabled(item.hasDiscount || false);
    setDiscountSource(`${item.discountMode.toLowerCase()}` || "custom");
    setNewDishItemEnabled(item?.newDish || false);
    setSelectedMeat(item.meatId || "");
    setMeatWellness(item.meatWellness || "");
    setMinQt(minQtString);
    setMaxQt(maxQtString);
    setPrepTime(prepTimeString);
    setSelectedPhotos(transformedPhotos);
    setCustomization(item.allowCustomize || false);
    setHasFlavors(canUseFlavors ? item.hasFlavors || false : false);
	    const itemFlavors =
	      Array.isArray(item.flavors) && item.flavors.length > 0
	        ? item.flavors
	        : ["Plain"];
	    const itemFlavorOptions =
	      Array.isArray(item.flavorOptions) && item.flavorOptions.length > 0
	        ? item.flavorOptions
	        : itemFlavors.map((name) => ({ name, hasCost: false, cost: 0 }));
    const orderedFlavorOptions = [
      { name: "Plain", hasCost: false, cost: 0 },
      ...itemFlavorOptions.filter((option) => option?.name !== "Plain"),
    ].slice(0, 15);
	    const nextFlavorCount = Math.min(Math.max(orderedFlavorOptions.length, 1), 15);
	    setFlavorCount(nextFlavorCount);
	    setFlavors(orderedFlavorOptions.map((option) => option.name));
	    setHasFlavorCosts(orderedFlavorOptions.some((option) => option.hasCost));
	    setFlavorCostEnabled(
	      orderedFlavorOptions.map((option) => !!option.hasCost)
	    );
	    setFlavorCosts(
	      orderedFlavorOptions.map((option) => `${option.cost || 0}`)
	    );
	    setFlavorsPerOrder(
	      Math.min(Math.max(item.flavorsPerOrder || 1, 1), nextFlavorCount, 5)
	    );
    const itemToppings =
      Array.isArray(item.toppings) && item.toppings.length > 0
        ? item.toppings
        : ["Plain"];
	    const itemToppingOptions =
	      Array.isArray(item.toppingOptions) && item.toppingOptions.length > 0
	        ? item.toppingOptions
	        : itemToppings.map((name) => ({ name, hasCost: false, cost: 0 }));
    const orderedToppingOptions = [
      { name: "Plain", hasCost: false, cost: 0 },
      ...itemToppingOptions.filter((option) => option?.name !== "Plain"),
    ].slice(0, 15);
	    const nextToppingCount = Math.min(Math.max(orderedToppingOptions.length, 1), 15);
	    setHasToppings(item.hasToppings || false);
	    setToppingCount(nextToppingCount);
    setToppings(orderedToppingOptions.map((option) => option.name));
	    setHasToppingCosts(orderedToppingOptions.some((option) => option.hasCost));
	    setToppingCostEnabled(
	      orderedToppingOptions.map((option) => !!option.hasCost)
	    );
	    setToppingCosts(
	      orderedToppingOptions.map((option) => `${option.cost || 0}`)
	    );
	    setToppingsPerOrder(
	      Math.min(Math.max(item.toppingsPerOrder || 1, 1), nextToppingCount)
	    );
    setSelectedDiet(item.diet.map((diet) => diet._id));

    if (item.discountMode === "PREDEFINED") {
      setSelectedPredefinedDiscount(item.predefinedDiscount || null);
      if (["BOGO", "BOGOHO"].includes(item.predefinedDiscount?.key)) {
        let sameItemFound = false;
        const temp_data = item.bogoItems.map((obj) => {
          if (obj.isSameItem) {
            sameItemFound = true;
            return {
              _id: "SAME_ITEM",
              name: "Same Item",
              isSameItem: true,
              imgUrls: [],
              price: item.strikePrice || item.price,
            };
          }
          return obj.itemId;
        });
        setBogoItems(temp_data || []);
        setIsSameItemForBogo(sameItemFound);

        // Load discount rules
        if (item.discountRules) {
          setBuyQty(item.discountRules.buyQty?.toString() || "1");
          setGetQty(item.discountRules.getQty?.toString() || "1");
          setDiscountRuleVal(item.discountRules.discount?.toString() || "0");
        }
      }
    } else if (item.discountMode === "CUSTOM") {
      setSelectedDiscountType(item.discountType || "FIXED");
      setItemDiscount(discountString || "0");
    }

    // Set combo items if food type is combo
    if (item.itemType === foodTypeStrings.combo) {
      if (item.subItem && item.subItem.length > 0) {
        setComboItems(item.subItem.map((item) => item.menuItem) || []);
      } else {
        setComboItems([]);
      }
    } else {
      setComboItems([]);
    }
  };

  // Save menu API call (Edit and Add)
  const saveMenuAPI = async () => {
    // Validate all fields (this part will now only run for the final save after all tabs are validated)
    const newErrors = { ...errors };

    // Variables to store discount information
    let discountedObject = null;
    let discountParams = {};

    // Only validate discount if toggle is enabled
    if (discountEnabled) {
      if (discountSource === "custom") {
        const discountError = addValidateItemDiscount(itemDiscount);
        if (discountError) {
          newErrors.customDiscount = discountError;
        } else if (parseFloat(itemDiscount || 0) <= 0) {
          newErrors.customDiscount = "Discount must be greater than 0";
        } else {
          // Calculate discounted price for custom discount
          discountedObject = getDiscountedPrice(
            parseFloat(itemPrice),
            selectedDiscountType,
            parseFloat(itemDiscount || 0)
          );

          if (discountedObject?.isPriceIncreased) {
            newErrors.customDiscount =
              "Discount must be less than actual price";
          }

          // add params to discountParams for API request payload
          discountParams.discount = parseFloat(itemDiscount || 0);
          discountParams.discountMode = "CUSTOM";
          discountParams.discountType = selectedDiscountType;
          discountParams.strikePrice =
            parseFloat(parseFloat(itemPrice).toFixed(2)) || 0;
          discountParams.price = discountedObject?.afterdiscountprice || 0;
        }
      } else if (discountSource === "predefined") {
        if (!selectedPredefinedDiscount) {
          newErrors.predefinedDiscount = "Please select a predefined discount";
        } else {
          // add params to discountParams for API request payload
          discountParams.discountMode = "PREDEFINED";
          discountParams.discountType = selectedPredefinedDiscount?.key || "";
          discountParams.predefinedDiscountId =
            selectedPredefinedDiscount?._id || "";

          if (
            ["FIXED", "PERCENTAGE"].includes(selectedPredefinedDiscount?.key)
          ) {
            // Calculate discounted price for custom discount
            discountedObject = getDiscountedPrice(
              parseFloat(itemPrice),
              selectedPredefinedDiscount?.key || "",
              parseFloat(selectedPredefinedDiscount?.value || 0)
            );

            // sent value of discount from DD
            discountParams.discount = parseFloat(
              selectedPredefinedDiscount?.value || 0
            );

            // only add this param, when discount is visual
            discountParams.strikePrice =
              parseFloat(parseFloat(itemPrice).toFixed(2)) || 0;
          } else if (
            ["BOGO", "BOGOHO"].includes(selectedPredefinedDiscount?.key)
          ) {
            const parsedBuyQty = parseInt(buyQty, 10) || 1;
            const parsedGetQty = parseInt(getQty, 10) || 1;

            // only add this param, when discount is BOGO/BOGOHO
            // qty on each reward line = getQty (reward items per qualifying set), aligned with discountRules.getQty
            discountParams.bogoItems = [
              {
                itemId:
                  bogoItems?.[0]?._id === "SAME_ITEM"
                    ? null
                    : bogoItems?.[0]?._id || "",
                qty: parsedGetQty,
                isSameItem: bogoItems?.[0]?._id === "SAME_ITEM",
              },
            ];

            // Add discountRules
            discountParams.discountRules = {
              buyQty: parsedBuyQty,
              getQty: parsedGetQty,
              discount: parseFloat(discountRuleVal) || 0,
              repeatable: true,
            };

            // sending "null" value to get original price as "afterdiscountprice"
            discountedObject = getDiscountedPrice(
              parseFloat(itemPrice),
              null,
              null
            );
          } else {
            // BOGOHO discount is straight forward, no need to calculate discounted price
          }

          // this is the discounted price (for BOGO and BOGOHO, it is the same as the original price)
          discountParams.price = discountedObject?.afterdiscountprice || 0;
        }
      }
    } else {
      newErrors.customDiscount = ""; // Clear discount error if toggle is off
      newErrors.predefinedDiscount = ""; // Clear predefined discount error if toggle is off
    }

	    // Validate combo items if food type is combo
	    if (foodType === foodTypeStrings.combo) {
      if (comboItems.length === 0) {
        newErrors.comboItems = "Please select at least one combo item";
      } else {
        newErrors.comboItems = "";
      }
	    } else {
	      newErrors.comboItems = "";
	    }
    newErrors.flavors = validateFlavors();
    newErrors.toppings = validateToppings();

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
        allowCustomize: customization || false,
        categoryId: Params?.category?._id || "",
        description: itemDescription || "",
        hasDiscount: discountEnabled || false,
        itemType: foodType || "",
        maxQty: parseInt(maxQt, 10) || 1,
        minQty: parseInt(minQt, 10) || 1,
        name: itemName || "",
        newDish: canHighlightNewDish ? newDishItemEnabled || false : false,
        preparationTime: parseInt(prepTime || 0, 10) || 0,
        price: parseFloat(parseFloat(itemPrice).toFixed(2)) || 0, // will change after discount check
        ...discountParams,
      };

	      if (canUseFlavors && hasFlavors) {
	        payload.hasFlavors = true;
		        payload.flavors = flavors
		          .slice(0, flavorCount)
		          .map((flavor, index) =>
		            index === 0 ? "Plain" : toTitleCase(flavor)
		          );
		        payload.flavorOptions = payload.flavors.map((name, index) => ({
		          name,
		          hasCost: index > 0 && !!(hasFlavorCosts && flavorCostEnabled[index]),
		          cost:
		            index > 0 && hasFlavorCosts && flavorCostEnabled[index]
		              ? parseFloat(flavorCosts[index] || "0") || 0
		              : 0,
		        }));
	        payload.flavorsPerOrder = Math.min(flavorsPerOrder, flavorCount, 5);
	      } else {
	        payload.hasFlavors = false;
	        payload.flavors = [];
	        payload.flavorOptions = [];
	        payload.flavorsPerOrder = 1;
	      }

	      if (hasToppings) {
	        payload.hasToppings = true;
		        payload.toppings = toppings
		          .slice(0, toppingCount)
	          .map((topping, index) =>
	            index === 0 ? "Plain" : toTitleCase(topping)
	          );
		        payload.toppingOptions = payload.toppings.map((name, index) => ({
		          name,
		          hasCost: index > 0 && !!(hasToppingCosts && toppingCostEnabled[index]),
		          cost:
		            index > 0 && hasToppingCosts && toppingCostEnabled[index]
		              ? parseFloat(toppingCosts[index] || "0") || 0
		              : 0,
		        }));
	        payload.toppingsPerOrder = Math.min(toppingsPerOrder, toppingCount);
	      } else {
	        payload.hasToppings = false;
	        payload.toppings = [];
	        payload.toppingOptions = [];
	        payload.toppingsPerOrder = 1;
	      }

      // manage photos image upload
      const imageResult = [];
      for (const image of selectedPhotos) {
        if (image.old) {
          imageResult.push(image.uri);
        } else {
          const formData = new FormData();
          formData.append("file", {
            uri: image.uri,
            name: image.name,
            type: image.type,
          });
          try {
            const response = await uploadImage_API(formData);
            console.log("Image upload API response => ", response);
            if (response?.success && response?.data)
              imageResult.push(response.data.file);
          } catch (error) {
            console.log("Image upload API error => ", error);
          }
        }
      }
      payload.imgUrls = imageResult;
      // -------------------------

      if (selectedDiet?.length > 0) {
        payload.diet = selectedDiet;
      }

      if (selectedMeat) {
        payload.meatId = selectedMeat;
      }

      if (meatWellness) {
        payload.meatWellness = meatWellness;
      }

      if (foodType === foodTypeStrings.combo) {
        payload.subItem = comboItems.map((item) => ({
          menuItem: item._id || "",
          qty: 1,
        }));
      }

      console.log("Food Item API request payload => ", payload);

      const response =
        Params.type === "edit"
          ? await updateFooditemByID_API({
              payload,
              fooditem_id: Params?.foodItem?._id || "",
            })
          : await addFooditem_API(payload);

      console.log("Add food item API response => ", response);

      if (response?.success && response?.data) {
        dispatch(
          showSnackbar({
            message:
              Params.type === "edit"
                ? "Item has been updated"
                : "New item has been added.",
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

  // Fetch diet list from API
  const getDietListFromAPI = async () => {
    try {
      const response = await getDietList_API();
      console.log("Diet list API response => ", response);
      if (response?.success && response?.data) {
        setDietList(response.data.dietList);
      }
    } catch (error) {
      console.log("Diet list API error => ", error);
    }
  };

  // Fetch menu list from API
  const getMenuListFromAPI = async () => {
    try {
      const response = await getAllFoodItem_API();
      console.log("Menu list API response => ", response);
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
      console.log("Menu list API error => ", error);
    }
  };

  // Fetch meat list from API
  const getMeatListFromAPI = async () => {
    try {
      const response = await getMeatList_API();
      console.log("Meat list API response => ", response);
      if (response?.success && response?.data) {
        setMeatList(response.data.meatList);
      }
    } catch (error) {
      console.log("Meat list API error => ", error);
    }
  };

  // Fetch discount list from API
  const getDiscountListFromAPI = async () => {
    try {
      const response = await getCommonList_API("discount");
      console.log("discount list response => ", response);
      if (response?.success && response?.data) {
        setDiscountList(response.data.listingList || []);
      }
    } catch (error) {
      console.log("discount list error => ", error);
    }
  };

  // Fetch meat wellness list from API
  const getMeatWellnessListFromAPI = async () => {
    try {
      const response = await getCommonList_API("meat_wellness");
      console.log("meat wellness list response => ", response);
      if (response?.success && response?.data) {
        setMeatWellnessList(response.data.listingList || []);
      }
    } catch (error) {
      console.log("meat wellness list error => ", error);
    }
  };

  // Fetch menu item data from API when type is edit
  const getMenuItemDataFromAPI = async () => {
    setDataLoading(true);
    try {
      const fooditem_id = Params?.foodItem?._id;
      const response = await getFoodItemByID_API(fooditem_id);
      console.log("Menu item data API response => ", response);
      if (response?.success && response?.data) {
        transformApiDataToState(response.data.menu);
      }
    } catch (error) {
      console.log("Menu item data API error => ", error);
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

  // Fetch menu item data when type is edit
  useEffect(() => {
    if (Params.type === "edit") {
      getMenuItemDataFromAPI();
    }
  }, [Params]);

  // Fetch initial data when screen mounts
  useEffect(() => {
    getDietListFromAPI();
    getMenuListFromAPI();
    getMeatListFromAPI();
    getDiscountListFromAPI();
    getMeatWellnessListFromAPI();
    if (Params.type === "add") {
      setTimeout(() => {
        setDataLoading(false);
      }, 1000);
    }
  }, []);

  // Auto-enable customization when meat wellness is selected "Customer Choice"
  useEffect(() => {
    if (meatWellness === "Customer Choice") {
      setCustomization(true);
    }
  }, [meatWellness]);

  // Clear discount errors when discount source changes
  useEffect(() => {
    setErrors((prev) => ({
      ...prev,
      customDiscount: "",
      predefinedDiscount: "",
    }));
  }, [discountSource]);

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

      {dataLoading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingBottom: insets.bottom,
          }}
        >
          <NativeIndicator size="large" color={AppColor.primary} />
        </View>
      ) : (
        <>
          <View style={{ backgroundColor: AppColor.white }}>
            <Text style={styles.sectionTitle}>
              {Params.type === "edit"
                ? "Update Food Item"
                : "Add New Food Item"}
            </Text>

            {/* Toggle Buttons */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  activeSection === "basic" && styles.toggleButtonActive,
                ]}
                onPress={() => setActiveSection("basic")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    activeSection === "basic" && styles.toggleButtonTextActive,
                  ]}
                >
                  Basic Info
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  activeSection === "pricing" && styles.toggleButtonActive,
                ]}
                onPress={() => setActiveSection("pricing")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    activeSection === "pricing" &&
                      styles.toggleButtonTextActive,
                  ]}
                >
                  Pricing
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  activeSection === "details" && styles.toggleButtonActive,
                ]}
                onPress={() => setActiveSection("details")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    activeSection === "details" &&
                      styles.toggleButtonTextActive,
                  ]}
                >
                  Details
                </Text>
              </TouchableOpacity>
            </View>
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
              <View style={{ flex: 1, paddingBottom: insets.bottom }}>
                <View style={styles.contentContainer}>
                  {/* BASIC INFO SECTION */}
                  {activeSection === "basic" && (
                    <View
                      style={{
                        flex: 1,
                        paddingBottom: 16,
                        borderRadius: 8,
                        backgroundColor: AppColor.white,
                      }}
                    >
                      {/* Dish/Item Name */}
                      <View style={styles.section}>
                        <Text style={styles.inputLabel}>
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
                          <Text
                            style={[styles.inputLabel, { marginBottom: 0 }]}
                          >
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

                      {/* Description / Cuisine*/}
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

                        {canUseFlavors ? (
                          <View style={styles.flavorPanel}>
                            <View style={styles.switchRow}>
                              <Text
                                numberOfLines={1}
                                style={[styles.inputLabel, { marginBottom: 0 }]}
                              >
                                {"Flavors"}
                              </Text>
                              <Switch
                                color={AppColor.primary}
                                value={hasFlavors}
                                onValueChange={(value) => {
                                  setHasFlavors(value);
                                  if (!value) {
                                    setErrors((prev) => ({
                                      ...prev,
                                      flavors: "",
                                    }));
                                  }
                                }}
                              />
                            </View>
                            <Text style={styles.optionChargeHelpText}>
                              Use toggle button to charge extra for flavors/toppings
                            </Text>

                            {hasFlavors ? (
                              <View style={{ marginTop: 12, gap: 12 }}>
                                <View style={styles.flavorPickerRow}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>
                                      {"How many flavors"}
                                    </Text>
                                    <Dropdown
                                      data={flavorCountOptions}
                                      labelField="label"
                                      valueField="value"
                                      value={flavorCount}
                                      onChange={handleFlavorCountChange}
                                      placeholder="Select"
                                      style={styles.dropdown}
                                      containerStyle={styles.dropdownContainer}
                                      placeholderStyle={styles.dropdownPlaceholder}
                                      itemTextStyle={{ fontFamily: Mulish400 }}
                                      selectedTextStyle={{ fontFamily: Mulish400 }}
                                    />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>
                                      {"Max # of Flavors per Order"}
                                    </Text>
                                    <Dropdown
                                      data={flavorsPerOrderOptions.filter(
                                        (option) => option.value <= flavorCount
                                      )}
                                      labelField="label"
                                      valueField="value"
                                      value={flavorsPerOrder}
                                      onChange={(selected) =>
                                        setFlavorsPerOrder(selected.value)
                                      }
                                      placeholder="Select"
                                      style={styles.dropdown}
                                      containerStyle={styles.dropdownContainer}
                                      placeholderStyle={styles.dropdownPlaceholder}
                                      itemTextStyle={{ fontFamily: Mulish400 }}
                                      selectedTextStyle={{ fontFamily: Mulish400 }}
                                    />
                                  </View>
                                </View>

	                                {flavors.slice(0, flavorCount).map((flavor, index) => (
	                                  <View key={`flavor-${index}`} style={styles.optionCostRow}>
	                                    <TextInput
	                                      dense
	                                      value={index === 0 ? "Plain" : flavor}
	                                      onChangeText={(text) =>
	                                        handleFlavorNameChange(text, index)
	                                      }
	                                      style={[styles.input, { flex: 1 }]}
	                                      contentStyle={styles.inputText}
	                                      placeholder={`Flavor ${index + 1}`}
	                                      placeholderTextColor={
	                                        AppColor.placeholderTextColor
	                                      }
	                                      mode="outlined"
	                                      disabled={index === 0}
	                                      error={!!errors.flavors && index > 0}
	                                      outlineColor={AppColor.border}
	                                      activeOutlineColor={AppColor.primary}
	                                      outlineStyle={{ borderRadius: 8 }}
	                                      autoCapitalize="words"
	                                      theme={{
	                                        colors: { onSurfaceVariant: "#777" },
	                                      }}
	                                    />
	                                    {hasFlavorCosts ? (
	                                      <>
	                                        <Switch
	                                          color={AppColor.primary}
		                                          value={
		                                            index > 0 && !!flavorCostEnabled[index]
		                                          }
		                                          disabled={index === 0}
	                                          onValueChange={() =>
	                                            handleOptionCostToggle(
	                                              setFlavorCostEnabled,
	                                              index
	                                            )
	                                          }
	                                        />
	                                        {flavorCostEnabled[index] ? (
	                                          <TextInput
	                                            dense
	                                            value={flavorCosts[index] || ""}
	                                            onChangeText={(text) =>
	                                              handleOptionCostChange(
	                                                setFlavorCosts,
	                                                text,
	                                                index
	                                              )
	                                            }
	                                            style={[styles.input, styles.optionCostInput]}
	                                            contentStyle={styles.inputText}
	                                            placeholder="Cost"
	                                            mode="outlined"
	                                            keyboardType="decimal-pad"
	                                            outlineColor={AppColor.border}
	                                            activeOutlineColor={AppColor.primary}
	                                            outlineStyle={{ borderRadius: 8 }}
	                                          />
	                                        ) : null}
	                                      </>
	                                    ) : null}
	                                  </View>
	                                ))}

	                                <View style={styles.switchRow}>
	                                  <Text style={[styles.inputLabel, { marginBottom: 0 }]}>
	                                    {"Additional cost"}
	                                  </Text>
	                                  <Switch
	                                    color={AppColor.primary}
	                                    value={hasFlavorCosts}
	                                    onValueChange={setHasFlavorCosts}
	                                  />
	                                </View>

                                {!!errors.flavors && (
                                  <HelperText
                                    type="error"
                                    visible={!!errors.flavors}
                                    style={styles.helper}
                                  >
                                    {errors.flavors}
                                  </HelperText>
                                )}
	                          </View>
	                        ) : null}

	                        <View style={styles.flavorPanel}>
	                          <View style={styles.switchRow}>
	                            <Text
	                              numberOfLines={1}
	                              style={[styles.inputLabel, { marginBottom: 0 }]}
	                            >
	                              {"Toppings"}
	                            </Text>
	                            <Switch
	                              color={AppColor.primary}
	                              value={hasToppings}
	                              onValueChange={(value) => {
	                                setHasToppings(value);
	                                if (!value) {
	                                  setErrors((prev) => ({
	                                    ...prev,
	                                    toppings: "",
	                                  }));
	                                }
	                              }}
	                            />
	                          </View>
	                          <Text style={styles.optionChargeHelpText}>
	                            Use toggle button to charge extra for flavors/toppings
	                          </Text>

	                          {hasToppings ? (
	                            <View style={{ marginTop: 12, gap: 12 }}>
	                              <View style={styles.flavorPickerRow}>
	                                <View style={{ flex: 1 }}>
	                                  <Text style={styles.inputLabel}>
	                                    {"How many toppings"}
	                                  </Text>
	                                  <Dropdown
	                                    data={flavorCountOptions}
	                                    labelField="label"
	                                    valueField="value"
	                                    value={toppingCount}
	                                    onChange={handleToppingCountChange}
	                                    placeholder="Select"
	                                    style={styles.dropdown}
	                                    containerStyle={styles.dropdownContainer}
	                                    placeholderStyle={styles.dropdownPlaceholder}
	                                    itemTextStyle={{ fontFamily: Mulish400 }}
	                                    selectedTextStyle={{ fontFamily: Mulish400 }}
	                                  />
	                                </View>
	                                <View style={{ flex: 1 }}>
	                                  <Text style={styles.inputLabel}>
		                                    {"Max # of Toppings per Order"}
	                                  </Text>
	                                  <Dropdown
	                                    data={flavorCountOptions.filter(
	                                      (option) => option.value <= toppingCount
	                                    )}
	                                    labelField="label"
	                                    valueField="value"
	                                    value={toppingsPerOrder}
	                                    onChange={(selected) =>
	                                      setToppingsPerOrder(selected.value)
	                                    }
	                                    placeholder="Select"
	                                    style={styles.dropdown}
	                                    containerStyle={styles.dropdownContainer}
	                                    placeholderStyle={styles.dropdownPlaceholder}
	                                    itemTextStyle={{ fontFamily: Mulish400 }}
	                                    selectedTextStyle={{ fontFamily: Mulish400 }}
	                                  />
	                                </View>
	                              </View>

	                              {toppings.slice(0, toppingCount).map((topping, index) => (
	                                <View key={`topping-${index}`} style={styles.optionCostRow}>
	                                  <TextInput
	                                    dense
		                                    value={index === 0 ? "Plain" : topping}
	                                    onChangeText={(text) =>
	                                      handleToppingNameChange(text, index)
	                                    }
	                                    style={[styles.input, { flex: 1 }]}
	                                    contentStyle={styles.inputText}
	                                    placeholder={`Topping ${index + 1}`}
	                                    placeholderTextColor={
	                                      AppColor.placeholderTextColor
	                                    }
	                                    mode="outlined"
		                                    disabled={index === 0}
		                                    error={!!errors.toppings && index > 0}
	                                    outlineColor={AppColor.border}
	                                    activeOutlineColor={AppColor.primary}
	                                    outlineStyle={{ borderRadius: 8 }}
	                                    autoCapitalize="words"
	                                  />
	                                  {hasToppingCosts ? (
	                                    <>
	                                      <Switch
	                                        color={AppColor.primary}
		                                        value={
		                                          index > 0 && !!toppingCostEnabled[index]
		                                        }
		                                        disabled={index === 0}
	                                        onValueChange={() =>
	                                          handleOptionCostToggle(
	                                            setToppingCostEnabled,
	                                            index
	                                          )
	                                        }
	                                      />
	                                      {toppingCostEnabled[index] ? (
	                                        <TextInput
	                                          dense
	                                          value={toppingCosts[index] || ""}
	                                          onChangeText={(text) =>
	                                            handleOptionCostChange(
	                                              setToppingCosts,
	                                              text,
	                                              index
	                                            )
	                                          }
	                                          style={[styles.input, styles.optionCostInput]}
	                                          contentStyle={styles.inputText}
	                                          placeholder="Cost"
	                                          mode="outlined"
	                                          keyboardType="decimal-pad"
	                                          outlineColor={AppColor.border}
	                                          activeOutlineColor={AppColor.primary}
	                                          outlineStyle={{ borderRadius: 8 }}
	                                        />
	                                      ) : null}
	                                    </>
	                                  ) : null}
	                                </View>
	                              ))}

	                              <View style={styles.switchRow}>
	                                <Text style={[styles.inputLabel, { marginBottom: 0 }]}>
	                                  {"Additional cost"}
	                                </Text>
	                                <Switch
	                                  color={AppColor.primary}
	                                  value={hasToppingCosts}
	                                  onValueChange={setHasToppingCosts}
	                                />
	                              </View>

	                              {!!errors.toppings && (
	                                <HelperText
	                                  type="error"
	                                  visible={!!errors.toppings}
	                                  style={styles.helper}
	                                >
	                                  {errors.toppings}
	                                </HelperText>
	                              )}
	                            </View>
	                          ) : null}
	                        </View>
		                      </View>
                        ) : null}
	                      </View>

                      {/* Diet Preferences */}
                      <View style={styles.section}>
                        <Text style={styles.inputLabel}>
                          {"Diet Preferences"}
                        </Text>
                        <MultiSelect
                          mode="modal"
                          inside={false}
                          data={dietList}
                          labelField="name"
                          valueField="_id"
                          value={selectedDiet}
                          onChange={(selected) => setSelectedDiet(selected)}
                          placeholder="Select Diet"
                          style={styles.dropdown}
                          containerStyle={styles.dropdownContainer}
                          placeholderStyle={styles.dropdownPlaceholder}
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
                      <View
                        style={[
                          styles.section,
                          { opacity: isMeatDisable ? 0.4 : 1 },
                        ]}
                        pointerEvents={isMeatDisable ? "none" : "auto"}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 8,
                          }}
                        >
                          <Text
                            style={[styles.inputLabel, { marginBottom: 0 }]}
                          >
                            {"Meat"}
                          </Text>
                          {selectedMeat ? (
                            <Pressable
                              hitSlop={5}
                              activeOpacity={0.7}
                              onPress={() => setSelectedMeat("")}
                            >
                              <Text style={{ color: AppColor.textHighlighter }}>
                                {"Clear"}
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                        <Dropdown
                          data={meatList}
                          mode="modal"
                          labelField="name"
                          valueField="_id"
                          value={selectedMeat}
                          onChange={(selected) => setSelectedMeat(selected._id)}
                          placeholder="Select Meat"
                          style={styles.dropdown}
                          containerStyle={styles.dropdownContainer}
                          placeholderStyle={styles.dropdownPlaceholder}
                          itemTextStyle={{ fontFamily: Mulish400 }}
                          selectedTextStyle={{ fontFamily: Mulish400 }}
                        />
                      </View>

                      {/* Meat Wellness */}
                      <View
                        style={[
                          styles.section,
                          { opacity: isMeatWellnessDisable ? 0.4 : 1 },
                        ]}
                        pointerEvents={isMeatWellnessDisable ? "none" : "auto"}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 8,
                          }}
                        >
                          <Text
                            style={[styles.inputLabel, { marginBottom: 0 }]}
                          >
                            {"Meat Wellness"}
                          </Text>
                          {meatWellness ? (
                            <Pressable
                              hitSlop={5}
                              activeOpacity={0.7}
                              onPress={() => setMeatWellness("")}
                            >
                              <Text style={{ color: AppColor.textHighlighter }}>
                                {"Clear"}
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                        <Dropdown
                          data={meatWellnessList}
                          mode="modal"
                          labelField="name"
                          valueField="name"
                          value={meatWellness}
                          onChange={(selected) =>
                            setMeatWellness(selected.name)
                          }
                          placeholder="Select Meat Wellness"
                          style={styles.dropdown}
                          containerStyle={styles.dropdownContainer}
                          placeholderStyle={styles.dropdownPlaceholder}
                          itemTextStyle={{ fontFamily: Mulish400 }}
                          selectedTextStyle={{ fontFamily: Mulish400 }}
                        />
                      </View>
                    </View>
                  )}

                  {/* PRICING SECTION */}
                  {activeSection === "pricing" && (
                    <>
                      {/* Price Textinput */}
                      <View
                        style={{
                          paddingVertical: 16,
                          borderRadius: 8,
                          backgroundColor: AppColor.white,
                          paddingHorizontal: 16,
                        }}
                      >
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
                      <View
                        style={[
                          styles.section,
                          {
                            paddingVertical: 16,
                            borderRadius: 8,
                            backgroundColor: AppColor.white,
                          },
                        ]}
                      >
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
                              onValueChange={(value) =>
                                setDiscountEnabled(value)
                              }
                            />
                          </View>
                        </View>

                        {discountEnabled ? (
                          <>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 8,
                                paddingVertical: 8,
                              }}
                            >
                              <TouchableOpacity
                                activeOpacity={0.7}
                                style={{
                                  flex: 1,
                                  paddingVertical: 8,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: 4,
                                  backgroundColor:
                                    discountSource === "custom"
                                      ? AppColor.primary
                                      : "#E5E5EA",
                                }}
                                onPress={() => setDiscountSource("custom")}
                              >
                                <Text
                                  style={{
                                    fontFamily: Mulish600,
                                    fontSize: 14,
                                    color:
                                      discountSource === "custom"
                                        ? AppColor.white
                                        : AppColor.text,
                                  }}
                                >
                                  Custom
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                activeOpacity={0.7}
                                style={{
                                  flex: 1,
                                  paddingVertical: 8,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: 4,
                                  backgroundColor:
                                    discountSource === "predefined"
                                      ? AppColor.primary
                                      : "#E5E5EA",
                                }}
                                onPress={() => setDiscountSource("predefined")}
                              >
                                <Text
                                  style={{
                                    fontFamily: Mulish600,
                                    fontSize: 14,
                                    color:
                                      discountSource === "predefined"
                                        ? AppColor.white
                                        : AppColor.text,
                                  }}
                                >
                                  Predefined
                                </Text>
                              </TouchableOpacity>
                            </View>

                            {/* Custom Discount Fields */}
                            {discountSource === "custom" && (
                              <>
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
                                        height: 48,
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
                                        height: 48,
                                        paddingHorizontal: 12,
                                        paddingVertical: 14,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        marginBottom: 5,
                                      }}
                                      containerStyle={{ width: width - 66 }}
                                      placeholderStyle={[
                                        styles.dropdownPlaceholder,
                                        { position: "absolute" },
                                      ]}
                                      itemTextStyle={{ fontFamily: Mulish400 }}
                                      selectedTextStyle={{
                                        fontFamily: Mulish400,
                                      }}
                                      renderItem={(item) => (
                                        <View
                                          style={{
                                            flex: 1,
                                            height: 48,
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
                                      height: 48,
                                      fontSize: 15,
                                      fontFamily: Mulish400,
                                      backgroundColor: AppColor.white,
                                      paddingHorizontal: 16,
                                      paddingVertical: 10,
                                      borderRadius: 8,
                                    }}
                                    placeholder={
                                      selectedDiscountType === "FIXED"
                                        ? "0.00"
                                        : "0%"
                                    }
                                    placeholderTextColor={
                                      AppColor.placeholderTextColor
                                    }
                                    keyboardType="number-pad"
                                  />
                                </View>

                                {!!errors.customDiscount && (
                                  <HelperText
                                    type="error"
                                    visible={!!errors.customDiscount}
                                    style={styles.helper}
                                  >
                                    {errors.customDiscount}
                                  </HelperText>
                                )}
                              </>
                            )}

                            {/* Predefined Discount Dropdown */}
                            {discountSource === "predefined" && (
                              <>
                                {selectedPredefinedDiscount ? (
                                  <Pressable
                                    hitSlop={5}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                      setSelectedPredefinedDiscount(null);
                                      setErrors((prev) => ({
                                        ...prev,
                                        predefinedDiscount: "",
                                      }));
                                      setBogoItems([]);
                                    }}
                                    style={{
                                      alignSelf: "flex-end",
                                      paddingBottom: 8,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        color: AppColor.textHighlighter,
                                      }}
                                    >
                                      {"Clear"}
                                    </Text>
                                  </Pressable>
                                ) : null}
                                <Dropdown
                                  data={discountList}
                                  mode="modal"
                                  labelField="name"
                                  valueField="_id"
                                  value={
                                    selectedPredefinedDiscount?._id || null
                                  }
                                  onChange={(item) => {
                                    setSelectedPredefinedDiscount(item);
                                    setErrors((prev) => ({
                                      ...prev,
                                      predefinedDiscount: "",
                                    }));
                                    // Set default rules for BOGO/BOGOHO
                                    if (item.key === "BOGO") {
                                      setBuyQty("1");
                                      setGetQty("1");
                                      setDiscountRuleVal("1.0");
                                    } else if (item.key === "BOGOHO") {
                                      setBuyQty("1");
                                      setGetQty("1");
                                      setDiscountRuleVal("0.5");
                                    }
                                    // Reset BOGO item when changing discount
                                    if (
                                      !["BOGO", "BOGOHO"].includes(item.key)
                                    ) {
                                      setBogoItems([]);
                                      setIsSameItemForBogo(false);
                                    }
                                  }}
                                  placeholder="Select a predefined discount"
                                  style={[styles.dropdown, { marginBottom: 0 }]}
                                  containerStyle={styles.dropdownContainer}
                                  placeholderStyle={styles.dropdownPlaceholder}
                                  itemTextStyle={{ fontFamily: Mulish400 }}
                                  selectedTextStyle={{ fontFamily: Mulish400 }}
                                />
                                {!!errors.predefinedDiscount && (
                                  <HelperText
                                    type="error"
                                    visible={!!errors.predefinedDiscount}
                                    style={styles.helper}
                                  >
                                    {errors.predefinedDiscount}
                                  </HelperText>
                                )}

                                {["BOGO", "BOGOHO"].includes(
                                  selectedPredefinedDiscount?.key
                                ) ? (
                                  <>
                                    <View
                                      style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        paddingVertical: 12,
                                        borderBottomWidth: 1,
                                        borderBottomColor: AppColor.border,
                                        marginBottom: 12,
                                      }}
                                    >
                                      <Text style={styles.inputLabel}>
                                        {"Same item for free/reward"}
                                      </Text>
                                      <Switch
                                        color={AppColor.primary}
                                        value={isSameItemForBogo}
                                        onValueChange={handleBogoSameItemToggle}
                                      />
                                    </View>

                                    {!isSameItemForBogo && (
                                      <TouchableOpacity
                                        style={styles.bogoToggleContainer}
                                        onPress={openBogoSheet}
                                        activeOpacity={0.7}
                                      >
                                        <AntDesign
                                          name={"pluscircleo"}
                                          size={20}
                                          color={AppColor.primary}
                                        />
                                        <Text style={styles.bogoToggleText}>
                                          {`Add Item for ${selectedPredefinedDiscount?.key}`}
                                        </Text>
                                      </TouchableOpacity>
                                    )}

                                    {/* Discount Rules Configuration */}
                                    <View style={{ marginTop: 16, gap: 12 }}>
                                      <Text style={styles.inputLabel}>
                                        Configure Discount
                                      </Text>
                                      <View style={{ flexDirection: "row", gap: 12 }}>
                                        <View style={{ flex: 1 }}>
                                          <Text style={{ fontSize: 12, color: AppColor.textGray, marginBottom: 4 }}>Buy Qty</Text>
                                          <NativeTextInput
                                            value={buyQty}
                                            onChangeText={setBuyQty}
                                            keyboardType="number-pad"
                                            style={styles.ruleInput}
                                          />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                          <Text style={{ fontSize: 12, color: AppColor.textGray, marginBottom: 4 }}>Get Qty</Text>
                                          <NativeTextInput
                                            value={getQty}
                                            onChangeText={setGetQty}
                                            keyboardType="number-pad"
                                            style={styles.ruleInput}
                                          />
                                        </View>                                        
                                      </View>
                                    </View>

                                    {/* Display BOGO/BOGOHO Items if available */}
                                    {bogoItems.length > 0 && (
                                      <View style={styles.bogoItemsContainer}>
                                        <FlatList
                                          data={bogoItems}
                                          keyExtractor={(item) => item._id}
                                          renderItem={({ item, index }) => (
                                            <View style={styles.bogoItemCard}>
                                              {item._id === "SAME_ITEM" ? (
                                                <View
                                                  style={[
                                                    styles.bogoItemImage,
                                                    {
                                                      backgroundColor:
                                                        AppColor.primary + "20",
                                                      justifyContent: "center",
                                                      alignItems: "center",
                                                    },
                                                  ]}
                                                >
                                                  <AntDesign
                                                    name="sync"
                                                    size={24}
                                                    color={AppColor.primary}
                                                  />
                                                </View>
                                              ) : (
                                                <AppImage
                                                  uri={item.imgUrls?.[0]}
                                                  containerStyle={
                                                    styles.bogoItemImage
                                                  }
                                                />
                                              )}
                                              <View style={{ flex: 1, gap: 8 }}>
                                                <Text
                                                  style={styles.bogoItemName}
                                                  numberOfLines={1}
                                                >
                                                  {item.name}
                                                </Text>
                                                {item._id !== "SAME_ITEM" && (
                                                  <Text
                                                    style={styles.bogoItemPrice}
                                                  >
                                                    $
                                                    {parseFloat(
                                                      item.price
                                                    ).toFixed(2)}
                                                  </Text>
                                                )}
                                              </View>
                                              <IconButton
                                                icon="close-circle"
                                                iconColor={AppColor.error}
                                                size={20}
                                                onPress={() =>
                                                  onBogoItemRemovePress(index)
                                                }
                                                style={
                                                  styles.removeBogoItemIcon
                                                }
                                              />
                                            </View>
                                          )}
                                        />
                                      </View>
                                    )}
                                  </>
                                ) : null}
                              </>
                            )}
                          </>
                        ) : null}
                      </View>

                      {/* other toggles */}
                      <View
                        style={[
                          styles.section,
                          {
                            gap: 16,
                            paddingVertical: 16,
                            borderRadius: 8,
                            backgroundColor: AppColor.white,
                          },
                        ]}
                      >
                        {/* Customisation Container */}
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
                              onValueChange={(value) => {
                                // Only allow toggling if meat wellness is not Customer Choice
                                if (meatWellness !== "Customer Choice") {
                                  setCustomization(value);
                                }
                              }}
                              disabled={meatWellness === "Customer Choice"}
                            />
                          </View>
                        </View>

                        {/* New Item Container */}
                        {canHighlightNewDish ? (
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
                                onValueChange={(value) =>
                                  setNewDishItemEnabled(value)
                                }
                              />
                            </View>
                          </View>
                        ) : null}
                      </View>
                    </>
                  )}

                  {/* DETAILS SECTION */}
                  {activeSection === "details" && (
                    <View
                      style={{
                        borderRadius: 8,
                        paddingBottom: 16,
                        backgroundColor: AppColor.white,
                      }}
                    >
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
                          style={[
                            styles.section,
                            { flex: 1 / 2, paddingRight: 0 },
                          ]}
                        >
                          <Text style={styles.inputLabel}>
                            {"Min Order Qty *"}
                          </Text>
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
                        <View
                          style={[
                            styles.section,
                            { flex: 1 / 2, paddingLeft: 0 },
                          ]}
                        >
                          <Text style={styles.inputLabel}>
                            {"Max Order Qty *"}
                          </Text>
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
                      {foodType === foodTypeStrings.combo ? (
                        <View style={styles.section}>
                          <Text style={[styles.inputLabel, { marginTop: 10 }]}>
                            {"Combo Details *"}
                          </Text>

                          {/* Display Combo Items if available */}
                          {comboItems.length > 0 && (
                            <View style={styles.bogoItemsContainer}>
                              <FlatList
                                data={comboItems}
                                keyExtractor={(item) => item._id}
                                renderItem={({ item, index }) => (
                                  <View style={styles.bogoItemCard}>
                                    <AppImage
                                      uri={item.imgUrls?.[0]}
                                      containerStyle={styles.bogoItemImage}
                                    />
                                    <View style={{ flex: 1, gap: 8 }}>
                                      <Text
                                        style={styles.bogoItemName}
                                        numberOfLines={1}
                                      >
                                        {item.name}
                                      </Text>
                                      <Text style={styles.bogoItemPrice}>
                                        ${parseFloat(item.price).toFixed(2)}
                                      </Text>
                                    </View>
                                    <IconButton
                                      icon="close-circle"
                                      iconColor={AppColor.error}
                                      size={20}
                                      onPress={() =>
                                        onComboItemRemovePress(index)
                                      }
                                      style={styles.removeBogoItemIcon}
                                    />
                                  </View>
                                )}
                              />
                            </View>
                          )}

                          <TouchableOpacity
                            style={[
                              styles.bogoToggleContainer,
                              { marginTop: comboItems.length > 0 ? 10 : 0 },
                            ]}
                            onPress={openComboSheet}
                            activeOpacity={0.7}
                          >
                            <AntDesign
                              name={"pluscircleo"}
                              size={20}
                              color={AppColor.primary}
                            />
	                            <Text style={styles.bogoToggleText}>
	                              {`Add Item for Combo Sides`}
	                            </Text>
	                          </TouchableOpacity>

		                          {!!errors.comboItems && (
		                            <HelperText
	                              type="error"
                              visible={!!errors.comboItems}
                              style={styles.helper}
                            >
                              {errors.comboItems}
                            </HelperText>
                          )}
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>

                {/* save btn */}
                <View style={styles.section}>
                  <TouchableOpacity
                    onPress={handleNextOrSave}
                    activeOpacity={0.7}
                    disabled={loading}
                    style={styles.saveButton}
                  >
                    {loading ? (
                      <ActivityIndicator color={AppColor.white} />
                    ) : (
                      <Text style={styles.buttonLabel}>
                        {activeSection === "details" ? "Save" : "Next"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </>
      )}

      {/* BOGO/BOGOHO Items Action Sheet */}
      <BogoItemsActionSheet
        limit={1}
        actionSheetRef={bogoActionSheetRef}
        selectedMenus={bogoItems}
        menuList={memoizedMenuList}
        onSelectionChange={handleBogoItemsChange}
        onClose={() => console.log("BOGO/BOGOHO items sheet closed")}
      />

      {/* Combo Items Action Sheet */}
      <ComboItemsActionSheet
        actionSheetRef={comboActionSheetRef}
        selectedMenus={comboItems}
        menuList={memoizedMenuList}
        onSelectionChange={handleComboItemsChange}
        onClose={() => console.log("Combo items sheet closed")}
      />

      {/* Media Picker Modal */}
      <MediaPickerDialog
        isVisible={modalVisible}
        onCameraPress={() => handleCameraPress()}
        onGalleryPress={() => handleGalleryPress()}
        onClosePress={onMediaModalClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // BOGO Items styles
  bogoItemsContainer: {},
  bogoItemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  bogoItemImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  bogoItemName: {
    fontFamily: Mulish600,
    fontSize: 14,
    color: AppColor.black,
  },
  bogoItemPrice: {
    fontFamily: Mulish700,
    fontSize: 14,
    color: AppColor.textHighlighter,
  },
  ruleInput: {
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    fontFamily: Mulish400,
    color: AppColor.text,
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

  // toggle buttons
  toggleContainer: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: "#E5E5EA",
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: AppColor.primary,
    backgroundColor: AppColor.white,
  },
  toggleButtonActive: {
    backgroundColor: AppColor.primary,
  },
  toggleButtonText: {
    fontSize: 14,
    fontFamily: Mulish600,
    color: AppColor.primary,
  },
  toggleButtonTextActive: {
    color: AppColor.white,
  },

  // content
  contentContainer: {
    flex: 1,
    margin: 16,
  },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: {
    padding: 16,
    fontSize: 20,
    fontFamily: Mulish700,
    color: AppColor.text,
  },
  label: {
    fontSize: 18,
    fontFamily: Mulish400,
    color: AppColor.black,
    marginBottom: 8,
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
  thumbnail: {
    width: 80,
    height: 80,
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
  helper: {
    marginBottom: 8,
    paddingLeft: 0,
    paddingTop: 0,
    fontFamily: Mulish400,
  },
  flavorPanel: {
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    backgroundColor: AppColor.white,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  flavorPickerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  optionChargeHelpText: {
    marginTop: 4,
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 12,
    lineHeight: 17,
  },
  optionCostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionCostInput: {
    width: 88,
  },

  // save button container
  saveButton: {
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
  dropdownContainer: {
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: AppColor.border,
  },
  dropdownPlaceholder: {
    fontFamily: Mulish400,
    color: AppColor.textHighlighter,
  },
  bogoToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderRadius: 8,
    backgroundColor: AppColor.lightGray,
    marginTop: 10,
  },
  bogoToggleText: {
    fontFamily: Mulish600,
    fontSize: 16,
    color: AppColor.black,
    marginLeft: 10,
  },
});
