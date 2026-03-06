import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface EnrichedTeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  roles: string[];
  licenseStatus: "active" | "disabled" | "pending" | null;
  licenseId?: string;
  licenseType?: string;
  hasGasAddon: boolean;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
}

export function useTeamMembers() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<EnrichedTeamMember[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!profile?.company_id) return;

    try {
      const [profilesRes, rolesRes, licensesRes, addonRes, invitationsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, user_id, full_name, email, avatar_url")
          .eq("company_id", profile.company_id),
        supabase
          .from("user_roles")
          .select("user_id, role"),
        supabase
          .from("user_licenses")
          .select("id, user_id, status, license_type")
          .eq("company_id", profile.company_id),
        supabase
          .from("addon_licenses")
          .select("user_id")
          .eq("company_id", profile.company_id)
          .eq("addon_type", "natural_gas")
          .eq("status", "active"),
        supabase
          .from("team_invitations")
          .select("id, email, role, expires_at, created_at")
          .eq("company_id", profile.company_id)
          .is("accepted_at", null)
          .order("created_at", { ascending: false }),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (licensesRes.error) throw licensesRes.error;

      const memberIds = profilesRes.data?.map((p) => p.user_id) || [];
      const gasAddonSet = new Set(addonRes.data?.map((a) => a.user_id).filter(Boolean) || []);
      const licenseMap = new Map(
        licensesRes.data?.filter((l) => l.user_id).map((l) => [l.user_id!, l]) || []
      );

      const enriched: EnrichedTeamMember[] = (profilesRes.data || []).map((p) => {
        const license = licenseMap.get(p.user_id);
        return {
          ...p,
          roles: rolesRes.data?.filter((r) => r.user_id === p.user_id && memberIds.includes(r.user_id)).map((r) => r.role) || [],
          licenseStatus: (license?.status as "active" | "disabled" | "pending") || null,
          licenseId: license?.id,
          licenseType: license?.license_type,
          hasGasAddon: gasAddonSet.has(p.user_id),
        };
      });

      setMembers(enriched);
      setInvitations(invitationsRes.data || []);
    } catch (error: any) {
      console.error("Error fetching team data:", error);
      toast.error("Failed to load team data");
    } finally {
      setIsLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { members, invitations, isLoading, refetch };
}
