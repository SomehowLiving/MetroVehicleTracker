
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Clock, User, CheckCircle, XCircle } from "lucide-react";

interface LabourStatusWidgetProps {
  refreshKey?: number;
}

export function LabourStatusWidget({ refreshKey }: LabourStatusWidgetProps) {
  const { data: labourCheckins } = useQuery({
    queryKey: ["/api/labour/checkins", refreshKey],
    queryFn: async () => {
      const res = await fetch("/api/labour/checkins");
      return res.json();
    },
  });

  if (!labourCheckins || labourCheckins.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <User className="mx-auto h-8 w-8 mb-2 text-gray-300" />
        <p>No active labour</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {labourCheckins.slice(0, 10).map((labour: any) => (
        <div key={labour.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div
              className={`w-2 h-2 rounded-full ${labour.status === "In" ? "bg-blue-500" : "bg-gray-400"}`}
            />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {labour.name}
              </div>
              <div className="text-xs text-gray-500">
                Store ID: {labour.storeId} | Vendor ID: {labour.vendorId}
              </div>
              {labour.aadhaarNumber && (
                <div className="text-xs text-gray-500">
                  Aadhaar: ****-****-{labour.aadhaarNumber.slice(-4)}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <Badge
              variant={labour.status === "In" ? "default" : "secondary"}
              className={labour.status === "In" ? "bg-blue-600" : "bg-gray-400"}
            >
              {labour.status === "In" ? (
                <CheckCircle className="mr-1 h-3 w-3" />
              ) : (
                <XCircle className="mr-1 h-3 w-3" />
              )}
              {labour.status}
            </Badge>
            <div className="text-xs text-gray-500 flex items-center">
              <Clock className="inline mr-1 h-3 w-3" />
              {new Date(
                labour.status === "In" ? labour.checkinTime : labour.checkoutTime
              ).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
