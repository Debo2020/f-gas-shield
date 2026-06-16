import { SeoLandingTemplate, SeoBenefit, SeoFaq } from "@/components/landing/SeoLandingTemplate";

const benefits: SeoBenefit[] = [
  {
    title: "Built for UK F-Gas regulations",
    description:
      "Automated leak-check scheduling at 12, 6 and 3 month intervals based on CO2e thresholds — straight from the UK F-Gas Regulation.",
  },
  {
    title: "Refrigerant logbook & chain of custody",
    description:
      "Track every kg of refrigerant booked out, recovered or recycled. Article 6 compliant logs with engineer, equipment and job reference.",
  },
  {
    title: "Mobile-first for engineers on site",
    description:
      "Native PWA with offline mode. Engineers record inspections, scan QR labels and capture signatures even when there's no signal.",
  },
  {
    title: "Audit-ready PDF & CSV reports",
    description:
      "Generate branded compliance exports for clients, REFCOM audits or Environment Agency requests in seconds.",
  },
  {
    title: "Multi-site & multi-engineer",
    description:
      "Role-based access for owners, managers, stores and engineers. Centralised dashboard across every site you maintain.",
  },
  {
    title: "AI compliance assistant",
    description:
      "Ask plain-English questions about F-Gas rules and get answers grounded in the regulation — no more digging through PDFs.",
  },
];

const faqs: SeoFaq[] = [
  {
    question: "What does F-Gas software actually do?",
    answer:
      "F-Gas software replaces paper logbooks and spreadsheets. It tracks every piece of refrigerant-containing equipment you maintain, schedules the leak checks required by UK regulation, records refrigerant movements (added, recovered, recycled) and produces the audit trail you need for REFCOM and Environment Agency inspections.",
  },
  {
    question: "Is FTrack suitable for small HVAC contractors?",
    answer:
      "Yes. Pricing starts from a Basic tier that covers a single engineer and small system count, with a 7-day free trial and no card required. Sole traders and growing teams use FTrack alongside REFCOM certification.",
  },
  {
    question: "Does it work offline on a phone?",
    answer:
      "Yes. FTrack is a progressive web app (PWA) with full offline support via encrypted IndexedDB. Engineers can record inspections and gas movements in plant rooms or basements without signal, and everything syncs automatically when they're back online.",
  },
  {
    question: "Can I export records for an audit?",
    answer:
      "Yes — branded PDF and CSV reports for any site, engineer or date range. Records are retained for the full 5-year minimum required by UK F-Gas regulations.",
  },
  {
    question: "Does FTrack replace REFCOM certification?",
    answer:
      "No. REFCOM is the certification scheme for your company; FTrack is the software you use day-to-day to meet the record-keeping and leak-check obligations that come with that certification.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "FTrack F-Gas Software",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  description:
    "F-Gas software for UK HVAC contractors. Refrigerant logbook, automated leak-check scheduling, mobile inspections and audit-ready reports.",
  url: "https://www.ftrack.uk/f-gas-software",
  offers: {
    "@type": "Offer",
    priceCurrency: "GBP",
    price: "0",
    description: "7-day free trial",
  },
};

export default function FGasSoftware() {
  return (
    <SeoLandingTemplate
      title="F-Gas Software for UK HVAC Contractors | FTrack"
      metaDescription="F-Gas software with refrigerant logbook, automated leak-check scheduling, mobile inspections and audit-ready PDF reports. Built for UK regulations."
      canonicalPath="/f-gas-software"
      h1="F-Gas software built for UK HVAC compliance"
      subhead="Replace paper logbooks and spreadsheets with a mobile-first platform that tracks every system, schedules every leak check, and keeps you audit-ready."
      benefits={benefits}
      faqs={faqs}
      relatedLinks={[
        { to: "/refrigerant-tracking-software", label: "Refrigerant tracking software" },
        { to: "/refrigerant-management-software", label: "Refrigerant management software" },
        { to: "/f-gas-register-guide", label: "How to join the F-Gas Register" },
        { to: "/pricing", label: "Pricing" },
      ]}
      jsonLd={jsonLd}
    />
  );
}
