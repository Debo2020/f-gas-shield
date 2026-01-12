import { Sparkles, Building2, Rocket } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Sparkles,
    title: "Choose Your Plan",
    description: "Select the plan that fits your business. From small contractors to enterprise operations.",
  },
  {
    number: "02",
    icon: Building2,
    title: "Set Up Your Company",
    description: "Add your sites, equipment, and team members. Import existing data or start fresh.",
  },
  {
    number: "03",
    icon: Rocket,
    title: "Start Tracking",
    description: "Log inspections, manage cylinders, and generate compliance reports instantly.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Get Started in Minutes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No complex setup required. Be up and running with your F-Gas 
            compliance system in under 10 minutes.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative text-center">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-border" />
                )}
                
                <div className="relative inline-flex">
                  <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center mb-6 mx-auto">
                    <Icon className="h-12 w-12 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm">
                    {step.number}
                  </span>
                </div>
                
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
