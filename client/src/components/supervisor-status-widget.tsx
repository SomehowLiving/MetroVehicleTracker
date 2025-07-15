
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Clock, User, CheckCircle, XCircle } from "lucide-react";

interface SupervisorStatusWidgetProps {
  refreshKey?: number;
}

export function SupervisorStatusWidget({ refreshKey }: SupervisorStatusWidgetProps) {
  const { data: supervisorCheckins } = useQuery({
    queryKey: ["/api/supervisor/checkins", refreshKey],
    queryFn: async () => {
      const res = await fetch("/api/supervisor/checkins");
      return res.json();
    },
  });

  if (!supervisorCheckins || supervisorCheckins.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <User className="mx-auto h-8 w-8 mb-2 text-gray-300" />
        <p>No active supervisors</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {supervisorCheckins.slice(0, 10).map((supervisor: any) => (
        <div key={supervisor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div
              className={`w-2 h-2 rounded-full ${supervisor.status === "In" ? "bg-green-500" : "bg-gray-400"}`}
            />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {supervisor.name}
              </div>
              <div className="text-xs text-gray-500">
                Store ID: {supervisor.storeId} | Vendor ID: {supervisor.vendorId}
              </div>
              {supervisor.aadhaarNumber && (
                <div className="text-xs text-gray-500">
                  Aadhaar: ****-****-{supervisor.aadhaarNumber.slice(-4)}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <Badge
              variant={supervisor.status === "In" ? "default" : "secondary"}
              className={supervisor.status === "In" ? "bg-green-600" : "bg-gray-400"}
            >
              {supervisor.status === "In" ? (
                <CheckCircle className="mr-1 h-3 w-3" />
              ) : (
                <XCircle className="mr-1 h-3 w-3" />
              )}
              {supervisor.status}
            </Badge>
            <div className="text-xs text-gray-500 flex items-center">
              <Clock className="inline mr-1 h-3 w-3" />
              {new Date(
                supervisor.status === "In" ? supervisor.checkinTime : supervisor.checkoutTime
              ).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
