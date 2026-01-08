import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Loader2, TrendingUp } from "lucide-react";

interface MonthData {
  month: string;
  pass: number;
  fail: number;
  observations: number;
}

const chartConfig = {
  pass: {
    label: "Pass",
    color: "hsl(var(--success))",
  },
  observations: {
    label: "Observations",
    color: "hsl(var(--warning))",
  },
  fail: {
    label: "Fail",
    color: "hsl(var(--destructive))",
  },
};

export function InspectionTrendsChart() {
  const { profile } = useAuth();

  const { data: chartData, isLoading } = useQuery({
    queryKey: ["inspection-trends", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      // Get last 6 months of inspections
      const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
      
      const { data: inspections } = await supabase
        .from("inspections")
        .select("inspection_date, result")
        .eq("company_id", profile.company_id)
        .gte("inspection_date", sixMonthsAgo.toISOString().split("T")[0])
        .order("inspection_date", { ascending: true });

      if (!inspections) return [];

      // Group by month
      const monthlyData: Record<string, MonthData> = {};
      
      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthKey = format(monthDate, "yyyy-MM");
        monthlyData[monthKey] = {
          month: format(monthDate, "MMM"),
          pass: 0,
          fail: 0,
          observations: 0,
        };
      }

      // Count inspections by result
      inspections.forEach((inspection) => {
        const monthKey = inspection.inspection_date.substring(0, 7);
        if (monthlyData[monthKey]) {
          if (inspection.result === "pass") {
            monthlyData[monthKey].pass++;
          } else if (inspection.result === "fail") {
            monthlyData[monthKey].fail++;
          } else if (inspection.result === "pass_with_observations") {
            monthlyData[monthKey].observations++;
          }
        }
      });

      return Object.values(monthlyData);
    },
    enabled: !!profile?.company_id,
  });

  const hasData = chartData && chartData.some(d => d.pass > 0 || d.fail > 0 || d.observations > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Inspection Trends
        </CardTitle>
        <CardDescription>
          Monthly inspection results over the last 6 months
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No inspection data yet. Complete your first inspection to see trends.
            </p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                tickLine={false} 
                axisLine={false}
                className="text-xs"
              />
              <YAxis 
                tickLine={false} 
                axisLine={false}
                allowDecimals={false}
                className="text-xs"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="pass" stackId="a" fill="var(--color-pass)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="observations" stackId="a" fill="var(--color-observations)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="fail" stackId="a" fill="var(--color-fail)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
        {hasData && (
          <div className="flex items-center justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-success" />
              <span>Pass</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-warning" />
              <span>Observations</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-destructive" />
              <span>Fail</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
