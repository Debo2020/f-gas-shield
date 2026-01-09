import { Card, CardContent } from "@/components/ui/card";
import { Droplets, ArrowUp, ArrowDown, Activity } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";

interface GasLogSummaryProps {
  totalAdded: number;
  totalRecovered: number;
  netEmissions: number;
  co2eImpact: number;
}

export function GasLogSummary({ totalAdded, totalRecovered, netEmissions, co2eImpact }: GasLogSummaryProps) {
  const stats = [
    {
      label: "Refrigerant Added",
      value: totalAdded,
      suffix: " kg",
      decimals: 2,
      icon: ArrowUp,
      iconColor: "text-destructive",
      bgColor: "bg-destructive/10",
      borderColor: "border-destructive/20",
    },
    {
      label: "Refrigerant Recovered",
      value: totalRecovered,
      suffix: " kg",
      decimals: 2,
      icon: ArrowDown,
      iconColor: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-success/20",
    },
    {
      label: "Net Emissions",
      value: netEmissions,
      suffix: " kg",
      decimals: 2,
      icon: Droplets,
      iconColor: netEmissions > 0 ? "text-destructive" : "text-success",
      bgColor: netEmissions > 0 ? "bg-destructive/10" : "bg-success/10",
      borderColor: netEmissions > 0 ? "border-destructive/20" : "border-success/20",
    },
    {
      label: "CO₂e Impact",
      value: co2eImpact,
      suffix: " t",
      decimals: 2,
      icon: Activity,
      iconColor: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/20",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card 
          key={stat.label} 
          className={`card-interactive card-gradient border ${stat.borderColor}`}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">
                  <AnimatedCounter 
                    value={stat.value} 
                    decimals={stat.decimals} 
                    suffix={stat.suffix}
                  />
                </p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor} transition-transform duration-300 hover:scale-110`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
