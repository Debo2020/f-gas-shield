import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";

interface ReportCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onGeneratePDF: () => void;
  onGenerateCSV: () => void;
  isLoading?: boolean;
  loadingType?: "pdf" | "csv" | null;
}

export function ReportCard({ 
  title, 
  description, 
  icon: Icon, 
  onGeneratePDF, 
  onGenerateCSV,
  isLoading,
  loadingType 
}: ReportCardProps) {
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
        <div className="flex gap-2">
          <Button 
            className="flex-1" 
            onClick={onGeneratePDF}
            disabled={isLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            {isLoading && loadingType === "pdf" ? "Generating..." : "PDF"}
          </Button>
          <Button 
            variant="outline"
            className="flex-1" 
            onClick={onGenerateCSV}
            disabled={isLoading}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isLoading && loadingType === "csv" ? "Generating..." : "CSV"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
