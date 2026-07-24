import React, { useEffect, useState } from "react";
import { StyleSheet, View, ActivityIndicator, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "react-native-paper";
import { WebView } from "react-native-webview";
import { privacyPolicy_API } from "../api/authAPI";
import { AppColor, Mulish700 } from "../utils/theme";
import StatusBarManager from "../components/StatusBarManager";

const PrivacyPolicyScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState("");

  const getDataFromAPI = async () => {
    setLoading(true);
    try {
      const response = await privacyPolicy_API();
      if (response?.success && response?.data) {
        console.log("Response => ", response);
        setHtmlContent(response.data.privacyPolicy);
      }
    } catch (error) {
      console.log("error => ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getDataFromAPI();
  }, []);

  const htmlTemplate = `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
      <style>
        body {
          font-size: 16px;
          padding: 16px;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
  </html>
`;

  return (
    <View style={styles.container}>
      <StatusBarManager barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.white}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingBottom: insets.bottom,
          }}
        >
          <ActivityIndicator color={AppColor.primary} size="large" />
        </View>
      ) : (
        <WebView
          originWhitelist={["*"]}
          source={{ html: htmlTemplate }}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

export default PrivacyPolicyScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColor.white,
  },
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
});
