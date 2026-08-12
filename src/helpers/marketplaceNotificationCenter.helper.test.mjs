import assert from "node:assert/strict";
import {
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

console.log("marketplace notification center tests passed");
