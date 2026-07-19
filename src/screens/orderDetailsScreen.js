import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator as NativeIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, Divider, IconButton } from "react-native-paper";
import moment from "moment";
import FastImage from "@d11/react-native-fast-image";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor, Mulish700, Mulish400, Mulish500, Mulish600 } from "../utils/theme";
import {
  getOrderByID_API,
  refundOrder_API,
  updateOrderStatusByID_API,
} from "../api/appAPI";
import { useDispatch } from "react-redux";
import { showSnackbar } from "../redux/slices/snackbarSlice";
import {
  orderNextStatusNames,
  orderCurrentStatusNames,
  orderStatusStrings,
  PaymentMethodNames,
  foodTypeStrings,
} from "../utils/constants";
import { getRewardItemsDisplay } from "../helpers/discount.helper";
import { printOrderTickets } from "../helpers/print.helper";
import CustomPrepTimeModal from "../components/CustomPrepTimeModal";
import {
  calculateTotalPreparationTime,
  extractAdvanceOrderLocationAndTime,
  getDisabledStatuses,
  getNextOrderStatus,
  getVendorOrderTotal,
  getVendorTipAmount,
  isVendorPosOrder,
} from "../helpers/order.helper";
import AppImage from "../components/AppImage";

const POS_REFUNDABLE_STATUSES = [
  orderStatusStrings.preparing,
  orderStatusStrings.ready_for_pickup,
  orderStatusStrings.driver_picked_up,
  orderStatusStrings.delivered,
  orderStatusStrings.completed,
];
const TEN_MINUTES_MS = 10 * 60 * 1000;

const getCompletedAt = (order) =>
  order?.completed_at || order?.statusTime?.completedAt || null;

const isCompletedRefundWindowExpired = (order) => {
  if (order?.orderStatus !== orderStatusStrings.completed) return false;
  const completedAt = getCompletedAt(order);
  if (!completedAt) return false;
  const completedDate = new Date(completedAt);
  if (Number.isNaN(completedDate.getTime())) return false;
  return Date.now() - completedDate.getTime() > TEN_MINUTES_MS;
};

const isRefundedOrder = (order) =>
  order?.paymentStatus === "REFUNDED" || order?.refundStatus === "SUCCESS";

const getDisplayOrderStatus = (order) => {
  if (isRefundedOrder(order)) return "Refunded";
  if (order?.refundStatus === "PENDING") return "Refund Pending";
  return orderCurrentStatusNames[order?.orderStatus];
};

const getOrderStatusTone = (order) => {
  if (isRefundedOrder(order)) return "refunded";
  if (
    [orderStatusStrings.completed, orderStatusStrings.delivered].includes(
      order?.orderStatus
    )
  ) {
    return "complete";
  }
  if (
    [
      orderStatusStrings.preparing,
      orderStatusStrings.ready_for_pickup,
      orderStatusStrings.driver_picked_up,
    ].includes(order?.orderStatus)
  ) {
    return "progress";
  }
  return "attention";
};

const OrderDetailsScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const params = route.params;

  const [dataLoading, setDataLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [rejectBtnLoading, setRejectBtnLoading] = useState(false);
  const [refundBtnLoading, setRefundBtnLoading] = useState(false);
  const [multiActionBtnLoading, setMultiActionBtnLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [timeModal, setTimeModal] = useState(null);
  const [prepTimeError, setPrepTimeError] = useState("");
  const [nextOrderStatus, setNextOrderStatus] = useState(null);
  const [locationTimeAdvanceData, setLocationTimeAdvanceData] = useState(null);
  const vendorTipAmount = getVendorTipAmount(orderData);
  const vendorOrderTotal = getVendorOrderTotal(orderData);

  // Modal cancel press
  const onModalCancelPress = () => {
    setTimeModal(null);
  };

  // Handle "accept & print" press
  const handleAcceptAndPrintPress = (order) => {
    const estimatedPrepTime = calculateTotalPreparationTime(order);
    setTimeModal({
      orderData: order,
      isVisible: true,
      loading: false,
      prepTime: `${estimatedPrepTime}`,
    });
  };

  // Handle multi btn press
  const handleMultiActionPress = async (nextStatus, order) => {
    if (nextStatus === orderStatusStrings.preparing) {
      handleAcceptAndPrintPress(order);
      return;
    }
    setMultiActionBtnLoading(false);
    try {
      const response = await updateOrderStatusByID_API({
        order_id: order?._id,
        payload: {
          orderStatus: nextStatus,
        },
      });
      console.log("response => ", response);
      if (response?.success && response?.data) {
        await getOrderDetailsFromAPI();
        dispatch(
          showSnackbar({
            type: "success",
            message: "Order status updated successfully",
          })
        );
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
      setMultiActionBtnLoading(false);
    }
  };

  // Handle "reject" order press
  const handleRejectPress = (order) => {
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
            setRejectBtnLoading(true);
            try {
              const response = await updateOrderStatusByID_API({
                order_id: order?._id,
                payload: {
                  orderStatus: "REJECTED",
                },
              });
              console.log("response => ", response);
              if (response?.success && response?.data) {
                await getOrderDetailsFromAPI();
                dispatch(
                  showSnackbar({
                    type: "success",
                    message: "Order status updated successfully",
                  })
                );
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
              setRejectBtnLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRefundPress = (order) => {
    if (isCompletedRefundWindowExpired(order)) {
      Alert.alert(
        "Refund window closed",
        "Refunds are only available for 10 minutes after completion."
      );
      return;
    }

    const refundAmount = Math.max(
      0,
      Number(order?.total || 0) - Number(order?.tipsAmount || 0)
    );
    const refundMessage =
      order?.paymentMethod === "TAP_TO_PAY"
        ? `Refund $${refundAmount.toFixed(2)} to the customer? Tips are excluded from Tap to Pay refunds.`
        : "Mark this cash order as refunded?";

    Alert.alert(
      "Refund order",
      refundMessage,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Refund",
          style: "destructive",
          onPress: async () => {
            setRefundBtnLoading(true);
            try {
              const response = await refundOrder_API({
                order_id: order?._id,
                payload: { reason: "Customer requested refund" },
              });

              if (response?.success && response?.data?.order) {
                setOrderData(response.data.order);
                dispatch(
                  showSnackbar({
                    type: "success",
                    message: "Order refunded successfully",
                  })
                );
              }
            } catch (error) {
              dispatch(
                showSnackbar({
                  type: "error",
                  message: error?.message || "Refund failed",
                })
              );
            } finally {
              setRefundBtnLoading(false);
            }
          },
        },
      ]
    );
  };

  // handle prep time submit
  const handleSubmitPrepTime = async () => {
    const prepTime = timeModal?.prepTime;

    // Check if prepTime exists
    if (!prepTime) {
      setPrepTimeError("Preparation time is required");
      return;
    }

    // Check if prepTime contains only digits
    if (!/^\d+$/.test(prepTime)) {
      setPrepTimeError("Preparation time must contain only numbers");
      return;
    }

    // Convert to number for range validation
    const prepTimeNum = Number(prepTime);

    // Check if prepTime is within 0-120 range
    if (prepTimeNum < 0 || prepTimeNum > 120) {
      setPrepTimeError("Preparation time must be between 0 and 120 minutes");
      return;
    }

    // Clear error if all validations pass
    setPrepTimeError("");

    setTimeModal((prev) => ({
      ...prev,
      loading: true,
    }));
    try {
      const response = await updateOrderStatusByID_API({
        order_id: timeModal?.orderData?._id,
        payload: {
          orderStatus: "PREPARING",
          pickupTime: `${prepTimeNum}`,
        },
      });
      console.log("response => ", response);
      if (response?.success && response?.data) {
        await getOrderDetailsFromAPI();
        dispatch(
          showSnackbar({
            type: "success",
            message: "Order status updated successfully",
          })
        );
        setTimeModal(null);
      }
    } catch (error) {
      console.log("error => ", error);
      setTimeModal((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  };

  const getOrderDetailsFromAPI = async () => {
    setDataLoading(true);
    try {
      const order_id = params.orderId;
      const response = await getOrderByID_API(order_id);
      console.log("response => ", response);
      if (response?.success && response?.data) {
        setOrderData(response.data.order);
        setLocationTimeAdvanceData(
          extractAdvanceOrderLocationAndTime(response.data.order)
        );
      } else {
        setOrderData(null);
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
      setDataLoading(false);
    }
  };

  const printOrderDetails = async () => {
    if (!orderData || printing) return;
    try {
      setPrinting(true);
      await printOrderTickets(orderData);
    } catch (error) {
      dispatch(
        showSnackbar({
          type: "error",
          message: "Unable to open printer",
        })
      );
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintOrderPress = () => {
    if (!orderData || printing) return;
    Alert.alert("Print order?", "Open printer options for this order.", [
      { text: "Cancel", style: "cancel" },
      { text: "Print", onPress: printOrderDetails },
    ]);
  };

  useEffect(() => {
    console.log("params => ", params);
    getOrderDetailsFromAPI();
  }, [params]);

  useEffect(() => {
    if (orderData?.orderStatus) {
      setNextOrderStatus(getNextOrderStatus(orderData?.orderStatus, orderData));
    } else {
      setNextOrderStatus(null);
    }
  }, [orderData?.orderStatus]);

  const rjctBtnDisabled =
    rejectBtnLoading ||
    getDisabledStatuses(orderData?.orderStatus).includes(
      orderStatusStrings.rejected
    );
  const canRefundPosOrder =
    isVendorPosOrder(orderData) &&
    ["CASH", "TAP_TO_PAY"].includes(orderData?.paymentMethod) &&
    orderData?.paymentStatus !== "REFUNDED" &&
    POS_REFUNDABLE_STATUSES.includes(orderData?.orderStatus) &&
    !isCompletedRefundWindowExpired(orderData);
  const orderIsTerminal =
    orderData?.paymentStatus === "REFUNDED" ||
    [
      orderStatusStrings.cancel,
      orderStatusStrings.rejected,
      orderStatusStrings.delivered,
      orderStatusStrings.completed,
    ].includes(orderData?.orderStatus);
  const isWalkUpOrder = isVendorPosOrder(orderData);
  const canShowLeftAction = !isWalkUpOrder || canRefundPosOrder;
  const canShowRightAction =
    !isWalkUpOrder || nextOrderStatus !== orderStatusStrings.accepted;
  const showOrderActions =
    !!nextOrderStatus &&
    !orderIsTerminal &&
    (canShowLeftAction || canShowRightAction);
  const customerName =
    [orderData?.user?.firstName, orderData?.user?.lastName]
      .filter(Boolean)
      .join(" ") ||
    orderData?.guestCustomer?.phone ||
    "Walk-up Guest";
  const hasCustomerProfileImage = !!orderData?.user?.profilePic;
  const terminalStatusLabel = getDisplayOrderStatus(orderData);
  const statusTone = getOrderStatusTone(orderData);

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerSide}>
          <IconButton
            icon="arrow-left"
            iconColor={AppColor.black}
            size={24}
            onPress={() => navigation.goBack()}
          />
        </View>
        <Text style={styles.headerTitle}>{"Order Details"}</Text>
        <View style={styles.headerActions}>
          {orderData ? (
            <IconButton
              icon="printer"
              iconColor={AppColor.black}
              size={22}
              disabled={printing || dataLoading}
              onPress={handlePrintOrderPress}
            />
          ) : null}
          {params ? (
            <IconButton
              icon="refresh"
              iconColor={AppColor.black}
              size={24}
              onPress={() => getOrderDetailsFromAPI()}
            />
          ) : null}
        </View>
      </View>

      {/* Main Container */}
      {dataLoading ? (
        <View style={styles.loadingContainer}>
          <NativeIndicator size="large" color={AppColor.primary} />
        </View>
      ) : orderData ? (
        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Advance Order Location and Time */}
          {locationTimeAdvanceData?.advanceOrder ? (
            <View
              style={[
                styles.orderDetailsContainer,
                { backgroundColor: "rgba(252, 123, 3, 0.1)" },
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

          {/* Item Details Container */}
          <View style={styles.orderDetailsContainer}>
            {/* Order Header */}
            <View style={[styles.orderHeader, { marginTop: 0 }]}>
              <Text style={[styles.orderIdText, { color: AppColor.black }]}>
                {"Order Status"}
              </Text>
              <View style={[styles.statusPill, styles[`statusPill${statusTone}`]]}>
                <View
                  style={[
                    styles.statusDot,
                    styles[`statusDot${statusTone}`],
                  ]}
                />
                <Text
                  style={[
                    styles.statusPillText,
                    styles[`statusPillText${statusTone}`],
                  ]}
                >
                  {getDisplayOrderStatus(orderData)}
                </Text>
              </View>
            </View>
            {/* Order ID and Location */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginHorizontal: 8,
              }}
            >
              <View style={{ width: "75%", paddingRight: 8 }}>
                <Text
                  numberOfLines={1}
                  style={styles.orderIdText}
                >{`Order #${orderData?.orderNumber || orderData?._id}`}</Text>
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
                {hasCustomerProfileImage ? (
                  <AppImage
                    uri={orderData.user.profilePic}
                    containerStyle={styles.orderUserImage}
                  />
                ) : (
                  <View style={[styles.orderUserImage, styles.plateAvatar]}>
                    <Text style={styles.plateAvatarText}>🍽️</Text>
                  </View>
                )}
              </View>
              <View style={styles.orderUserInfo}>
                <Text style={styles.orderUserName}>{customerName}</Text>
                <Text
                  style={styles.orderItemCount}
                >{`${orderData?.items?.length} Items`}</Text>
              </View>
              <View>
                <Text style={styles.orderDate}>
                  {moment(orderData?.createdAt).format("DD MMM, YYYY")}
                </Text>
                <View style={styles.orderTimeContainer}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={16}
                    color="#6F6F6F"
                  />
                  <Text style={styles.orderTime}>
                    {moment(orderData?.createdAt).format("hh:mm A")}
                  </Text>
                </View>
              </View>
            </View>
            <Divider style={styles.orderDivider} />
            {/* Item Details */}
            <View style={styles.itemsList}>
              {orderData?.items?.map((itm, idx) => {
                const raw = itm?.menuItem;
                const menuItem = {
                  ...(raw || {}),
                  name: raw?.name || itm?.name,
                  imgUrls:
                    raw?.imgUrls?.length > 0 ? raw.imgUrls : itm?.imgUrls,
                  discountType: raw?.discountType ?? itm?.discountType,
                  description: raw?.description ?? itm?.description,
                  selectedDiscountFlavors: itm?.selectedDiscountFlavors || [],
                  selectedDiscountToppings: itm?.selectedDiscountToppings || [],
                  selectedDiscountCustomization:
                    itm?.selectedDiscountCustomization || "",
                  selectedDiscountComboSides:
                    itm?.selectedDiscountComboSides || [],
                };
                const comboItemsList =
                  menuItem?.comboItems?.length > 0
                    ? menuItem.comboItems
                    : itm?.comboItems || [];
                const rewardItems = getRewardItemsDisplay(menuItem, itm?.qty);
                const hasRewardNested = rewardItems.length > 0;
                const hasComboNested = comboItemsList.length > 0;
                const discountType = menuItem?.discountType;
                const isBogoType = ["BOGO", "BOGOHO"].includes(
                  String(discountType || "").toUpperCase()
                );
                const comboSectionLabel =
                  String(menuItem?.itemType || "").toUpperCase() ===
                  foodTypeStrings.combo
                    ? "Combo includes"
                    : "Included selections";

                return (
                  <View
                    key={itm?.menuItemId || itm?._id || `line-${idx}`}
                    style={styles.orderLineBlock}
                  >
                    <View style={styles.orderLineMainRow}>
                      <AppImage
                        uri={menuItem?.imgUrls?.[0]}
                        containerStyle={styles.orderLineMainImage}
                      />
                      <View style={styles.orderLineMainInfo}>
                        <Text style={styles.orderLineMainTitle}>
                          {menuItem?.name || ""}
                        </Text>
                        <Text style={styles.orderLineMainMeta}>
                          {`Qty ${itm?.qty ?? 0}`}
                        </Text>
                        {itm.customization ? (
                          <Text style={styles.orderLineCustomization}>
                            {itm.customization}
                          </Text>
                        ) : null}
                        {itm.selectedFlavors?.length > 0 ? (
                          <Text style={styles.orderLineCustomization}>
                            {`Flavors: ${itm.selectedFlavors.join(", ")}`}
                          </Text>
                        ) : null}
                        {itm.selectedToppings?.length > 0 ? (
                          <Text style={styles.orderLineCustomization}>
                            {`Toppings: ${itm.selectedToppings.join(", ")}`}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.orderLineMainPrice}>
                        ${Number(itm?.total || 0).toFixed(2)}
                      </Text>
                    </View>

                    {hasRewardNested ? (
                      <View style={styles.nestedSection}>
                        <Text style={styles.nestedSectionLabel}>
                          {discountType
                            ? `Included with offer · ${discountType}`
                            : "Included with offer"}
                        </Text>
                        {rewardItems.map((rewardItem, index) => (
                          <View
                            style={[
                              styles.nestedItemRow,
                              index === rewardItems.length - 1 &&
                                styles.nestedItemRowLast,
                            ]}
                            key={rewardItem._id || `r-${index}`}
                          >
                            <AppImage
                              uri={rewardItem.displayImg}
                              containerStyle={styles.nestedFoodImg}
                            />
                            <View style={styles.nestedItemDetails}>
                              <Text style={styles.nestedItemBadge}>Reward</Text>
                              <Text
                                style={styles.nestedItemTitle}
                                numberOfLines={2}
                              >
                                {rewardItem.displayName || ""}
                              </Text>
                              {rewardItem.displayDesc ? (
                                <Text
                                  style={styles.nestedItemDesc}
                                  numberOfLines={2}
                                >
                                  {rewardItem.displayDesc}
                                </Text>
                              ) : null}
                              {rewardItem.displayFlavors?.length > 0 ? (
                                <Text
                                  style={styles.nestedItemDesc}
                                  numberOfLines={2}
                                >
                                  {`Flavors: ${rewardItem.displayFlavors.join(", ")}`}
                                </Text>
                              ) : null}
                              {rewardItem.displayToppings?.length > 0 ? (
                                <Text
                                  style={styles.nestedItemDesc}
                                  numberOfLines={2}
                                >
                                  {`Toppings: ${rewardItem.displayToppings.join(", ")}`}
                                </Text>
                              ) : null}
                              {rewardItem.displayComboSides?.length > 0 ? (
                                <Text
                                  style={styles.nestedItemDesc}
                                  numberOfLines={2}
                                >
                                  {`Sides: ${rewardItem.displayComboSides.join(", ")}`}
                                </Text>
                              ) : null}
                              {rewardItem.displayCustomization ? (
                                <Text
                                  style={styles.nestedItemDesc}
                                  numberOfLines={2}
                                >
                                  {rewardItem.displayCustomization}
                                </Text>
                              ) : null}
                            </View>
                            <View style={styles.nestedRowRight}>
                              {!isBogoType ? (
                                <Text
                                  style={styles.nestedQtyText}
                                >{`×${rewardItem.displayQty || 0}`}</Text>
                              ) : null}
                              <Text style={styles.nestedItemLinePrice}>
                                {rewardItem.displayPrice}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {hasComboNested ? (
                      <View
                        style={[
                          styles.nestedSection,
                          hasRewardNested && styles.nestedSectionAfterSibling,
                        ]}
                      >
                        <Text style={styles.nestedSectionLabel}>
                          {comboSectionLabel}
                        </Text>
                        {comboItemsList.map((comboItem, cIdx) => (
                          <View
                            style={[
                              styles.nestedItemRow,
                              cIdx === comboItemsList.length - 1 &&
                                styles.nestedItemRowLast,
                            ]}
                            key={comboItem?._id || `c-${cIdx}`}
                          >
                            <AppImage
                              uri={comboItem?.imgUrls?.[0]}
                              containerStyle={styles.nestedFoodImg}
                            />
                            <View style={styles.nestedItemDetails}>
                              <Text style={styles.nestedItemBadgeCombo}>
                                Combo item
                              </Text>
                              <Text
                                style={styles.nestedItemTitle}
                                numberOfLines={2}
                              >
                                {comboItem.name}
                              </Text>
                              {comboItem.description ? (
                                <Text
                                  style={styles.nestedItemDesc}
                                  numberOfLines={2}
                                >
                                  {comboItem.description}
                                </Text>
                              ) : null}
                              <Text style={styles.nestedItemPriceMuted}>
                                Part of combo
                              </Text>
                            </View>
                            <View style={styles.nestedRowRight}>
                              <Text
                                style={styles.nestedQtyText}
                              >{`×${itm.qty}`}</Text>
                              <Text style={styles.nestedItemLinePrice}>
                                {`$${((comboItem?.price || 0) * itm.qty).toFixed(2)}`}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
            <Divider style={styles.orderDivider} />
            {/* Total */}
            <View style={styles.orderTotalContainer}>
              <Text
                style={styles.orderTotalText}
              >{`$${(orderData?.subTotal || 0).toFixed(2)}`}</Text>
            </View>
          </View>

          {/* Total Order Container */}
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 16,
              padding: 16,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: AppColor.border,
              backgroundColor: AppColor.white,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  fontFamily: Mulish700,
                  fontSize: 18,
                  color: AppColor.black,
                }}
              >
                Order Total
              </Text>
              <Text
                style={{
                  fontFamily: Mulish400,
                  fontSize: 18,
                  color: AppColor.black,
                }}
              >
                {`$${(orderData?.subTotal || 0).toFixed(2)}`}
              </Text>
            </View>
            <Divider style={{ marginTop: 16 }} />
            <View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: Mulish400,
                    fontSize: 14,
                    color: AppColor.black,
                  }}
                >
                  {"Coupon Discount"}
                </Text>
                <Text
                  style={{
                    fontFamily: Mulish400,
                    fontSize: 14,
                    color: AppColor.black,
                  }}
                >
                  {`- $${(orderData?.discount || 0).toFixed(2)}`}
                </Text>
              </View>
              {vendorTipAmount > 0 ? (
                <>
                  <Divider style={{ marginTop: 16 }} />
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: Mulish400,
                        fontSize: 14,
                        color: AppColor.black,
                      }}
                    >
                      {"Tip"}
                    </Text>
                    <Text
                      style={{
                        fontFamily: Mulish400,
                        fontSize: 14,
                        color: AppColor.black,
                      }}
                    >
                      {`$${vendorTipAmount.toFixed(2)}`}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>
          </View>

          {/* Payment Summary Container */}
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 16,
              padding: 16,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: AppColor.border,
              backgroundColor: AppColor.white,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  fontFamily: Mulish700,
                  fontSize: 18,
                  color: AppColor.black,
                }}
              >
                {"Payment Summary"}
              </Text>
              <Text
                style={{
                  fontFamily: Mulish400,
                  fontSize: 18,
                  color: AppColor.black,
                  textTransform: "capitalize",
                }}
              >
                {orderData?.paymentStatus || "N/A"}
              </Text>
            </View>
            <Divider style={{ marginTop: 16 }} />
            <View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: Mulish400,
                    fontSize: 14,
                    color: AppColor.black,
                  }}
                >
                  {"Payment Method"}
                </Text>
                <Text
                  style={{
                    fontFamily: Mulish400,
                    fontSize: 14,
                    color: AppColor.black,
                  }}
                >
                  {PaymentMethodNames[orderData?.paymentMethod || "COD"]}
                </Text>
              </View>
              {["APPLE_PAY", "GOOGLE_PAY"].includes(
                orderData?.paymentMethod
              ) && (
                <>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: Mulish400,
                        fontSize: 14,
                        color: AppColor.black,
                      }}
                    >
                      {"Auth Code"}
                    </Text>
                    <Text
                      style={{
                        fontFamily: Mulish400,
                        fontSize: 14,
                        color: AppColor.black,
                      }}
                    >
                      {orderData?.authCode || "N/A"}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: Mulish400,
                        fontSize: 14,
                        color: AppColor.black,
                      }}
                    >
                      {"Invoice No"}
                    </Text>
                    <Text
                      style={{
                        fontFamily: Mulish400,
                        fontSize: 14,
                        color: AppColor.black,
                      }}
                    >
                      {orderData?.invoiceNumber || "N/A"}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: Mulish400,
                        fontSize: 14,
                        color: AppColor.black,
                      }}
                    >
                      {"Transaction ID"}
                    </Text>
                    <Text
                      style={{
                        fontFamily: Mulish400,
                        fontSize: 14,
                        color: AppColor.black,
                      }}
                    >
                      {orderData?.transactionId || "N/A"}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Total Price Container */}
          <View
            style={{
              flex: 1,
              marginTop: 16,
              padding: 16,
              backgroundColor: AppColor.white,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  fontFamily: Mulish700,
                  fontSize: 18,
                  color: AppColor.black,
                }}
              >
                {"Total Amount"}
              </Text>
              <Text
                style={{
                  fontFamily: Mulish400,
                  fontSize: 18,
                  color: AppColor.black,
                }}
              >
                {`$${vendorOrderTotal.toFixed(2)}`}
              </Text>
            </View>
            {showOrderActions ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginVertical: 16,
                  gap: 12,
                }}
              >
                {canShowLeftAction ? (
                  <TouchableOpacity
                    style={[
                      styles.rejectOrderBtn,
                      {
                        opacity:
                          canRefundPosOrder || !rjctBtnDisabled ? 1 : 0.5,
                      },
                    ]}
                    activeOpacity={0.7}
                    disabled={
                      canRefundPosOrder ? refundBtnLoading : rjctBtnDisabled
                    }
                    onPress={() =>
                      canRefundPosOrder
                        ? handleRefundPress(orderData)
                        : handleRejectPress(orderData)
                    }
                  >
                    {canRefundPosOrder && refundBtnLoading ? (
                      <ActivityIndicator color={AppColor.primary} />
                    ) : !canRefundPosOrder && rejectBtnLoading ? (
                      <ActivityIndicator color={AppColor.primary} />
                    ) : (
                      <Text
                        style={[
                          styles.orderBtnText,
                          { color: AppColor.primary },
                        ]}
                        numberOfLines={1}
                      >
                        {canRefundPosOrder ? "Refund" : "Reject"}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : null}
                {canShowRightAction ? (
                  <TouchableOpacity
                    style={styles.acceptOrderBtn}
                    activeOpacity={0.7}
                    disabled={multiActionBtnLoading}
                    onPress={() =>
                      handleMultiActionPress(nextOrderStatus, orderData)
                    }
                  >
                    {multiActionBtnLoading ? (
                      <ActivityIndicator color={AppColor.primary} />
                    ) : (
                      <Text style={styles.orderBtnText} numberOfLines={1}>
                        {orderNextStatusNames[nextOrderStatus]}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <View style={{ marginVertical: 16 }}>
                <View style={styles.orderStatusInfoView}>
                  <Text style={styles.orderStatusInfoText} numberOfLines={1}>
                    {terminalStatusLabel}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text
            style={{
              fontFamily: Mulish400,
              fontSize: 18,
              color: AppColor.black,
              textAlign: "center",
              lineHeight: 26,
            }}
          >
            {"Something went wrong,\nPlease try again later."}
          </Text>
        </View>
      )}

      {/* Preparation Time Modal */}
      <CustomPrepTimeModal
        timeModal={timeModal}
        setTimeModal={setTimeModal}
        prepTimeError={prepTimeError}
        setPrepTimeError={setPrepTimeError}
        handleSubmitPrepTime={handleSubmitPrepTime}
        onModalCancelPress={onModalCancelPress}
      />
    </View>
  );
};

export default OrderDetailsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppColor.white,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderColor: AppColor.border,
  },
  headerTitle: {
    color: AppColor.black,
    fontSize: 20,
    fontFamily: Mulish700,
  },
  headerSide: {
    width: 96,
    alignItems: "flex-start",
  },
  headerActions: {
    width: 96,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },

  // Loading Container
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: (insets) => insets.bottom,
  },

  // Main Container
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },

  // Order Details Container
  orderDetailsContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: AppColor.border,
    backgroundColor: AppColor.white,
  },
  orderIdText: {
    fontFamily: Mulish400,
    fontSize: 14,
    color: "#6F6F6F",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(252, 123, 3, 0.08)",
  },
  statusPillattention: {
    backgroundColor: "rgba(244, 67, 54, 0.1)",
  },
  statusPillprogress: {
    backgroundColor: "rgba(255, 152, 0, 0.12)",
  },
  statusPillcomplete: {
    backgroundColor: "rgba(76, 175, 80, 0.12)",
  },
  statusPillrefunded: {
    backgroundColor: "rgba(142, 142, 147, 0.14)",
  },
  statusPillText: {
    fontFamily: Mulish400,
    fontSize: 14,
    color: AppColor.primary,
  },
  statusPillTextattention: {
    color: AppColor.snackbarError,
  },
  statusPillTextprogress: {
    color: AppColor.snackbarWarning,
  },
  statusPillTextcomplete: {
    color: AppColor.snackbarSuccess,
  },
  statusPillTextrefunded: {
    color: AppColor.gray,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: AppColor.primary,
  },
  statusDotattention: {
    backgroundColor: AppColor.snackbarError,
  },
  statusDotprogress: {
    backgroundColor: AppColor.snackbarWarning,
  },
  statusDotcomplete: {
    backgroundColor: AppColor.snackbarSuccess,
  },
  statusDotrefunded: {
    backgroundColor: AppColor.gray,
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
  plateAvatar: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF5EE",
  },
  plateAvatarText: {
    fontSize: 24,
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
  itemsList: {
    marginVertical: 15,
    paddingHorizontal: 0,
    gap: 0,
  },
  orderLineBlock: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  orderLineMainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  orderLineMainImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  orderLineMainInfo: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  orderLineMainTitle: {
    fontFamily: Mulish700,
    fontSize: 15,
    color: AppColor.text,
  },
  orderLineMainMeta: {
    fontFamily: Mulish400,
    fontSize: 13,
    color: AppColor.textHighlighter,
  },
  orderLineCustomization: {
    fontFamily: Mulish400,
    fontSize: 12,
    color: AppColor.text,
    marginTop: 2,
  },
  orderLineMainPrice: {
    fontFamily: Mulish700,
    fontSize: 15,
    color: AppColor.primary,
    minWidth: 72,
    textAlign: "right",
  },
  nestedSection: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: AppColor.white,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderLeftWidth: 3,
    borderLeftColor: AppColor.primary,
    ...Platform.select({
      ios: {
        shadowColor: AppColor.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  nestedSectionAfterSibling: {
    marginTop: 10,
  },
  nestedSectionLabel: {
    fontFamily: Mulish700,
    fontSize: 11,
    color: AppColor.gray,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  nestedItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 8,
  },
  nestedItemRowLast: {
    marginBottom: 0,
  },
  nestedFoodImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  nestedItemDetails: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  nestedItemBadge: {
    alignSelf: "flex-start",
    fontFamily: Mulish600,
    fontSize: 10,
    color: AppColor.primary,
    backgroundColor: "#FFF0E6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  nestedItemBadgeCombo: {
    alignSelf: "flex-start",
    fontFamily: Mulish600,
    fontSize: 10,
    color: AppColor.primary,
    backgroundColor: "#E8F4FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  nestedItemTitle: {
    fontFamily: Mulish600,
    fontSize: 14,
    color: AppColor.text,
  },
  nestedItemDesc: {
    fontFamily: Mulish400,
    fontSize: 12,
    color: AppColor.textHighlighter,
  },
  nestedItemPriceMuted: {
    fontFamily: Mulish400,
    fontSize: 12,
    color: AppColor.textHighlighter,
    fontStyle: "italic",
  },
  nestedRowRight: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    gap: 4,
    minWidth: 56,
    paddingTop: 2,
  },
  nestedQtyText: {
    fontFamily: Mulish600,
    fontSize: 13,
    color: AppColor.text,
  },
  nestedItemLinePrice: {
    fontFamily: Mulish600,
    fontSize: 13,
    color: AppColor.primary,
    textAlign: "right",
  },
  orderItemContainer: {
    flexDirection: "row",
    alignItems: "center",
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
    fontSize: 14,
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
    fontSize: 18,
    color: AppColor.black,
  },

  acceptOrderBtn: {
    flex: 1 / 2,
    height: 36,
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
    flex: 1 / 2,
    height: 36,
    borderWidth: 1,
    borderRadius: 5,
    borderColor: AppColor.primary,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  orderBtnText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 16,
  },
  orderStatusInfoView: {
    height: 46,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: AppColor.primary,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(252, 123, 3, 0.08)",
    paddingHorizontal: 16,
  },
  orderStatusInfoText: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 20,
  },
});
