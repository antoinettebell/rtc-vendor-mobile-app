import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Divider, IconButton } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import StatusBarManager from "../components/StatusBarManager";
import { AppColor, Mulish500, Mulish700 } from "../utils/theme";
import {
  getFoodtruckDetail_API,
  getPlansData_API,
  updateFoodtruckSubscription_API,
} from "../api/appAPI";
import { setSelectedPlan, updateFoodTruck } from "../redux/slices/userSlice";

const ProfileSubscriptionScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const userDetails = useSelector((state) => state.userReducer.user);

  const [processing, setProcessing] = useState(true);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [allPlans, setAllPlans] = useState([]);

  const renderPlanHeaderComponent = () => {
    const item = currentPlan;
    return item ? (
      <>
        <View style={{ marginTop: 16 }}>
          <Text
            style={{
              fontSize: 20,
              fontFamily: Mulish700,
              color: AppColor.text,
              textAlign: "center",
            }}
          >
            {"Current Active Plan"}
          </Text>
        </View>
        <View
          style={{
            borderWidth: 1,
            borderColor: item.titleColor,
            borderRadius: 10,
            marginVertical: 8,
            marginHorizontal: 16,
            backgroundColor: AppColor.white,
            padding: 16,
          }}
        >
          {/* Top Row: Name, Popular, Checkmark */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: item.titleColor,
                  fontWeight: "600",
                  fontSize: 16,
                }}
              >
                {item.name}
              </Text>
              {item.isPopular && (
                <View
                  style={{
                    backgroundColor: "rgba(252, 123, 3, 0.08)",
                    borderRadius: 8,
                    marginLeft: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    style={{
                      color: "#1DBF73",
                      fontSize: 11,
                      fontWeight: "600",
                    }}
                  >
                    Popular
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Rate */}
          <Text style={{ fontSize: 28, fontWeight: "700", marginTop: 8 }}>
            {item.rate}%
            <Text style={{ fontSize: 14, fontWeight: "500" }}>
              {" "}
              {item.rateType}
            </Text>
          </Text>

          {/* See all benefits */}
          <View
            style={{
              marginTop: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Text
              style={{
                color: AppColor.text,
                fontWeight: "400",
                fontSize: 14,
              }}
            >
              {"All benefits"}
            </Text>
          </View>

          {/* Benefits List */}
          <View style={{ marginTop: 8 }}>
            {item.details.map((benefit, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  marginVertical: 5,
                  gap: 10,
                }}
              >
                <FontAwesome6 name="check" size={14} color={item.titleColor} />
                <Text
                  style={{
                    flex: 1,
                    color: "#111520",
                    fontSize: 12,
                    fontWeight: "600",
                    flexWrap: "wrap",
                  }}
                >
                  {benefit}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <Divider style={{ marginTop: 8 }} />
        <View style={{ marginTop: 16 }}>
          <Text
            style={{
              fontSize: 20,
              fontFamily: Mulish700,
              color: AppColor.text,
              textAlign: "center",
            }}
          >
            {"Other Plans"}
          </Text>
        </View>
      </>
    ) : null;
  };

  const renderPlanComponent = ({ item }) => {
    return item?._id === currentPlan?._id ? null : (
      <View
        style={{
          borderWidth: 1,
          borderColor: item.titleColor,
          borderRadius: 10,
          marginVertical: 8,
          marginHorizontal: 16,
          backgroundColor: AppColor.white,
          padding: 16,
        }}
      >
        {/* Top Row: Name, Popular, Checkmark */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: item.titleColor,
                fontWeight: "600",
                fontSize: 16,
              }}
            >
              {item.name}
            </Text>
            {item.isPopular && (
              <View
                style={{
                  backgroundColor: "rgba(252, 123, 3, 0.08)",
                  borderRadius: 8,
                  marginLeft: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{ color: "#1DBF73", fontSize: 11, fontWeight: "600" }}
                >
                  Popular
                </Text>
              </View>
            )}
          </View>

          <Pressable
            onPress={() => {
              Alert.alert(
                "Confirmation",
                "Are you sure to update? Plan can be change once within 3 month.",
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Update",
                    style: "destructive",
                    onPress: () => {
                      handleUpdatePlanPress(item?._id);
                    },
                  },
                ]
              );
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: Mulish500,
                color: AppColor.text,
              }}
            >
              {"Update"}
            </Text>
          </Pressable>
        </View>

        {/* Rate */}
        <Text style={{ fontSize: 28, fontWeight: "700", marginTop: 8 }}>
          {item.rate}%
          <Text style={{ fontSize: 14, fontWeight: "500" }}>
            {" "}
            {item.rateType}
          </Text>
        </Text>

        {/* See all benefits */}
        <View
          style={{
            marginTop: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Text
            style={{
              color: AppColor.text,
              fontWeight: "400",
              fontSize: 14,
            }}
          >
            {"All benefits"}
          </Text>
        </View>

        {/* Benefits List */}
        <View style={{ marginTop: 8 }}>
          {item.details.map((benefit, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                marginVertical: 5,
                gap: 10,
              }}
            >
              <FontAwesome6 name="check" size={14} color={item.titleColor} />
              <Text
                style={{
                  flex: 1,
                  color: "#111520",
                  fontSize: 12,
                  fontWeight: "600",
                  flexWrap: "wrap",
                }}
              >
                {benefit}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const handleUpdatePlanPress = async (planId) => {
    setProcessing(true);
    try {
      const response = await updateFoodtruckSubscription_API({ planId });
      console.log("response => ", response);
      if (response?.success && response?.data) {
        getPlansFromAPI();
      }
    } catch (error) {
      console.log("error => ", error);
      if (error?.code === 409) {
        Alert.alert("", error?.message, [
          {
            text: "Ok",
          },
        ]);
      }
    } finally {
      setProcessing(false);
    }
  };

  const getPlansFromAPI = async () => {
    setProcessing(true);
    try {
      let currentPlanId = undefined;

      const foodtruckDetails = await getFoodtruckDetail_API(
        userDetails?.foodTruck?._id
      );
      console.log("Foodtruck Detail => ", foodtruckDetails);
      if (foodtruckDetails?.success && foodtruckDetails?.data) {
        dispatch(updateFoodTruck(foodtruckDetails?.data?.foodtruck));
        dispatch(setSelectedPlan(foodtruckDetails?.data?.foodtruck?.plan));
        currentPlanId = foodtruckDetails?.data?.foodtruck?.planId;
      }

      const plans = await getPlansData_API();
      console.log("All plans => ", plans);
      if (plans?.success && plans?.data) {
        setAllPlans(plans.data.planList);
        setCurrentPlan(
          plans?.data?.planList?.find((plan) => plan._id === currentPlanId) ||
            null
        );
      }
    } catch (error) {
      console.log("error => ", error);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    getPlansFromAPI();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: insets.top,
          borderBottomWidth: 1,
          borderColor: AppColor.border,
          backgroundColor: AppColor.white,
        }}
      >
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.black}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text
          style={{
            fontSize: 19.78,
            fontFamily: Mulish700,
            color: AppColor.black,
          }}
        >
          {"Subscription"}
        </Text>
        <IconButton
          icon="pencil"
          iconColor={AppColor.black}
          size={24}
          onPress={() => {}}
          style={{ opacity: 0 }}
          disabled={true}
        />
      </View>

      {processing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColor.primary} />
        </View>
      ) : (
        <View
          style={[styles.contentContainer, { paddingBottom: insets.bottom }]}
        >
          <FlatList
            data={allPlans}
            extraData={allPlans}
            renderItem={renderPlanComponent}
            ListHeaderComponent={renderPlanHeaderComponent}
            keyExtractor={(item) => item?._id?.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.flatlistContainer}
          />
        </View>
      )}
    </View>
  );
};

export default ProfileSubscriptionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // content
  contentContainer: {
    flex: 1,
  },

  // flatlist
  flatlistContainer: {
    flexGrow: 1,
  },
});
