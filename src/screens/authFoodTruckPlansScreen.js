import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  FlatList,
  Alert,
  ActivityIndicator as NativeIndicator,
} from "react-native";
import { AppColor, Mulish700, Mulish400, Mulish600 } from "../utils/theme";
import { ActivityIndicator, IconButton } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import Feather from "react-native-vector-icons/Feather";
import Octicons from "react-native-vector-icons/Octicons";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useDispatch, useSelector } from "react-redux";
import { getAddOnsPlans_API, getPlansData_API } from "../api/appAPI";
import { clearUserSlice, setSelectedPlan } from "../redux/slices/userSlice";
import { clearFoodTruckProfileSlice } from "../redux/slices/foodTruckProfileSlice";
import { onSignOut } from "../redux/slices/authSlice";
import StatusBarManager from "../components/StatusBarManager";
import { showSnackbar } from "../redux/slices/snackbarSlice";
import { clearPushNotificationRedux } from "../redux/slices/pushNotificationSlice";

const EVENT_MARKETPLACE_PATTERN = /event|booking|marketplace/i;

const isEventMarketplaceAddOn = (addOn) =>
  EVENT_MARKETPLACE_PATTERN.test(
    `${addOn?.slug || ""} ${addOn?.name || ""} ${addOn?.description || ""}`,
  );

const isElitePlan = (plan) => {
  const planText = `${plan?.slug || ""} ${plan?.name || ""} ${
    plan?.title || ""
  }`;

  return (
    plan?.slug === "SUB_ELITE" ||
    /elite/i.test(planText) ||
    Number(plan?.rate) === 5.5 ||
    plan?.capabilities?.eventMarketplace === true
  );
};

const AuthFoodTruckPlansScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { selectedPlan } = useSelector((state) => state.userReducer);

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [plansData, setPlansData] = useState([]);
  const [addOnsData, setAddOnsData] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const selectedPlanObject = useMemo(
    () =>
      plansData.find((plan) => plan._id === selectedPlanId) || selectedPlan,
    [plansData, selectedPlan, selectedPlanId],
  );
  const isEliteSelected = isElitePlan(selectedPlanObject);
  const visibleAddOns = useMemo(
    () =>
      isEliteSelected
        ? addOnsData.filter((addOn) => !isEventMarketplaceAddOn(addOn))
        : addOnsData,
    [addOnsData, isEliteSelected],
  );
  const getSubmittedAddOns = () => {
    if (!isEliteSelected) {
      return selectedAddOns;
    }

    return selectedAddOns.filter((id) => {
      const addOn = addOnsData.find((item) => item._id === id);
      return !isEventMarketplaceAddOn(addOn);
    });
  };

  const handleContinueBtnPress = async () => {
    setLoading(true);
    try {
      if (!selectedPlanId || !agreed) {
        return;
      }
      // You can now use selectedAddOns in your logic here
      const submittedAddOns = getSubmittedAddOns();
      console.log("Selected Add-Ons:", submittedAddOns);
      const temp_plan = plansData.find((plan) => plan._id === selectedPlanId);
      dispatch(setSelectedPlan(temp_plan));
      navigation.navigate("authFoodTruckProfileScreen", {
        addOns: submittedAddOns,
      });
    } catch (error) {
      console.error("error => ", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignout = async () => {
    Alert.alert(
      "Exit Registration?",
      "Any unsaved data will be lost. Do you want to sign-out anyway?",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Signout",
          onPress: () => {
            dispatch(clearUserSlice());
            dispatch(clearFoodTruckProfileSlice());
            dispatch(onSignOut());
            dispatch(clearPushNotificationRedux());
          },
        },
      ],
    );
  };

  const onSelectePlan = (item) => {
    setSelectedPlanId(item._id);
    setExpandedPlanId(item._id);
    if (isElitePlan(item)) {
      setSelectedAddOns((prevSelectedAddOns) =>
        prevSelectedAddOns.filter((id) => {
          const addOn = addOnsData.find((entry) => entry._id === id);
          return !isEventMarketplaceAddOn(addOn);
        }),
      );
    }
  };

  const handleAddOnSelection = (id) => {
    const addOn = addOnsData.find((item) => item._id === id);
    if (isEliteSelected && isEventMarketplaceAddOn(addOn)) {
      return;
    }

    setSelectedAddOns((prevSelectedAddOns) => {
      if (prevSelectedAddOns.includes(id)) {
        return prevSelectedAddOns.filter((addOnId) => addOnId !== id);
      } else {
        return [...prevSelectedAddOns, id];
      }
    });
  };

  const getBenefitLabel = (plan, benefit) => {
    const benefitText = String(benefit || "");
    return benefitText.replace(/\s*\(coming soon\)$/i, "");
  };

  const isUnavailableBenefit = (benefit) =>
    /^no\b/i.test(String(benefit || "").trim());

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
            {item.details
              .map((benefit, idx) => {
              const unavailable = isUnavailableBenefit(benefit);
              return (
                <View
                  key={idx}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    marginVertical: 5,
                    gap: 10,
                  }}
                >
                  <FontAwesome6
                    name={unavailable ? "xmark" : "check"}
                    size={14}
                    color={unavailable ? "#D92D20" : item.titleColor}
                  />
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
              );
            })}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const getPlansDataFromAPI = async () => {
    setDataLoading(true);
    try {
      const response = await getPlansData_API();
      if (response?.success && response?.data) {
        console.log("response => ", response);
        setPlansData(response.data.planList);
        if (selectedPlan) {
          // if selected plan is already set, then set the selected plan id and expanded plan id
          setSelectedPlanId(selectedPlan._id);
          setExpandedPlanId(selectedPlan._id);
        } else {
          // if selected plan is not set, then set the first plan as selected plan
          setSelectedPlanId(response.data.planList[0]._id);
          setExpandedPlanId(response.data.planList[0]._id);
        }
      }

      const response1 = await getAddOnsPlans_API();
      console.log("response1 => ", response1);
      if (response1?.success && response1?.data) {
        setAddOnsData(response1.data.addonsList);
      }
    } catch (error) {
      console.error("error => ", error);
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

  useEffect(() => {
    getPlansDataFromAPI();
  }, []);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBarManager barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon={(props) => (
            <Octicons
              name="sign-out"
              size={props.size}
              color={AppColor.white}
            />
          )}
          onPress={handleSignout}
        />
        <Text style={styles.headerTitle}>Food Truck Profile</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Content */}
      {dataLoading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <NativeIndicator color={AppColor.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          pointerEvents={loading ? "none" : "auto"}
        >
          <View style={{ flex: 1 }}>
            {/* Step Indicator */}
            <View style={styles.stepContainer}>
              <View style={styles.stepSubContainer}>
                <View style={styles.filledCircle}>
                  <FontAwesome6
                    name="person-walking"
                    color={AppColor.white}
                    size={18}
                  />
                </View>
              </View>
              <View style={styles.line} />
              <View style={styles.stepSubContainer}>
                <View style={styles.emptyCircle} />
              </View>
              <View style={styles.line} />
              <View style={styles.stepSubContainer}>
                <View style={styles.emptyCircle} />
              </View>
              <View style={styles.line} />
              <View style={styles.stepSubContainer}>
                <View style={styles.emptyCircle} />
              </View>
              {/* <View style={styles.line} />
              <View style={styles.stepSubContainer}>
                <View style={styles.emptyCircle} />
              </View> */}
            </View>

            {/* Main Form */}
            <View style={styles.content}>
              {/* Select Plan */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Plan</Text>
              </View>

              <View style={{ flex: 1 }}>
                <FlatList
                  bounces={false}
                  data={plansData}
                  renderItem={renderPlanCard}
                  keyExtractor={(item) => item._id}
                  contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
                />
              </View>

              {isEliteSelected ? (
                <View style={styles.includedAccessCard}>
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color="#137333"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.includedAccessTitle}>
                      Event Marketplace Access included
                    </Text>
                    <Text style={styles.includedAccessText}>
                      Elite vendors can participate in event marketplace
                      opportunities without selecting the Event Bookings add-on.
                    </Text>
                  </View>
                </View>
              ) : null}

              {visibleAddOns?.length ? (
                <View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select Ad Space</Text>
                    <Text style={styles.sectionSubtitle}>
                      {isEliteSelected
                        ? "Optional ad placement for your current plan."
                        : "Optional ad placement for your current plan."}
                    </Text>
                  </View>

                  <FlatList
                    bounces={false}
                    data={visibleAddOns}
                    renderItem={renderAddOnCard}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={{
                      flexGrow: 1,
                      paddingHorizontal: 24,
                    }}
                  />
                </View>
              ) : null}

              {/* T&C */}
              <View style={styles.termsContainer}>
                <TouchableOpacity
                  onPress={() => setAgreed(!agreed)}
                  style={styles.iconBox}
                >
                  <Ionicons
                    name={agreed ? "checkbox" : "square-outline"}
                    size={22}
                    color={AppColor.primary}
                  />
                </TouchableOpacity>

                <Text style={styles.termsText}>
                  {"I have reviewed and accept the "}
                  <Text
                    style={styles.linkText}
                    onPress={() => navigation.navigate("agreementScreen")}
                  >
                    {"Subscription Agreement."}
                  </Text>
                </Text>
              </View>

              {/* Continue Button */}
              <TouchableOpacity
                onPress={handleContinueBtnPress}
                activeOpacity={0.7}
                style={[
                  styles.continueButton,
                  {
                    opacity: !selectedPlanId || !agreed ? 0.5 : 1,
                  },
                ]}
                disabled={loading || !selectedPlanId || !agreed}
              >
                {loading ? (
                  <ActivityIndicator color={AppColor.white} />
                ) : (
                  <Text style={styles.continueButtonText}>{"Select Plan"}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default AuthFoodTruckPlansScreen;

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
  includedAccessCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#B7E4C7",
    borderRadius: 12,
    backgroundColor: "#F0FFF4",
  },
  includedAccessTitle: {
    color: "#0B5D1E",
    fontSize: 14,
    fontFamily: Mulish700,
    marginBottom: 4,
  },
  includedAccessText: {
    color: "#256D3F",
    fontSize: 12,
    fontFamily: Mulish400,
    lineHeight: 17,
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
