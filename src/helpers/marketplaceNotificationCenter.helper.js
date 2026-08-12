export const splitMarketplaceNotifications = (notifications = []) => {
  const messages = notifications.filter(
    (item) => item?.type === "MARKETPLACE_MESSAGE"
  );
  return {
    unreadMessages: messages.filter((item) => item.unread),
    readMessages: messages.filter((item) => !item.unread),
    otherNotifications: notifications.filter(
      (item) => item?.type !== "MARKETPLACE_MESSAGE"
    ),
  };
};

export const getMarketplaceNotificationRouteParams = (notification) => ({
  eventId: notification?.event_id || null,
  bidId: notification?.bid_id || null,
  applicationId: notification?.application_id || null,
});
