import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGasAddon } from "@/hooks/useGasAddon";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CertificateTypeSelector } from "@/components/gas-certificates/CertificateTypeSelector";
import { GasCertificateForm } from "@/components/gas-certificates/GasCertificateForm";
import { generateGasCertificatePDF } from "@/components/gas-certificates/GasCertificatePDF";
import { ADDON_MODULES, GasCertificateType } from "@/lib/gas-addons";
import { Plus, Search, FileText, Download, Loader2, Lock } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

type ViewState = "list" | "select-type" | "form";

export default function GasCertificates() {
  const { profile, user } = useAuth();
  const { hasGasAddon, companyHasAddon, isLoading: addonLoading } = useGasAddon();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const syncAttempted = useRef(false);
  const [view, setView] = useState<ViewState>("list");

  // Call check-addon after Stripe checkout redirect or when addon not yet active
  useEffect(() => {
    const addonParam = searchParams.get("addon");
    const shouldSync = addonParam === "success" || (!companyHasAddon && !addonLoading && !syncAttempted.current);
    if (!shouldSync) return;
    syncAttempted.current = true;

    const syncAddon = async () => {
      try {
        await supabase.functions.invoke("check-addon");
        queryClient.invalidateQueries({ queryKey: ["gas-addon"] });
      } catch {
        // Silent fail
      }
      if (addonParam === "success") {
        const next = new URLSearchParams(searchParams);
        next.delete("addon");
        setSearchParams(next, { replace: true });
        toast.success("Gas add-on activated!");
      }
    };
    syncAddon();
  }, [searchParams, companyHasAddon, addonLoading]);
  const [selectedType, setSelectedType] = useState<GasCertificateType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const companyId = profile?.company_id;

  const { data: certificates = [], isLoading, refetch } = useQuery({
    queryKey: ["gas-certificates", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("gas_certificates")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && hasGasAddon,
  });

  const typeLabels = Object.fromEntries(
    ADDON_MODULES.natural_gas.certificate_types.map(t => [t.value, t.label])
  );

  const filtered = certificates.filter(c => {
    const matchesSearch = !searchQuery || 
      c.certificate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.job_address?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || c.certificate_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleDownloadPDF = async (cert: typeof certificates[0]) => {
    try {
      // Fetch appliances
      const { data: appliances } = await supabase
        .from("gas_certificate_appliances")
        .select("*")
        .eq("certificate_id", cert.id)
        .order("position");

      // For ND Gas Safety, fetch company + engineer info + logo
      let companyData: any = {};
      if (["nd_gas_safety", "landlord_gas_safety", "homeowner_gas_safety"].includes(cert.certificate_type) && companyId) {
        const { data: company } = await supabase
          .from("companies")
          .select("name, address, phone, gas_safe_reg_no, logo_url")
          .eq("id", companyId)
          .single();

        const { data: engineer } = await supabase
          .from("profiles")
          .select("gas_safe_id_card_no")
          .eq("user_id", cert.engineer_id)
          .single();

        // Attempt to fetch company logo as base64
        let logoBase64: string | undefined;
        if (company?.logo_url) {
          try {
            const response = await fetch(company.logo_url);
            const blob = await response.blob();
            logoBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          } catch {
            // Logo fetch failed — continue without it
          }
        }

        companyData = {
          company_name: company?.name || "",
          company_address: company?.address || "",
          company_phone: company?.phone || "",
          gas_safe_reg_no: (company as any)?.gas_safe_reg_no || "",
          engineer_gas_safe_id: (engineer as any)?.gas_safe_id_card_no || "",
          company_logo_base64: logoBase64,
        };
      }

      const doc = generateGasCertificatePDF({
        ...cert,
        appliances: appliances || [],
        ...companyData,
      });
      doc.save(`${cert.certificate_number}.pdf`);
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  if (addonLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!hasGasAddon) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Lock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Gas Add-on License Required</h1>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            You need a Natural Gas Compliance license to access gas certificates. Ask your organisation owner or manager to assign one to you via Organisation → Add-ons.
          </p>
          <Button onClick={() => navigate("/organisation?tab=addons")}>Go to Add-ons</Button>
        </div>
      </AppLayout>
    );
  }

  if (view === "select-type") {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => setView("list")}>← Back</Button>
            <h1 className="text-2xl font-bold mt-2">Select Certificate Type</h1>
          </div>
          <CertificateTypeSelector onSelect={(type) => {
            setSelectedType(type);
            setView("form");
          }} />
        </div>
      </AppLayout>
    );
  }

  if (view === "form" && selectedType) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-2xl font-bold mb-6">{typeLabels[selectedType]}</h1>
          <GasCertificateForm
            certificateType={selectedType}
            onComplete={() => { setView("list"); refetch(); }}
            onCancel={() => setView("list")}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Gas Certificates</h1>
          <Button onClick={() => setView("select-type")}>
            <Plus className="h-4 w-4 mr-2" /> New Certificate
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search certificates..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ADDON_MODULES.natural_gas.certificate_types.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No certificates yet</h3>
              <p className="text-muted-foreground mb-4">Create your first gas safety certificate</p>
              <Button onClick={() => setView("select-type")}>
                <Plus className="h-4 w-4 mr-2" /> New Certificate
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(cert => (
              <Card key={cert.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <FileText className="h-8 w-8 text-primary shrink-0" />
                    <div>
                      <p className="font-medium">{cert.certificate_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {typeLabels[cert.certificate_type]} • {cert.customer_name || cert.job_address_name || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(cert.inspection_date), "dd MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={cert.status === "issued" ? "default" : "secondary"}>
                      {cert.status}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleDownloadPDF(cert)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
