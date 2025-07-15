// components/fraud-detection-dashboard.tsx

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  Eye,
  CheckCircle,
  Clock,
  TrendingUp,
  X,
  MapPin,
  User,
  Calendar,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FraudDetectionDashboardProps {
  refreshKey: number;
}

export function FraudDetectionDashboard({
  refreshKey,
}: FraudDetectionDashboardProps) {
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
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getFraudTypeLabel = (type: string) => {
    const labels = {
      SAME_KM_READING: "Same KM Reading",
      REVERSE_KM_READING: "Reverse KM Reading",
      UNREALISTIC_DISTANCE: "Unrealistic Distance",
      SIMULTANEOUS_KM_ENTRY: "Simultaneous Entry",
      KM_INCONSISTENCY: "KM Inconsistency",
      ROUND_NUMBER_PATTERN: "Round Number Pattern",
      UNREALISTIC_SPEED: "Unrealistic Speed",
    };
    return labels[type] || type;
  };

  const resolveAlert = async (alertId: number) => {
    try {
      await fetch(`/api/fraud/alerts/${alertId}/resolve`, { method: "POST" });
      // Refresh queries - you might want to use queryClient.invalidateQueries here
    } catch (error) {
      console.error("Failed to resolve alert:", error);
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
                <p className="text-sm font-medium text-gray-600">
                  Total Fraudulent
                </p>
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
                <p className="text-sm font-medium text-gray-600">
                  Unresolved Alerts
                </p>
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
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAlert(alert)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Alert Details</DialogTitle>
                            </DialogHeader>
                            {selectedAlert && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">
                                      Alert ID
                                    </label>
                                    <p className="text-sm">
                                      {selectedAlert.id}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">
                                      Severity
                                    </label>
                                    <Badge
                                      className={getSeverityColor(
                                        selectedAlert.severity,
                                      )}
                                    >
                                      {selectedAlert.severity.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">
                                      Fraud Type
                                    </label>
                                    <p className="text-sm">
                                      {getFraudTypeLabel(
                                        selectedAlert.fraudType,
                                      )}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">
                                      Status
                                    </label>
                                    <p className="text-sm">
                                      {selectedAlert.status}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">
                                    Description
                                  </label>
                                  <p className="text-sm mt-1">
                                    {selectedAlert.description}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">
                                    Created At
                                  </label>
                                  <p className="text-sm mt-1">
                                    {new Date(
                                      selectedAlert.createdAt,
                                    ).toLocaleString()}
                                  </p>
                                </div>
                                {selectedAlert.metadata && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">
                                      Additional Details
                                    </label>
                                    <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                                      {JSON.stringify(
                                        selectedAlert.metadata,
                                        null,
                                        2,
                                      )}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
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
        </CardContent>
      </Card>

      {/* Fraudulent Check-ins Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-orange-500" />
            Fraudulent Check-ins
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fraudulentCheckins?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle/Driver</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>KM Reading</TableHead>
                  <TableHead>Store Location</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Fraud Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fraudulentCheckins.slice(0, 10).map((checkin: any) => (
                  <TableRow key={checkin.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {checkin.vehicleNumber}
                          </span>
                          <span className="text-xs text-gray-500">
                            {checkin.driverName}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {new Date(checkin.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">
                        <div>Open: {checkin.openingKm || 'N/A'}</div>
                        <div>Close: {checkin.closingKm || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{checkin.storeName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {checkin.supervisorName || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="text-xs">
                        {getFraudTypeLabel(checkin.fraudType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          checkin.isResolved
                            ? "default"
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {checkin.isResolved ? "Resolved" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!checkin.isResolved && (
                          <Button variant="outline" size="sm">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>No fraudulent check-ins found</p>
              <p className="text-sm">All check-ins are legitimate!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fraud Statistics by Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Fraud Statistics by Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fraudStats?.fraudByType?.length > 0 ? (
            <div className="space-y-4">
              {fraudStats.fraudByType.map((item: any) => (
                <div
                  key={item.type}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {getFraudTypeLabel(item.type)}
                    </p>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-600">
                      {item.count}
                    </p>
                    <p className="text-sm text-gray-500">incidents</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-blue-500" />
              <p>No fraud statistics available</p>
              <p className="text-sm">
                Data will appear as fraud cases are detected
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
