import React, { useState, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import PropTypes from "prop-types";
import { AppColor, Mulish700, Mulish400, Mulish600 } from "../utils/theme";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import ImageCarousel from "./ImageCarousel";
import AppImage from "./AppImage";
import ActionSheet from "react-native-actions-sheet";
import { IconButton, TextInput } from "react-native-paper";
import { foodTypeStrings } from "../utils/constants";

const { width, height } = Dimensions.get("window");
const PLAIN_OPTION_NAME = "Plain";

const isPlainOption = (optionName) =>
  String(optionName || "").trim().toLowerCase() === "plain";

const ensurePlainOption = (options) => {
  const safeOptions = Array.isArray(options) ? options : [];
  const hasPlain = safeOptions.some((option) => isPlainOption(option?.name));
  const normalizedOptions = safeOptions.map((option) =>
    isPlainOption(option?.name)
      ? { ...option, name: PLAIN_OPTION_NAME, hasCost: false, cost: 0 }
      : option
  );

  if (hasPlain) {
    return normalizedOptions;
  }

  return [
    { name: PLAIN_OPTION_NAME, hasCost: false, cost: 0 },
    ...normalizedOptions,
  ];
};

const getSelectedCount = (selectedOptions) =>
  Array.isArray(selectedOptions) ? selectedOptions.length : 0;

const isOptionSelectionComplete = (hasChoices, selectedOptions, maxCount) => {
  if (!hasChoices) {
    return true;
  }

  const selectedCount = getSelectedCount(selectedOptions);
  return selectedCount > 0 && selectedCount <= maxCount;
};

/**
 * Optimized Sub-Item Row
 * Memoized to prevent re-rendering all items when one is toggled.
 */
const SubItemRow = memo(({ subItem, isSelected, onToggle }) => (
  <TouchableOpacity
    style={styles.subItemRowContainer}
    activeOpacity={0.7}
    onPress={() => onToggle(subItem?.menuItem)}
  >
    <AppImage
      uri={subItem?.menuItem?.imgUrls?.[0]}
      containerStyle={styles.subItemImage}
    />
    <View style={{ gap: 2, flex: 1 }}>
      <Text numberOfLines={1} style={styles.subItemName}>
        {subItem?.menuItem?.name}
      </Text>
      <Text numberOfLines={1} style={styles.subItemDescription}>
        {subItem?.menuItem?.description}
      </Text>
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={styles.subItemPrice}>
        {`x${subItem?.qty}`}
        {/* {`$${(subItem?.menuItem?.price || 0).toFixed(2)}`} */}
      </Text>
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: isSelected ? AppColor.primary : "transparent",
          },
        ]}
      >
        {isSelected && (
          <MaterialIcons name="check" size={18} color={AppColor.white} />
        )}
      </View>
    </View>
  </TouchableOpacity>
));

const OptionRow = memo(({ option, isSelected, onToggle }) => (
  <View style={styles.flavorRow}>
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.optionCheckboxArea}
      onPress={() => onToggle(option.name)}
    >
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: isSelected ? AppColor.primary : "transparent",
          },
        ]}
      >
        {isSelected && (
          <MaterialIcons name="check" size={18} color={AppColor.white} />
        )}
      </View>
      <Text numberOfLines={1} style={styles.flavorName}>
        {option.name}
      </Text>
    </TouchableOpacity>
    {option.hasCost ? (
      <Text style={styles.optionCost}>{`+$${Number(option.cost).toFixed(2)}`}</Text>
    ) : null}
  </View>
));

const PlainSplitToggle = memo(({ enabled, onToggle }) => (
  <TouchableOpacity
    activeOpacity={0.7}
    style={styles.plainSplitRow}
    onPress={onToggle}
  >
    <View
      style={[
        styles.checkbox,
        {
          backgroundColor: enabled ? AppColor.primary : "transparent",
        },
      ]}
    >
      {enabled && <MaterialIcons name="check" size={18} color={AppColor.white} />}
    </View>
    <Text style={styles.plainSplitText}>Part of this item is plain</Text>
  </TouchableOpacity>
));

const getMenuItemId = (item) =>
  item?._id || item?.menuItem?._id || item?.itemId?._id || item?.itemId || "";

const getComboChildItem = (item) => item?.menuItem || item?.itemId || item;

const getSelectionLimit = (configuredLimit, optionsLength) => {
  const numericLimit = Number(configuredLimit);
  if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
    return optionsLength;
  }

  return Math.min(numericLimit, optionsLength);
};

const getChildRequirementState = (item) => {
  const child = getComboChildItem(item);
  const flavorOptions = ensurePlainOption(normalizeMenuOptions(child, "flavor"));
  const toppingOptions = ensurePlainOption(normalizeMenuOptions(child, "topping"));
  const comboSideOptions = Array.isArray(child?.comboSideOptions)
    ? child.comboSideOptions.filter((option) => option)
    : [];

  return {
    child,
    flavorOptions,
    toppingOptions,
    comboSideOptions,
    hasFlavorChoices: child?.hasFlavors && flavorOptions.length > 0,
    hasToppingChoices: child?.hasToppings && toppingOptions.length > 0,
    hasComboSideChoices:
      child?.itemType === foodTypeStrings.combo && comboSideOptions.length > 0,
    flavorRequiredCount: getSelectionLimit(
      child?.flavorsPerOrder,
      flavorOptions.length
    ),
    toppingRequiredCount: getSelectionLimit(
      child?.toppingsPerOrder,
      toppingOptions.length
    ),
    comboSideRequiredCount: getSelectionLimit(
      child?.comboSidesPerOrder,
      comboSideOptions.length
    ),
    hasCustomization: !!child?.allowCustomize,
  };
};

const isChildSelectionComplete = (item) => {
  const state = getChildRequirementState(item);
  return (
    isOptionSelectionComplete(
      state.hasFlavorChoices,
      item?.selectedFlavors || [],
      state.flavorRequiredCount
    ) &&
    isOptionSelectionComplete(
      state.hasToppingChoices,
      item?.selectedToppings || [],
      state.toppingRequiredCount
    ) &&
    (!state.hasComboSideChoices ||
      (item?.selectedComboSides || []).length === state.comboSideRequiredCount)
  );
};

import {
  getRewardItemsDisplay,
  normalizeMenuOptions,
} from "../helpers/discount.helper";

