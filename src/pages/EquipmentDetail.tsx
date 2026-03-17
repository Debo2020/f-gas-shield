import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import {
  ArrowLeft,
  Thermometer,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Tag,
  ClipboardCheck,
  Plus,
  Download,
  FileText,
  Droplets,
  Building2,
  Info,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { AppLayout } from "@/components/layout/AppLayout";
import { ComplianceThresholdBadge, getComplianceThreshold } from "@/components/equipment/ComplianceThresholdBadge";
import { LabelGenerator } from "@/components/equipment/LabelGenerator";
import { EquipmentDialog } from "@/components/equipment/EquipmentDialog";
import { DocumentList } from "@/components/documents/DocumentList";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import type { EquipmentFormValues } from "@/components/equipment/EquipmentForm";

// GWP values for display
const GWP_VALUES: Record<string, number> = {
  "R-32": 675,
  "R-134a": 1430,
  "R-404A": 3922,
  "R-407C": 1774,
  "R-410A": 2088,
  "R-422D": 2729,
  "R-448A": 1387,
  "R-449A": 1397,
  "R-452A": 2140,
  "R-454B": 466,
  "R-507A": 3985,
  "R-744": 1,
  "Other": 0,
};

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
    id: string;
    name: string;
    address: string;
  };
}

interface Inspection {
  id: string;
  inspection_date: string;
  inspector_name: string;
  result: string;
  leak_check_performed: boolean;
  leak_detected: boolean;
  leak_repaired: boolean | null;
  refrigerant_added_kg: number | null;
  refrigerant_recovered_kg: number | null;
  findings: string | null;
  recommendations: string | null;
}

interface Company {
  name: string;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
}

const RESULT_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pass: "default",
  pass_with_observations: "secondary",
  fail: "destructive",
  deferred: "outline",
};

const RESULT_LABELS: Record<string, string> = {
  pass: "Pass",
  pass_with_observations: "Pass with Observations",
  fail: "Fail",
  deferred: "Deferred",
};

