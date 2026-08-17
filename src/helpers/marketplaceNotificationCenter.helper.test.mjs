import assert from "node:assert/strict";
import {
  excludeDismissedMarketplaceNotifications,
  getMarketplaceNotificationDismissalId,
  getMarketplaceNotificationRouteParams,
  splitMarketplaceNotifications,
} from "./marketplaceNotificationCenter.helper.js";

const notifications = [
  { id: "unread", type: "MARKETPLACE_MESSAGE", unread: true },
  { id: "read", type: "MARKETPLACE_MESSAGE", unread: false },
  { id: "award", type: "MARKETPLACE_APPLICATION" },
];
const sections = splitMarketplaceNotifications(notifications);
assert.deepEqual(sections.unreadMessages.map((item) => item.id), ["unread"]);
assert.deepEqual(sections.readMessages.map((item) => item.id), ["read"]);
assert.deepEqual(sections.otherNotifications.map((item) => item.id), ["award"]);
assert.deepEqual(
  getMarketplaceNotificationRouteParams({
    event_id: "event-1",
    bid_id: "bid-1",
    application_id: null,
  }),
  { eventId: "event-1", bidId: "bid-1", applicationId: null }
);

const readMessage = {
  id: "message-1",
  type: "MARKETPLACE_MESSAGE",
  occurred_at: "2026-08-17T01:00:00.000Z",
};
const dismissalId = getMarketplaceNotificationDismissalId(readMessage);
assert.deepEqual(
  excludeDismissedMarketplaceNotifications(notifications, [dismissalId]),
  notifications,
  "an unrelated notification list remains visible",
);
assert.deepEqual(
  excludeDismissedMarketplaceNotifications([readMessage], [dismissalId]),
  [],
  "a cleared notification remains hidden",
);
assert.equal(
  excludeDismissedMarketplaceNotifications(
    [{ ...readMessage, occurred_at: "2026-08-17T02:00:00.000Z" }],
    [dismissalId],
  ).length,
  1,
  "a newer reply in the same conversation remains visible",
);

console.log("marketplace notification center tests passed");
