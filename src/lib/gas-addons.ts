// Natural Gas Compliance Add-on configuration
export const ADDON_MODULES = {
  natural_gas: {
    name: "Natural Gas Compliance",
    description: "Domestic & commercial gas certification with branded PDF generation",
    product_id: "prod_U66CcCxINGyl6y",
    price_id: "price_1T7u0OF9KjzL48NkyYDPnOqO",
    price: 15,
    annual_price: 12.50,
    currency: "GBP",
    features: [
      "Landlord Gas Safety Records",
      "Homeowner Gas Safety Records",
      "Non-Domestic Gas Safety Records",
      "Gas Testing & Purging Certificates",
      "Gas Warning Notices",
      "Branded PDF generation",
      "Digital signature capture",
    ],
    certificate_types: [
      { value: "landlord_gas_safety", label: "Landlord Gas Safety Record" },
      { value: "homeowner_gas_safety", label: "Homeowner Gas Safety Record" },
      { value: "nd_gas_safety", label: "ND Gas Safety Record" },
      { value: "nd_gas_testing_purging", label: "ND Gas Testing & Purging" },
      { value: "gas_warning_notice", label: "Gas Warning Notice" },
    ],
  },
} as const;

export type AddonType = keyof typeof ADDON_MODULES;
export type GasCertificateType = typeof ADDON_MODULES.natural_gas.certificate_types[number]["value"];
