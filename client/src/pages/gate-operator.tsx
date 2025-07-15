import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, LogOut, User, Search, Download, Clock } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-auth";
import { useAuth } from "@/lib/auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { VehicleForm } from "@/components/vehicle-form";
import { VehicleTable } from "@/components/vehicle-table";
import { SupervisorCheckinForm } from "@/components/supervisor-checkin-form";
import { LabourCheckinForm } from "@/components/labour-checkin-form";
import { useEffect, useState } from "react";

export default function GateOperator() {
  const { user } = useRequireAuth("gate-operator");
  const { logout } = useAuth();
  const { isConnected, lastMessage } = useWebSocket();
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: storeData } = useQuery({
    queryKey: ["/api/stores", user?.storeId],
    enabled: !!user?.storeId,
  });

  const { data: todaysKpis } = useQuery({
    queryKey: ["/api/dashboard/kpis", user?.storeId, refreshKey],
    enabled: !!user?.storeId,
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["/api/dashboard/recent-activity", user?.storeId, refreshKey],
    enabled: !!user?.storeId,
  });

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'vehicle_entry' || lastMessage.type === 'vehicle_exit') {
        setRefreshKey(prev => prev + 1);
      }
    }
  }, [lastMessage]);

  if (!user) {
    return null;
  }

  const store = storeData?.[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-metro-blue rounded-lg flex items-center justify-center">
                <Building className="text-white h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{store?.name || "Metro Store"}</h1>
                <p className="text-sm text-gray-600">Gate Operator Panel</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-error'}`} />
                <span className="text-sm text-gray-600">{isConnected ? 'Online' : 'Offline'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="text-gray-600 h-4 w-4" />
                </div>
                <span className="text-sm text-gray-700">{user.name}</span>
              </div>
              <Button variant="ghost" onClick={logout} className="text-gray-500 hover:text-gray-700">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Vehicle Entry Form */}
          <div className="lg:col-span-2">
            <VehicleForm storeId={user.storeId!} operatorId={user.id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Today's Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Today's Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Check-ins</span>
                  <span className="text-2xl font-bold text-success">{todaysKpis?.todaysCheckins || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Currently Inside</span>
                  <span className="text-2xl font-bold text-warning">{todaysKpis?.currentlyInside || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Extended Stays</span>
                  <span className="text-2xl font-bold text-error">{todaysKpis?.extendedStays || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Entries */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity?.slice(0, 5).map((entry: any) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-semibold text-gray-900">{entry.vehicleNumber}</div>
                        <div className="text-sm text-gray-600">{entry.driverName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">{new Date(entry.createdAt).toLocaleTimeString()}</div>
                        <Badge variant={entry.status === 'In' ? 'default' : 'secondary'} className={entry.status === 'In' ? 'bg-success' : 'bg-error'}>
                          {entry.status === 'In' ? 'Check-in' : 'Check-out'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {(!recentActivity || recentActivity.length === 0) && (
                    <div className="text-center text-gray-500 py-4">
                      No recent entries
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Search className="mr-3 h-4 w-4 text-metro-blue" />
                    Search Vehicle
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="mr-3 h-4 w-4 text-metro-blue" />
                    Download Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Clock className="mr-3 h-4 w-4 text-metro-blue" />
                    View History
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Supervisor and Labour Check-in Forms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <SupervisorCheckinForm storeId={user.storeId} operatorId={user.id} />
          <LabourCheckinForm storeId={user.storeId} operatorId={user.id} />
        </div>
      </main>
    </div>
  );
}