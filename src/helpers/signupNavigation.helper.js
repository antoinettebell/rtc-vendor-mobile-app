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
    user?.isUnderReview === true ||
    String(user?.vendorOnboardingStep || "").toUpperCase() ===
      "AWAITING_APPROVAL";

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