const DishItemDetailsModal = ({
  actionSheetRef,
  selectedMenuItem,
  onClose,
  handleAddItem,
  handleRemoveItem,
  getItemQuantity,
  insets,
  onSelectedSubItemsChange,
  onCustomizationInputChange,
  onSelectedFlavorsChange,
  onSelectedToppingsChange,
  onSelectedDiscountFlavorsChange,
  onSelectedDiscountToppingsChange,
  onSelectedDiscountCustomizationInputChange,
  onSelectedDiscountComboSidesChange,
  onSelectedDiscountSubItemsChange,
  onSelectedComboSidesChange,
}) => {
  const [selectedSubItems, setSelectedSubItems] = useState(
    selectedMenuItem?.selectedSubItems || []
  );
  const [customizationInput, setCustomizationInput] = useState(
    selectedMenuItem?.customizationInput || ""
  );
  const [selectedFlavors, setSelectedFlavors] = useState(
    selectedMenuItem?.selectedFlavors || []
  );
  const [selectedToppings, setSelectedToppings] = useState(
    selectedMenuItem?.selectedToppings || []
  );
  const [selectedDiscountFlavors, setSelectedDiscountFlavors] = useState(
    selectedMenuItem?.selectedDiscountFlavors || []
  );
  const [selectedDiscountToppings, setSelectedDiscountToppings] = useState(
    selectedMenuItem?.selectedDiscountToppings || []
  );
  const [
    selectedDiscountCustomizationInput,
    setSelectedDiscountCustomizationInput,
  ] = useState(selectedMenuItem?.selectedDiscountCustomizationInput || "");
  const [selectedDiscountComboSides, setSelectedDiscountComboSides] = useState(
    selectedMenuItem?.selectedDiscountComboSides || []
  );
  const [selectedComboSides, setSelectedComboSides] = useState(
    selectedMenuItem?.selectedComboSides || []
  );
  const [selectedDiscountSubItems, setSelectedDiscountSubItems] = useState(
    selectedMenuItem?.selectedDiscountSubItems || []
  );
  const [splitPlainFlavor, setSplitPlainFlavor] = useState(false);
  const [splitPlainTopping, setSplitPlainTopping] = useState(false);
  const [splitPlainDiscountFlavor, setSplitPlainDiscountFlavor] = useState(false);
  const [splitPlainDiscountTopping, setSplitPlainDiscountTopping] = useState(false);

  // Sync selection with existing order item or reset when menu item changes
  useEffect(() => {
    setSelectedSubItems(selectedMenuItem?.selectedSubItems || []);
    setCustomizationInput(selectedMenuItem?.customizationInput || "");
    setSelectedFlavors(selectedMenuItem?.selectedFlavors || []);
    setSelectedToppings(selectedMenuItem?.selectedToppings || []);
    setSelectedDiscountFlavors(selectedMenuItem?.selectedDiscountFlavors || []);
    setSelectedDiscountToppings(selectedMenuItem?.selectedDiscountToppings || []);
    setSelectedDiscountCustomizationInput(
      selectedMenuItem?.selectedDiscountCustomizationInput || ""
    );
    setSelectedDiscountComboSides(
      selectedMenuItem?.selectedDiscountComboSides || []
    );
    setSelectedComboSides(selectedMenuItem?.selectedComboSides || []);
    setSelectedDiscountSubItems(selectedMenuItem?.selectedDiscountSubItems || []);
    setSplitPlainFlavor(
      (selectedMenuItem?.selectedFlavors || []).some(isPlainOption) &&
        (selectedMenuItem?.selectedFlavors || []).length > 1
    );
    setSplitPlainTopping(
      (selectedMenuItem?.selectedToppings || []).some(isPlainOption) &&
        (selectedMenuItem?.selectedToppings || []).length > 1
    );
    setSplitPlainDiscountFlavor(
      (selectedMenuItem?.selectedDiscountFlavors || []).some(isPlainOption) &&
        (selectedMenuItem?.selectedDiscountFlavors || []).length > 1
    );
    setSplitPlainDiscountTopping(
      (selectedMenuItem?.selectedDiscountToppings || []).some(isPlainOption) &&
        (selectedMenuItem?.selectedDiscountToppings || []).length > 1
    );
  }, [
    selectedMenuItem?._id,
    selectedMenuItem?.selectedSubItems,
    selectedMenuItem?.customizationInput,
    selectedMenuItem?.selectedFlavors,
    selectedMenuItem?.selectedToppings,
    selectedMenuItem?.selectedDiscountFlavors,
    selectedMenuItem?.selectedDiscountToppings,
    selectedMenuItem?.selectedDiscountCustomizationInput,
    selectedMenuItem?.selectedDiscountComboSides,
    selectedMenuItem?.selectedComboSides,
    selectedMenuItem?.selectedDiscountSubItems,
  ]);

  // Clear subitems when main item quantity becomes 0
  useEffect(() => {
    const mainItemId = selectedMenuItem?._id;

    if (!mainItemId || !getItemQuantity) {
      return;
    }

    const quantity = getItemQuantity(mainItemId);

    if (!quantity && selectedSubItems.length) {
      setSelectedSubItems([]);

      if (onSelectedSubItemsChange) {
        requestAnimationFrame(() => {
          onSelectedSubItemsChange([]);
        });
      }
    }
  }, [
    selectedMenuItem?._id,
    getItemQuantity,
    selectedSubItems.length,
    onSelectedSubItemsChange,
  ]);

  const flavorOptions = ensurePlainOption(
    normalizeMenuOptions(selectedMenuItem, "flavor")
  );
  const toppingOptions = ensurePlainOption(
    normalizeMenuOptions(selectedMenuItem, "topping")
  );
  const flavorsMaxCount = getSelectionLimit(
    selectedMenuItem?.flavorsPerOrder,
    flavorOptions.length
  );
  const toppingsMaxCount = getSelectionLimit(
    selectedMenuItem?.toppingsPerOrder,
    toppingOptions.length
  );
  const hasFlavorChoices = selectedMenuItem?.hasFlavors && flavorOptions.length > 0;
  const hasToppingChoices =
    selectedMenuItem?.hasToppings && toppingOptions.length > 0;
  const discountSourceItem = (() => {
    const bogoItems = Array.isArray(selectedMenuItem?.bogoItems)
      ? selectedMenuItem.bogoItems
      : [];
    const sameItemReward = bogoItems.find((item) => item?.isSameItem);
    const differentItemReward = bogoItems.find((item) => !item?.isSameItem);

    if (
      sameItemReward ||
      (!bogoItems.length && selectedMenuItem?.discountRules?.discount > 0)
    ) {
      return selectedMenuItem;
    }

    return differentItemReward || null;
  })();
  const discountFlavorOptions = ensurePlainOption(
    normalizeMenuOptions(discountSourceItem, "flavor")
  );
  const discountToppingOptions = ensurePlainOption(
    normalizeMenuOptions(discountSourceItem, "topping")
  );
  const discountFlavorsMaxCount = getSelectionLimit(
    discountSourceItem?.flavorsPerOrder,
    discountFlavorOptions.length
  );
  const discountToppingsMaxCount = getSelectionLimit(
    discountSourceItem?.toppingsPerOrder,
    discountToppingOptions.length
  );
  const hasSameItemDiscount =
    (!!selectedMenuItem?.discountRules?.discount &&
      selectedMenuItem?.discountRules?.discount > 0 &&
      (!Array.isArray(selectedMenuItem?.bogoItems) ||
        selectedMenuItem.bogoItems.length === 0 ||
        selectedMenuItem.bogoItems.some((item) => item?.isSameItem))) ||
    (["BOGO", "BOGOHO"].includes(selectedMenuItem?.discountType) &&
      selectedMenuItem?.bogoItems?.some((item) => item?.isSameItem));
  const hasDiscountOffer = !!discountSourceItem && (
    hasSameItemDiscount ||
    selectedMenuItem?.discountRules?.discount > 0 ||
    ["BOGO", "BOGOHO"].includes(selectedMenuItem?.discountType)
  );
  const hasDiscountFlavorChoices =
    hasDiscountOffer &&
    discountSourceItem?.hasFlavors &&
    discountFlavorOptions.length > 0;
  const hasDiscountToppingChoices =
    hasDiscountOffer &&
    discountSourceItem?.hasToppings &&
    discountToppingOptions.length > 0;
  const discountComboSideOptions = Array.isArray(
    discountSourceItem?.comboSideOptions
  )
    ? discountSourceItem.comboSideOptions.filter((option) => option)
    : [];
  const discountComboSidesRequiredCount = getSelectionLimit(
    discountSourceItem?.comboSidesPerOrder,
    discountComboSideOptions.length
  );
  const hasDiscountComboSideChoices =
    hasDiscountOffer &&
    discountSourceItem?.itemType === foodTypeStrings.combo &&
    discountComboSideOptions.length > 0;
  const hasDiscountCustomization =
    hasDiscountOffer && !!discountSourceItem?.allowCustomize;
  const comboSideOptions = Array.isArray(selectedMenuItem?.comboSideOptions)
    ? selectedMenuItem.comboSideOptions.filter((option) => option)
    : [];
  const comboSidesRequiredCount = getSelectionLimit(
    selectedMenuItem?.comboSidesPerOrder,
    comboSideOptions.length
  );
  const hasComboSideChoices =
    selectedMenuItem?.itemType === foodTypeStrings.combo &&
    comboSideOptions.length > 0;

  const toggleOptionSelection = useCallback(
    (optionName, setter, currentOptions, limit, label, splitPlain = false) => {
      const current = Array.isArray(currentOptions) ? currentOptions : [];
      const isSelected = current.includes(optionName);
      const plainSelected = current.some(isPlainOption);

      if (isPlainOption(optionName)) {
        if (isSelected) {
          setter(current.filter((item) => !isPlainOption(item)));
          return;
        }

        if (!splitPlain && current.length > 0) {
          Alert.alert(
            "Plain selection",
            "Selecting Plain will remove your selections. Continue?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Continue",
                onPress: () => setter([PLAIN_OPTION_NAME]),
              },
            ]
          );
          return;
        }

        if (current.length >= limit) {
          Alert.alert(
            `${label} Limit`,
            `Please select only ${limit} ${label.toLowerCase()}${
              limit === 1 ? "" : "s"
            }.`
          );
          return;
        }

        setter([...current, PLAIN_OPTION_NAME]);
        return;
      }

      if (isSelected) {
        setter(current.filter((item) => item !== optionName));
        return;
      }

      const nextBase = splitPlain ? current : current.filter((item) => !isPlainOption(item));
      if (!splitPlain && plainSelected) {
        setter([...nextBase, optionName]);
        return;
      }

      if (nextBase.length >= limit) {
        Alert.alert(
          `${label} Limit`,
          `Please select only ${limit} ${label.toLowerCase()}${
            limit === 1 ? "" : "s"
          }.`
        );
        return;
      }

      setter([...nextBase, optionName]);
    },
    []
  );

  const toggleSplitPlain = useCallback(
    (enabled, setEnabled, selectedOptions, setter, limit, label) => {
      const current = Array.isArray(selectedOptions) ? selectedOptions : [];

      if (enabled) {
        setEnabled(false);
        setter(current.filter((item) => !isPlainOption(item)));
        return;
      }

      if (!current.some(isPlainOption) && current.length >= limit) {
        Alert.alert(
          `${label} Limit`,
          `Plain counts as one selection. Remove one ${label.toLowerCase()} before splitting with Plain.`
        );
        return;
      }

      setEnabled(true);
      setter(
        current.some(isPlainOption)
          ? current.map((item) => (isPlainOption(item) ? PLAIN_OPTION_NAME : item))
          : [PLAIN_OPTION_NAME, ...current]
      );
    },
    []
  );

  const validateOptionSelection = useCallback(
    (hasChoices, selectedOptions, maxCount, label) => {
      if (!hasChoices) {
        return true;
      }

      if (!isOptionSelectionComplete(hasChoices, selectedOptions, maxCount)) {
        Alert.alert(
          `${label} Selection`,
          `Please select at least 1 and no more than ${maxCount} ${label.toLowerCase()}${
            maxCount === 1 ? "" : "s"
          }.`
        );
        return false;
      }

      return true;
    },
    []
  );

  const validateSelections = useCallback(() => {
    const invalidComboChild = selectedSubItems.find(
      (item) => !isChildSelectionComplete(item)
    );
    if (invalidComboChild) {
      Alert.alert(
        "Combo Item Selection",
        `Please complete required selections for ${getComboChildItem(invalidComboChild)?.name || "the combo item"}.`
      );
      return false;
    }

    const invalidDiscountChild = selectedDiscountSubItems.find(
      (item) => !isChildSelectionComplete(item)
    );
    if (invalidDiscountChild) {
      Alert.alert(
        "Discount Combo Selection",
        `Please complete required selections for ${getComboChildItem(invalidDiscountChild)?.name || "the discount combo item"}.`
      );
      return false;
    }

    if (
      hasComboSideChoices &&
      selectedComboSides.length !== comboSidesRequiredCount
    ) {
      Alert.alert(
        "Side Selection",
        `Please select exactly ${comboSidesRequiredCount} side${
          comboSidesRequiredCount === 1 ? "" : "s"
        }.`
      );
      return false;
    }

    if (
      hasDiscountComboSideChoices &&
      selectedDiscountComboSides.length !== discountComboSidesRequiredCount
    ) {
      Alert.alert(
        "Discount Side Selection",
        `Please select exactly ${discountComboSidesRequiredCount} side${
          discountComboSidesRequiredCount === 1 ? "" : "s"
        } for the discount item.`
      );
      return false;
    }

    return (
      validateOptionSelection(
        hasFlavorChoices,
        selectedFlavors,
        flavorsMaxCount,
        "Flavor"
      ) &&
      validateOptionSelection(
        hasToppingChoices,
        selectedToppings,
        toppingsMaxCount,
        "Topping"
      ) &&
      validateOptionSelection(
        hasDiscountFlavorChoices,
        selectedDiscountFlavors,
        discountFlavorsMaxCount,
        "Discount item flavor"
      ) &&
      validateOptionSelection(
        hasDiscountToppingChoices,
        selectedDiscountToppings,
        discountToppingsMaxCount,
        "Discount item topping"
      )
    );
  }, [
    comboSidesRequiredCount,
    discountComboSidesRequiredCount,
    discountFlavorsMaxCount,
    discountToppingsMaxCount,
    flavorsMaxCount,
    hasComboSideChoices,
    hasDiscountComboSideChoices,
    hasDiscountFlavorChoices,
    hasDiscountToppingChoices,
    hasFlavorChoices,
    hasToppingChoices,
    selectedComboSides,
    selectedDiscountComboSides,
    selectedDiscountFlavors,
    selectedDiscountSubItems,
    selectedDiscountToppings,
    selectedFlavors,
    selectedSubItems,
    selectedToppings,
    toppingsMaxCount,
    validateOptionSelection,
  ]);

  const selectionsComplete =
    (!hasComboSideChoices ||
      selectedComboSides.length === comboSidesRequiredCount) &&
    (!hasDiscountComboSideChoices ||
      selectedDiscountComboSides.length === discountComboSidesRequiredCount) &&
    isOptionSelectionComplete(hasFlavorChoices, selectedFlavors, flavorsMaxCount) &&
    isOptionSelectionComplete(hasToppingChoices, selectedToppings, toppingsMaxCount) &&
    (!hasDiscountFlavorChoices ||
      isOptionSelectionComplete(
        hasDiscountFlavorChoices,
        selectedDiscountFlavors,
        discountFlavorsMaxCount
      )) &&
    (!hasDiscountToppingChoices ||
      isOptionSelectionComplete(
        hasDiscountToppingChoices,
        selectedDiscountToppings,
        discountToppingsMaxCount
      )) &&
    selectedSubItems.every(isChildSelectionComplete) &&
    selectedDiscountSubItems.every(isChildSelectionComplete);

  const handleUpdateOrder = useCallback(() => {
    if (!validateSelections()) {
      return;
    }

    const itemWithSelections = {
      ...selectedMenuItem,
      selectedSubItems,
      customizationInput,
      selectedFlavors: hasFlavorChoices ? selectedFlavors : [],
      selectedToppings: hasToppingChoices ? selectedToppings : [],
      selectedComboSides: hasComboSideChoices ? selectedComboSides : [],
      selectedDiscountFlavors: hasDiscountFlavorChoices
        ? selectedDiscountFlavors
        : [],
      selectedDiscountToppings: hasDiscountToppingChoices
        ? selectedDiscountToppings
        : [],
      selectedDiscountCustomizationInput: hasDiscountCustomization
        ? selectedDiscountCustomizationInput
        : "",
      selectedDiscountComboSides: hasDiscountComboSideChoices
        ? selectedDiscountComboSides
        : [],
      selectedDiscountSubItems,
    };

    if (getItemQuantity(selectedMenuItem._id) === 0) {
      handleAddItem(itemWithSelections);
    } else if (onSelectedFlavorsChange) {
      onCustomizationInputChange?.(itemWithSelections.customizationInput);
      onSelectedSubItemsChange?.(itemWithSelections.selectedSubItems);
      onSelectedFlavorsChange(itemWithSelections.selectedFlavors);
      onSelectedToppingsChange?.(itemWithSelections.selectedToppings);
      onSelectedComboSidesChange?.(itemWithSelections.selectedComboSides);
      onSelectedDiscountFlavorsChange?.(
        itemWithSelections.selectedDiscountFlavors
      );
      onSelectedDiscountToppingsChange?.(
        itemWithSelections.selectedDiscountToppings
      );
      onSelectedDiscountCustomizationInputChange?.(
        itemWithSelections.selectedDiscountCustomizationInput
      );
      onSelectedDiscountComboSidesChange?.(
        itemWithSelections.selectedDiscountComboSides
      );
      onSelectedDiscountSubItemsChange?.(
        itemWithSelections.selectedDiscountSubItems
      );
    }

    actionSheetRef.current?.hide();
  }, [
    actionSheetRef,
    customizationInput,
    getItemQuantity,
    handleAddItem,
    hasComboSideChoices,
    hasDiscountComboSideChoices,
    hasDiscountCustomization,
    hasDiscountFlavorChoices,
    hasDiscountToppingChoices,
    hasFlavorChoices,
    hasToppingChoices,
    onCustomizationInputChange,
    onSelectedSubItemsChange,
    onSelectedComboSidesChange,
    onSelectedDiscountComboSidesChange,
    onSelectedDiscountCustomizationInputChange,
    onSelectedDiscountFlavorsChange,
    onSelectedDiscountSubItemsChange,
    onSelectedDiscountToppingsChange,
    onSelectedFlavorsChange,
    onSelectedToppingsChange,
    selectedComboSides,
    selectedDiscountComboSides,
    selectedDiscountCustomizationInput,
    selectedDiscountFlavors,
    selectedDiscountSubItems,
    selectedDiscountToppings,
    selectedFlavors,
    selectedMenuItem,
    selectedSubItems,
    selectedToppings,
    validateSelections,
  ]);

  const updateSelectedChildItem = useCallback((setter, childId, updates) => {
    setter((prevItems) =>
      prevItems.map((item) =>
        String(getMenuItemId(item)) === String(childId)
          ? { ...item, ...updates }
          : item
      )
    );
  }, []);

  // Optimized toggle function
  const toggleSubItemSelection = useCallback(
    (menuItem) => {
      const mainItemId = selectedMenuItem?._id;
      const mainItemQuantity =
        mainItemId && getItemQuantity ? getItemQuantity(mainItemId) : 0;

      if (!menuItem?._id) {
        return;
      }

      if (!mainItemQuantity) {
        handleAddItem({
          ...selectedMenuItem,
          selectedSubItems: [],
          customizationInput,
          selectedFlavors: hasFlavorChoices ? selectedFlavors : [],
          selectedToppings: hasToppingChoices ? selectedToppings : [],
          selectedComboSides: hasComboSideChoices ? selectedComboSides : [],
          selectedDiscountFlavors: hasDiscountFlavorChoices
            ? selectedDiscountFlavors
            : [],
          selectedDiscountToppings: hasDiscountToppingChoices
            ? selectedDiscountToppings
            : [],
          selectedDiscountCustomizationInput: hasDiscountCustomization
            ? selectedDiscountCustomizationInput
            : "",
          selectedDiscountComboSides: hasDiscountComboSideChoices
            ? selectedDiscountComboSides
            : [],
          selectedDiscountSubItems,
        });
      }

      setSelectedSubItems((prevItems) => {
        const isSelected = prevItems.some(
          (item) => String(getMenuItemId(item)) === String(menuItem._id)
        );
        const newSelectedItems = isSelected
          ? prevItems.filter(
              (item) => String(getMenuItemId(item)) !== String(menuItem._id)
            )
          : [
              ...prevItems,
              {
                ...menuItem,
                selectedFlavors: [],
                selectedToppings: [],
                selectedComboSides: [],
                customizationInput: "",
              },
            ];

        if (onSelectedSubItemsChange) {
          requestAnimationFrame(() => {
            onSelectedSubItemsChange(newSelectedItems);
          });
        }

        return newSelectedItems;
      });
    },
    [
      customizationInput,
      getItemQuantity,
      handleAddItem,
      hasComboSideChoices,
      hasDiscountComboSideChoices,
      hasDiscountCustomization,
      hasDiscountFlavorChoices,
      hasDiscountToppingChoices,
      hasFlavorChoices,
      hasToppingChoices,
      onSelectedSubItemsChange,
      selectedComboSides,
      selectedDiscountComboSides,
      selectedDiscountCustomizationInput,
      selectedDiscountFlavors,
      selectedDiscountSubItems,
      selectedDiscountToppings,
      selectedFlavors,
      selectedMenuItem,
      selectedToppings,
    ]
  );

  const toggleDiscountSubItemSelection = useCallback(
    (menuItem) => {
      if (!menuItem?._id) {
        return;
      }

      setSelectedDiscountSubItems((prevItems) => {
        const isSelected = prevItems.some(
          (item) => String(getMenuItemId(item)) === String(menuItem._id)
        );
        return isSelected
          ? prevItems.filter(
              (item) => String(getMenuItemId(item)) !== String(menuItem._id)
            )
          : [
              ...prevItems,
              {
                ...menuItem,
                selectedFlavors: [],
                selectedToppings: [],
                selectedComboSides: [],
                customizationInput: "",
              },
            ];
      });
    },
    []
  );

  const renderChildCustomizationFields = (
    item,
    setter,
    sectionPrefix = "Combo item"
  ) => {
    const childId = getMenuItemId(item);
    const state = getChildRequirementState(item);

    if (
      !state.hasFlavorChoices &&
      !state.hasToppingChoices &&
      !state.hasComboSideChoices &&
      !state.hasCustomization
    ) {
      return null;
    }

    return (
      <View style={styles.childCustomizationBox}>
        {state.hasFlavorChoices ? (
          <View style={styles.childOptionGroup}>
            <Text style={styles.childOptionTitle}>
              {`${sectionPrefix}: choose up to ${state.flavorRequiredCount} flavor${
                state.flavorRequiredCount === 1 ? "" : "s"
              }`}
            </Text>
            {state.flavorOptions.map((option) => (
              <OptionRow
                key={`${sectionPrefix}-${childId}-flavor-${option.name}`}
                option={option}
                isSelected={(item.selectedFlavors || []).includes(option.name)}
                onToggle={(optionName) =>
                  updateSelectedChildItem(setter, childId, {
                    selectedFlavors: (() => {
                      const current = item.selectedFlavors || [];
                      const isSelected = current.includes(optionName);
                      if (isSelected) {
                        return current.filter((value) => value !== optionName);
                      }
                      if (current.length >= state.flavorRequiredCount) {
                        Alert.alert(
                          "Flavor Limit",
                          `Please select only ${state.flavorRequiredCount} flavor${
                            state.flavorRequiredCount === 1 ? "" : "s"
                          }.`
                        );
                        return current;
                      }
                      return [...current, optionName];
                    })(),
                  })
                }
              />
            ))}
          </View>
        ) : null}

        {state.hasToppingChoices ? (
          <View style={styles.childOptionGroup}>
            <Text style={styles.childOptionTitle}>
              {`${sectionPrefix}: choose up to ${state.toppingRequiredCount} topping${
                state.toppingRequiredCount === 1 ? "" : "s"
              }`}
            </Text>
            {state.toppingOptions.map((option) => (
              <OptionRow
                key={`${sectionPrefix}-${childId}-topping-${option.name}`}
                option={option}
                isSelected={(item.selectedToppings || []).includes(option.name)}
                onToggle={(optionName) =>
                  updateSelectedChildItem(setter, childId, {
                    selectedToppings: (() => {
                      const current = item.selectedToppings || [];
                      const isSelected = current.includes(optionName);
                      if (isSelected) {
                        return current.filter((value) => value !== optionName);
                      }
                      if (current.length >= state.toppingRequiredCount) {
                        Alert.alert(
                          "Topping Limit",
                          `Please select only ${state.toppingRequiredCount} topping${
                            state.toppingRequiredCount === 1 ? "" : "s"
                          }.`
                        );
                        return current;
                      }
                      return [...current, optionName];
                    })(),
                  })
                }
              />
            ))}
          </View>
        ) : null}

        {state.hasComboSideChoices ? (
          <View style={styles.childOptionGroup}>
            <Text style={styles.childOptionTitle}>
              {`${sectionPrefix}: choose exactly ${state.comboSideRequiredCount} side${
                state.comboSideRequiredCount === 1 ? "" : "s"
              }`}
            </Text>
            {state.comboSideOptions.map((optionName) => (
              <OptionRow
                key={`${sectionPrefix}-${childId}-side-${optionName}`}
                option={{ name: optionName, hasCost: false, cost: 0 }}
                isSelected={(item.selectedComboSides || []).includes(optionName)}
                onToggle={(selectedName) =>
                  updateSelectedChildItem(setter, childId, {
                    selectedComboSides: (() => {
                      const current = item.selectedComboSides || [];
                      const isSelected = current.includes(selectedName);
                      if (isSelected) {
                        return current.filter((value) => value !== selectedName);
                      }
                      if (current.length >= state.comboSideRequiredCount) {
                        Alert.alert(
                          "Side Limit",
                          `Please select only ${state.comboSideRequiredCount} side${
                            state.comboSideRequiredCount === 1 ? "" : "s"
                          }.`
                        );
                        return current;
                      }
                      return [...current, selectedName];
                    })(),
                  })
                }
              />
            ))}
          </View>
        ) : null}

        {state.hasCustomization ? (
          <TextInput
            dense
            value={item.customizationInput || ""}
            onChangeText={(value) =>
              updateSelectedChildItem(setter, childId, {
                customizationInput: value,
              })
            }
            style={{ backgroundColor: AppColor.white, marginTop: 8 }}
            contentStyle={{
              minHeight: 82,
              fontFamily: Mulish400,
              fontSize: 14,
            }}
            placeholder="Enter special instructions"
            placeholderTextColor={AppColor.textPlaceholder}
            mode="outlined"
            multiline={true}
            outlineColor={AppColor.border}
            activeOutlineColor={AppColor.primary}
            outlineStyle={{ borderRadius: 8 }}
            autoCapitalize="sentences"
          />
        ) : null}
      </View>
    );
  };

  return (
    <ActionSheet
      ref={actionSheetRef}
      gestureEnabled={false}
      isModal={Platform.OS === "ios"}
      onClose={onClose}
    >
      {selectedMenuItem && (
        <View
          style={{
            maxHeight: height - insets.top - insets.bottom - 10,
            paddingBottom: Platform.OS === "ios" ? 10 : 0,
            paddingHorizontal: 20,
          }}
        >
          {/* Header */}
          <View style={styles.actionSheetHeader}>
            <Text style={styles.actionSheetTitle} numberOfLines={2}>
              {selectedMenuItem.name || "Menu Item"}
            </Text>
            <IconButton
              icon="close"
              iconColor={AppColor.text}
              onPress={() => actionSheetRef.current?.hide()}
              style={{ margin: 0 }}
            />
          </View>

          <ScrollView
            contentContainerStyle={styles.actionSheetScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Images */}
            {selectedMenuItem?.imgUrls?.length > 0 ? (
              <ImageCarousel
                images={selectedMenuItem?.imgUrls}
                imageResizeMode="cover"
                containerHeight={200}
                containerWidth={width - 40}
                containerStyle={styles.actionSheetImageCarousel}
                imageContainer={{ borderRadius: 0 }}
              />
            ) : (
              <View style={styles.placeholderImage}>
                <MaterialIcons
                  name="fastfood"
                  size={50}
                  color={AppColor.textHighlighter}
                />
              </View>
            )}

            {/* Price Row */}
            <View style={styles.actionSheetPriceRow}>
              <View style={styles.actionSheetPriceContainer}>
                <Text style={styles.actionSheetPrice}>
                  {`$${(selectedMenuItem?.price || 0).toFixed(2)} `}
                </Text>
                {selectedMenuItem?.strikePrice > 0 && (
                  <Text style={styles.actionSheetStrikePrice}>
                    {`$${(selectedMenuItem?.strikePrice || 0).toFixed(2)} `}
                  </Text>
                )}
              </View>

              <View style={styles.actionSheetFoodTypeContainer}>
                <FontAwesome6
                  name="clock"
                  size={14}
                  color={AppColor.textPlaceholder}
                />
                <Text style={styles.prepTimeText}>
                  {`${selectedMenuItem?.preparationTime} mins`}
                </Text>
              </View>
            </View>

            {/* Badges */}
            {selectedMenuItem?.newDish ||
            selectedMenuItem?.popularDish ||
            selectedMenuItem?.discountType === "BOGO" ||
            selectedMenuItem?.discountType === "BOGOHO" ||
            selectedMenuItem.itemType === foodTypeStrings.combo ? (
              <View style={styles.badgeContainer}>
                {selectedMenuItem?.newDish && (
                  <Text style={styles.newBadge}>New</Text>
                )}
                {selectedMenuItem?.popularDish && (
                  <Text style={styles.popularBadge}>Popular</Text>
                )}
                {selectedMenuItem?.discountType === "BOGO" && (
                  <Text style={styles.popularBadge}>BOGO</Text>
                )}
                {selectedMenuItem?.discountType === "BOGOHO" && (
                  <Text style={styles.popularBadge}>BOGOHO</Text>
                )}
                {selectedMenuItem.itemType === foodTypeStrings.combo && (
                  <Text style={styles.comboBadge}>Combo</Text>
                )}
              </View>
            ) : null}

            {/* Description */}
            <View style={styles.actionSheetSection}>
              <Text style={styles.sectionTitle}>Description:</Text>
              <Text style={styles.descriptionText}>
                {selectedMenuItem?.description || ""}
              </Text>
            </View>

            {/* Meat Info */}
            {selectedMenuItem?.meat?.name && (
              <View style={styles.rowInfo}>
                <Text style={styles.sectionTitle}>Meat Type: </Text>
                <Text style={styles.actionSheetDescription}>
                  {selectedMenuItem?.meat?.name}
                </Text>
              </View>
            )}

            {/* Meat Wellness Info */}
            {selectedMenuItem?.meatWellness && (
              <View style={styles.rowInfo}>
                <Text style={styles.sectionTitle}>Meat Information: </Text>
                <Text style={styles.actionSheetDescription}>
                  {selectedMenuItem?.meatWellness}
                </Text>
              </View>
            )}

            {/* Dietary Info */}
            {selectedMenuItem.diet?.length > 0 && (
              <View style={styles.actionSheetSection}>
                <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>
                  Dietary Information:
                </Text>
                <View style={styles.dietContainer}>
                  {selectedMenuItem.diet.map((diet, index) => {
                    const dietName =
                      diet?.name || (typeof diet === "string" ? diet : "");
                    return dietName ? (
                      <Text key={diet?._id || index} style={styles.dietBadge}>
                        {dietName}
                      </Text>
                    ) : null;
                  })}
                </View>
              </View>
            )}

            {/* BOGO / BOGOHO — buy & get quantities + reward items */}
            {(() => {
              const { discountType, bogoItems, discountRules } =
                selectedMenuItem;
              const currentQty = getItemQuantity(selectedMenuItem?._id);
              const previewQty =
                currentQty > 0
                  ? currentQty
                  : Math.max(1, Number(discountRules?.buyQty) || 1);

              const hasRuleBasedOffer =
                discountRules && discountRules.discount > 0;
              const hasLegacyBogoList = bogoItems && bogoItems.length > 0;

              if (!hasRuleBasedOffer && !hasLegacyBogoList) {
                return null;
              }

              const discountVal = discountRules?.discount ?? 0;
              let promoName = "Special offer";
              if (discountVal === 1) promoName = "BOGO";
              else if (discountVal === 0.5) promoName = "BOGOHO";
              else if (hasLegacyBogoList && discountType)
                promoName = discountType;

              const buyQtyDisplay = Math.max(
                1,
                Number(discountRules?.buyQty) || 1
              );
              const getQtyShown = Math.max(
                1,
                Number(discountRules?.getQty) || 1
              );

              const repeatable = discountRules?.repeatable !== false;

              const rewardItems = getRewardItemsDisplay(
                {
                  ...selectedMenuItem,
                  quantity: previewQty,
                },
                previewQty
              );

              return (
                <View style={styles.actionSheetSection}>
                  <Text style={styles.bogoSectionHeading}>Special offer</Text>

                  <View style={styles.buyGetCard}>
                    <View style={styles.buyGetCardTop}>
                      <Text style={styles.buyGetCardTitle}>Buy & get</Text>
                      <View style={styles.promoNamePill}>
                        <Text style={styles.promoNamePillText}>
                          {promoName}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.buyGetNumbersRow}>
                      <View style={styles.buyGetQtyBlock}>
                        <Text style={styles.buyGetQtyLabel}>Buy</Text>
                        <Text style={styles.buyGetQtyValue}>
                          {buyQtyDisplay}
                        </Text>
                        <Text style={styles.buyGetQtyUnit}>paid items</Text>
                      </View>

                      <MaterialIcons
                        name="arrow-forward"
                        size={22}
                        color={AppColor.primary}
                        style={styles.buyGetArrow}
                      />

                      <View
                        style={[
                          styles.buyGetQtyBlock,
                          styles.buyGetQtyBlockGet,
                        ]}
                      >
                        <Text style={styles.buyGetQtyLabel}>Get</Text>
                        <Text style={styles.buyGetQtyValue}>{getQtyShown}</Text>
                        <Text style={styles.buyGetQtyUnit}>discount items</Text>
                      </View>
                    </View>

                    <Text style={styles.buyGetExplanation}>
                      {`Add ${buyQtyDisplay} paid ${
                        buyQtyDisplay === 1 ? "item" : "items"
                      } to your cart to unlock ${getQtyShown} discount ${
                        getQtyShown === 1 ? "item" : "items"
                      } (see below).`}
                    </Text>

                    {hasRuleBasedOffer && repeatable ? (
                      <Text style={styles.buyGetRepeatHint}>
                        Repeats for every qualifying set when you increase
                        quantity.
                      </Text>
                    ) : null}
                  </View>

                  {rewardItems.length > 0 ? (
                    <>
                      <Text style={styles.rewardRowsHeading}>Discount item</Text>
                      {rewardItems.map((itm, index) => (
                        <View
                          key={itm._id || index}
                          style={styles.subItemRowContainer}
                        >
                          <AppImage
                            uri={itm.displayImg}
                            containerStyle={styles.subItemImage}
                          />
                          <View style={{ gap: 2, flex: 1 }}>
                            <Text numberOfLines={2} style={styles.subItemName}>
                              {itm.displayName}
                            </Text>
                            {itm.displayDesc ? (
                              <Text
                                numberOfLines={2}
                                style={styles.subItemDescription}
                              >
                                {itm.displayDesc}
                              </Text>
                            ) : null}
                          </View>
                          <View style={styles.rewardRowMeta}>
                            <Text
                              style={styles.qtyMultiplier}
                            >{`×${itm.displayQty}`}</Text>
                            <Text style={styles.rewardRowPrice}>
                              {itm.displayPrice}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </>
                  ) : null}
                </View>
              );
            })()}

            {/* Combo Items */}
            {selectedMenuItem.subItem?.length > 0 && (
              <View style={styles.actionSheetSection}>
                <Text style={styles.sectionTitle}>Combo Items:</Text>
                {selectedMenuItem.subItem.map((subItem) => {
                  const childItem = subItem?.menuItem;
                  const selectedChild = selectedSubItems.find(
                    (item) =>
                      String(getMenuItemId(item)) === String(childItem?._id)
                  );
                  return (
                    <View key={subItem?._id || childItem?._id}>
                      <SubItemRow
                        subItem={subItem}
                        isSelected={!!selectedChild}
                        onToggle={toggleSubItemSelection}
                      />
                      {selectedChild
                        ? renderChildCustomizationFields(
                            selectedChild,
                            setSelectedSubItems,
                            "Combo item"
                          )
                        : null}
                    </View>
                  );
                })}
              </View>
            )}

            {hasFlavorChoices && (
              <View style={styles.actionSheetSection}>
                <Text style={styles.sectionTitle}>
                  {`Choose Plain or up to ${flavorsMaxCount} Flavor${
                    flavorsMaxCount === 1 ? "" : "s"
                  }:`}
                </Text>
                {flavorsMaxCount > 1 ? (
                  <PlainSplitToggle
                    enabled={splitPlainFlavor}
                    onToggle={() =>
                      toggleSplitPlain(
                        splitPlainFlavor,
                        setSplitPlainFlavor,
                        selectedFlavors,
                        setSelectedFlavors,
                        flavorsMaxCount,
                        "Flavor"
                      )
                    }
                  />
                ) : null}
                {flavorOptions.map((option) => (
                  <OptionRow
                    key={option.name}
                    option={option}
                    isSelected={selectedFlavors.includes(option.name)}
                    onToggle={(optionName) =>
                      toggleOptionSelection(
                        optionName,
                        setSelectedFlavors,
                        selectedFlavors,
                        flavorsMaxCount,
                        "Flavor",
                        splitPlainFlavor
                      )
                    }
                  />
                ))}
              </View>
            )}

            {hasToppingChoices && (
              <View style={styles.actionSheetSection}>
                <Text style={styles.sectionTitle}>
                  {`Choose Plain or up to ${toppingsMaxCount} Topping${
                    toppingsMaxCount === 1 ? "" : "s"
                  }:`}
                </Text>
                {toppingsMaxCount > 1 ? (
                  <PlainSplitToggle
                    enabled={splitPlainTopping}
                    onToggle={() =>
                      toggleSplitPlain(
                        splitPlainTopping,
                        setSplitPlainTopping,
                        selectedToppings,
                        setSelectedToppings,
                        toppingsMaxCount,
                        "Topping"
                      )
                    }
                  />
                ) : null}
                {toppingOptions.map((option) => (
                  <OptionRow
                    key={option.name}
                    option={option}
                    isSelected={selectedToppings.includes(option.name)}
                    onToggle={(optionName) =>
                      toggleOptionSelection(
                        optionName,
                        setSelectedToppings,
                        selectedToppings,
                        toppingsMaxCount,
                        "Topping",
                        splitPlainTopping
                      )
                    }
                  />
                ))}
              </View>
            )}

            {hasComboSideChoices && (
              <View style={styles.actionSheetSection}>
                <Text style={styles.sectionTitle}>
                  {`Choose exactly ${comboSidesRequiredCount} Side${
                    comboSidesRequiredCount === 1 ? "" : "s"
                  }:`}
                </Text>
                {comboSideOptions.map((optionName) => (
                  <OptionRow
                    key={`combo-side-${optionName}`}
                    option={{ name: optionName, hasCost: false, cost: 0 }}
                    isSelected={selectedComboSides.includes(optionName)}
                    onToggle={(option) =>
                      toggleOptionSelection(
                        option,
                        setSelectedComboSides,
                        selectedComboSides,
                        comboSidesRequiredCount,
                        "Side"
                      )
                    }
                  />
                ))}
              </View>
            )}

            {hasDiscountFlavorChoices && (
              <View style={styles.actionSheetSection}>
                <Text style={styles.sectionTitle}>
                  {`Discount item: choose Plain or up to ${discountFlavorsMaxCount} Flavor${
                    discountFlavorsMaxCount === 1 ? "" : "s"
                  }:`}
                </Text>
                {discountFlavorsMaxCount > 1 ? (
                  <PlainSplitToggle
                    enabled={splitPlainDiscountFlavor}
                    onToggle={() =>
                      toggleSplitPlain(
                        splitPlainDiscountFlavor,
                        setSplitPlainDiscountFlavor,
                        selectedDiscountFlavors,
                        setSelectedDiscountFlavors,
                        discountFlavorsMaxCount,
                        "Discount item flavor"
                      )
                    }
                  />
                ) : null}
                {discountFlavorOptions.map((option) => (
                  <OptionRow
                    key={`discount-flavor-${option.name}`}
                    option={option}
                    isSelected={selectedDiscountFlavors.includes(option.name)}
                    onToggle={(optionName) =>
                      toggleOptionSelection(
                        optionName,
                        setSelectedDiscountFlavors,
                        selectedDiscountFlavors,
                        discountFlavorsMaxCount,
                        "Discount item flavor",
                        splitPlainDiscountFlavor
                      )
                    }
                  />
                ))}
              </View>
            )}

            {hasDiscountToppingChoices && (
              <View style={styles.actionSheetSection}>
                <Text style={styles.sectionTitle}>
                  {`Discount item: choose Plain or up to ${discountToppingsMaxCount} Topping${
                    discountToppingsMaxCount === 1 ? "" : "s"
                  }:`}
                </Text>
                {discountToppingsMaxCount > 1 ? (
                  <PlainSplitToggle
                    enabled={splitPlainDiscountTopping}
                    onToggle={() =>
                      toggleSplitPlain(
                        splitPlainDiscountTopping,
                        setSplitPlainDiscountTopping,
                        selectedDiscountToppings,
                        setSelectedDiscountToppings,
                        discountToppingsMaxCount,
                        "Discount item topping"
                      )
                    }
                  />
                ) : null}
                {discountToppingOptions.map((option) => (
                  <OptionRow
                    key={`discount-topping-${option.name}`}
                    option={option}
                    isSelected={selectedDiscountToppings.includes(option.name)}
                    onToggle={(optionName) =>
                      toggleOptionSelection(
                        optionName,
                        setSelectedDiscountToppings,
                        selectedDiscountToppings,
                        discountToppingsMaxCount,
                        "Discount item topping",
                        splitPlainDiscountTopping
                      )
                    }
                  />
                ))}
              </View>
            )}

            {hasDiscountComboSideChoices && (
              <View style={styles.actionSheetSection}>
                <Text style={styles.sectionTitle}>
                  {`Discount item: choose exactly ${discountComboSidesRequiredCount} Side${
                    discountComboSidesRequiredCount === 1 ? "" : "s"
                  }:`}
                </Text>
                {discountComboSideOptions.map((optionName) => (
                  <OptionRow
                    key={`discount-combo-side-${optionName}`}
                    option={{ name: optionName, hasCost: false, cost: 0 }}
                    isSelected={selectedDiscountComboSides.includes(optionName)}
                    onToggle={(option) =>
                      toggleOptionSelection(
                        option,
                        setSelectedDiscountComboSides,
                        selectedDiscountComboSides,
                        discountComboSidesRequiredCount,
                        "Discount item side"
                      )
                    }
                  />
                ))}
              </View>
            )}

            {hasDiscountOffer &&
              discountSourceItem?.itemType === foodTypeStrings.combo &&
              discountSourceItem?.subItem?.length > 0 && (
                <View style={styles.actionSheetSection}>
                  <Text style={styles.sectionTitle}>Discount combo items:</Text>
                  {discountSourceItem.subItem.map((subItem) => {
                    const childItem = subItem?.menuItem;
                    const selectedChild = selectedDiscountSubItems.find(
                      (item) =>
                        String(getMenuItemId(item)) === String(childItem?._id)
                    );
                    return (
                      <View key={`discount-${subItem?._id || childItem?._id}`}>
                        <SubItemRow
                          subItem={subItem}
                          isSelected={!!selectedChild}
                          onToggle={toggleDiscountSubItemSelection}
                        />
                        {selectedChild
                          ? renderChildCustomizationFields(
                              selectedChild,
                              setSelectedDiscountSubItems,
                              "Discount combo item"
                            )
                          : null}
                      </View>
                    );
                  })}
                </View>
              )}

            {hasDiscountCustomization && (
              <View style={styles.actionSheetSection}>
                <Text style={styles.sectionTitle}>
                  Discount item customization:
                </Text>
                <TextInput
                  dense
                  value={selectedDiscountCustomizationInput}
                  onChangeText={setSelectedDiscountCustomizationInput}
                  style={{ backgroundColor: AppColor.white, marginTop: 8 }}
                  contentStyle={{
                    minHeight: 100,
                    fontFamily: Mulish400,
                    fontSize: 15,
                  }}
                  placeholder="Enter special instructions"
                  placeholderTextColor={AppColor.textPlaceholder}
                  mode="outlined"
                  multiline={true}
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                  autoCapitalize="sentences"
                />
              </View>
            )}

            {/* Customization Button */}
            {selectedMenuItem?.allowCustomize && (
              <View style={styles.actionSheetSection}>
                <Text style={styles.sectionTitle}>Customization:</Text>
                <TextInput
                  dense
                  value={customizationInput}
                  onChangeText={setCustomizationInput}
                  style={{ backgroundColor: AppColor.white, marginTop: 8 }}
                  contentStyle={{
                    minHeight: 100,
                    fontFamily: Mulish400,
                    fontSize: 15,
                  }}
                  placeholder="Enter special instructions"
                  placeholderTextColor={AppColor.textPlaceholder}
                  mode="outlined"
                  multiline={true}
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                  autoCapitalize="sentences"
                />
              </View>
            )}
          </ScrollView>

          {/* Footer Quantity Controls */}
          <View style={styles.footer}>
            <View style={styles.qtySelector}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => handleRemoveItem(selectedMenuItem)}
                disabled={getItemQuantity(selectedMenuItem._id) === 0}
              >
                <Text
                  style={[
                    styles.qtyBtnText,
                    getItemQuantity(selectedMenuItem._id) === 0 && {
                      color: AppColor.textHighlighter,
                    },
                  ]}
                >
                  -
                </Text>
              </TouchableOpacity>
              <Text style={styles.qtyText}>
                {getItemQuantity(selectedMenuItem._id)}
              </Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => {
                  if (!validateSelections()) {
                    return;
                  }
                  handleAddItem({
                    ...selectedMenuItem,
                    selectedSubItems,
                    customizationInput,
                    selectedFlavors: hasFlavorChoices ? selectedFlavors : [],
                    selectedToppings: hasToppingChoices ? selectedToppings : [],
                    selectedComboSides: hasComboSideChoices
                      ? selectedComboSides
                      : [],
                    selectedDiscountFlavors: hasDiscountFlavorChoices
                      ? selectedDiscountFlavors
                      : [],
                    selectedDiscountToppings: hasDiscountToppingChoices
                      ? selectedDiscountToppings
                      : [],
                    selectedDiscountCustomizationInput: hasDiscountCustomization
                      ? selectedDiscountCustomizationInput
                      : "",
                    selectedDiscountComboSides: hasDiscountComboSideChoices
                      ? selectedDiscountComboSides
                      : [],
                    selectedDiscountSubItems,
                  });
                }}
                disabled={
                  getItemQuantity(selectedMenuItem._id) >=
                  (selectedMenuItem.maxQty || 10)
                }
              >
                <Text
                  style={[
                    styles.qtyBtnText,
                    getItemQuantity(selectedMenuItem._id) >=
                      (selectedMenuItem.maxQty || 10) && {
                      color: AppColor.textHighlighter,
                    },
                  ]}
                >
                  +
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.addButton,
                (!selectedMenuItem.available || !selectionsComplete) &&
                  styles.addButtonDisabled,
              ]}
              onPress={handleUpdateOrder}
              disabled={!selectedMenuItem.available || !selectionsComplete}
            >
              <Text style={styles.addButtonText}>
                {getItemQuantity(selectedMenuItem._id) === 0
                  ? "Add to Order"
                  : "Update Order"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </ActionSheet>
  );
};

