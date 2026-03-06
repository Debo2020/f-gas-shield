import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useGasAddon() {
  const { profile, user, hasRole } = useAuth();
  const companyId = profile?.company_id;
  const userId = user?.id;
  const isOwnerOrManager = hasRole("owner") || hasRole("manager");

  // Check company-level addon subscription
  const { data: companyAddon, isLoading: addonLoading } = useQuery({
    queryKey: ["gas-addon", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("company_addons")
        .select("*")
        .eq("company_id", companyId)
        .eq("addon_type", "natural_gas")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Check per-user addon license
  const { data: userLicense, isLoading: licenseLoading } = useQuery({
    queryKey: ["addon-license", companyId, userId],
    queryFn: async () => {
      if (!companyId || !userId) return null;
      const { data, error } = await supabase
        .from("addon_licenses")
        .select("*")
        .eq("company_id", companyId)
        .eq("addon_type", "natural_gas")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!userId,
  });

  const companyHasAddon = companyAddon?.status === "active";
  const userHasLicense = !!userLicense;

  return {
    // User can access gas certs if company has addon AND (user has license OR is owner/manager)
    hasGasAddon: companyHasAddon && (userHasLicense || isOwnerOrManager),
    companyHasAddon,
    userHasLicense,
    addon: companyAddon,
    userLicense,
    isLoading: addonLoading || licenseLoading,
  };
}
