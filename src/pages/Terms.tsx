import { LandingHeader } from "@/components/landing/LandingHeader";
import { FooterSection } from "@/components/landing/FooterSection";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: January 2025</p>
          </div>

          {/* Content */}
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            
            {/* 1. Acceptance of Terms */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold border-b pb-2">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                Welcome to FTrack. By accessing or using our F-Gas compliance management platform ("Service"), 
                you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, 
                you may not access or use the Service.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                These Terms constitute a legally binding agreement between you (whether personally or on behalf 
                of an entity) and FTrack Ltd ("FTrack", "we", "us", or "our"). By using the Service, you represent 
                that you have the legal capacity to enter into these Terms and agree to comply with them.
              </p>
            </section>

            {/* 2. Description of Services */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold border-b pb-2">2. Description of Services</h2>
              <p className="text-muted-foreground leading-relaxed">
                FTrack provides a comprehensive F-Gas compliance management platform designed for UK HVAC 
                professionals. Our Service includes:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Equipment and refrigerant tracking and management</li>
                <li>Inspection scheduling and leak check recording</li>
                <li>Refrigerant gas movement logging and cylinder inventory management</li>
                <li>AI-powered compliance assistance and regulation guidance</li>
                <li>Document storage and management</li>
                <li>Compliance reporting and export functionality</li>
                <li>Multi-site and multi-user team management</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, 
                with or without notice.
              </p>
            </section>

            {/* 3. Account Registration */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold border-b pb-2">3. Account Registration</h2>
              <h3 className="text-xl font-medium">3.1 Account Creation</h3>
              <p className="text-muted-foreground leading-relaxed">
                To use the Service, you must create an account by providing accurate, current, and complete 
                information. You are responsible for maintaining the confidentiality of your account credentials 
                and for all activities that occur under your account.
              </p>
              <h3 className="text-xl font-medium">3.2 Account Responsibilities</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>You must be at least 18 years old to create an account</li>
                <li>You must provide a valid email address and keep it up to date</li>
                <li>You are responsible for maintaining the security of your password</li>
                <li>You must notify us immediately of any unauthorised access to your account</li>
                <li>You may not share your account credentials with others</li>
              </ul>
              <h3 className="text-xl font-medium">3.3 Company Accounts</h3>
              <p className="text-muted-foreground leading-relaxed">
                If you register on behalf of a company or organisation, you represent that you have the 
                authority to bind that entity to these Terms.
              </p>
            </section>

            {/* 4. Subscription and Payment */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold border-b pb-2">4. Subscription and Payment</h2>
              <h3 className="text-xl font-medium">4.1 Subscription Plans</h3>
              <p className="text-muted-foreground leading-relaxed">
                FTrack offers various subscription plans with different features and pricing. Details of 
                current plans are available on our website. We reserve the right to modify pricing with 
                reasonable notice to existing subscribers.
              </p>
              <h3 className="text-xl font-medium">4.2 Payment Terms</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Subscriptions are billed in advance on a monthly or annual basis</li>
                <li>All fees are quoted in GBP and are exclusive of VAT unless stated otherwise</li>
                <li>Payment is processed securely through our third-party payment provider</li>
                <li>Failed payments may result in suspension of access to the Service</li>
              </ul>
              <h3 className="text-xl font-medium">4.3 Refunds</h3>
              <p className="text-muted-foreground leading-relaxed">
                We offer a 14-day money-back guarantee for new subscriptions. After this period, subscription 
                fees are non-refundable. Annual subscriptions may be cancelled at any time but will remain 
                active until the end of the current billing period.
              </p>
            </section>

            {/* 5. User Responsibilities */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold border-b pb-2">5. User Responsibilities</h2>
              <p className="text-muted-foreground leading-relaxed">
                As a user of FTrack, you agree to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Use the Service only for lawful purposes and in accordance with these Terms</li>
                <li>Provide accurate and truthful information when using the Service</li>
                <li>Maintain the accuracy of your compliance records and data</li>
                <li>Comply with all applicable UK F-Gas regulations and industry standards</li>
                <li>Not use the Service to store or transmit malicious code</li>
                <li>Not attempt to gain unauthorised access to any part of the Service</li>
                <li>Not interfere with or disrupt the integrity of the Service</li>
              </ul>
            </section>

            {/* 6. F-Gas Compliance Data */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold border-b pb-2">6. F-Gas Compliance Data</h2>
              <h3 className="text-xl font-medium">6.1 Data Accuracy</h3>
              <p className="text-muted-foreground leading-relaxed">
                While FTrack provides tools to help you manage F-Gas compliance, you are solely responsible 
                for the accuracy and completeness of the data you enter into the system. FTrack does not 
                verify the accuracy of user-submitted data.
              </p>
              <h3 className="text-xl font-medium">6.2 Regulatory Compliance</h3>
              <p className="text-muted-foreground leading-relaxed">
                FTrack is a tool to assist with F-Gas compliance management, but does not guarantee regulatory 
                compliance. You remain responsible for ensuring your business meets all applicable F-Gas 
                regulations, including but not limited to the UK Fluorinated Greenhouse Gases Regulations.
              </p>
              <h3 className="text-xl font-medium">6.3 AI Compliance Assistant</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our AI Compliance Assistant provides guidance based on current regulations but should not 
                be considered legal advice. For complex compliance matters, we recommend consulting with 
                a qualified professional or regulatory body.
              </p>
            </section>

            {/* 7. Intellectual Property */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold border-b pb-2">7. Intellectual Property</h2>
              <h3 className="text-xl font-medium">7.1 FTrack Ownership</h3>
              <p className="text-muted-foreground leading-relaxed">
                The Service, including all content, features, and functionality, is owned by FTrack and is 
                protected by UK and international copyright, trademark, and other intellectual property laws. 
                Our trademarks may not be used without our prior written consent.
              </p>
              <h3 className="text-xl font-medium">7.2 User License</h3>
              <p className="text-muted-foreground leading-relaxed">
                Subject to these Terms, we grant you a limited, non-exclusive, non-transferable license to 
                access and use the Service for your internal business purposes.
              </p>
              <h3 className="text-xl font-medium">7.3 Your Data</h3>
              <p className="text-muted-foreground leading-relaxed">
                You retain ownership of all data you submit to the Service. By submitting data, you grant 
                us a license to use, store, and process that data to provide the Service to you.
              </p>
            </section>

            {/* 8. Prohibited Activities */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold border-b pb-2">8. Prohibited Activities</h2>
              <p className="text-muted-foreground leading-relaxed">
                You may not engage in any of the following activities:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Violating any applicable laws or regulations</li>
                <li>Infringing on the intellectual property rights of FTrack or others</li>
                <li>Transmitting viruses, malware, or other harmful code</li>
                <li>Attempting to reverse engineer or decompile the Service</li>
                <li>Accessing the Service through automated means (bots, scrapers, etc.)</li>
                <li>Reselling or redistributing the Service without authorisation</li>
                <li>Using the Service to store false or misleading compliance records</li>
                <li>Harassing, threatening, or intimidating other users</li>
              </ul>
            </section>

            {/* 9. Limitation of Liability */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold border-b pb-2">9. Limitation of Liability</h2>
              <h3 className="text-xl font-medium">9.1 Disclaimer of Warranties</h3>
              <p className="text-muted-foreground leading-relaxed">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER 
                EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR 
                A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
              <h3 className="text-xl font-medium">9.2 Limitation of Liability</h3>
              <p className="text-muted-foreground leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, FTRACK SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO 
                LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING FROM YOUR USE OF THE SERVICE.
              </p>
              <h3 className="text-xl font-medium">9.3 Liability Cap</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our total liability for any claims arising from or related to these Terms or the Service 
                shall not exceed the amount you paid to us in the twelve (12) months preceding the claim.
              </p>
            </section>

            {/* 10. Indemnification */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold border-b pb-2">10. Indemnification</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to indemnify, defend, and hold harmless FTrack, its officers, directors, employees, 
                agents, and affiliates from and against any claims, liabilities, damages, losses, costs, or 
                expenses (including reasonable legal fees) arising from:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any third-party rights</li>
                <li>Any data or content you submit to the Service</li>
                <li>Your failure to comply with applicable F-Gas regulations</li>
              </ul>
            </section>

            {/* 11. Termination */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold border-b pb-2">11. Termination</h2>
              <h3 className="text-xl font-medium">11.1 Termination by You</h3>
              <p className="text-muted-foreground leading-relaxed">
                You may terminate your account at any time by contacting our support team. Upon termination, 
                your access to the Service will cease, and your subscription will not be renewed.
              </p>
              <h3 className="text-xl font-medium">11.2 Termination by FTrack</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may suspend or terminate your account at any time if we believe you have violated these 
                Terms or for any other reason at our sole discretion. We will provide notice where reasonably 
                practicable.
              </p>
              <h3 className="text-xl font-medium">11.3 Effect of Termination</h3>
              <p className="text-muted-foreground leading-relaxed">
                Upon termination, you may request an export of your data within 30 days. After this period, 
                we may delete your data in accordance with our data retention policies.
              </p>
            </section>

            {/* 12. Governing Law */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold border-b pb-2">12. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of England and 
                Wales. Any disputes arising from these Terms or your use of the Service shall be subject 
                to the exclusive jurisdiction of the courts of England and Wales.
              </p>
            </section>

            {/* 13. Changes to Terms */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold border-b pb-2">13. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify you of any material 
                changes by posting the updated Terms on our website and updating the "Last updated" date. 
                Your continued use of the Service after such changes constitutes your acceptance of the 
                new Terms.
              </p>
            </section>

            {/* 14. Contact Information */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold border-b pb-2">14. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-muted/50 rounded-lg p-6 space-y-2">
                <p className="font-medium">FTrack Ltd</p>
                <p className="text-muted-foreground">Email: legal@ftrack.uk</p>
                <p className="text-muted-foreground">Support: support@ftrack.uk</p>
              </div>
            </section>

          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
