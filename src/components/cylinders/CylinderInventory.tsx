import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  QrCode,
  MoreHorizontal,
  ArrowUpFromLine,
  ArrowDownToLine,
  Pencil,
  Trash2,
  Package,
} from "lucide-react";
import { CylinderStatusBadge } from "./CylinderStatusBadge";
import { CylinderDialog } from "./CylinderDialog";
import { CylinderCheckInOutDialog } from "./CylinderCheckInOutDialog";
import { BulkCylinderDialog } from "./BulkCylinderDialog";
import { QRScannerDialog } from "./QRScannerDialog";
import { CylinderQRCode } from "./CylinderQRCode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";

type Cylinder = Database["public"]["Tables"]["refrigerant_cylinders"]["Row"];

export function CylinderInventory() {
  const { user, profile, hasRole } = useAuth();
  const isOwner = hasRole("owner");
  const isManager = hasRole("manager");
  const canManage = isOwner || isManager;

  const [cylinders, setCylinders] = useState<Cylinder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editCylinder, setEditCylinder] = useState<Cylinder | null>(null);
  const [checkInOutCylinder, setCheckInOutCylinder] = useState<Cylinder | null>(null);
  const [checkAction, setCheckAction] = useState<"check_out" | "check_in">("check_out");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [qrDialogCylinder, setQrDialogCylinder] = useState<Cylinder | null>(null);
  const [bulkAction, setBulkAction] = useState<"bulk_check_out" | "bulk_check_in" | null>(null);

  useEffect(() => {
    if (profile?.company_id) {
      fetchCylinders();
    }
  }, [profile?.company_id]);

  const fetchCylinders = async () => {
    if (!profile?.company_id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("refrigerant_cylinders")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCylinders(data || []);
    } catch (error) {
      console.error("Error fetching cylinders:", error);
      toast.error("Failed to load cylinder inventory");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (cylinder: Cylinder) => {
    if (!confirm(`Delete cylinder ${cylinder.cylinder_code}?`)) return;

    try {
      const { error } = await supabase
        .from("refrigerant_cylinders")
        .delete()
        .eq("id", cylinder.id);

      if (error) throw error;
      toast.success("Cylinder deleted");
      fetchCylinders();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete cylinder");
    }
  };

  const handleCylinderFound = (cylinder: Cylinder) => {
    if (cylinder.status === "checked_out") {
      setCheckAction("check_in");
    } else if (cylinder.status === "in_stock") {
      setCheckAction("check_out");
    }
    setCheckInOutCylinder(cylinder);
  };

  const filteredCylinders = cylinders.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.cylinder_code.toLowerCase().includes(q) ||
      c.refrigerant_type.toLowerCase().includes(q) ||
      (c.supplier_barcode || "").toLowerCase().includes(q) ||
      (c.manufacturer_serial || "").toLowerCase().includes(q) ||
      (c.rfid_tag || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesType = typeFilter === "all" || c.refrigerant_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const refrigerantTypes = [...new Set(cylinders.map((c) => c.refrigerant_type))];

  const summary = {
    total: cylinders.length,
    inStock: cylinders.filter((c) => c.status === "in_stock").length,
    checkedOut: cylinders.filter((c) => c.status === "checked_out").length,
    empty: cylinders.filter((c) => c.status === "empty").length,
    totalWeight: cylinders
      .filter((c) => c.status !== "disposed")
      .reduce((sum, c) => sum + Number(c.current_weight_kg), 0),
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Cylinders</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">In Stock</p>
          <p className="text-2xl font-bold text-green-600">{summary.inStock}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Checked Out</p>
          <p className="text-2xl font-bold text-orange-600">{summary.checkedOut}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Refrigerant</p>
          <p className="text-2xl font-bold">{summary.totalWeight.toFixed(1)} kg</p>
        </Card>
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {canManage && (
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Cylinder
            </Button>
          )}
          <Button variant="outline" onClick={() => setScannerOpen(true)}>
            <QrCode className="h-4 w-4 mr-2" />
            Scan QR
          </Button>
          {canManage && (
            <>
              <Button
                variant="outline"
                onClick={() => setBulkAction("bulk_check_out")}
                disabled={summary.inStock === 0}
              >
                <ArrowUpFromLine className="h-4 w-4 mr-2" />
                Bulk Check Out
              </Button>
              <Button
                variant="outline"
                onClick={() => setBulkAction("bulk_check_in")}
                disabled={summary.checkedOut === 0}
              >
                <ArrowDownToLine className="h-4 w-4 mr-2" />
                Bulk Check In
              </Button>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cylinders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="checked_out">Checked Out</SelectItem>
              <SelectItem value="empty">Empty</SelectItem>
              <SelectItem value="disposed">Disposed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {refrigerantTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredCylinders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No cylinders found</h3>
            <p className="text-muted-foreground mb-4">
              {cylinders.length === 0
                ? "Add your first cylinder to start tracking inventory"
                : "No cylinders match your search criteria"}
            </p>
            {canManage && cylinders.length === 0 && (
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Cylinder
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCylinders.map((cylinder) => (
                <TableRow key={cylinder.id}>
                  <TableCell className="font-mono font-bold">
                    {cylinder.cylinder_code}
                  </TableCell>
                  <TableCell>{cylinder.refrigerant_type}</TableCell>
                  <TableCell>
                    {Number(cylinder.current_weight_kg).toFixed(1)} kg
                    <span className="text-muted-foreground text-xs ml-1">
                      / {Number(cylinder.initial_weight_kg).toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <CylinderStatusBadge status={cylinder.status} />
                  </TableCell>
                  <TableCell>{cylinder.supplier || "-"}</TableCell>
                  <TableCell>
                    {format(new Date(cylinder.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setQrDialogCylinder(cylinder)}
                        >
                          <QrCode className="h-4 w-4 mr-2" />
                          View QR Code
                        </DropdownMenuItem>
                        {cylinder.status === "in_stock" && (
                          <DropdownMenuItem
                            onClick={() => {
                              setCheckAction("check_out");
                              setCheckInOutCylinder(cylinder);
                            }}
                          >
                            <ArrowUpFromLine className="h-4 w-4 mr-2" />
                            Check Out
                          </DropdownMenuItem>
                        )}
                        {cylinder.status === "checked_out" &&
                          cylinder.checked_out_to === user?.id && (
                            <DropdownMenuItem
                              onClick={() => {
                                setCheckAction("check_in");
                                setCheckInOutCylinder(cylinder);
                              }}
                            >
                              <ArrowDownToLine className="h-4 w-4 mr-2" />
                              Check In
                            </DropdownMenuItem>
                          )}
                        {canManage && (
                          <>
                            <DropdownMenuItem
                              onClick={() => setEditCylinder(cylinder)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {isOwner && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(cylinder)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Dialogs */}
      <CylinderDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchCylinders}
      />

      <CylinderDialog
        open={!!editCylinder}
        onOpenChange={(o) => !o && setEditCylinder(null)}
        onSuccess={fetchCylinders}
        cylinder={editCylinder}
      />

      <CylinderCheckInOutDialog
        open={!!checkInOutCylinder}
        onOpenChange={(o) => !o && setCheckInOutCylinder(null)}
        onSuccess={fetchCylinders}
        cylinder={checkInOutCylinder}
        action={checkAction}
      />

      <QRScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onCylinderFound={handleCylinderFound}
      />

      <Dialog
        open={!!qrDialogCylinder}
        onOpenChange={(o) => !o && setQrDialogCylinder(null)}
      >
        <DialogContent className="sm:max-w-[300px]">
          <DialogHeader>
            <DialogTitle>Cylinder QR Code</DialogTitle>
          </DialogHeader>
          {qrDialogCylinder && (
            <CylinderQRCode
              cylinderId={qrDialogCylinder.id}
              cylinderCode={qrDialogCylinder.cylinder_code}
              refrigerantType={qrDialogCylinder.refrigerant_type}
            />
          )}
        </DialogContent>
      </Dialog>

      <BulkCylinderDialog
        open={!!bulkAction}
        onOpenChange={(o) => !o && setBulkAction(null)}
        onSuccess={fetchCylinders}
        cylinders={cylinders}
        action={bulkAction || "bulk_check_out"}
      />
    </div>
  );
}
