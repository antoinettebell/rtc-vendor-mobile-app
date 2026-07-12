import { Alert } from "react-native";

export const showComplianceAlert = (compliance, navigation) => {
  if (!compliance) {
    return false;
  }

  const missing = (compliance.missing_requirements || [])
    .map((item) => item.replace(/_/g, " ").toLowerCase())
    .join(", ");

  Alert.alert(
    "Compliance Required",
    `${compliance.message || "Vendor compliance must be completed."}${
      missing ? `\n\nMissing: ${missing}` : ""
    }\n\nScore: ${compliance.score || 0}/100\nSupport: ${
      compliance.support_phone_number || "(800) 410-7053"
    }`,
    [
      { text: "Close", style: "cancel" },
      navigation
        ? {
            text: "Review",
            onPress: () => navigation.navigate("vendorComplianceScreen"),
          }
        : null,
    ].filter(Boolean),
  );

  return true;
};

export const maybeShowComplianceError = (error, navigation) => {
  const compliance = error?.data?.compliance || error?.compliance;
  if (!compliance) {
    return false;
  }
  return showComplianceAlert(compliance, navigation);
};
