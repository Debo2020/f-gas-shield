import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown } from "lucide-react";

interface GasMovement {
  id: string;
  inspection_date: string;
  equipment_name: string;
  site_name: string;
  refrigerant_type: string;
  refrigerant_added_kg: number | null;
  refrigerant_recovered_kg: number | null;
  inspector_name: string;
}

interface GasLogTableProps {
  movements: GasMovement[];
}

export function GasLogTable({ movements }: GasLogTableProps) {
  if (movements.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No gas movements recorded for the selected period.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Equipment</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Refrigerant</TableHead>
            <TableHead className="text-right">Added (kg)</TableHead>
            <TableHead className="text-right">Recovered (kg)</TableHead>
            <TableHead>Engineer</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((movement) => (
            <TableRow key={movement.id}>
              <TableCell className="font-medium">
                {format(new Date(movement.inspection_date), "dd MMM yyyy")}
              </TableCell>
              <TableCell>{movement.equipment_name}</TableCell>
              <TableCell>{movement.site_name}</TableCell>
              <TableCell>
                <Badge variant="outline">{movement.refrigerant_type}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {movement.refrigerant_added_kg ? (
                  <span className="flex items-center justify-end gap-1 text-destructive">
                    <ArrowUp className="h-3 w-3" />
                    {movement.refrigerant_added_kg.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {movement.refrigerant_recovered_kg ? (
                  <span className="flex items-center justify-end gap-1 text-green-600">
                    <ArrowDown className="h-3 w-3" />
                    {movement.refrigerant_recovered_kg.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>{movement.inspector_name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
