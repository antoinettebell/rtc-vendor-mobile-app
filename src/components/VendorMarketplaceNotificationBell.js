import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import {
  acknowledgeMarketplaceNotifications_API,
  getMarketplaceEventQuestions_API,
  getMarketplaceNotificationSummary_API,
} from "../api/appAPI";
import {
  excludeDismissedMarketplaceNotifications,
  getMarketplaceNotificationDismissalId,
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
  const userId = useSelector((state) => state.userReducer.user?._id);
  const [visible, setVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);
  const dismissalStorageKey = `vendorMarketplaceClearedNotifications:${userId || "anonymous"}`;

  React.useEffect(() => {
    let active = true;
    AsyncStorage.getItem(dismissalStorageKey)
      .then((saved) => {
        const parsed = saved ? JSON.parse(saved) : [];
        if (active) setDismissedIds(Array.isArray(parsed) ? parsed : []);
      })
      .catch(() => {
        if (active) setDismissedIds([]);
      });
    return () => { active = false; };
  }, [dismissalStorageKey]);

  const load = useCallback(async () => {
    try {
      const response = await getMarketplaceNotificationSummary_API();
      if (response?.success) {
        setNotifications(response.data?.marketplaceNotificationList || []);
      }
    } catch (error) {
      console.log("Marketplace notification summary error", error);
      setNotifications([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const visibleNotifications = useMemo(
    () => excludeDismissedMarketplaceNotifications(notifications, dismissedIds),
    [dismissedIds, notifications],
  );
  const sections = useMemo(
    () => splitMarketplaceNotifications(visibleNotifications),
    [visibleNotifications]
  );
  const badgeCount = visibleNotifications.filter(
    (item) =>
      (item.type === "MARKETPLACE_MESSAGE" && item.unread) ||
      (item.type === "OPERATIONAL_COMPLIANCE" && !item.acknowledged) ||
      !["MARKETPLACE_MESSAGE", "OPERATIONAL_COMPLIANCE"].includes(item.type),
  ).length;

  const clearNotifications = () => {
    if (!visibleNotifications.length) return;
    Alert.alert(
      "Clear Notifications",
      "Remove all notifications currently shown? New messages and status updates will still appear.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            const nextDismissedIds = [
              ...new Set([
                ...dismissedIds,
                ...visibleNotifications.map(getMarketplaceNotificationDismissalId),
              ]),
            ].slice(-500);
            setDismissedIds(nextDismissedIds);
            await AsyncStorage.setItem(
              dismissalStorageKey,
              JSON.stringify(nextDismissedIds),
            ).catch(() => undefined);
            const operationalIds = visibleNotifications
              .filter((item) => item.type === "OPERATIONAL_COMPLIANCE" && item.notification_id)
              .map((item) => item.notification_id);
            if (operationalIds.length) {
              acknowledgeMarketplaceNotifications_API(operationalIds).catch(() => undefined);
            }
            const messageEventIds = [
              ...new Set(
                visibleNotifications
                  .filter((item) => item.type === "MARKETPLACE_MESSAGE")
                  .map((item) => item.event_id)
                  .filter(Boolean),
              ),
            ];
            if (messageEventIds.length) {
              Promise.all(
                messageEventIds.map((eventId) =>
                  getMarketplaceEventQuestions_API(eventId, { markRead: true }),
                ),
              ).catch(() => undefined);
            }
          },
        },
      ],
    );
  };

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
            {visibleNotifications.length ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <NotificationSection title="Unread Messages" items={sections.unreadMessages} onPress={open} />
                <NotificationSection title="Read Messages" items={sections.readMessages} onPress={open} />
                <NotificationSection title="Other Notifications" items={sections.otherNotifications} onPress={open} />
              </ScrollView>
            ) : (
              <Text style={styles.empty}>No notifications right now.</Text>
            )}
            {visibleNotifications.length ? (
              <TouchableOpacity style={styles.clearButton} onPress={clearNotifications}>
                <Text style={styles.clearButtonText}>Clear Notifications</Text>
              </TouchableOpacity>
            ) : null}
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
  clearButton: { alignItems: "center", borderColor: AppColor.primary, borderRadius: 8, borderWidth: 1, marginTop: 12, paddingVertical: 11 },
  clearButtonText: { color: AppColor.primary, fontFamily: Mulish700, fontSize: 14 },
});

export default VendorMarketplaceNotificationBell;
