import { SeoLandingTemplate, SeoBenefit, SeoFaq } from "@/components/landing/SeoLandingTemplate";

const benefits: SeoBenefit[] = [
  {
    title: "One platform, every site",
    description:
      "Manage refrigerant inventory, equipment registers, engineers, clients and certifications from a single dashboard.",
  },
  {
    title: "Automated leak-check scheduling",
    description:
      "FTrack calculates CO2e for every system and auto-schedules the 12, 6 or 3-monthly leak checks the regulation requires.",
  },
  {
    title: "Compliance dashboards & alerts",
    description:
      "Real-time visibility on overdue inspections, expiring engineer certs, and refrigerant stock — with email and in-app alerts.",
  },
  {
    title: "Client portal add-on",
    description:
      "Give your clients read-only access to their own site records and compliance reports — billed per user, not per company.",
  },
  {
    title: "Role-based access control",
    description:
      "Owners, managers, stores and engineers each see what they need to. Strict tenant isolation enforced at the database level.",
  },
  {
    title: "Reports REFCOM auditors recognise",
    description:
      "Branded PDF and CSV exports tuned for REFCOM audits and Environment Agency requests. Generate on demand or schedule.",
  },
];

const faqs: SeoFaq[] = [
  {
    question: "What's the difference between refrigerant management and refrigerant tracking?",
    answer:
      "Tracking focuses on the movement of gas — kilograms in, out, recovered. Management is broader: it covers the equipment register, leak-check schedules, engineer certifications, client reporting and audit prep. FTrack does both in one platform.",
  },
  {
    question: "How does FTrack help with audits?",
    answer:
      "Every action is logged with timestamp, user and reason. When REFCOM or the Environment Agency asks for evidence, you generate a PDF or CSV for the period and site requested — no spreadsheet wrangling.",
  },
  {
    question: "Can my clients see their own records?",
    answer:
      "Yes, via the optional client portal add-on (£20/user/month). Clients get read-only access to their site records, inspection history and compliance reports — branded under your company.",
  },
  {
    question: "What size of business is this for?",
    answer:
      "From sole-trader F-Gas engineers up to multi-branch HVAC contractors with dozens of engineers. Tiered pricing scales with users and active systems; an Enterprise tier is available for larger operations.",
  },
  {
    question: "Do you store data in the UK?",
    answer:
      "FTrack is hosted on infrastructure with UK and EU regions and meets UK GDPR requirements. See our Privacy Policy for full data-processing details.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "FTrack Refrigerant Management Software",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  description:
    "Refrigerant management software for UK HVAC contractors. Equipment registers, leak-check scheduling, gas logs, client reporting and REFCOM-ready audits.",
  url: "https://www.ftrack.uk/refrigerant-management-software",
  offers: {
    "@type": "Offer",
    priceCurrency: "GBP",
    price: "0",
    description: "7-day free trial",
  },
};

export default function RefrigerantManagementSoftware() {
  return (
    <SeoLandingTemplate
      title="Refrigerant Management Software | FTrack UK"
      metaDescription="End-to-end refrigerant management software for UK HVAC: equipment registers, leak-check scheduling, gas logs, client portals and REFCOM-ready audits."
      canonicalPath="/refrigerant-management-software"
      h1="Refrigerant management software for UK HVAC contractors"
      subhead="The complete platform for equipment registers, automated leak-check scheduling, refrigerant logs, client reporting and audit-ready compliance."
      benefits={benefits}
      faqs={faqs}
      relatedLinks={[
        { to: "/f-gas-software", label: "F-Gas software overview" },
        { to: "/refrigerant-tracking-software", label: "Refrigerant tracking software" },
        { to: "/f-gas-register-guide", label: "How to join the F-Gas Register" },
        { to: "/pricing", label: "Pricing" },
      ]}
      jsonLd={jsonLd}
    />
  );
}
