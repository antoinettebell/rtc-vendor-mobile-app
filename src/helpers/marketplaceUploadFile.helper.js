const IMAGE_MIME_BY_EXTENSION = {
  heic: "image/heic",
  heif: "image/heif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
};

const getPathName = (value) =>
  String(value || "")
    .split("?")[0]
    .split("/")
    .pop();

export const buildMarketplaceImageUploadFile = (
  image,
  fallbackPrefix = "marketplace-image",
) => {
  const uri = image?.path || image?.uri || image?.sourceURL;
  const pathName = getPathName(image?.path || image?.uri);
  const sourceName = pathName || image?.filename || `${fallbackPrefix}-${Date.now()}.jpg`;
  const extension = sourceName.split(".").pop()?.toLowerCase();

  return {
    uri,
    name: sourceName,
    type: IMAGE_MIME_BY_EXTENSION[extension] || image?.mime || "image/jpeg",
    size: image?.size,
  };
};
