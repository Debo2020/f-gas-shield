import {
  QrCode,
  ClipboardCheck,
  FileText,
  Users,
  Calendar,
  BarChart3,
  Bot,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
   {
     icon: QrCode,
     title: "F-Gas System Tracking",
     description: "QR code labels for instant system identification. Track refrigerant charges, service history, and compliance status.",
  },
  {
    icon: ClipboardCheck,
    title: "Inspection Logging",
    description: "Digital F-Gas inspection records with automatic scheduling. Never miss a mandatory inspection again.",
  },
  {
    icon: FileText,
    title: "Compliance Reports",
    description: "Generate audit-ready F-Gas logbooks and compliance certificates. One-click exports for regulators.",
  },
  {
    icon: Users,
    title: "Team Management",
    description: "Assign engineers to sites, track certifications, and manage F-Gas certificate expiry dates.",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Automated inspection reminders based on CO₂e thresholds. Stay ahead of regulatory deadlines.",
  },
  {
    icon: BarChart3,
    title: "Carbon Reporting",
    description: "Track refrigerant usage and CO₂ equivalent emissions. Ready for sustainability reporting requirements.",
  },
  {
    icon: Building2,
    title: "Client Portal Access",
    description: "Give your customers their own secure login to view live F-Gas systems, inspection status, and refrigerant usage across their sites — keeping them compliant without the back-and-forth.",
  },
  {
    icon: Bot,
    title: "AI Compliance Assistant",
    description: "Get instant answers to F-Gas regulation questions. Knows leak check frequencies, CO₂e thresholds, and GWP values.",
    highlight: true,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Everything You Need for F-Gas Compliance
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built specifically for UK HVAC and refrigeration businesses. 
            Manage your entire compliance workflow in one platform.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            const isHighlight = 'highlight' in feature && feature.highlight;
            return (
              <Card 
                key={feature.title} 
                className={`card-interactive border-border/50 ${isHighlight ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}
              >
                <CardHeader>
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center mb-4 ${isHighlight ? 'bg-primary/20' : 'bg-primary/10'}`}>
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {feature.title}
                    {isHighlight && (
                      <span className="text-xs font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full">New</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
