import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import ActionSheet from "react-native-actions-sheet";
import AntDesign from "react-native-vector-icons/AntDesign";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AppColor, Mulish700, Mulish400, Mulish600 } from "../utils/theme";
import AppImage from "./AppImage";

const ComboItemsActionSheet = ({
  actionSheetRef,
  selectedMenus: initialSelectedMenus = [],
  menuList = [],
  onClose,
  onSelectionChange,
  limit,
}) => {
  // Internal state management
  const [expandedCategories, setExpandedCategories] = useState({});
  const [internalSelectedMenus, setInternalSelectedMenus] = useState([]);
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  // Use ref to track visibility
  const isVisibleRef = useRef(false);

  // Sync internal state with props
  useEffect(() => {
    setInternalSelectedMenus(initialSelectedMenus);
  }, [initialSelectedMenus]);

  // Set up visibility tracking
  useEffect(() => {
    const setupListener = () => {
      if (actionSheetRef.current) {
        // Manually track visibility since ActionSheet doesn't provide event listeners
        isVisibleRef.current = true;
        setIsSheetVisible(true);

        return () => {
          isVisibleRef.current = false;
          setIsSheetVisible(false);
        };
      } else {
        setTimeout(setupListener, 100);
      }
    };

    setupListener();

    return () => {
      isVisibleRef.current = false;
      setIsSheetVisible(false);
    };
  }, []);

  // Group menus by their category
  const groupMenusByCategory = useCallback(
    (allowedCategories = []) => {
      const grouped = {};

      menuList.forEach((menu) => {
        // Check if category exists and if its name is in the allowedCategories array
        if (
          menu.category &&
          menu.category.name &&
          allowedCategories.includes(menu.category.name)
        ) {
          if (!grouped[menu.category._id]) {
            grouped[menu.category._id] = {
              categoryId: menu.category._id,
              categoryName: menu.category.name,
              items: [],
            };
          }
          grouped[menu.category._id].items.push(menu);
        }
      });

      return grouped;
    },
    [menuList]
  );

  // Toggle category expansion
  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Handle item selection
  const handleItemSelect = (item) => {
    if (
      !internalSelectedMenus.some((selected) => selected._id === item._id) &&
      item?.hasDiscount &&
      ["BOGO", "BOGOHO"].includes(item?.discountType)
    ) {
      Alert.alert(
        "Invalid Combo Item",
        "Please choose another item - Discount items are not valid for Combos"
      );
      return;
    }
    setInternalSelectedMenus((prev) => {
      const isSelected = prev.some((selected) => selected._id === item._id);

      // If item is already selected, allow removal regardless of limit
      if (isSelected) {
        const newSelection = prev.filter(
          (selected) => selected._id !== item._id
        );

        // Immediately notify parent component of the change
        if (onSelectionChange) {
          setTimeout(() => onSelectionChange(newSelection), 0);
        }

        return newSelection;
      }

      // Check if limit is defined and if we've reached the limit
      if (limit !== undefined && prev.length >= limit) {
        // Don't add new item if limit is reached
        console.log(`Selection limit of ${limit} items reached`);
        return prev;
      }

      // Add the new item
      const newSelection = [...prev, { ...item, quantity: 1 }];

      // Immediately notify parent component of the change
      if (onSelectionChange) {
        setTimeout(() => onSelectionChange(newSelection), 0);
      }

      return newSelection;
    });
  };

  // Handle done button press
  const handleDone = () => {
    console.log("Selected items:", internalSelectedMenus);
    if (onSelectionChange) {
      onSelectionChange(internalSelectedMenus);
    }
    if (onClose) {
      onClose(internalSelectedMenus);
    }
    setIsSheetVisible(false);
    actionSheetRef.current?.hide();
  };

  // Handle close button press
  const handleClose = () => {
    setIsSheetVisible(false);
    actionSheetRef.current?.hide();
  };

  return (
    <ActionSheet
      ref={actionSheetRef}
      headerAlwaysVisible={true}
      gestureEnabled={true}
      containerStyle={styles.actionSheetContainer}
      onClose={() => setIsSheetVisible(false)}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Items</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={handleClose}>
            <AntDesign name="close" size={24} color={AppColor.text} />
          </TouchableOpacity>
        </View>

        {internalSelectedMenus.length > 0 && (
          <View style={styles.selectedItemsContainer}>
            <Text style={styles.selectedItemsTitle}>
              Selected Items ({internalSelectedMenus.length}
              {limit !== undefined ? `/${limit}` : ""})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {internalSelectedMenus.map((item) => (
                <View key={item._id} style={styles.selectedItemCard}>
                  <AppImage
                    uri={item.imgUrls?.[0]}
                    containerStyle={styles.selectedItemImage}
                  />
                  <Text style={styles.selectedItemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <TouchableOpacity
                    hitSlop={5}
                    activeOpacity={0.7}
                    style={styles.removeItemButton}
                    onPress={() => handleItemSelect(item)}
                  >
                    <AntDesign name="close" size={12} color={AppColor.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {menuList.length === 0 ? (
          <View style={styles.emptyMenuContainer}>
            <Ionicons
              name="fast-food-outline"
              size={48}
              color={AppColor.border}
              style={styles.emptyMenuIcon}
            />
            <Text style={styles.emptyMenuText}>
              No menu items available to add to combo
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {Object.entries(
              groupMenusByCategory([
                "Individual",
                "Sides",
                "Desserts",
                "Beverages",
              ])
            ).map(([categoryId, categoryData]) => (
              <View key={categoryId} style={styles.categoryContainer}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => toggleCategory(categoryId)}
                  style={styles.categoryHeader}
                >
                  <Text style={styles.categoryTitle}>
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
                  <View style={styles.categoryItemsContainer}>
                    {categoryData.items.map((item) => (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        key={item._id}
                        onPress={() => handleItemSelect(item)}
                        style={styles.menuItemRow}
                      >
                        <AppImage
                          uri={item.imgUrls?.[0]}
                          containerStyle={styles.menuItemImage}
                        />
                        <View style={styles.menuItemDetails}>
                          <Text style={styles.menuItemName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text
                            style={styles.menuItemDescription}
                            numberOfLines={2}
                          >
                            {item.description}
                          </Text>
                          <Text style={styles.menuItemPrice}>
                            ${item.price.toFixed(2)}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.selectionIndicator,
                            internalSelectedMenus.some(
                              (selected) => selected._id === item._id
                            ) && styles.selectionIndicatorActive,
                            limit !== undefined &&
                              internalSelectedMenus.length >= limit &&
                              !internalSelectedMenus.some(
                                (selected) => selected._id === item._id
                              ) &&
                              styles.selectionIndicatorDisabled,
                          ]}
                        >
                          {internalSelectedMenus.some(
                            (selected) => selected._id === item._id
                          ) ? (
                            <AntDesign
                              name="check"
                              size={16}
                              color={AppColor.white}
                            />
                          ) : limit !== undefined &&
                            internalSelectedMenus.length >= limit ? (
                            <AntDesign
                              name="lock"
                              size={16}
                              color={AppColor.border}
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
            ))}
          </ScrollView>
        )}

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleDone}
          style={styles.doneButton}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </ActionSheet>
  );
};

// ... styles remain the same ...
const styles = StyleSheet.create({
  actionSheetContainer: {
    backgroundColor: AppColor.white,
    height: "90%",
  },
  container: {
    padding: 16,
    paddingBottom: 0,
    height: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Mulish700,
    color: AppColor.text,
  },
  selectedItemsContainer: {
    backgroundColor: AppColor.primary + "20",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  selectedItemsTitle: {
    fontFamily: Mulish600,
    color: AppColor.primary,
    marginBottom: 8,
  },
  selectedItemCard: {
    backgroundColor: AppColor.white,
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectedItemImage: {
    width: 30,
    height: 30,
    borderRadius: 4,
  },
  selectedItemName: {
    fontFamily: Mulish400,
    fontSize: 12,
    maxWidth: 100,
  },
  removeItemButton: {
    backgroundColor: AppColor.primary,
    borderRadius: 12,
    padding: 4,
  },
  emptyMenuContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    flex: 1,
  },
  emptyMenuIcon: {
    marginBottom: 16,
  },
  emptyMenuText: {
    fontFamily: Mulish400,
    color: AppColor.textHighlighter,
    textAlign: "center",
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColor.border,
  },
  categoryTitle: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.text,
  },
  categoryItemsContainer: {
    marginTop: 8,
  },
  menuItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColor.border + "50",
  },
  menuItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  menuItemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  menuItemName: {
    fontFamily: Mulish600,
    fontSize: 14,
    color: AppColor.text,
  },
  menuItemDescription: {
    fontFamily: Mulish400,
    fontSize: 12,
    color: AppColor.textHighlighter,
    marginTop: 4,
  },
  menuItemPrice: {
    fontFamily: Mulish600,
    fontSize: 14,
    color: AppColor.primary,
    marginTop: 4,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColor.border,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  selectionIndicatorActive: {
    borderColor: AppColor.primary,
    backgroundColor: AppColor.primary,
  },
  selectionIndicatorDisabled: {
    borderColor: AppColor.border,
    backgroundColor: AppColor.border + "30",
  },
  doneButton: {
    backgroundColor: AppColor.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
  },
  doneButtonText: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.white,
  },
});

export default memo(ComboItemsActionSheet);
