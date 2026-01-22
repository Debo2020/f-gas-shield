import { MapPin, Phone, Mail, User, ChevronRight, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Site {
  id: string;
  name: string;
  address: string;
  city: string | null;
  postcode: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  client?: {
    id: string;
    name: string;
  } | null;
}

interface SiteCardProps {
  site: Site;
}

export function SiteCard({ site }: SiteCardProps) {
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
        <div>
          <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
            {site.name}
          </CardTitle>
          {site.client && (
            <Badge variant="outline" className="mt-1 text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              {site.client.name}
            </Badge>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
