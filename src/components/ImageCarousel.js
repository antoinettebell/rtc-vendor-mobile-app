import React from "react";
import { StyleSheet, View } from "react-native";
import AppImage from "./AppImage";

const ImageCarousel = ({
  containerHeight = 210,
  containerWidth = "100%",
  containerStyle = {},
  images,
  imageResizeMode = "cover",
  imageContainer = {},
  imageStyle = {},
}) => {
  const firstImage = Array.isArray(images) ? images[0] : null;

  if (!firstImage) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { height: containerHeight, width: containerWidth },
        containerStyle,
      ]}
    >
      <AppImage
        uri={firstImage}
        resizeMode={imageResizeMode}
        containerStyle={[styles.imageContainer, imageContainer]}
        imageStyle={[styles.image, imageStyle]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  imageContainer: {
    height: "100%",
    width: "100%",
  },
  image: {
    height: "100%",
    width: "100%",
  },
});

export default ImageCarousel;
