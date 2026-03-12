import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, UserPlus, User, Phone, Send, UserX } from "lucide-react";

const inviteSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  role: z.enum(["manager", "stores_manager", "engineer"]),
  activationOption: z.enum(["send_invite", "keep_inactive"]),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

export type InviteMemberData = {
  fullName: string;
  email: string;
  phone?: string;
  role: "admin" | "manager" | "stores_manager" | "engineer";
  sendInvite: boolean;
};

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (data: InviteMemberData) => Promise<void>;
  existingEmails: string[];
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  onInvite,
  existingEmails,
}: InviteMemberDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      role: "engineer",
      activationOption: "send_invite",
    },
  });

  const activationOption = form.watch("activationOption");

  const handleSubmit = async (values: InviteFormValues) => {
    if (existingEmails.includes(values.email.toLowerCase())) {
      form.setError("email", {
        message: "This person has already been invited or is a team member",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onInvite({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone || undefined,
        role: values.role,
        sendInvite: values.activationOption === "send_invite",
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add Team Member
          </DialogTitle>
          <DialogDescription>
            Add a new member to your team. Choose whether to send them a login link now or later.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto pr-4">
          <Form {...form}>
            <form id="add-member-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Full Name
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Email Address
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="colleague@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Mobile Number (optional)
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="+44 7700 900000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a position" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex flex-col">
                            <span>Admin</span>
                            <span className="text-xs text-muted-foreground">
                              Full access to manage company settings and team
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="manager">
                          <div className="flex flex-col">
                            <span>Manager</span>
                            <span className="text-xs text-muted-foreground">
                              Can manage sites, equipment, and inspections
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="stores_manager">
                          <div className="flex flex-col">
                            <span>Stores Manager</span>
                            <span className="text-xs text-muted-foreground">
                              Can receive stock and issue to engineers
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="engineer">
                          <div className="flex flex-col">
                            <span>Engineer</span>
                            <span className="text-xs text-muted-foreground">
                              Can perform inspections and log activities
                            </span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="activationOption"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Account Activation</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1.5"
                      >
                        <div className="flex items-start space-x-2 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer">
                          <RadioGroupItem value="send_invite" id="send_invite" className="mt-0.5" />
                          <div className="flex-1">
                            <Label htmlFor="send_invite" className="font-medium cursor-pointer flex items-center gap-2 text-sm">
                              <Send className="h-3.5 w-3.5 text-primary" />
                              Send secure login link
                            </Label>
                            <span className="text-xs text-muted-foreground block mt-0.5">
                              They'll receive an email to set their password
                            </span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer">
                          <RadioGroupItem value="keep_inactive" id="keep_inactive" className="mt-0.5" />
                          <div className="flex-1">
                            <Label htmlFor="keep_inactive" className="font-medium cursor-pointer flex items-center gap-2 text-sm">
                              <UserX className="h-3.5 w-3.5 text-muted-foreground" />
                              Keep inactive
                            </Label>
                            <span className="text-xs text-muted-foreground block mt-0.5">
                              Add to roster without sending an invitation
                            </span>
                          </div>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 flex-shrink-0 border-t mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="add-member-form" disabled={isSubmitting}>
            {isSubmitting 
              ? "Adding..." 
              : activationOption === "send_invite" 
                ? "Add & Send Invitation" 
                : "Add Team Member"
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
