import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import {
  Eye,
  ClipboardCheck,
  Pencil,
  Tag,
  MapPin,
  Thermometer,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Camera,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";

interface Equipment {
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
  sites?: {
    name: string;
  } | null;
}

interface EquipmentQuickActionsProps {
  equipment: Equipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordInspection?: () => void;
  onEdit?: () => void;
  onGenerateLabel?: () => void;
  onTakePhoto?: () => void;
}

export function EquipmentQuickActions({
  equipment,
  open,
  onOpenChange,
  onRecordInspection,
  onEdit,
  onGenerateLabel,
  onTakePhoto,
}: EquipmentQuickActionsProps) {
  const navigate = useNavigate();
  const { hasRole, hasActiveLicense } = useAuth();
  
  const isOwner = hasRole("owner");
  const isManager = hasRole("manager");
  const canEdit = (isOwner || isManager) && (isOwner || hasActiveLicense);

  if (!equipment) return null;

  const getInspectionStatus = () => {
    if (!equipment.next_inspection_due) {
      return { status: "unknown", label: "Not scheduled", variant: "outline" as const, icon: Clock };
    }

    const daysUntil = differenceInDays(new Date(equipment.next_inspection_due), new Date());

    if (daysUntil < 0) {
      return { 
        status: "overdue", 
        label: `Overdue by ${Math.abs(daysUntil)} days`, 
        variant: "destructive" as const,
        icon: AlertTriangle,
      };
    } else if (daysUntil <= 30) {
      return { 
        status: "due-soon", 
        label: `Due in ${daysUntil} days`, 
        variant: "secondary" as const,
        icon: Clock,
      };
    } else {
      return { 
        status: "compliant", 
        label: "Compliant", 
        variant: "default" as const,
        icon: CheckCircle2,
      };
    }
  };

  const inspectionStatus = getInspectionStatus();
  const StatusIcon = inspectionStatus.icon;

  const handleViewDetails = () => {
    onOpenChange(false);
    navigate(`/equipment/${equipment.id}`);
  };

  const handleRecordInspection = () => {
    onOpenChange(false);
    navigate(`/inspections?equipment=${equipment.id}`);
  };

  const handleEdit = () => {
    if (onEdit) {
      onOpenChange(false);
      onEdit();
    }
  };

  const handleGenerateLabel = () => {
    if (onGenerateLabel) {
      onOpenChange(false);
      onGenerateLabel();
    }
  };

  const handleTakePhoto = () => {
    if (onTakePhoto) {
      onOpenChange(false);
      onTakePhoto();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-xl">{equipment.name}</SheetTitle>
              <SheetDescription className="flex items-center gap-1.5 mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {equipment.sites?.name || "Unknown site"}
              </SheetDescription>
            </div>
            <Badge variant={inspectionStatus.variant} className="flex items-center gap-1">
              <StatusIcon className="h-3 w-3" />
              {inspectionStatus.label}
            </Badge>
          </div>
        </SheetHeader>

        {/* Equipment Summary */}
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Thermometer className="h-3 w-3" />
              Refrigerant
            </p>
            <p className="font-medium">{equipment.refrigerant_type}</p>
            <p className="text-sm text-muted-foreground">{equipment.refrigerant_charge_kg} kg</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">CO₂ Equivalent</p>
            <p className="font-medium">
              {equipment.co2_equivalent_tonnes?.toFixed(2) || "—"} tonnes
            </p>
          </div>

          {equipment.manufacturer && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Manufacturer</p>
              <p className="font-medium">{equipment.manufacturer}</p>
              {equipment.model && (
                <p className="text-sm text-muted-foreground">{equipment.model}</p>
              )}
            </div>
          )}

          {equipment.next_inspection_due && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Next Inspection
              </p>
              <p className="font-medium">
                {format(new Date(equipment.next_inspection_due), "PP")}
              </p>
            </div>
          )}
        </div>

        <Separator className="my-2" />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 pt-4 pb-2">
          <Button 
            onClick={handleViewDetails} 
            variant="default" 
            className="h-14 flex flex-col gap-1"
          >
            <Eye className="h-5 w-5" />
            <span className="text-xs">View Details</span>
          </Button>
          
          <Button 
            onClick={handleRecordInspection} 
            variant="secondary" 
            className="h-14 flex flex-col gap-1"
          >
            <ClipboardCheck className="h-5 w-5" />
            <span className="text-xs">Record Inspection</span>
          </Button>

          {canEdit && onEdit && (
            <Button 
              onClick={handleEdit} 
              variant="outline" 
              className="h-14 flex flex-col gap-1"
            >
              <Pencil className="h-5 w-5" />
              <span className="text-xs">Update Info</span>
            </Button>
          )}

          {onGenerateLabel && (
            <Button 
              onClick={handleGenerateLabel} 
              variant="outline" 
              className="h-14 flex flex-col gap-1"
            >
              <Tag className="h-5 w-5" />
              <span className="text-xs">Generate Label</span>
            </Button>
          )}

          {onTakePhoto && (
            <Button 
              onClick={handleTakePhoto} 
              variant="outline" 
              className="h-14 flex flex-col gap-1"
            >
              <Camera className="h-5 w-5" />
              <span className="text-xs">Take Photo</span>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
