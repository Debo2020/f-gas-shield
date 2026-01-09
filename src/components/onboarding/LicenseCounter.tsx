import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Minus, Plus, Users } from "lucide-react";
import { SUBSCRIPTION_TIERS, SubscriptionTier, formatPrice } from "@/lib/subscription";

interface LicenseCounterProps {
  tier: SubscriptionTier | null;
  licenseCount: number;
  onLicenseCountChange: (count: number) => void;
  isAnnual: boolean;
}

export function LicenseCounter({ tier, licenseCount, onLicenseCountChange, isAnnual }: LicenseCounterProps) {
  if (!tier) return null;

  const config = SUBSCRIPTION_TIERS[tier];
  const pricePerUser = isAnnual && "annual_price" in config ? config.annual_price : config.price;
  const totalMonthly = pricePerUser * licenseCount;
  const totalAnnual = totalMonthly * 12;
  const maxLicenses = config.limits.users === -1 ? 1000 : config.limits.users;

  const handleIncrement = () => {
    if (licenseCount < maxLicenses) {
      onLicenseCountChange(licenseCount + 1);
    }
  };

  const handleDecrement = () => {
    if (licenseCount > 1) {
      onLicenseCountChange(licenseCount - 1);
    }
  };

  const handleInputChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1 && num <= maxLicenses) {
      onLicenseCountChange(num);
    }
  };

  return (
    <Card className="border-2 border-dashed">
      <CardHeader className="text-center">
        <div className="mx-auto p-3 bg-primary/10 rounded-full mb-2">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>How many user licenses do you need?</CardTitle>
        <CardDescription>
          Each license allows one team member to access the platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* License counter */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handleDecrement}
            disabled={licenseCount <= 1}
            className="h-12 w-12 rounded-full"
          >
            <Minus className="h-5 w-5" />
          </Button>
          
          <div className="w-24">
            <Input
              type="number"
              min={1}
              max={maxLicenses}
              value={licenseCount}
              onChange={(e) => handleInputChange(e.target.value)}
              className="text-center text-2xl font-bold h-14"
            />
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleIncrement}
            disabled={licenseCount >= maxLicenses}
            className="h-12 w-12 rounded-full"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {licenseCount} {licenseCount === 1 ? "license" : "licenses"} × {formatPrice(pricePerUser, config.currency)}/user
        </p>

        {/* Price summary */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Monthly total</span>
            <span className="font-semibold">{formatPrice(totalMonthly, config.currency)}/month</span>
          </div>
          {isAnnual && (
            <div className="flex justify-between text-sm">
              <span>Billed annually</span>
              <span className="font-semibold">{formatPrice(totalAnnual, config.currency)}/year</span>
            </div>
          )}
        </div>

        {tier === "enterprise" && (
          <p className="text-sm text-center text-muted-foreground">
            For enterprise plans, contact us for custom pricing and volume discounts.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
