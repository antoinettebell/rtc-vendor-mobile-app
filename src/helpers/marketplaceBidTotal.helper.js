const money = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const getMarketplaceBidTotal = (bid = {}) => {
  if (bid.total_bid_amount != null) return money(bid.total_bid_amount);

  return money(
    money(bid.full_bid_amount) +
      (bid.specialty_services?.includes("DESSERTS") ? money(bid.dessert_bid_amount) : 0) +
      (bid.specialty_services?.includes("DRINKS") ? money(bid.drinks_bid_amount) : 0),
  );
};
