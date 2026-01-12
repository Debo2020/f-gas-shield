import { useState, useRef, useEffect } from "react";
import { Bot, Send, Trash2, Loader2, AlertCircle, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "./ChatMessage";
import { useComplianceChat } from "@/hooks/useComplianceChat";

interface ComplianceAssistantSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_PROMPTS = [
  "What leak check frequency for 100kg R-410A?",
  "How to calculate CO2e?",
  "What records must I keep?",
  "F-Gas certification requirements?",
];

export function ComplianceAssistantSheet({
  open,
  onOpenChange,
}: ComplianceAssistantSheetProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { messages, isLoading, error, sendMessage, clearMessages } = useComplianceChat();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when sheet opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput("");
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    if (!isLoading) {
      sendMessage(prompt);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-left">F-Gas Compliance Assistant</SheetTitle>
                <SheetDescription className="text-left">
                  Ask questions about UK F-Gas regulations
                </SheetDescription>
              </div>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearMessages}
                className="h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-float">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">How can I help you today?</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ask me anything about F-Gas regulations, leak checks, or compliance requirements.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <Badge
                      key={prompt}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 transition-colors py-2 px-3"
                      onClick={() => handleQuickPrompt(prompt)}
                    >
                      {prompt}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                />
              ))
            )}

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex items-center gap-2 text-muted-foreground p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-destructive p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about F-Gas regulations..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim() || isLoading} size="icon">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            AI-powered guidance. Always verify with official regulations.
          </p>
        </form>
      </SheetContent>
    </Sheet>
  );
}
