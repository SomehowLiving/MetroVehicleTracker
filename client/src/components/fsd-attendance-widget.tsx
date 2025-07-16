// not needed
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface FsdAttendanceWidgetProps {
  refreshKey?: number;
}

export function FsdAttendanceWidget({ refreshKey }: FsdAttendanceWidgetProps) {
  const { data: fsdCheckins, isLoading } = useQuery({
    queryKey: ["/api/fsd/checkins", refreshKey],
    queryFn: async () => {
      const res = await fetch("/api/fsd/checkins");
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="text-center py-4">Loading FSD attendance...</div>;
  }

  if (!fsdCheckins || fsdCheckins.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">👥</div>
        <div className="text-sm text-gray-500">
          No FSD attendance records
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {fsdCheckins.slice(0, 8).map((checkin: any) => (
        <div key={checkin.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div
              className={`w-2 h-2 rounded-full ${checkin.status === "In" ? "bg-green-500" : "bg-gray-400"}`}
            />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {checkin.name}
              </div>
              <div className="text-xs text-gray-500">
                {checkin.designation}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              variant={checkin.status === "In" ? "default" : "secondary"}
              className={checkin.status === "In" ? "bg-green-600" : "bg-gray-400"}
            >
              {checkin.status === "In" ? (
                <CheckCircle className="mr-1 h-3 w-3" />
              ) : (
                <XCircle className="mr-1 h-3 w-3" />
              )}
              {checkin.status === "In" ? "Checked In" : "Checked Out"}
            </Badge>
            <div className="text-xs text-gray-500">
              <Clock className="inline mr-1 h-3 w-3" />
              {new Date(
                checkin.status === "In" ? checkin.checkinTime : checkin.checkoutTime
              ).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
