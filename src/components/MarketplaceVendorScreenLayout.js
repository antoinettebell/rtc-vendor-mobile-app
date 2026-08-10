import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColor } from "../utils/theme";

export default function MarketplaceVendorScreenLayout({
  title,
  subtitle,
  onBack,
  onSignOut,
  children,
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.back}>
            <Text style={styles.backText}>‹ Back to Marketplace</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {onSignOut ? (
            <TouchableOpacity onPress={onSignOut} style={styles.signOut}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 4) }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 10 },
  back: { alignSelf: "flex-start", paddingVertical: 7 },
  backText: { color: AppColor.primary, fontWeight: "800", fontSize: 15 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  titleCopy: { flex: 1 },
  title: { fontSize: 26, fontWeight: "800", color: "#172033" },
  subtitle: { color: "#64748b", marginTop: 5, lineHeight: 20 },
  signOut: { borderWidth: 1, borderColor: "#b91c1c", borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8 },
  signOutText: { color: "#b91c1c", fontWeight: "800" },
  content: { flex: 1 },
});
