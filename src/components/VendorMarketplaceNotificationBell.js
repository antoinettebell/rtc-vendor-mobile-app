import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { getMarketplaceNotificationSummary_API } from "../api/appAPI";
import {
  getMarketplaceNotificationRouteParams,
  splitMarketplaceNotifications,
} from "../helpers/marketplaceNotificationCenter.helper";
import { AppColor, Mulish400, Mulish700 } from "../utils/theme";

const NotificationSection = ({ title, items, onPress }) => {
  if (!items.length) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          activeOpacity={0.7}
          style={styles.row}
          onPress={() => onPress(item)}
        >
          <Text style={styles.rowTitle}>{item.title}</Text>
          <Text style={styles.rowMeta}>{item.event_name || item.subtitle}</Text>
          {item.event_name && item.subtitle ? (
            <Text style={styles.rowMeta}>{item.subtitle}</Text>
          ) : null}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const VendorMarketplaceNotificationBell = ({ navigation, onOpenNotification }) => {
  const [visible, setVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [counts, setCounts] = useState({ messages: 0, actions: 0, operations: 0 });

  const load = useCallback(async () => {
    try {
      const response = await getMarketplaceNotificationSummary_API();
      if (response?.success) {
        setNotifications(response.data?.marketplaceNotificationList || []);
        setCounts({
          messages: Number(response.data?.unread_message_count || 0),
          actions: Number(response.data?.action_required_count || 0),
          operations: Number(response.data?.operational_unread_count || 0),
        });
      }
    } catch (error) {
      console.log("Marketplace notification summary error", error);
      setNotifications([]);
      setCounts({ messages: 0, actions: 0, operations: 0 });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sections = useMemo(
    () => splitMarketplaceNotifications(notifications),
    [notifications]
  );
  const badgeCount = counts.messages + counts.actions + counts.operations;

  const open = (item) => {
    setVisible(false);
    if (item.type === "MARKETPLACE_MESSAGE") {
      navigation.navigate(
        "vendorMarketplaceMessagesScreen",
        getMarketplaceNotificationRouteParams(item)
      );
      return;
    }
    onOpenNotification?.(item);
  };

  return (
    <>
      <TouchableOpacity
        accessibilityLabel="Marketplace notifications"
        activeOpacity={0.7}
        style={styles.bell}
        onPress={() => setVisible(true)}
      >
        <MaterialIcons name="notifications" size={26} color={AppColor.primary} />
        {badgeCount ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeCount > 99 ? "99+" : badgeCount}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
      <Modal
        animationType="fade"
        transparent
        visible={visible}
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>Notifications</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <MaterialIcons name="close" size={22} color={AppColor.black} />
              </TouchableOpacity>
            </View>
            {notifications.length ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <NotificationSection title="Unread Messages" items={sections.unreadMessages} onPress={open} />
                <NotificationSection title="Read Messages" items={sections.readMessages} onPress={open} />
                <NotificationSection title="Other Notifications" items={sections.otherNotifications} onPress={open} />
              </ScrollView>
            ) : (
              <Text style={styles.empty}>No notifications right now.</Text>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bell: { padding: 4 },
  badge: {
    alignItems: "center",
    backgroundColor: "#DC2626",
    borderRadius: 10,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 4,
    position: "absolute",
    right: -3,
    top: -2,
  },
  badgeText: { color: AppColor.white, fontFamily: Mulish700, fontSize: 10 },
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  card: { backgroundColor: AppColor.white, borderRadius: 8, maxHeight: "80%", padding: 16, width: "100%" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  title: { color: AppColor.black, fontFamily: Mulish700, fontSize: 18 },
  section: { marginTop: 8 },
  sectionTitle: { color: AppColor.primary, fontFamily: Mulish700, fontSize: 14, paddingVertical: 6 },
  row: { borderTopColor: AppColor.border, borderTopWidth: 1, paddingVertical: 12 },
  rowTitle: { color: AppColor.black, fontFamily: Mulish700, fontSize: 14 },
  rowMeta: { color: AppColor.textHighlighter, fontFamily: Mulish400, fontSize: 12, marginTop: 3 },
  empty: { color: AppColor.textHighlighter, fontFamily: Mulish400, fontSize: 14, paddingVertical: 18, textAlign: "center" },
});

export default VendorMarketplaceNotificationBell;
