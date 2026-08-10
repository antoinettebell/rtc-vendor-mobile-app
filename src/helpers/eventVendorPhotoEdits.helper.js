export const executeEventVendorPhotoEdits = async ({
  photos = [],
  replacements = {},
  removals = [],
  additions = [],
  replacePhoto,
  removePhoto,
  addPhoto,
}) => {
  const remaining = {
    replacements: { ...replacements },
    removals: [...removals],
    additions: [...additions],
  };
  try {
    // Dedicated replacements do not consume another repository slot.
    for (const [photoId, image] of Object.entries(replacements)) {
      const photo = photos.find((item) => item.photo_id === photoId);
      await replacePhoto({ photoId, image, category: photo?.category });
      delete remaining.replacements[photoId];
    }
    // Release category/total reservations before creating separate additions.
    for (const photoId of removals) {
      await removePhoto(photoId);
      remaining.removals = remaining.removals.filter((value) => value !== photoId);
    }
    for (const addition of additions) {
      await addPhoto(addition);
      remaining.additions = remaining.additions.filter(
        (value) => value.localId !== addition.localId,
      );
    }
    return remaining;
  } catch (error) {
    error.remainingPhotoEdits = remaining;
    throw error;
  }
};

export const runPhotoEditSaveOnce = async (lock, operation) => {
  if (lock.current) return { skipped: true };
  lock.current = true;
  try {
    return await operation();
  } finally {
    lock.current = false;
  }
};
