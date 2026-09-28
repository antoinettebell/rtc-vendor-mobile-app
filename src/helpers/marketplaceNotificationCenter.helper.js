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

const MARKETPLACE_PUSH_TYPES = {
  MARKETPLACE_AWARD_AMENDMENT_REQUESTED: "MARKETPLACE_AWARD_AMENDMENT",
  MARKETPLACE_EVENT_UPDATED: "MARKETPLACE_EVENT_UPDATED",
};

export const normalizeMarketplacePushNotification = (data = {}) => {
  const type = MARKETPLACE_PUSH_TYPES[data.notificationType];
  if (!type) return null;
  return {
    type,
    event_id: data.eventId || data.event_id || null,
    bid_id: data.bidId || data.bid_id || null,
    application_id: data.applicationId || data.application_id || null,
    amendment_id: data.amendmentId || data.amendment_id || null,
  };
};

export const getMarketplaceNotificationDismissalId = (notification = {}) =>
  [
    notification.id || [
      notification.type || "marketplace",
      notification.event_id || "",
      notification.question_id || "",
      notification.bid_id || "",
      notification.application_id || "",
      notification.status || "",
    ].join("-"),
    notification.occurred_at || notification.event_date || "",
  ].join(":");

export const excludeDismissedMarketplaceNotifications = (
  notifications = [],
  dismissedIds = [],
) => {
  const dismissed = new Set(dismissedIds);
  return notifications.filter(
    (notification) =>
      !dismissed.has(getMarketplaceNotificationDismissalId(notification)),
  );
};

const submissionEvent = (submission) =>
  submission?.marketplaceEvent || submission?.event || null;

export const resolveFoodMarketplaceNotificationDestination = async ({
  notification,
  loadBids,
  loadApplications,
}) => {
  if (notification?.bid_id) {
    const response = await loadBids();
    const bids = response?.data?.marketplaceBidList || [];
    const bid = bids.find((item) => item?.bid_id === notification.bid_id);
    if (bid) {
      if (notification?.type === "MARKETPLACE_AWARD_AMENDMENT") {
        return {
          route: "VendorAwardedEventDetailsScreen",
          params: {
            itemType: "BID",
            bid,
            event: submissionEvent(bid),
          },
        };
      }
      return {
        route: "VendorBidDetailScreen",
        params: { bid, event: submissionEvent(bid) },
      };
    }
    return { route: "VendorMyBidsScreen", params: {} };
  }

  if (notification?.application_id) {
    const response = await loadApplications();
    const applications = response?.data?.marketplaceApplicationList || [];
    const application = applications.find(
      (item) => item?.application_id === notification.application_id
    );
    if (application) {
      return {
        route: "VendorApplicationDetailScreen",
        params: { application, event: submissionEvent(application) },
      };
    }
    return { route: "VendorMyApplicationsScreen", params: {} };
  }

  return {
    route: "vendorMarketplaceEventDetailsScreen",
    params: { eventId: notification?.event_id || null },
  };
};
