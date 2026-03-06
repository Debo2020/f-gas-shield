import { ADDON_MODULES, GasCertificateType } from "@/lib/gas-addons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Home, Building2, TestTube, AlertTriangle } from "lucide-react";

const typeIcons: Record<GasCertificateType, React.ComponentType<{ className?: string }>> = {
  landlord_gas_safety: Home,
  homeowner_gas_safety: Home,
  nd_gas_safety: Building2,
  nd_gas_testing_purging: TestTube,
  gas_warning_notice: AlertTriangle,
};

const typeDescriptions: Record<GasCertificateType, string> = {
  landlord_gas_safety: "Annual gas safety inspection for rented properties",
  homeowner_gas_safety: "Gas safety record for owner-occupied properties",
  nd_gas_safety: "Non-domestic gas safety record for commercial premises",
  nd_gas_testing_purging: "Strength test, tightness test, and purging certificate",
  gas_warning_notice: "Report unsafe gas installations with classification",
};

interface CertificateTypeSelectorProps {
  onSelect: (type: GasCertificateType) => void;
}

export function CertificateTypeSelector({ onSelect }: CertificateTypeSelectorProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ADDON_MODULES.natural_gas.certificate_types.map(({ value, label }) => {
        const Icon = typeIcons[value] || FileText;
        return (
          <Card
            key={value}
            className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
            onClick={() => onSelect(value)}
          >
            <CardHeader className="pb-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{typeDescriptions[value]}</CardDescription>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
