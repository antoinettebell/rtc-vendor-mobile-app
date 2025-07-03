import React, { memo, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator as NativeIndicator,
  FlatList,
  Platform,
  Alert,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Feather from "react-native-vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FastImage from "@d11/react-native-fast-image";
import moment from "moment";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import { Divider, Menu } from "react-native-paper";
import { getOrderList_API, updateOrderStatusByID_API } from "../api/appAPI";
import { useDispatch, useSelector } from "react-redux";
import { showSnackbar } from "../redux/slices/snackbarSlice";
import {
  orderCurrentStatusNames,
  orderStatusStrings,
  PROFILE_AVATAR,
  vendorProfileStatus,
} from "../utils/constants";
import {
  calculateTotalPreparationTime,
  extractAdvanceOrderLocationAndTime,
  getDisabledStatuses,
} from "../helpers/order.helper";
import CustomPrepTimeModal from "../components/CustomPrepTimeModal";

const OrderScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { profileStatus } = useSelector((state) => state.userReducer);

  const [dataLoading, setDataLoading] = useState(false);
  const [activeStage, setActiveStage] = useState("current");
  const [menuVisible, setMenuVisible] = useState(null);
  const [orderData, setOrderData] = useState([]);
  const [timeModal, setTimeModal] = useState(null);
  const [prepTimeError, setPrepTimeError] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);

  // render order component
  const renderOrderComponent = ({ item, index }) => {
    const disabledStatuses = getDisabledStatuses(item.orderStatus);
    const hideActionBtns =
      item.orderStatus === orderStatusStrings.rejected ||
      item.orderStatus === orderStatusStrings.completed ||
      item.orderStatus === orderStatusStrings.cancel ||
      false;
    const locationData = extractAdvanceOrderLocationAndTime(item);

    return (
      <TouchableOpacity
        key={index}
        activeOpacity={0.7}
        style={styles.orderDetailsContainer}
        onPress={() =>
          navigation.navigate("orderDetailsScreen", {
            orderId: item._id,
          })
        }
      >
        {/* Order Header */}
        <View style={[styles.orderHeader, { marginTop: 0 }]}>
          <Text style={[styles.orderIdText, { color: AppColor.black }]}>
            {"Order Status"}
          </Text>
          <Menu
            mode="flat"
            visible={menuVisible === index}
            onDismiss={handleMenuVisibility}
            anchor={
              <TouchableOpacity
                style={styles.menuAnchorContainer}
                activeOpacity={0.7}
                onPress={() => handleMenuVisibility({ menuIndex: index })}
              >
                <Text style={styles.menuAnchorText}>
                  {orderCurrentStatusNames[item.orderStatus]}
                </Text>
                <Feather
                  name="chevron-down"
                  size={16}
                  color={AppColor.primary}
                />
              </TouchableOpacity>
            }
            contentStyle={styles.menuContent}
          >
            <Menu.Item
              title="Cancel"
              disabled={disabledStatuses.includes(orderStatusStrings.cancel)}
              onPress={() =>
                handleMenuItemPress({
                  item,
                  index,
                  status: orderStatusStrings.cancel,
                })
              }
            />
            <Menu.Item
              title="Placed"
              disabled={disabledStatuses.includes(orderStatusStrings.placed)}
              onPress={() =>
                handleMenuItemPress({
                  item,
                  index,
                  status: orderStatusStrings.placed,
                })
              }
            />
            <Menu.Item
              title="Accepted"
              disabled={disabledStatuses.includes(orderStatusStrings.accepted)}
              onPress={() =>
                handleMenuItemPress({
                  item,
                  index,
                  status: orderStatusStrings.accepted,
                })
              }
            />
            <Menu.Item
              title="Rejected"
              disabled={disabledStatuses.includes(orderStatusStrings.rejected)}
              onPress={() =>
                handleMenuItemPress({
                  item,
                  index,
                  status: orderStatusStrings.rejected,
                })
              }
            />
            <Menu.Item
              title="Preparing"
              disabled={disabledStatuses.includes(orderStatusStrings.preparing)}
              onPress={() =>
                handleMenuItemPress({
                  item,
                  index,
                  status: orderStatusStrings.preparing,
                })
              }
            />
            <Menu.Item
              title="Ready to Pickup"
              disabled={disabledStatuses.includes(
                orderStatusStrings.ready_for_pickup
              )}
              onPress={() =>
                handleMenuItemPress({
                  item,
                  index,
                  status: orderStatusStrings.ready_for_pickup,
                })
              }
            />
            <Menu.Item
              title="Completed"
              disabled={disabledStatuses.includes(orderStatusStrings.completed)}
              onPress={() =>
                handleMenuItemPress({
                  item,
                  index,
                  status: orderStatusStrings.completed,
                })
              }
            />
          </Menu>
        </View>
        {/* Order ID and Location */}
        <View style={styles.orderIdLocationContainer}>
          <View style={{ width: "75%", paddingRight: 8 }}>
            <Text numberOfLines={1} style={styles.orderIdText}>
              {"Order #" + item._id}
            </Text>
          </View>
          <View style={styles.locationContainer}>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={16}
              color={AppColor.black}
            />
            <Text numberOfLines={1} style={styles.locationText}>
              {locationData?.locationTitle}
            </Text>
          </View>
        </View>
        {/* Order User Details */}
        <View style={styles.orderHeader}>
          <View style={styles.orderUserImageContainer}>
            <FastImage
              source={{ uri: item.user.profilePic || PROFILE_AVATAR }}
              style={styles.orderUserImage}
            />
          </View>
          <View style={styles.orderUserInfo}>
            <Text
              numberOfLines={1}
              style={styles.orderUserName}
            >{`${item.user.firstName} ${item.user.lastName}`}</Text>
            <Text
              style={styles.orderItemCount}
            >{`${item.items.length} Items`}</Text>
          </View>
          <View>
            <Text style={styles.orderDate}>
              {moment(item.createdAt).format("DD MMM, YYYY")}
            </Text>
            <View style={styles.orderTimeContainer}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={16}
                color="#6F6F6F"
              />
              <Text style={styles.orderTime}>
                {moment(item.createdAt).format("hh:mm A")}
              </Text>
            </View>
          </View>
        </View>
        {/* Divider */}
        <Divider style={styles.orderDivider} />
        {/* Total */}
        <View style={styles.orderTotalContainer}>
          <Text
            style={styles.orderTotalText}
          >{`$${item.total.toFixed(2)}`}</Text>
          {!hideActionBtns ? (
            <View style={styles.orderActionButtons}>
              <TouchableOpacity
                style={[
                  styles.rejectOrderBtn,
                  {
                    opacity: disabledStatuses.includes(
                      orderStatusStrings.rejected
                    )
                      ? 0.7
                      : 1,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  if (disabledStatuses.includes(orderStatusStrings.rejected))
                    return;
                  handleRejectOrderPress(item);
                }}
                // disabled={disabledStatuses.includes(orderStatusStrings.rejected)}
              >
                <Text
                  style={[styles.orderBtnText, { color: AppColor.primary }]}
                >
                  {"Reject"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.acceptOrderBtn,
                  {
                    opacity: disabledStatuses.includes(
                      orderStatusStrings.accepted
                    )
                      ? 0.7
                      : 1,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  if (disabledStatuses.includes(orderStatusStrings.accepted))
                    return;
                  handleAcceptAndPrintPress(item);
                }}
                // disabled={disabledStatuses.includes(orderStatusStrings.accepted)}
              >
                <Text style={styles.orderBtnText}>{"Accept & Print"}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  // render footer for loading indicator
  const renderFooter = () => {
    if (!isLoadingMore || dataLoading) return null;

    return (
      <View style={styles.footerContainer}>
        <NativeIndicator size="small" color={AppColor.primary} />
      </View>
    );
  };

  // render empty component
  const renderEmptyComponent = () => {
    return (
      <View style={styles.emptyContainer}>
        {dataLoading ? (
          <NativeIndicator size="large" color={AppColor.primary} />
        ) : (
          <Text style={styles.emptyText}>{"No orders found"}</Text>
        )}
      </View>
    );
  };

  // handle stage change
  const handleStageChange = (stage) => {
    setActiveStage(stage);
  };

  // handle hide menu
  const handleMenuVisibility = ({ menuIndex = null }) => {
    setMenuVisible(menuIndex);
  };

  // handle menu item press
  const handleMenuItemPress = ({ item, index, status = null }) => {
    setMenuVisible(null);
    if (!status) return;
    if (status === orderStatusStrings.preparing) {
      handleAcceptAndPrintPress(item);
    } else if (status === orderStatusStrings.rejected) {
      handleRejectOrderPress(item);
    } else {
      updateOrderStatusAPI({
        order_id: item._id,
        status: status,
      });
    }
  };

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

  // Handle "reject" order press
  const handleRejectOrderPress = (order) => {
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
            try {
              const response = await updateOrderStatusByID_API({
                order_id: order?._id,
                payload: {
                  orderStatus: "REJECTED",
                },
              });
              console.log("response => ", response);
              if (response?.success && response?.data) {
                const tempOrderData = orderData.map((item) => {
                  if (item._id === order?._id) {
                    return {
                      ...item,
                      orderStatus: response.data.order.orderStatus,
                    };
                  }
                  return item;
                });
                setOrderData(tempOrderData);
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
        const tempOrderData = orderData.map((item) => {
          if (item._id === timeModal?.orderData?._id) {
            return {
              ...item,
              orderStatus: response.data.order.orderStatus,
              pickupTime: response.data.order.pickupTime,
            };
          }
          return item;
        });
        setOrderData(tempOrderData);
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

  // Handle load more
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreData) {
      getOrderDataFromAPI(currentPage + 1, true, activeStage === "advance");
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    getOrderDataFromAPI(1, false, activeStage === "advance");
  };

  // update order status API
  const updateOrderStatusAPI = async ({ order_id, status }) => {
    try {
      let payload = {
        orderStatus: status,
      };
      if (status === "PREPARING") {
        payload.pickupTime = "00";
      }
      const response = await updateOrderStatusByID_API({
        order_id,
        payload,
      });
      console.log("response => ", response);
      if (response?.success && response?.data) {
        const tempOrderData = orderData.map((item) => {
          if (item._id === order_id) {
            return {
              ...item,
              orderStatus: status,
            };
          }
          return item;
        });
        setOrderData(tempOrderData);
      }
    } catch (error) {
      console.log("error => ", error);
    } finally {
    }
  };

  // fetch order data from API
  const getOrderDataFromAPI = async (
    page = 1,
    isLoadMore = false,
    advance = false
  ) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setDataLoading(true);
    }

    try {
      const response = await getOrderList_API({ page, limit: 20, advance });
      console.log("reponse => ", response);
      if (response?.success && response?.data) {
        setTotalPages(response.data.totalPages);
        setCurrentPage(page);

        if (isLoadMore) {
          // Append new data for load more
          setOrderData((prev) => [...prev, ...response.data.orderList]);
        } else {
          // Replace data for initial load or refresh
          setOrderData(response.data.orderList);
        }

        // Check if there's more data to load
        setHasMoreData(page < response.data.totalPages);
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
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    setHasMoreData(true);
    setOrderData([]);
    getOrderDataFromAPI(1, false, activeStage === "advance");
  }, [activeStage]);

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>{"Orders"}</Text>
      </View>

      {profileStatus === vendorProfileStatus.approved ? (
        <>
          {/* Button Container */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={
                activeStage === "current"
                  ? styles.activeButton
                  : styles.inactiveButton
              }
              onPress={() => handleStageChange("current")}
              disabled={dataLoading}
            >
              <Text
                style={
                  activeStage === "current"
                    ? styles.activeButtonText
                    : styles.inactiveButtonText
                }
              >
                {"Current Orders"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={
                activeStage === "advance"
                  ? styles.activeButton
                  : styles.inactiveButton
              }
              onPress={() => handleStageChange("advance")}
              disabled={dataLoading}
            >
              <Text
                style={
                  activeStage === "advance"
                    ? styles.activeButtonText
                    : styles.inactiveButtonText
                }
              >
                {"Advance Orders"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content Container */}
          <View style={styles.contentContainer}>
            <FlatList
              data={orderData}
              extraData={orderData}
              keyExtractor={(item) => item._id.toString()}
              renderItem={renderOrderComponent}
              contentContainerStyle={styles.flatListContent}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.8}
              ListFooterComponent={renderFooter}
              refreshing={dataLoading}
              onRefresh={handleRefresh}
              ListEmptyComponent={renderEmptyComponent}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </>
      ) : (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 16,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontFamily: Mulish400,
              color: AppColor.black,
              textAlign: "center",
            }}
          >
            {
              "This feature will become available once your\nprofile is approved."
            }
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

export default memo(OrderScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // Header
  headerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: AppColor.border,
    backgroundColor: AppColor.white,
  },
  headerTitle: {
    fontSize: 19.78,
    fontFamily: Mulish700,
    color: AppColor.black,
  },

  // Button Container
  buttonContainer: {
    flexDirection: "row",
    gap: 16,
    padding: 16,
  },
  activeButton: {
    height: 46,
    flex: 1 / 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4.24,
    backgroundColor: AppColor.primary,
  },
  activeButtonText: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.white,
  },
  inactiveButton: {
    height: 46,
    flex: 1 / 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4.24,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: AppColor.primary,
    backgroundColor: AppColor.white,
  },
  inactiveButtonText: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.primary,
  },

  // Loading Container
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: (insets) => insets.bottom,
  },

  // Content Container
  contentContainer: {
    flex: 1,
  },
  flatListContent: {
    flexGrow: 1,
  },
  footerContainer: {
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontFamily: Mulish400,
    fontSize: 14,
    color: AppColor.black,
  },

  // Order Details Container
  orderDetailsContainer: {
    margin: 16,
    padding: 16,
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
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 16,
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
  orderTotalContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  acceptOrderBtn: {
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
    fontFamily: Mulish400,
    fontSize: 16,
  },

  // Menu Styles
  menuAnchorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  menuAnchorText: {
    fontFamily: Mulish400,
    fontSize: 14,
    color: AppColor.primary,
    textTransform: "capitalize",
    textAlign: "right",
  },
  menuContent: {
    backgroundColor: AppColor.white,
    borderWidth: 1,
    borderColor: AppColor.border,
    elevation: 1,
    shadowColor: AppColor.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  // Order ID and Location
  orderIdLocationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationContainer: {
    maxWidth: "25%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    fontFamily: Mulish400,
    color: AppColor.black,
  },
});
