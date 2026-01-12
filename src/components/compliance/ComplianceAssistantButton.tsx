import { useState } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComplianceAssistantSheet } from "./ComplianceAssistantSheet";
import { cn } from "@/lib/utils";

interface ComplianceAssistantButtonProps {
  className?: string;
}

export function ComplianceAssistantButton({ className }: ComplianceAssistantButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 left-6 h-14 gap-2 rounded-full shadow-lg hover:shadow-xl transition-all z-50 animate-scale-in",
          className
        )}
      >
        <Bot className="h-5 w-5" />
        <span className="hidden sm:inline">Ask F-Gas AI</span>
      </Button>

      <ComplianceAssistantSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
