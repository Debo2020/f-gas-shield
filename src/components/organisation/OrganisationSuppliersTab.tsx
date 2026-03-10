import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2, Truck, Upload, Download } from "lucide-react";
import { CSVBatchUploadDialog } from "@/components/batch-upload/CSVBatchUploadDialog";
import { downloadSupplierTemplate } from "@/lib/csv-templates";

interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  account_number: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export function OrganisationSuppliersTab() {
  const { profile, hasRole } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [batchUploadOpen, setBatchUploadOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    account_number: "",
    notes: "",
  });

  const canManageSuppliers = hasRole("owner") || hasRole("manager") || hasRole("stores_manager");
  const canDelete = hasRole("owner");

  const fetchSuppliers = async () => {
    if (!profile?.company_id) return;

    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("name");

    if (error) {
      toast.error("Failed to load suppliers");
      console.error(error);
    } else {
      setSuppliers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, [profile?.company_id]);

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        contact_name: supplier.contact_name || "",
        contact_email: supplier.contact_email || "",
        contact_phone: supplier.contact_phone || "",
        address: supplier.address || "",
        account_number: supplier.account_number || "",
        notes: supplier.notes || "",
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        address: "",
        account_number: "",
        notes: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) return;

    setSubmitting(true);

    try {
      if (editingSupplier) {
        const { error } = await supabase
          .from("suppliers")
          .update({
            name: formData.name,
            contact_name: formData.contact_name || null,
            contact_email: formData.contact_email || null,
            contact_phone: formData.contact_phone || null,
            address: formData.address || null,
            account_number: formData.account_number || null,
            notes: formData.notes || null,
          })
          .eq("id", editingSupplier.id);

        if (error) throw error;
        toast.success("Supplier updated");
      } else {
        const { error } = await supabase.from("suppliers").insert({
          company_id: profile.company_id,
          name: formData.name,
          contact_name: formData.contact_name || null,
          contact_email: formData.contact_email || null,
          contact_phone: formData.contact_phone || null,
          address: formData.address || null,
          account_number: formData.account_number || null,
          notes: formData.notes || null,
        });

        if (error) throw error;
        toast.success("Supplier added");
      }

      setDialogOpen(false);
      fetchSuppliers();
    } catch (error: any) {
      toast.error(error.message || "Failed to save supplier");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`Delete supplier "${supplier.name}"? This cannot be undone.`)) {
      return;
    }

    const { error } = await supabase.from("suppliers").delete().eq("id", supplier.id);

    if (error) {
      toast.error("Failed to delete supplier");
    } else {
      toast.success("Supplier deleted");
      fetchSuppliers();
    }
  };

  const handleToggleActive = async (supplier: Supplier) => {
    const { error } = await supabase
      .from("suppliers")
      .update({ is_active: !supplier.is_active })
      .eq("id", supplier.id);

    if (error) {
      toast.error("Failed to update supplier");
    } else {
      toast.success(supplier.is_active ? "Supplier deactivated" : "Supplier activated");
      fetchSuppliers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Suppliers
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage refrigerant suppliers and merchants
          </p>
        </div>
        {canManageSuppliers && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Account No.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No suppliers added yet</p>
                    {canManageSuppliers && (
                      <Button variant="link" onClick={() => handleOpenDialog()} className="mt-2">
                        Add your first supplier
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div className="font-medium">{supplier.name}</div>
                      {supplier.address && (
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {supplier.address}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {supplier.contact_name && <div>{supplier.contact_name}</div>}
                      {supplier.contact_email && (
                        <div className="text-sm text-muted-foreground">{supplier.contact_email}</div>
                      )}
                      {supplier.contact_phone && (
                        <div className="text-sm text-muted-foreground">{supplier.contact_phone}</div>
                      )}
                    </TableCell>
                    <TableCell>{supplier.account_number || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={supplier.is_active ? "default" : "secondary"}>
                        {supplier.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canManageSuppliers && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(supplier)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(supplier)}>
                              {supplier.is_active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            {canDelete && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(supplier)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
            <DialogDescription>
              {editingSupplier ? "Update supplier details" : "Add a new refrigerant supplier or merchant"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_number">Account No.</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Phone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingSupplier ? "Update" : "Add Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