export default function EquipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, hasRole, hasActiveLicense } = useAuth();
  
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLabelOpen, setIsLabelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [docRefresh, setDocRefresh] = useState(0);

  const isOwner = hasRole("owner");
  const isManager = hasRole("manager");
  const canEdit = isOwner || isManager;
  const canPerformActions = canEdit && (isOwner || hasActiveLicense);

  const fetchData = async () => {
    if (!profile?.company_id || !id) return;

    try {
      const [equipmentRes, inspectionsRes, companyRes] = await Promise.all([
        supabase
          .from("equipment")
          .select(`
            id, site_id, name, manufacturer, model, serial_number, asset_tag,
            refrigerant_type, refrigerant_charge_kg, co2_equivalent_tonnes,
            installation_date, last_inspection_date, next_inspection_due,
            inspection_frequency_months, location_description, notes, is_active,
            sites!inner(id, name, address)
          `)
          .eq("id", id)
          .eq("company_id", profile.company_id)
          .maybeSingle(),
        supabase
          .from("inspections")
          .select("*")
          .eq("equipment_id", id)
          .eq("company_id", profile.company_id)
          .order("inspection_date", { ascending: false }),
        supabase
          .from("companies")
          .select("name, phone, email, logo_url")
          .eq("id", profile.company_id)
          .single(),
      ]);

      if (equipmentRes.error) throw equipmentRes.error;
      if (!equipmentRes.data) {
        toast.error("F-Gas system not found");
        navigate("/equipment");
        return;
      }

      setEquipment(equipmentRes.data as Equipment);
      setInspections(inspectionsRes.data || []);
      if (companyRes.data) setCompany(companyRes.data);
    } catch (error: any) {
      toast.error("Failed to load system details");
      navigate("/equipment");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.company_id, id]);

  const handleEditEquipment = async (values: EquipmentFormValues) => {
    if (!equipment) return;

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
        .eq("id", equipment.id);

      if (error) throw error;

      toast.success("F-Gas system updated successfully");
      setIsEditOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update equipment");
    } finally {
      setIsSubmitting(false);
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

  // Calculate gas log stats
  const gasLogEntries = inspections.filter(
    (i) => (i.refrigerant_added_kg || 0) > 0 || (i.refrigerant_recovered_kg || 0) > 0
  );
  const totalAdded = inspections.reduce((sum, i) => sum + (i.refrigerant_added_kg || 0), 0);
  const totalRecovered = inspections.reduce((sum, i) => sum + (i.refrigerant_recovered_kg || 0), 0);
  const gwp = equipment ? GWP_VALUES[equipment.refrigerant_type] || 0 : 0;
  const netEmissionsCo2e = ((totalAdded - totalRecovered) * gwp) / 1000;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!equipment) {
    return null;
  }

  const inspectionStatus = getInspectionStatus(equipment.next_inspection_due);
  const threshold = getComplianceThreshold(equipment.co2_equivalent_tonnes);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => navigate("/equipment")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Equipment
          </Button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Thermometer className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
                    {equipment.name}
                    {!equipment.is_active && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </h1>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{equipment.sites.name}</span>
                    {equipment.location_description && (
                      <>
                        <span>•</span>
                        <span>{equipment.location_description}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-12">
                <Badge variant="outline">{equipment.refrigerant_type}</Badge>
                <span className="text-sm text-muted-foreground">
                  {equipment.refrigerant_charge_kg.toFixed(2)} kg
                </span>
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-sm font-medium">
                  {equipment.co2_equivalent_tonnes?.toFixed(2)} t CO₂e
                </span>
                <ComplianceThresholdBadge co2eTonnes={equipment.co2_equivalent_tonnes} showFrequency />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsLabelOpen(true)}>
                <Tag className="h-4 w-4 mr-2" />
                Generate Label
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/inspections?equipment=${equipment.id}`)}
              >
                <ClipboardCheck className="h-4 w-4 mr-2" />
                View Inspections
              </Button>
              {canPerformActions && (
                <Button size="sm" onClick={() => setIsEditOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    <AnimatedCounter value={inspections.length} />
                  </p>
                  <p className="text-xs text-muted-foreground">Inspections</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Plus className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    <AnimatedCounter value={totalAdded} decimals={2} /> kg
                  </p>
                  <p className="text-xs text-muted-foreground">Total Added</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Droplets className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    <AnimatedCounter value={totalRecovered} decimals={2} /> kg
                  </p>
                  <p className="text-xs text-muted-foreground">Total Recovered</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    <AnimatedCounter value={netEmissionsCo2e} decimals={2} /> t
                  </p>
                  <p className="text-xs text-muted-foreground">Net CO₂e Emissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="inspections">Inspections ({inspections.length})</TabsTrigger>
            <TabsTrigger value="gas-log">Gas Log ({gasLogEntries.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Equipment Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Info className="h-5 w-5" />
                    Equipment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {equipment.manufacturer && (
                      <div>
                        <p className="text-muted-foreground">Manufacturer</p>
                        <p className="font-medium">{equipment.manufacturer}</p>
                      </div>
                    )}
                    {equipment.model && (
                      <div>
                        <p className="text-muted-foreground">Model</p>
                        <p className="font-medium">{equipment.model}</p>
                      </div>
                    )}
                    {equipment.serial_number && (
                      <div>
                        <p className="text-muted-foreground">Serial Number</p>
                        <p className="font-medium font-mono">{equipment.serial_number}</p>
                      </div>
                    )}
                    {equipment.asset_tag && (
                      <div>
                        <p className="text-muted-foreground">Asset Tag</p>
                        <p className="font-medium font-mono">{equipment.asset_tag}</p>
                      </div>
                    )}
                  </div>
                  {equipment.notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-muted-foreground text-sm mb-1">Notes</p>
                        <p className="text-sm">{equipment.notes}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Refrigerant Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Droplets className="h-5 w-5" />
                    Refrigerant Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-medium">{equipment.refrigerant_type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Charge</p>
                      <p className="font-medium">{equipment.refrigerant_charge_kg.toFixed(2)} kg</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">GWP</p>
                      <p className="font-medium">{gwp.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CO₂ Equivalent</p>
                      <p className="font-medium">{equipment.co2_equivalent_tonnes?.toFixed(2)} tonnes</p>
                    </div>
                  </div>
                  {threshold && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                        <threshold.icon className="h-5 w-5 text-muted-foreground" />
                        <div className="text-sm">
                          <p className="font-medium">{threshold.label} Leak Checks Required</p>
                          <p className="text-muted-foreground">{threshold.description}</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Site & Location */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5" />
                    Site & Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <p className="text-muted-foreground">Site</p>
                    <Link
                      to={`/sites`}
                      className="font-medium text-primary hover:underline"
                    >
                      {equipment.sites.name}
                    </Link>
                    <p className="text-muted-foreground mt-1">{equipment.sites.address}</p>
                  </div>
                  {equipment.location_description && (
                    <div className="text-sm">
                      <p className="text-muted-foreground">Location on Site</p>
                      <p className="font-medium">{equipment.location_description}</p>
                    </div>
                  )}
                  {equipment.installation_date && (
                    <div className="text-sm">
                      <p className="text-muted-foreground">Installation Date</p>
                      <p className="font-medium">
                        {format(new Date(equipment.installation_date), "dd MMMM yyyy")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Inspection Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5" />
                    Inspection Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Frequency</p>
                      <p className="font-medium">Every {equipment.inspection_frequency_months || 12} months</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <Badge variant={inspectionStatus.variant} className="mt-1">
                        {inspectionStatus.status === "compliant" && (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        )}
                        {inspectionStatus.status === "overdue" && (
                          <AlertTriangle className="h-3 w-3 mr-1" />
                        )}
                        {inspectionStatus.label}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Inspection</p>
                      <p className="font-medium">
                        {equipment.last_inspection_date
                          ? format(new Date(equipment.last_inspection_date), "dd MMM yyyy")
                          : "Never inspected"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Next Due</p>
                      <p className="font-medium">
                        {equipment.next_inspection_due
                          ? format(new Date(equipment.next_inspection_due), "dd MMM yyyy")
                          : "Not scheduled"}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/inspections?action=new&equipment=${equipment.id}`)}
                    disabled={!canPerformActions}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Record Inspection
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Inspections Tab */}
          <TabsContent value="inspections">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Inspection History</CardTitle>
                  <CardDescription>All inspections recorded for this equipment</CardDescription>
                </div>
                <Button
                  onClick={() => navigate(`/inspections?action=new&equipment=${equipment.id}`)}
                  disabled={!canPerformActions}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Record Inspection
                </Button>
              </CardHeader>
              <CardContent>
                {inspections.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No inspections recorded yet</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => navigate(`/inspections?action=new&equipment=${equipment.id}`)}
                      disabled={!canPerformActions}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Record First Inspection
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Inspector</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Leak Detected</TableHead>
                        <TableHead className="text-right">Added (kg)</TableHead>
                        <TableHead className="text-right">Recovered (kg)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inspections.map((inspection) => (
                        <TableRow
                          key={inspection.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/inspections?highlight=${inspection.id}`)}
                        >
                          <TableCell>
                            {format(new Date(inspection.inspection_date), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell>{inspection.inspector_name}</TableCell>
                          <TableCell>
                            <Badge variant={RESULT_VARIANTS[inspection.result] || "outline"}>
                              {RESULT_LABELS[inspection.result] || inspection.result}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {inspection.leak_check_performed ? (
                              inspection.leak_detected ? (
                                <Badge variant="destructive">Yes</Badge>
                              ) : (
                                <Badge variant="outline">No</Badge>
                              )
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {inspection.refrigerant_added_kg?.toFixed(2) || "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {inspection.refrigerant_recovered_kg?.toFixed(2) || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gas Log Tab */}
          <TabsContent value="gas-log">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Refrigerant Gas Log</CardTitle>
                  <CardDescription>
                    Track refrigerant additions and recoveries for this equipment
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" disabled>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 mb-6 p-4 rounded-lg bg-muted/50">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {totalAdded.toFixed(2)} kg
                    </p>
                    <p className="text-xs text-muted-foreground">Total Added</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {totalRecovered.toFixed(2)} kg
                    </p>
                    <p className="text-xs text-muted-foreground">Total Recovered</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-600">
                      {netEmissionsCo2e.toFixed(2)} t
                    </p>
                    <p className="text-xs text-muted-foreground">Net CO₂e Emissions</p>
                  </div>
                </div>

                {gasLogEntries.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Droplets className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No refrigerant movements recorded</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount (kg)</TableHead>
                        <TableHead className="text-right">CO₂e Impact (t)</TableHead>
                        <TableHead>Inspector</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gasLogEntries.map((entry) => {
                        const added = entry.refrigerant_added_kg || 0;
                        const recovered = entry.refrigerant_recovered_kg || 0;
                        const isAddition = added > recovered;
                        const amount = isAddition ? added : recovered;
                        const co2eImpact = (amount * gwp) / 1000;

                        return (
                          <TableRow key={entry.id}>
                            <TableCell>
                              {format(new Date(entry.inspection_date), "dd MMM yyyy")}
                            </TableCell>
                            <TableCell>
                              <Badge variant={isAddition ? "secondary" : "outline"}>
                                {isAddition ? "Addition" : "Recovery"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {isAddition ? "+" : "-"}{amount.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {isAddition ? "+" : "-"}{co2eImpact.toFixed(3)}
                            </TableCell>
                            <TableCell>{entry.inspector_name}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Attached Documents</CardTitle>
                <CardDescription>
                  Certificates, photos, and other documents for this equipment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {profile?.company_id && (
                  <>
                    <DocumentUploader
                      companyId={profile.company_id}
                      equipmentId={equipment.id}
                      documentType="other"
                      onUploadComplete={() => setDocRefresh((prev) => prev + 1)}
                    />
                    <Separator />
                    <DocumentList
                      companyId={profile.company_id}
                      equipmentId={equipment.id}
                      canDelete={isOwner}
                      refreshTrigger={docRefresh}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Equipment Dialog */}
      {profile?.company_id && (
        <EquipmentDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSubmit={handleEditEquipment}
          equipment={equipment}
          isSubmitting={isSubmitting}
          companyId={profile.company_id}
        />
      )}

      {/* Label Generator */}
      {company && (
        <LabelGenerator
          open={isLabelOpen}
          onOpenChange={setIsLabelOpen}
          equipment={equipment}
          company={company}
          siteName={equipment.sites.name}
        />
      )}
    </AppLayout>
  );
}
