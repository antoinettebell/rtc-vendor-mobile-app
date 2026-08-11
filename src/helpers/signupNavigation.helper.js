export const SIGNIN_ROUTE = "signin";
export const SIGNUP_ROUTE = "signup";

export const isMarketplaceVendorSignup = ({ selectedPlan, user } = {}) =>
  String(selectedPlan?.slug || "").toUpperCase() ===
    "SUB_MARKETPLACE_VENDOR" ||
  String(user?.vendorSubtype || "").toUpperCase() === "EVENT_VENDOR";

export const getOtpCompletionTransition = ({ selectedPlan, user } = {}) => {
  if (!isMarketplaceVendorSignup({ selectedPlan, user })) {
    return {
      isOnboarded: true,
      isUnderReview: true,
      vendorOnboardingStep: "AWAITING_APPROVAL",
    };
  }

  const backendExplicitlyRequiresReview =
    String(user?.eventVendorProfile?.review_status || "").toUpperCase() ===
    "PENDING_REVIEW";

  return {
    isOnboarded: true,
    isUnderReview: backendExplicitlyRequiresReview,
    vendorOnboardingStep: backendExplicitlyRequiresReview
      ? "AWAITING_APPROVAL"
      : null,
  };
};

export const getFinalSignupDestination = ({ selectedPlan, user } = {}) =>
  isMarketplaceVendorSignup({ selectedPlan, user })
    ? "eventVendorProfileScreen"
    : "authFoodTruckProfileScreen";

export const consumePendingAuthRoute = (pendingAuthRoute) => ({
  destination: pendingAuthRoute || SIGNIN_ROUTE,
  pendingAuthRoute: null,
});

export const consumeOtpCompletion = (completionPending) => ({
  shouldComplete: completionPending === true,
  completionPending: false,
});

// Both auth navigators register Splash. Resetting to it removes the OTP and
// Select Plan history before the root switches to final onboarding.
export const getPostOtpStackReset = () => ({
  index: 0,
  routes: [{ name: "splash" }],
});

export const getAbandonedOtpSessionTransition = ({
  otpSignupCompletionPending = false,
} = {}) => ({
  shouldClear: otpSignupCompletionPending === true,
  destination: SIGNIN_ROUTE,
});

const isSelectPlanRoute = (route) => route === "authFoodTruckPlansScreen";

export const getConsumedMarketplaceOtpState = ({
  selectedPlan,
  selectedSignupAddOns = [],
  pendingAuthRoute,
  user,
} = {}) => {
  const transition = getOtpCompletionTransition({ selectedPlan, user });
  return {
    ...transition,
    destination: getFinalSignupDestination({ selectedPlan, user }),
    // The profile/payment onboarding screens still need the chosen plan and
    // add-ons.  Only the stale Select Plan intent is consumed after OTP.
    selectedPlan,
    selectedSignupAddOns,
    pendingAuthRoute: isSelectPlanRoute(pendingAuthRoute)
      ? null
      : pendingAuthRoute || null,
    eventVendorOnboardingSessionActive:
      isMarketplaceVendorSignup({ selectedPlan, user }) && !transition.isUnderReview,
  };
};

export const getAvailableRouteNames = (navigation) =>
  navigation?.getState?.()?.routeNames || [];

export const getAuthNavigationAction = ({
  canGoBack = false,
  routeNames = [],
  destination,
  preferHistory = false,
}) => {
  if (preferHistory && canGoBack) {
    return { type: "GO_BACK" };
  }

  if (routeNames.includes(destination)) {
    return {
      type: preferHistory ? "RESET" : "NAVIGATE",
      destination,
    };
  }

  return { type: "SWITCH_AUTH_ROOT", destination };
};

export const performAuthNavigation = ({
  navigation,
  destination,
  preferHistory = false,
  switchAuthRoot,
}) => {
  const action = getAuthNavigationAction({
    canGoBack: navigation?.canGoBack?.() === true,
    routeNames: getAvailableRouteNames(navigation),
    destination,
    preferHistory,
  });

  if (action.type === "GO_BACK") {
    navigation.goBack();
  } else if (action.type === "RESET") {
    navigation.reset({ index: 0, routes: [{ name: destination }] });
  } else if (action.type === "NAVIGATE") {
    navigation.navigate(destination);
  } else {
    switchAuthRoot(destination);
  }

  return action.type;
};
