import React, { useEffect, useRef, useState } from "react";
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
  const loadTimeoutRef = useRef(null);
  const hasUri = typeof uri === "string" && uri.trim().length > 0;
  const isRemoteUri = typeof uri === "string" && /^https?:\/\//i.test(uri);
  const [loading, setLoading] = useState(isRemoteUri);
  const [error, setError] = useState(false);
  const imageSource =
    error || !hasUri
      ? placeholderImageSource
      : isRemoteUri
        ? { uri, priority, cache }
        : { uri };

  const clearLoadTimeout = () => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    setError(false);
    setLoading(isRemoteUri);
    clearLoadTimeout();

    return clearLoadTimeout;
  }, [isRemoteUri, uri]);

  const handleLoadStart = () => {
    if (!isRemoteUri) return;
    setLoading(true);
    clearLoadTimeout();
    loadTimeoutRef.current = setTimeout(() => {
      setLoading(false);
      setError(true);
    }, 8000);
  };

  const handleLoadEnd = () => {
    clearLoadTimeout();
    setLoading(false);
  };

  const handleError = () => {
    clearLoadTimeout();
    setLoading(false);
    setError(true);
  };

  return (
    <View
      style={[
        styles.container,
        containerStyle,
        (error || !hasUri) && {
          justifyContent: "center",
          alignItems: "center",
        },
      ]}
    >
      {loading && isRemoteUri && (
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
          (error || !hasUri) && { height: "60%", width: "60%" },
        ]}
        source={imageSource}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
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
