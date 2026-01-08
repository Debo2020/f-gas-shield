import { Card, CardContent } from "@/components/ui/card";
import { Droplets, ArrowUp, ArrowDown, Activity } from "lucide-react";

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
      value: `${totalAdded.toFixed(2)} kg`,
      icon: ArrowUp,
      iconColor: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      label: "Refrigerant Recovered",
      value: `${totalRecovered.toFixed(2)} kg`,
      icon: ArrowDown,
      iconColor: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      label: "Net Emissions",
      value: `${netEmissions.toFixed(2)} kg`,
      icon: Droplets,
      iconColor: netEmissions > 0 ? "text-destructive" : "text-green-600",
      bgColor: netEmissions > 0 ? "bg-destructive/10" : "bg-green-100",
    },
    {
      label: "CO₂e Impact",
      value: `${co2eImpact.toFixed(2)} t`,
      icon: Activity,
      iconColor: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
