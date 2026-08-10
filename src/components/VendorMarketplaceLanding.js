import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { AppColor } from "../utils/theme";
import { styles } from "../screens/vendorMarketplaceShared";

export const VENDOR_MARKETPLACE_NAVIGATION = [
  { key: "MARKETPLACE", title: "Marketplace / Near Me", subtitle: "View sourcing events and food opportunities near you.", icon: "storefront" },
  { key: "BIDS", title: "My Bids", subtitle: "Track bids submitted for coordinator-paid events.", icon: "receipt-long" },
  { key: "APPLICATIONS", title: "My Applications", subtitle: "Track applications submitted for vendor-paid events.", icon: "assignment" },
  { key: "AWARDED", title: "Awarded Events", subtitle: "View events you were accepted or awarded for.", icon: "emoji-events" },
];

export const VendorMarketplaceNavigationCard = ({ item, onPress }) => (
  <TouchableOpacity activeOpacity={0.8} style={styles.card} onPress={onPress}>
    <View style={localStyles.cardRow}>
      <View style={localStyles.iconWrap}>
        <MaterialIcons name={item.icon} size={24} color={AppColor.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={26} color={AppColor.gray} />
    </View>
  </TouchableOpacity>
);

export default function VendorMarketplaceLanding({ onSelect, cards = VENDOR_MARKETPLACE_NAVIGATION }) {
  return (
    <>
      <Text style={localStyles.kicker}>ROUND THE CORNER</Text>
      <Text style={localStyles.heading}>Vendor Event Marketplace</Text>
      <Text style={styles.screenIntro}>
        Discover event opportunities, track bids and applications, and manage awarded events.
      </Text>
      {cards.map((item) => (
        <VendorMarketplaceNavigationCard key={item.key} item={item} onPress={() => onSelect(item)} />
      ))}
    </>
  );
}

const localStyles = StyleSheet.create({
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1E6",
  },
  kicker: { fontSize: 11, fontFamily: "Mulish-Bold", color: AppColor.primary, letterSpacing: 0 },
  heading: {
    fontSize: 22,
    fontFamily: "Mulish-Bold",
    color: AppColor.text,
    marginTop: 2,
    marginBottom: 4,
  },
});
