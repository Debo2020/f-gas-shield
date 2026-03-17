import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Paperclip, LifeBuoy } from "lucide-react";

interface ServiceTicketDialogProps {
  children?: React.ReactNode;
}

const ISSUE_TYPES = ["Bug", "Feature Request", "Access Issue", "Data Issue", "Performance", "Other"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const MODULES = [
  "Dashboard", "Sites", "F-Gas Systems", "Inspections",
  "Gas Log", "Gas Certificates", "Organisation", "Reports", "Documents", "Other",
];

export function ServiceTicketDialog({ children }: ServiceTicketDialogProps) {
  const { profile, roles, user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ticketRef, setTicketRef] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [issueType, setIssueType] = useState("");
  const [priority, setPriority] = useState("");
  const [affectedModule, setAffectedModule] = useState("");
  const [description, setDescription] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [isRecurring, setIsRecurring] = useState("no");
  const [files, setFiles] = useState<File[]>([]);

  // Company name from profile
  const [companyName, setCompanyName] = useState<string>("");

  // Fetch company name when dialog opens
  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && profile?.company_id) {
      const { data } = await supabase
        .from("companies")
        .select("name")
        .eq("id", profile.company_id)
        .single();
      if (data) setCompanyName(data.name);

      // Reset form
      setTicketRef(null);
      setIssueType("");
      setPriority("");
      setAffectedModule("");
      setDescription("");
      setStepsToReproduce("");
      setIsRecurring("no");
      setFiles([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    // Max 5MB per file, max 3 files
    const valid = selected.filter(f => f.size <= 5 * 1024 * 1024);
    if (valid.length < selected.length) {
      toast.error("Some files exceeded the 5MB limit and were removed");
    }
    setFiles(prev => [...prev, ...valid].slice(0, 3));
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!issueType || !priority || !description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      // Upload attachments first
      const attachmentUrls: { file_url: string; file_name: string; mime_type?: string; file_size?: number }[] = [];
      for (const file of files) {
        const path = `${profile?.company_id}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("support-attachments")
          .upload(path, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("support-attachments")
          .getPublicUrl(uploadData.path);

        attachmentUrls.push({
          file_url: urlData.publicUrl,
          file_name: file.name,
          mime_type: file.type,
          file_size: file.size,
        });
      }

      const payload = {
        issue_type: issueType,
        priority,
        affected_module: affectedModule || undefined,
        description: description.trim(),
        steps_to_reproduce: stepsToReproduce.trim() || undefined,
        is_recurring: isRecurring === "yes",
        page_url: window.location.href,
        browser_info: navigator.userAgent,
        app_version: "1.0.0",
        attachment_urls: attachmentUrls.length > 0 ? attachmentUrls : undefined,
      };

      const { data, error } = await supabase.functions.invoke("submit-support-ticket", {
        body: payload,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setTicketRef(data.ticket_ref);
      toast.success(`Ticket ${data.ticket_ref} submitted successfully`);
    } catch (err: any) {
      console.error("Ticket submission error:", err);
      toast.error(err.message || "Failed to submit ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="gap-2">
            <LifeBuoy className="h-4 w-4" />
            Support
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Raise Support Ticket</SheetTitle>
          <SheetDescription>
            Submit an issue and our team will get back to you
          </SheetDescription>
        </SheetHeader>

        {!user ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <LifeBuoy className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">Please log in to raise a support ticket.</p>
            <Button onClick={() => setOpen(false)} variant="outline">Close</Button>
          </div>
        ) : ticketRef ? (
          // Success state
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <CheckCircle2 className="h-16 w-16 text-primary" />
            <h3 className="text-xl font-semibold">Ticket Submitted</h3>
            <p className="text-muted-foreground text-center">
              Your ticket reference is
            </p>
            <code className="text-2xl font-bold text-primary bg-primary/10 px-4 py-2 rounded-lg">
              {ticketRef}
            </code>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              You'll receive a response from our support team shortly.
            </p>
            <Button onClick={() => setOpen(false)} className="mt-4">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-6 pt-6">
            {/* Locked identity fields */}
            <div className="space-y-4 rounded-lg border p-4 bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Details</p>
              <div className="grid gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input value={profile?.full_name || ""} disabled className="bg-muted" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input value={profile?.email || ""} disabled className="bg-muted" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Organisation</Label>
                  <Input value={companyName} disabled className="bg-muted" />
                </div>
              </div>
            </div>

            {/* User input fields */}
            <div className="space-y-4">
              <div>
                <Label>Issue Type <span className="text-destructive">*</span></Label>
                <Select value={issueType} onValueChange={setIssueType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priority <span className="text-destructive">*</span></Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Affected Module</Label>
                <Select value={affectedModule} onValueChange={setAffectedModule}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULES.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Description <span className="text-destructive">*</span></Label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  rows={4}
                  maxLength={5000}
                />
                <p className="text-xs text-muted-foreground mt-1">{description.length}/5000</p>
              </div>

              <div>
                <Label>Steps to Reproduce</Label>
                <Textarea
                  value={stepsToReproduce}
                  onChange={e => setStepsToReproduce(e.target.value)}
                  placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                  rows={3}
                  maxLength={3000}
                />
              </div>

              <div>
                <Label>Is this issue recurring?</Label>
                <RadioGroup value={isRecurring} onValueChange={setIsRecurring} className="flex gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="recurring-yes" />
                    <Label htmlFor="recurring-yes" className="font-normal">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="recurring-no" />
                    <Label htmlFor="recurring-no" className="font-normal">No</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Attachments</Label>
                <p className="text-xs text-muted-foreground mb-2">Max 3 files, 5MB each (images, PDFs)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={files.length >= 3}
                  className="gap-2"
                >
                  <Paperclip className="h-4 w-4" />
                  Add File
                </Button>
                {files.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {files.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="truncate flex-1">{f.name}</span>
                        <span className="text-muted-foreground text-xs">{(f.size / 1024).toFixed(0)}KB</span>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => removeFile(i)}>
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || !issueType || !priority || !description.trim()}
              className="w-full"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Ticket
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
