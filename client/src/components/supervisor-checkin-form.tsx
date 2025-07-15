
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, UserCheck, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SupervisorCheckinFormProps {
  storeId: number;
  operatorId: number;
  refreshKey?: number;
}

export function SupervisorCheckinForm({ storeId, operatorId, refreshKey }: SupervisorCheckinFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkinId, setCheckinId] = useState<number | null>(null);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState("");
  
  const [supervisorForm, setSupervisorForm] = useState({
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

  // Fetch active supervisor checkins
  const { data: activeSupervisorCheckins } = useQuery({
    queryKey: ["/api/supervisor/checkins", storeId, refreshKey],
    queryFn: async () => {
      const res = await fetch(`/api/supervisor/checkins?storeId=${storeId}`);
      return res.json();
    },
  });

  // Fetch vendor supervisors for selected vendor
  const { data: vendorSupervisors } = useQuery({
    queryKey: ["/api/supervisors", supervisorForm.vendorId, storeId],
    queryFn: async () => {
      if (!supervisorForm.vendorId) return [];
      const res = await fetch(`/api/supervisors?vendorId=${supervisorForm.vendorId}&storeId=${storeId}`);
      return res.json();
    },
    enabled: !!supervisorForm.vendorId,
  });

  // Check if current form data matches an active checkin
  useEffect(() => {
    if (activeSupervisorCheckins && supervisorForm.aadhaarNumber) {
      const userCheckin = activeSupervisorCheckins.find(
        (checkin: any) => 
          checkin.aadhaarNumber === supervisorForm.aadhaarNumber && 
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
  }, [activeSupervisorCheckins, supervisorForm.aadhaarNumber, storeId]);

  // Handle supervisor selection
  const handleSupervisorSelect = (supervisorId: string) => {
    setSelectedSupervisorId(supervisorId);
    const supervisor = vendorSupervisors?.find((s: any) => s.id.toString() === supervisorId);
    if (supervisor) {
      setSupervisorForm({
        ...supervisorForm,
        name: supervisor.name,
        aadhaarNumber: supervisor.aadhaarNumber || "",
        phoneNumber: supervisor.phoneNumber || "",
      });
    }
  };

  // Supervisor checkin mutation
  const checkinMutation = useMutation({
    mutationFn: async () => {
      // Check if supervisor with this Aadhaar is already checked in
      if (supervisorForm.aadhaarNumber) {
        const existingCheckin = activeSupervisorCheckins?.find(
          (checkin: any) => 
            checkin.aadhaarNumber === supervisorForm.aadhaarNumber && 
            checkin.status === "In" &&
            checkin.storeId === storeId
        );
        
        if (existingCheckin) {
          throw new Error(`Supervisor with Aadhaar ${supervisorForm.aadhaarNumber} is already checked in`);
        }
      }

      const res = await fetch("/api/supervisor/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supervisorId: selectedSupervisorId ? parseInt(selectedSupervisorId) : null,
          storeId: storeId,
          vendorId: parseInt(supervisorForm.vendorId),
          createdBy: operatorId,
          ...supervisorForm,
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
      toast({ title: "Success", description: "Supervisor checked in successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/supervisor/checkins"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to check in",
        variant: "destructive",
      });
    },
  });

  // Supervisor checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/supervisor/checkout", {
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
      toast({ title: "Success", description: "Supervisor checked out successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/supervisor/checkins"] });
      // Reset form
      setSupervisorForm({
        name: "",
        aadhaarNumber: "",
        phoneNumber: "",
        vendorId: "",
        notes: "",
      });
      setSelectedSupervisorId("");
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
            <UserCheck className="h-5 w-5 text-green-600" />
          ) : (
            <UserX className="h-5 w-5 text-gray-400" />
          )}
          <span>Supervisor Check-in</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isCheckedIn ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor*</Label>
              <Select value={supervisorForm.vendorId} onValueChange={(value) => 
                setSupervisorForm({ ...supervisorForm, vendorId: value })
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

            {supervisorForm.vendorId && vendorSupervisors && vendorSupervisors.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="supervisor">Existing Supervisor (Optional)</Label>
                <Select value={selectedSupervisorId} onValueChange={handleSupervisorSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select existing supervisor or add new" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Add New Supervisor</SelectItem>
                    {vendorSupervisors.map((supervisor: any) => (
                      <SelectItem key={supervisor.id} value={supervisor.id.toString()}>
                        {supervisor.name} - {supervisor.aadhaarNumber ? `****${supervisor.aadhaarNumber.slice(-4)}` : 'No Aadhaar'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name*</Label>
              <Input
                id="name"
                value={supervisorForm.name}
                onChange={(e) => setSupervisorForm({ ...supervisorForm, name: e.target.value })}
                placeholder="Enter supervisor's full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aadhaar">Aadhaar Number</Label>
              <Input
                id="aadhaar"
                value={supervisorForm.aadhaarNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                  setSupervisorForm({ ...supervisorForm, aadhaarNumber: value });
                }}
                placeholder="12-digit Aadhaar number"
                maxLength={12}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={supervisorForm.phoneNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setSupervisorForm({ ...supervisorForm, phoneNumber: value });
                }}
                placeholder="10-digit phone number"
                maxLength={10}
              />
            </div>

            <Button
              onClick={() => checkinMutation.mutate()}
              disabled={checkinMutation.isPending || !supervisorForm.name.trim() || !supervisorForm.vendorId}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {checkinMutation.isPending ? "Checking In..." : "Check In Supervisor"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <Badge className="bg-green-600 text-white">
                <CheckCircle className="mr-1 h-3 w-3" />
                Checked In
              </Badge>
            </div>
            
            <div className="space-y-2 text-sm">
              <div><strong>Name:</strong> {supervisorForm.name}</div>
              {supervisorForm.aadhaarNumber && (
                <div><strong>Aadhaar:</strong> ****-****-{supervisorForm.aadhaarNumber.slice(-4)}</div>
              )}
              {supervisorForm.phoneNumber && (
                <div><strong>Phone:</strong> {supervisorForm.phoneNumber}</div>
              )}
            </div>

            <Button
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              variant="destructive"
              className="w-full"
            >
              {checkoutMutation.isPending ? "Checking Out..." : "Check Out Supervisor"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
