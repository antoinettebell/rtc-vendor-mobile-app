export const normalizeSubscriptionBenefit = (benefit) => {
  const benefitText = String(benefit || "").replace(
    /\s*\(coming soon\)$/i,
    "",
  );

  if (/marketplace\s+order(?:ing|s)?/i.test(benefitText)) {
    return "Delivery/Pickup Ordering Fulfillment";
  }

  if (/walk[ -]?up\s+(?:pos\s+)?(?:for\s+)?cash\s+payments?\s+only/i.test(benefitText)) {
    return "Walk-Up Payment Acceptance (Cash Only)";
  }

  return benefitText;
};

export const isRemovedSubscriptionBenefit = (benefit) => {
  const benefitText = String(benefit || "").trim();

  return (
    /delivery\s+acceptance/i.test(benefitText) ||
    /pre[ -]?order(?:ed)?\s+ordering/i.test(benefitText) ||
    /^tap\s+to\s+pay$/i.test(benefitText)
  );
};
