import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import FastImage from "@d11/react-native-fast-image";
import { AppColor } from "../utils/theme";
import { ActivityIndicator } from "react-native-paper";

const placeholderImage = require("../assets/images/placeholderImage.png");

const AppImage = ({
  uri = null,
  style = {},
  placeholderImageSource = placeholderImage,
  resizeMode = "cover",
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <View
      style={[
        styles.container,
        style,
        (error || !uri) && { justifyContent: "center", alignItems: "center" },
      ]}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={AppColor.primary}
          style={StyleSheet.absoluteFill}
        />
      )}

      <FastImage
        style={[
          styles.image,
          (error || !uri) && { height: "60%", width: "60%" },
        ]}
        source={
          error || !uri
            ? placeholderImageSource // local placeholder
            : { uri }
        }
        resizeMode={resizeMode}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
    borderRadius: 5,
    overflow: "hidden",
    backgroundColor: AppColor.white,
  },
  image: { width: "100%", height: "100%" },
});

export default AppImage;
