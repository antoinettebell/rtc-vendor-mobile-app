import React, { memo, useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator as NativeIndicator,
  FlatList,
  Platform,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Feather from "react-native-vector-icons/Feather";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FastImage from "@d11/react-native-fast-image";
import moment from "moment";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";
import {
  ActivityIndicator,
  Divider,
  HelperText,
  Menu,
  TextInput,
} from "react-native-paper";
import { getOrderList_API, updateOrderStatusByID_API } from "../api/appAPI";
import { useDispatch } from "react-redux";
import { showSnackbar } from "../redux/slices/snackbarSlice";
import { orderStatusSrings, PROFILE_AVATAR } from "../utils/constants";
import Modal from "react-native-modal";
import { getDisabledStatuses } from "../utils/helper";

const OrderScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

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
    console.log("renderOrderComponent => ", index);
    const disabledStatuses = getDisabledStatuses(item.orderStatus);

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
                  {item.orderStatus.replace(/_/g, " ")}
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
              disabled={disabledStatuses.includes(orderStatusSrings.cancel)}
              onPress={() =>
                handleMenuItemPress({ item, index, status: item.orderStatus })
              }
            />
            <Menu.Item
              title="Placed"
              disabled={disabledStatuses.includes(orderStatusSrings.placed)}
              onPress={() =>
                handleMenuItemPress({ item, index, status: item.orderStatus })
              }
            />
            <Menu.Item
              title="Accepted"
              disabled={disabledStatuses.includes(orderStatusSrings.accepted)}
              onPress={() =>
                handleMenuItemPress({ item, index, status: item.orderStatus })
              }
            />
            <Menu.Item
              title="Rejected"
              disabled={disabledStatuses.includes(orderStatusSrings.rejected)}
              onPress={() =>
                handleMenuItemPress({ item, index, status: item.orderStatus })
              }
            />
            <Menu.Item
              title="Preparing"
              disabled={disabledStatuses.includes(orderStatusSrings.preparing)}
              onPress={() =>
                handleMenuItemPress({ item, index, status: item.orderStatus })
              }
            />
            <Menu.Item
              title="Ready to Pickup"
              disabled={disabledStatuses.includes(
                orderStatusSrings.ready_for_pickup
              )}
              onPress={() =>
                handleMenuItemPress({
                  item,
                  index,
                  status: item.orderStatus,
                })
              }
            />
            <Menu.Item
              title="Completed"
              disabled={disabledStatuses.includes(orderStatusSrings.completed)}
              onPress={() =>
                handleMenuItemPress({ item, index, status: item.orderStatus })
              }
            />
          </Menu>
        </View>
        {/* Order ID and Location */}
        <View style={styles.orderIdLocationContainer}>
          <Text numberOfLines={1} style={styles.orderIdText}>
            {"Order #" + item._id}
          </Text>
          <View style={styles.locationContainer}>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={16}
              color={AppColor.black}
            />
            <Text style={styles.locationText}>{"13 Streat"}</Text>
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
                {moment(item.createdAt).format("HH:mm A")}
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
          <View style={styles.orderActionButtons}>
            <TouchableOpacity
              style={[
                styles.rejectOrderBtn,
                {
                  opacity: disabledStatuses.includes(orderStatusSrings.rejected)
                    ? 0.7
                    : 1,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => {
                if (disabledStatuses.includes(orderStatusSrings.rejected))
                  return;
              }}
              // disabled={disabledStatuses.includes(orderStatusSrings.rejected)}
            >
              <Text style={[styles.orderBtnText, { color: AppColor.primary }]}>
                {"Reject"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.acceptOrderBtn,
                {
                  opacity: disabledStatuses.includes(orderStatusSrings.accepted)
                    ? 0.7
                    : 1,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => {
                if (disabledStatuses.includes(orderStatusSrings.accepted))
                  return;
                setTimeModal({
                  orderData: item,
                  isVisible: true,
                  loading: false,
                  prepTime: "10",
                });
              }}
              // disabled={disabledStatuses.includes(orderStatusSrings.accepted)}
            >
              <Text style={styles.orderBtnText}>{"Accept & Print"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // render footer for loading indicator
  const renderFooter = () => {
    if (!isLoadingMore) return null;

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
        <Text style={styles.emptyText}>{"No orders found"}</Text>
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
    updateOrderStatusAPI({
      order_id: item._id,
      status: status,
    });
  };

  // Modal cancel press
  const onModalCancelPress = () => {
    setTimeModal(null);
  };

  // validate prep time
  const validatePrepTime = (value) => {
    if (!value.trim()) return "Preparation time is required";
    return "";
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
      if (response.success && response.data) {
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
      setTimeModal((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  };

  // Handle load more
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreData) {
      getOrderDataFromAPI(currentPage + 1, true);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    getOrderDataFromAPI(1);
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
      if (response.success && response.data) {
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
  const getOrderDataFromAPI = async (page = 1, isLoadMore = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setDataLoading(true);
    }

    try {
      const response = await getOrderList_API({ page, limit: 20 });
      console.log("reponse => ", response);
      if (response.success && response.data) {
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
    getOrderDataFromAPI(1);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>{"Orders"}</Text>
      </View>

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

      {/* Preparation time modal */}
      <Modal
        isVisible={timeModal?.isVisible || false}
        backdropOpacity={0.5}
        animationIn="zoomIn"
        animationOut="zoomOut"
        backdropTransitionOutTiming={0.5}
      >
        <View style={styles.modalContainer}>
          {/* Title & Subtitle */}
          <Text style={styles.modalTitle}>{"Preparation Time"}</Text>
          <Text style={styles.modalSubtitle}>
            {"Add preparation time for this order"}
          </Text>

          <Divider
            style={{
              marginHorizontal: -24,
              marginVertical: 16,
            }}
          />

          {/* Prep Time Input */}
          <View>
            <Text style={[styles.inputLabel, { marginTop: 16 }]}>
              {"Enter Time in Mins"}
            </Text>
            <TextInput
              dense
              value={timeModal?.prepTime}
              onChangeText={(text) => {
                setTimeModal((prev) => ({
                  ...prev,
                  prepTime: text,
                }));
                if (!validatePrepTime(text)) {
                  setPrepTimeError("");
                }
              }}
              style={styles.input}
              contentStyle={styles.inputText}
              placeholder=""
              placeholderTextColor={AppColor.placeholderTextColor}
              mode="outlined"
              keyboardType="numeric"
              returnKeyLabel="done"
              returnKeyType="done"
              error={!!prepTimeError}
              outlineColor={AppColor.border}
              activeOutlineColor={AppColor.primary}
              outlineStyle={{ borderRadius: 8 }}
              theme={{ colors: { onSurfaceVariant: "#777" } }}
              right={
                <TextInput.Icon icon="clock-outline" color={AppColor.gray} />
              }
            />
            {!!prepTimeError ? (
              <HelperText
                type="error"
                visible={!!prepTimeError}
                style={styles.helper}
              >
                {prepTimeError}
              </HelperText>
            ) : null}
          </View>

          {/* Save Btn */}
          <TouchableOpacity
            style={[styles.modalBtnAdd, { marginTop: 30 }]}
            activeOpacity={0.7}
            onPress={handleSubmitPrepTime}
            disabled={timeModal?.loading || false}
          >
            {timeModal?.loading ? (
              <ActivityIndicator color={AppColor.white} />
            ) : (
              <Text style={styles.modalBtnText}>{"Submit"}</Text>
            )}
          </TouchableOpacity>

          {/* Close Btn */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={{ position: "absolute", top: 10, right: 10 }}
            hitSlop={10}
            onPress={onModalCancelPress}
            disabled={timeModal?.loading || false}
          >
            <Ionicons
              name="close-circle-sharp"
              size={32}
              color={AppColor.primary}
            />
          </TouchableOpacity>
        </View>
      </Modal>
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
    fontFamily: Primary400,
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
    fontFamily: Primary400,
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
    fontFamily: Primary400,
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
    fontFamily: Secondary400,
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
    fontFamily: Secondary400,
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
    fontFamily: Primary400,
    fontSize: 16,
    color: AppColor.black,
  },
  orderItemCount: {
    fontFamily: Secondary400,
    fontSize: 14,
    color: "#6F6F6F",
    paddingVertical: 5,
  },
  orderDate: {
    fontFamily: Secondary400,
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
    fontFamily: Secondary400,
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
    fontFamily: Secondary400,
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
    fontFamily: Secondary400,
    fontSize: 16,
  },

  // Menu Styles
  menuAnchorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  menuAnchorText: {
    fontFamily: Secondary400,
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
    gap: 16,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    fontFamily: Secondary400,
    color: AppColor.black,
  },

  // Preparation modal
  modalContainer: {
    padding: 24,
    borderRadius: 9,
    marginHorizontal: "5%",
    backgroundColor: AppColor.white,
  },
  modalTitle: {
    marginBottom: 4,
    fontSize: 20,
    fontFamily: Primary400,
    color: AppColor.text,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: Secondary400,
    color: AppColor.textHighlighter,
  },
  inputLabel: {
    fontSize: 15,
    fontFamily: Secondary400,
    color: AppColor.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: AppColor.white,
  },
  inputText: {
    fontSize: 15,
    fontFamily: Secondary400,
  },
  modalBtnAdd: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginTop: 15,
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
  modalBtnText: {
    color: AppColor.white,
    fontFamily: Secondary400,
    fontSize: 16,
  },

  helper: {
    marginBottom: 8,
    paddingLeft: 0,
    paddingTop: 0,
  },
});
