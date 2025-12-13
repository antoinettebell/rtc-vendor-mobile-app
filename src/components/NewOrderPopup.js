import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator as NativeIndicator,
  FlatList,
} from "react-native";
import { ActivityIndicator, Divider } from "react-native-paper";
import FastImage from "@d11/react-native-fast-image";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import moment from "moment";
import { useDispatch } from "react-redux";

import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import { getOrderByID_API, updateOrderStatusByID_API } from "../api/appAPI";
import { showSnackbar } from "../redux/slices/snackbarSlice";
import {
  orderNextStatusNames,
  orderCurrentStatusNames,
  PROFILE_AVATAR,
  orderStatusStrings,
} from "../utils/constants";
import CustomPrepTimeModal from "./CustomPrepTimeModal";
import {
  calculateTotalPreparationTime,
  extractAdvanceOrderLocationAndTime,
  getDisabledStatuses,
  getNextOrderStatus,
} from "../helpers/order.helper";
import AppImage from "./AppImage";

const NewOrderPopup = ({ orderId, onCloseCurrentOrder }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);
  const [rejectBtnLoading, setRejectBtnLoading] = useState(false);
  const [multiActionBtnLoading, setMultiActionBtnLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [timeModal, setTimeModal] = useState(null);
  const [prepTimeError, setPrepTimeError] = useState("");
  const [nextOrderStatus, setNextOrderStatus] = useState(null);
  const [locationTimeAdvanceData, setLocationTimeAdvanceData] = useState(null);

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
    setMultiActionBtnLoading(true);
    try {
      const response = await updateOrderStatusByID_API({
        order_id: order?._id,
        payload: {
          orderStatus: nextStatus,
        },
      });
      if (response?.success && response?.data) {
        setOrderData((prev) => ({
          ...prev,
          orderStatus: response.data.order.orderStatus,
          statusTime: response.data.order.statusTime,
          pickupTime: response.data.order.pickupTime,
        }));
        dispatch(
          showSnackbar({
            type: "success",
            message: "Order status updated successfully",
          })
        );
      }
    } catch (error) {
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
  const handleRejectPress = async (order) => {
    setRejectBtnLoading(true);
    try {
      const response = await updateOrderStatusByID_API({
        order_id: order?._id,
        payload: { orderStatus: "REJECTED" },
      });
      if (response?.success && response?.data) {
        setOrderData((prev) => ({
          ...prev,
          orderStatus: response.data.order.orderStatus,
          statusTime: response.data.order.statusTime,
          pickupTime: response.data.order.pickupTime,
        }));
        dispatch(
          showSnackbar({
            type: "success",
            message: "Order status updated successfully",
          })
        );
      }
    } catch (error) {
      dispatch(
        showSnackbar({
          type: "error",
          message: "Something went wrong!",
        })
      );
    } finally {
      setRejectBtnLoading(false);
    }
  };

  // handle prep time submit
  const handleSubmitPrepTime = async () => {
    const prepTime = timeModal?.prepTime;

    if (!prepTime) {
      setPrepTimeError("Preparation time is required");
      return;
    }

    if (!/^\d+$/.test(prepTime)) {
      setPrepTimeError("Preparation time must contain only numbers");
      return;
    }

    const prepTimeNum = Number(prepTime);

    if (prepTimeNum < 0 || prepTimeNum > 120) {
      setPrepTimeError("Preparation time must be between 0 and 120 minutes");
      return;
    }

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
      if (response?.success && response?.data) {
        setOrderData((prev) => ({
          ...prev,
          orderStatus: response.data.order.orderStatus,
          statusTime: response.data.order.statusTime,
          pickupTime: response.data.order.pickupTime,
        }));
        dispatch(
          showSnackbar({
            type: "success",
            message: "Order status updated successfully",
          })
        );
        setTimeModal(null);
      }
    } catch (error) {
      dispatch(
        showSnackbar({
          type: "error",
          message: "Something went wrong!",
        })
      );
      setTimeModal((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  };

  const getOrderDetails = async () => {
    setLoading(true);
    try {
      const response = await getOrderByID_API(orderId);
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
      dispatch(
        showSnackbar({
          type: "error",
          message: error.message,
        })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      getOrderDetails();
    }
  }, [orderId]);

  useEffect(() => {
    if (orderData?.orderStatus) {
      setNextOrderStatus(getNextOrderStatus(orderData?.orderStatus));
    } else {
      setNextOrderStatus(null);
    }
  }, [orderData?.orderStatus]);

  const rjctBtnDisabled =
    rejectBtnLoading ||
    getDisabledStatuses(orderData?.orderStatus).includes(
      orderStatusStrings.rejected
    );

  if (!mounted || loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <View
          style={[
            styles.orderDetailsContainer,
            { height: "20%", justifyContent: "center" },
          ]}
        >
          <NativeIndicator size="large" color={AppColor.primary} />
        </View>
      </View>
    );
  }

  if (!orderData) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill} />
      <View style={styles.orderDetailsContainer}>
        <View style={styles.orderContentContainer}>
          {/* Close Button */}
          <TouchableOpacity
            hitSlop={5}
            activeOpacity={0.7}
            style={styles.closeButton}
            onPress={onCloseCurrentOrder}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={24}
              color={AppColor.black}
            />
          </TouchableOpacity>

          {/* Order Title */}
          <Text
            style={[styles.orderIdText, { marginBottom: 20 }]}
            numberOfLines={1}
          >
            {locationTimeAdvanceData?.advanceOrder
              ? "New Pre-Order"
              : "New Order"}
          </Text>

          {/* Advance Order Location and Time */}
          {locationTimeAdvanceData?.advanceOrder ? (
            <View
              style={[
                styles.orderDetailsContainer,
                {
                  backgroundColor: "rgba(252, 123, 3, 0.1)",
                  marginBottom: 16,
                  padding: 8,
                  borderRadius: 4,
                },
              ]}
            >
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

          {/* Order Header */}
          <View
            style={[styles.orderHeader, { justifyContent: "space-between" }]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.orderIdText,
                { color: AppColor.black, fontFamily: Mulish400 },
              ]}
              onPress={onCloseCurrentOrder}
            >
              {`#${orderData?.orderNumber || orderData?._id}`}
            </Text>
            <Text
              style={[
                styles.orderIdText,
                { color: AppColor.primary, textTransform: "capitalize" },
              ]}
            >
              {orderCurrentStatusNames[orderData?.orderStatus]}
            </Text>
          </View>

          {/* User Info */}
          <View style={styles.userInfoContainer}>
            <View style={styles.userImageContainer}>
              <AppImage
                uri={orderData?.user?.profilePic || PROFILE_AVATAR}
                containerStyle={styles.userImage}
              />
            </View>
            <View style={styles.userInfo}>
              <Text
                style={styles.userName}
              >{`${orderData?.user?.firstName} ${orderData?.user?.lastName}`}</Text>
              <Text
                style={styles.itemCount}
              >{`${orderData?.items?.length} Items`}</Text>
            </View>
            <View>
              <Text style={styles.orderDate}>
                {moment(orderData?.createdAt).format("DD MMM, YYYY")}
              </Text>
              <View style={styles.timeContainer}>
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

          <Divider style={styles.divider} />

          {/* Items */}
          <View style={styles.itemsListContainer}>
            <FlatList
              data={orderData?.items || []}
              keyExtractor={(_, index) => index.toString()}
              contentContainerStyle={{ gap: 12 }}
              renderItem={({ item }) => (
                <View style={styles.itemContainer}>
                  <View style={styles.itemDetails}>
                    <Text
                      style={styles.itemName}
                    >{`${item.menuItem.name}`}</Text>
                    {["BOGO", "BOGOHO"].includes(
                      item.menuItem?.discountType
                    ) ? (
                      <Text style={styles.itemDescription} numberOfLines={2}>
                        {`${item.menuItem?.discountType}`}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.itemPrice}>{`x${item.qty}`}</Text>
                </View>
              )}
              ListFooterComponent={() =>
                orderData?.freeDessertApplied ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        gap: 8,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Text style={styles.itemName}>{"Dessert"}</Text>
                      <Text
                        style={{
                          fontFamily: Mulish400,
                          fontSize: 10,
                          color: "#008B8B",
                          backgroundColor: "#C2FFFF",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 4,
                          letterSpacing: 0.8,
                        }}
                      >
                        {"Free"}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.itemPrice}>{"x1"}</Text>
                    </View>
                  </View>
                ) : null
              }
              showsVerticalScrollIndicator={false}
            />
          </View>

          <Divider style={styles.divider} />

          {/* Total */}
          <View style={styles.totalContainer}>
            <Text
              style={styles.totalText}
            >{`Total: $${(orderData?.total || 0).toFixed(2)}`}</Text>
          </View>

          {/* Action Buttons or Status */}
          {nextOrderStatus ? (
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.rejectButton}
                activeOpacity={0.7}
                disabled={rjctBtnDisabled}
                onPress={() => handleRejectPress(orderData)}
              >
                {rejectBtnLoading ? (
                  <ActivityIndicator color={AppColor.primary} />
                ) : (
                  <Text
                    style={[styles.buttonText, { color: AppColor.primary }]}
                  >
                    {"Reject"}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptButton}
                activeOpacity={0.7}
                disabled={multiActionBtnLoading}
                onPress={() =>
                  handleMultiActionPress(nextOrderStatus, orderData)
                }
              >
                {multiActionBtnLoading ? (
                  <ActivityIndicator color={AppColor.white} />
                ) : (
                  <Text style={[styles.buttonText, { color: AppColor.white }]}>
                    {orderNextStatusNames[nextOrderStatus]}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ marginTop: 16 }}>
              <View style={styles.orderStatusInfoView}>
                <Text style={styles.orderStatusInfoText}>
                  {orderCurrentStatusNames[orderData?.orderStatus]}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Prep Time Modal */}
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

export default NewOrderPopup;

const styles = StyleSheet.create({
  orderStatusInfoView: {
    backgroundColor: "rgba(252, 123, 3, 0.08)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColor.primary,
    alignItems: "center",
  },
  orderStatusInfoText: {
    fontSize: 16,
    fontFamily: Mulish700,
    color: AppColor.primary,
  },
  itemsListContainer: {
    maxHeight: 300,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
  },
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  orderDetailsContainer: {
    width: "100%",
    maxHeight: "90%",
    backgroundColor: AppColor.white,
    borderRadius: 12,
    overflow: "hidden",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  orderContentContainer: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderIdText: {
    fontSize: 16,
    fontFamily: Mulish700,
    color: AppColor.black,
    marginBottom: 16,
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  userImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    marginRight: 12,
  },
  userImage: {
    width: "100%",
    height: "100%",
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  userName: {
    fontSize: 16,
    fontFamily: Mulish700,
    color: AppColor.black,
  },
  itemCount: {
    fontSize: 14,
    fontFamily: Mulish400,
    color: "#6F6F6F",
    marginTop: 4,
  },
  orderDate: {
    fontSize: 14,
    fontFamily: Mulish400,
    color: AppColor.black,
    textAlign: "right",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  orderTime: {
    fontSize: 14,
    fontFamily: Mulish400,
    color: "#6F6F6F",
    marginLeft: 4,
  },
  divider: {
    marginVertical: 16,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  itemDetails: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontFamily: Mulish400,
    color: AppColor.black,
  },
  itemDescription: {
    fontFamily: Mulish400,
    fontSize: 10,
    color: AppColor.black,
  },
  itemPrice: {
    fontSize: 16,
    fontFamily: Mulish400,
    color: AppColor.black,
  },
  totalContainer: {
    alignItems: "flex-end",
  },
  totalText: {
    fontSize: 18,
    fontFamily: Mulish400,
    color: AppColor.black,
  },
  actionContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColor.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  acceptButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: AppColor.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontFamily: Mulish400,
  },
});
