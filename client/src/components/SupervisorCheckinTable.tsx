import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserCheck } from "lucide-react";

export function SupervisorCheckinTable({ supervisors }: { supervisors: any[] }) {
  if (!supervisors || supervisors.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-gray-500">
        No vendor supervisors are currently checked in.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Supervisor</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Check-in Time</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {supervisors.map((supervisor: any) => (
            <TableRow key={supervisor.id}>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <UserCheck className="h-4 w-4 text-gray-600" />
                  </div>
                  <span>{supervisor.name}</span>
                </div>
              </TableCell>
              <TableCell>{supervisor.vendorName || "N/A"}</TableCell>
              <TableCell>
                {supervisor.checkinTime
                  ? new Date(supervisor.checkinTime).toLocaleString()
                  : "Unknown"}
              </TableCell>
              <TableCell>
                <Badge className="bg-green-100 text-green-800">Checked In</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
