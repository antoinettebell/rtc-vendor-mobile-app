import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import FastImage from "@d11/react-native-fast-image";
import { AppColor } from "../utils/theme";
import { ActivityIndicator } from "react-native-paper";

const placeholderImage = require("../assets/images/placeholderImage.png");

const AppImage = ({
  uri = null,
  containerStyle = {},
  imageStyle = {},
  placeholderImageSource = placeholderImage,
  resizeMode = "cover",
  priority = FastImage.priority.normal,
  cache = FastImage.cacheControl.immutable,
  ...props
}) => {
  const [loading, setLoading] = useState(!!uri);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    setLoading(!!uri);
  }, [uri]);

  return (
    <View
      style={[
        styles.container,
        containerStyle,
        (error || !uri) && { justifyContent: "center", alignItems: "center" },
      ]}
    >
      {loading && !!uri && (
        <ActivityIndicator
          size="small"
          color={AppColor.primary}
          style={StyleSheet.absoluteFill}
        />
      )}

      <FastImage
        style={[
          styles.image,
          imageStyle,
          (error || !uri) && { height: "60%", width: "60%" },
        ]}
        source={
          error || !uri
            ? placeholderImageSource // local placeholder
            : { uri, priority, cache }
        }
        resizeMode={resizeMode}
        onLoadStart={() => setLoading(!!uri)}
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
