import { Bot, Sparkles, MessageSquare, Zap, Clock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const quickPrompts = [
  "Leak check frequency for 50 tCO₂e?",
  "R-410A GWP value?",
  "F-Gas certificate requirements",
  "Recovery obligations",
];

const benefits = [
  {
    icon: Zap,
    title: "Instant Answers",
    description: "Get immediate responses to complex F-Gas regulation questions",
  },
  {
    icon: Clock,
    title: "24/7 Available",
    description: "Access compliance guidance anytime, day or night",
  },
  {
    icon: BookOpen,
    title: "UK Regulation Expert",
    description: "Trained on current UK F-Gas legislation and best practices",
  },
];

export function AIFeatureSection() {
  const navigate = useNavigate();

  return (
    <section className="relative py-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-20 right-10 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
      
      <div className="container relative mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Text content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-2 text-sm backdrop-blur">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-primary font-medium">AI-Powered</span>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Meet Your{" "}
                <span className="gradient-text">F-Gas Compliance AI</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-lg">
                Get instant answers to complex F-Gas regulation questions. Our AI assistant 
                knows leak check frequencies, CO₂e thresholds, GWP values, and certification requirements.
              </p>
            </div>

            {/* Benefits grid */}
            <div className="grid gap-4 sm:grid-cols-3">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div key={benefit.title} className="space-y-2">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                );
              })}
            </div>

            <Button 
              size="lg" 
              onClick={() => navigate("/onboarding")}
              className="text-lg px-8"
            >
              Try AI Assistant Free
              <Bot className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Interactive chat mockup */}
          <div className="relative">
            <div className="rounded-2xl border bg-card p-6 shadow-2xl">
              {/* Chat header */}
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">F-Gas Compliance AI</h4>
                  <p className="text-xs text-muted-foreground">Always here to help</p>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-xs text-muted-foreground">Online</span>
                </div>
              </div>

              {/* Chat messages */}
              <div className="py-6 space-y-4">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-br-md bg-primary px-4 py-2 text-primary-foreground max-w-[80%]">
                    <p className="text-sm">What's the leak check frequency for equipment with 50 tonnes CO₂e?</p>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3 max-w-[85%]">
                    <p className="text-sm">
                      For equipment containing <strong>50 tonnes CO₂e</strong>, the UK F-Gas 
                      regulations require leak checks <strong>every 6 months</strong>.
                    </p>
                    <p className="text-sm mt-2">
                      This falls into the 50-500 tCO₂e category under Article 4 of Regulation 
                      (EU) 517/2014 as retained in UK law.
                    </p>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      <Sparkles className="h-3 w-3 text-primary" />
                      <span className="text-xs text-muted-foreground">Based on current UK F-Gas legislation</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick prompts */}
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-3">Try asking:</p>
                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <Badge 
                      key={prompt} 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-primary/10 transition-colors"
                    >
                      {prompt}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Input mockup */}
              <div className="mt-4 flex gap-2">
                <div className="flex-1 rounded-lg border bg-background px-4 py-2.5 text-sm text-muted-foreground">
                  Ask about F-Gas regulations...
                </div>
                <Button size="sm" className="px-4" aria-label="Send message">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Floating badges */}
            <div className="absolute -top-3 -right-3 rounded-lg border bg-card px-3 py-2 shadow-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Powered by AI</span>
              </div>
            </div>
            <div className="absolute -bottom-3 -left-3 rounded-lg border bg-card px-3 py-2 shadow-lg">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">UK Regulations</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
