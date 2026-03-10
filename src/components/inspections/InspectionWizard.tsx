import { useState, useEffect, useCallback } from "react";
import { format, differenceInDays } from "date-fns";
import {
  ChevronRight,
  ChevronLeft,
  Search,
  Building2,
  MapPin,
  Thermometer,
  Camera,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { InspectionForm, type InspectionFormValues } from "./InspectionForm";
import { EquipmentQRScanner } from "@/components/equipment/EquipmentQRScanner";

interface Client {
  id: string;
  name: string;
  contact_name: string | null;
}

interface Site {
  id: string;
  name: string;
  address: string;
  postcode: string | null;
}

interface EquipmentItem {
  id: string;
  name: string;
  refrigerant_type: string;
  refrigerant_charge_kg: number;
  next_inspection_due: string | null;
  asset_tag: string | null;
  manufacturer: string | null;
  model: string | null;
}

interface InspectionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: InspectionFormValues) => Promise<void>;
  isSubmitting: boolean;
  companyId: string;
  currentUserName?: string;
  currentUserCertificate?: string | null;
}

type WizardStep = "client" | "site" | "equipment" | "form";

export function InspectionWizard({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  companyId,
  currentUserName,
  currentUserCertificate,
}: InspectionWizardProps) {
  const [step, setStep] = useState<WizardStep>("client");
  const [searchQuery, setSearchQuery] = useState("");

  // Selections
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);

  // Data
  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);

  // Loading
  const [isLoadingData, setIsLoadingData] = useState(false);

  // QR Scanner
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep("client");
      setSelectedClient(null);
      setSelectedSite(null);
      setSelectedEquipment(null);
      setSearchQuery("");
      setScanError(null);
    }
  }, [open]);

  // Fetch clients
  useEffect(() => {
    if (!open || step !== "client") return;
    const fetchClients = async () => {
      setIsLoadingData(true);
      const { data } = await supabase
        .from("clients")
        .select("id, name, contact_name")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");
      setClients(data || []);
      setIsLoadingData(false);
    };
    fetchClients();
  }, [open, step, companyId]);

  // Fetch sites when client selected
  useEffect(() => {
    if (!open || step !== "site" || !selectedClient) return;
    const fetchSites = async () => {
      setIsLoadingData(true);
      const { data } = await supabase
        .from("sites")
        .select("id, name, address, postcode")
        .eq("client_id", selectedClient.id)
        .eq("is_deleted", false)
        .order("name");
      setSites(data || []);
      setIsLoadingData(false);
    };
    fetchSites();
  }, [open, step, selectedClient]);

  // Fetch equipment when site selected
  useEffect(() => {
    if (!open || step !== "equipment" || !selectedSite) return;
    const fetchEquipment = async () => {
      setIsLoadingData(true);
      const { data } = await supabase
        .from("equipment")
        .select("id, name, refrigerant_type, refrigerant_charge_kg, next_inspection_due, asset_tag, manufacturer, model")
        .eq("site_id", selectedSite.id)
        .eq("is_active", true)
        .order("name");
      setEquipment(data || []);
      setIsLoadingData(false);
    };
    fetchEquipment();
  }, [open, step, selectedSite]);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setSelectedSite(null);
    setSelectedEquipment(null);
    setSearchQuery("");
    setStep("site");
  };

  const handleSelectSite = (site: Site) => {
    setSelectedSite(site);
    setSelectedEquipment(null);
    setSearchQuery("");
    setStep("equipment");
  };

  const handleSelectEquipment = (eq: EquipmentItem) => {
    setSelectedEquipment(eq);
    setSearchQuery("");
    setScanError(null);
    setStep("form");
  };

  const handleScanEquipmentFound = useCallback((scannedEquipment: any) => {
    setScanError(null);
    // Verify the scanned equipment belongs to the selected site
    if (selectedSite) {
      // We need to check site_id — do a quick lookup
      supabase
        .from("equipment")
        .select("id, name, refrigerant_type, refrigerant_charge_kg, next_inspection_due, asset_tag, manufacturer, model, site_id")
        .eq("id", scannedEquipment.id)
        .single()
        .then(({ data }) => {
          if (!data) {
            setScanError("Equipment not found in your company.");
            return;
          }
          if (data.site_id !== selectedSite.id) {
            setScanError(
              `This equipment belongs to a different site (${scannedEquipment.sites?.name || "unknown"}). Please select the correct site first, or choose equipment manually.`
            );
            return;
          }
          handleSelectEquipment({
            id: data.id,
            name: data.name,
            refrigerant_type: data.refrigerant_type,
            refrigerant_charge_kg: data.refrigerant_charge_kg,
            next_inspection_due: data.next_inspection_due,
            asset_tag: data.asset_tag,
            manufacturer: data.manufacturer,
            model: data.model,
          });
        });
    }
  }, [selectedSite]);

  const goToStep = (targetStep: WizardStep) => {
    setSearchQuery("");
    setScanError(null);
    if (targetStep === "client") {
      setSelectedClient(null);
      setSelectedSite(null);
      setSelectedEquipment(null);
    } else if (targetStep === "site") {
      setSelectedSite(null);
      setSelectedEquipment(null);
    } else if (targetStep === "equipment") {
      setSelectedEquipment(null);
    }
    setStep(targetStep);
  };

  const getBackStep = (): WizardStep | null => {
    switch (step) {
      case "site": return "client";
      case "equipment": return "site";
      case "form": return "equipment";
      default: return null;
    }
  };

  const filterItems = <T extends { name: string }>(items: T[]) => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(q));
  };

  const getDaysUntilInspection = (date: string | null) => {
    if (!date) return null;
    return differenceInDays(new Date(date), new Date());
  };

  const renderBreadcrumbs = () => (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          {step === "client" ? (
            <BreadcrumbPage>Select Client</BreadcrumbPage>
          ) : (
            <BreadcrumbLink className="cursor-pointer" onClick={() => goToStep("client")}>
              {selectedClient?.name || "Client"}
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {(step === "site" || step === "equipment" || step === "form") && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {step === "site" ? (
                <BreadcrumbPage>Select Site</BreadcrumbPage>
              ) : (
                <BreadcrumbLink className="cursor-pointer" onClick={() => goToStep("site")}>
                  {selectedSite?.name || "Site"}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </>
        )}
        {(step === "equipment" || step === "form") && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {step === "equipment" ? (
                <BreadcrumbPage>Select Equipment</BreadcrumbPage>
              ) : (
                <BreadcrumbLink className="cursor-pointer" onClick={() => goToStep("equipment")}>
                  {selectedEquipment?.name || "Equipment"}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </>
        )}
        {step === "form" && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Inspection</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );

  const renderStepContent = () => {
    const backStep = getBackStep();

    switch (step) {
      case "client": {
        const filtered = filterItems(clients);
        return (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
            {isLoadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>{clients.length === 0 ? "No clients found. Add clients first." : "No matching clients."}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{filtered.length} client{filtered.length !== 1 ? "s" : ""}</p>
                {filtered.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleSelectClient(client)}
                    className="w-full text-left p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors flex items-center justify-between min-h-[3.5rem]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        {client.contact_name && (
                          <p className="text-sm text-muted-foreground">{client.contact_name}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      }

      case "site": {
        const filtered = filterItems(sites);
        return (
          <div className="space-y-4">
            <Button variant="ghost" className="h-10 px-2" onClick={() => goToStep("client")}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Clients
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
            {isLoadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>{sites.length === 0 ? "No sites for this client." : "No matching sites."}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{filtered.length} site{filtered.length !== 1 ? "s" : ""}</p>
                {filtered.map((site) => (
                  <button
                    key={site.id}
                    onClick={() => handleSelectSite(site)}
                    className="w-full text-left p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors flex items-center justify-between min-h-[3.5rem]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{site.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {site.address}{site.postcode ? `, ${site.postcode}` : ""}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      }

      case "equipment": {
        const filtered = filterItems(equipment);
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="h-10 px-2" onClick={() => goToStep("site")}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Sites
              </Button>
            </div>

            {/* QR Scan Button */}
            <Button
              onClick={() => { setScanError(null); setIsScannerOpen(true); }}
              variant="default"
              className="w-full h-14 text-base gap-3"
            >
              <Camera className="h-5 w-5" />
              Scan Equipment QR / Barcode
            </Button>

            {scanError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex flex-col gap-2">
                  <span>{scanError}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setScanError(null); setIsScannerOpen(true); }}>
                      Try Again
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setScanError(null)}>
                      Select Manually
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="relative flex items-center gap-4">
              <div className="flex-1 border-t border-muted" />
              <span className="text-sm text-muted-foreground">or select manually</span>
              <div className="flex-1 border-t border-muted" />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
            {isLoadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Thermometer className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>{equipment.length === 0 ? "No equipment at this site." : "No matching equipment."}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{filtered.length} unit{filtered.length !== 1 ? "s" : ""}</p>
                {filtered.map((eq) => {
                  const daysUntil = getDaysUntilInspection(eq.next_inspection_due);
                  return (
                    <button
                      key={eq.id}
                      onClick={() => handleSelectEquipment(eq)}
                      className="w-full text-left p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors flex items-center justify-between min-h-[3.5rem]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-primary/10">
                          <Thermometer className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{eq.name}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{eq.refrigerant_type}</Badge>
                            <span className="text-xs text-muted-foreground">{eq.refrigerant_charge_kg} kg</span>
                            {eq.asset_tag && (
                              <span className="text-xs text-muted-foreground">Tag: {eq.asset_tag}</span>
                            )}
                          </div>
                          {daysUntil !== null && (
                            <p className={`text-xs mt-1 ${daysUntil < 0 ? "text-destructive font-medium" : daysUntil <= 30 ? "text-warning" : "text-muted-foreground"}`}>
                              {daysUntil < 0
                                ? `Overdue by ${Math.abs(daysUntil)} days`
                                : daysUntil === 0
                                  ? "Due today"
                                  : `Due in ${daysUntil} days`}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      case "form":
        return (
          <div className="space-y-4">
            <Button variant="ghost" className="h-10 px-2" onClick={() => goToStep("equipment")}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Equipment
            </Button>

            {selectedEquipment && (
              <Card className="bg-muted/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <Thermometer className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium">{selectedEquipment.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedEquipment.refrigerant_type} · {selectedEquipment.refrigerant_charge_kg} kg
                      {selectedEquipment.manufacturer && ` · ${selectedEquipment.manufacturer}`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <InspectionForm
              onSubmit={onSubmit}
              onCancel={() => onOpenChange(false)}
              isSubmitting={isSubmitting}
              companyId={companyId}
              currentUserName={currentUserName}
              currentUserCertificate={currentUserCertificate}
              defaultValues={{
                equipment_id: selectedEquipment?.id || "",
              }}
              lockedEquipmentId={selectedEquipment?.id}
              siteId={selectedSite?.id}
            />
          </div>
        );
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-6">
          <SheetHeader className="mb-2">
            <SheetTitle>Record Inspection</SheetTitle>
            <SheetDescription>
              Select the client, site and equipment to inspect.
            </SheetDescription>
          </SheetHeader>
          {renderBreadcrumbs()}
          {renderStepContent()}
        </SheetContent>
      </Sheet>

      <EquipmentQRScanner
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onEquipmentFound={handleScanEquipmentFound}
      />
    </>
  );
}
