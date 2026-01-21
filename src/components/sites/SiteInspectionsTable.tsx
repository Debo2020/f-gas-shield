import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ClipboardCheck,
  Loader2,
  Search,
  Plus,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { InspectionDialog } from "@/components/inspections/InspectionDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Inspection {
  id: string;
  inspection_date: string;
  result: string;
  inspector_name: string;
  leak_check_performed: boolean;
  leak_detected: boolean | null;
  equipment: {
    id: string;
    name: string;
    refrigerant_type: string;
  } | null;
}

interface SiteInspectionsTableProps {
  siteId: string;
  siteName: string;
}

export function SiteInspectionsTable({ siteId, siteName }: SiteInspectionsTableProps) {
  const navigate = useNavigate();
  const { profile, hasRole, hasActiveLicense } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const isOwner = hasRole("owner");
  const isManager = hasRole("manager");
  const isEngineer = hasRole("engineer");
  const canAddInspection = (isOwner || isManager || isEngineer) && (isOwner || hasActiveLicense);

  const fetchInspections = async () => {
    if (!profile?.company_id) return;

    try {
      // Get equipment at this site first
      const { data: equipmentData, error: equipmentError } = await supabase
        .from("equipment")
        .select("id")
        .eq("site_id", siteId)
        .eq("company_id", profile.company_id);

      if (equipmentError) throw equipmentError;

      const equipmentIds = equipmentData?.map((e) => e.id) || [];

      if (equipmentIds.length === 0) {
        setInspections([]);
        setLoading(false);
        return;
      }

      // Get inspections for this equipment
      const { data, error } = await supabase
        .from("inspections")
        .select(`
          id,
          inspection_date,
          result,
          inspector_name,
          leak_check_performed,
          leak_detected,
          equipment:equipment_id (
            id,
            name,
            refrigerant_type
          )
        `)
        .in("equipment_id", equipmentIds)
        .eq("company_id", profile.company_id)
        .order("inspection_date", { ascending: false });

      if (error) throw error;
      setInspections(data || []);
    } catch (error: any) {
      console.error("Error fetching inspections:", error);
      toast.error("Failed to load inspections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, [profile?.company_id, siteId]);

  const handleAddInspection = async (values: any) => {
    if (!profile?.company_id) return;

    try {
      const { error } = await supabase.from("inspections").insert({
        company_id: profile.company_id,
        equipment_id: values.equipment_id,
        inspection_date: values.inspection_date,
        result: values.result,
        inspector_name: values.inspector_name,
        inspector_certificate_number: values.inspector_certificate_number || null,
        leak_check_performed: values.leak_check_performed,
        leak_detected: values.leak_check_performed ? values.leak_detected : null,
        leak_location: values.leak_detected ? values.leak_location : null,
        leak_repaired: values.leak_detected ? values.leak_repaired : null,
        refrigerant_added_kg: values.refrigerant_added_kg || null,
        refrigerant_recovered_kg: values.refrigerant_recovered_kg || null,
        findings: values.findings || null,
        recommendations: values.recommendations || null,
      });

      if (error) throw error;

      toast.success("Inspection recorded successfully");
      setIsAddDialogOpen(false);
      fetchInspections();
    } catch (error: any) {
      toast.error(error.message || "Failed to record inspection");
    }
  };

  const getResultBadge = (result: string) => {
    switch (result.toLowerCase()) {
      case "pass":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Pass
          </Badge>
        );
      case "fail":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" /> Fail
          </Badge>
        );
      case "repair_required":
      case "repair required":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <AlertTriangle className="h-3 w-3 mr-1" /> Repair Required
          </Badge>
        );
      default:
        return <Badge variant="outline">{result}</Badge>;
    }
  };

  const filteredInspections = inspections.filter((insp) => {
    const matchesSearch =
      !searchQuery ||
      insp.equipment?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      insp.inspector_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesResult = resultFilter === "all" || insp.result.toLowerCase() === resultFilter;

    return matchesSearch && matchesResult;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Inspections at {siteName}
            </CardTitle>
            <CardDescription>
              All inspection records for equipment at this site
            </CardDescription>
          </div>
          {canAddInspection && (
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Record Inspection
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search equipment or inspector..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Results" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="fail">Fail</SelectItem>
                <SelectItem value="repair_required">Repair Required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {filteredInspections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">
                {inspections.length === 0
                  ? "No inspections recorded for this site yet"
                  : "No inspections match your filters"}
              </p>
              {canAddInspection && inspections.length === 0 && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Record First Inspection
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Leak Check</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInspections.map((insp) => (
                    <TableRow
                      key={insp.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/equipment/${insp.equipment?.id}`)}
                    >
                      <TableCell className="font-medium">
                        {format(new Date(insp.inspection_date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{insp.equipment?.name || "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {insp.equipment?.refrigerant_type}
                          </p>
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
                            <Badge variant="outline" className="text-xs text-green-600">
                              No Leak
                            </Badge>
                          )
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{insp.inspector_name}</TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Inspection Dialog */}
      <InspectionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddInspection}
        companyId={profile?.company_id || ""}
        currentUserName={profile?.full_name || ""}
        defaultSiteId={siteId}
      />
    </>
  );
}
