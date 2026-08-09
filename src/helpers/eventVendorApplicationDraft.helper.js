export const EVENT_VENDOR_APPLICATION_RETURN_KEY =
  "event-vendor-application:return-after-approval";

export const buildEventVendorApplicationDraft = (state, overrides = {}) => ({
  selected: [...(state.selected || [])],
  types: [...(state.types || [])],
  bullets: state.bullets || "",
  price: state.price || "",
  notes: state.notes || "",
  electricity: state.electricity ?? null,
  feeAck: state.feeAck === true,
  pendingAgreement: state.pendingAgreement === true,
  ...overrides,
});

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
      .some((item) => item.event_id === eventId);
    if (!availableEvent) {
      const error = new Error("This event is closed or no longer accepting applications.");
      error.authoritativeApplicationUnavailable = true;
      throw error;
    }
    const draft = storedDraft ? JSON.parse(storedDraft) : null;
    return { profile, photos: photoResponse?.data?.photoList || [], draft };
  } catch (error) {
    if (isAuthoritativeApplicationUnavailable(error)) {
      await storage.removeItem(returnKey).catch(() => {});
      error.authoritativeApplicationUnavailable = true;
    }
    throw error;
  }
};
