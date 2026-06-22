import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator as NativeIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "react-native-paper";
import StatusBarManager from "../components/StatusBarManager";
import AppImage from "../components/AppImage";
import { AppColor, Mulish400, Mulish600, Mulish700 } from "../utils/theme";
import { getAllFoodItem_API, getFoodtruckDetail_API } from "../api/appAPI";
import {
  addItemToPosOrder,
  clearPosOrder,
  removeItemFromPosOrder,
  updatePosItemProperty,
} from "../redux/slices/posOrderSlice";

const getOptions = (item, type) => {
  const optionsKey = `${type}Options`;
  const legacyKey = type === "flavor" ? "flavors" : "toppings";
  const rawOptions =
    Array.isArray(item?.[optionsKey]) && item[optionsKey].length > 0
      ? item[optionsKey]
      : item?.[legacyKey];

  if (!Array.isArray(rawOptions)) {
    return [];
  }

  return rawOptions
    .map((option) =>
      typeof option === "string"
        ? { name: option, cost: 0 }
        : {
            name: option?.name || option?.label,
            cost: Number(option?.cost || option?.price || 0) || 0,
          }
    )
    .filter((option) => option.name);
};

const VendorPosMenuScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.userReducer);
  const order = useSelector((state) => state.posOrderReducer.currentOrder);

  const [loading, setLoading] = useState(true);
  const [foodTruck, setFoodTruck] = useState(user?.foodTruck || null);
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [customizationInput, setCustomizationInput] = useState("");
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [guestPhone, setGuestPhone] = useState("");

  const foodTruckId = user?.foodTruck?._id;
  const isEmployeeSession =
    user?.userType === "EMPLOYEE" || user?.role === "EMPLOYEE";

  const cartItemById = useMemo(() => {
    return order.items.reduce((acc, item) => {
      acc[item._id] = item;
      return acc;
    }, {});
  }, [order.items]);

  const loadData = useCallback(async () => {
    if (!foodTruckId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [truckResponse, itemsResponse] = await Promise.all([
        isEmployeeSession
          ? Promise.resolve(null)
          : getFoodtruckDetail_API(foodTruckId),
        getAllFoodItem_API(),
      ]);

      if (truckResponse?.success && truckResponse?.data?.foodtruck) {
        setFoodTruck(truckResponse.data.foodtruck);
      }

      if (itemsResponse?.success && itemsResponse?.data?.menuList) {
        setItems(itemsResponse.data.menuList.filter((item) => item.available));
      }
    } catch (error) {
      Alert.alert("POS unavailable", error?.message || "Could not load menu.");
    } finally {
      setLoading(false);
    }
  }, [foodTruckId, isEmployeeSession]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addItem = (item) => {
    const currentQty = cartItemById[item._id]?.quantity || 0;
    const maxQty = item.maxQty ?? 100;

    if (currentQty >= maxQty) {
      Alert.alert("Quantity limit reached", `Maximum quantity is ${maxQty}.`);
      return;
    }

    dispatch(
      addItemToPosOrder({
        foodTruckId,
        foodTruckName: foodTruck?.name,
        foodTruckLogo: foodTruck?.logo,
        item,
      })
    );
  };

  const openOptions = (item) => {
    const existing = cartItemById[item._id];
    setSelectedItem(item);
    setCustomizationInput(existing?.customizationInput || "");
    setSelectedFlavors(existing?.selectedFlavors || []);
    setSelectedToppings(existing?.selectedToppings || []);
  };

  const toggleSelection = (value, selectedValues, setSelectedValues, maxCount) => {
    if (selectedValues.includes(value)) {
      setSelectedValues(selectedValues.filter((item) => item !== value));
      return;
    }

    if (selectedValues.length >= maxCount) {
      Alert.alert("Selection limit", `Choose up to ${maxCount}.`);
      return;
    }

    setSelectedValues([...selectedValues, value]);
  };

  const saveOptions = () => {
    if (!selectedItem) {
      return;
    }

    if (!cartItemById[selectedItem._id]) {
      addItem(selectedItem);
    }

    dispatch(
      updatePosItemProperty({
        itemId: selectedItem._id,
        keyName: "customizationInput",
        value: customizationInput,
      })
    );
    dispatch(
      updatePosItemProperty({
        itemId: selectedItem._id,
        keyName: "selectedFlavors",
        value: selectedFlavors,
      })
    );
    dispatch(
      updatePosItemProperty({
        itemId: selectedItem._id,
        keyName: "selectedToppings",
        value: selectedToppings,
      })
    );

    setSelectedItem(null);
  };

  const goToCheckout = () => {
    if (order.items.length === 0) {
      Alert.alert("Empty cart", "Add at least one item.");
      return;
    }

    const currentLocation = isEmployeeSession
      ? user?.assignedLocation
      : foodTruck?.locations?.find(
          (location) => location._id === foodTruck?.currentLocation
        ) || foodTruck?.locations?.[0];
    const activeTruckUnits = (foodTruck?.truck_units || []).filter(
      (unit) => !unit.is_archived
    );
    const currentTruckUnit = isEmployeeSession
      ? user?.assignedTruckUnit || null
      : activeTruckUnits.find((unit) =>
          (unit.open_locations || []).some(
            (openLocation) =>
              openLocation.locationId?.toString() ===
                currentLocation?._id?.toString() && openLocation.isOrderingOpen
          )
        ) ||
        activeTruckUnits.find((unit) => unit.is_primary) ||
        activeTruckUnits[0] ||
        null;

    if (!currentLocation?._id) {
      Alert.alert(
        "Location required",
        "Set a serving location before creating a POS order."
      );
      return;
    }

    navigation.navigate("vendorPosCheckoutScreen", {
      foodTruck,
      location: currentLocation,
      truckUnit: currentTruckUnit,
      guestPhone: guestPhone.trim(),
    });
  };

  const renderItem = ({ item }) => {
    const cartItem = cartItemById[item._id];
    const quantity = cartItem?.quantity || 0;
    const hasOptions = item.hasFlavors || item.hasToppings || item.allowCustomize;

    return (
      <View style={styles.menuItem}>
        <AppImage
          uri={item.imgUrls?.[0]}
          containerStyle={styles.itemImage}
          resizeMode="cover"
        />
        <View style={styles.itemBody}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text numberOfLines={2} style={styles.itemDescription}>
            {item.description || "Menu item"}
          </Text>
          <Text style={styles.itemPrice}>${Number(item.price || 0).toFixed(2)}</Text>
          {hasOptions ? (
            <TouchableOpacity onPress={() => openOptions(item)}>
              <Text style={styles.optionLink}>Options</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => dispatch(removeItemFromPosOrder({ itemId: item._id }))}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => addItem(item)}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const flavorOptions = getOptions(selectedItem, "flavor");
  const toppingOptions = getOptions(selectedItem, "topping");

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Takeout POS</Text>
        <IconButton icon="refresh" onPress={loadData} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <NativeIndicator color={AppColor.primary} size="large" />
        </View>
      ) : (
        <>
          <View style={styles.guestBox}>
            <Text style={styles.sectionTitle}>Walk-up customer</Text>
            <TextInput
              style={styles.phoneInput}
              value={guestPhone}
              onChangeText={setGuestPhone}
              keyboardType="phone-pad"
              placeholder="Optional phone number"
              placeholderTextColor={AppColor.gray}
            />
          </View>

          <FlatList
            data={items}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No available menu items.</Text>
            }
          />

          {order.totalItems > 0 ? (
            <View style={[styles.cartBar, { paddingBottom: insets.bottom || 12 }]}>
              <View>
                <Text style={styles.cartTitle}>
                  {order.totalItems} {order.totalItems === 1 ? "item" : "items"}
                </Text>
                <Text style={styles.cartSubtitle}>
                  ${Number(order.subtotal || 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.cartActions}>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => dispatch(clearPosOrder())}
                >
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.checkoutButton} onPress={goToCheckout}>
                  <Text style={styles.checkoutButtonText}>Checkout</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </>
      )}

      <Modal
        visible={!!selectedItem}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>{selectedItem?.name}</Text>
              {selectedItem?.allowCustomize ? (
                <>
                  <Text style={styles.optionTitle}>Notes</Text>
                  <TextInput
                    style={[styles.phoneInput, styles.notesInput]}
                    value={customizationInput}
                    onChangeText={setCustomizationInput}
                    multiline
                    placeholder="Optional kitchen note"
                  />
                </>
              ) : null}

              {flavorOptions.length > 0 ? (
                <>
                  <Text style={styles.optionTitle}>Flavors</Text>
                  {flavorOptions.map((option) => (
                    <Pressable
                      key={option.name}
                      style={[
                        styles.optionChip,
                        selectedFlavors.includes(option.name) && styles.optionChipActive,
                      ]}
                      onPress={() =>
                        toggleSelection(
                          option.name,
                          selectedFlavors,
                          setSelectedFlavors,
                          selectedItem?.flavorsPerOrder || 1
                        )
                      }
                    >
                      <Text style={styles.optionChipText}>
                        {option.name}
                        {option.cost ? ` +$${option.cost.toFixed(2)}` : ""}
                      </Text>
                    </Pressable>
                  ))}
                </>
              ) : null}

              {toppingOptions.length > 0 ? (
                <>
                  <Text style={styles.optionTitle}>Toppings</Text>
                  {toppingOptions.map((option) => (
                    <Pressable
                      key={option.name}
                      style={[
                        styles.optionChip,
                        selectedToppings.includes(option.name) && styles.optionChipActive,
                      ]}
                      onPress={() =>
                        toggleSelection(
                          option.name,
                          selectedToppings,
                          setSelectedToppings,
                          selectedItem?.toppingsPerOrder || 1
                        )
                      }
                    >
                      <Text style={styles.optionChipText}>
                        {option.name}
                        {option.cost ? ` +$${option.cost.toFixed(2)}` : ""}
                      </Text>
                    </Pressable>
                  ))}
                </>
              ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSelectedItem(null)}
              >
                <Text style={styles.clearButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.checkoutButton} onPress={saveOptions}>
                <Text style={styles.checkoutButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default VendorPosMenuScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColor.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: AppColor.border,
  },
  headerTitle: {
    fontFamily: Mulish700,
    fontSize: 20,
    color: AppColor.black,
  },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  guestBox: { padding: 16, borderBottomWidth: 1, borderBottomColor: AppColor.border },
  sectionTitle: { fontFamily: Mulish700, fontSize: 16, marginBottom: 8 },
  phoneInput: {
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    minHeight: 44,
    fontFamily: Mulish400,
    color: AppColor.black,
  },
  listContent: { paddingBottom: 120 },
  menuItem: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColor.border,
  },
  itemImage: { width: 72, height: 72, borderRadius: 6 },
  itemBody: { flex: 1 },
  itemName: { fontFamily: Mulish700, fontSize: 16, color: AppColor.black },
  itemDescription: { fontFamily: Mulish400, fontSize: 13, color: AppColor.gray, marginTop: 4 },
  itemPrice: { fontFamily: Mulish600, fontSize: 14, marginTop: 6 },
  optionLink: { color: AppColor.primary, fontFamily: Mulish600, marginTop: 6 },
  quantityControls: { alignItems: "center", justifyContent: "center", gap: 8 },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColor.primary,
  },
  quantityButtonText: { color: AppColor.white, fontSize: 20, lineHeight: 22 },
  quantityText: { fontFamily: Mulish700, fontSize: 16 },
  cartBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: AppColor.white,
    borderTopWidth: 1,
    borderTopColor: AppColor.border,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cartTitle: { fontFamily: Mulish700, fontSize: 15 },
  cartSubtitle: { fontFamily: Mulish400, fontSize: 14, marginTop: 2 },
  cartActions: { flexDirection: "row", gap: 10 },
  clearButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 6,
  },
  clearButtonText: { fontFamily: Mulish600, color: AppColor.black },
  checkoutButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColor.primary,
    borderRadius: 6,
  },
  checkoutButtonText: { fontFamily: Mulish700, color: AppColor.white },
  emptyText: { padding: 16, fontFamily: Mulish400, color: AppColor.gray },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    maxHeight: "80%",
    backgroundColor: AppColor.white,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
  },
  modalTitle: { fontFamily: Mulish700, fontSize: 20, marginBottom: 12 },
  optionTitle: { fontFamily: Mulish700, fontSize: 15, marginTop: 14, marginBottom: 8 },
  notesInput: { minHeight: 80, textAlignVertical: "top", paddingTop: 10 },
  optionChip: {
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  optionChipActive: { borderColor: AppColor.primary, backgroundColor: "#F4FFF8" },
  optionChipText: { fontFamily: Mulish600, color: AppColor.black },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12 },
});
