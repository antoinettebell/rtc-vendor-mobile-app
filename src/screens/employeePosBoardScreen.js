import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import AppImage from "../components/AppImage";
import { onSignOut } from "../redux/slices/authSlice";
import {
  clearUserSlice,
} from "../redux/slices/userSlice";
import { clearFoodTruckProfileSlice } from "../redux/slices/foodTruckProfileSlice";
import { clearPushNotificationRedux } from "../redux/slices/pushNotificationSlice";
import {
  clearPosOrder,
  addItemToPosOrder,
  removeItemFromPosOrder,
  updatePosItemProperty,
} from "../redux/slices/posOrderSlice";
import {
  endEmployeeSession_API,
  getEmployeeOrders_API,
  getAllFoodItem_API,
  getEmployeeDashboard_API,
  getRefundCancelRequests_API,
  submitRefundCancelRequest_API,
  updateOrderStatusByID_API,
} from "../api/appAPI";
import { printOrderTickets } from "../helpers/print.helper";
import { getVendorOrderTotal } from "../helpers/order.helper";
import { orderStatusStrings } from "../utils/constants";
import { AppColor, Mulish400, Mulish600, Mulish700 } from "../utils/theme";

const ORDER_TABS = [
  {
    label: "Open",
    value: "PENDING",
    statuses: [orderStatusStrings.placed, orderStatusStrings.accepted],
  },
  {
    label: "Preparing",
    value: orderStatusStrings.preparing,
    statuses: [orderStatusStrings.preparing],
  },
  {
    label: "Pending Pickup",
    value: orderStatusStrings.ready_for_pickup,
    statuses: [orderStatusStrings.ready_for_pickup],
  },
  {
    label: "Picked Up",
    value: orderStatusStrings.driver_picked_up,
    statuses: [orderStatusStrings.driver_picked_up],
  },
  {
    label: "Completed",
    value: orderStatusStrings.completed,
    statuses: [orderStatusStrings.completed],
  },
];

const REQUEST_REASONS = [
  "customer changed mind",
  "wrong item entered",
  "duplicate order",
  "payment issue",
  "food unavailable",
  "customer complaint",
  "other",
];

const formatMoney = (value) => {
  const amount = Number(value);
  return `$${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`;
};

const formatDateTime = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getOptions = (item, type) => {
  const optionsKey = `${type}Options`;
  const legacyKey = type === "flavor" ? "flavors" : "toppings";
  const rawOptions =
    Array.isArray(item?.[optionsKey]) && item[optionsKey].length > 0
      ? item[optionsKey]
      : item?.[legacyKey];

  if (!Array.isArray(rawOptions)) return [];

  return rawOptions
    .map((option) =>
      typeof option === "string"
        ? { name: option, cost: 0 }
        : {
            name: option?.name || option?.label,
            cost: Number(option?.cost || option?.price || 0) || 0,
          },
    )
    .filter((option) => option.name);
};

const getItemCategory = (item) =>
  item?.category?.name ||
  item?.categoryId?.name ||
  item?.categoryId?.categoriesId?.name ||
  "Other";

const getNextEmployeeStatus = (status) => {
  if (
    [orderStatusStrings.placed, orderStatusStrings.accepted].includes(status)
  ) {
    return orderStatusStrings.preparing;
  }
  if (status === orderStatusStrings.preparing) {
    return orderStatusStrings.ready_for_pickup;
  }
  if (status === orderStatusStrings.ready_for_pickup) {
    return orderStatusStrings.completed;
  }
  return null;
};

const getNextStatusLabel = (status) => {
  const next = getNextEmployeeStatus(status);
  if (next === orderStatusStrings.preparing) return "Start Preparing";
  if (next === orderStatusStrings.ready_for_pickup) return "Mark Ready";
  if (next === orderStatusStrings.completed) return "Complete";
  return null;
};

const EmployeePosBoardScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.userReducer.user);
  const order = useSelector((state) => state.posOrderReducer.currentOrder);

  const [dashboard, setDashboard] = useState(null);
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedOrderTab, setSelectedOrderTab] = useState(ORDER_TABS[1].value);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [customizationInput, setCustomizationInput] = useState("");
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [selectedDiscountFlavors, setSelectedDiscountFlavors] = useState([]);
  const [selectedDiscountToppings, setSelectedDiscountToppings] = useState([]);
  const [selectedSubItems, setSelectedSubItems] = useState([]);
  const [guestPhone, setGuestPhone] = useState("");
  const [requestModalOrder, setRequestModalOrder] = useState(null);
  const [requestType, setRequestType] = useState("REFUND");
  const [reasonCode, setReasonCode] = useState(REQUEST_REASONS[0]);
  const [employeeNotes, setEmployeeNotes] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  const foodTruck = user?.foodTruck;
  const assignedLocation = user?.assignedLocation;
  const assignedTruckUnit = dashboard?.assignedTruckUnit || user?.assignedTruckUnit;
  const capabilities = user?.employeeCapabilities || {};
  const canTapToPay = false;
  const canUsePos = !!capabilities.employeeWalkUpPos;
  const isWorking =
    !!user?.employee_session_id && dashboard?.shift?.is_active !== false;

  const displayedLocation = dashboard?.assignedLocation || assignedLocation;
  const employeeName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Employee";

  const categories = useMemo(() => {
    const names = Array.from(new Set(items.map(getItemCategory))).sort();
    return ["All", ...names];
  }, [items]);

  const visibleItems = useMemo(
    () =>
      (selectedCategory === "All"
        ? items
        : items.filter((item) => getItemCategory(item) === selectedCategory)
      ).filter((item) => item.available !== false),
    [items, selectedCategory],
  );

  const cartItemById = useMemo(
    () =>
      order.items.reduce((acc, item) => {
        acc[item._id] = item;
        return acc;
      }, {}),
    [order.items],
  );

  const selectedTabStatuses =
    ORDER_TABS.find((tab) => tab.value === selectedOrderTab)?.statuses || [];
  const filteredOrders = orders.filter((item) =>
    selectedTabStatuses.includes(item.orderStatus),
  );
  const dailyStatusGroups = useMemo(
    () =>
      [
        {
          label: "Open",
          orders: orders.filter(
            (item) =>
              ![
                orderStatusStrings.completed,
                orderStatusStrings.driver_picked_up,
              ].includes(item.orderStatus) && item.paymentStatus !== "REFUNDED",
          ),
        },
        {
          label: "Completed",
          orders: orders.filter(
            (item) => item.orderStatus === orderStatusStrings.completed,
          ),
        },
        {
          label: "Pending Pickup",
          orders: orders.filter(
            (item) => item.orderStatus === orderStatusStrings.ready_for_pickup,
          ),
        },
        {
          label: "Picked Up",
          orders: orders.filter(
            (item) => item.orderStatus === orderStatusStrings.driver_picked_up,
          ),
        },
        {
          label: "Refunds",
          orders: orders.filter((item) => item.paymentStatus === "REFUNDED"),
        },
      ].map((group) => ({
        ...group,
        ticketNumbers: group.orders
          .map((item) => item?.orderNumber || item?._id)
          .filter(Boolean),
      })),
    [orders],
  );

  const loadDashboard = useCallback(async () => {
    const response = await getEmployeeDashboard_API();
    if (response?.success && response?.data?.dashboard) {
      setDashboard(response.data.dashboard);
    }
  }, []);

  const loadMenu = useCallback(async () => {
    const response = await getAllFoodItem_API();
    if (response?.success && response?.data?.menuList) {
      setItems(response.data.menuList.filter((item) => item.available !== false));
    }
  }, []);

  const loadOrders = useCallback(async () => {
    const response = await getEmployeeOrders_API();
    if (response?.success && response?.data?.orderList) {
      setOrders(response.data.orderList);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    const response = await getRefundCancelRequests_API();
    if (response?.success && response?.data?.requests) {
      setRequests(response.data.requests);
    }
  }, []);

  const refreshBoard = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDashboard(),
        loadMenu(),
        loadOrders(),
        loadRequests(),
      ]);
    } catch (error) {
      Alert.alert(
        "POS unavailable",
        error?.message || "Could not load POS board.",
      );
    } finally {
      setLoading(false);
    }
  }, [loadDashboard, loadMenu, loadOrders, loadRequests]);

  useFocusEffect(
    useCallback(() => {
      refreshBoard();
    }, [refreshBoard]),
  );

  useEffect(() => {
    if (!canUsePos) {
      Alert.alert(
        "POS unavailable",
        "This vendor plan does not include employee walk-up POS.",
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
    }
  }, [canUsePos, navigation]);

  const handleSignOut = async () => {
    try {
      await endEmployeeSession_API();
    } catch (error) {}

    dispatch(clearPosOrder());
    dispatch(clearUserSlice());
    dispatch(clearFoodTruckProfileSlice());
    dispatch(clearPushNotificationRedux());
    dispatch(onSignOut());
  };

  const addItem = (item) => {
    if (!isWorking) {
      Alert.alert("Off duty", "Go on duty before creating walk-up orders.");
      return;
    }
    if (!item.available) {
      Alert.alert(
        "Item unavailable",
        "Mark this item active before adding it.",
      );
      return;
    }
    const currentQty = cartItemById[item._id]?.quantity || 0;
    const maxQty = item.maxQty ?? 100;
    if (currentQty >= maxQty) {
      Alert.alert("Quantity limit reached", `Maximum quantity is ${maxQty}.`);
      return;
    }
    dispatch(
      addItemToPosOrder({
        foodTruckId: foodTruck?._id,
        foodTruckName: foodTruck?.name,
        foodTruckLogo: foodTruck?.logo,
        item,
      }),
    );
  };

  const openOptions = (item) => {
    const existing = cartItemById[item._id] || item;
    setSelectedItem(item);
    setCustomizationInput(existing?.customizationInput || "");
    setSelectedFlavors(existing?.selectedFlavors || []);
    setSelectedToppings(existing?.selectedToppings || []);
    setSelectedDiscountFlavors(existing?.selectedDiscountFlavors || []);
    setSelectedDiscountToppings(existing?.selectedDiscountToppings || []);
    setSelectedSubItems(existing?.selectedSubItems || []);
  };

  const toggleSelection = (
    value,
    selectedValues,
    setSelectedValues,
    maxCount,
  ) => {
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

  const toggleSubItem = (subItem) => {
    const itemId = subItem?._id || subItem?.menuItem?._id;
    if (!itemId) return;
    const exists = selectedSubItems.some(
      (item) => (item?._id || item?.menuItem?._id) === itemId,
    );
    if (exists) {
      setSelectedSubItems(
        selectedSubItems.filter(
          (item) => (item?._id || item?.menuItem?._id) !== itemId,
        ),
      );
      return;
    }
    setSelectedSubItems([...selectedSubItems, subItem.menuItem || subItem]);
  };

  const saveOptions = () => {
    if (!selectedItem) return;
    if (!cartItemById[selectedItem._id]) {
      addItem(selectedItem);
    }
    [
      ["customizationInput", customizationInput],
      ["selectedFlavors", selectedFlavors],
      ["selectedToppings", selectedToppings],
      ["selectedDiscountFlavors", selectedDiscountFlavors],
      ["selectedDiscountToppings", selectedDiscountToppings],
      ["selectedSubItems", selectedSubItems],
    ].forEach(([keyName, value]) => {
      dispatch(
        updatePosItemProperty({ itemId: selectedItem._id, keyName, value }),
      );
    });
    setSelectedItem(null);
  };

  const goToCheckout = () => {
    if (!isWorking) {
      Alert.alert("Off duty", "Go on duty before checkout.");
      return;
    }
    if (order.items.length === 0) {
      Alert.alert("Empty cart", "Add at least one item.");
      return;
    }
    if (!assignedLocation?._id) {
      Alert.alert(
        "Location required",
        "Employee assigned location is unavailable.",
      );
      return;
    }
    navigation.navigate("vendorPosCheckoutScreen", {
      foodTruck,
      location: assignedLocation,
      truckUnit: assignedTruckUnit,
      guestPhone: guestPhone.trim(),
      returnScreen: "employeePosBoardScreen",
    });
  };

  const updateOrderStatus = async (orderItem, nextStatus) => {
    setActionLoadingId(orderItem?._id);
    try {
      const response = await updateOrderStatusByID_API({
        order_id: orderItem?._id,
        payload: { orderStatus: nextStatus },
      });
      if (response?.success) {
        await Promise.all([loadOrders(), loadDashboard()]);
      }
    } catch (error) {
      Alert.alert(
        "Order update failed",
        error?.message || "Could not update order.",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const getOrderRequest = useCallback(
    (orderId) =>
      requests.find(
        (request) =>
          request.order_id?.toString?.() === orderId?.toString?.() ||
          request.order_id === orderId,
      ),
    [requests],
  );

  const openRequestModal = (orderItem) => {
    const existingRequest = getOrderRequest(orderItem?._id);
    if (existingRequest) {
      Alert.alert(
        "Request already submitted",
        `Status: ${existingRequest.request_status}${
          existingRequest.vendor_response_notes
            ? `\n\nVendor note: ${existingRequest.vendor_response_notes}`
            : ""
        }`,
      );
      return;
    }
    setRequestModalOrder(orderItem);
    setRequestType("REFUND");
    setReasonCode(REQUEST_REASONS[0]);
    setEmployeeNotes("");
  };

  const submitRequest = async () => {
    if (!requestModalOrder?._id) return;
    setRequestSubmitting(true);
    try {
      const response = await submitRefundCancelRequest_API({
        order_id: requestModalOrder._id,
        request_type: requestType,
        reason_code: reasonCode,
        employee_notes: employeeNotes,
      });
      await Promise.all([loadDashboard(), loadRequests()]);
      setRequestModalOrder(null);
      Alert.alert(
        response?.data?.existing ? "Existing request" : "Request submitted",
        response?.data?.existing
          ? "This order already has a refund/cancel request."
          : "The vendor has been notified for review.",
      );
    } catch (error) {
      Alert.alert(
        "Request failed",
        error?.message || "Could not submit request.",
      );
    } finally {
      setRequestSubmitting(false);
    }
  };

  const renderMenuItem = ({ item }) => {
    const quantity = cartItemById[item._id]?.quantity || 0;
    const hasOptions =
      item.allowCustomize ||
      item.hasFlavors ||
      item.hasToppings ||
      item.itemType === "COMBO" ||
      ["BOGO", "BOGOHO"].includes(item.discountType);

    return (
      <View
        style={[styles.menuItem, !item.available && styles.menuItemInactive]}
      >
        <AppImage
          uri={item.imgUrls?.[0]}
          containerStyle={styles.itemImage}
          resizeMode="cover"
        />
        <View style={styles.itemBody}>
          <View style={styles.itemTitleRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemPrice}>{formatMoney(item.price)}</Text>
          </View>
          <Text numberOfLines={2} style={styles.itemDescription}>
            {getItemCategory(item)}
            {item.description ? ` | ${item.description}` : ""}
          </Text>
          <View style={styles.itemActions}>
            {hasOptions ? (
              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => openOptions(item)}
              >
                <Text style={styles.optionButtonText}>Options</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() =>
              dispatch(removeItemFromPosOrder({ itemId: item._id }))
            }
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={[
              styles.quantityButton,
              !item.available && styles.quantityDisabled,
            ]}
            disabled={!item.available}
            onPress={() => addItem(item)}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderOrder = ({ item }) => {
    const nextStatus = getNextEmployeeStatus(item.orderStatus);
    const nextLabel = getNextStatusLabel(item.orderStatus);
    const existingRequest = getOrderRequest(item?._id);

    return (
      <View style={styles.orderCard}>
        {existingRequest ? (
          <Text style={styles.requestStatusNotice}>
            Request {existingRequest.request_status.toLowerCase()}
          </Text>
        ) : null}
        <View style={styles.orderHeader}>
          <Text style={styles.orderTitle}>
            Order #{item?.orderNumber || item?._id}
          </Text>
          <Text style={styles.orderStatus}>{item?.orderStatus}</Text>
        </View>
        <Text style={styles.orderMeta}>
          {(item?.items || []).length} items |{" "}
          {formatMoney(getVendorOrderTotal(item))}
        </Text>
        <View style={styles.orderActions}>
          <TouchableOpacity
            style={styles.secondarySmall}
            onPress={() => printOrderTickets([item])}
          >
            <MaterialCommunityIcons
              name="printer"
              size={17}
              color={AppColor.black}
            />
            <Text style={styles.secondarySmallText}>Print</Text>
          </TouchableOpacity>
          {nextStatus ? (
            <TouchableOpacity
              style={styles.primarySmall}
              disabled={actionLoadingId === item?._id}
              onPress={() => updateOrderStatus(item, nextStatus)}
            >
              <Text style={styles.primarySmallText}>
                {actionLoadingId === item?._id ? "Updating..." : nextLabel}
              </Text>
            </TouchableOpacity>
          ) : null}
          {item.orderStatus !== orderStatusStrings.completed ? (
            <TouchableOpacity
              style={styles.dangerSmall}
              onPress={() => openRequestModal(item)}
            >
              <Text style={styles.dangerSmallText}>Refund/Cancel</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  const flavorOptions = getOptions(selectedItem, "flavor");
  const toppingOptions = getOptions(selectedItem, "topping");
  const comboItems = Array.isArray(selectedItem?.subItem)
    ? selectedItem.subItem
    : [];
  const hasDiscountFlavorChoices =
    ["BOGO", "BOGOHO"].includes(selectedItem?.discountType) &&
    selectedItem?.bogoItems?.some((item) => item?.isSameItem);

  if (!canUsePos) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color={AppColor.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        animationType="slide"
        transparent
        visible={!!selectedItem}
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
                    style={[styles.input, styles.notesInput]}
                    value={customizationInput}
                    onChangeText={setCustomizationInput}
                    multiline
                    placeholder="Optional kitchen note"
                    placeholderTextColor={AppColor.gray}
                  />
                </>
              ) : null}
              {comboItems.length > 0 ? (
                <>
                  <Text style={styles.optionTitle}>Combo Items</Text>
                  {comboItems.map((subItem) => {
                    const menuItem = subItem.menuItem || subItem;
                    const selected = selectedSubItems.some(
                      (item) => item?._id === menuItem?._id,
                    );
                    return (
                      <Pressable
                        key={menuItem?._id}
                        style={[
                          styles.optionChip,
                          selected && styles.optionChipActive,
                        ]}
                        onPress={() => toggleSubItem(menuItem)}
                      >
                        <Text style={styles.optionChipText}>
                          {menuItem?.name}
                        </Text>
                      </Pressable>
                    );
                  })}
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
                        selectedFlavors.includes(option.name) &&
                          styles.optionChipActive,
                      ]}
                      onPress={() =>
                        toggleSelection(
                          option.name,
                          selectedFlavors,
                          setSelectedFlavors,
                          selectedItem?.flavorsPerOrder || 1,
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
                        selectedToppings.includes(option.name) &&
                          styles.optionChipActive,
                      ]}
                      onPress={() =>
                        toggleSelection(
                          option.name,
                          selectedToppings,
                          setSelectedToppings,
                          selectedItem?.toppingsPerOrder || 1,
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
              {hasDiscountFlavorChoices && flavorOptions.length > 0 ? (
                <>
                  <Text style={styles.optionTitle}>Discount Item Flavors</Text>
                  {flavorOptions.map((option) => (
                    <Pressable
                      key={`discount-${option.name}`}
                      style={[
                        styles.optionChip,
                        selectedDiscountFlavors.includes(option.name) &&
                          styles.optionChipActive,
                      ]}
                      onPress={() =>
                        toggleSelection(
                          option.name,
                          selectedDiscountFlavors,
                          setSelectedDiscountFlavors,
                          selectedItem?.flavorsPerOrder || 1,
                        )
                      }
                    >
                      <Text style={styles.optionChipText}>{option.name}</Text>
                    </Pressable>
                  ))}
                </>
              ) : null}
              {hasDiscountFlavorChoices && toppingOptions.length > 0 ? (
                <>
                  <Text style={styles.optionTitle}>Discount Item Toppings</Text>
                  {toppingOptions.map((option) => (
                    <Pressable
                      key={`discount-topping-${option.name}`}
                      style={[
                        styles.optionChip,
                        selectedDiscountToppings.includes(option.name) &&
                          styles.optionChipActive,
                      ]}
                      onPress={() =>
                        toggleSelection(
                          option.name,
                          selectedDiscountToppings,
                          setSelectedDiscountToppings,
                          selectedItem?.toppingsPerOrder || 1,
                        )
                      }
                    >
                      <Text style={styles.optionChipText}>{option.name}</Text>
                    </Pressable>
                  ))}
                </>
              ) : null}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setSelectedItem(null)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={saveOptions}
              >
                <Text style={styles.primaryButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={!!requestModalOrder}
        onRequestClose={() => setRequestModalOrder(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Refund/Cancel Request</Text>
            <Text style={styles.modalMeta}>
              Order #{requestModalOrder?.orderNumber || requestModalOrder?._id}
            </Text>
            <View style={styles.segmentRow}>
              {["REFUND", "CANCEL"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.segmentButton,
                    requestType === type && styles.segmentButtonSelected,
                  ]}
                  onPress={() => setRequestType(type)}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      requestType === type && styles.segmentButtonTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.optionTitle}>Reason</Text>
            <View style={styles.reasonWrap}>
              {REQUEST_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonChip,
                    reasonCode === reason && styles.reasonChipSelected,
                  ]}
                  onPress={() => setReasonCode(reason)}
                >
                  <Text
                    style={[
                      styles.reasonChipText,
                      reasonCode === reason && styles.reasonChipTextSelected,
                    ]}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.optionTitle}>Notes</Text>
            <TextInput
              multiline
              value={employeeNotes}
              onChangeText={setEmployeeNotes}
              placeholder="Optional notes"
              placeholderTextColor={AppColor.gray}
              style={[styles.input, styles.notesInput]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setRequestModalOrder(null)}
              >
                <Text style={styles.secondaryButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                disabled={requestSubmitting}
                onPress={submitRequest}
              >
                <Text style={styles.primaryButtonText}>
                  {requestSubmitting ? "Submitting..." : "Submit"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

        <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={AppColor.black}
          />
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <Text style={styles.kicker}>Employee POS</Text>
          <Text style={styles.title}>{employeeName}</Text>
          <Text style={styles.locationText}>
            {displayedLocation?.title ||
              displayedLocation?.address ||
              "Assigned location"}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshBoard} />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.shiftBar}>
          <View style={styles.statusGrid}>
            {dailyStatusGroups.map((group) => (
              <View key={group.label} style={styles.statusCard}>
                <Text style={styles.shiftLabel}>{group.label}</Text>
                <Text style={styles.statusCount}>{group.orders.length}</Text>
                <Text style={styles.ticketText} numberOfLines={2}>
                  {group.ticketNumbers.length
                    ? group.ticketNumbers.map((number) => `#${number}`).join(", ")
                    : "No tickets"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Walk-up Ordering</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === category &&
                      styles.categoryChipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <FlatList
            data={visibleItems}
            keyExtractor={(item) => item._id}
            renderItem={renderMenuItem}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No menu items.</Text>
            }
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cart / Payment</Text>
          <TextInput
            style={styles.input}
            value={guestPhone}
            onChangeText={setGuestPhone}
            keyboardType="phone-pad"
            placeholder="Optional customer phone"
            placeholderTextColor={AppColor.gray}
          />
          {order.items.length === 0 ? (
            <Text style={styles.emptyText}>Cart is empty.</Text>
          ) : (
            order.items.map((item) => (
              <View key={item._id} style={styles.cartItem}>
                <Text style={styles.cartItemName}>
                  {item.quantity}x {item.name}
                </Text>
                <Text style={styles.cartItemMeta}>
                  {[
                    item.selectedFlavors?.join(", "),
                    item.selectedToppings?.join(", "),
                  ]
                    .filter(Boolean)
                    .join(" | ")}
                </Text>
              </View>
            ))
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatMoney(order.subtotal)}</Text>
          </View>
          <View style={styles.paymentActions}>
            <TouchableOpacity
              style={[
                styles.payButton,
                (!isWorking || order.items.length === 0) &&
                  styles.disabledButton,
              ]}
              disabled={!isWorking || order.items.length === 0}
              onPress={goToCheckout}
            >
              <Text style={styles.payButtonText}>Cash</Text>
            </TouchableOpacity>
            {canTapToPay ? (
              <TouchableOpacity
                style={[
                  styles.payButton,
                  (!isWorking || order.items.length === 0) &&
                    styles.disabledButton,
                ]}
                disabled={!isWorking || order.items.length === 0}
                onPress={goToCheckout}
              >
                <Text style={styles.payButtonText}>Tap to Pay</Text>
              </TouchableOpacity>
            ) : null}
            {order.items.length > 0 ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => dispatch(clearPosOrder())}
              >
                <Text style={styles.secondaryButtonText}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Order Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {ORDER_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.value}
                style={[
                  styles.categoryChip,
                  selectedOrderTab === tab.value && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedOrderTab(tab.value)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedOrderTab === tab.value &&
                      styles.categoryChipTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <FlatList
            data={filteredOrders}
            keyExtractor={(item) => item._id}
            renderItem={renderOrder}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No orders in this status.</Text>
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EmployeePosBoardScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    alignItems: "center",
    backgroundColor: AppColor.white,
    borderBottomColor: AppColor.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    alignItems: "center",
    borderColor: AppColor.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    marginRight: 10,
    width: 38,
  },
  headerTextBlock: { flex: 1, marginRight: 12 },
  kicker: { color: AppColor.primary, fontFamily: Mulish700, fontSize: 12 },
  title: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 21,
    marginTop: 2,
  },
  locationText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    borderColor: AppColor.border,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: { color: AppColor.black, fontFamily: Mulish700, fontSize: 13 },
  content: { padding: 14, paddingBottom: 32 },
  shiftBar: {
    backgroundColor: AppColor.white,
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusCard: {
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 92,
    padding: 10,
  },
  statusCount: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 24,
    marginTop: 4,
  },
  ticketText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 11,
    marginTop: 4,
  },
  shiftMeta: {
    borderBottomColor: AppColor.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  shiftLabel: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish600,
    fontSize: 12,
  },
  shiftValue: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 12,
    textAlign: "right",
  },
  shiftActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  shiftButton: {
    alignItems: "center",
    borderColor: AppColor.border,
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
  },
  shiftButtonActive: {
    backgroundColor: AppColor.primary,
    borderColor: AppColor.primary,
  },
  shiftButtonText: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 13,
  },
  shiftButtonTextActive: { color: AppColor.white },
  section: {
    backgroundColor: AppColor.white,
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  sectionTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 18,
    marginBottom: 10,
  },
  categoryScroll: { marginBottom: 10 },
  categoryChip: {
    borderColor: AppColor.border,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryChipActive: {
    backgroundColor: AppColor.primary,
    borderColor: AppColor.primary,
  },
  categoryChipText: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 12,
  },
  categoryChipTextActive: { color: AppColor.white },
  menuItem: {
    borderTopColor: AppColor.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingVertical: 12,
  },
  menuItemInactive: { opacity: 0.62 },
  itemImage: { borderRadius: 6, height: 64, width: 64 },
  itemBody: { flex: 1 },
  itemTitleRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  itemName: {
    color: AppColor.black,
    flex: 1,
    fontFamily: Mulish700,
    fontSize: 15,
  },
  itemPrice: { color: AppColor.black, fontFamily: Mulish700, fontSize: 13 },
  itemDescription: {
    color: AppColor.gray,
    fontFamily: Mulish400,
    fontSize: 12,
    marginTop: 4,
  },
  itemActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  pillButton: {
    borderColor: AppColor.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillButtonActive: { borderColor: AppColor.primary },
  pillButtonText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish700,
    fontSize: 11,
  },
  pillButtonTextActive: { color: AppColor.primary },
  optionButton: { paddingHorizontal: 4, paddingVertical: 5 },
  optionButtonText: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 12,
  },
  quantityControls: { alignItems: "center", justifyContent: "center", gap: 7 },
  quantityButton: {
    alignItems: "center",
    backgroundColor: AppColor.primary,
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  quantityDisabled: { backgroundColor: AppColor.gray },
  quantityButtonText: { color: AppColor.white, fontSize: 20, lineHeight: 22 },
  quantityText: { color: AppColor.black, fontFamily: Mulish700, fontSize: 15 },
  input: {
    borderColor: AppColor.border,
    borderRadius: 6,
    borderWidth: 1,
    color: AppColor.black,
    fontFamily: Mulish400,
    minHeight: 42,
    paddingHorizontal: 10,
  },
  cartItem: {
    borderBottomColor: AppColor.border,
    borderBottomWidth: 1,
    paddingVertical: 9,
  },
  cartItemName: { color: AppColor.black, fontFamily: Mulish700, fontSize: 14 },
  cartItemMeta: {
    color: AppColor.gray,
    fontFamily: Mulish400,
    fontSize: 12,
    marginTop: 3,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  totalLabel: { color: AppColor.black, fontFamily: Mulish700, fontSize: 16 },
  totalValue: { color: AppColor.black, fontFamily: Mulish700, fontSize: 16 },
  paymentActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 14,
  },
  payButton: {
    alignItems: "center",
    backgroundColor: AppColor.primary,
    borderRadius: 6,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  payButtonText: { color: AppColor.white, fontFamily: Mulish700, fontSize: 14 },
  disabledButton: { opacity: 0.5 },
  secondaryButton: {
    alignItems: "center",
    borderColor: AppColor.border,
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 13,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: AppColor.primary,
    borderRadius: 6,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 14,
  },
  orderCard: {
    borderTopColor: AppColor.border,
    borderTopWidth: 1,
    paddingVertical: 12,
  },
  orderHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderTitle: {
    color: AppColor.black,
    flex: 1,
    fontFamily: Mulish700,
    fontSize: 14,
    marginRight: 8,
  },
  orderStatus: { color: AppColor.primary, fontFamily: Mulish700, fontSize: 11 },
  orderMeta: {
    color: AppColor.gray,
    fontFamily: Mulish400,
    fontSize: 12,
    marginTop: 5,
  },
  orderActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  secondarySmall: {
    alignItems: "center",
    borderColor: AppColor.border,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  secondarySmallText: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 12,
  },
  primarySmall: {
    alignItems: "center",
    backgroundColor: AppColor.primary,
    borderRadius: 6,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  primarySmallText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 12,
  },
  dangerSmall: {
    alignItems: "center",
    borderColor: "#DC2626",
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  dangerSmallText: { color: "#DC2626", fontFamily: Mulish700, fontSize: 12 },
  requestStatusNotice: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 12,
    marginBottom: 6,
  },
  emptyText: {
    color: AppColor.gray,
    fontFamily: Mulish400,
    fontSize: 13,
    paddingVertical: 14,
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: AppColor.white,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    maxHeight: "86%",
    padding: 16,
  },
  modalTitle: { color: AppColor.black, fontFamily: Mulish700, fontSize: 19 },
  modalMeta: {
    color: AppColor.gray,
    fontFamily: Mulish400,
    fontSize: 12,
    marginTop: 4,
  },
  optionTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 14,
    marginBottom: 8,
    marginTop: 14,
  },
  notesInput: { minHeight: 78, paddingTop: 10, textAlignVertical: "top" },
  optionChip: {
    borderColor: AppColor.border,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
    padding: 11,
  },
  optionChipActive: {
    backgroundColor: "#F4FFF8",
    borderColor: AppColor.primary,
  },
  optionChipText: {
    color: AppColor.black,
    fontFamily: Mulish600,
    fontSize: 13,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 14,
  },
  segmentRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  segmentButton: {
    alignItems: "center",
    borderColor: AppColor.border,
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    minHeight: 38,
    justifyContent: "center",
  },
  segmentButtonSelected: {
    backgroundColor: AppColor.primary,
    borderColor: AppColor.primary,
  },
  segmentButtonText: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 12,
  },
  segmentButtonTextSelected: { color: AppColor.white },
  reasonWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reasonChip: {
    borderColor: AppColor.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reasonChipSelected: {
    backgroundColor: AppColor.primary,
    borderColor: AppColor.primary,
  },
  reasonChipText: {
    color: AppColor.black,
    fontFamily: Mulish600,
    fontSize: 12,
  },
  reasonChipTextSelected: { color: AppColor.white },
});
