// components/fraud-detection-dashboard.tsx

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Eye, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { useState } from "react";

interface FraudDetectionDashboardProps {
  refreshKey: number;
}

export function FraudDetectionDashboard({ refreshKey }: FraudDetectionDashboardProps) {
  const [selectedAlert, setSelectedAlert] = useState<any>(null);

  const { data: fraudStats } = useQuery({
    queryKey: ["/api/fraud/stats", refreshKey],
    queryFn: async () => {
      const res = await fetch("/api/fraud/stats");
      return res.json();
    },
  });

  const { data: recentAlerts } = useQuery({
    queryKey: ["/api/fraud/alerts", refreshKey],
    queryFn: async () => {
      const res = await fetch("/api/fraud/alerts");
      return res.json();
    },
  });

  const { data: fraudulentCheckins } = useQuery({
    queryKey: ["/api/fraud/checkins", refreshKey],
    queryFn: async () => {
      const res = await fetch("/api/fraud/checkins");
      return res.json();
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFraudTypeLabel = (type: string) => {
    const labels = {
      'SAME_KM_READING': 'Same KM Reading',
      'REVERSE_KM_READING': 'Reverse KM Reading',
      'UNREALISTIC_DISTANCE': 'Unrealistic Distance',
      'SIMULTANEOUS_KM_ENTRY': 'Simultaneous Entry',
      'KM_INCONSISTENCY': 'KM Inconsistency',
      'ROUND_NUMBER_PATTERN': 'Round Number Pattern',
      'UNREALISTIC_SPEED': 'Unrealistic Speed',
    };
    return labels[type] || type;
  };

  const resolveAlert = async (alertId: number) => {
    try {
      await fetch(`/api/fraud/alerts/${alertId}/resolve`, { method: 'POST' });
      // Refresh queries
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Fraud Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Fraudulent</p>
                <p className="text-2xl font-bold text-red-600">
                  {fraudStats?.totalFraudulent || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unresolved Alerts</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {fraudStats?.unresolvedAlerts || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fraud Types</p>
                <p className="text-2xl font-bold text-blue-600">
                  {fraudStats?.fraudByType?.length || 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Fraud Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Recent Fraud Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentAlerts?.length > 0 ? (
              recentAlerts.slice(0, 5).map((alert: any) => (
                <Alert key={alert.id} className="border-l-4 border-l-red-500">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium">
                            {getFraudTypeLabel(alert.fraudType)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {alert.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(alert.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveAlert(alert.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>No recent fraud alerts</p>
                <p className="text-sm">System is running clean!</p>
              </div>
            )}
          </div>