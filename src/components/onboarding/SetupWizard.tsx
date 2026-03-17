import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, MapPin, Thermometer, ClipboardCheck, FileText, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SetupWizardProps {
  score: number;
  isActivated: boolean;
  progress: {
    step_create_site: boolean;
    step_add_equipment: boolean;
    step_first_inspection: boolean;
    step_first_certificate: boolean;
  };
}

const steps = [
  {
    key: "step_create_site" as const,
    label: "Create your first Site",
    description: "Register a customer location",
    href: "/organisation?tab=clients&action=new",
    icon: MapPin,
  },
   {
     key: "step_add_equipment" as const,
     label: "Add F-Gas System",
     description: "Register an F-Gas system to track",
    href: "/equipment?action=new",
    icon: Thermometer,
  },
  {
    key: "step_first_inspection" as const,
    label: "Run your first Inspection",
    description: "Record an equipment inspection",
    href: "/inspections?action=new",
    icon: ClipboardCheck,
  },
  {
    key: "step_first_certificate" as const,
    label: "Generate your first Certificate",
    description: "Create a gas safety certificate",
    href: "/gas-certificates",
    icon: FileText,
  },
];

export function SetupWizard({ score, isActivated, progress }: SetupWizardProps) {
  const navigate = useNavigate();
  const completedCount = steps.filter(s => progress[s.key]).length;
  const progressPercent = Math.min(100, Math.round((score / 100) * 100));

  if (isActivated) return null;

  return (
    <Card className="card-interactive animate-slide-up border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Rocket className="h-5 w-5 text-primary" />
          Setup Progress
        </CardTitle>
        <div className="flex items-center gap-3 mt-2">
          <Progress value={progressPercent} className="h-2 flex-1" />
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {score}/100
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {steps.map((step) => {
          const isComplete = progress[step.key];
          const Icon = step.icon;

          return (
            <div
              key={step.key}
              onClick={() => !isComplete && navigate(step.href)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                isComplete
                  ? "bg-muted/50 border-muted"
                  : "cursor-pointer hover:bg-muted/50 hover:border-primary/20"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0",
                isComplete
                  ? "bg-green-500/10 text-green-500"
                  : "bg-primary/10 text-primary"
              )}>
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium text-sm",
                  isComplete && "line-through text-muted-foreground"
                )}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {isComplete ? "Completed" : step.description}
                </p>
              </div>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground text-center pt-2">
          {completedCount}/{steps.length} steps complete · Score updates automatically
        </p>
      </CardContent>
    </Card>
  );
}
