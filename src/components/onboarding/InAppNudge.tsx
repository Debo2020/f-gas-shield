import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Thermometer, ClipboardCheck, Users, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface InAppNudgeProps {
  progress: {
    step_create_site: boolean;
    step_add_equipment: boolean;
    step_first_inspection: boolean;
    step_first_certificate: boolean;
  };
  isActivated: boolean;
}

interface NudgeConfig {
  id: string;
  condition: (p: InAppNudgeProps["progress"]) => boolean;
  icon: typeof Thermometer;
  title: string;
  description: string;
  action: string;
  href: string;
}

const nudges: NudgeConfig[] = [
  {
    id: "add_equipment",
    condition: (p) => p.step_create_site && !p.step_add_equipment,
    icon: Thermometer,
    title: "Add your first equipment",
    description: "Start recording inspections by registering F-Gas equipment to your site.",
    action: "Add Equipment",
    href: "/equipment?action=new",
  },
  {
    id: "first_inspection",
    condition: (p) => p.step_add_equipment && !p.step_first_inspection,
    icon: ClipboardCheck,
    title: "Run your first inspection",
    description: "Record an inspection in under 60 seconds to stay compliant.",
    action: "Record Inspection",
    href: "/inspections?action=new",
  },
  {
    id: "first_certificate",
    condition: (p) => p.step_first_inspection && !p.step_first_certificate,
    icon: FileText,
    title: "Generate a certificate",
    description: "Create your first gas safety certificate to share with customers.",
    action: "Create Certificate",
    href: "/gas-certificates",
  },
];

export function InAppNudge({ progress, isActivated }: InAppNudgeProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    const stored = localStorage.getItem("ftrack_dismissed_nudges");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  if (isActivated) return null;

  const activeNudge = nudges.find(
    (n) => n.condition(progress) && !dismissed.has(n.id)
  );

  if (!activeNudge) return null;

  const handleDismiss = () => {
    const next = new Set(dismissed);
    next.add(activeNudge.id);
    setDismissed(next);
    localStorage.setItem("ftrack_dismissed_nudges", JSON.stringify([...next]));
  };

  const Icon = activeNudge.icon;

  return (
    <Card className="border-primary/20 bg-primary/5 animate-slide-up">
      <CardContent className="py-4 flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary flex-shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{activeNudge.title}</p>
          <p className="text-xs text-muted-foreground">{activeNudge.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="sm" onClick={() => navigate(activeNudge.href)}>
            {activeNudge.action}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
