import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, LogOut, User, RefreshCw } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-auth";
import { useAuth } from "@/lib/auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { KPICards } from "@/components/kpi-cards";
import { VehicleTable } from "@/components/vehicle-table";
import { ExportPanel } from "@/components/export-panel";
import { useEffect, useState } from "react";

export default function Admin() {
  const { user } = useRequireAuth("admin");
  const { logout } = useAuth();
  const { isConnected, lastMessage } = useWebSocket();
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: storeVehicleCounts } = useQuery({
    queryKey: ["/api/dashboard/store-counts", refreshKey],
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["/api/dashboard/recent-activity", refreshKey],
    enabled: !!user,
  });

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'vehicle_entry' || lastMessage.type === 'vehicle_exit' || lastMessage.type === 'status_update') {
        setRefreshKey(prev => prev + 1);
      }
    }
  }, [lastMessage]);

  if (!user) {
    return null;
  }

  const handleFirebaseTest = () => {
    alert("Firebase test button clicked!");
    // Here you can add the Firebase write logic
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-metro-blue rounded-lg flex items-center justify-center">
                <BarChart3 className="text-white h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Real-time System Overview</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-6">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">Live Views</Button>
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">History</Button>
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">Analytics</Button>
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">Export</Button>
                <Button variant="ghost" onClick={handleFirebaseTest} className="text-gray-600 hover:text-gray-900">Test Firebase</Button>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-error'}`} />
                <span className="text-sm text-gray-600">{isConnected ? 'Live' : 'Offline'}</span>
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
        {/* KPI Cards */}
        <KPICards refreshKey={refreshKey} />

        {/* Main Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Live Vehicle Status */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Live Vehicle Status</CardTitle>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-error'}`} />
                      <span className="text-sm text-gray-600">Live updates</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setRefreshKey(prev => prev + 1)}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <VehicleTable refreshKey={refreshKey} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Store Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Store Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {storeVehicleCounts?.slice(0, 10).map((store: any) => (
                    <div key={store.storeId} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${store.vehicleCount > 0 ? 'bg-success' : 'bg-gray-300'}`} />
                        <span className="text-sm text-gray-700">{store.storeName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-semibold ${store.vehicleCount > 0 ? 'text-success' : 'text-gray-400'}`}>
                          {store.vehicleCount}
                        </span>
                        <span className="text-xs text-gray-500">vehicles</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Export Tools */}
            <ExportPanel />

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity?.slice(0, 5).map((activity: any) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${activity.status === 'In' ? 'bg-success' : 'bg-error'}`} />
                      <div className="flex-1">
                        <div className="text-sm text-gray-900">
                          Vehicle {activity.vehicleNumber} {activity.status === 'In' ? 'checked in' : 'checked out'} at {activity.storeName}
                        </div>
                        <div className="text-xs text-gray-500">{new Date(activity.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                  {(!recentActivity || recentActivity.length === 0) && (
                    <div className="text-center text-gray-500 py-4">
                      No recent activity
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}