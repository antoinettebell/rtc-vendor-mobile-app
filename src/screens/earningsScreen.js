import React, { memo, useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator as NativeIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import moment from "moment";
import Entypo from "react-native-vector-icons/Entypo";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import { vendorProfileStatus } from "../utils/constants";
import { getOrderList_API } from "../api/appAPI";
import {
  formatMoney,
  getPastOrderDate,
  getVendorOrderTotal,
} from "../helpers/order.helper";
import StatusBarManager from "../components/StatusBarManager";

const PAST_ORDER_STATUSES = "DELIVERED, COMPLETED";

const getOrdersTotal = (orders) =>
  orders.reduce((total, order) => total + getVendorOrderTotal(order), 0);

const getOrdersForPeriod = (orders, period) => {
  const periodStart = moment().startOf(period);
  const periodEnd = moment().endOf(period);

  return orders.filter((order) => {
    const orderDate = getPastOrderDate(order);
    if (!orderDate) return false;

    return moment(orderDate).isBetween(periodStart, periodEnd, null, "[]");
  });
};

const EarningComponent = memo(({ title, amount, onPress }) => {
  return (
    <Pressable style={styles.earningContainer} onPress={onPress}>
      <Entypo
        name="wallet"
        size={24}
        color={AppColor.primary}
        style={styles.earningIcon}
      />
      <Text style={styles.earningAmount} numberOfLines={1}>
        {`$${amount}`}
      </Text>
      <View style={styles.earningRow}>
        <Text style={styles.earningTitle}>{title}</Text>
        <FontAwesome6
          name="circle-arrow-right"
          size={12}
          color={AppColor.primary}
          style={styles.arrowIcon}
        />
      </View>
    </Pressable>
  );
});

const EarningsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { profileStatus, user } = useSelector((state) => state.userReducer);

  const [dataLoading, setDataLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [earnings, setEarnings] = useState(null);

  const fetchPastOrders = async () => {
    let page = 1;
    let totalPages = 1;
    let orders = [];

    do {
      const response = await getOrderList_API({
        page,
        limit: 100,
        status: PAST_ORDER_STATUSES,
      });

      if (!response?.success || !response?.data) break;

      orders = [...orders, ...(response.data.orderList || [])];
      totalPages = response.data.totalPages || 1;
      page += 1;
    } while (page <= totalPages);

    return orders;
  };

  const onRefresh = async ({ isInitialLoad = false }) => {
    if (isInitialLoad) {
      setDataLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const pastOrders = await fetchPastOrders();
      const todayOrders = getOrdersForPeriod(pastOrders, "day");
      const weeklyOrders = getOrdersForPeriod(pastOrders, "week");
      const monthlyOrders = getOrdersForPeriod(pastOrders, "month");

      setEarnings({
        totalEarning: getOrdersTotal(pastOrders),
        todayEarning: getOrdersTotal(todayOrders),
        weeklyEarning: getOrdersTotal(weeklyOrders),
        monthlyEarning: getOrdersTotal(monthlyOrders),
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
      setDataLoading(false);
    }
  };

  const onPressNavigationHandler = ({
    listType = "earning",
    durationType = "monthly",
  }) => {
    navigation.navigate("earningListScreen", {
      truckId: user.foodTruck._id,
      listType: listType,
      durationType: durationType,
    });
  };

  useFocusEffect(
    useCallback(() => {
      onRefresh({ isInitialLoad: true });
    }, [])
  );

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {"Earnings"}
        </Text>
      </View>

      {profileStatus === vendorProfileStatus.approved ? (
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              tintColor={AppColor.primary}
              refreshing={isRefreshing}
              onRefresh={() => onRefresh({ isInitialLoad: false })}
            />
          }
        >
          {dataLoading ? (
            <View
              style={[styles.loadingContainer, { marginBottom: insets.bottom }]}
            >
              <NativeIndicator color={AppColor.primary} size="large" />
            </View>
          ) : (
            <>
              <View style={styles.earningsRow}>
                <EarningComponent
                  title={"Total Earnings"}
                  amount={formatMoney(earnings?.totalEarning || 0)}
                  onPress={() => onPressNavigationHandler({})}
                />
                <EarningComponent
                  title={"Today's Earning"}
                  amount={formatMoney(earnings?.todayEarning || 0)}
                  onPress={() =>
                    onPressNavigationHandler({ durationType: "daily" })
                  }
                />
              </View>
              <View style={styles.earningsRow}>
                <EarningComponent
                  title={"Weekly Earning"}
                  amount={formatMoney(earnings?.weeklyEarning || 0)}
                  onPress={() =>
                    onPressNavigationHandler({ durationType: "weekly" })
                  }
                />
                <EarningComponent
                  title={"Monthly Earning"}
                  amount={formatMoney(earnings?.monthlyEarning || 0)}
                  onPress={() =>
                    onPressNavigationHandler({ durationType: "monthly" })
                  }
                />
              </View>

            </>
          )}
        </ScrollView>
      ) : (
        <View style={styles.pendingContainer}>
          <Text style={styles.pendingText}>
            {
              "This feature will become available once your\nprofile is approved."
            }
          </Text>
        </View>
      )}
    </View>
  );
};

export default EarningsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
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
  contentContainer: {
    flexGrow: 1,
  },
  pendingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  pendingText: {
    fontSize: 16,
    fontFamily: Mulish400,
    color: AppColor.black,
    textAlign: "center",
  },

  // Earning Component
  earningContainer: {
    flex: 1 / 2,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: AppColor.border,
    backgroundColor: AppColor.white,
    shadowColor: AppColor.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  earningIcon: {
    alignSelf: "flex-end",
    marginBottom: 10,
  },
  earningRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  earningAmount: {
    fontSize: 24.65,
    fontFamily: Mulish400,
    color: AppColor.black,
    letterSpacing: 0.51,
  },
  earningTitle: {
    fontSize: 12.33,
    fontFamily: Mulish400,
    letterSpacing: 0.51,
    color: AppColor.black,
  },
  arrowIcon: {
    marginLeft: 4,
  },
  earningsRow: {
    flexDirection: "row",
    marginTop: 16,
    marginHorizontal: 16,
    gap: 16,
  },

  totalDeliveredContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    margin: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: AppColor.border,
    backgroundColor: AppColor.white,
    shadowColor: AppColor.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  totalDeliveredText: {
    fontSize: 18,
    fontFamily: Mulish400,
    color: AppColor.black,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
