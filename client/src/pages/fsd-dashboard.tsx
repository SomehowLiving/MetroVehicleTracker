
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Building, 
  LogOut, 
  User, 
  RefreshCw,
  Download,
  Clock,
  Truck,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useRequireAuth } from "@/hooks/use-auth";
import { useAuth } from "@/lib/auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { VehicleTable } from "@/components/vehicle-table";
import * as XLSX from 'xlsx';

export default function FsdDashboard() {
  const { user } = useRequireAuth("fsd");
  const { logout } = useAuth();
  const { isConnected, lastMessage } = useWebSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkinId, setCheckinId] = useState<number | null>(null);

  // FSD checkin form
  const [fsdForm, setFsdForm] = useState({
    name: user?.name || "",
    designation: "FSD Supervisor",
    aadhaarNumber: "",
    phoneNumber: "",
    notes: "",
  });

  // Check FSD checkin status
  const { data: fsdCheckins } = useQuery({
    queryKey: ["/api/fsd/checkins", user?.storeId, refreshKey],
    queryFn: async () => {
      if (!user?.storeId) return [];
      const res = await fetch(`/api/fsd/checkins?storeId=${user.storeId}`);
      return res.json();
    },
    enabled: !!user?.storeId,
  });

  useEffect(() => {
    if (fsdCheckins) {
      const activeCheckin = fsdCheckins.find((c: any) => c.status === "In" && c.fsdId === user?.id);
      if (activeCheckin) {
        setIsCheckedIn(true);
        setCheckinId(activeCheckin.id);
      }
    }
  }, [fsdCheckins, user?.id]);

  // Store data
  const { data: storeData } = useQuery({
    queryKey: ["/api/dashboard/kpis", user?.storeId, refreshKey],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/kpis?storeId=${user?.storeId}`);
      return res.json();
    },
    enabled: !!user?.storeId,
  });

  // Active vehicles for this store
  const { data: activeVehicles } = useQuery({
    queryKey: ["/api/dashboard/active-vehicles", user?.storeId, refreshKey],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/active-vehicles?storeId=${user?.storeId}`);
      return res.json();
    },
    enabled: !!user?.storeId,
  });

  // Recent activity for this store
  const { data: recentActivity } = useQuery({
    queryKey: ["/api/dashboard/recent-activity", user?.storeId, refreshKey],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/recent-activity?storeId=${user?.storeId}&limit=20`);
      return res.json();
    },
    enabled: !!user?.storeId,
  });

  // FSD checkin mutation
  const checkinMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/fsd/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fsdId: user?.id,
          storeId: user?.storeId,
          ...fsdForm,
        }),
      });
      if (!res.ok) throw new Error("Failed to check in");
      return res.json();
    },
    onSuccess: (data) => {
      setIsCheckedIn(true);
      setCheckinId(data.id);
      toast({ title: "Success", description: "Checked in successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/fsd/checkins"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to check in",
        variant: "destructive",
      });
    },
  });

  // FSD checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/fsd/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinId }),
      });
      if (!res.ok) throw new Error("Failed to check out");
      return res.json();
    },
    onSuccess: () => {
      setIsCheckedIn(false);
      setCheckinId(null);
      toast({ title: "Success", description: "Checked out successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/fsd/checkins"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to check out",
        variant: "destructive",
      });
    },
  });

  // Export to Excel
  const exportToExcel = () => {
    if (!activeVehicles || activeVehicles.length === 0) {
      toast({
        title: "No Data",
        description: "No vehicle data to export",
        variant: "destructive",
      });
      return;
    }

    const exportData = activeVehicles.map((vehicle: any) => ({
      "Vehicle Number": vehicle.vehicleNumber,
      "Driver Name": vehicle.driverName,
      "Vendor Name": vehicle.vendorName,
      "Entry Time": new Date(vehicle.createdAt).toLocaleString(),
      "Duration": vehicle.duration,
      "Opening KM": vehicle.openingKm || "N/A",
      "Status": vehicle.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vehicles");
    
    const fileName = `${user?.name?.replace(/\s+/g, "_")}_vehicles_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Success",
      description: "Data exported successfully",
    });
  };

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage) {
      if (
        lastMessage.type === "vehicle_entry" ||
        lastMessage.type === "vehicle_exit" ||
        lastMessage.type === "status_update"
      ) {
        setRefreshKey((prev) => prev + 1);
      }
    }
  }, [lastMessage]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Building className="text-white h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Store Supervisor Dashboard
                </h1>
                <p className="text-sm text-gray-600">
                  {user.name} - Store Management
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${isConnected ? "bg-success" : "bg-error"}`}
                />
                <span className="text-sm text-gray-600">
                  {isConnected ? "Live" : "Offline"}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="text-gray-600 h-4 w-4" />
                </div>
                <span className="text-sm text-gray-700">{user.name}</span>
              </div>
              <Button
                variant="ghost"
                onClick={logout}
                className="text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* FSD Checkin Section */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Daily Attendance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isCheckedIn ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={fsdForm.name}
                        onChange={(e) => setFsdForm({ ...fsdForm, name: e.target.value })}
                        placeholder="Enter your name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="designation">Designation</Label>
                      <Input
                        id="designation"
                        value={fsdForm.designation}
                        onChange={(e) => setFsdForm({ ...fsdForm, designation: e.target.value })}
                        placeholder="Enter your designation"
                      />
                    </div>
                    <div>
                      <Label htmlFor="aadhaar">Aadhaar Number (Optional)</Label>
                      <Input
                        id="aadhaar"
                        value={fsdForm.aadhaarNumber}
                        onChange={(e) => setFsdForm({ ...fsdForm, aadhaarNumber: e.target.value })}
                        placeholder="Enter 12-digit Aadhaar number"
                        maxLength={12}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number (Optional)</Label>
                      <Input
                        id="phone"
                        value={fsdForm.phoneNumber}
                        onChange={(e) => setFsdForm({ ...fsdForm, phoneNumber: e.target.value })}
                        placeholder="Enter phone number"
                        maxLength={10}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      value={fsdForm.notes}
                      onChange={(e) => setFsdForm({ ...fsdForm, notes: e.target.value })}
                      placeholder="Any additional notes"
                    />
                  </div>
                  <Button
                    onClick={() => checkinMutation.mutate()}
                    disabled={checkinMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {checkinMutation.isPending ? "Checking In..." : "Check In"}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Badge className="bg-green-600">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Checked In
                    </Badge>
                    <span className="text-sm text-gray-600">
                      You are currently checked in for your shift
                    </span>
                  </div>
                  <Button
                    onClick={() => checkoutMutation.mutate()}
                    disabled={checkoutMutation.isPending}
                    variant="outline"
                    className="border-red-500 text-red-600 hover:bg-red-500 hover:text-white"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {checkoutMutation.isPending ? "Checking Out..." : "Check Out"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Store Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Today's Check-ins</h3>
                  <p className="text-2xl font-bold text-gray-900">{storeData?.todaysCheckins || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Currently Inside</h3>
                  <p className="text-2xl font-bold text-gray-900">{storeData?.currentlyInside || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Average Stay</h3>
                  <p className="text-2xl font-bold text-gray-900">{storeData?.averageStayHours || 0}h</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Extended Stays</h3>
                  <p className="text-2xl font-bold text-gray-900">{storeData?.extendedStays || 0}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Vehicle Status */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Live Vehicle Status</CardTitle>
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRefreshKey((prev) => prev + 1)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToExcel}
                  className="text-green-600 border-green-600 hover:bg-green-600 hover:text-white"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <VehicleTable refreshKey={refreshKey} storeId={user.storeId} />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.map((activity: any) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${activity.status === "In" ? "bg-green-500" : "bg-red-500"}`}
                    />
                    <div className="flex-1">
                      <div className="text-sm text-gray-900">
                        Vehicle <strong>{activity.vehicleNumber}</strong>{" "}
                        {activity.status === "In" ? "checked in" : "checked out"}{" "}
                        from <strong>{activity.vendorName}</strong>
                      </div>
                      <div className="text-xs text-gray-500">
                        Driver: {activity.driverName} | {new Date(activity.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No recent activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
