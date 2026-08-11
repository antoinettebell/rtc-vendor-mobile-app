import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const loadHelper = async (relativePath) => {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  return import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  );
};

const {
  getAuthNavigationAction,
  getFinalSignupDestination,
  getOtpCompletionTransition,
  getConsumedMarketplaceOtpState,
  consumePendingAuthRoute,
  consumeOtpCompletion,
  getPostOtpStackReset,
  getAbandonedOtpSessionTransition,
  performAuthNavigation,
  SIGNIN_ROUTE,
  SIGNUP_ROUTE,
} = await loadHelper("./signupNavigation.helper.js");

const firstOtpCompletion = consumeOtpCompletion(true);
assert.deepEqual(firstOtpCompletion, {
  shouldComplete: true,
  completionPending: false,
});
assert.deepEqual(consumeOtpCompletion(firstOtpCompletion.completionPending), {
  shouldComplete: false,
  completionPending: false,
}, "the OTP success transition is consumed exactly once");

assert.deepEqual(
  getAuthNavigationAction({
    routeNames: ["signin", "signup", "authFoodTruckPlansScreen"],
    destination: SIGNUP_ROUTE,
  }),
  { type: "NAVIGATE", destination: "signup" },
  "the normal food-vendor and merchandise-vendor auth flow stays in AuthNavigator",
);
assert.deepEqual(
  getAbandonedOtpSessionTransition({ otpSignupCompletionPending: true }),
  { shouldClear: true, destination: SIGNIN_ROUTE },
  "a verified OTP abandoned before Next clears local signup state and returns to Sign In",
);
assert.deepEqual(
  getAbandonedOtpSessionTransition(),
  { shouldClear: false, destination: SIGNIN_ROUTE },
  "normal Food and Marketplace onboarding is not treated as an abandoned OTP session",
);

assert.deepEqual(
  getAuthNavigationAction({
    routeNames: ["eventVendorProfileScreen", "authFoodTruckPlansScreen"],
    destination: SIGNUP_ROUTE,
  }),
  { type: "SWITCH_AUTH_ROOT", destination: "signup" },
  "a resumed merchandise flow deliberately switches from setup to AuthNavigator",
);

assert.equal(
  getAuthNavigationAction({
    canGoBack: true,
    routeNames: ["signup"],
    destination: SIGNIN_ROUTE,
    preferHistory: true,
  }).type,
  "GO_BACK",
  "Back uses legitimate navigation history",
);
assert.deepEqual(
  getConsumedMarketplaceOtpState({
    selectedPlan: { slug: "SUB_MARKETPLACE_VENDOR" },
    selectedSignupAddOns: ["existing-add-on"],
    pendingAuthRoute: "authFoodTruckPlansScreen",
    user: { vendorSubtype: "EVENT_VENDOR" },
  }),
  {
    isOnboarded: true,
    isUnderReview: false,
    vendorOnboardingStep: null,
    destination: "eventVendorProfileScreen",
    selectedPlan: { slug: "SUB_MARKETPLACE_VENDOR" },
    selectedSignupAddOns: ["existing-add-on"],
    pendingAuthRoute: null,
    eventVendorOnboardingSessionActive: true,
  },
  "Marketplace OTP consumes only the stale plan route while retaining onboarding context",
);

assert.equal(
  getConsumedMarketplaceOtpState({
    selectedPlan: { slug: "SUB_BASIC" },
    selectedSignupAddOns: ["printer"],
    pendingAuthRoute: "some-legitimate-auth-route",
    user: { vendorSubtype: "FOOD_VENDOR" },
  }).pendingAuthRoute,
  "some-legitimate-auth-route",
  "OTP does not discard non-plan intents while food onboarding still needs its selected plan and add-ons",
);

assert.deepEqual(
  getAuthNavigationAction({
    canGoBack: false,
    routeNames: ["signin", "signup", "otpVerification"],
    destination: SIGNIN_ROUTE,
    preferHistory: true,
  }),
  { type: "RESET", destination: "signin" },
  "signup and OTP safely reset to Sign In when history is absent",
);

assert.deepEqual(
  getAuthNavigationAction({
    canGoBack: false,
    routeNames: ["eventVendorProfileScreen", "authFoodTruckPlansScreen"],
    destination: SIGNIN_ROUTE,
    preferHistory: true,
  }),
  { type: "SWITCH_AUTH_ROOT", destination: "signin" },
  "a history-free setup screen switches to the authentication root",
);

const calls = [];
const navigation = {
  canGoBack: () => false,
  getState: () => ({ routeNames: ["eventVendorProfileScreen"] }),
  goBack: () => calls.push("back"),
  navigate: (route) => calls.push(`navigate:${route}`),
  reset: ({ routes }) => calls.push(`reset:${routes[0].name}`),
};
performAuthNavigation({
  navigation,
  destination: SIGNUP_ROUTE,
  switchAuthRoot: (route) => calls.push(`root:${route}`),
});
assert.deepEqual(
  getPostOtpStackReset(),
  { index: 0, routes: [{ name: "splash" }] },
  "OTP resets the auth history to Splash so Select Plan and OTP cannot be revealed by Back or swipe",
);
assert.deepEqual(calls, ["root:signup"]);

