import { Shield, Lock, Award, Server } from "lucide-react";

const trustItems = [
  {
    icon: Shield,
    title: "UK F-Gas Compliant",
    description: "Built to meet UK F-Gas Regulation requirements",
  },
  {
    icon: Lock,
    title: "GDPR Compliant",
    description: "Your data is protected and secure",
  },
  {
    icon: Award,
    title: "Industry Trusted",
    description: "Used by HVAC professionals across the UK",
  },
  {
    icon: Server,
    title: "99.9% Uptime",
    description: "Reliable cloud infrastructure",
  },
];

export function TrustSection() {
  return (
    <section className="py-16 border-y bg-background">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
