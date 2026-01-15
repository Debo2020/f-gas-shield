// Subscription tier configuration
export const SUBSCRIPTION_TIERS = {
  basic: {
    name: "Basic Business",
    price_id: "price_1SnLONF9KjzL48NkDMmoDPq1",
    annual_price_id: "price_1SnLZ9F9KjzL48Nkwq1dmZOH",
    product_id: "prod_Tkr6tR0MQAMZ4S",
    price: 18,
    annual_price: 15,
    currency: "GBP",
    features: [
      "F-Gas compliance essentials",
      "Equipment tracking",
      "Inspection logging",
      "Standard compliance reports",
      "50 AI assistant credits/month",
      "Email support",
    ],
    limits: {
      sites: 5,
      equipment: 50,
      users: 5,
      ai_credits_monthly: 50,
    },
  },
  premium: {
    name: "Premium",
    price_id: "price_1SnLOdF9KjzL48NkPZ4u3cQ1",
    annual_price_id: "price_1SnLZZF9KjzL48Nk6IJW7XR9",
    product_id: "prod_Tkr6z4LLzOAMfG",
    price: 36,
    annual_price: 30,
    currency: "GBP",
    features: [
      "Everything in Basic",
      "Automated compliance workflows",
      "Full audit trails",
      "Carbon reporting & CO₂e tracking",
      "Multi-site visibility",
      "200 AI assistant credits/month",
      "API access",
      "Priority support",
    ],
    limits: {
      sites: 25,
      equipment: 250,
      users: 25,
      ai_credits_monthly: 200,
    },
    popular: true,
  },
  enterprise: {
    name: "Enterprise",
    price_id: "price_1SnLOxF9KjzL48NkB4bVnKWh",
    product_id: "prod_Tkr71ikQFKWIMt",
    price: 500,
    currency: "GBP",
    features: [
      "Everything in Premium",
      "Platform licence for HQ control",
      "Custom branding",
      "Governance & compliance dashboard",
      "Unlimited AI assistant credits",
      "Volume user discounts",
      "Optional per-site fees",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
    ],
    limits: {
      sites: -1, // Unlimited
      equipment: -1,
      users: -1,
      ai_credits_monthly: -1, // Unlimited
    },
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

export function getTierFromProductId(productId: string | null): SubscriptionTier | null {
  if (!productId) return null;
  
  for (const [tier, config] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (config.product_id === productId) {
      return tier as SubscriptionTier;
    }
  }
  return null;
}

export function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(price);
}

export function getAnnualSavingsPercent(tier: SubscriptionTier): number {
  const config = SUBSCRIPTION_TIERS[tier];
  if (!("annual_price" in config)) return 0;
  const monthlyTotal = config.price * 12;
  const annualTotal = config.annual_price * 12;
  return Math.round(((monthlyTotal - annualTotal) / monthlyTotal) * 100);
}
