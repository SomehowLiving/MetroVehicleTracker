import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Truck, Clock, AlertTriangle } from "lucide-react";

interface KPICardsProps {
  refreshKey?: number;
}

export function KPICards({ refreshKey }: KPICardsProps) {
  const { data: kpis } = useQuery({
    queryKey: ["/api/dashboard/kpis", refreshKey],
  });

  const kpiData = [
    {
      title: "Total Check-ins Today",
      value: kpis?.todaysCheckins || 0,
      change: "+12% from yesterday",
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Currently Inside",
      value: kpis?.currentlyInside || 0,
      change: "Across all stores",
      icon: Truck,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Average Stay Time",
      value: `${kpis?.averageStayHours || 0}h`,
      change: "-15 min from avg",
      icon: Clock,
      color: "text-metro-blue",
      bgColor: "bg-metro-blue/10",
    },
    {
      title: "Extended Stays",
      value: kpis?.extendedStays || 0,
      change: "Requires attention",
      icon: AlertTriangle,
      color: "text-error",
      bgColor: "bg-error/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpiData.map((kpi, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">{kpi.title}</h3>
                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                <p className="text-sm text-gray-600">{kpi.change}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${kpi.bgColor}`}>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