assert.deepEqual(
  getOtpCompletionTransition({
    selectedPlan: { slug: "SUB_MARKETPLACE_VENDOR" },
    user: { vendorSubtype: "EVENT_VENDOR", requestStatus: "PENDING" },
  }),
  {
    isOnboarded: true,
    isUnderReview: false,
    vendorOnboardingStep: null,
  },
  "the registration default does not block merchandise profile completion",
);
assert.deepEqual(
  getOtpCompletionTransition({
    selectedPlan: { slug: "SUB_MARKETPLACE_VENDOR" },
    user: {
      vendorSubtype: "EVENT_VENDOR",
      requestStatus: "PENDING",
      isUnderReview: true,
      vendorOnboardingStep: "AWAITING_APPROVAL",
      eventVendorProfile: { review_status: "DRAFT" },
    },
  }),
  { isOnboarded: true, isUnderReview: false, vendorOnboardingStep: null },
  "stale generic approval flags cannot override a Draft Marketplace Vendor profile",
);
assert.equal(
  getFinalSignupDestination({
    selectedPlan: { slug: "SUB_MARKETPLACE_VENDOR" },
  }),
  "eventVendorProfileScreen",
  "merchandise OTP proceeds to the Marketplace Vendor Profile",
);

assert.deepEqual(
  getOtpCompletionTransition({
    selectedPlan: { slug: "SUB_BASIC" },
    user: { vendorSubtype: "FOOD_VENDOR" },
  }),
  {
    isOnboarded: true,
    isUnderReview: true,
    vendorOnboardingStep: "AWAITING_APPROVAL",
  },
  "food-vendor OTP retains its existing approval route",
);
assert.equal(
  getFinalSignupDestination({ user: { vendorSubtype: "FOOD_VENDOR" } }),
  "authFoodTruckProfileScreen",
);

assert.equal(
  getFinalSignupDestination({ user: { vendorSubtype: "EVENT_VENDOR" } }),
  "eventVendorProfileScreen",
  "persisted vendor subtype restores merchandise profile after a cold start",
);

const firstPendingTransition = consumePendingAuthRoute("signup");
assert.deepEqual(firstPendingTransition, {
  destination: "signup",
  pendingAuthRoute: null,
});
assert.deepEqual(
  consumePendingAuthRoute(firstPendingTransition.pendingAuthRoute),
  {
    destination: "signin",
    pendingAuthRoute: null,
  },
);

const [appSource, splashSource, otpSource, signinSource, authSliceSource, planSource] = await Promise.all([
  readFile(new URL("../../App.js", import.meta.url), "utf8"),
  readFile(new URL("../screens/splashScreen.js", import.meta.url), "utf8"),
  readFile(new URL("../screens/otpVerificationScreen.js", import.meta.url), "utf8"),
  readFile(new URL("../screens/signinScreen.js", import.meta.url), "utf8"),
  readFile(new URL("../redux/slices/authSlice.js", import.meta.url), "utf8"),
  readFile(
    new URL("../screens/authFoodTruckPlansScreen.js", import.meta.url),
    "utf8",
  ),
]);

assert.match(appSource, /isEmployeeSession \? \(\s*<EmployeeAppNavigator/);
assert.match(appSource, /<MainAppNavigator insets=\{insets\} \/>/);
assert.match(appSource, /isOnboarded \? \(\s*<FinalSignupStepsNavigator/);
assert.match(splashSource, /consumePendingAuthRoute\(pendingAuthRoute\)/);
assert.match(otpSource, /getConsumedMarketplaceOtpState/);
assert.match(otpSource, /onModalHide=\{completeSignupTransition\}/);
assert.match(otpSource, /completionPendingRef\.current = true/);
assert.match(otpSource, /setSelectedPlan\(transition\.selectedPlan\)/);
assert.match(otpSource, /completeOtpSignupTransition\(transition\)/);
assert.match(otpSource, /navigation\.reset\(getPostOtpStackReset\(\)\)/);
assert.ok(
  otpSource.indexOf("dispatch(setOtpSignupCompletionPending(true))") <
    otpSource.indexOf("dispatch(setUser(response.data.user))"),
  "OTP marks the local session as pending before retaining credentials",
);
assert.match(
  authSliceSource,
  /completeOtpSignupTransition:[\s\S]*?otpSignupCompletionPending = false/,
  "the final onboarding state and marker consumption occur in one auth reducer action",
);
assert.match(splashSource, /dispatch\(onSignOut\(\)\);\s*dispatch\(clearUserSlice\(\)\);/);
const ownerSignIn = signinSource.slice(
  signinSource.indexOf("const handleSignIn"),
  signinSource.indexOf("const handleEmployeeSignIn"),
);
assert.ok(
  ownerSignIn.indexOf("dispatch(onSignOut())") <
    ownerSignIn.indexOf("dispatch(setUser(response.data.user))"),
  "owner Sign In clears an abandoned OTP session before storing the new account",
);
assert.match(planSource, /dispatch\(setSelectedPlan\(temp_plan\)\)/);
assert.match(planSource, /destination: SIGNUP_ROUTE/);

console.log("Merchandise signup navigation helper tests passed.");
