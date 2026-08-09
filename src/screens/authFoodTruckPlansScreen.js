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
  Image,
} from "react-native";
import { AppColor, Mulish700, Mulish400, Mulish600 } from "../utils/theme";
import { ActivityIndicator, IconButton } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import Octicons from "react-native-vector-icons/Octicons";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useDispatch, useSelector } from "react-redux";
import { getAddOnsPlans_API, getPlansData_API } from "../api/appAPI";
import {
  isRemovedSubscriptionBenefit,
  normalizeSubscriptionBenefit,
} from "../helpers/subscriptionBenefits.helper";
import {
  clearUserSlice,
  setSelectedPlan,
  setSelectedSignupAddOns,
} from "../redux/slices/userSlice";
import { clearFoodTruckProfileSlice } from "../redux/slices/foodTruckProfileSlice";
import {
  onOnBoard,
  onSignOut,
  setPendingAuthRoute,
} from "../redux/slices/authSlice";
import StatusBarManager from "../components/StatusBarManager";
import { showSnackbar } from "../redux/slices/snackbarSlice";
import { clearPushNotificationRedux } from "../redux/slices/pushNotificationSlice";
import {
  performAuthNavigation,
  SIGNIN_ROUTE,
  SIGNUP_ROUTE,
} from "../helpers/signupNavigation.helper";

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

const isFoodVendorPlan = (plan) =>
  ["SUB_BASIC", "SUB_PLATINUM", "SUB_ELITE"].includes(
    String(plan?.slug || "").toUpperCase(),
  );

const AuthFoodTruckPlansScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { selectedPlan } = useSelector((state) => state.userReducer);
  const isSignupFlow = route?.params?.signupFlow === true;

  const switchToAuthRoot = (destination) => {
    dispatch(setPendingAuthRoute(destination));
    dispatch(onOnBoard(false));
  };

  const handleSignupFlowBack = () =>
    performAuthNavigation({
      navigation,
      destination: SIGNIN_ROUTE,
      preferHistory: true,
      switchAuthRoot: switchToAuthRoot,
    });

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [plansData, setPlansData] = useState([]);
  const [addOnsData, setAddOnsData] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
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
      dispatch(setSelectedSignupAddOns(submittedAddOns));
      if (isSignupFlow) {
        performAuthNavigation({
          navigation,
          destination: SIGNUP_ROUTE,
          switchAuthRoot: switchToAuthRoot,
        });
      } else {
        navigation.navigate("authFoodTruckProfileScreen", {
          addOns: submittedAddOns,
        });
      }
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
    return normalizeSubscriptionBenefit(benefit);
  };

  const isUnavailableBenefit = (benefit) =>
    /^no\b/i.test(String(benefit || "").trim());

  const isRemovedBenefit = (plan, benefit) => {
    const planSlug = String(plan?.slug || "").toUpperCase();
    const benefitText = String(benefit || "");
    const isPlatinumOrElite = ["SUB_PLATINUM", "SUB_ELITE"].includes(planSlug);

    if (isRemovedSubscriptionBenefit(benefitText)) {
      return true;
    }

    if (
      isPlatinumOrElite &&
      /(advanced|customized|customizable) reporting/i.test(benefitText)
    ) {
      return true;
    }

    return planSlug === "SUB_ELITE" && /qr ordering/i.test(benefitText);
  };

  const getVisibleBenefits = (plan) =>
    (plan?.details || []).filter(
      (benefit) =>
        !isUnavailableBenefit(benefit) && !isRemovedBenefit(plan, benefit),
    );

  const getPlanDescription = (plan) => {
    switch (String(plan?.slug || "").toUpperCase()) {
      case "SUB_MARKETPLACE_VENDOR":
        return "For merchandise, artisans, service providers, nonprofits, and exhibitors.";
      case "SUB_BASIC":
        return "A strong start for new food truck businesses.";
      case "SUB_PLATINUM":
        return "More tools to help your business run and grow.";
      case "SUB_ELITE":
        return "Built for established and growing businesses.";
      default:
        return "Choose the features that fit your business.";
    }
  };

  const getPlanIcon = (plan) => {
    switch (String(plan?.slug || "").toUpperCase()) {
      case "SUB_MARKETPLACE_VENDOR":
        return "tent";
      case "SUB_ELITE":
        return "crown";
      case "SUB_PLATINUM":
        return "truck-fast";
      default:
        return "seedling";
    }
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

  const renderPlanCard = ({ item }) => {
    const isSelected = selectedPlanId === item._id;
    const visibleBenefits = getVisibleBenefits(item);

    return (
      <TouchableOpacity
        onPress={() => onSelectePlan(item)}
        activeOpacity={0.9}
        style={[
          styles.planCard,
          {
            borderColor: isSelected ? item.titleColor : AppColor.border,
          },
        ]}
      >
        {item.isPopular ? (
          <View
            style={[styles.popularBadge, { backgroundColor: item.titleColor }]}
          >
            <FontAwesome6 name="star" size={11} color={AppColor.white} />
            <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
          </View>
        ) : null}

        <View style={styles.planHeaderRow}>
          <View style={styles.planIdentityRow}>
            <View style={styles.planIconCircle}>
              <FontAwesome6
                name={getPlanIcon(item)}
                size={24}
                color={item.titleColor}
              />
            </View>
            <View style={styles.planTitleWrap}>
              <Text
                style={[styles.planName, { color: item.titleColor }]}
              >
                {item.name}
              </Text>
              {isFoodVendorPlan(item) ? (
                <View style={styles.foodVendorBadge}>
                  <Text style={styles.foodVendorBadgeText}>
                    FOOD VENDORS ONLY
                  </Text>
                </View>
              ) : null}
              <Text style={styles.planDescription}>
                {getPlanDescription(item)}
              </Text>
            </View>
          </View>

          <View style={styles.planRateWrap}>
            <Text style={styles.planRate}>{item.rate}%</Text>
            <Text style={styles.planRateLabel}>
              {String(item.rateType || "").toUpperCase() === "AWARD_CHECKOUT"
                ? "award checkout fee"
                : "per sale"}
            </Text>
          </View>
        </View>

        <View style={styles.benefitsWrap}>
          {visibleBenefits.map((benefit, idx) => {
              return (
                <View key={`${item._id}-${idx}`} style={styles.benefitRow}>
                  <View style={styles.benefitCheckCircle}>
                    <FontAwesome6 name="check" size={10} color={item.titleColor} />
                  </View>
                  <Text style={styles.benefitText}>
                    {getBenefitLabel(item, benefit)}
                  </Text>
                </View>
              );
            })}
        </View>

        <View style={styles.selectedPlanRow}>
          <Ionicons
            name={isSelected ? "radio-button-on" : "radio-button-off"}
            size={22}
            color={isSelected ? item.titleColor : AppColor.border}
          />
          <Text style={styles.selectedPlanText}>
            {isSelected ? "Selected" : `Choose ${item.name}`}
          </Text>
        </View>
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
        } else {
          // if selected plan is not set, then set the first plan as selected plan
          setSelectedPlanId(response.data.planList[0]._id);
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
        {isSignupFlow ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSignupFlowBack}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <IconButton
            icon={(props) => (
              <Octicons
                name="sign-out"
                size={props.size}
                color={AppColor.white}
              />
            )}
            iconColor={AppColor.white}
            onPress={handleSignout}
          />
        )}
        <Text style={styles.headerTitle}>Select Plan</Text>
        <View style={{ width: isSignupFlow ? 64 : 48 }} />
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
            {!isSignupFlow ? <View style={styles.stepContainer}>
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
            </View> : null}

            {/* Main Form */}
            <View style={styles.content}>
              <View style={styles.planIntro}>
                <Image
                  source={require("../assets/images/AppLogo.png")}
                  style={styles.planLogo}
                  resizeMode="contain"
                />
                <View style={styles.reassuranceBanner}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color={AppColor.primary}
                  />
                  <Text style={styles.reassuranceText}>
                    No setup fees. Cancel anytime.
                  </Text>
                </View>
                <Text style={styles.choosePlanTitle}>Choose Your Plan</Text>
                <Text style={styles.choosePlanSubtitle}>
                  Select the plan that is right for your business. You can
                  always upgrade or downgrade later.
                </Text>
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

              {isSignupFlow ? (
                <View style={styles.allPlansCard}>
                  <FontAwesome6
                    name="bullhorn"
                    size={22}
                    color={AppColor.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.allPlansTitle}>All plans include</Text>
                    <Text style={styles.allPlansText}>
                      Secure payments, customer support, order management, and
                      more.
                    </Text>
                  </View>
                </View>
              ) : null}

              {!isSignupFlow && isEliteSelected ? (
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
                      opportunities through their tier.
                    </Text>
                  </View>
                </View>
              ) : null}

              {!isSignupFlow && visibleAddOns?.length ? (
                <View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select Add-Ons</Text>
                    <Text style={styles.sectionSubtitle}>
                      {isEliteSelected
                        ? "Optional paid add-ons for your current plan."
                        : "Optional paid add-ons for your current plan."}
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
                  <View style={styles.continueButtonContent}>
                    <Text style={styles.continueButtonText}>
                      {isSignupFlow ? "Next" : "Continue"}
                    </Text>
                    <FontAwesome6
                      name="arrow-right"
                      size={15}
                      color={AppColor.white}
                    />
                  </View>
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
    backgroundColor: AppColor.header,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTitle: {
    color: AppColor.white,
    fontSize: 20,
    fontFamily: Mulish700,
  },
  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    width: 64,
  },
  cancelButtonText: {
    color: AppColor.white,
    fontFamily: Mulish600,
    fontSize: 15,
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
  planIntro: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  planLogo: {
    width: 88,
    height: 88,
    marginBottom: 14,
  },
  reassuranceBanner: {
    width: "100%",
    minHeight: 46,
    borderRadius: 23,
    backgroundColor: AppColor.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 18,
    marginBottom: 22,
  },
  reassuranceText: {
    fontSize: 15,
    fontFamily: Mulish600,
    color: AppColor.primary,
  },
  choosePlanTitle: {
    fontSize: 30,
    fontFamily: Mulish700,
    color: AppColor.text,
    textAlign: "center",
  },
  choosePlanSubtitle: {
    maxWidth: 340,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Mulish400,
    color: AppColor.textHighlighter,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  planCard: {
    borderWidth: 1,
    borderRadius: 14,
    marginVertical: 8,
    backgroundColor: AppColor.white,
    padding: 16,
    overflow: "hidden",
  },
  popularBadge: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderBottomLeftRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: -16,
    marginRight: -16,
    marginBottom: 10,
  },
  popularBadgeText: {
    color: AppColor.white,
    fontSize: 10,
    fontFamily: Mulish700,
  },
  planHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  planIdentityRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  planIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  planTitleWrap: { flex: 1 },
  planName: {
    fontSize: 21,
    fontFamily: Mulish700,
  },
  foodVendorBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF3E8",
    borderRadius: 999,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  foodVendorBadgeText: {
    color: "#9A4B00",
    fontFamily: Mulish700,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  planDescription: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Mulish400,
    color: AppColor.textHighlighter,
    marginTop: 3,
  },
  planRateWrap: { alignItems: "flex-end" },
  planRate: {
    fontSize: 25,
    fontFamily: Mulish700,
    color: AppColor.text,
  },
  planRateLabel: {
    fontSize: 11,
    fontFamily: Mulish400,
    color: AppColor.textHighlighter,
  },
  benefitsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
    rowGap: 10,
  },
  benefitRow: {
    width: "50%",
    flexDirection: "row",
    alignItems: "flex-start",
    paddingRight: 8,
    gap: 7,
  },
  benefitCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F7F2",
  },
  benefitText: {
    flex: 1,
    color: AppColor.text,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Mulish600,
  },
  selectedPlanRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: AppColor.border,
    marginTop: 15,
    paddingTop: 12,
  },
  selectedPlanText: {
    fontSize: 13,
    fontFamily: Mulish700,
    color: AppColor.text,
  },
  allPlansCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginHorizontal: 24,
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 12,
    backgroundColor: AppColor.white,
  },
  allPlansTitle: {
    color: AppColor.primary,
    fontSize: 15,
    fontFamily: Mulish700,
    marginBottom: 3,
  },
  allPlansText: {
    color: AppColor.textHighlighter,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Mulish400,
  },
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
  continueButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
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
