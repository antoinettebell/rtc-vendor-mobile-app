import React, { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import StatusBarManager from "../components/StatusBarManager";
import {
  AppColor,
  Mulish400,
  Mulish500,
  Mulish600,
  Mulish700,
} from "../utils/theme";
import { IconButton } from "react-native-paper";
import { getReviewRating_API, getReviewRatingStats_API } from "../api/appAPI";
import FastImage from "@d11/react-native-fast-image";
import { PROFILE_AVATAR } from "../utils/constants";
import AppImage from "../components/AppImage";

const LIMIT = 20;

const RateReviewScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state) => state.userReducer);

  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [refreshLoader, setRefreshLoader] = useState(false);
  const [reviewStats, setReviewStats] = useState(null);
  const [reviewData, setReviewData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);

  const renderStatsStars = (value) => {
    return [1, 2, 3, 4, 5].map((i) => (
      <Text
        key={i}
        style={{
          color: i <= value ? AppColor.yellow : AppColor.border,
          fontSize: 16,
        }}
      >
        ★
      </Text>
    ));
  };

  const renderReviewComponent = ({ item }) => {
    return (
      <View style={styles.reviewItem} key={item?._id}>
        <AppImage
          uri={item?.user?.profilePic || PROFILE_AVATAR}
          containerStyle={styles.reviewAvatar}
        />
        <View style={{ flex: 1, marginLeft: 16, gap: 5 }}>
          <Text style={styles.userName}>
            {[item?.user?.firstName, item?.user?.lastName].filter(Boolean).join(" ") ||
              "Verified customer"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
            {renderStatsStars(item.rate)}
          </View>
          <Text style={styles.reviewText}>{item.review}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {item?.images?.map((i) => (
              <AppImage
                key={i}
                uri={i}
                containerStyle={{
                  width: 50,
                  height: 50,
                  borderRadius: 4,
                }}
              />
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderHeaderComponent = () => {
    if (!reviewStats) return null;
    const reviewCount = Number(
      reviewStats.reviewCount ?? reviewStats.totalReviews ?? 0,
    );
    const averageRating = Number(
      reviewStats.averageRating ?? reviewStats.avgRate,
    );
    const hasReviews = reviewCount > 0 && Number.isFinite(averageRating);

    return (
      <View style={styles.statsContainer}>
        <View style={{ flex: 0.6 }}>
          <Text style={styles.statsTitle}>
            {hasReviews ? `★ ${averageRating.toFixed(1)}` : "New vendor"}
          </Text>
          <Text style={styles.totalReviews}>
            {reviewCount}
            <Text style={{ color: AppColor.gray }}>
              {`\n${reviewCount === 1 ? "Review" : "Reviews"}`}
            </Text>
          </Text>
        </View>
        <View
          style={{
            height: "100%",
            width: 1,
            marginHorizontal: 16,
            backgroundColor: AppColor.border,
          }}
        />
        <View style={{ flex: 1 }}>
          <View style={styles.allRatingSubCotainer}>
            <View style={styles.starsContainer}>{renderStatsStars(5)}</View>
            <Text style={styles.overallRating}>{reviewStats.star5}</Text>
          </View>
          <View style={styles.allRatingSubCotainer}>
            <View style={styles.starsContainer}>{renderStatsStars(4)}</View>
            <Text style={styles.overallRating}>{reviewStats.star4}</Text>
          </View>
          <View style={styles.allRatingSubCotainer}>
            <View style={styles.starsContainer}>{renderStatsStars(3)}</View>
            <Text style={styles.overallRating}>{reviewStats.star3}</Text>
          </View>
          <View style={styles.allRatingSubCotainer}>
            <View style={styles.starsContainer}>{renderStatsStars(2)}</View>
            <Text style={styles.overallRating}>{reviewStats.star2}</Text>
          </View>
          <View style={styles.allRatingSubCotainer}>
            <View style={styles.starsContainer}>{renderStatsStars(1)}</View>
            <Text style={styles.overallRating}>{reviewStats.star1}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFooterComponent = () => {
    if (!dataLoading || currentPage >= totalPages) return null;

    return (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color={AppColor.primary} />
      </View>
    );
  };

  const renderEmptyComponent = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={AppColor.primary} />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {error ? "Failed to load reviews" : "No reviews found"}
        </Text>
        {error && (
          <IconButton
            icon="reload"
            size={24}
            onPress={handleRefresh}
            color={AppColor.primary}
          />
        )}
      </View>
    );
  };

  const handleLoadMore = () => {
    if (!dataLoading && currentPage < totalPages) {
      getReviewDataFromAPI(currentPage + 1);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshLoader(true);
      setError(null);
      await getReviewDataFromAPI(1, true);
    } catch (err) {
      setError(err.message || "Failed to refresh");
    } finally {
      setRefreshLoader(false);
    }
  };

  const getReviewDataFromAPI = async (page = 1, isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshLoader(true);
      } else if (page === 1) {
        setLoading(true);
      } else {
        setDataLoading(true);
      }

      const foodTruck_id = user?.foodTruck?._id;
      if (!foodTruck_id) throw new Error("Food truck ID not found");

      const ratingStatsResponse = await getReviewRatingStats_API(foodTruck_id);
      if (ratingStatsResponse?.success && ratingStatsResponse?.data) {
        setReviewStats(ratingStatsResponse?.data?.reviewStats);
      }

      const reviewResponse = await getReviewRating_API({
        foodTruck_id: foodTruck_id,
        page: page,
        limit: LIMIT,
      });
      if (reviewResponse?.success && reviewResponse?.data) {
        setTotalPages(reviewResponse.data.totalPages);
        setCurrentPage(page);

        if (page === 1 || isRefreshing) {
          setReviewData(reviewResponse.data.reviewList);
        } else {
          setReviewData((prev) => [...prev, ...reviewResponse.data.reviewList]);
        }
      }
    } catch (error) {
      console.log("error => ", error);
      setError(error.message || "Failed to load reviews");
    } finally {
      setLoading(false);
      setDataLoading(false);
      if (isRefreshing) {
        setRefreshLoader(false);
      }
    }
  };

  useEffect(() => {
    getReviewDataFromAPI(1);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header Container */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.black}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>{"Reviews"}</Text>
        <View style={styles.headerIconContainer}></View>
      </View>

      {/* Content Container */}
      <View style={{ flex: 1, paddingBottom: insets.bottom }}>
        <FlatList
          data={reviewData}
          extraData={reviewData}
          keyExtractor={(item) => item._id.toString()}
          renderItem={renderReviewComponent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.flatListContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={renderHeaderComponent}
          ListFooterComponent={renderFooterComponent}
          refreshing={refreshLoader}
          onRefresh={handleRefresh}
          ListEmptyComponent={renderEmptyComponent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
};

export default RateReviewScreen;

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
  headerIconContainer: {
    width: 48,
    alignItems: "center",
  },

  // Stats
  statsContainer: {
    gap: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statsTitle: {
    fontSize: 29.05,
    textAlign: "center",
    fontFamily: Mulish700,
    color: AppColor.yellow,
    marginBottom: 20,
  },
  starsContainer: { flexDirection: "row", alignItems: "center", gap: 1 },
  allRatingSubCotainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  overallRating: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.black,
  },
  totalReviews: {
    fontFamily: Mulish600,
    fontSize: 16,
    color: AppColor.text,
    textAlign: "center",
  },

  // Review Item
  reviewItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 5,
    padding: 16,
    backgroundColor: AppColor.white,
    ...Platform.select({
      ios: {
        shadowColor: AppColor.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  reviewAvatar: { width: 50, height: 50, borderRadius: 4 },
  userName: {
    fontFamily: Mulish500,
    fontSize: 15,
    color: AppColor.text,
  },
  reviewText: {
    fontFamily: Mulish400,
    fontSize: 14,
    color: AppColor.black,
  },

  //  Flatlist
  flatListContent: {
    flexGrow: 1,
    padding: 16,
  },
  separator: {
    height: 8,
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
    padding: 20,
  },
  emptyText: {
    fontFamily: Mulish400,
    fontSize: 14,
    color: AppColor.black,
    marginBottom: 16,
    textAlign: "center",
  },
});
