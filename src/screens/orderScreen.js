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
import { useFocusEffect } from "@react-navigation/native";
import moment from "moment";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import { Divider, IconButton, Menu } from "react-native-paper";
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
  extractAdvanceOrderLocationAndTime,
  getDisabledStatuses,
  getVendorOrderTotal,
  isVendorPosOrder,
} from "../helpers/order.helper";
import { printOrderTickets } from "../helpers/print.helper";
import AppImage from "../components/AppImage";

const ACTIVE_ORDER_STATUSES = [
  orderStatusStrings.placed,
  orderStatusStrings.accepted,
  orderStatusStrings.preparing,
  orderStatusStrings.ready_for_pickup,
  orderStatusStrings.driver_picked_up,
];

const OrderScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { profileStatus } = useSelector((state) => state.userReducer);

  const [dataLoading, setDataLoading] = useState(false);
  const [activeStage, setActiveStage] = useState("current");
  const [menuVisible, setMenuVisible] = useState(null);
  const [orderData, setOrderData] = useState([]);
  const [printing, setPrinting] = useState(false);
  const [isPrintSelectMode, setIsPrintSelectMode] = useState(false);
  const [selectedPrintOrderIds, setSelectedPrintOrderIds] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);

  // render order component
  const renderOrderComponent = ({ item, index }) => {
    const disabledStatuses = getDisabledStatuses(item?.orderStatus);
    const orderIsTerminal =
      item?.paymentStatus === "REFUNDED" ||
      [
        orderStatusStrings.rejected,
        orderStatusStrings.delivered,
        orderStatusStrings.completed,
        orderStatusStrings.cancel,
    ].includes(item?.orderStatus);
    const hideActionBtns = orderIsTerminal || isVendorPosOrder(item);
    const locationData = extractAdvanceOrderLocationAndTime(item);
    const isSelectedForPrint = selectedPrintOrderIds.includes(item?._id);

    return (
      <TouchableOpacity
        key={index}
        activeOpacity={0.7}
        style={[
          styles.orderDetailsContainer,
          isSelectedForPrint && styles.orderDetailsContainerSelected,
        ]}
        onPress={() => {
          if (isPrintSelectMode) {
            togglePrintOrderSelection(item?._id);
            return;
          }
          navigation.navigate("orderDetailsScreen", {
            orderId: item?._id,
          });
        }}
      >
        {/* Order Header */}
        <View style={[styles.orderHeader, { marginTop: 0 }]}>
          <View style={styles.orderHeaderTitleRow}>
            {isPrintSelectMode ? (
              <MaterialCommunityIcons
                name={
                  isSelectedForPrint
                    ? "checkbox-marked-circle"
                    : "checkbox-blank-circle-outline"
                }
                size={22}
                color={isSelectedForPrint ? AppColor.primary : "#6F6F6F"}
              />
            ) : null}
            <Text style={[styles.orderIdText, { color: AppColor.black }]}>
              {"Order Status"}
            </Text>
          </View>
          <Menu
            mode="flat"
            visible={menuVisible === index}
            onDismiss={handleMenuVisibility}
            anchor={
              <TouchableOpacity
                style={styles.menuAnchorContainer}
                activeOpacity={0.7}
                onPress={() =>
                  !isPrintSelectMode &&
                  !orderIsTerminal &&
                  handleMenuVisibility({ menuIndex: index })
                }
              >
                <Text style={styles.menuAnchorText}>
                  {orderCurrentStatusNames[item?.orderStatus]}
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
              title="Print"
              onPress={() => {
                setMenuVisible(null);
                handlePrintOrders([item]);
              }}
            />
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
              {"Order #" + (item?.orderNumber || item?._id)}
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
            <AppImage
              uri={item?.user?.profilePic || PROFILE_AVATAR}
              containerStyle={styles.orderUserImage}
            />
          </View>
          <View style={styles.orderUserInfo}>
            <Text
              numberOfLines={1}
              style={styles.orderUserName}
            >{`${item?.user?.firstName} ${item?.user?.lastName}`}</Text>
            <Text
              style={styles.orderItemCount}
            >{`${item?.items?.length} Items`}</Text>
          </View>
          <View>
            <Text style={styles.orderDate}>
              {moment(item?.createdAt).format("DD MMM, YYYY")}
            </Text>
            <View style={styles.orderTimeContainer}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={16}
                color="#6F6F6F"
              />
              <Text style={styles.orderTime}>
                {moment(item?.createdAt).format("hh:mm A")}
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
          >{`$${getVendorOrderTotal(item).toFixed(2)}`}</Text>
          {!hideActionBtns ? (
            <View style={styles.orderActionButtons}>
              <TouchableOpacity
                style={[
                  styles.rejectOrderBtn,
                  {
                    opacity: disabledStatuses.includes(
                      orderStatusStrings.rejected
                    )
                      ? 0.5
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
                      ? 0.5
                      : 1,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  if (disabledStatuses.includes(orderStatusStrings.accepted))
                    return;
                  handleAcceptPress(item);
                }}
                // disabled={disabledStatuses.includes(orderStatusStrings.accepted)}
              >
                <Text style={styles.orderBtnText}>{"Accept"}</Text>
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
    cancelPrintSelection();
    setActiveStage(stage);
  };

  // handle hide menu
  const handleMenuVisibility = ({ menuIndex = null }) => {
    setMenuVisible(menuIndex);
  };

  const togglePrintOrderSelection = (orderId) => {
    if (!orderId) return;
    setSelectedPrintOrderIds((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const startPrintSelection = () => {
    setMenuVisible(null);
    setSelectedPrintOrderIds([]);
    setIsPrintSelectMode(true);
  };

  const cancelPrintSelection = () => {
    setIsPrintSelectMode(false);
    setSelectedPrintOrderIds([]);
  };

  const handlePrintSelectedOrders = () => {
    const selectedOrders = orderData.filter((order) =>
      selectedPrintOrderIds.includes(order?._id)
    );
    handlePrintOrders(selectedOrders);
  };

  const handlePrintOrders = async (orders = []) => {
    const printableOrders = orders.filter(Boolean);
    if (!printableOrders.length) {
      dispatch(
        showSnackbar({
          type: "error",
          message: "No orders available to print.",
        })
      );
      return;
    }

    Alert.alert(
      printableOrders.length === 1 ? "Print order?" : "Print orders?",
      printableOrders.length === 1
        ? `Open printer options for order #${printableOrders[0]?.orderNumber || printableOrders[0]?._id}?`
        : `Open printer options for ${printableOrders.length} visible orders?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Print",
          onPress: () => printOrders(printableOrders),
        },
      ]
    );
  };

  const printOrders = async (orders = []) => {
    try {
      setPrinting(true);
      await printOrderTickets(orders);
      cancelPrintSelection();
    } catch (error) {
      dispatch(
        showSnackbar({
          type: "error",
          message: error?.message || "Unable to print order.",
        })
      );
    } finally {
      setPrinting(false);
    }
  };

  // handle menu item press
  const handleMenuItemPress = ({ item, index, status = null }) => {
    setMenuVisible(null);
    if (!status) return;
    if (status === orderStatusStrings.rejected) {
      handleRejectOrderPress(item);
    } else {
      updateOrderStatusAPI({
        order_id: item?._id,
        status: status,
      });
    }
  };

  // Handle "accept" press
  const handleAcceptPress = async (order) => {
    try {
      const response = await updateOrderStatusByID_API({
        order_id: order?._id,
        payload: {
          orderStatus: "ACCEPTED",
        },
      });
      console.log("response => ", response);
      if (response?.success && response?.data) {
        await getOrderDataFromAPI(1, false, activeStage === "advance");
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
                    if (item?._id === order?._id) {
                      return {
                        ...item,
                        ...response.data.order,
                      };
                    }
                  return item;
                });
                setOrderData(
                  tempOrderData.filter((item) =>
                    ACTIVE_ORDER_STATUSES.includes(item?.orderStatus)
                  )
                );
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
        await getOrderDataFromAPI(1, false, activeStage === "advance");
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
      let payload = {
        page,
        limit: 20,
        advance,
        status: advance
          ? "PLACED, ACCEPTED, PREPARING, READY_FOR_PICKUP, DRIVER_PICKED_UP"
          : "PLACED, ACCEPTED, PREPARING, READY_FOR_PICKUP, DRIVER_PICKED_UP",
      };

      const response = await getOrderList_API(payload);
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

  useFocusEffect(
    React.useCallback(() => {
      getOrderDataFromAPI(1, false, activeStage === "advance");
    }, [activeStage])
  );

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header */}
      <View
        style={[
          styles.headerContainer,
          { paddingTop: insets.top },
          profileStatus !== vendorProfileStatus.approved && {
            paddingTop: insets.top + 10,
            paddingBottom: 10,
          },
        ]}
      >
        <View style={styles.headerSide}>
          {isPrintSelectMode ? (
            <TouchableOpacity activeOpacity={0.7} onPress={cancelPrintSelection}>
              <Text style={styles.headerActionText}>{"Cancel"}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.headerTitle}>
          {isPrintSelectMode
            ? `${selectedPrintOrderIds.length} Selected`
            : "Orders"}
        </Text>
        <View style={styles.headerActions}>
          {profileStatus === vendorProfileStatus.approved ? (
            <>
              <IconButton
                icon="printer"
                iconColor={AppColor.black}
                size={22}
                disabled={
                  printing ||
                  orderData.length === 0 ||
                  (isPrintSelectMode && selectedPrintOrderIds.length === 0)
                }
                onPress={
                  isPrintSelectMode
                    ? handlePrintSelectedOrders
                    : startPrintSelection
                }
              />
              {!isPrintSelectMode ? (
                <IconButton
                  icon="history"
                  iconColor={AppColor.black}
                  size={24}
                  onPress={() => navigation.navigate("previousOrderScreen")}
                />
              ) : null}
            </>
          ) : null}
        </View>
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
                {"Regular Orders"}
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
                {"Pre-Orders"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.pastOrdersButton}
            onPress={() => navigation.navigate("previousOrderScreen")}
          >
            <View style={styles.pastOrdersButtonLabel}>
              <MaterialCommunityIcons
                name="history"
                size={20}
                color={AppColor.primary}
              />
              <Text style={styles.pastOrdersButtonText}>
                {"Past Orders"}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color="#6F6F6F"
            />
          </TouchableOpacity>

          {/* Content Container */}
          <View style={styles.contentContainer}>
            <FlatList
              data={orderData}
              extraData={{ orderData, isPrintSelectMode, selectedPrintOrderIds }}
              keyExtractor={(item) => item?._id.toString()}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: AppColor.border,
    backgroundColor: AppColor.white,
  },
  headerTitle: {
    fontSize: 19.78,
    fontFamily: Mulish700,
    color: AppColor.black,
    textAlign: "center",
  },
  headerSide: {
    width: "30%",
  },
  headerActionText: {
    fontFamily: Mulish700,
    fontSize: 14,
    color: AppColor.primary,
  },
  headerActions: {
    width: "30%",
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "flex-end",
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
  pastOrdersButton: {
    minHeight: 46,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: AppColor.border,
    backgroundColor: AppColor.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pastOrdersButtonLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pastOrdersButtonText: {
    fontFamily: Mulish700,
    fontSize: 14,
    color: AppColor.black,
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
  orderHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orderDetailsContainerSelected: {
    borderColor: AppColor.primary,
    backgroundColor: "rgba(252, 123, 3, 0.06)",
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
