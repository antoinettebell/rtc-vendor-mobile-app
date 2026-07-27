import React from "react";
import { Image, StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { BrandColor } from "../utils/theme";

const AppLogo = require("../assets/images/AppLogo.png");

const IntroLandingArtwork = ({ width = 412, height = 430 }) => (
  <View style={[styles.container, { width, height }]}>
    <Svg width={width} height={height} viewBox="0 0 412 430" fill="none">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={BrandColor.carolinaBlue} stopOpacity="0.45" />
          <Stop offset="1" stopColor={BrandColor.white} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="truckBlue" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={BrandColor.carolinaBlue} />
          <Stop offset="1" stopColor={BrandColor.navyBlue} />
        </LinearGradient>
      </Defs>

      <Rect width="412" height="430" fill="url(#sky)" />

      <G opacity="0.7">
        <Circle cx="42" cy="90" r="26" fill={BrandColor.white} />
        <Circle cx="70" cy="78" r="34" fill={BrandColor.white} />
        <Circle cx="102" cy="92" r="24" fill={BrandColor.white} />
        <Circle cx="328" cy="94" r="28" fill={BrandColor.white} />
        <Circle cx="362" cy="78" r="36" fill={BrandColor.white} />
        <Circle cx="392" cy="98" r="24" fill={BrandColor.white} />
      </G>

      <G transform="translate(258 54)">
        <Path
          d="M42 28C26 16 10 11 0 18C14 32 31 41 51 46C73 42 91 32 105 18C95 11 79 16 62 28C59 15 53 7 52 0C51 7 45 15 42 28Z"
          fill={BrandColor.carolinaBlue}
        />
        <Path
          d="M51 45C34 36 23 27 15 19C29 20 41 28 51 45Z"
          fill={BrandColor.navyBlue}
          opacity="0.25"
        />
        <Path
          d="M52 45C69 36 82 27 90 19C76 20 63 28 52 45Z"
          fill={BrandColor.navyBlue}
          opacity="0.25"
        />
        <Circle cx="52" cy="39" r="6" fill={BrandColor.navyBlue} />
        <Path
          d="M58 39L67 36L59 33"
          stroke={BrandColor.accentOrange}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>

      <G opacity="0.5">
        <Path
          d="M0 248C52 206 96 222 138 198C184 172 235 176 281 150C330 123 374 126 412 104V430H0V248Z"
          fill={BrandColor.softGreen}
        />
        <Path
          d="M0 286C48 252 92 268 132 246C178 221 229 226 280 204C331 181 376 190 412 166V430H0V286Z"
          fill={BrandColor.forestGreen}
          opacity="0.35"
        />
      </G>

      <G transform="translate(24 184)">
        <Path
          d="M4 168C55 156 92 169 139 153C195 135 232 142 292 126C319 119 342 117 364 118"
          stroke={BrandColor.white}
          strokeWidth="44"
          strokeLinecap="round"
          opacity="0.85"
        />
        <Path
          d="M4 168C55 156 92 169 139 153C195 135 232 142 292 126C319 119 342 117 364 118"
          stroke={BrandColor.lightGray}
          strokeWidth="6"
          strokeLinecap="round"
        />
      </G>

      <G transform="translate(74 212)">
        <Rect x="0" y="52" width="230" height="92" rx="9" fill="url(#truckBlue)" />
        <Path d="M230 72H297C317 72 332 88 332 108V144H230V72Z" fill={BrandColor.navyBlue} />
        <Rect x="18" y="72" width="100" height="52" rx="4" fill={BrandColor.white} opacity="0.92" />
        <Rect x="132" y="72" width="46" height="52" rx="4" fill={BrandColor.white} opacity="0.18" />
        <Rect x="242" y="88" width="54" height="34" rx="5" fill={BrandColor.carolinaBlue} opacity="0.35" />
        <Path d="M16 68H126L116 84H8L16 68Z" fill={BrandColor.white} />
        <Rect x="0" y="126" width="332" height="18" fill={BrandColor.navyBlue} opacity="0.9" />
        <Ellipse cx="72" cy="155" rx="28" ry="28" fill={BrandColor.navyBlue} />
        <Ellipse cx="72" cy="155" rx="16" ry="16" fill={BrandColor.white} />
        <Ellipse cx="268" cy="155" rx="28" ry="28" fill={BrandColor.navyBlue} />
        <Ellipse cx="268" cy="155" rx="16" ry="16" fill={BrandColor.white} />
        <Rect x="20" y="136" width="150" height="8" rx="4" fill={BrandColor.softGreen} />
        <Rect x="258" y="136" width="46" height="8" rx="4" fill={BrandColor.softGreen} />
      </G>
    </Svg>

    <View style={styles.logoCard}>
      <Image source={AppLogo} style={styles.logo} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoCard: {
    alignItems: "center",
    backgroundColor: BrandColor.white,
    borderRadius: 58,
    justifyContent: "center",
    padding: 10,
    position: "absolute",
    top: 116,
  },
  logo: {
    height: 150,
    resizeMode: "contain",
    width: 150,
  },
});

export default IntroLandingArtwork;
