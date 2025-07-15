
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Users, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LabourCheckinFormProps {
  storeId: number;
  operatorId: number;
  refreshKey?: number;
}

export function LabourCheckinForm({ storeId, operatorId, refreshKey }: LabourCheckinFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkinId, setCheckinId] = useState<number | null>(null);
  const [selectedLoaderId, setSelectedLoaderId] = useState("");
  
  const [labourForm, setLabourForm] = useState({
    name: "",
    aadhaarNumber: "",
    phoneNumber: "",
    vendorId: "",
    notes: "",
  });

  // Fetch vendors
  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const res = await fetch("/api/vendors");
      return res.json();
    },
  });

  // Fetch active labour checkins
  const { data: activeLabourCheckins } = useQuery({
    queryKey: ["/api/labour/checkins", storeId, refreshKey],
    queryFn: async () => {
      const res = await fetch(`/api/labour/checkins?storeId=${storeId}`);
      return res.json();
    },
  });

  // Check if current form data matches an active checkin
  useEffect(() => {
    if (activeLabourCheckins && labourForm.aadhaarNumber) {
      const userCheckin = activeLabourCheckins.find(
        (checkin: any) => 
          checkin.aadhaarNumber === labourForm.aadhaarNumber && 
          checkin.status === "In" &&
          checkin.storeId === storeId
      );
      if (userCheckin) {
        setIsCheckedIn(true);
        setCheckinId(userCheckin.id);
      } else {
        setIsCheckedIn(false);
        setCheckinId(null);
      }
    }
  }, [activeLabourCheckins, labourForm.aadhaarNumber, storeId]);

  // Labour checkin mutation
  const checkinMutation = useMutation({
    mutationFn: async () => {
      // Check if labour with this Aadhaar is already checked in
      if (labourForm.aadhaarNumber) {
        const existingCheckin = activeLabourCheckins?.find(
          (checkin: any) => 
            checkin.aadhaarNumber === labourForm.aadhaarNumber && 
            checkin.status === "In" &&
            checkin.storeId === storeId
        );
        
        if (existingCheckin) {
          throw new Error(`Labour with Aadhaar ${labourForm.aadhaarNumber} is already checked in`);
        }
      }

      const res = await fetch("/api/labour/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loaderId: selectedLoaderId ? parseInt(selectedLoaderId) : null,
          storeId: storeId,
          vendorId: parseInt(labourForm.vendorId),
          createdBy: operatorId,
          ...labourForm,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to check in");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setIsCheckedIn(true);
      setCheckinId(data.id);
      toast({ title: "Success", description: "Labour checked in successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/labour/checkins"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to check in",
        variant: "destructive",
      });
    },
  });

  // Labour checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/labour/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to check out");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsCheckedIn(false);
      setCheckinId(null);
      toast({ title: "Success", description: "Labour checked out successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/labour/checkins"] });
      // Reset form
      setLabourForm({
        name: "",
        aadhaarNumber: "",
        phoneNumber: "",
        vendorId: "",
        notes: "",
      });
      setSelectedLoaderId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to check out",
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          {isCheckedIn ? (
            <Users className="h-5 w-5 text-blue-600" />
          ) : (
            <UserX className="h-5 w-5 text-gray-400" />
          )}
          <span>Labour Check-in</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isCheckedIn ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor*</Label>
              <Select value={labourForm.vendorId} onValueChange={(value) => 
                setLabourForm({ ...labourForm, vendorId: value })
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors?.map((vendor: any) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name*</Label>
              <Input
                id="name"
                value={labourForm.name}
                onChange={(e) => setLabourForm({ ...labourForm, name: e.target.value })}
                placeholder="Enter labour's full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aadhaar">Aadhaar Number</Label>
              <Input
                id="aadhaar"
                value={labourForm.aadhaarNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                  setLabourForm({ ...labourForm, aadhaarNumber: value });
                }}
                placeholder="12-digit Aadhaar number"
                maxLength={12}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={labourForm.phoneNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setLabourForm({ ...labourForm, phoneNumber: value });
                }}
                placeholder="10-digit phone number"
                maxLength={10}
              />
            </div>

            <Button
              onClick={() => checkinMutation.mutate()}
              disabled={checkinMutation.isPending || !labourForm.name.trim() || !labourForm.vendorId}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {checkinMutation.isPending ? "Checking In..." : "Check In Labour"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <Badge className="bg-blue-600 text-white">
                <CheckCircle className="mr-1 h-3 w-3" />
                Checked In
              </Badge>
            </div>
            
            <div className="space-y-2 text-sm">
              <div><strong>Name:</strong> {labourForm.name}</div>
              {labourForm.aadhaarNumber && (
                <div><strong>Aadhaar:</strong> ****-****-{labourForm.aadhaarNumber.slice(-4)}</div>
              )}
              {labourForm.phoneNumber && (
                <div><strong>Phone:</strong> {labourForm.phoneNumber}</div>
              )}
            </div>

            <Button
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              variant="destructive"
              className="w-full"
            >
              {checkoutMutation.isPending ? "Checking Out..." : "Check Out Labour"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
