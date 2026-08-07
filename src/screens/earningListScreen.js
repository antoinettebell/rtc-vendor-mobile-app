import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Divider, IconButton } from "react-native-paper";
import moment from "moment";
import { AppColor, Mulish400, Mulish600, Mulish700 } from "../utils/theme";
import StatusBarManager from "../components/StatusBarManager";
import { getEarningListByFoodTruckID_API } from "../api/appAPI";
import { getVendorOrderTotal } from "../helpers/order.helper";

const ToggleButton = ({ text, isActive, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.toggleButton, isActive && styles.toggleButtonActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.toggleButtonText,
          isActive && styles.toggleButtonTextActive,
        ]}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
};

const ContentRowItem = ({ title, value, titleStyle, valueStyle }) => {
  return (
    <View style={styles.contentRow}>
      <Text numberOfLines={1} style={[styles.contentRowTitle, titleStyle]}>
        {title}
      </Text>
      <Text style={[styles.contentRowValue, valueStyle]}>{value}</Text>
    </View>
  );
};

const EarningListScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { truckId, listType, durationType } = route.params;

  const [loading, setLoading] = useState(true);
  const [loadingFooter, setLoadingFooter] = useState(false);
  const [activeSection, setActiveSection] = useState(durationType || "monthly");
  const [refreshing, setRefreshing] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPage, setTotalPage] = useState(1);
  const [itemList, setItemList] = useState([]);
  const [earningsTotal, setEarningsTotal] = useState(0);
  const [cashEarningsTotal, setCashEarningsTotal] = useState(0);
  const [digitalEarningsTotal, setDigitalEarningsTotal] = useState(0);

  const renderItem = ({ item }) => {
    return (
      <Pressable
        key={item._id}
        style={styles.itemContainer}
        onPress={() =>
          navigation.navigate("orderDetailsScreen", {
            orderId: item?._id,
          })
        }
      >
        <View>
          <Text style={styles.orderNumberText}>{`# ${item.orderNumber}`}</Text>
          <Text numberOfLines={1} style={styles.createdAtText}>
            {`${moment(item.createdAt).format("MM/DD/YYYY - h:mm A")}`}
          </Text>
        </View>
        <View>
          <Text style={styles.totalText}>{`$${Number(
            item?.vendorEarning ?? getVendorOrderTotal(item)
          ).toFixed(2)}`}</Text>
        </View>
      </Pressable>
    );
  };

  const renderItemSeparator = () => {
    return <Divider style={styles.itemSeparator} />;
  };

  const renderEmptyComponent = () => {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No Data Found</Text>
      </View>
    );
  };

  const renderFooterComponent = () => {
    return loadingFooter && itemList?.length ? (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color={AppColor.primary} />
      </View>
    ) : null;
  };

  const handleRefresh = () => {
    fetchDataFromAPI(0, "refresh");
  };

  const handleLoadMore = () => {
    if (!loading && currentPage < totalPage) {
      fetchDataFromAPI(currentPage, "loadMore");
    }
  };

  const fetchDataFromAPI = async (
    page = currentPage,
    loadingType = "refresh"
  ) => {
    if (loadingType === "refresh") {
      setRefreshing(true);
    } else if (loadingType === "loadMore") {
      setLoadingFooter(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await getEarningListByFoodTruckID_API({
        page: page + 1,
        limit: 30,
        list: listType === "earning" ? "normal" : "dessert",
        listType: activeSection,
        foodTruck_id: truckId,
      });
      console.log("response => ", response);
      if (response.success && response.data) {
        if (page === 0) {
          setItemList(response.data.data);
        } else {
          setItemList((prevList) => [...prevList, ...response?.data?.data]);
        }
        setEarningsTotal(response.data.earnings_total || 0);
        setCurrentPage(response?.data?.page);
        setTotalPage(response?.data?.totalPages);
        setCashEarningsTotal(response.data.cashEarning || 0);
        setDigitalEarningsTotal(response.data.digitalEarning || 0);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingFooter(false);
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataFromAPI(0, "initial");
  }, [activeSection]);

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.sideContainer}>
          <IconButton
            icon="arrow-left"
            iconColor={AppColor.black}
            size={24}
            onPress={() => navigation.goBack()}
          />
        </View>
        <Text style={styles.title}>
          {"Earnings"}
        </Text>
        <View style={styles.sideContainer} />
      </View>

      {/* Toggle Buttons */}
      <View style={styles.toggleContainer}>
        <ToggleButton
          text="Daily"
          isActive={activeSection === "daily"}
          onPress={() => setActiveSection("daily")}
        />
        <ToggleButton
          text="Weekly"
          isActive={activeSection === "weekly"}
          onPress={() => setActiveSection("weekly")}
        />
        <ToggleButton
          text="Monthly"
          isActive={activeSection === "monthly"}
          onPress={() => setActiveSection("monthly")}
        />
      </View>

      {/* Conditional Rendering */}
      {loading ? (
        <View
          style={[
            styles.loadingContainer,
            {
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <ActivityIndicator size="large" color={AppColor.primary} />
        </View>
      ) : (
        <>
          {/* Banner Containre */}
          {listType === "earning" ? (
            <View style={styles.contentContainer}>
              <ContentRowItem
                title={`Total ${activeSection} Earning`}
                value={`$${earningsTotal.toFixed(2)}`}
                titleStyle={styles.contentRowTitleLarge}
                valueStyle={styles.contentRowValueLarge}
              />
              <Divider />
              <ContentRowItem
                title="Order Earning"
                value={`$${earningsTotal.toFixed(2)}`}
              />
              <ContentRowItem
                title="Cash Earning"
                value={`$${cashEarningsTotal.toFixed(2)}`}
              />
              <ContentRowItem
                title="Digital Earning"
                value={`$${digitalEarningsTotal.toFixed(2)}`}
              />
            </View>
          ) : null}

          {/* List Container */}
          <View style={{ flex: 1, paddingBottom: insets.bottom }}>
            <FlatList
              data={itemList}
              extraData={itemList}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              ItemSeparatorComponent={renderItemSeparator}
              ListEmptyComponent={renderEmptyComponent}
              ListFooterComponent={renderFooterComponent}
              showsVerticalScrollIndicator={false}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.8}
              contentContainerStyle={
                itemList.length > 0
                  ? styles.listContentContainer
                  : styles.emptyListContentContainer
              }
            />
          </View>
        </>
      )}
    </View>
  );
};

export default EarningListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppColor.white,
    borderBottomWidth: 1,
    borderBlockColor: AppColor.border,
  },
  sideContainer: {
    width: "20%",
  },
  title: {
    fontSize: 19.78,
    fontFamily: Mulish700,
    color: AppColor.black,
  },

  // toggle buttons
  toggleContainer: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: AppColor.primary,
    backgroundColor: AppColor.white,
  },
  toggleButtonActive: {
    backgroundColor: AppColor.primary,
  },
  toggleButtonText: {
    fontSize: 14,
    fontFamily: Mulish600,
    color: AppColor.primary,
  },
  toggleButtonTextActive: {
    color: AppColor.white,
  },

  // content
  contentContainer: {
    gap: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: AppColor.white,
    ...Platform.select({
      ios: {
        shadowColor: AppColor.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contentRowTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: Mulish400,
    color: AppColor.black,
    textTransform: "capitalize",
  },
  contentRowTitleLarge: {
    fontFamily: Mulish600,
    fontSize: 16,
  },
  contentRowValue: {
    fontSize: 14,
    fontFamily: Mulish400,
    color: AppColor.text,
  },
  contentRowValueLarge: {
    fontFamily: Mulish600,
    fontSize: 16,
  },

  // empty container
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: Mulish400,
    color: AppColor.text,
  },

  // footer container
  footerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },

  // list content container
  listContentContainer: {
    marginTop: 8,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: AppColor.border,
    backgroundColor: AppColor.white,
  },
  emptyListContentContainer: {
    minHeight: 100,
    height: "10%",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: AppColor.white,
    ...Platform.select({
      ios: {
        shadowColor: AppColor.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  // item separator
  itemSeparator: {
    marginVertical: 16,
  },

  // item conatiner
  itemContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  orderNumberText: {
    fontSize: 14,
    fontFamily: Mulish600,
    color: AppColor.black,
  },
  createdAtText: {
    fontSize: 13,
    fontFamily: Mulish400,
    color: AppColor.textPlaceholder,
  },
  totalText: {
    fontSize: 14,
    fontFamily: Mulish600,
    color: AppColor.black,
  },

  // loading indicator
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
