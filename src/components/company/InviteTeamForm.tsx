import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Badge } from "@/components/ui/badge";
import { Mail, UserPlus, X } from "lucide-react";

const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  role: z.enum(["manager", "engineer"]),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

export interface TeamInvite {
  email: string;
  role: "manager" | "engineer";
}

interface InviteTeamFormProps {
  invites: TeamInvite[];
  onAddInvite: (invite: TeamInvite) => void;
  onRemoveInvite: (email: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  isSubmitting?: boolean;
}

export function InviteTeamForm({
  invites,
  onAddInvite,
  onRemoveInvite,
  onSubmit,
  onSkip,
  isSubmitting = false,
}: InviteTeamFormProps) {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "engineer",
    },
  });

  const handleAddInvite = (values: InviteFormValues) => {
    setError(null);
    
    if (invites.some((inv) => inv.email.toLowerCase() === values.email.toLowerCase())) {
      setError("This email has already been added");
      return;
    }

    onAddInvite({ email: values.email, role: values.role });
    form.reset();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "manager":
        return "secondary";
      case "engineer":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleAddInvite)} className="space-y-4">
          <div className="flex gap-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="flex-1">
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
              name="role"
              render={({ field }) => (
                <FormItem className="w-40">
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="engineer">Engineer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" variant="outline" className="w-full">
            <UserPlus className="h-4 w-4 mr-2" />
            Add to Invite List
          </Button>
        </form>
      </Form>

      {invites.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Pending Invites ({invites.length})
          </h4>
          <div className="space-y-2">
            {invites.map((invite) => (
              <div
                key={invite.email}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{invite.email}</span>
                  <Badge variant={getRoleBadgeVariant(invite.role)}>
                    {invite.role}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onRemoveInvite(invite.email)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onSkip} className="flex-1" disabled={isSubmitting}>
          Skip for Now
        </Button>
        <Button onClick={onSubmit} className="flex-1" disabled={isSubmitting}>
          {isSubmitting
            ? "Sending Invites..."
            : invites.length > 0
            ? `Send ${invites.length} Invite${invites.length > 1 ? "s" : ""}`
            : "Finish Setup"}
        </Button>
      </div>
    </div>
  );
}
