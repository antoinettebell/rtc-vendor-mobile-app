import React from "react";
import { Image, StyleSheet, View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";
import { BrandColor } from "../utils/theme";

const AppLogo = require("../assets/images/AppLogo.png");

const IntroLandingArtwork = ({ width = 412, height = 360 }) => (
  <View style={[styles.container, { width, height }]}>
    <Svg width={width} height={height} viewBox="0 0 412 360" fill="none">
      <Circle cx="70" cy="72" r="42" fill={BrandColor.lightGray} opacity="0.8" />
      <Circle cx="340" cy="82" r="50" fill={BrandColor.lightGray} opacity="0.7" />
      <Path
        d="M44 300H368"
        stroke={BrandColor.navyBlue}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.18"
      />
      <G transform="translate(173 34)">
        <Path
          d="M33 26C18 18 6 13 0 17C12 29 26 36 43 40C60 36 74 29 86 17C80 13 68 18 53 26C50 14 44 6 43 0C42 6 36 14 33 26Z"
          fill={BrandColor.carolinaBlue}
        />
        <Path
          d="M43 38C28 31 19 24 13 18C24 19 34 26 43 38Z"
          fill={BrandColor.navyBlue}
          opacity="0.22"
        />
        <Path
          d="M43 38C58 31 67 24 73 18C62 19 52 26 43 38Z"
          fill={BrandColor.navyBlue}
          opacity="0.22"
        />
        <Circle cx="43" cy="34" r="6" fill={BrandColor.navyBlue} />
      </G>
      <G transform="translate(267 252)">
        <Rect x="0" y="18" width="92" height="42" rx="5" fill={BrandColor.carolinaBlue} />
        <Rect x="9" y="24" width="36" height="19" rx="2" fill={BrandColor.white} />
        <Rect x="57" y="24" width="24" height="30" rx="2" fill={BrandColor.navyBlue} opacity="0.3" />
        <Rect x="8" y="20" width="44" height="6" fill={BrandColor.navyBlue} />
        <Circle cx="21" cy="65" r="12" fill={BrandColor.white} stroke={BrandColor.navyBlue} strokeWidth="2" />
        <Circle cx="75" cy="65" r="12" fill={BrandColor.white} stroke={BrandColor.navyBlue} strokeWidth="2" />
        <Line x1="21" y1="53" x2="21" y2="77" stroke={BrandColor.navyBlue} strokeWidth="1" />
        <Line x1="9" y1="65" x2="33" y2="65" stroke={BrandColor.navyBlue} strokeWidth="1" />
        <Line x1="75" y1="53" x2="75" y2="77" stroke={BrandColor.navyBlue} strokeWidth="1" />
        <Line x1="63" y1="65" x2="87" y2="65" stroke={BrandColor.navyBlue} strokeWidth="1" />
      </G>
    </Svg>
    <Image source={AppLogo} style={styles.logo} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: {
    height: 238,
    position: "absolute",
    resizeMode: "contain",
    top: 86,
    transform: [{ rotate: "-8deg" }],
    width: 238,
  },
});

export default IntroLandingArtwork;
