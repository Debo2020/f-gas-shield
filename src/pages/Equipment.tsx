import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import {
  Thermometer,
  Plus,
  Search,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  MoreVertical,
  Pencil,
  Trash2,
  Filter,
  Tag,
  ClipboardCheck,
  ScanLine,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { EquipmentDialog } from "@/components/equipment/EquipmentDialog";
import { ComplianceThresholdBadge } from "@/components/equipment/ComplianceThresholdBadge";
import { LabelGenerator } from "@/components/equipment/LabelGenerator";
import { EquipmentQRScanner } from "@/components/equipment/EquipmentQRScanner";
import { EquipmentQuickActions } from "@/components/equipment/EquipmentQuickActions";
import { CameraCapture } from "@/components/documents/CameraCapture";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { EquipmentFormValues } from "@/components/equipment/EquipmentForm";
import { LiveClock } from "@/components/ui/live-clock";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { AnimatedCounter } from "@/components/ui/animated-counter";

interface Equipment {
  id: string;
  site_id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  asset_tag: string | null;
  refrigerant_type: string;
  refrigerant_charge_kg: number;
  co2_equivalent_tonnes: number | null;
  installation_date: string | null;
  last_inspection_date: string | null;
  next_inspection_due: string | null;
  inspection_frequency_months: number | null;
  location_description: string | null;
  notes: string | null;
  is_active: boolean;
  sites: {
    name: string;
  };
}

interface ScannedEquipment {
  id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  refrigerant_type: string;
  refrigerant_charge_kg: number;
  co2_equivalent_tonnes: number | null;
  next_inspection_due: string | null;
  asset_tag: string | null;
  serial_number: string | null;
  sites: {
    name: string;
  };
}

interface Site {
  id: string;
  name: string;
}

interface Company {
  name: string;
  phone: string | null;
  email: string | null;
}

export default function Equipment() {
  const { profile, hasRole, hasActiveLicense } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [deletingEquipment, setDeletingEquipment] = useState<Equipment | null>(null);
  const [labelEquipment, setLabelEquipment] = useState<Equipment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedEquipment, setScannedEquipment] = useState<ScannedEquipment | null>(null);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraEquipmentId, setCameraEquipmentId] = useState<string | null>(null);

  const isOwner = hasRole("owner");
  const isManager = hasRole("manager");
  const canEdit = isOwner || isManager;
  const canDelete = isOwner;
  const canPerformActions = canEdit && (isOwner || hasActiveLicense);

  const fetchData = async () => {
    if (!profile?.company_id) return;

    try {
      const [equipmentRes, sitesRes, companyRes] = await Promise.all([
        supabase
          .from("equipment")
          .select(`
            id, site_id, name, manufacturer, model, serial_number, asset_tag,
            refrigerant_type, refrigerant_charge_kg, co2_equivalent_tonnes,
            installation_date, last_inspection_date, next_inspection_due,
            inspection_frequency_months, location_description, notes, is_active,
            sites!inner(name)
          `)
          .eq("company_id", profile.company_id)
          .order("name"),
        supabase
          .from("sites")
          .select("id, name")
          .eq("company_id", profile.company_id)
          .order("name"),
        supabase
          .from("companies")
          .select("name, phone, email")
          .eq("id", profile.company_id)
          .single(),
      ]);

      if (equipmentRes.error) throw equipmentRes.error;
      if (sitesRes.error) throw sitesRes.error;

      setEquipment(equipmentRes.data || []);
      setSites(sitesRes.data || []);
      if (companyRes.data) {
        setCompany(companyRes.data);
      }
    } catch (error: any) {
      toast.error("Failed to load equipment");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.company_id]);

  // Handle ?action=new from URL
  useEffect(() => {
    if (searchParams.get("action") === "new" && canPerformActions && sites.length > 0 && !isLoading) {
      setIsDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, canPerformActions, sites.length, isLoading]);

  // Handle ?highlight=id from URL (scroll to and highlight equipment row)
  useEffect(() => {
    const highlightId = searchParams.get("highlight");
    if (highlightId && !isLoading && equipment.length > 0) {
      setSearchParams({}, { replace: true });
      setTimeout(() => {
        const row = document.getElementById(`equipment-${highlightId}`);
        if (row) {
          row.scrollIntoView({ behavior: "smooth", block: "center" });
          row.classList.add("bg-primary/10");
          setTimeout(() => row.classList.remove("bg-primary/10"), 2000);
        }
      }, 100);
    }
  }, [searchParams, isLoading, equipment.length]);

  const handleAddEquipment = async (values: EquipmentFormValues) => {
    if (!profile?.company_id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("equipment").insert({
        company_id: profile.company_id,
        site_id: values.site_id,
        name: values.name,
        manufacturer: values.manufacturer || null,
        model: values.model || null,
        serial_number: values.serial_number || null,
        asset_tag: values.asset_tag || null,
        refrigerant_type: values.refrigerant_type,
        refrigerant_charge_kg: values.refrigerant_charge_kg,
        installation_date: values.installation_date?.toISOString().split("T")[0] || null,
        inspection_frequency_months: values.inspection_frequency_months || 12,
        location_description: values.location_description || null,
        notes: values.notes || null,
      });

      if (error) throw error;

      toast.success("Equipment registered successfully");
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add equipment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEquipment = async (values: EquipmentFormValues) => {
    if (!editingEquipment) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("equipment")
        .update({
          site_id: values.site_id,
          name: values.name,
          manufacturer: values.manufacturer || null,
          model: values.model || null,
          serial_number: values.serial_number || null,
          asset_tag: values.asset_tag || null,
          refrigerant_type: values.refrigerant_type,
          refrigerant_charge_kg: values.refrigerant_charge_kg,
          installation_date: values.installation_date?.toISOString().split("T")[0] || null,
          inspection_frequency_months: values.inspection_frequency_months || 12,
          location_description: values.location_description || null,
          notes: values.notes || null,
        })
        .eq("id", editingEquipment.id);

      if (error) throw error;

      toast.success("Equipment updated successfully");
      setEditingEquipment(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update equipment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEquipment = async () => {
    if (!deletingEquipment) return;

    try {
      const { error } = await supabase
        .from("equipment")
        .delete()
        .eq("id", deletingEquipment.id);

      if (error) throw error;

      toast.success("Equipment deleted successfully");
      setDeletingEquipment(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete equipment");
    }
  };

  const getInspectionStatus = (nextDue: string | null) => {
    if (!nextDue) return { status: "unknown", label: "Not scheduled", variant: "outline" as const };

    const daysUntil = differenceInDays(new Date(nextDue), new Date());

    if (daysUntil < 0) {
      return { status: "overdue", label: "Overdue", variant: "destructive" as const };
    } else if (daysUntil <= 30) {
      return { status: "due-soon", label: "Due soon", variant: "secondary" as const };
    } else {
      return { status: "compliant", label: "Compliant", variant: "default" as const };
    }
  };

  const filteredEquipment = equipment.filter((eq) => {
    const matchesSearch =
      eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.asset_tag?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSite = siteFilter === "all" || eq.site_id === siteFilter;

    return matchesSearch && matchesSite;
  });

  const totalCo2 = equipment.reduce((sum, eq) => sum + (eq.co2_equivalent_tonnes || 0), 0);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8 header-gradient p-6 -mx-4 -mt-8 rounded-b-2xl">
          <div className="animate-fade-in">
            <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 animate-float">
                <Thermometer className="h-7 w-7 text-primary" />
              </div>
              <span className="gradient-text">Equipment Register</span>
            </h1>
            <p className="text-muted-foreground mt-1 ml-14">
              <AnimatedCounter value={equipment.length} /> units · <AnimatedCounter value={totalCo2} decimals={2} /> tonnes CO₂e
            </p>
            <StatusIndicator status="synced" label="Data synced" className="mt-2 ml-14" />
          </div>

          <div className="flex flex-col items-end gap-3">
            <LiveClock showDate className="animate-slide-up" />
            <div className="flex items-center gap-2 animate-scale-in">
              <Button
                variant="outline"
                onClick={() => setIsScannerOpen(true)}
                className="gap-2"
              >
                <ScanLine className="h-4 w-4" />
                Scan QR
              </Button>
              {canEdit && (
                <Button 
                  onClick={() => setIsDialogOpen(true)} 
                  disabled={sites.length === 0 || !canPerformActions}
                  title={sites.length > 0 && !canPerformActions ? "License required" : undefined}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Register Equipment
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* No Sites Warning */}
        {sites.length === 0 && !isLoading && (
          <Card className="mb-6 border-warning bg-warning/5 animate-slide-up">
            <CardContent className="py-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning animate-pulse" />
              <div>
                <p className="font-medium">No sites available</p>
                <p className="text-sm text-muted-foreground">
                  You need to{" "}
                  <Link to="/sites" className="text-primary hover:underline">
                    add a site
                  </Link>{" "}
                  before you can register equipment.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Equipment Table */}
        <div className="animate-scale-in opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading equipment...</div>
          ) : filteredEquipment.length === 0 ? (
            <Card className="card-interactive">
              <CardContent className="py-12 text-center">
                {equipment.length === 0 ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 animate-float">
                      <Thermometer className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No equipment registered</h3>
                    <p className="text-muted-foreground mb-4">
                      Register your refrigeration equipment to start tracking F-Gas compliance
                    </p>
                    {canEdit && sites.length > 0 && (
                      <Button 
                        onClick={() => setIsDialogOpen(true)}
                        disabled={!canPerformActions}
                        title={!canPerformActions ? "License required" : undefined}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Register Your First Equipment
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No equipment found</h3>
                    <p className="text-muted-foreground">Try adjusting your search or filters</p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="card-interactive">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Refrigerant</TableHead>
                  <TableHead className="text-right">Charge (kg)</TableHead>
                  <TableHead className="text-right">CO₂e (t)</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Next Inspection</TableHead>
                  <TableHead>Status</TableHead>
                  {(canEdit || canDelete) && <TableHead className="w-10"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.map((eq) => {
                  const inspectionStatus = getInspectionStatus(eq.next_inspection_due);
                  return (
                    <TableRow key={eq.id} id={`equipment-${eq.id}`} className="transition-colors duration-500">
                      <TableCell>
                        <div>
                          <Link
                            to={`/equipment/${eq.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {eq.name}
                          </Link>
                          {(eq.manufacturer || eq.model) && (
                            <p className="text-sm text-muted-foreground">
                              {[eq.manufacturer, eq.model].filter(Boolean).join(" ")}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{eq.sites.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{eq.refrigerant_type}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {eq.refrigerant_charge_kg.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {eq.co2_equivalent_tonnes?.toFixed(2) || "-"}
                      </TableCell>
                      <TableCell>
                        <ComplianceThresholdBadge 
                          co2eTonnes={eq.co2_equivalent_tonnes} 
                          showFrequency 
                        />
                      </TableCell>
                      <TableCell>
                        {eq.next_inspection_due ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">
                              {format(new Date(eq.next_inspection_due), "dd MMM yyyy")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not scheduled</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={inspectionStatus.variant} className="flex items-center gap-1 w-fit">
                          {inspectionStatus.status === "compliant" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : inspectionStatus.status === "overdue" ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : null}
                          {inspectionStatus.label}
                        </Badge>
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/inspections?equipment=${eq.id}`)}>
                                <ClipboardCheck className="h-4 w-4 mr-2" />
                                View Inspections
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setLabelEquipment(eq)}>
                                <Tag className="h-4 w-4 mr-2" />
                                Generate Label
                              </DropdownMenuItem>
                              {canPerformActions && (
                                <DropdownMenuItem onClick={() => setEditingEquipment(eq)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canDelete && (isOwner || hasActiveLicense) && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeletingEquipment(eq)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
        </div>
      </div>

      {/* Add Equipment Dialog */}
      {profile?.company_id && (
        <EquipmentDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSubmit={handleAddEquipment}
          isSubmitting={isSubmitting}
          companyId={profile.company_id}
        />
      )}

      {/* Edit Equipment Dialog */}
      {profile?.company_id && (
        <EquipmentDialog
          open={!!editingEquipment}
          onOpenChange={(open) => !open && setEditingEquipment(null)}
          onSubmit={handleEditEquipment}
          equipment={editingEquipment}
          isSubmitting={isSubmitting}
          companyId={profile.company_id}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingEquipment} onOpenChange={(open) => !open && setDeletingEquipment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Equipment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingEquipment?.name}"? This action cannot be
              undone and will remove all associated inspection records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEquipment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Label Generator */}
      {labelEquipment && company && (
        <LabelGenerator
          open={!!labelEquipment}
          onOpenChange={(open) => !open && setLabelEquipment(null)}
          equipment={labelEquipment}
          company={{
            name: company.name,
            phone: company.phone,
            email: company.email,
          }}
          siteName={labelEquipment.sites.name}
        />
      )}

      {/* QR Scanner */}
      <EquipmentQRScanner
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onEquipmentFound={(eq) => {
          setScannedEquipment(eq);
          setIsQuickActionsOpen(true);
        }}
      />

      {/* Quick Actions Sheet */}
      <EquipmentQuickActions
        equipment={scannedEquipment}
        open={isQuickActionsOpen}
        onOpenChange={setIsQuickActionsOpen}
        onEdit={() => {
          if (scannedEquipment) {
            // Find the full equipment data from our list
            const fullEquipment = equipment.find(e => e.id === scannedEquipment.id);
            if (fullEquipment) {
              setEditingEquipment(fullEquipment);
            }
          }
        }}
        onGenerateLabel={() => {
          if (scannedEquipment) {
            const fullEquipment = equipment.find(e => e.id === scannedEquipment.id);
            if (fullEquipment) {
              setLabelEquipment(fullEquipment);
            }
          }
        }}
        onTakePhoto={() => {
          if (scannedEquipment) {
            setCameraEquipmentId(scannedEquipment.id);
            setIsCameraOpen(true);
          }
        }}
      />

      {/* Camera Capture */}
      {profile?.company_id && (
        <CameraCapture
          open={isCameraOpen}
          onOpenChange={(open) => {
            setIsCameraOpen(open);
            if (!open) setCameraEquipmentId(null);
          }}
          companyId={profile.company_id}
          equipmentId={cameraEquipmentId || undefined}
          onCaptureComplete={() => {
            toast.success("Photo attached to equipment");
          }}
        />
      )}
    </AppLayout>
  );
}
