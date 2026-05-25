import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator as NativeIndicator,
  Alert,
  FlatList,
  Pressable,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Divider, IconButton, ActivityIndicator } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import Ionicons from "react-native-vector-icons/Ionicons";
import Feather from "react-native-vector-icons/Feather";
import StatusBarManager from "../components/StatusBarManager";
import {
  AppColor,
  Mulish400,
  Mulish500,
  Mulish600,
  Mulish700,
} from "../utils/theme";
import {
  getAddOnsPlans_API,
  getFoodtruckDetail_API,
  getPlansData_API,
  updateFoodtruckAddons_API,
  updateFoodtruckSubscription_API,
} from "../api/appAPI";
import {
  setSelectedPlan,
  updateFoodTruck,
  updateFoodTruckKey,
} from "../redux/slices/userSlice";
import { showSnackbar } from "../redux/slices/snackbarSlice";

const ProfileSubscriptionScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const userDetails = useSelector((state) => state.userReducer.user);

  const [plansLoading, setPlansLoading] = useState(false);
  const [addOnsLoading, setAddOnsLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [plansData, setPlansData] = useState([]);
  const [addOnsData, setAddOnsData] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [currentAddOns, setCurrentAddOns] = useState(null);
  const selectedPlanForAddOns = useMemo(
    () => plansData.find((plan) => plan._id === selectedPlanId),
    [plansData, selectedPlanId],
  );
  const isEliteSelected = selectedPlanForAddOns?.slug === "SUB_ELITE";
  const isEventAddOn = (addOn) => /event/i.test(addOn?.name || "");
  const eventAddOnIds = useMemo(
    () => addOnsData.filter(isEventAddOn).map((addOn) => addOn._id),
    [addOnsData],
  );
  const visibleAddOns = useMemo(
    () =>
      isEliteSelected
        ? addOnsData.filter((addOn) => !isEventAddOn(addOn))
        : addOnsData,
    [addOnsData, isEliteSelected],
  );

  const onUpdatePlanPress = async () => {
    setPlansLoading(true);
    try {
      const response = await updateFoodtruckSubscription_API({
        planId: selectedPlanId,
      });
      console.log("response => ", response);
      if (response?.success && response?.data) {
        dispatch(
          updateFoodTruckKey({ keyName: "planId", keyValue: selectedPlanId }),
        );
        dispatch(
          showSnackbar({
            message: "Plan updated successfully!",
            type: "success",
          }),
        );
        navigation.goBack();
      }
    } catch (error) {
      console.log("error => ", error);
      if (error?.code === 409) {
        Alert.alert("", error?.message, [{ text: "Ok" }]);
      }
    } finally {
      setPlansLoading(false);
    }
  };

  const onUpdateAddOnsPress = async () => {
    setAddOnsLoading(true);
    try {
      const nextAddOns = isEliteSelected
        ? selectedAddOns.filter((id) => !eventAddOnIds.includes(id))
        : selectedAddOns;
      const response = await updateFoodtruckAddons_API({
        addOns: nextAddOns,
      });
      console.log("response => ", response);
      if (response?.success && response?.data) {
        dispatch(
          updateFoodTruckKey({ keyName: "addOns", keyValue: nextAddOns }),
        );
        dispatch(
          showSnackbar({
            message: "Add-ons updated successfully!",
            type: "success",
          }),
        );
        navigation.goBack();
      }
    } catch (error) {
      console.log("error => ", error);
      if (error?.code === 409) {
        Alert.alert("", error?.message, [{ text: "Ok" }]);
      }
    } finally {
      setAddOnsLoading(false);
    }
  };

  const getInitialDataFromAPI = async () => {
    setDataLoading(true);
    try {
      const [foodtruckDetails, plans, addOns] = await Promise.all([
        getFoodtruckDetail_API(userDetails?.foodTruck?._id),
        getPlansData_API(),
        getAddOnsPlans_API(),
      ]);

      let validPlanList = [];
      let validAddOnsList = [];

      if (plans?.success && plans?.data) {
        validPlanList = plans.data.planList;
        setPlansData(validPlanList);
      }

      if (addOns?.success && addOns?.data) {
        validAddOnsList = addOns.data.addonsList;
        setAddOnsData(validAddOnsList);
      }

      if (foodtruckDetails?.success && foodtruckDetails?.data) {
        const truck = foodtruckDetails.data.foodtruck;

        dispatch(updateFoodTruck(truck));
        dispatch(setSelectedPlan(truck.plan));
        setCurrentPlanId(truck.planId);
        setCurrentAddOns(truck.addOns);

        const planExists = validPlanList.some((p) => p._id === truck.planId);
        if (planExists) {
          setSelectedPlanId(truck.planId);
        } else {
          setSelectedPlanId(null);
        }

        if (Array.isArray(truck.addOns)) {
          const filteredAddOns = truck.addOns.filter((id) =>
            validAddOnsList.some((validAddOn) => validAddOn._id === id),
          );
          setSelectedAddOns(filteredAddOns);
        }
      }
    } catch (error) {
      console.log("error => ", error);
      dispatch(
        showSnackbar({
          message: "Something went wrong!",
          type: "error",
        }),
      );
    } finally {
      setDataLoading(false);
    }
  };

  const onSelectePlan = (item) => {
    setSelectedPlanId(item._id);
    setExpandedPlanId(item._id);
    if (item.slug === "SUB_ELITE") {
      setSelectedAddOns((prev) =>
        prev.filter((id) => !eventAddOnIds.includes(id)),
      );
    }
  };

  const handleAddOnSelection = (id) => {
    setSelectedAddOns((prevSelectedAddOns) => {
      if (prevSelectedAddOns.includes(id)) {
        return prevSelectedAddOns.filter((addOnId) => addOnId !== id);
      } else {
        return [...prevSelectedAddOns, id];
      }
    });
  };

  const renderAddOnCard = ({ item }) => {
    const isSelected = selectedAddOns.includes(item._id);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleAddOnSelection(item._id)}
        style={styles.addOnCard}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.addOnCardName}>{item.name}</Text>
          {item.priceLabel ? (
            <Text style={styles.addOnCardPrice}>{item.priceLabel}</Text>
          ) : null}
          {item.description ? (
            <Text style={styles.addOnCardDescription}>{item.description}</Text>
          ) : null}
        </View>
        <Ionicons
          name={"checkmark-circle"}
          size={22}
          color={isSelected ? AppColor.primary : AppColor.border}
        />
      </TouchableOpacity>
    );
  };

  const getBenefitLabel = (plan, benefit) => {
    const benefitText = String(benefit || "");
    if (
      plan?.slug === "SUB_ELITE" &&
      /event|marketplace|booking/i.test(benefitText)
    ) {
      return benefitText.replace(/\s*\(coming soon\)$/i, "") + " (Coming Soon)";
    }

    return benefitText;
  };

  const renderPlanCard = ({ item }) => {
    const isSelected = selectedPlanId === item._id;
    const isExpanded = expandedPlanId === item._id;

    return (
      <TouchableOpacity
        onPress={() => onSelectePlan(item)}
        activeOpacity={0.9}
        style={[
          {
            borderWidth: 1,
            borderColor: isSelected ? item.titleColor : "#E5E5EA",
            borderRadius: 10,
            marginVertical: 8,
            backgroundColor: isSelected
              ? "rgba(252, 123, 3, 0.08)"
              : AppColor.white,
            padding: 16,
          },
        ]}
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
                  backgroundColor: isSelected
                    ? AppColor.white
                    : "rgba(252, 123, 3, 0.08)",
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

          <Ionicons
            name="checkmark-circle"
            size={22}
            color={isSelected ? item.titleColor : "#D1D1D6"}
            style={{ position: "absolute", right: 0, top: 0 }}
          />
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
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setExpandedPlanId(isExpanded ? null : item._id)}
          style={{
            marginTop: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Text
            style={{
              color: isExpanded ? AppColor.text : "#888",
              fontWeight: "400",
              fontSize: 14,
            }}
          >
            {"See all benefits"}
          </Text>
          <Feather
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={isExpanded ? AppColor.text : "#888"}
          />
        </TouchableOpacity>

        {/* Benefits List */}
        {isExpanded && (
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
                  {getBenefitLabel(item, benefit)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    getInitialDataFromAPI();
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

      {dataLoading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <NativeIndicator size="large" color={AppColor.primary} />
        </View>
      ) : (
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom }}
        >
          <View style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Plans</Text>
            </View>

            <View style={{ flex: 1 }}>
              <FlatList
                bounces={false}
                data={plansData}
                renderItem={renderPlanCard}
                keyExtractor={(item) => item?._id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
              />
            </View>

            {/* Update Plans Button */}
            <TouchableOpacity
              onPress={onUpdatePlanPress}
              activeOpacity={0.7}
              style={[
                styles.continueButton,
                {
                  opacity: !selectedPlanId ? 0.5 : 1,
                },
              ]}
              disabled={plansLoading || !selectedPlanId}
            >
              {plansLoading ? (
                <ActivityIndicator color={AppColor.white} />
              ) : (
                <Text style={styles.continueButtonText}>{"Update Plan"}</Text>
              )}
            </TouchableOpacity>

            {visibleAddOns?.length ? (
              <View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Add-Ons</Text>
                  <Text style={styles.sectionSubtitle}>
                    Event Bookings are optional for Basic and Platinum. Elite
                    Event Marketplace is coming soon.
                  </Text>
                </View>

                <FlatList
                  bounces={false}
                  data={visibleAddOns}
                  renderItem={renderAddOnCard}
                  keyExtractor={(item) => item?._id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
                />
              </View>
            ) : null}

            {/* Update Addons Button */}
            <TouchableOpacity
              onPress={onUpdateAddOnsPress}
              activeOpacity={0.7}
              style={styles.continueButton}
              disabled={addOnsLoading}
            >
              {addOnsLoading ? (
                <ActivityIndicator color={AppColor.white} />
              ) : (
                <Text style={styles.continueButtonText}>
                  {"Update Add-ons"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default ProfileSubscriptionScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppColor.primary,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTitle: {
    color: AppColor.white,
    fontSize: 20,
    fontFamily: Mulish700,
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  stepSubContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  filledCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColor.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: AppColor.primary,
  },
  line: { width: "10%", height: 2, backgroundColor: AppColor.primary },
  content: { flex: 1 },
  section: { marginVertical: 16, paddingHorizontal: 24 },
  sectionTitle: { fontSize: 18, fontFamily: Mulish700, color: AppColor.text },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: Mulish400,
    color: AppColor.textHighlighter,
    marginTop: 4,
  },
  hr: {
    height: 1,
    backgroundColor: "#E5E5EA",
    width: "100%",
  },
  label: {
    fontSize: 18,
    fontFamily: Mulish400,
    color: AppColor.black,
    marginBottom: 8,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 30,
  },
  logoImageWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginTop: 10,
    overflow: "hidden",
  },
  logoImage: { width: "100%", height: "100%" },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppColor.black,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: AppColor.black,
    fontFamily: Mulish400,
  },
  photoUploadContainer: {
    height: 104,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: AppColor.gray,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  thumbnailContainer: { flexDirection: "row" },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 5,
  },
  radioContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 24,
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
  },
  radioOuterCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: AppColor.black,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AppColor.black,
  },
  radioLabel: {
    marginLeft: 8,
    fontSize: 15,
    fontFamily: Mulish400,
    color: AppColor.black,
  },
  dropdown: {
    width: "100%",
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  dropdownText: {
    color: AppColor.text,
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    fontFamily: Mulish400,
  },
  continueButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginVertical: 20,
    marginHorizontal: 24,
    ...Platform.select({
      ios: {
        shadowColor: AppColor.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  continueButtonText: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.white,
  },

  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 4,
    marginHorizontal: 24,
  },
  addOnCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    marginVertical: 8,
    padding: 16,
    gap: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderColor: AppColor.border,
    backgroundColor: AppColor.white,
  },
  addOnCardName: {
    fontSize: 15,
    fontFamily: Mulish600,
    color: AppColor.text,
    flexWrap: "wrap",
  },
  addOnCardPrice: {
    fontSize: 14,
    fontFamily: Mulish700,
    color: AppColor.primary,
    marginTop: 4,
  },
  addOnCardDescription: {
    fontSize: 12,
    fontFamily: Mulish400,
    color: AppColor.textHighlighter,
    marginTop: 4,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: AppColor.text,
    fontFamily: Mulish400,
  },
  linkText: {
    color: AppColor.primary,
  },
  iconBox: {
    padding: 4,
    marginRight: 6,
  },
});
