import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator as NativeIndicator,
  Modal,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import StatusBarManager from "../components/StatusBarManager";
import FastImage from "@d11/react-native-fast-image";
import CustomBanner from "../components/CustomBanner";
import {
  getBankDetail_API,
  getEarningForHomeByFoodTruckID_API,
  getOrderList_API,
  getUserDetail_API,
  updateLocationOrdering_API,
  updateFcmToken_API,
  updateOrderStatusByID_API,
} from "../api/appAPI";
import {
  setBankStatus,
  setProfileStatus,
  setUser,
  updateFoodTruck,
} from "../redux/slices/userSlice";
import LabeledSwitch from "../components/LabeledSwitch";
import { useSharedValue } from "react-native-reanimated";
import { Dropdown } from "react-native-element-dropdown";
import { showSnackbar } from "../redux/slices/snackbarSlice";
import { maybeShowComplianceError } from "../helpers/compliance.helper";
import { ActivityIndicator, Divider } from "react-native-paper";
import moment from "moment";
import { useFocusEffect } from "@react-navigation/native";
import {
  foodTypeStrings,
  orderStatusStrings,
  PROFILE_AVATAR,
  vendorProfileStatus,
} from "../utils/constants";
import { checkInstallationId } from "../helpers/notification.helper";
import { getMessaging } from "@react-native-firebase/messaging";
import {
  extractAdvanceOrderLocationAndTime,
  getDisabledStatuses,
  getVendorOrderTotal,
  isVendorPosOrder,
} from "../helpers/order.helper";
import AppImage from "../components/AppImage";
import { clearCurrentNotificationOrder } from "../redux/slices/pushNotificationSlice";

const QuickStatsComponent = ({ title, subTitle, icon, onPress }) => (
  <Pressable style={styles.quickStatsContainer} onPress={onPress}>
    <View style={styles.quickStatsTextContainer}>
      <Text numberOfLines={1} style={styles.quickStatsTitle}>
        {title}
      </Text>
      <Text numberOfLines={1} style={styles.quickStatsSubTitle}>
        {subTitle}
      </Text>
    </View>
    <FastImage source={icon} style={styles.quickStatsIcon} />
  </Pressable>
);

const HomeScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { user, profileStatus, bankStatus } = useSelector(
    (state) => state.userReducer
  );

  const HEADER_HEIGHT = 60;
  const totalHeaderHeight = insets.top + HEADER_HEIGHT;

  const [bannerLoading, setBannerLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedTruckUnit, setSelectedTruckUnit] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [newOrderLoading, setNewOrderLoading] = useState(false);
  const [newOrderData, setNewOrderData] = useState(null);
  const [earningData, setEarningData] = useState(null);
  const [orderRejectBtnLoading, setOrderRejectBtnLoading] = useState(false);
  const [orderAcceptBtnLoading, setOrderAcceptBtnLoading] = useState(false);
  const [locationTimeAdvanceData, setLocationTimeAdvanceData] = useState(null);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const { currentOrderId, orderQueue } = useSelector(
    (state) => state.pushNotificationReducer,
  );
  const pendingNotificationOrders = [
    currentOrderId,
    ...(Array.isArray(orderQueue) ? orderQueue : []),
  ].filter(Boolean);

  const isOn = useSharedValue(false);
  const isEmployeeSession =
    user?.userType === "EMPLOYEE" || user?.role === "EMPLOYEE";
  const activeTruckUnits = useMemo(() => {
    const units = (user?.foodTruck?.truck_units || []).filter(
      (unit) => !unit.is_archived
    );

    if (units.length) {
      return units.map((unit, index) => ({
        ...unit,
        label: unit.name || `Truck ${index + 1}`,
        value: unit._id,
      }));
    }

    return [
      {
        _id: null,
        value: null,
        label: user?.foodTruck?.name || "Truck 1",
        name: user?.foodTruck?.name || "Truck 1",
        is_primary: true,
        open_locations: user?.foodTruck?.currentLocation
          ? [
              {
                locationId: user.foodTruck.currentLocation,
                isOrderingOpen: true,
              },
            ]
          : [],
      },
    ];
  }, [user?.foodTruck]);

  const selectedTruck = useMemo(
    () =>
      activeTruckUnits.find(
        (unit) => unit.value?.toString() === selectedTruckUnit?.toString()
      ) || activeTruckUnits[0],
    [activeTruckUnits, selectedTruckUnit]
  );

  const isSelectedPairOpen = useCallback(
    (truck = selectedTruck, locationId = selectedLocation) =>
      !!truck &&
      !!locationId &&
      (truck.open_locations || []).some(
        (loc) =>
          loc.locationId?.toString() === locationId?.toString() &&
          loc.isOrderingOpen
      ),
    [selectedLocation, selectedTruck]
  );
  const getTruckOpenLocationId = useCallback((truck) => {
    const openLocation = (truck?.open_locations || []).find(
      (loc) => loc.isOrderingOpen
    );
    return openLocation?.locationId || null;
  }, []);

  const getLocationTitleById = useCallback(
    (locationId) => {
      const location = (user?.foodTruck?.locations || []).find(
        (loc) => loc._id?.toString() === locationId?.toString()
      );
      return location?.title || "the current open location";
    },
    [user?.foodTruck?.locations]
  );

  const getTruckDefaultLocationId = useCallback(
    (truck) =>
      getTruckOpenLocationId(truck) ||
      selectedLocation ||
      user?.foodTruck?.currentLocation ||
      (user?.foodTruck?.locations || [])[0]?._id ||
      null,
    [getTruckOpenLocationId, selectedLocation, user?.foodTruck]
  );

  // Location Switch
  const handlePress = async () => {
    if (!selectedLocation && !isOn.value) {
      Alert.alert("Please select a location");
      return;
    }

    const temp_isOn = isOn.value;
    const temp_isOpen = isOpen;
    const openLocationId = getTruckOpenLocationId(selectedTruck);

    if (
      !temp_isOpen &&
      openLocationId &&
      openLocationId?.toString() !== selectedLocation?.toString()
    ) {
      Alert.alert(
        "Close Current Location",
        `${selectedTruck?.label || "This truck"} is already open at ${getLocationTitleById(
          openLocationId
        )}. Please close that location before opening a new one.`
      );
      return;
    }

    isOn.value = !temp_isOn;
    setIsOpen(!temp_isOpen);

    try {
      const foodtruck_id = user?.foodTruck?._id;
      const response = await updateLocationOrdering_API({
        foodtruck_id,
        location_id: selectedLocation,
        truck_unit_id: selectedTruck?._id || null,
        isOrderingOpen: !temp_isOpen,
      });
      if (response?.success && response.data) {
        console.log("response => ", response);
        dispatch(updateFoodTruck(response.data.foodtruck));

        dispatch(
          showSnackbar({
            message: `${selectedTruck?.label || "Truck"} is ${
              !temp_isOpen ? "open" : "closed"
            }`,
            type: "success",
          })
        );
      }
    } catch (error) {
      console.log("error => ", error);
      isOn.value = temp_isOn;
      setIsOpen(temp_isOpen);
      if (maybeShowComplianceError(error, navigation)) {
        return;
      }
      dispatch(
        showSnackbar({
          message: error.message || "Something went wrong!",
          type: "error",
        })
      );
    } finally {
    }
  };

  const getUserDataFromAPI = async () => {
    setBannerLoading(true);
    try {
      const user_id = user._id;
      const response = await getUserDetail_API(user_id);
      if (response?.success && response.data) {
        console.log("response => ", response);
        dispatch(setUser(response.data.user));
      }

      if (user?.foodTruck?._id) {
        const earningData = await getEarningForHomeByFoodTruckID_API(
          user?.foodTruck?._id
        );
        console.log("earningData => ", earningData);
        if (earningData?.success && earningData.data) {
          setEarningData(earningData.data.vendorHomeData);
        }
      }

      if (!bankStatus) {
        try {
          const response = await getBankDetail_API();
          if (response?.success) {
            if (response?.data?.bankDetail) {
              dispatch(setBankStatus(true));
            } else {
              dispatch(setBankStatus(false));
            }
          }
        } catch (error) {
          console.log("bank data fetch error => ", error);
        }
      }
    } catch (error) {
      console.log("error => ", error);
    } finally {
      setBannerLoading(false);
    }
  };

  const handleLocationChange = (selected) => {
    console.log("selected => ", selected);
    setSelectedLocation(selected?._id);
  };

  const handleTruckUnitChange = (selected) => {
    const nextTruck =
      activeTruckUnits.find(
        (unit) => unit.value?.toString() === selected?.value?.toString()
      ) || activeTruckUnits[0];
    setSelectedTruckUnit(selected?.value || null);
    setSelectedLocation(getTruckDefaultLocationId(nextTruck));
  };

  // Handle "accept" press
  const handleAcceptPress = async (order) => {
    if (
      getDisabledStatuses(newOrderData?.orderStatus).includes(
        orderStatusStrings.accepted
      )
    ) {
      return;
    }

    setOrderAcceptBtnLoading(true);
    try {
      const response = await updateOrderStatusByID_API({
        order_id: order?._id,
        payload: {
          orderStatus: "ACCEPTED",
        },
      });
      console.log("response => ", response);
      if (response?.success && response?.data) {
        dispatch(
          showSnackbar({
            type: "success",
            message: "Order status updated successfully",
          })
        );
        getOrderDataFromAPI(); // to checking for new order.
      }
    } catch (error) {
      console.log("error => ", error);
      dispatch(
        showSnackbar({
          type: "error",
          message: "Something went wrong!",
        })
      );
    } finally {
      setOrderAcceptBtnLoading(false);
    }
  };

  // Handle "reject" press
  const handleRejectOrderPress = (order) => {
    if (
      getDisabledStatuses(newOrderData?.orderStatus).includes(
        orderStatusStrings.rejected
      )
    ) {
      return;
    }

    Alert.alert(
      "Reject Order!",
      "Are you sure you want to reject this order?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setOrderRejectBtnLoading(true);
            try {
              const response = await updateOrderStatusByID_API({
                order_id: order?._id,
                payload: {
                  orderStatus: "REJECTED",
                },
              });
              console.log("response => ", response);
              if (response?.success && response?.data) {
                dispatch(
                  showSnackbar({
                    type: "success",
                    message: "Order status updated successfully",
                  })
                );
                getOrderDataFromAPI(); // to checking for new order.
              }
            } catch (error) {
              console.log("error => ", error);
              dispatch(
                showSnackbar({
                  type: "error",
                  message: "Something went wrong!",
                })
              );
            } finally {
              setOrderRejectBtnLoading(false);
            }
          },
        },
      ]
    );
  };

  // new order data API
  const getOrderDataFromAPI = async () => {
    setNewOrderLoading(true);
    try {
      const response = await getOrderList_API({
        limit: 1,
        status: orderStatusStrings.placed,
      });
      console.log("reponse => ", response);
      if (
        response?.success &&
        response?.data &&
        response?.data?.orderList?.length &&
        response?.data?.orderList[0]?.orderStatus === orderStatusStrings.placed
      ) {
        setNewOrderData(response.data.orderList[0]);
        setLocationTimeAdvanceData(
          extractAdvanceOrderLocationAndTime(response.data.orderList[0])
        );
      } else {
        setNewOrderData(null);
        setLocationTimeAdvanceData(null);
      }
    } catch (error) {
      console.log("error => ", error);
      dispatch(
        showSnackbar({
          type: "error",
          message: error.message,
        })
      );
    } finally {
      setNewOrderLoading(false);
    }
  };

  // Fetch new order data on focus
  useFocusEffect(
    useCallback(() => {
      getOrderDataFromAPI();
      getUserDataFromAPI(); // to refresh the active location data
    }, [])
  );

  useEffect(() => {
    const unsubscribe = getMessaging().onTokenRefresh(async (newToken) => {
      console.log("FCM-Token Refreshed =>", newToken);

      const deviceId = await checkInstallationId();
      if (!deviceId) return;

      try {
        const payload = { token: newToken };
        const response = await updateFcmToken_API({ deviceId, payload });
        console.log("response => ", response);
      } catch (error) {
        console.log("error => ", error);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    dispatch(setProfileStatus(user?.requestStatus));
  }, [user?.requestStatus]);

  useEffect(() => {
    setLocations(user?.foodTruck?.locations || []);
    const activeUnit =
      activeTruckUnits.find(
        (unit) => unit.value?.toString() === selectedTruckUnit?.toString()
      ) || activeTruckUnits[0];
    const openLocationId = getTruckOpenLocationId(activeUnit);

    if (
      activeUnit &&
      activeUnit.value?.toString() !== selectedTruckUnit?.toString()
    ) {
      setSelectedTruckUnit(activeUnit.value || null);
    }

    setSelectedLocation((current) => {
      const stillExists = (user?.foodTruck?.locations || []).some(
        (location) => location._id?.toString() === current?.toString()
      );
      if (stillExists) return current;
      return openLocationId || user?.foodTruck?.currentLocation || null;
    });
  }, [user?.foodTruck, activeTruckUnits, getTruckOpenLocationId]);

  useEffect(() => {
    const pairOpen = isSelectedPairOpen();
    isOn.value = pairOpen;
    setIsOpen(pairOpen);
  }, [isSelectedPairOpen]);

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header */}
      <View
        style={[
          styles.headerContainer,
          { height: totalHeaderHeight, paddingTop: insets.top },
        ]}
      >
        <View style={styles.headerLeftContainer}>
          {user?.foodTruck?.logo ? (
            <AppImage
              uri={user?.foodTruck?.logo}
              containerStyle={styles.headerLogo}
            />
          ) : (
            <View
              style={{
                height: 44,
                width: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: AppColor.primary,
                overflow: "hidden",
              }}
            >
              <FontAwesome6
                name="truck-fast"
                color={AppColor.white}
                size={24}
              />
            </View>
          )}
          <Text numberOfLines={1} style={styles.headerTitle}>
            {user?.foodTruck?.name || ""}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.headerRightContainer}
          onPress={() => setNotificationsVisible(true)}
        >
          <MaterialCommunityIcons
            name="bell-circle"
            size={38}
            color={AppColor.primary}
          />
          {pendingNotificationOrders.length ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {pendingNotificationOrders.length}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
        {false && (
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.headerRightContainer}
          >
            <MaterialCommunityIcons
              name="bell-circle"
              size={38}
              color={AppColor.primary}
            />
          </TouchableOpacity>
        )}
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={notificationsVisible}
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View style={styles.notificationOverlay}>
          <View style={styles.notificationCard}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setNotificationsVisible(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={22}
                  color={AppColor.black}
                />
              </TouchableOpacity>
            </View>
            {pendingNotificationOrders.length ? (
              pendingNotificationOrders.map((orderId) => (
                <TouchableOpacity
                  key={orderId}
                  style={styles.notificationRow}
                  onPress={() => {
                    setNotificationsVisible(false);
                    navigation.navigate("orderDetailsScreen", { orderId });
                  }}
                >
                  <Text style={styles.notificationRowTitle}>New order</Text>
                  <Text style={styles.notificationRowMeta}>Order #{orderId}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.notificationEmpty}>No notifications right now.</Text>
            )}
            {pendingNotificationOrders.length ? (
              <TouchableOpacity
                style={styles.acknowledgeButton}
                onPress={() => {
                  pendingNotificationOrders.forEach(() =>
                    dispatch(clearCurrentNotificationOrder()),
                  );
                  setNotificationsVisible(false);
                }}
              >
                <Text style={styles.acknowledgeButtonText}>Acknowledge all</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Banner for pending status */}
      <CustomBanner
        visible={profileStatus === vendorProfileStatus.pending}
        initialOffsetY={totalHeaderHeight}
        actions={[
          {
            label: "Refresh",
            loading: bannerLoading,
            onPress: getUserDataFromAPI,
          },
        ]}
      >
        {"Your vendor profile is under review."}
      </CustomBanner>

      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {profileStatus === vendorProfileStatus.approved ? (
          <>
            {/* Location and Switch */}
              <View style={styles.locationSwitchContainer}>
                {activeTruckUnits.length > 1 ? (
                  <View style={styles.dropdownContainer}>
                    <Dropdown
                      data={activeTruckUnits}
                      labelField="label"
                      valueField="value"
                      value={selectedTruckUnit}
                      onChange={handleTruckUnitChange}
                      placeholder="Select Truck"
                      style={styles.dropdown}
                      placeholderStyle={styles.dropdownPlaceholder}
                      itemTextStyle={styles.dropdownItemText}
                      selectedTextStyle={styles.dropdownSelectedText}
                    />
                  </View>
                ) : null}
                <View style={styles.dropdownContainer}>
                  <Dropdown
                    data={locations}
                  labelField="title"
                  valueField="_id"
                  value={selectedLocation}
                  onChange={(selected) => handleLocationChange(selected)}
                  placeholder="Select Location"
                  style={styles.dropdown}
                  placeholderStyle={styles.dropdownPlaceholder}
                  itemTextStyle={styles.dropdownItemText}
                  selectedTextStyle={styles.dropdownSelectedText}
                  disable={isEmployeeSession && isOpen}
                />
                <Pressable
                  onPress={() => {
                    if (isEmployeeSession && isOpen) {
                      Alert.alert(
                        "Cannot Change Location",
                        "Please close the food truck first to change location"
                      );
                    }
                  }}
                  style={[
                    styles.dropdownOverlay,
                    { display: isEmployeeSession && isOpen ? "flex" : "none" },
                  ]}
                />
              </View>
              <View style={styles.switchContainer}>
                <LabeledSwitch value={isOn} onPress={handlePress} />
                <Text style={styles.switchText}>
                  {isOpen ? "Open" : "Closed"}
                </Text>
              </View>
            </View>

            {/* Order & Stats */}
            <View style={styles.content}>
              {/* New Order */}
              {newOrderLoading ? (
                <View
                  style={{
                    paddingVertical: 50,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <NativeIndicator size="small" color={AppColor.primary} />
                </View>
              ) : newOrderData ? (
                <View style={styles.newOrderContainer}>
                  {/* title */}
                  <View style={styles.sectionTitleContainer}>
                    <Text style={styles.sectionTitle}>{"New Order"}</Text>
                  </View>
                  <Divider />
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.orderDetailsContainer}
                    onPress={() =>
                      navigation.navigate("orderDetailsScreen", {
                        orderId: newOrderData?._id,
                      })
                    }
                  >
                    {locationTimeAdvanceData?.advanceOrder ? (
                      <View
                        style={[
                          styles.orderDetailsContainer,
                          {
                            backgroundColor: "rgba(252, 123, 3, 0.1)",
                            marginHorizontal: 0,
                            marginTop: 0,
                          },
                        ]}
                      >
                        <Text
                          numberOfLines={1}
                          style={{
                            fontFamily: Mulish700,
                            fontSize: 18,
                            color: AppColor.primary,
                            alignSelf: "center",
                          }}
                        >
                          {"Pre-Order"}
                        </Text>
                        <Divider
                          style={{
                            marginVertical: 16,
                            backgroundColor: AppColor.primary,
                          }}
                        />
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginHorizontal: 8,
                            marginTop: 8,
                            gap: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontFamily: Mulish400,
                              color: AppColor.black,
                            }}
                          >
                            {"Location"}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={{
                              fontSize: 14,
                              fontFamily: Mulish400,
                              color: AppColor.black,
                            }}
                          >
                            {locationTimeAdvanceData?.advanceLocationTitle}
                          </Text>
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginHorizontal: 8,
                            marginTop: 8,
                            gap: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontFamily: Mulish400,
                              color: AppColor.black,
                            }}
                          >
                            {"Time"}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={{
                              fontSize: 14,
                              fontFamily: Mulish400,
                              color: AppColor.black,
                            }}
                          >
                            {locationTimeAdvanceData?.advanceTime}
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    {/* Order ID Text */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginHorizontal: 8,
                      }}
                    >
                      <View style={{ width: "75%", paddingRight: 8 }}>
                        <Text style={styles.orderIdText}>
                          {"Order #" +
                            (newOrderData?.orderNumber || newOrderData?._id)}
                        </Text>
                      </View>
                      <View
                        style={{
                          maxWidth: "25%",
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 4,
                        }}
                      >
                        <MaterialCommunityIcons
                          name="map-marker-outline"
                          size={16}
                          color={AppColor.black}
                        />
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 14,
                            fontFamily: Mulish400,
                            color: AppColor.black,
                          }}
                        >
                          {locationTimeAdvanceData?.locationTitle || ""}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.orderHeader}>
                      <View style={styles.orderUserImageContainer}>
                        <AppImage
                          uri={newOrderData?.user?.profilePic || PROFILE_AVATAR}
                          containerStyle={styles.orderUserImage}
                        />
                      </View>
                      <View style={styles.orderUserInfo}>
                        <Text
                          style={styles.orderUserName}
                        >{`${newOrderData?.user?.firstName} ${newOrderData?.user?.lastName}`}</Text>
                        <Text
                          style={styles.orderItemCount}
                        >{`${newOrderData?.items?.length} Items`}</Text>
                      </View>
                      <View>
                        <Text style={styles.orderDate}>
                          {moment(newOrderData?.createdAt).format(
                            "DD MMM, YYYY"
                          )}
                        </Text>
                        <View style={styles.orderTimeContainer}>
                          <MaterialCommunityIcons
                            name="clock-outline"
                            size={16}
                            color="#6F6F6F"
                          />
                          <Text style={styles.orderTime}>
                            {moment(newOrderData?.createdAt).format("hh:mm A")}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Divider style={styles.orderDivider} />
                    {/* Item Details */}
                    {newOrderData?.items?.map((item, index) => (
                      <View style={styles.orderItemContainer} key={index}>
                        <View style={styles.orderItemDetails}>
                          <Text
                            style={styles.orderItemName}
                          >{`${item.menuItem.name}`}</Text>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            {["BOGO", "BOGOHO"].includes(
                              item.menuItem?.discountType
                            ) ? (
                              <Text
                                style={styles.orderItemDescription}
                                numberOfLines={1}
                              >
                                {`${item.menuItem?.discountType}`}
                              </Text>
                            ) : null}
                            {item.menuItem?.itemType ===
                            foodTypeStrings.combo ? (
                              <Text
                                style={styles.orderItemDescription}
                                numberOfLines={1}
                              >
                                {`${item.menuItem?.itemType}`}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                        <View>
                          <Text
                            style={styles.orderItemPrice}
                          >{`x${item.qty}`}</Text>
                        </View>
                      </View>
                    ))}
                    <Divider style={styles.orderDivider} />
                    {/* Total */}
                    <View style={styles.orderTotalContainer}>
                      <Text
                        style={styles.orderTotalText}
                      >{`$${getVendorOrderTotal(newOrderData).toFixed(2)}`}</Text>
                      {!isVendorPosOrder(newOrderData) ? (
                        <View style={styles.orderActionButtons}>
                          <TouchableOpacity
                            style={styles.rejectOrderBtn}
                            activeOpacity={0.7}
                            disabled={orderRejectBtnLoading}
                            onPress={() => handleRejectOrderPress(newOrderData)}
                          >
                            {orderRejectBtnLoading ? (
                              <ActivityIndicator color={AppColor.primary} />
                            ) : (
                              <Text
                                style={[
                                  styles.orderBtnText,
                                  { color: AppColor.primary },
                                ]}
                              >
                                {"Reject"}
                              </Text>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.acceptOrderBtn}
                            activeOpacity={0.7}
                            disabled={orderAcceptBtnLoading}
                            onPress={() => handleAcceptPress(newOrderData)}
                          >
                            {orderAcceptBtnLoading ? (
                              <ActivityIndicator color={AppColor.primary} />
                            ) : (
                              <Text style={styles.orderBtnText}>
                                {"Accept"}
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Sales Overview */}
              <View style={styles.salesOverviewContainer}>
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionTitle}>{"Sales Overview"}</Text>
                </View>
                <Divider />
                <View style={styles.salesOverviewCards}>
                  <Pressable
                    style={styles.salesCard}
                    onPress={() => navigation.navigate("earningsScreen")}
                  >
                    <FastImage
                      source={require("../assets/images/pieChartIcon.png")}
                      style={styles.pieChartIcon}
                    />
                    <View style={styles.salesCardTextContainer}>
                      <Text
                        style={styles.salesCardAmount}
                      >{`$${(earningData?.todaySales || 0).toFixed(2)}`}</Text>
                      <Text style={styles.salesCardLabel}>
                        {"Today's Sales "}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => navigation.navigate("earningsScreen")}
                    style={[styles.salesCard, { backgroundColor: "#008B8B" }]}
                  >
                    <FastImage
                      source={require("../assets/images/pieChartIcon.png")}
                      style={styles.pieChartIcon}
                    />
                    <View style={styles.salesCardTextContainer}>
                      <Text
                        style={styles.salesCardAmount}
                      >{`${earningData?.todayTotalOrders || 0}`}</Text>
                      <Text style={styles.salesCardLabel}>
                        {"Today's Order"}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </View>

              {/* Quick Stats */}
              <View style={styles.quickStatsSection}>
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionTitle}>{"Quick Stats"}</Text>
                </View>
                <Divider />
                <View style={styles.quickStatsItemsContainer}>
                  <QuickStatsComponent
                    title={"Monthly Earnings"}
                    subTitle={`$${(earningData?.monthlyEarning || 0).toFixed(2)}`}
                    icon={require("../assets/images/monthlyEarningIcon.png")}
                    onPress={() => navigation.navigate("earningsScreen")}
                  />
                  <QuickStatsComponent
                    title={"Takeout POS"}
                    subTitle={"Create walk-up orders"}
                    icon={require("../assets/images/cutlery.png")}
                    onPress={() => navigation.navigate("vendorPosMenuScreen")}
                  />
                  {/* <QuickStatsComponent
                    title={"Active Customers"}
                    subTitle={"0"}
                    icon={require("../assets/images/activeCustomerIcon.png")}
                    onPress={() => navigation.navigate("earningsScreen")}
                  />
                  <QuickStatsComponent
                    title={"Trending Items"}
                    subTitle={"-"}
                    icon={require("../assets/images/trendingItemsIcon.png")}
                    onPress={() => navigation.navigate("earningsScreen")}
                  /> */}
                </View>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    flex: 1,
  },
  dropdown: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 12,
  },
  acceptOrderBtn: {
    height: 46,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: AppColor.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  rejectOrderBtn: {
    height: 46,
    borderWidth: 1,
    borderRadius: 5,
    borderColor: AppColor.primary,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  orderBtnText: {
    color: AppColor.white,
    fontFamily: Mulish400,
    fontSize: 16,
  },
  // New styles
  headerContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingBottom: 10,
    backgroundColor: AppColor.white,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "#E5E5EA",
  },
  headerLeftContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerLogo: {
    height: 44,
    width: 44,
    borderRadius: 22,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Mulish700,
    color: AppColor.black,
  },
  headerRightContainer: {
    width: "10%",
    alignItems: "flex-end",
  },
  notificationBadge: {
    alignItems: "center",
    backgroundColor: "#DC2626",
    borderRadius: 10,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 4,
    position: "absolute",
    right: -3,
    top: -2,
  },
  notificationBadgeText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 10,
  },
  notificationOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  notificationCard: {
    backgroundColor: AppColor.white,
    borderRadius: 8,
    maxHeight: "80%",
    padding: 16,
    width: "100%",
  },
  notificationHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  notificationTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 18,
  },
  notificationRow: {
    borderTopColor: AppColor.border,
    borderTopWidth: 1,
    paddingVertical: 12,
  },
  notificationRowTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 14,
  },
  notificationRowMeta: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 12,
    marginTop: 3,
  },
  notificationEmpty: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 14,
    paddingVertical: 18,
    textAlign: "center",
  },
  acknowledgeButton: {
    alignItems: "center",
    backgroundColor: AppColor.primary,
    borderRadius: 6,
    marginTop: 12,
    minHeight: 42,
    justifyContent: "center",
  },
  acknowledgeButtonText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 14,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  locationSwitchContainer: {
    gap: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: AppColor.white,
    shadowColor: AppColor.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  dropdownContainer: {
    flex: 1,
  },
  dropdownPlaceholder: {
    fontFamily: Mulish400,
    color: AppColor.textHighlighter,
  },
  dropdownItemText: {
    fontFamily: Mulish400,
  },
  dropdownSelectedText: {
    fontFamily: Mulish400,
  },
  dropdownOverlay: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  switchContainer: {
    alignItems: "center",
  },
  switchText: {
    fontFamily: Mulish400,
    fontSize: 12,
    color: AppColor.black,
    marginTop: 5,
  },
  newOrderContainer: {
    backgroundColor: AppColor.white,
    marginTop: 16,
  },
  sectionTitleContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontFamily: Mulish700,
    fontSize: 18,
    color: AppColor.black,
  },
  orderDetailsContainer: {
    margin: 16,
    paddingHorizontal: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: AppColor.border,
  },
  orderIdText: {
    fontFamily: Mulish400,
    fontSize: 14,
    color: "#6F6F6F",
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 16,
    marginHorizontal: 8,
  },
  orderUserImageContainer: {
    height: 50,
    width: 50,
    borderWidth: 1,
    borderRadius: 24.5,
    borderColor: AppColor.border,
  },
  orderUserImage: {
    height: 48,
    width: 48,
    borderRadius: 24,
  },
  orderUserInfo: {
    flex: 1,
    marginHorizontal: 8,
  },
  orderUserName: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.black,
  },
  orderItemCount: {
    fontFamily: Mulish400,
    fontSize: 14,
    color: "#6F6F6F",
    paddingVertical: 5,
  },
  orderDate: {
    fontFamily: Mulish400,
    fontSize: 14,
    color: "#6F6F6F",
  },
  orderTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
  },
  orderTime: {
    fontFamily: Mulish400,
    fontSize: 14,
    color: "#6F6F6F",
  },
  orderDivider: {
    marginHorizontal: 8,
  },
  orderItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
    marginVertical: 8,
  },
  orderItemDetails: {
    flex: 1,
    gap: 4,
  },
  orderItemName: {
    fontFamily: Mulish400,
    fontSize: 14,
    color: AppColor.black,
  },
  orderItemDescription: {
    fontFamily: Mulish400,
    fontSize: 10,
    color: AppColor.black,
  },
  orderItemPrice: {
    fontFamily: Mulish400,
    fontSize: 14,
    color: AppColor.black,
  },
  freeItemContainer: {
    flex: 1,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  freeItemBadge: {
    fontFamily: Mulish400,
    fontSize: 10,
    color: "#008B8B",
    backgroundColor: "#C2FFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    letterSpacing: 0.8,
  },
  orderTotalContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 8,
    marginTop: 16,
  },
  orderTotalText: {
    fontFamily: Mulish400,
    fontSize: 20,
    color: AppColor.black,
  },
  orderActionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  salesOverviewContainer: {
    backgroundColor: AppColor.white,
    marginTop: 16,
    paddingBottom: 8,
  },
  salesOverviewCards: {
    gap: 16,
    padding: 16,
    flexDirection: "row",
  },
  salesCard: {
    flex: 1 / 2,
    borderRadius: 10,
    backgroundColor: AppColor.primary,
    padding: 16,
  },
  pieChartIcon: {
    height: 23.09,
    width: 24.42,
    alignSelf: "flex-end",
  },
  salesCardTextContainer: {
    marginTop: 5,
    gap: 5,
  },
  salesCardAmount: {
    fontFamily: Mulish700,
    fontSize: 24.65,
    color: AppColor.white,
  },
  salesCardLabel: {
    fontFamily: Mulish400,
    fontSize: 12.33,
    color: AppColor.white,
  },
  quickStatsSection: {
    backgroundColor: AppColor.white,
    marginTop: 16,
  },
  quickStatsItemsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quickStatsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 8,
  },
  quickStatsTextContainer: {
    flex: 1,
    gap: 4,
  },
  quickStatsTitle: {
    fontFamily: Mulish400,
    fontSize: 14,
    color: "#6F6F6F",
  },
  quickStatsSubTitle: {
    fontFamily: Mulish400,
    fontSize: 16.7,
    color: AppColor.black,
  },
  quickStatsIcon: {
    height: 49,
    width: 49,
  },
});
