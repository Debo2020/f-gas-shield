import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ClipboardCheck,
  Plus,
  Search,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Filter,
  Eye,
  Thermometer,
  X,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { InspectionDialog } from "@/components/inspections/InspectionDialog";
import { InspectionWizard } from "@/components/inspections/InspectionWizard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { InspectionFormValues } from "@/components/inspections/InspectionForm";
import { LiveClock } from "@/components/ui/live-clock";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { AnimatedCounter } from "@/components/ui/animated-counter";

interface Inspection {
  id: string;
  equipment_id: string;
  inspection_date: string;
  inspector_name: string;
  inspector_certificate_number: string | null;
  result: string;
  leak_check_performed: boolean;
  leak_detected: boolean;
  leak_location: string | null;
  leak_repaired: boolean | null;
  refrigerant_added_kg: number | null;
  refrigerant_recovered_kg: number | null;
  findings: string | null;
  recommendations: string | null;
  next_inspection_due: string | null;
  equipment: {
    name: string;
    refrigerant_type: string;
    sites: { name: string };
  };
}

export default function Inspections() {
  const { user, profile, hasRole, hasActiveLicense } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isOwner = hasRole("owner");
  const canRecordInspection = isOwner || hasActiveLicense;
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [equipmentFilter, setEquipmentFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingInspection, setViewingInspection] = useState<Inspection | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInspections = async () => {
    if (!profile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from("inspections")
        .select(`
          id, equipment_id, inspection_date, inspector_name, inspector_certificate_number,
          result, leak_check_performed, leak_detected, leak_location, leak_repaired,
          refrigerant_added_kg, refrigerant_recovered_kg, findings, recommendations,
          next_inspection_due,
          equipment!inner(name, refrigerant_type, sites!inner(name))
        `)
        .eq("company_id", profile.company_id)
        .order("inspection_date", { ascending: false });

      if (error) throw error;
      setInspections(data || []);
    } catch (error: any) {
      toast.error("Failed to load inspections");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, [profile?.company_id]);

  // Handle ?action=new from URL
  useEffect(() => {
    if (searchParams.get("action") === "new" && canRecordInspection && !isLoading) {
      setIsDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, canRecordInspection, isLoading]);

  // Handle ?equipment=id from URL (filter by equipment)
  useEffect(() => {
    const equipmentId = searchParams.get("equipment");
    if (equipmentId && !isLoading) {
      setEquipmentFilter(equipmentId);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, isLoading]);

  const handleAddInspection = async (values: InspectionFormValues) => {
    if (!profile?.company_id || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("inspections").insert({
        company_id: profile.company_id,
        equipment_id: values.equipment_id,
        inspection_date: values.inspection_date.toISOString().split("T")[0],
        inspector_id: user.id,
        inspector_name: values.inspector_name,
        inspector_certificate_number: values.inspector_certificate_number || null,
        result: values.result,
        leak_check_performed: values.leak_check_performed,
        leak_detected: values.leak_detected,
        leak_location: values.leak_location || null,
        leak_repaired: values.leak_detected ? values.leak_repaired : null,
        refrigerant_added_kg: values.refrigerant_added_kg || null,
        refrigerant_recovered_kg: values.refrigerant_recovered_kg || null,
        findings: values.findings || null,
        recommendations: values.recommendations || null,
      });

      if (error) throw error;

      toast.success("Inspection recorded successfully");
      setIsDialogOpen(false);
      fetchInspections();
    } catch (error: any) {
      toast.error(error.message || "Failed to record inspection");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case "pass":
        return (
          <Badge variant="default" className="bg-success text-success-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Pass
          </Badge>
        );
      case "pass_with_observations":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Pass w/ Observations
          </Badge>
        );
      case "fail":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Fail
          </Badge>
        );
      case "deferred":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Deferred
          </Badge>
        );
      default:
        return <Badge variant="outline">{result}</Badge>;
    }
  };

  // Get unique equipment list for filter dropdown
  const uniqueEquipment = Array.from(
    new Map(inspections.map((insp) => [insp.equipment_id, { id: insp.equipment_id, name: insp.equipment.name }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const filteredInspections = inspections.filter((insp) => {
    const matchesSearch =
      insp.equipment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      insp.inspector_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      insp.equipment.sites.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesResult = resultFilter === "all" || insp.result === resultFilter;
    const matchesEquipment = equipmentFilter === "all" || insp.equipment_id === equipmentFilter;

    return matchesSearch && matchesResult && matchesEquipment;
  });

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8 header-gradient p-6 -mx-4 -mt-8 rounded-b-2xl">
          <div className="animate-fade-in">
            <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 animate-float">
                <ClipboardCheck className="h-7 w-7 text-primary" />
              </div>
              <span className="gradient-text">Inspections</span>
            </h1>
            <p className="text-muted-foreground mt-1 ml-14">
              <AnimatedCounter value={inspections.length} /> inspection records
            </p>
            <StatusIndicator status="synced" label="Data synced" className="mt-2 ml-14" />
          </div>

          <div className="flex flex-col items-end gap-3">
            <LiveClock showDate className="animate-slide-up" />
            <Button 
              onClick={() => setIsDialogOpen(true)} 
              disabled={!canRecordInspection}
              title={!canRecordInspection ? "License required" : undefined}
              className="animate-scale-in"
            >
              <Plus className="h-4 w-4 mr-2" />
              Record Inspection
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inspections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="pass_with_observations">Pass w/ Observations</SelectItem>
                <SelectItem value="fail">Fail</SelectItem>
                <SelectItem value="deferred">Deferred</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-muted-foreground" />
            <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by equipment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Equipment</SelectItem>
                {uniqueEquipment.map((eq) => (
                  <SelectItem key={eq.id} value={eq.id}>
                    {eq.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {equipmentFilter !== "all" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setEquipmentFilter("all")}
                title="Clear equipment filter"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Inspections Table */}
        <div className="animate-scale-in opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading inspections...</div>
          ) : filteredInspections.length === 0 ? (
            <Card className="card-interactive">
              <CardContent className="py-12 text-center">
                {inspections.length === 0 ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 animate-float">
                      <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No inspections recorded</h3>
                    <p className="text-muted-foreground mb-4">
                      Record your first equipment inspection to start tracking compliance
                    </p>
                    <Button 
                      onClick={() => setIsDialogOpen(true)}
                      disabled={!canRecordInspection}
                      title={!canRecordInspection ? "License required" : undefined}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Record First Inspection
                    </Button>
                  </>
                ) : (
                  <>
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No inspections found</h3>
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
                  <TableHead>Date</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Leak Check</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInspections.map((insp) => (
                  <TableRow key={insp.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(insp.inspection_date), "dd MMM yyyy")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{insp.equipment.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {insp.equipment.sites.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{insp.inspector_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getResultBadge(insp.result)}</TableCell>
                    <TableCell>
                      {insp.leak_check_performed ? (
                        insp.leak_detected ? (
                          <Badge variant="destructive" className="text-xs">
                            Leak Found
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            No Leak
                          </Badge>
                        )
                      ) : (
                        <span className="text-sm text-muted-foreground">Not performed</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {insp.next_inspection_due ? (
                        <span className="text-sm">
                          {format(new Date(insp.next_inspection_due), "dd MMM yyyy")}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/equipment?highlight=${insp.equipment_id}`)}
                          title="View Equipment"
                        >
                          <Thermometer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setViewingInspection(insp)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
        </div>
      </div>

      {/* Add Inspection Wizard */}
      {profile?.company_id && (
        <InspectionWizard
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSubmit={handleAddInspection}
          isSubmitting={isSubmitting}
          companyId={profile.company_id}
          currentUserName={profile.full_name}
          currentUserCertificate={profile.f_gas_certificate_number}
        />
      )}

      {/* View Inspection Dialog */}
      <Dialog open={!!viewingInspection} onOpenChange={(open) => !open && setViewingInspection(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Inspection Details</DialogTitle>
            <DialogDescription>
              {viewingInspection?.equipment.name} -{" "}
              {viewingInspection && format(new Date(viewingInspection.inspection_date), "PPP")}
            </DialogDescription>
          </DialogHeader>

          {viewingInspection && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Result</label>
                  <div className="mt-1">{getResultBadge(viewingInspection.result)}</div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Inspector</label>
                  <p className="mt-1 font-medium">{viewingInspection.inspector_name}</p>
                </div>
              </div>

              {viewingInspection.inspector_certificate_number && (
                <div>
                  <label className="text-sm text-muted-foreground">Certificate Number</label>
                  <p className="mt-1">{viewingInspection.inspector_certificate_number}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <label className="text-sm text-muted-foreground">Leak Check</label>
                <div className="mt-1">
                  {viewingInspection.leak_check_performed ? (
                    viewingInspection.leak_detected ? (
                      <div className="space-y-1">
                        <Badge variant="destructive">Leak Detected</Badge>
                        {viewingInspection.leak_location && (
                          <p className="text-sm">Location: {viewingInspection.leak_location}</p>
                        )}
                        {viewingInspection.leak_repaired !== null && (
                          <p className="text-sm">
                            Repaired: {viewingInspection.leak_repaired ? "Yes" : "No"}
                          </p>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline">No Leak Detected</Badge>
                    )
                  ) : (
                    <span className="text-muted-foreground">Not performed</span>
                  )}
                </div>
              </div>

              {(viewingInspection.refrigerant_added_kg || viewingInspection.refrigerant_recovered_kg) && (
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  {viewingInspection.refrigerant_added_kg && (
                    <div>
                      <label className="text-sm text-muted-foreground">Refrigerant Added</label>
                      <p className="mt-1 font-mono">{viewingInspection.refrigerant_added_kg} kg</p>
                    </div>
                  )}
                  {viewingInspection.refrigerant_recovered_kg && (
                    <div>
                      <label className="text-sm text-muted-foreground">Refrigerant Recovered</label>
                      <p className="mt-1 font-mono">{viewingInspection.refrigerant_recovered_kg} kg</p>
                    </div>
                  )}
                </div>
              )}

              {viewingInspection.findings && (
                <div className="border-t pt-4">
                  <label className="text-sm text-muted-foreground">Findings</label>
                  <p className="mt-1 whitespace-pre-wrap">{viewingInspection.findings}</p>
                </div>
              )}

              {viewingInspection.recommendations && (
                <div className="border-t pt-4">
                  <label className="text-sm text-muted-foreground">Recommendations</label>
                  <p className="mt-1 whitespace-pre-wrap">{viewingInspection.recommendations}</p>
                </div>
              )}

              {viewingInspection.next_inspection_due && (
                <div className="border-t pt-4">
                  <label className="text-sm text-muted-foreground">Next Inspection Due</label>
                  <p className="mt-1 font-medium">
                    {format(new Date(viewingInspection.next_inspection_due), "PPP")}
                  </p>
                </div>
              )}

              <div className="border-t pt-4 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewingInspection(null);
                    navigate(`/equipment?highlight=${viewingInspection.equipment_id}`);
                  }}
                >
                  <Thermometer className="h-4 w-4 mr-2" />
                  View Equipment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
