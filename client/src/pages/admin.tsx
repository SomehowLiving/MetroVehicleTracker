import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, LogOut, User, RefreshCw } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-auth";
import { useAuth } from "@/lib/auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { photoManager } from "../lib/firebase-service";
import { KPICards } from "@/components/kpi-cards";
import { VehicleTable } from "@/components/vehicle-table";
import { ExportPanel } from "@/components/export-panel";
import { FraudDetectionDashboard } from "@/components/fraud-detection-dashboard";
import { FsdAttendanceWidget } from "@/components/fsd-attendance-widget";
import { useEffect, useState } from "react";

export default function Admin() {
  const { user } = useRequireAuth("admin");
  const { logout } = useAuth();
  const { isConnected, lastMessage } = useWebSocket();
  const [refreshKey, setRefreshKey] = useState(0);
  const { isLoading } = useAuth();
  console.log("🔍 Auth Debug:", { user, isLoading }); // Debug log

  const {
    data: storeVehicleCounts,
    isLoading: storeCountsLoading,
    error: storeCountsError,
  } = useQuery({
    queryKey: ["/api/dashboard/store-counts", refreshKey],
    queryFn: async () => {
      console.log("🔄 Fetching store counts...");
      const res = await fetch("/api/dashboard/store-counts");
      if (!res.ok) {
        throw new Error(`Failed to fetch store counts: ${res.status}`);
      }
      const data = await res.json();
      console.log("📊 Store counts data:", data);
      return data;
    },
    enabled: !!user,
  });

  const {
    data: recentActivity,
    isLoading: activityLoading,
    error: activityError,
  } = useQuery({
    queryKey: ["/api/dashboard/recent-activity", refreshKey],
    queryFn: async () => {
      console.log("🔄 Fetching recent activity...");
      const res = await fetch("/api/dashboard/recent-activity");
      if (!res.ok) {
        throw new Error(`Failed to fetch recent activity: ${res.status}`);
      }
      const data = await res.json();
      console.log("📋 Recent activity data:", data);
      return data;
    },
    enabled: !!user,
  });

  // Add loading state check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user exists and has admin role
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>No user found. Please log in.</p>
          <button onClick={() => (window.location.href = "/")}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>Access denied. Admin role required.</p>
          <p>Your role: {user.role}</p>
        </div>
      </div>
    );
  }

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
              <div className="w-10 h-10 bg-metro-blue rounded-lg flex items-center justify-center">
                <BarChart3 className="text-white h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-600">
                  Real-time System Overview
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-6">
                <Button
                  variant="ghost"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Live Views
                </Button>
                <Button
                  variant="ghost"
                  className="text-gray-600 hover:text-gray-900"
                >
                  History
                </Button>
                <Button
                  variant="ghost"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Analytics
                </Button>
                <Button
                  variant="ghost"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Export
                </Button>
                <Button
                  variant="ghost"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Fraud Detection
                </Button>
                
              </div>
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
        {/* KPI Cards */}
        <KPICards refreshKey={refreshKey} />

        {/* Fraud Detection Dashboard */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">🔍 Fraud Detection Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <FraudDetectionDashboard refreshKey={refreshKey} />
            </CardContent>
          </Card>
        </div>

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
                      <div
                        className={`w-2 h-2 rounded-full ${isConnected ? "bg-success" : "bg-error"}`}
                      />
                      <span className="text-sm text-gray-600">
                        Live updates
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRefreshKey((prev) => prev + 1)}
                    >
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
                {storeCountsLoading ? (
                  <div className="text-center py-4">Loading store data...</div>
                ) : storeCountsError ? (
                  <div className="text-center py-4 text-red-500">
                    Error loading store data: {storeCountsError.message}
                    <br />
                    <small className="text-xs">{storeCountsError.stack}</small>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {storeVehicleCounts && storeVehicleCounts.length > 0 ? (
                      storeVehicleCounts.slice(0, 10).map((store: any) => (
                        <div
                          key={store.storeId}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-2 h-2 rounded-full ${store.vehicleCount > 0 ? "bg-success" : "bg-gray-300"}`}
                            />
                            <span className="text-sm text-gray-700">
                              {store.storeName}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-sm font-semibold ${store.vehicleCount > 0 ? "text-success" : "text-gray-400"}`}
                            >
                              {store.vehicleCount || 0}
                            </span>
                            <span className="text-xs text-gray-500">
                              vehicles
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-400 mb-2">📊</div>
                        <div className="text-sm text-gray-500">
                          No store data available
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Data will appear here when vehicles check in
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* FSD Attendance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Store Supervisor Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <FsdAttendanceWidget refreshKey={refreshKey} />
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
                {activityLoading ? (
                  <div className="text-center py-4">Loading activity...</div>
                ) : activityError ? (
                  <div className="text-center py-4 text-red-500">
                    Error loading activity: {activityError.message}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity && recentActivity.length > 0 ? (
                      recentActivity.slice(0, 5).map((activity: any) => (
                        <div
                          key={activity.id}
                          className="flex items-start space-x-3"
                        >
                          <div
                            className={`w-2 h-2 rounded-full mt-2 ${activity.status === "In" ? "bg-success" : "bg-error"}`}
                          />
                          <div className="flex-1">
                            <div className="text-sm text-gray-900">
                              Vehicle {activity.vehicleNumber}{" "}
                              {activity.status === "In"
                                ? "checked in"
                                : "checked out"}{" "}
                              at {activity.storeName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(activity.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        No recent activity
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
