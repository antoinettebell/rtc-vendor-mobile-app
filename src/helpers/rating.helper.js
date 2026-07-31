export const formatVendorRating = (vendor) => {
  const average = Number(vendor?.averageRating ?? vendor?.avgRate);
  const count = Number(vendor?.reviewCount ?? vendor?.totalReviews ?? 0);
  if (!Number.isFinite(average) || !Number.isFinite(count) || count <= 0) {
    return "New vendor";
  }
  return `${average.toFixed(1)} (${count} ${count === 1 ? "review" : "reviews"})`;
};
