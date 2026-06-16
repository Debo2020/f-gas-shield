import { SeoLandingTemplate, SeoBenefit, SeoFaq } from "@/components/landing/SeoLandingTemplate";

const benefits: SeoBenefit[] = [
  {
    title: "Certification body (REFCOM)",
    description:
      "REFCOM is the largest UK F-Gas certification body. Companies handling fluorinated gases need REFCOM (or equivalent) certification to legally work on stationary refrigeration and air-conditioning.",
  },
  {
    title: "Company & engineer requirements",
    description:
      "Companies must hold a Full company certificate; engineers must hold individual City & Guilds 2079 (or equivalent) qualifications appropriate to the work they carry out.",
  },
  {
    title: "Ongoing record keeping",
    description:
      "Once certified, you must keep records of all refrigerant movements, leak checks and equipment over 5 tonnes CO2e for at least 5 years — and produce them on request.",
  },
];

const faqs: SeoFaq[] = [
  {
    question: "What is the F-Gas Register?",
    answer:
      "In the UK, 'F-Gas Register' usually refers to the register of companies certified to handle fluorinated greenhouse gases under the F-Gas Regulation. The main certification body is REFCOM, which publishes a public list of certified contractors. The UK government also operates a separate register of fluorinated gas at register.fluorinated-gas.service.gov.uk for producers, importers and exporters of bulk gas.",
  },
  {
    question: "Who needs to be on the F-Gas Register?",
    answer:
      "Any UK company that installs, services, maintains, repairs or decommissions stationary refrigeration, air-conditioning or heat-pump equipment containing fluorinated greenhouse gases must hold a company F-Gas certificate. Self-employed engineers operating as a business also need company certification.",
  },
  {
    question: "How do I apply for F-Gas certification?",
    answer:
      "Apply through REFCOM (refcom.org.uk) or another certification body such as Quidos or Bureau Veritas. You'll need to demonstrate that your engineers hold appropriate individual qualifications, that you have suitable tools and procedures, and pay an annual fee. REFCOM publishes a step-by-step 'How to apply' guide on its website.",
  },
  {
    question: "What records do I need to keep after certification?",
    answer:
      "For each piece of equipment containing 5 tonnes CO2e or more of F-gas, you must record: quantity and type of gas installed, any quantities added or recovered, results of leak checks, identity of the engineer and certification body, and details of any recovery or decommissioning. Records must be kept for at least 5 years.",
  },
  {
    question: "How often must I do leak checks?",
    answer:
      "Frequency depends on CO2e load: equipment with 5–50 tonnes CO2e must be checked at least every 12 months; 50–500 tonnes CO2e every 6 months; over 500 tonnes CO2e every 3 months. Automatic leak detection systems can halve these frequencies.",
  },
];

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "How to join the F-Gas Register (UK guide)",
  description:
    "What the UK F-Gas Register is, who needs to be on it, how to apply via REFCOM, and the record-keeping obligations that follow certification.",
  author: { "@type": "Organization", name: "FTrack" },
  publisher: {
    "@type": "Organization",
    name: "FTrack",
    logo: {
      "@type": "ImageObject",
      url: "https://www.ftrack.uk/ftrack-logo.png",
    },
  },
  mainEntityOfPage: "https://www.ftrack.uk/f-gas-register-guide",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

export default function FGasRegisterGuide() {
  const body = (
    <>
      <p>
        If you install, service, maintain or decommission refrigeration, air-conditioning
        or heat-pump equipment in the UK, you almost certainly need to be on the F-Gas
        Register — the public list of companies certified to handle fluorinated greenhouse
        gases under the UK F-Gas Regulation (Regulation 517/2014, retained post-Brexit).
      </p>

      <h2>The two things people mean by "F-Gas Register"</h2>
      <p>
        The phrase usually refers to one of two registers:
      </p>
      <ul>
        <li>
          <strong>The REFCOM register</strong> — the certified-contractor list maintained
          by REFCOM (Refrigeration, Air-conditioning and Heat Pump Companies). This is
          what nearly every HVAC contractor means by "F-Gas Register". Visit{" "}
          <a href="https://www.refcom.org.uk" target="_blank" rel="noopener noreferrer nofollow">
            refcom.org.uk
          </a>{" "}
          to apply.
        </li>
        <li>
          <strong>The government bulk-gas register</strong> at{" "}
          <a
            href="https://register.fluorinated-gas.service.gov.uk"
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            register.fluorinated-gas.service.gov.uk
          </a>{" "}
          — used by producers, importers and exporters of fluorinated gas, not by
          contractors.
        </li>
      </ul>

      <h2>Step-by-step: getting certified via REFCOM</h2>
      <ol>
        <li>Make sure each engineer holds City &amp; Guilds 2079 (or equivalent) for the categories of work they do.</li>
        <li>Apply for a Full F-Gas company certificate through REFCOM (or another body such as Quidos).</li>
        <li>Submit evidence of procedures, tooling, and engineer qualifications.</li>
        <li>Pay the annual fee and host an initial audit visit.</li>
        <li>Receive your certificate — and start keeping the records that come with it.</li>
      </ol>

      <h2>What happens after certification</h2>
      <p>
        Certification is the start, not the end. You'll need to keep records of every
        refrigerant movement, every leak check, and every piece of equipment containing
        5 tonnes CO2e or more — for at least 5 years. That's where most contractors
        outgrow spreadsheets and adopt purpose-built tools like{" "}
        <a href="/f-gas-software">F-Gas software</a> to automate scheduling, logging and
        reporting.
      </p>

      <p className="text-sm text-muted-foreground">
        This guide is informational. Always check the latest guidance on{" "}
        <a href="https://www.gov.uk/government/collections/fluorinated-gas-f-gas-guidance-for-users-producers-and-traders" target="_blank" rel="noopener noreferrer nofollow">
          gov.uk
        </a>{" "}
        and your certification body's website before applying.
      </p>
    </>
  );

  return (
    <SeoLandingTemplate
      title="F-Gas Register UK: How to Apply & Stay Compliant | FTrack"
      metaDescription="A plain-English guide to the UK F-Gas Register: what it is, who needs to join, how to apply via REFCOM, and what records you must keep after certification."
      canonicalPath="/f-gas-register-guide"
      ogType="article"
      h1="The F-Gas Register: a UK contractor's guide"
      subhead="What the F-Gas Register is, who needs to be on it, how to apply through REFCOM, and the record-keeping obligations that follow certification."
      benefitsHeading="The essentials"
      benefits={benefits}
      faqs={faqs}
      body={body}
      primaryCtaLabel="Try FTrack free"
      relatedLinks={[
        { to: "/f-gas-software", label: "F-Gas software" },
        { to: "/refrigerant-tracking-software", label: "Refrigerant tracking software" },
        { to: "/refrigerant-management-software", label: "Refrigerant management software" },
        { to: "/pricing", label: "Pricing" },
      ]}
      jsonLd={[articleJsonLd, faqJsonLd]}
    />
  );
}
