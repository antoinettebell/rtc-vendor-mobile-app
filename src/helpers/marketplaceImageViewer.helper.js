export const resolveMarketplaceImageUri = (image) => {
  if (typeof image === "string") return image.trim() || null;
  if (!image || typeof image !== "object") return null;
  const value = image.image_url || image.file_url || image.url;
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

export const getMarketplaceImageViewerState = (images = [], requestedIndex = 0) => {
  const validImages = images
    .map((image, originalIndex) => ({ image, uri: resolveMarketplaceImageUri(image), originalIndex }))
    .filter((item) => item.uri);
  const numericIndex = Number.isInteger(requestedIndex) ? requestedIndex : 0;
  const requestedValidIndex = validImages.findIndex((item) => item.originalIndex === numericIndex);
  const index = requestedValidIndex >= 0
    ? requestedValidIndex
    : Math.min(Math.max(numericIndex, 0), Math.max(validImages.length - 1, 0));
  return { validImages, index };
};

export const moveMarketplaceImageIndex = (index, direction, length) =>
  Math.min(Math.max(index + direction, 0), Math.max(length - 1, 0));
