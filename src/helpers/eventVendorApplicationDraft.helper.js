export const LEGACY_EVENT_VENDOR_APPLICATION_RETURN_KEY =
  "event-vendor-application:return-after-approval";
export const LEGACY_EVENT_VENDOR_APPLICATION_DRAFT_PREFIX =
  "event-vendor-application-draft:";

const requireStorageIdentity = (value, label) => {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${label} is required for application storage.`);
  return normalized;
};

export const getEventVendorApplicationDraftKey = (vendorId, eventId) =>
  `${LEGACY_EVENT_VENDOR_APPLICATION_DRAFT_PREFIX}vendor:${requireStorageIdentity(
    vendorId,
    "Vendor ID",
  )}:event:${requireStorageIdentity(eventId, "Event ID")}`;

export const getEventVendorApplicationReturnKey = (vendorId) =>
  `${LEGACY_EVENT_VENDOR_APPLICATION_RETURN_KEY}:vendor:${requireStorageIdentity(
    vendorId,
    "Vendor ID",
  )}`;

export const isLegacyEventVendorApplicationDraftKey = (key = "") => {
  if (!String(key).startsWith(LEGACY_EVENT_VENDOR_APPLICATION_DRAFT_PREFIX)) {
    return false;
  }
  return !String(key).slice(LEGACY_EVENT_VENDOR_APPLICATION_DRAFT_PREFIX.length)
    .startsWith("vendor:");
};

export const getEventVendorSignOutKeys = (keys = [], vendorId) => {
  const normalizedVendorId = String(vendorId || "").trim();
  const scopedDraftPrefix = normalizedVendorId
    ? `${LEGACY_EVENT_VENDOR_APPLICATION_DRAFT_PREFIX}vendor:${normalizedVendorId}:event:`
    : null;
  const scopedReturnKey = normalizedVendorId
    ? getEventVendorApplicationReturnKey(normalizedVendorId)
    : null;
  return keys.filter(
    (key) =>
      isLegacyEventVendorApplicationDraftKey(key) ||
      key === LEGACY_EVENT_VENDOR_APPLICATION_RETURN_KEY ||
      (scopedDraftPrefix && key.startsWith(scopedDraftPrefix)) ||
      key === scopedReturnKey ||
      (normalizedVendorId &&
        key.startsWith("docusign-recovery:") &&
        key.endsWith(`:vendor:${normalizedVendorId}`)),
  );
};

export const prepareEventVendorApplicationStorage = async ({
  storage,
  vendorId,
  eventId = null,
}) => {
  const draftKey = eventId
    ? getEventVendorApplicationDraftKey(vendorId, eventId)
    : null;
  const returnKey = getEventVendorApplicationReturnKey(vendorId);
  const legacyDraftKey = eventId
    ? `${LEGACY_EVENT_VENDOR_APPLICATION_DRAFT_PREFIX}${eventId}`
    : null;

  // Legacy records were not account-scoped. Only migrate records that carry a
  // matching owner; otherwise remove them so a later account cannot hydrate them.
  for (const [legacyKey, scopedKey] of [
    ...(legacyDraftKey ? [[legacyDraftKey, draftKey]] : []),
    [LEGACY_EVENT_VENDOR_APPLICATION_RETURN_KEY, returnKey],
  ]) {
    const legacyValue = await storage.getItem(legacyKey);
    if (legacyValue != null) {
      try {
        const parsed = JSON.parse(legacyValue);
        const ownerId = String(parsed?.vendor_user_id || parsed?.vendorUserId || "");
        const scopedValue = await storage.getItem(scopedKey);
        if (ownerId && ownerId === String(vendorId) && scopedValue == null) {
          await storage.setItem(scopedKey, legacyValue);
        }
      } catch {
        // A malformed unscoped record cannot be attributed safely; quarantine it.
      } finally {
        await storage.removeItem(legacyKey);
      }
    }
  }
  return { draftKey, returnKey };
};

export const buildEventVendorApplicationDraft = (state, overrides = {}) => ({
  vendor_user_id: state.vendor_user_id || state.vendorUserId || null,
  selected: [...(state.selected || [])],
  types: [...(state.types || [])],
  bullets: state.bullets || "",
  price: state.price || "",
  notes: state.notes || "",
  electricity: state.electricity ?? null,
  feeAck: state.feeAck === true,
  pendingAgreement: state.pendingAgreement === true,
  participationPath: "APPLICATION",
  ...overrides,
});

export const getEligibleEventVendorTypes = (profile, event) => {
  const approvedTypes = new Set(
    (profile?.vendor_types || []).map((value) => String(value).toUpperCase()),
  );
  return [
    ...new Set(
      (event?.event_vendor_needs || [])
        .map((need) => String(need?.vendor_type || "").toUpperCase())
        .filter((value) => value && approvedTypes.has(value)),
    ),
  ];
};

export const normalizeEventVendorApplicationTypes = ({
  profile,
  event,
  selectedTypes = [],
}) => {
  const eligibleTypes = getEligibleEventVendorTypes(profile, event);
  const eligibleSet = new Set(eligibleTypes);
  const validSelections = [
    ...new Set(
      (selectedTypes || [])
        .map((value) => String(value).toUpperCase())
        .filter((value) => eligibleSet.has(value)),
    ),
  ];
  return {
    eligibleTypes,
    selectedTypes: eligibleTypes.length === 1 ? eligibleTypes : validSelections,
  };
};

export const buildEligibleEventVendorApplicationDraft = ({
  state,
  profile,
  event,
  overrides = {},
}) => {
  const normalized = normalizeEventVendorApplicationTypes({
    profile,
    event,
    selectedTypes: overrides.types ?? state.types,
  });
  return buildEventVendorApplicationDraft(state, {
    ...overrides,
    types: normalized.selectedTypes,
  });
};

const BULLET_PREFIX = "• ";

export const normalizeApplicationBullets = (value = "") => {
  const normalized = String(value).replace(/\r/g, "");
  if (!normalized) return BULLET_PREFIX;
  return normalized
    .split("\n")
    .map((line) => `${BULLET_PREFIX}${line.replace(/^\s*[-•]\s*/, "")}`)
    .join("\n");
};

export const removeEmptyApplicationBullet = (value = "") => {
  const normalized = normalizeApplicationBullets(value);
  const lines = normalized.split("\n");
  if (lines.length > 1 && lines.at(-1) === BULLET_PREFIX) {
    lines.pop();
    return lines.join("\n");
  }
  return normalized;
};

export const updateApplicationBullets = (previous = "", next = "") => {
  if (
    String(previous).endsWith("\n• ") &&
    String(next) === String(previous).slice(0, -1)
  ) {
    return removeEmptyApplicationBullet(previous);
  }
  return normalizeApplicationBullets(next);
};

export const applicationBulletItems = (value = "") =>
  normalizeApplicationBullets(value)
    .split("\n")
    .map((line) => line.replace(/^\s*[-•]\s*/, "").trim())
    .filter(Boolean);

export const sanitizeApplicationCurrency = (value = "") => {
  const stripped = String(value).replace(/[$,\s]/g, "").replace(/[^\d.]/g, "");
  const [whole = "", ...decimalParts] = stripped.split(".");
  const decimals = decimalParts.join("").slice(0, 2);
  return `${whole}${decimalParts.length ? `.${decimals}` : ""}`;
};

export const formatApplicationCurrency = (value = "") => {
  const sanitized = sanitizeApplicationCurrency(value);
  const amount = Number(sanitized);
  return Number.isFinite(amount) && sanitized !== "" ? `$${amount.toFixed(2)}` : "$0.00";
};

export const applicationCurrencyNumber = (value = "") => {
  const amount = Number(sanitizeApplicationCurrency(value));
  return Number.isFinite(amount) ? amount : 0;
};

export const getApprovedApplicationUploadCategories = (
  profile,
  categoryOptions = [],
) => {
  if (!profile?.vendor_types?.includes("MERCHANDISE")) return [];
  const selected = new Set(profile.merchandise_categories || []);
  return categoryOptions.filter((category) => selected.has(category.value));
};

export const parseEventVendorApplicationReturn = (value) => {
  try {
    const parsed = JSON.parse(value || "null");
    return parsed?.event?.event_id ? parsed : null;
  } catch {
    return null;
  }
};

export const clearEventVendorApplicationRecovery = async ({
  storage,
  returnKey,
  draftKey = null,
}) => {
  if (draftKey) await storage.removeItem(draftKey);
  await storage.removeItem(returnKey);
};

export const isAuthoritativeApplicationUnavailable = (error) =>
  error?.authoritativeApplicationUnavailable === true ||
  [404, 410].includes(Number(error?.response?.status || error?.status));

export const getPhotoRemovalPersistenceMessage = () =>
  "The photo was removed, but the local application draft could not be saved. Its stale selection has been cleared where possible.";

export const persistApplicationPhotoSelection = async ({
  storage,
  draftKey,
  draft,
  nextSelected,
  removedPhotoId = null,
}) => {
  const nextDraft = buildEventVendorApplicationDraft(draft, { selected: nextSelected });
  try {
    await storage.setItem(draftKey, JSON.stringify(nextDraft));
  } catch (error) {
    if (removedPhotoId) {
      try {
        const stored = JSON.parse((await storage.getItem(draftKey)) || "{}");
        await storage.setItem(
          draftKey,
          JSON.stringify(buildEventVendorApplicationDraft(stored, {
            selected: (stored.selected || []).filter((id) => id !== removedPhotoId),
          })),
        );
      } catch {
        await storage.removeItem(draftKey).catch(() => {});
      }
    }
    throw error;
  }
  return nextDraft;
};

export const hydrateEventVendorApplication = async ({
  storage,
  draftKey,
  returnKey,
  loadProfile,
  loadPhotos,
  loadEvent,
  eventId,
}) => {
  try {
    const [profileResponse, photoResponse, eventResponse, storedDraft] = await Promise.all([
      loadProfile(),
      loadPhotos(),
      loadEvent(),
      storage.getItem(draftKey),
    ]);
    const profile = profileResponse?.data?.eventVendorProfile;
    if (!profile) throw new Error("This event application is no longer available.");
    const availableEvent = (eventResponse?.data?.marketplaceEventList || [])
      .find((item) => item.event_id === eventId);
    if (!availableEvent) {
      const error = new Error("This event is closed or no longer accepting applications.");
      error.authoritativeApplicationUnavailable = true;
      throw error;
    }
    const draft = storedDraft ? JSON.parse(storedDraft) : null;
    return {
      profile,
      photos: photoResponse?.data?.photoList || [],
      event: availableEvent,
      draft,
    };
  } catch (error) {
    if (isAuthoritativeApplicationUnavailable(error)) {
      await storage.removeItem(returnKey).catch(() => {});
      error.authoritativeApplicationUnavailable = true;
    }
    throw error;
  }
};
