export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,15}$/;

export const PROFILE_MENU_IMAGES = {
  yourProfile: require("../assets/images/yourProfileIcon.png"),
  servingLocations: require("../assets/images/servingLocationIcon.png"),
  cuisine: require("../assets/images/cuiniesIcon.png"),
  manageAvailability: require("../assets/images/manageAvailabilityIcon.png"),
  changePassword: require("../assets/images/changePasswordIcon.png"),
  helpSupportTC: require("../assets/images/helpSupportTCIcon.png"),
  logout: require("../assets/images/logoutIcon.png"),
  deleteAccount: require("../assets/images/dltAccountIcon.png"),
};

export const PROFILE_AVATAR = "https://avatar.iran.liara.run/public/12";

export const orderStatusSrings = {
  placed: "PLACED",
  cancel: "CANCEL",
  accepted: "ACCEPTED",
  rejected: "REJECTED",
  preparing: "PREPARING",
  ready_for_pickup: "READY_FOR_PICKUP",
  completed: "COMPLETED",
};
