import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Truck, Eye, LogOut } from "lucide-react";

interface StoreVehicleTableProps {
  refreshKey?: number;
  storeId: string;
}

export function StoreVehicleTable({
  refreshKey,
  storeId,
}: StoreVehicleTableProps) {
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
  });

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["/api/dashboard/active-vehicles", storeId, refreshKey],
    queryFn: async () => {
      const res = await fetch(
        `/api/dashboard/active-vehicles?storeId=${storeId}`,
      );
      return res.json();
    },
    enabled: !!storeId,
  });

  const filteredVehicles = vehicles?.filter((vehicle: any) => {
    const matchesStatus =
      filters.status === "all" || vehicle.status === filters.status;
    const matchesSearch =
      filters.search === "" ||
      vehicle.vehicleNumber
        ?.toLowerCase()
        .includes(filters.search.toLowerCase()) ||
      vehicle.driverName
        ?.toLowerCase()
        .includes(filters.search.toLowerCase()) ||
      vehicle.vendorName?.toLowerCase().includes(filters.search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string, isExtended: boolean) => {
    if (isExtended) {
      return (
        <Badge
          variant="destructive"
          className="bg-warning text-warning-foreground"
        >
          Extended Stay
        </Badge>
      );
    }

    switch (status) {
      case "In":
        return (
          <Badge variant="default" className="bg-success">
            Checked In
          </Badge>
        );
      case "Out":
        return (
          <Badge variant="secondary" className="bg-error">
            Checked Out
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading vehicles...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select
          value={filters.status}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, status: value }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="In">Currently Inside</SelectItem>
            <SelectItem value="Out">Checked Out</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search vehicle..."
          value={filters.search}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, search: e.target.value }))
          }
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVehicles && filteredVehicles.length > 0 ? (
              filteredVehicles.map((vehicle: any) => (
                <TableRow key={vehicle.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-metro-blue rounded-lg flex items-center justify-center">
                        <Truck className="text-white h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {vehicle.vehicleNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {vehicle.vendorName}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{vehicle.driverName}</TableCell>
                  <TableCell>
                    {getStatusBadge(vehicle.status, vehicle.isExtended)}
                  </TableCell>
                  <TableCell>{vehicle.duration}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-error hover:text-red-700"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-gray-500"
                >
                  No vehicles found matching your criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
