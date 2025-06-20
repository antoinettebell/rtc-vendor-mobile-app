import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator as NativeIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Divider, IconButton } from "react-native-paper";
import moment from "moment";
import FastImage from "@d11/react-native-fast-image";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";
import { getOrderByID_API } from "../api/appAPI";
import { useDispatch } from "react-redux";
import { showSnackbar } from "../redux/slices/snackbarSlice";
import { PROFILE_AVATAR } from "../utils/constants";

const OrderDetailsScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const params = route.params;

  const [dataLoading, setDataLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);

  const getOrderDetailsFromAPI = async () => {
    setDataLoading(true);
    try {
      const order_id = params.orderId;
      console.log("order_id => ", order_id);
      const response = await getOrderByID_API(order_id);
      console.log(`response ${order_id} => `, response);
      if (response.success && response.data) {
        setOrderData(response.data.order);
      } else {
        setOrderData(null);
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

  useEffect(() => {
    console.log("params => ", params);
    getOrderDetailsFromAPI();
  }, [params]);

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.black}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>{"Order Details"}</Text>
        {params ? (
          <IconButton
            icon="refresh"
            iconColor={AppColor.black}
            size={24}
            onPress={() => getOrderDetailsFromAPI()}
          />
        ) : (
          <View style={styles.headerIconContainer}></View>
        )}
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
          {/* Order Details Container */}
          <View style={styles.orderDetailsContainer}>
            {/* Order Header */}
            <View style={[styles.orderHeader, { marginTop: 0 }]}>
              <Text style={[styles.orderIdText, { color: AppColor.black }]}>
                {"Order Status"}
              </Text>
              <Text
                style={[
                  styles.orderIdText,
                  { color: AppColor.primary, textTransform: "capitalize" },
                ]}
              >
                {orderData?.orderStatus}
              </Text>
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
              <Text
                numberOfLines={1}
                style={styles.orderIdText}
              >{`Order #${orderData?._id}`}</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={16}
                  color={AppColor.black}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: Secondary400,
                    color: AppColor.black,
                  }}
                >
                  {"13 Streat"}
                </Text>
              </View>
            </View>
            <View style={styles.orderHeader}>
              <View style={styles.orderUserImageContainer}>
                <FastImage
                  source={{
                    uri: orderData.user.profilePic || PROFILE_AVATAR,
                  }}
                  style={styles.orderUserImage}
                />
              </View>
              <View style={styles.orderUserInfo}>
                <Text
                  style={styles.orderUserName}
                >{`${orderData.user.firstName} ${orderData.user.lastName}`}</Text>
                <Text
                  style={styles.orderItemCount}
                >{`${orderData.items.length} Items`}</Text>
              </View>
              <View>
                <Text style={styles.orderDate}>
                  {moment(orderData.createdAt).format("DD MMM, YYYY")}
                </Text>
                <View style={styles.orderTimeContainer}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={16}
                    color="#6F6F6F"
                  />
                  <Text style={styles.orderTime}>
                    {moment(orderData.createdAt).format("HH:mm A")}
                  </Text>
                </View>
              </View>
            </View>
            <Divider style={styles.orderDivider} />
            {/* Item Details */}
            {orderData.items.map((item, index) => (
              <View style={styles.orderItemContainer} key={index}>
                <View style={styles.orderItemDetails}>
                  <Text
                    style={styles.orderItemName}
                  >{`${item.qty} x ${item.menuItem.name}`}</Text>
                  <Text style={styles.orderItemDescription}>
                    {item.menuItem.description}
                  </Text>
                </View>
                <View>
                  <Text
                    style={styles.orderItemPrice}
                  >{`$${item.menuItem.price}`}</Text>
                </View>
              </View>
            ))}
            {/* for dessert */}
            {/* <View style={styles.orderItemContainer}>
              <View style={styles.freeItemContainer}>
                <Text style={styles.orderItemName}>{"1 x Dessert"}</Text>
                <Text style={styles.freeItemBadge}>{"Free"}</Text>
              </View>
              <View>
                <Text style={styles.orderItemPrice}>{"$0.00"}</Text>
              </View>
            </View> */}
            <Divider style={styles.orderDivider} />
            {/* Total */}
            <View style={styles.orderTotalContainer}>
              <Text style={styles.orderTotalText}>{`$${orderData.subTotal.toFixed(2)}`}</Text>
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
                  fontFamily: Primary400,
                  fontSize: 18,
                  color: AppColor.black,
                }}
              >
                Total Order
              </Text>
              <Text
                style={{
                  fontFamily: Secondary400,
                  fontSize: 18,
                  color: AppColor.black,
                }}
              >
                {`$${orderData.total.toFixed(2)}`}
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
                    fontFamily: Secondary400,
                    fontSize: 14,
                    color: AppColor.black,
                  }}
                >
                  {"Sales Tax"}
                </Text>
                <Text
                  style={{
                    fontFamily: Secondary400,
                    fontSize: 14,
                    color: AppColor.black,
                  }}
                >
                  {"0%"}
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
                    fontFamily: Secondary400,
                    fontSize: 14,
                    color: AppColor.black,
                  }}
                >
                  {"Discount"}
                </Text>
                <Text
                  style={{
                    fontFamily: Secondary400,
                    fontSize: 14,
                    color: AppColor.black,
                  }}
                >
                  {`$${orderData.discount}`}
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
                    fontFamily: Secondary400,
                    fontSize: 14,
                    color: AppColor.black,
                  }}
                >
                  {"Total with Tax"}
                </Text>
                <Text
                  style={{
                    fontFamily: Secondary400,
                    fontSize: 14,
                    color: AppColor.black,
                  }}
                >
                  {`$${orderData.taxAmount}`}
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
                    fontFamily: Secondary400,
                    fontSize: 14,
                    color: AppColor.black,
                  }}
                >
                  {"Payment Processing Fee"}
                </Text>
                <Text
                  style={{
                    fontFamily: Secondary400,
                    fontSize: 14,
                    color: AppColor.black,
                  }}
                >
                  {"$0.0"}
                </Text>
              </View>
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
                  fontFamily: Primary400,
                  fontSize: 18,
                  color: AppColor.black,
                }}
              >
                {"Total Amount"}
              </Text>
              <Text
                style={{
                  fontFamily: Secondary400,
                  fontSize: 18,
                  color: AppColor.black,
                }}
              >
                {`$${orderData.total.toFixed(2)}`}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginVertical: 16,
                gap: 12,
              }}
            >
              <TouchableOpacity
                style={styles.rejectOrderBtn}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.orderBtnText, { color: AppColor.primary }]}
                >
                  {"Reject"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.acceptOrderBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.orderBtnText}>{"Accept & Print"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text
            style={{
              fontFamily: Secondary400,
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
    fontFamily: Primary400,
  },
  headerIconContainer: {
    width: 48,
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
    fontFamily: Secondary400,
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
    fontFamily: Secondary400,
    fontSize: 14,
    color: AppColor.black,
  },
  orderItemDescription: {
    fontFamily: Secondary400,
    fontSize: 14,
    color: AppColor.black,
  },
  orderItemPrice: {
    fontFamily: Secondary400,
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
    fontFamily: Secondary400,
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
    fontFamily: Secondary400,
    fontSize: 20,
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
    fontFamily: Secondary400,
    fontSize: 16,
  },
});
