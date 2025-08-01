import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Building,
  LogOut,
  User,
  RefreshCw,
  Download,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  UserCheck,
  UserX,
  Search,
  History,
  Users,
  TrendingUp,
} from "lucide-react";
import { useRequireAuth } from "@/hooks/use-auth";
import { useAuth } from "@/lib/auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { VehicleTable } from "@/components/vehicle-table";
import { StoreVehicleTable } from "@/components/StoreVehicleTable";
import * as XLSX from "xlsx";
import { SupervisorCheckinTable } from "@/components/SupervisorCheckinTable";

export default function FsdDashboard() {
  const { user } = useRequireAuth("fsd");
  const { logout } = useAuth();
  const { isConnected, lastMessage } = useWebSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkinId, setCheckinId] = useState<number | null>(null);
  const storeId = user?.storeId;

  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [supervisorForm, setSupervisorForm] = useState({
    name: "",
    aadhaarNumber: "",
    phoneNumber: "",
    vendorId: "",
    notes: "",
  });
  // Vehicle data for this store
  const { data: activeVehicles } = useQuery({
    queryKey: ["/api/dashboard/active-vehicles", user?.storeId, refreshKey],
    queryFn: async () => {
      const res = await fetch(
        `/api/dashboard/active-vehicles?storeId=${user?.storeId}`,
      );
      return res.json();
    },
    enabled: !!user?.storeId,
  });

  // KPI data for this store
  const { data: kpis } = useQuery({
    queryKey: ["/api/dashboard/kpis", user?.storeId, refreshKey],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/kpis?storeId=${user?.storeId}`);
      return res.json();
    },
    enabled: !!user?.storeId,
  });

  // Recent activity for this store
  const { data: recentActivity } = useQuery({
    queryKey: ["/api/dashboard/recent-activity", user?.storeId, refreshKey],
    queryFn: async () => {
      const res = await fetch(
        `/api/dashboard/recent-activity?storeId=${user?.storeId}&limit=20`,
      );
      return res.json();
    },
    enabled: !!user?.storeId,
  });
  // Export to Excel
  const exportToExcel = async () => {
    try {
      // Fetch all vehicles including checked out ones for export
      const response = await fetch(
        `/api/dashboard/active-vehicles?storeId=${user?.storeId}&includeAll=true`,
      );
      const allVehicles = await response.json();

      if (!allVehicles || allVehicles.length === 0) {
        toast({
          title: "No Data",
          description: "No vehicle data to export",
          variant: "destructive",
        });
        return;
      }

      const exportData = allVehicles.map((vehicle: any) => ({
        "Vehicle Number": vehicle.vehicleNumber || "N/A",
        "Driver Name": vehicle.driverName || "N/A",
        "Vendor Name": vehicle.vendorName || "N/A",
        "Entry Time": vehicle.createdAt
          ? new Date(vehicle.createdAt).toLocaleString()
          : "N/A",
        "Exit Time": vehicle.closingKmTimestamp
          ? new Date(vehicle.closingKmTimestamp).toLocaleString()
          : "Not yet",
        Duration: vehicle.duration || "N/A",
        "Opening KM": vehicle.openingKm || 0,
        "Closing KM": vehicle.closingKm || "N/A",
        Status: vehicle.status || "Unknown",
        Store: vehicle.storeName || "N/A",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Vehicle Report");

      const fileName = `Store${user?.storeId || "Unknown"}_Vehicle_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Export Successful",
        description: `Data exported to ${fileName}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Fetch active supervisor checkins
  const { data: activeSupervisorCheckins } = useQuery({
    queryKey: ["/api/supervisor/checkins", storeId, refreshKey],
    queryFn: async () => {
      const res = await fetch(`/api/supervisor/checkins?storeId=${storeId}`);
      return res.json();
    },
    enabled: !!storeId, // to prevent fetch before storeId exists
  });
  const currentSupervisors = activeSupervisorCheckins?.filter(
    (checkin: any) => checkin.status === "In",
  );

  // Fetch vendor supervisors for selected vendor
  const { data: vendorSupervisors } = useQuery({
    queryKey: ["/api/supervisors", supervisorForm.vendorId, storeId],
    queryFn: async () => {
      if (!supervisorForm.vendorId) return [];
      const res = await fetch(
        `/api/supervisors?vendorId=${supervisorForm.vendorId}&storeId=${storeId}`,
      );
      return res.json();
    },
    enabled: !!supervisorForm.vendorId,
  });

  // Check if current form data matches an active checkin
  useEffect(() => {
    if (activeSupervisorCheckins && supervisorForm.aadhaarNumber) {
      const userCheckin = activeSupervisorCheckins.find(
        (checkin: any) =>
          checkin.aadhaarNumber === supervisorForm.aadhaarNumber &&
          checkin.status === "In" &&
          checkin.storeId === storeId,
      );
      if (userCheckin) {
        setIsCheckedIn(true);
        setCheckinId(userCheckin.id);
      } else {
        setIsCheckedIn(false);
        setCheckinId(null);
      }
    }
  }, [activeSupervisorCheckins, supervisorForm.aadhaarNumber, storeId]);

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage) {
      if (
        lastMessage.type === "vehicle_entry" ||
        lastMessage.type === "vehicle_exit" ||
        lastMessage.type === "supervisor_checkin" ||
        lastMessage.type === "supervisor_checkout" ||
        lastMessage.type === "labour_checkin" ||
        lastMessage.type === "labour_checkout"
      ) {
        setRefreshKey((prev) => prev + 1);
      }
    }
  }, [lastMessage]);

  if (!user) {
    return null;
  }

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
                  {user.name} - Store ID: {user.storeId}
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
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Sidebar - Reduced width */}
          <div className="lg:col-span-2 space-y-4">
            {/* Today's Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Today's Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {kpis?.todaysCheckins || 0}
                    </div>
                    <div className="text-sm text-blue-600">Total Check-ins</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {kpis?.currentlyInside || 0}
                    </div>
                    <div className="text-sm text-green-600">
                      Currently Inside
                    </div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {kpis?.extendedStays || 0}
                    </div>
                    <div className="text-sm text-orange-600">
                      Extended Stays
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Entries */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Entries</CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity && recentActivity.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {recentActivity.slice(0, 5).map((activity: any) => (
                      <div
                        key={activity.id}
                        className="text-xs p-2 bg-gray-50 rounded"
                      >
                        <div className="font-medium">
                          {activity.vehicleNumber}
                        </div>
                        <div className="text-gray-600">
                          {activity.driverName}
                        </div>
                        <div className="text-gray-500">
                          {new Date(activity.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    No recent entries
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Vendor Supervisors Checked In
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <SupervisorCheckinTable
                  supervisors={currentSupervisors || []}
                />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Action</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {/* <Input
                    placeholder="Search Vehicle..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-sm"
                  />
                  <Button variant="outline" size="sm" className="w-full">
                    <Search className="h-4 w-4 mr-2" />
                    Search Vehicle
                  </Button> */}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToExcel}
                  disabled={!activeVehicles || activeVehicles.length === 0}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
                {/* <Button variant="outline" size="sm" className="w-full">
                  <History className="h-4 w-4 mr-2" />
                  View History
                </Button> */}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area - Increased width */}
          <div className="lg:col-span-3 space-y-4">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Live Vehicle Status
              </h2>
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRefreshKey((prev) => prev + 1)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Vehicle Table */}
            <Card>
              <CardContent className="p-0">
                <StoreVehicleTable
                  refreshKey={refreshKey}
                  storeId={user.storeId}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
