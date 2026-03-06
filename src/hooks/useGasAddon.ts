import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useGasAddon() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const { data, isLoading } = useQuery({
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

  return {
    hasGasAddon: data?.status === "active",
    addon: data,
    isLoading,
  };
}
