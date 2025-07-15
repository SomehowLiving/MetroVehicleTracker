import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, TrendingUp, Truck, Users } from "lucide-react";
import { useLocation } from "wouter";

interface Store {
  id: number;
  name: string;
  location: string;
  vehiclesIn: number;
  vehiclesOut: number;
  isActive: boolean;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: stores, isLoading } = useQuery<Store[]>({
    queryKey: ["/api/stores"],
  });

  const totalVehicles = stores?.reduce((sum, store) => sum + store.vehiclesIn, 0) || 0;
  const totalStores = stores?.length || 0;
  const todaysCheckins = stores?.reduce((sum, store) => sum + store.vehiclesIn + store.vehiclesOut, 0) || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-metro-blue to-metro-deep-blue flex items-center justify-center">
        <div className="text-white text-xl">Loading stores...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-metro-blue to-metro-deep-blue">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-metro-blue rounded-lg flex items-center justify-center">
                <Building className="text-white h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Metro Cash & Carry</h1>
                <p className="text-sm text-gray-600">Vehicle Attendance & Tracking System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setLocation("/login?role=admin")}
                className="border-metro-blue text-metro-blue hover:bg-metro-blue hover:text-white"
              >
                <Users className="mr-2 h-4 w-4" />
                Admin Login
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/login?role=fsd")}
                className="border-green-500 text-green-600 hover:bg-green-500 hover:text-white"
              >
                <Building className="mr-2 h-4 w-4" />
                Store Login
              </Button>
              <Button
                onClick={() => setLocation("/login?role=gate-operator")}
                className="bg-metro-yellow text-metro-blue hover:bg-yellow-400"
              >
                <Truck className="mr-2 h-4 w-4" />
                Gate Operator Login
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Select Your Store Location</h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Digital gate log management system for all 32 Metro stores. Track vehicle movements, manage driver data, and maintain real-time attendance records.
          </p>
        </div>

        {/* Store Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-16">
          {stores?.map((store) => (
            <Card key={store.id} className="hover:shadow-xl transition-shadow cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-metro-blue rounded-lg flex items-center justify-center group-hover:bg-metro-yellow transition-colors">
                    <Building className="text-white group-hover:text-metro-blue h-5 w-5" />
                  </div>
                  <Badge variant={store.isActive ? "default" : "secondary"} className="bg-success text-white">
                    Active
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{store.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{store.location}</p>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-success">{store.vehiclesIn}</div>
                      <div className="text-xs text-gray-500">Vehicles In</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-warning">{store.vehiclesOut}</div>
                      <div className="text-xs text-gray-500">Vehicles Out</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-metro-yellow text-metro-blue hover:bg-yellow-400"
                    onClick={() => setLocation(`/login?storeId=${store.id}`)}
                  >
                    Select
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">{totalStores}</div>
              <div className="text-blue-100">Total Stores</div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-metro-yellow mb-2">{totalVehicles}</div>
              <div className="text-blue-100">Active Vehicles</div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-success mb-2">{todaysCheckins}</div>
              <div className="text-blue-100">Today's Check-ins</div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">98.5%</div>
              <div className="text-blue-100">System Uptime</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
