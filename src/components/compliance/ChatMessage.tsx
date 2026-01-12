import { Bot, User, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isAssistant = role === "assistant";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple markdown-like formatting
  const formatContent = (text: string) => {
    return text
      .split("\n")
      .map((line, i) => {
        // Headers
        if (line.startsWith("### ")) {
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
              {line.slice(4)}
            </h4>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h3 key={i} className="font-semibold mt-3 mb-1">
              {line.slice(3)}
            </h3>
          );
        }
        // Bullet points
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <li key={i} className="ml-4 text-sm">
              {formatInlineStyles(line.slice(2))}
            </li>
          );
        }
        // Numbered list
        if (/^\d+\.\s/.test(line)) {
          return (
            <li key={i} className="ml-4 text-sm list-decimal">
              {formatInlineStyles(line.replace(/^\d+\.\s/, ""))}
            </li>
          );
        }
        // Empty line
        if (line.trim() === "") {
          return <br key={i} />;
        }
        // Regular paragraph
        return (
          <p key={i} className="text-sm">
            {formatInlineStyles(line)}
          </p>
        );
      });
  };

  const formatInlineStyles = (text: string) => {
    // Bold text
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={cn(
        "flex gap-3 p-3 rounded-lg",
        isAssistant ? "bg-muted/50" : "bg-primary/5 ml-8"
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isAssistant ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"
        )}
      >
        {isAssistant ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-medium">
            {isAssistant ? "F-Gas Assistant" : "You"}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {isAssistant && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-success" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {formatContent(content)}
        </div>
      </div>
    </div>
  );
}
