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
import { Mail, UserPlus, User, Phone } from "lucide-react";

const inviteSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  role: z.enum(["admin", "manager", "stores_manager", "engineer", "read_only"]),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

export type InviteMemberData = {
  fullName: string;
  email: string;
  phone?: string;
  role: "admin" | "manager" | "stores_manager" | "engineer" | "read_only";
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
    },
  });

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add Team Member
          </DialogTitle>
          <DialogDescription>
            Add a new member to your team. They'll receive an email invitation to join.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                      <SelectItem value="read_only">
                        <div className="flex flex-col">
                          <span>Client</span>
                          <span className="text-xs text-muted-foreground">
                            View-only access to reports and compliance data
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
