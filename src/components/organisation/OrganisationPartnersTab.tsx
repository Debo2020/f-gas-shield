import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Handshake, Loader2, Copy, Users, PoundSterling } from "lucide-react";

interface Partner {
  id: string;
  name: string;
  contact_email: string | null;
  commission_pct: number | null;
  is_active: boolean;
  notes: string | null;
}
interface PartnerCode {
  id: string;
  partner_id: string;
  code: string;
  max_redemptions: number | null;
  redemptions_used: number;
  expires_at: string | null;
  is_active: boolean;
}
interface Redemption {
  id: string;
  partner_id: string;
  company_id: string | null;
  tier: string | null;
  mrr_pennies: number | null;
  status: string;
  redeemed_at: string;
}

export function OrganisationPartnersTab() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [codes, setCodes] = useState<PartnerCode[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [companies, setCompanies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    partner_name: "",
    contact_email: "",
    commission_pct: 0,
    notes: "",
    code: "",
    max_redemptions: "",
    expires_at: "",
  });

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: c }, { data: r }] = await Promise.all([
      supabase.from("partners").select("*").order("created_at", { ascending: false }),
      supabase.from("partner_codes").select("*"),
      supabase.from("partner_redemptions").select("*").order("redeemed_at", { ascending: false }),
    ]);
    setPartners(p ?? []);
    setCodes(c ?? []);
    setRedemptions(r ?? []);
    const companyIds = Array.from(new Set((r ?? []).map((x) => x.company_id).filter(Boolean))) as string[];
    if (companyIds.length) {
      const { data: cos } = await supabase.from("companies").select("id,name").in("id", companyIds);
      setCompanies(Object.fromEntries((cos ?? []).map((c: any) => [c.id, c.name])));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.partner_name.trim() || !form.code.trim()) {
      toast.error("Partner name and code are required");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("create-partner-code", {
        body: {
          partner_name: form.partner_name.trim(),
          contact_email: form.contact_email.trim() || null,
          commission_pct: Number(form.commission_pct) || 0,
          notes: form.notes.trim() || null,
          code: form.code.trim().toUpperCase(),
          max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null,
          expires_at: form.expires_at || null,
        },
      });
      if (error) throw error;
      toast.success("Partner & promo code created");
      setDialogOpen(false);
      setForm({ partner_name: "", contact_email: "", commission_pct: 0, notes: "", code: "", max_redemptions: "", expires_at: "" });
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create partner");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (codeId: string, active: boolean) => {
    const { error } = await supabase.functions.invoke("update-partner-code", {
      body: { partner_code_id: codeId, is_active: active },
    });
    if (error) toast.error(error.message);
    else { toast.success(active ? "Code activated" : "Code paused"); load(); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied ${code}`);
  };

  // Stats
  const totalSignups = redemptions.length;
  const activeSignups = redemptions.filter((r) => r.status === "active").length;
  const totalMrr = redemptions.filter((r) => r.status === "active").reduce((s, r) => s + (r.mrr_pennies ?? 0), 0);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><Handshake className="h-5 w-5" /> Partners & Loyalty Codes</CardTitle>
              <CardDescription>Issue merchant promo codes that give new annual customers 20% off for the first 3 months.</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> New Partner</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create partner & promo code</DialogTitle>
                  <DialogDescription>Generates a Stripe coupon (20% off, 3 months, annual Basic & Premium only) and a redeemable code.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div><Label>Partner name *</Label><Input value={form.partner_name} onChange={(e) => setForm({ ...form, partner_name: e.target.value })} placeholder="ACME Refrigeration" /></div>
                  <div><Label>Contact email</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="partner@example.com" /></div>
                  <div><Label>Promo code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="ACME20" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Max redemptions</Label><Input type="number" min={1} value={form.max_redemptions} onChange={(e) => setForm({ ...form, max_redemptions: e.target.value })} placeholder="Unlimited" /></div>
                    <div><Label>Commission %</Label><Input type="number" min={0} max={100} value={form.commission_pct} onChange={(e) => setForm({ ...form, commission_pct: Number(e.target.value) })} /></div>
                  </div>
                  <div><Label>Expires at</Label><Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
                  <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Handshake className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{partners.length}</p><p className="text-xs text-muted-foreground">Partners</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{activeSignups}<span className="text-sm font-normal text-muted-foreground"> / {totalSignups}</span></p><p className="text-xs text-muted-foreground">Active signups</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><PoundSterling className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">£{(totalMrr / 100).toFixed(0)}</p><p className="text-xs text-muted-foreground">Attributed MRR</p></div></div></CardContent></Card>
          </div>

          {partners.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><Handshake className="h-10 w-10 mx-auto mb-3 opacity-50" /><p>No partners yet. Create your first to start tracking referrals.</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Redemptions</TableHead>
                  <TableHead>Active signups</TableHead>
                  <TableHead>MRR</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((p) => {
                  const code = codes.find((c) => c.partner_id === p.id);
                  const reds = redemptions.filter((r) => r.partner_id === p.id);
                  const active = reds.filter((r) => r.status === "active").length;
                  const mrr = reds.filter((r) => r.status === "active").reduce((s, r) => s + (r.mrr_pennies ?? 0), 0);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.name}</div>
                        {p.contact_email && <div className="text-xs text-muted-foreground">{p.contact_email}</div>}
                      </TableCell>
                      <TableCell>
                        {code ? (
                          <button onClick={() => copyCode(code.code)} className="inline-flex items-center gap-1 font-mono text-sm hover:text-primary">
                            {code.code} <Copy className="h-3 w-3" />
                          </button>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        {code?.redemptions_used ?? 0}
                        {code?.max_redemptions ? <span className="text-muted-foreground"> / {code.max_redemptions}</span> : ""}
                      </TableCell>
                      <TableCell>{active}</TableCell>
                      <TableCell>£{(mrr / 100).toFixed(0)}</TableCell>
                      <TableCell className="text-right">
                        {code && (
                          <div className="inline-flex items-center gap-2">
                            <Badge variant={code.is_active ? "default" : "secondary"}>{code.is_active ? "Active" : "Paused"}</Badge>
                            <Switch checked={code.is_active} onCheckedChange={(v) => handleToggle(code.id, v)} />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {redemptions.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent redemptions</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Company</TableHead><TableHead>Partner</TableHead><TableHead>Tier</TableHead><TableHead>MRR</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {redemptions.slice(0, 20).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.redeemed_at).toLocaleDateString()}</TableCell>
                    <TableCell>{r.company_id ? (companies[r.company_id] ?? r.company_id.slice(0, 8)) : "—"}</TableCell>
                    <TableCell>{partners.find((p) => p.id === r.partner_id)?.name ?? "—"}</TableCell>
                    <TableCell className="capitalize">{r.tier ?? "—"}</TableCell>
                    <TableCell>£{((r.mrr_pennies ?? 0) / 100).toFixed(0)}</TableCell>
                    <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
