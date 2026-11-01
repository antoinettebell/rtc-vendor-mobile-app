import React from "react";
import { Platform, requireNativeComponent } from "react-native";

// PKPaymentButton supplies Apple's approved caption, logo, typography, and
// accessibility behavior. Do not substitute a text or SVG Apple Pay button.
const NativeApplePayButton =
  Platform.OS === "ios"
    ? requireNativeComponent("RTCApplePayButton")
    : null;

const ApplePayButton = ({ buttonType, disabled = false, onPress, style }) => {
  if (Platform.OS !== "ios" || !NativeApplePayButton) return null;

  return (
    <NativeApplePayButton
      buttonType={buttonType}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={style}
    />
  );
};

export default ApplePayButton;
