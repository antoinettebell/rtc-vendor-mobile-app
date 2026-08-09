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
  consumePendingAuthRoute,
  performAuthNavigation,
  SIGNIN_ROUTE,
  SIGNUP_ROUTE,
} = await loadHelper("./signupNavigation.helper.js");

assert.deepEqual(
  getAuthNavigationAction({
    routeNames: ["signin", "signup", "authFoodTruckPlansScreen"],
    destination: SIGNUP_ROUTE,
  }),
  { type: "NAVIGATE", destination: "signup" },
  "the normal food-vendor and merchandise-vendor auth flow stays in AuthNavigator",
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

const [appSource, splashSource, otpSource, planSource] = await Promise.all([
  readFile(new URL("../../App.js", import.meta.url), "utf8"),
  readFile(new URL("../screens/splashScreen.js", import.meta.url), "utf8"),
  readFile(new URL("../screens/otpVerificationScreen.js", import.meta.url), "utf8"),
  readFile(
    new URL("../screens/authFoodTruckPlansScreen.js", import.meta.url),
    "utf8",
  ),
]);

assert.match(appSource, /isEmployeeSession \? \(\s*<EmployeeAppNavigator/);
assert.match(appSource, /<MainAppNavigator insets=\{insets\} \/>/);
assert.match(appSource, /isOnboarded \? \(\s*<FinalSignupStepsNavigator/);
assert.match(splashSource, /consumePendingAuthRoute\(pendingAuthRoute\)/);
assert.match(otpSource, /getOtpCompletionTransition/);
assert.match(planSource, /dispatch\(setSelectedPlan\(temp_plan\)\)/);
assert.match(planSource, /destination: SIGNUP_ROUTE/);

console.log("Merchandise signup navigation helper tests passed.");
