import React from "react";
import {
  Platform,
  requireNativeComponent,
  StyleSheet,
  Text,
  View,
} from "react-native";

const NativeTapToPaySymbol = Platform.OS === "ios"
  ? requireNativeComponent("RTCTapToPaySymbol")
  : null;

const TapToPayCheckoutButtonContent = ({
  color,
  labelStyle,
  total,
  totalStyle,
}) => (
  <View style={styles.content}>
    <View style={styles.labelRow}>
      {NativeTapToPaySymbol ? (
        <NativeTapToPaySymbol
          pointSize={20}
          symbolColor={color}
          style={styles.symbol}
        />
      ) : null}
      <Text style={labelStyle}>Tap to Pay on iPhone</Text>
    </View>
    {total ? <Text style={totalStyle}>{total}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
  },
  labelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  symbol: {
    height: 24,
    marginRight: 8,
    width: 24,
  },
});

export default TapToPayCheckoutButtonContent;
