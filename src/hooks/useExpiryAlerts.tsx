import { useEffect, useState } from "react";
import { differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ExpiryAlert {
  id: string;
  type: "document" | "certificate";
  name: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  severity: "critical" | "warning" | "info";
  linkedTo?: {
    type: "equipment" | "site" | "profile";
    id: string;
    name: string;
  };
}

interface ExpiringDocument {
  id: string;
  name: string;
  expiry_date: string;
  document_type: string;
  equipment_id: string | null;
  site_id: string | null;
  profile_id: string | null;
  equipment?: { name: string } | null;
  sites?: { name: string } | null;
}

export function useExpiryAlerts() {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<ExpiryAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExpiryData = async () => {
      if (!profile?.company_id) return;

      try {
        const allAlerts: ExpiryAlert[] = [];

        // Fetch expiring documents (expired up to 30 days ago → expiring within 90 days)
        const ninetyDaysFromNow = new Date();
        ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: documents } = await supabase
          .from("documents")
          .select(`
            id, name, expiry_date, document_type, equipment_id, site_id, profile_id,
            equipment:equipment_id(name),
            sites:site_id(name)
          `)
          .eq("company_id", profile.company_id)
          .not("expiry_date", "is", null)
          .gte("expiry_date", thirtyDaysAgo.toISOString().split("T")[0])
          .lte("expiry_date", ninetyDaysFromNow.toISOString().split("T")[0])
          .order("expiry_date");

        if (documents) {
          documents.forEach((doc: ExpiringDocument) => {
            const expiryDate = new Date(doc.expiry_date);
            const daysUntil = differenceInDays(expiryDate, new Date());
            
            let linkedTo: ExpiryAlert["linkedTo"];
            if (doc.equipment_id && doc.equipment) {
              linkedTo = { type: "equipment", id: doc.equipment_id, name: doc.equipment.name };
            } else if (doc.site_id && doc.sites) {
              linkedTo = { type: "site", id: doc.site_id, name: doc.sites.name };
            }

            allAlerts.push({
              id: doc.id,
              type: "document",
              name: doc.name,
              expiryDate,
              daysUntilExpiry: daysUntil,
              severity: daysUntil <= 7 ? "critical" : daysUntil <= 30 ? "warning" : "info",
              linkedTo,
            });
          });
        }

        // Fetch team members with expiring F-Gas certificates
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, f_gas_certificate_expiry")
          .eq("company_id", profile.company_id)
          .not("f_gas_certificate_expiry", "is", null)
          .lte("f_gas_certificate_expiry", ninetyDaysFromNow.toISOString().split("T")[0]);

        if (profiles) {
          profiles.forEach((p) => {
            if (!p.f_gas_certificate_expiry) return;
            
            const expiryDate = new Date(p.f_gas_certificate_expiry);
            const daysUntil = differenceInDays(expiryDate, new Date());

            allAlerts.push({
              id: `cert-${p.id}`,
              type: "certificate",
              name: `${p.full_name}'s F-Gas Certificate`,
              expiryDate,
              daysUntilExpiry: daysUntil,
              severity: daysUntil <= 7 ? "critical" : daysUntil <= 30 ? "warning" : "info",
              linkedTo: { type: "profile", id: p.id, name: p.full_name },
            });
          });
        }

        // Sort by days until expiry (most urgent first)
        allAlerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
        
        setAlerts(allAlerts);
      } catch (error) {
        console.error("Error fetching expiry alerts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpiryData();
  }, [profile?.company_id]);

  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");
  const infoAlerts = alerts.filter((a) => a.severity === "info");

  return {
    alerts,
    criticalAlerts,
    warningAlerts,
    infoAlerts,
    isLoading,
    hasAlerts: alerts.length > 0,
    hasCriticalAlerts: criticalAlerts.length > 0,
  };
}
