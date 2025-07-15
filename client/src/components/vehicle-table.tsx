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

interface VehicleTableProps {
  refreshKey?: number;
}

export function VehicleTable({ refreshKey }: VehicleTableProps) {
  const [filters, setFilters] = useState({
    store: "all",
    status: "all",
    search: "",
  });

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["/api/dashboard/active-vehicles", refreshKey],
  });

  const { data: stores } = useQuery({
    queryKey: ["/api/stores"],
  });

  const filteredVehicles = vehicles?.filter((vehicle: any) => {
    const matchesStore =
      !filters.store ||
      filters.store === "all" ||
      vehicle.storeId.toString() === filters.store;
    const matchesStatus =
      !filters.status ||
      filters.status === "all" ||
      vehicle.status === filters.status;
    const matchesSearch =
      !filters.search ||
      vehicle.vehicleNumber
        .toLowerCase()
        .includes(filters.search.toLowerCase()) ||
      vehicle.driverName.toLowerCase().includes(filters.search.toLowerCase());

    return matchesStore && matchesStatus && matchesSearch;
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
          value={filters.store}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, store: value }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Stores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stores</SelectItem>
            {stores?.map((store: any) => (
              <SelectItem key={store.id} value={store.id.toString()}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
            <SelectItem value="In">Checked In</SelectItem>
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
              <TableHead>Store</TableHead>
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
                  <TableCell>{vehicle.storeName}</TableCell>
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
                  colSpan={6}
                  className="text-center py-8 text-gray-500"
                >
                  No vehicles found matching your criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {(!filteredVehicles || filteredVehicles.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            No vehicles found matching your criteria
          </div>
        )}
      </div>
    </div>
  );
}