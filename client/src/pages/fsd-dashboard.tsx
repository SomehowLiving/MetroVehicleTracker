
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
  TrendingUp
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

  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");

  // Check if user is already checked in
  const { data: activeFsdCheckins } = useQuery({
    queryKey: ["/api/fsd/checkins", user?.storeId],
    queryFn: async () => {
      const res = await fetch(`/api/fsd/checkins?storeId=${user?.storeId}`);
      return res.json();
    },
    enabled: !!user?.storeId,
  });

  // Check if current user is already checked in
  useEffect(() => {
    if (activeFsdCheckins && user) {
      const userCheckin = activeFsdCheckins.find(
        (checkin: any) => checkin.fsdId === user.id && checkin.status === "In"
      );
      if (userCheckin) {
        setIsCheckedIn(true);
        setCheckinId(userCheckin.id);
      }
    }
  }, [activeFsdCheckins, user]);

  // Vehicle data for this store
  const { data: activeVehicles } = useQuery({
    queryKey: ["/api/dashboard/active-vehicles", user?.storeId, refreshKey],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/active-vehicles?storeId=${user?.storeId}`);
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
      const res = await fetch(`/api/dashboard/recent-activity?storeId=${user?.storeId}&limit=20`);
      return res.json();
    },
    enabled: !!user?.storeId,
  });

  // FSD checkin mutation
  const checkinMutation = useMutation({
    mutationFn: async () => {
      // Check if Aadhaar is provided and if someone with that Aadhaar is already checked in
      if (fsdForm.aadhaarNumber) {
        const existingCheckin = activeFsdCheckins?.find(
          (checkin: any) => 
            checkin.aadhaarNumber === fsdForm.aadhaarNumber && 
            checkin.status === "In" &&
            checkin.fsdId !== user?.id
        );
        
        if (existingCheckin) {
          throw new Error(`Person with Aadhaar ${fsdForm.aadhaarNumber} is already checked in`);
        }
      }

      const res = await fetch("/api/fsd/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fsdId: user?.id,
          storeId: user?.storeId,
          createdBy: user?.id,
          ...fsdForm,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to check in");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setIsCheckedIn(true);
      setCheckinId(data.id);
      toast({ title: "Success", description: "Checked in successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/fsd/checkins"] });
      setRefreshKey(prev => prev + 1);
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
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to check out");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsCheckedIn(false);
      setCheckinId(null);
      toast({ title: "Success", description: "Checked out successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/fsd/checkins"] });
      setRefreshKey(prev => prev + 1);
      // Reset form
      setFsdForm({
        name: user?.name || "",
        designation: "FSD Supervisor",
        aadhaarNumber: "",
        phoneNumber: "",
        notes: "",
      });
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Active Vehicles");
    
    const fileName = `${user?.storeId || 'store'}_vehicles_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast({
      title: "Export Successful",
      description: `Data exported to ${fileName}`,
    });
  };

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
        setRefreshKey(prev => prev + 1);
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
                <h1 className="text-lg font-bold text-gray-900">Store Supervisor Dashboard</h1>
                <p className="text-sm text-gray-600">{user.name} - Store ID: {user.storeId}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-success" : "bg-error"}`} />
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Supervisor Attendance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  {isCheckedIn ? (
                    <UserCheck className="h-5 w-5 text-green-600" />
                  ) : (
                    <UserX className="h-5 w-5 text-gray-400" />
                  )}
                  <span>Supervisor Check-in</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isCheckedIn ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name*</Label>
                      <Input
                        id="name"
                        value={fsdForm.name}
                        onChange={(e) => setFsdForm({ ...fsdForm, name: e.target.value })}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="aadhaar">Aadhaar Number</Label>
                      <Input
                        id="aadhaar"
                        value={fsdForm.aadhaarNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                          setFsdForm({ ...fsdForm, aadhaarNumber: value });
                        }}
                        placeholder="12-digit Aadhaar number"
                        maxLength={12}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={fsdForm.phoneNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setFsdForm({ ...fsdForm, phoneNumber: value });
                        }}
                        placeholder="10-digit phone number"
                        maxLength={10}
                      />
                    </div>

                    <Button
                      onClick={() => checkinMutation.mutate()}
                      disabled={checkinMutation.isPending || !fsdForm.name.trim()}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {checkinMutation.isPending ? "Checking In..." : "Check In"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <Badge className="bg-green-600 text-white">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Checked In
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div><strong>Name:</strong> {fsdForm.name}</div>
                      {fsdForm.aadhaarNumber && (
                        <div><strong>Aadhaar:</strong> ****-****-{fsdForm.aadhaarNumber.slice(-4)}</div>
                      )}
                      {fsdForm.phoneNumber && (
                        <div><strong>Phone:</strong> {fsdForm.phoneNumber}</div>
                      )}
                    </div>

                    <Button
                      onClick={() => checkoutMutation.mutate()}
                      disabled={checkoutMutation.isPending}
                      variant="destructive"
                      className="w-full"
                    >
                      {checkoutMutation.isPending ? "Checking Out..." : "Check Out"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Today's Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Today's Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{kpis?.todaysCheckins || 0}</div>
                    <div className="text-sm text-blue-600">Total Check-ins</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{kpis?.currentlyInside || 0}</div>
                    <div className="text-sm text-green-600">Currently Inside</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{kpis?.extendedStays || 0}</div>
                    <div className="text-sm text-orange-600">Extended Stays</div>
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
                      <div key={activity.id} className="text-xs p-2 bg-gray-50 rounded">
                        <div className="font-medium">{activity.vehicleNumber}</div>
                        <div className="text-gray-600">{activity.driverName}</div>
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

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Input
                    placeholder="Search Vehicle..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-sm"
                  />
                  <Button variant="outline" size="sm" className="w-full">
                    <Search className="h-4 w-4 mr-2" />
                    Search Vehicle
                  </Button>
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
                <Button variant="outline" size="sm" className="w-full">
                  <History className="h-4 w-4 mr-2" />
                  View History
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Live Vehicle Status</h2>
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRefreshKey(prev => prev + 1)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Vehicle Table */}
            <Card>
              <CardContent className="p-0">
                <VehicleTable refreshKey={refreshKey} storeId={user.storeId} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
