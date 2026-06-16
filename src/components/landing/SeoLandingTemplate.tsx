import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { FooterSection } from "@/components/landing/FooterSection";

export interface SeoBenefit {
  title: string;
  description: string;
}

export interface SeoFaq {
  question: string;
  answer: string;
}

export interface RelatedLink {
  to: string;
  label: string;
}

interface SeoLandingTemplateProps {
  title: string;
  metaDescription: string;
  canonicalPath: string; // e.g. "/f-gas-software"
  ogType?: "website" | "article";
  h1: string;
  subhead: string;
  primaryCtaLabel?: string;
  primaryCtaPath?: string;
  benefitsHeading?: string;
  benefits: SeoBenefit[];
  faqs: SeoFaq[];
  relatedLinks?: RelatedLink[];
  jsonLd: Record<string, unknown> | Record<string, unknown>[];
  body?: ReactNode; // optional long-form content (used by the guide page)
}

const BASE_URL = "https://www.ftrack.uk";

export function SeoLandingTemplate({
  title,
  metaDescription,
  canonicalPath,
  ogType = "website",
  h1,
  subhead,
  primaryCtaLabel = "Start free trial",
  primaryCtaPath = "/get-started",
  benefitsHeading = "Why FTrack",
  benefits,
  faqs,
  relatedLinks = [],
  jsonLd,
  body,
}: SeoLandingTemplateProps) {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  // Redirect authenticated users away from marketing pages
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const canonical = `${BASE_URL}${canonicalPath}`;
  const ldArray = Array.isArray(jsonLd) ? jsonLd : [jsonLd];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content={ogType} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={metaDescription} />
        {ldArray.map((ld, i) => (
          <script key={i} type="application/ld+json">
            {JSON.stringify(ld)}
          </script>
        ))}
      </Helmet>

      <LandingHeader />

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 py-16 md:py-24 max-w-5xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
            {h1}
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {subhead}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button size="lg" onClick={() => navigate(primaryCtaPath)}>
              {primaryCtaLabel}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/pricing")}
            >
              See pricing
            </Button>
          </div>
        </section>

        {/* Benefits */}
        <section className="container mx-auto px-4 py-12 md:py-16 max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
            {benefitsHeading}
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <Card key={b.title} className="border-border">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {b.title}
                    </h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {b.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Optional long-form body */}
        {body && (
          <section className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
            <div className="prose prose-gray dark:prose-invert max-w-none">
              {body}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Related links */}
        {relatedLinks.length > 0 && (
          <section className="container mx-auto px-4 py-8 max-w-4xl">
            <h2 className="text-xl font-semibold text-center mb-4 text-foreground">
              Related
            </h2>
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
              {relatedLinks.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-primary hover:underline"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Footer CTA */}
        <section className="container mx-auto px-4 py-16 md:py-20 max-w-4xl text-center">
          <div className="rounded-2xl border border-border bg-muted/40 p-10 md:p-14">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Ready to simplify F-Gas compliance?
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Join UK HVAC engineers and contractors using FTrack to log refrigerant
              movements, schedule inspections, and stay audit-ready.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button size="lg" onClick={() => navigate(primaryCtaPath)}>
                {primaryCtaLabel}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/pricing")}
              >
                See pricing
              </Button>
            </div>
          </div>
        </section>
      </main>

      <FooterSection />
    </div>
  );
}