DishItemDetailsModal.propTypes = {
  actionSheetRef: PropTypes.object.isRequired,
  selectedMenuItem: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  handleAddItem: PropTypes.func.isRequired,
  handleRemoveItem: PropTypes.func.isRequired,
  getItemQuantity: PropTypes.func.isRequired,
  insets: PropTypes.object.isRequired,
  onSelectedSubItemsChange: PropTypes.func,
  onCustomizationInputChange: PropTypes.func,
  onSelectedFlavorsChange: PropTypes.func,
  onSelectedToppingsChange: PropTypes.func,
  onSelectedDiscountFlavorsChange: PropTypes.func,
  onSelectedDiscountToppingsChange: PropTypes.func,
  onSelectedDiscountCustomizationInputChange: PropTypes.func,
  onSelectedDiscountComboSidesChange: PropTypes.func,
  onSelectedDiscountSubItemsChange: PropTypes.func,
  onSelectedComboSidesChange: PropTypes.func,
};

const styles = StyleSheet.create({
  actionSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginRight: -10,
  },
  actionSheetTitle: {
    fontFamily: Mulish700,
    fontSize: 20,
    color: AppColor.text,
  },
  actionSheetScrollContent: {
    flexGrow: 1,
  },
  actionSheetImageCarousel: {
    borderRadius: 10,
    marginBottom: 16,
    overflow: "hidden",
  },
  placeholderImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  actionSheetPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  actionSheetPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionSheetPrice: {
    fontFamily: Mulish700,
    fontSize: 18,
    color: AppColor.primary,
  },
  actionSheetStrikePrice: {
    fontFamily: Mulish400,
    fontSize: 14,
    color: AppColor.text,
    textDecorationLine: "line-through",
  },
  actionSheetFoodTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  prepTimeText: {
    fontSize: 14,
    fontFamily: Mulish400,
    color: AppColor.textPlaceholder,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  newBadge: {
    fontFamily: Mulish400,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 20,
    color: AppColor.white,
    backgroundColor: AppColor.orderProgressbar,
  },
  popularBadge: {
    fontFamily: Mulish400,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 20,
    color: AppColor.white,
    backgroundColor: AppColor.primary,
  },
  comboBadge: {
    fontFamily: Mulish400,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 20,
    color: AppColor.primary,
    backgroundColor: AppColor.lightGreenBG,
  },
  actionSheetSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Mulish700,
    color: AppColor.text,
    marginBottom: 4,
  },
  bogoSectionHeading: {
    fontSize: 17,
    fontFamily: Mulish700,
    color: AppColor.text,
    marginBottom: 10,
  },
  buyGetCard: {
    backgroundColor: "#FFF8F3",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F5E6DC",
    padding: 14,
    marginBottom: 14,
  },
  buyGetCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 8,
  },
  buyGetCardTitle: {
    fontFamily: Mulish700,
    fontSize: 15,
    color: AppColor.text,
  },
  promoNamePill: {
    backgroundColor: AppColor.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  promoNamePillText: {
    fontFamily: Mulish600,
    fontSize: 12,
    color: AppColor.white,
  },
  buyGetNumbersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  buyGetQtyBlock: {
    flex: 1,
    alignItems: "center",
    backgroundColor: AppColor.white,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: AppColor.border,
  },
  buyGetQtyBlockGet: {
    borderColor: AppColor.primary,
    backgroundColor: "#FFF0E6",
  },
  buyGetQtyLabel: {
    fontFamily: Mulish600,
    fontSize: 11,
    color: AppColor.textHighlighter,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  buyGetQtyValue: {
    fontFamily: Mulish700,
    fontSize: 28,
    color: AppColor.text,
    lineHeight: 32,
  },
  buyGetQtyUnit: {
    fontFamily: Mulish400,
    fontSize: 12,
    color: AppColor.textHighlighter,
    marginTop: 2,
  },
  buyGetArrow: {
    marginHorizontal: 6,
  },
  buyGetExplanation: {
    fontFamily: Mulish400,
    fontSize: 13,
    color: AppColor.text,
    lineHeight: 20,
  },
  buyGetRepeatHint: {
    fontFamily: Mulish400,
    fontSize: 12,
    color: AppColor.textHighlighter,
    marginTop: 8,
    fontStyle: "italic",
  },
  rewardRowsHeading: {
    fontFamily: Mulish600,
    fontSize: 14,
    color: AppColor.text,
    marginBottom: 8,
  },
  rewardRowMeta: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
    minWidth: 56,
  },
  rewardRowPrice: {
    fontFamily: Mulish600,
    fontSize: 13,
    color: AppColor.primary,
    textAlign: "right",
  },
  descriptionText: {
    fontSize: 15,
    fontFamily: Mulish400,
    color: AppColor.text,
    lineHeight: 22,
  },
  rowInfo: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionSheetDescription: {
    fontFamily: Mulish400,
    fontSize: 14,
    color: AppColor.text,
  },
  dietContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dietBadge: {
    fontFamily: Mulish400,
    fontSize: 13,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    color: AppColor.text,
    backgroundColor: AppColor.lightGreenBG,
  },
  subItemRowContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  subItemImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  subItemName: {
    fontSize: 14,
    fontFamily: Mulish700,
    color: AppColor.text,
  },
  subItemDescription: {
    fontSize: 14,
    fontFamily: Mulish400,
    color: AppColor.textHighlighter,
  },
  subItemPrice: {
    fontFamily: Mulish600,
    fontSize: 16,
    color: AppColor.primary,
  },
  childCustomizationBox: {
    marginTop: -4,
    marginBottom: 10,
    marginLeft: 12,
    padding: 10,
    borderLeftWidth: 2,
    borderLeftColor: AppColor.primary,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
  },
  childOptionGroup: {
    marginBottom: 8,
  },
  childOptionTitle: {
    fontFamily: Mulish600,
    fontSize: 13,
    color: AppColor.text,
    marginBottom: 4,
  },
  qtyMultiplier: {
    fontFamily: Mulish600,
    fontSize: 16,
    color: AppColor.primary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: AppColor.primary,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  flavorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: AppColor.border,
  },
  plainSplitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  plainSplitText: {
    flex: 1,
    fontFamily: Mulish600,
    fontSize: 14,
    color: AppColor.text,
  },
  flavorName: {
    flex: 1,
    fontFamily: Mulish600,
    fontSize: 15,
    color: AppColor.text,
  },
  optionCheckboxArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  optionCost: {
    fontFamily: Mulish600,
    fontSize: 13,
    color: AppColor.primary,
  },
  flavorToggleGroup: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: AppColor.primary,
    borderRadius: 8,
    overflow: "hidden",
  },
  flavorToggleButton: {
    minWidth: 54,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColor.white,
  },
  flavorToggleButtonActive: {
    backgroundColor: AppColor.primary,
  },
  flavorToggleText: {
    fontFamily: Mulish600,
    fontSize: 13,
    color: AppColor.primary,
  },
  flavorToggleTextActive: {
    color: AppColor.white,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  qtySelector: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColor.primary,
  },
  qtyBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  qtyBtnText: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.primary,
  },
  qtyText: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.text,
    marginHorizontal: 10,
  },
  addButton: {
    backgroundColor: AppColor.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  addButtonDisabled: {
    backgroundColor: AppColor.textHighlighter,
    opacity: 0.6,
  },
  addButtonText: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.white,
  },
  customizationButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColor.border,
    backgroundColor: "#f9f9f9",
  },
  customizationContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  customizationText: {
    flex: 1,
    fontFamily: Mulish400,
    fontSize: 14,
    color: AppColor.text,
  },
  customizationPlaceholder: {
    color: AppColor.textPlaceholder,
  },
  customizationModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginRight: -10,
  },
  modalTitle: {
    fontFamily: Mulish700,
    fontSize: 18,
    color: AppColor.text,
  },
  doneButton: {
    backgroundColor: AppColor.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  doneButtonText: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.white,
  },
});

export default DishItemDetailsModal;
