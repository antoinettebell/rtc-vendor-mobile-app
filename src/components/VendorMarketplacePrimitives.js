import React from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColor } from "../utils/theme";
import StatusBarManager from "./StatusBarManager";
import { MarketplaceHeader, formatStatusLabel, styles } from "../screens/vendorMarketplaceShared";

export const VendorMarketplacePage = ({ title, navigation, right, onBack, hideBack = false, children }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <MarketplaceHeader title={title} navigation={navigation} right={right} onBack={onBack} hideBack={hideBack} />
      {children}
    </View>
  );
};

export const VendorMarketplaceCard = ({ children, onPress, style, activeOpacity = 0.8 }) => {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return <TouchableOpacity activeOpacity={activeOpacity} style={[styles.card, style]} onPress={onPress}>{children}</TouchableOpacity>;
};

export const VendorMarketplaceStatusBadge = ({ status, style }) => (
  <View style={[styles.badge, style]}>
    <Text style={styles.badgeText}>{formatStatusLabel(status)}</Text>
  </View>
);

export const VendorMarketplaceActionRow = ({ children, style, vertical = false }) => (
  <View style={[vertical ? { gap: 10, marginTop: 14 } : [styles.row, { marginTop: 12 }], style]}>{children}</View>
);

export const VendorMarketplacePrimaryAction = ({ label, onPress, disabled, style }) => (
  <TouchableOpacity activeOpacity={0.8} disabled={disabled} style={[styles.button, style]} onPress={onPress}>
    <Text style={styles.buttonText}>{label}</Text>
  </TouchableOpacity>
);

export const VendorMarketplaceSecondaryAction = ({ label, onPress, disabled, destructive = false, style }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    disabled={disabled}
    style={[styles.secondaryButton, destructive && { borderColor: "#b91c1c" }, style]}
    onPress={onPress}
  >
    <Text style={[styles.secondaryButtonText, destructive && { color: "#b91c1c" }]}>{label}</Text>
  </TouchableOpacity>
);

export const VendorMarketplaceLoadingState = () => (
  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
    <ActivityIndicator color={AppColor.primary} size="large" />
  </View>
);

export const VendorMarketplaceEmptyState = ({ title, message, action = null }) => (
  <VendorMarketplaceCard>
    <Text style={[styles.title, { textAlign: "center" }]}>{title}</Text>
    <Text style={styles.emptyText}>{message}</Text>
    {action}
  </VendorMarketplaceCard>
);

export const VendorMarketplaceErrorState = ({ message, onRetry }) => (
  <VendorMarketplaceEmptyState
    title="Unable to Load Marketplace"
    message={message || "Please check your connection and try again."}
    action={onRetry ? <VendorMarketplaceSecondaryAction label="Retry" onPress={onRetry} style={{ marginTop: 14 }} /> : null}
  />
);

export const VendorMarketplaceHeroImages = ({ images = [], onOpen }) => images.length ? (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
    {images.map((image, index) => {
      const uri = typeof image === "string" ? image : image.image_url || image.file_url;
      return (
        <TouchableOpacity key={(typeof image === "object" && (image.image_id || image.photo_id)) || `${uri}-${index}`} onPress={() => onOpen?.(index)}>
          <Image source={{ uri }} style={{ width: 250, height: 160, borderRadius: 12, marginRight: 10 }} />
        </TouchableOpacity>
      );
    })}
  </ScrollView>
) : null;

export const VendorMarketplaceSectionCard = VendorMarketplaceCard;
