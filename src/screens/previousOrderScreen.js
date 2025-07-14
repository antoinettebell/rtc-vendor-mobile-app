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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FastImage from "@d11/react-native-fast-image";
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
  calculateTotalPreparationTime,
  extractAdvanceOrderLocationAndTime,
  getDisabledStatuses,
} from "../helpers/order.helper";
import CustomPrepTimeModal from "../components/CustomPrepTimeModal";

const PreviousOrderScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const [dataLoading, setDataLoading] = useState(false);
  const [orderData, setOrderData] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);

  // render order component
  const renderOrderComponent = ({ item, index }) => {
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
          <Text style={styles.menuAnchorText}>
            {orderCurrentStatusNames[item.orderStatus]}
          </Text>
        </View>
        {/* Order ID and Location */}
        <View style={styles.orderIdLocationContainer}>
          <View style={{ width: "75%", paddingRight: 8 }}>
            <Text numberOfLines={1} style={styles.orderIdText}>
              {"Order #" + (item.orderNumber || item._id)}
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

  // Handle load more
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreData) {
      getOrderDataFromAPI(currentPage + 1, true);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    getOrderDataFromAPI(1, false);
  };

  // fetch order data from API
  const getOrderDataFromAPI = async (page = 1, isLoadMore = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setDataLoading(true);
    }

    try {
      const reqPayload = {
        page,
        limit: 20,
        status: "CANCEL, REJECTED, COMPLETED",
      };
      const response = await getOrderList_API(reqPayload);
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
    getOrderDataFromAPI(1, false);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={{ width: "20%", alignItems: "flex-start" }}>
          <IconButton
            icon="arrow-left"
            iconColor={AppColor.black}
            size={24}
            onPress={() => navigation.goBack()}
          />
        </View>
        <Text style={styles.headerTitle}>{"Previous Orders"}</Text>
        <View style={{ width: "20%" }} />
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
    </View>
  );
};

export default memo(PreviousOrderScreen);

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
