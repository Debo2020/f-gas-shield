import { SeoLandingTemplate, SeoBenefit, SeoFaq } from "@/components/landing/SeoLandingTemplate";

const benefits: SeoBenefit[] = [
  {
    title: "Track every kg, every movement",
    description:
      "Book refrigerant out to a job, log recovery from decommissioned equipment, and reconcile cylinder stock — all in one ledger.",
  },
  {
    title: "Cylinder lifecycle auditing",
    description:
      "Full cylinder history from receipt to disposal with QR-coded labels and check-in / check-out at the stores counter.",
  },
  {
    title: "Per-engineer & per-site visibility",
    description:
      "Engineers see their personal gas log; managers see the company-wide picture. RLS-enforced so nothing leaks between companies.",
  },
  {
    title: "Article 6 record-keeping built in",
    description:
      "Every movement captures equipment, reason and job reference — the exact fields UK F-Gas Regulation 2015 requires.",
  },
  {
    title: "Stock reconciliation",
    description:
      "Real-time view of refrigerant on hand by type, with low-stock flags and supplier receipt logging.",
  },
  {
    title: "Hazardous waste tracking",
    description:
      "Log recovered refrigerant destined for destruction or reclamation, including consignment notes for waste carriers.",
  },
];

const faqs: SeoFaq[] = [
  {
    question: "What is refrigerant tracking software?",
    answer:
      "Software that records the movement of refrigerant gas through your business — from cylinder receipt, to engineer issue, to system top-up, to recovery and disposal. It's how UK contractors meet F-Gas Article 6 record-keeping obligations without paper logs.",
  },
  {
    question: "Which refrigerants does FTrack support?",
    answer:
      "All common HFC, HFO and blend refrigerants used in UK HVAC and refrigeration — R32, R410A, R454B, R134a, R404A, R407C, R290 and many more. Each system carries its CO2e calculation for automatic leak-check scheduling.",
  },
  {
    question: "Can engineers log gas movements offline?",
    answer:
      "Yes. The mobile PWA stores movements locally (encrypted) and syncs automatically once back online — essential for basement plant rooms and remote sites.",
  },
  {
    question: "Does it track cylinders too?",
    answer:
      "Yes. Every cylinder gets a QR label and full lifecycle log: receipt from supplier, check-out to engineer, returns, transfers, and final disposal.",
  },
  {
    question: "How does this compare to a spreadsheet?",
    answer:
      "Spreadsheets can't enforce who edits what, can't schedule leak checks, can't be audited by REFCOM, and break the moment two engineers update them at once. FTrack handles all of that automatically.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "FTrack Refrigerant Tracking Software",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  description:
    "Refrigerant tracking software for UK HVAC and refrigeration contractors. Cylinder lifecycle, gas movements, Article 6 compliant logbook.",
  url: "https://www.ftrack.uk/refrigerant-tracking-software",
  offers: {
    "@type": "Offer",
    priceCurrency: "GBP",
    price: "0",
    description: "7-day free trial",
  },
};

export default function RefrigerantTrackingSoftware() {
  return (
    <SeoLandingTemplate
      title="Refrigerant Tracking Software | FTrack UK"
      metaDescription="Refrigerant tracking software for UK HVAC contractors. Cylinder lifecycle, engineer gas logs, Article 6 record-keeping and audit-ready exports."
      canonicalPath="/refrigerant-tracking-software"
      h1="Refrigerant tracking software for UK HVAC teams"
      subhead="Track every kilogram of refrigerant through your business — cylinder receipt, engineer issue, system top-up, recovery and disposal — in one Article 6 compliant ledger."
      benefits={benefits}
      faqs={faqs}
      relatedLinks={[
        { to: "/f-gas-software", label: "F-Gas software overview" },
        { to: "/refrigerant-management-software", label: "Refrigerant management software" },
        { to: "/f-gas-register-guide", label: "How to join the F-Gas Register" },
        { to: "/pricing", label: "Pricing" },
      ]}
      jsonLd={jsonLd}
    />
  );
}
