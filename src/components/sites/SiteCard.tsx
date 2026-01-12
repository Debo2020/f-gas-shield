import { MapPin, Phone, Mail, User, MoreVertical, Pencil, Trash2, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Site {
  id: string;
  name: string;
  address: string;
  city: string | null;
  postcode: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
}

interface SiteCardProps {
  site: Site;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function SiteCard({ site, canEdit, canDelete, onEdit, onDelete }: SiteCardProps) {
  const navigate = useNavigate();
  const fullAddress = [site.address, site.city, site.postcode].filter(Boolean).join(", ");

  const handleCardClick = () => {
    navigate(`/sites/${site.id}`);
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer group"
      onClick={handleCardClick}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
          {site.name}
        </CardTitle>
        <div className="flex items-center gap-1">
          {(canEdit || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Site
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Site
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <span className="text-muted-foreground">{fullAddress}</span>
        </div>

        {site.contact_name && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{site.contact_name}</span>
          </div>
        )}

        {site.contact_phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            <a 
              href={`tel:${site.contact_phone}`} 
              className="text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {site.contact_phone}
            </a>
          </div>
        )}

        {site.contact_email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <a 
              href={`mailto:${site.contact_email}`} 
              className="text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {site.contact_email}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
