import { AppLayout } from "@/components/layout/AppLayout";
import { PlatformAdminGuard } from "@/components/admin/PlatformAdminGuard";
import { OrganisationPartnersTab } from "@/components/organisation/OrganisationPartnersTab";
import { ShieldCheck } from "lucide-react";

export default function AdminPartners() {
  return (
    <PlatformAdminGuard>
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-primary" />
              Admin · Partners & Loyalty
            </h1>
            <p className="text-muted-foreground mt-1">
              FTrack back office. Mint merchant promo codes, track redemptions, and monitor attributed MRR.
            </p>
          </div>
          <OrganisationPartnersTab />
        </div>
      </AppLayout>
    </PlatformAdminGuard>
  );
}
