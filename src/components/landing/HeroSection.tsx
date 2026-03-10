import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight, CheckCircle, Sparkles } from "lucide-react";

export function HeroSection() {
  const navigate = useNavigate();

  const highlights = [
    "UK F-Gas Regulation Compliant",
    "Real-time Inspection Tracking",
    "Automated Compliance Reports",
    "AI-Powered Regulation Guidance",
  ];

  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      
      <div className="container relative mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-2 text-sm backdrop-blur">
              <Shield className="h-4 w-4 text-accent" />
              <span className="text-muted-foreground">Trusted by UK HVAC Professionals</span>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                F-Gas Compliance{" "}
                <span className="gradient-text">Made Simple</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-lg">
                The complete platform for managing your F-Gas equipment, inspections, 
                and compliance documentation. Stay audit-ready, always.
              </p>
            </div>

            {/* Highlights */}
            <ul className="space-y-3">
              {highlights.map((highlight) => (
                <li key={highlight} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-accent flex-shrink-0" />
                  <span className="text-muted-foreground">{highlight}</span>
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                onClick={() => navigate("/get-started")}
                className="text-lg px-8"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/auth")}
                className="text-lg px-8"
              >
                Sign In
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>

          {/* Hero visual */}
          <div className="relative hidden lg:block">
            <div className="relative rounded-2xl border bg-card p-4 shadow-2xl">
              <div className="rounded-lg bg-muted/50 p-6">
                {/* Mock dashboard preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-32 rounded bg-primary/20" />
                    <div className="h-4 w-20 rounded bg-accent/30" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2 rounded-lg bg-background p-4">
                        <div className="h-8 w-8 rounded-full bg-accent/20" />
                        <div className="h-3 w-full rounded bg-muted" />
                        <div className="h-6 w-12 rounded bg-primary/30" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-full rounded bg-muted" />
                    <div className="h-3 w-4/5 rounded bg-muted" />
                    <div className="h-3 w-3/5 rounded bg-muted" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-10 flex-1 rounded bg-primary/20" />
                    <div className="h-10 w-24 rounded bg-accent/30" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 rounded-lg border bg-card p-3 shadow-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium">Inspection Complete</span>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 rounded-lg border bg-card p-3 shadow-lg">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Fully Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
