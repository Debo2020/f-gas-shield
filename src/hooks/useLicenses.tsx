import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface License {
  id: string;
  company_id: string;
  user_id: string | null;
  email: string | null;
  status: "active" | "disabled" | "pending";
  license_type: "owner" | "manager" | "engineer";
  assigned_at: string | null;
  assigned_by: string | null;
  disabled_at: string | null;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

interface LicenseStats {
  total: number;
  active: number;
  disabled: number;
  pending: number;
  available: number;
}

interface UseLicensesReturn {
  licenses: License[];
  stats: LicenseStats;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  assignLicense: (email: string, licenseType: "manager" | "engineer") => Promise<boolean>;
  toggleLicense: (licenseId: string, enable: boolean) => Promise<boolean>;
  revokeLicense: (licenseId: string) => Promise<boolean>;
  updateLicenseCount: (newCount: number) => Promise<boolean>;
  resendInvitation: (license: License) => Promise<boolean>;
}

export function useLicenses(): UseLicensesReturn {
  const { profile } = useAuth();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [stats, setStats] = useState<LicenseStats>({
    total: 0,
    active: 0,
    disabled: 0,
    pending: 0,
    available: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLicenses = useCallback(async () => {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch licenses
      const { data: licensesData, error: licensesError } = await supabase
        .from("user_licenses")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      if (licensesError) throw licensesError;

      // Fetch profiles for users with licenses
      const userIds = licensesData?.filter(l => l.user_id).map(l => l.user_id) || [];
      let profilesMap: Record<string, { full_name: string; email: string }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);
        
        profilesData?.forEach(p => {
          profilesMap[p.user_id] = { full_name: p.full_name, email: p.email };
        });
      }

      const licensesWithProfiles = licensesData?.map(l => ({
        ...l,
        profile: l.user_id ? profilesMap[l.user_id] : undefined,
      })) || [];

      // Fetch subscription for total license count
      const { data: subscriptionData } = await supabase
        .from("company_subscriptions")
        .select("license_count")
        .eq("company_id", profile.company_id)
        .single();

      const totalLicenses = subscriptionData?.license_count || 0;
      const activeLicenses = licensesWithProfiles.filter(l => l.status === "active").length;
      const disabledLicenses = licensesWithProfiles.filter(l => l.status === "disabled").length;
      const pendingLicenses = licensesWithProfiles.filter(l => l.status === "pending").length;

      setLicenses(licensesWithProfiles as License[]);
      setStats({
        total: totalLicenses,
        active: activeLicenses,
        disabled: disabledLicenses,
        pending: pendingLicenses,
        available: Math.max(0, totalLicenses - activeLicenses - pendingLicenses),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch licenses");
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  const assignLicense = async (email: string, licenseType: "manager" | "engineer"): Promise<boolean> => {
    if (!profile?.company_id) return false;

    try {
      // Check if license is available
      if (stats.available <= 0) {
        toast.error("No licenses available. Please add more licenses first.");
        return false;
      }

      // Insert the license record
      const { data: insertedLicense, error } = await supabase
        .from("user_licenses")
        .insert({
          company_id: profile.company_id,
          email: email.toLowerCase(),
          license_type: licenseType,
          status: "pending",
          assigned_by: profile.user_id,
        })
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("A license has already been assigned to this email");
        } else {
          throw error;
        }
        return false;
      }

      if (!insertedLicense) {
        throw new Error("Failed to create license record");
      }

      // Send invitation email with magic link
      try {
        const { error: emailError } = await supabase.functions.invoke("send-license-invitation", {
          body: {
            licenseId: insertedLicense.id,
          },
        });

        if (emailError) {
          console.error("Failed to send invitation email:", emailError);
          toast.warning(`License assigned to ${email}, but invitation email could not be sent`);
        } else {
          toast.success(`License assigned and invitation sent to ${email}`);
        }
      } catch (emailErr) {
        console.error("Failed to send invitation email:", emailErr);
        toast.warning(`License assigned to ${email}, but invitation email could not be sent`);
      }

      await fetchLicenses();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign license");
      return false;
    }
  };

  const toggleLicense = async (licenseId: string, enable: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("user_licenses")
        .update({
          status: enable ? "active" : "disabled",
          disabled_at: enable ? null : new Date().toISOString(),
        })
        .eq("id", licenseId);

      if (error) throw error;

      toast.success(`License ${enable ? "enabled" : "disabled"}`);
      await fetchLicenses();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update license");
      return false;
    }
  };

  const revokeLicense = async (licenseId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("user_licenses")
        .delete()
        .eq("id", licenseId);

      if (error) throw error;

      toast.success("License revoked");
      await fetchLicenses();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke license");
      return false;
    }
  };

  const updateLicenseCount = async (newCount: number): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("update-license-count", {
        body: { newLicenseCount: newCount },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      toast.success(`License count updated to ${newCount}`);
      await fetchLicenses();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update license count");
      return false;
    }
  };

  const resendInvitation = async (license: License): Promise<boolean> => {
    if (!profile?.company_id || !license.email) return false;

    try {
      // Send invitation email with magic link using license ID
      const { error: emailError } = await supabase.functions.invoke("send-license-invitation", {
        body: {
          licenseId: license.id,
        },
      });

      if (emailError) {
        throw new Error(emailError.message);
      }

      toast.success(`Invitation resent to ${license.email}`);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend invitation");
      return false;
    }
  };

  return {
    licenses,
    stats,
    loading,
    error,
    refetch: fetchLicenses,
    assignLicense,
    toggleLicense,
    revokeLicense,
    updateLicenseCount,
    resendInvitation,
  };
}
