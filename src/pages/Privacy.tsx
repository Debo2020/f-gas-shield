import { LandingHeader } from "@/components/landing/LandingHeader";
import { FooterSection } from "@/components/landing/FooterSection";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      <main className="container mx-auto px-4 py-16 md:py-24 max-w-4xl">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground">
              Last updated: January 2025
            </p>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            {/* Introduction */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">
                1. Introduction
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Welcome to FTrack, a product of Build IQ Tech Ltd ("we," "our," or "us"). We are committed 
                to protecting your personal information and your right to privacy. This Privacy Policy explains 
                how we collect, use, disclose, and safeguard your information when you use our F-Gas compliance 
                management platform and related services.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                By using FTrack, you agree to the collection and use of information in accordance with 
                this policy. If you do not agree with our policies and practices, please do not use our services.
              </p>
            </section>

            {/* Information We Collect */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">
                2. Information We Collect
              </h2>
              
              <h3 className="text-xl font-medium text-foreground">Personal Information</h3>
              <p className="text-muted-foreground leading-relaxed">
                We collect personal information that you voluntarily provide when registering for an account, 
                including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Name and contact information (email address, phone number)</li>
                <li>Company name and business address</li>
                <li>F-Gas certification details and certificate numbers</li>
                <li>Job title and role within your organisation</li>
                <li>Account credentials</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground">F-Gas Compliance Data</h3>
              <p className="text-muted-foreground leading-relaxed">
                As part of our compliance management services, we collect and store:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Equipment records (refrigeration systems, air conditioning units)</li>
                <li>Refrigerant types, quantities, and movement logs</li>
                <li>Leak check records and inspection reports</li>
                <li>Site and location information</li>
                <li>Engineer assignment and certification records</li>
                <li>Uploaded documents, certificates, and photos</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground">Usage Data</h3>
              <p className="text-muted-foreground leading-relaxed">
                We automatically collect certain information when you access our platform:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>IP address and browser type</li>
                <li>Device information and operating system</li>
                <li>Pages visited and features used</li>
                <li>Time and date of access</li>
                <li>Referring website or application</li>
              </ul>
            </section>

            {/* How We Use Information */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">
                3. How We Use Your Information
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We use the information we collect for the following purposes:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>To provide and maintain our F-Gas compliance management services</li>
                <li>To process your account registration and manage your subscription</li>
                <li>To generate compliance reports and maintain audit trails</li>
                <li>To send you important notifications about inspections, certifications, and deadlines</li>
                <li>To respond to your enquiries and provide customer support</li>
                <li>To improve our platform and develop new features</li>
                <li>To ensure security and prevent fraud</li>
                <li>To comply with legal obligations, including F-Gas regulations</li>
              </ul>
            </section>

            {/* Data Sharing */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">
                4. Data Sharing and Disclosure
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We do not sell your personal information. We may share your data in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>
                  <strong className="text-foreground">Within Your Organisation:</strong> Data is shared with 
                  authorised team members within your company account as configured by your administrator.
                </li>
                <li>
                  <strong className="text-foreground">Service Providers:</strong> We work with trusted third-party 
                  providers who assist in operating our platform (hosting, analytics, payment processing).
                </li>
                <li>
                  <strong className="text-foreground">Legal Requirements:</strong> We may disclose information if 
                  required by law, regulation, or legal process.
                </li>
                <li>
                  <strong className="text-foreground">Regulatory Bodies:</strong> Compliance data may be shared 
                  with environmental regulators if required by F-Gas legislation.
                </li>
                <li>
                  <strong className="text-foreground">Business Transfers:</strong> In the event of a merger, 
                  acquisition, or sale of assets, your information may be transferred.
                </li>
              </ul>
            </section>

            {/* Data Retention */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">
                5. Data Retention
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal information for as long as necessary to provide our services and 
                fulfil the purposes described in this policy. F-Gas compliance records are retained for a 
                minimum of 5 years as required by UK F-Gas regulations. After account termination, we may 
                retain certain data for legal and regulatory compliance purposes.
              </p>
            </section>

            {/* Your Rights */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">
                6. Your Rights (UK GDPR)
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Under the UK General Data Protection Regulation (UK GDPR), you have the following rights:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong className="text-foreground">Right of Access:</strong> Request a copy of your personal data</li>
                <li><strong className="text-foreground">Right to Rectification:</strong> Request correction of inaccurate data</li>
                <li><strong className="text-foreground">Right to Erasure:</strong> Request deletion of your data (subject to legal retention requirements)</li>
                <li><strong className="text-foreground">Right to Restrict Processing:</strong> Request limitation of how we use your data</li>
                <li><strong className="text-foreground">Right to Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
                <li><strong className="text-foreground">Right to Object:</strong> Object to processing based on legitimate interests</li>
                <li><strong className="text-foreground">Rights Related to Automated Decision-Making:</strong> Right not to be subject to solely automated decisions</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                To exercise any of these rights, please contact us at hello@build-iq.co.uk.
              </p>
            </section>

            {/* Cookies */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">
                7. Cookies and Tracking Technologies
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We use cookies and similar tracking technologies to enhance your experience on our platform:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong className="text-foreground">Essential Cookies:</strong> Required for the platform to function (authentication, security)</li>
                <li><strong className="text-foreground">Preference Cookies:</strong> Remember your settings and preferences</li>
                <li><strong className="text-foreground">Analytics Cookies:</strong> Help us understand how users interact with our platform</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                You can manage cookie preferences through your browser settings. Disabling certain cookies 
                may affect the functionality of our services.
              </p>
            </section>

            {/* Security */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">
                8. Data Security
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate technical and organisational measures to protect your personal 
                information, including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security assessments and monitoring</li>
                <li>Employee training on data protection</li>
                <li>Incident response procedures</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                While we strive to protect your data, no method of transmission over the internet is 100% 
                secure. We cannot guarantee absolute security but are committed to maintaining industry-standard 
                protection.
              </p>
            </section>

            {/* Children's Privacy */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">
                9. Children's Privacy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Our services are not intended for individuals under the age of 18. We do not knowingly 
                collect personal information from children. If you believe we have inadvertently collected 
                data from a minor, please contact us immediately.
              </p>
            </section>

            {/* International Transfers */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">
                10. International Data Transfers
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Your data may be processed in countries outside the UK. When we transfer data internationally, 
                we ensure appropriate safeguards are in place, such as Standard Contractual Clauses approved 
                by the UK Information Commissioner's Office (ICO), to protect your information.
              </p>
            </section>

            {/* Changes */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">
                11. Changes to This Policy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material 
                changes by posting the new policy on this page and updating the "Last updated" date. We 
                encourage you to review this policy periodically.
              </p>
            </section>

            {/* Contact */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">
                12. Contact Us
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-muted/50 rounded-lg p-6 space-y-2">
                <p className="text-foreground font-medium">Build IQ Tech Ltd</p>
                <p className="text-muted-foreground">Trading as: FTrack</p>
                <p className="text-muted-foreground">Company Number: 15883295</p>
                <p className="text-muted-foreground">19 Upper King Street, Norwich, NR3 1RB, United Kingdom</p>
                <p className="text-muted-foreground">Email: hello@build-iq.co.uk</p>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                You also have the right to lodge a complaint with the Information Commissioner's Office (ICO) 
                if you believe your data protection rights have been violated. Visit{" "}
                <a 
                  href="https://ico.org.uk" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  ico.org.uk
                </a>{" "}
                for more information.
              </p>
            </section>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
};

export default Privacy;
