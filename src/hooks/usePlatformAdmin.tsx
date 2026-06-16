import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function usePlatformAdmin() {
  const { user, isLoading: authLoading } = useAuth();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!user) {
        setIsPlatformAdmin(false);
        setIsLoading(false);
        return;
      }
      const { data } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setIsPlatformAdmin(!!data);
        setIsLoading(false);
      }
    };
    if (!authLoading) check();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { isPlatformAdmin, isLoading };
}
