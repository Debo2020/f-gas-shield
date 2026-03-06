import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useGasAddon() {
  const { profile, user, hasRole } = useAuth();
  const companyId = profile?.company_id;
  const userId = user?.id;
  const isOwnerOrManager = hasRole("owner") || hasRole("manager");

  const { data, isLoading } = useQuery({
    queryKey: ["gas-addon", companyId, userId],
    queryFn: async () => {
      if (!companyId) return { addon: null, license: null };

      // Fetch company addon and user license in parallel
      const [addonResult, licenseResult] = await Promise.all([
        supabase
          .from("company_addons")
          .select("*")
          .eq("company_id", companyId)
          .eq("addon_type", "natural_gas")
          .maybeSingle(),
        userId
          ? supabase
              .from("addon_licenses")
              .select("*")
              .eq("company_id", companyId)
              .eq("addon_type", "natural_gas")
              .eq("user_id", userId)
              .eq("status", "active")
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (addonResult.error) throw addonResult.error;
      if (licenseResult.error) throw licenseResult.error;

      return { addon: addonResult.data, license: licenseResult.data };
    },
    enabled: !!companyId,
  });

  const companyHasAddon = data?.addon?.status === "active";
  const userHasLicense = !!data?.license;

  return {
    hasGasAddon: companyHasAddon && (userHasLicense || isOwnerOrManager),
    companyHasAddon,
    userHasLicense,
    addon: data?.addon ?? null,
    userLicense: data?.license ?? null,
    isLoading,
  };
}
