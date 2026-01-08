import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

interface ReportCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onGenerate: () => void;
  isLoading?: boolean;
}

export function ReportCard({ title, description, icon: Icon, onGenerate, isLoading }: ReportCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="mt-auto pt-0">
        <Button 
          className="w-full" 
          onClick={onGenerate}
          disabled={isLoading}
        >
          <Download className="mr-2 h-4 w-4" />
          {isLoading ? "Generating..." : "Generate Report"}
        </Button>
      </CardContent>
    </Card>
  );
}
