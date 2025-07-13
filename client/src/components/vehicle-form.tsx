import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Camera, Save, LogIn, LogOut, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CameraModal from "./camera-modal";
import { z } from "zod";
import { Controller } from "react-hook-form";

const vehicleFormSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
  driverName: z.string().min(1, "Driver name is required"),
  openingKm: z.string().optional(),
  loaderName: z.string().optional(),
  supervisorName: z.string().optional(),
});

interface VehicleFormProps {
  storeId: number;
  operatorId: number;
}

interface ManpowerMember {
  name: string;
  aadhaarNumber?: string;
  phoneNumber?: string;
  photoUrl?: string;
}

export default function VehicleForm({ storeId, operatorId }: VehicleFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverAadhaar, setDriverAadhaar] = useState("");
  const [numberOfLoaders, setNumberOfLoaders] = useState(0);
  const [loaders, setLoaders] = useState<Array<{
    name: string;
    aadhaarNumber: string;
    phoneNumber?: string;
    photoUrl?: string;
  }>>([]);
  const [vendorId, setVendorId] = useState<number | undefined>();
  const [openingKm, setOpeningKm] = useState<number | undefined>();
  const [driverPhotoUrl, setDriverPhotoUrl] = useState<string>("");

  const [manpower, setManpower] = useState<ManpowerMember[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<"driver" | "manpower" | "loader">("driver");
  const [manpowerIndex, setManpowerIndex] = useState(0);
  const [loaderIndex, setLoaderIndex] = useState(0);

  const addManpowerMember = () => {
    setManpower((prev) => [...prev, { name: "" }]);
  };

  const updateManpowerMember = (index: number, field: string, value: string) => {
    setManpower((prev) =>
      prev.map((member, i) => (i === index ? { ...member, [field]: value } : member)),
    );
  };

  const removeManpowerMember = (index: number) => {
    setManpower((prev) => prev.filter((_, i) => i !== index));
  };

  const captureDriverPhoto = () => {
    setShowCamera(true);
    setCameraMode("driver");
  };

  const updateLoader = (index: number, field: string, value: string) => {
    setLoaders(prev => {
      const updated = [...prev];
      if (!updated[index]) {
        updated[index] = { name: '', aadhaarNumber: '', phoneNumber: '', photoUrl: '' };
      }
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const captureLoaderPhoto = (index: number) => {
    setLoaderIndex(index);
    setShowCamera(true);
    setCameraMode("loader");
  };

  const form = useForm({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      vendorId: "",
      vehicleNumber: "",
      driverName: "",
      openingKm: "",
      loaderName: "",
      supervisorName: "",
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const { data: activeVehicles } = useQuery({
    queryKey: ["/api/dashboard/active-vehicles", storeId],
  });

  const vehicleEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/vehicles/entry", {
        ...data,
        storeId,
        operatorId,
        driverPhotoUrl: photos.driver,
        manpower: [
          ...(data.loaderName
            ? [
                {
                  name: data.loaderName,
                  role: "loader",
                  photoUrl: photos.loader,
                },
              ]
            : []),
          ...(data.supervisorName
            ? [
                {
                  name: data.supervisorName,
                  role: "supervisor",
                  photoUrl: photos.supervisor,
                },
              ]
            : []),
        ].filter(Boolean),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vehicle checked in successfully",
      });
      form.reset();
      setPhotos({});
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to check in vehicle",
        variant: "destructive",
      });
    },
  });

  const vehicleExitMutation = useMutation({
    mutationFn: async (data: { checkinId: number; closingKm?: number }) => {
      return await apiRequest("POST", "/api/vehicles/exit", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vehicle checked out successfully",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to check out vehicle",
        variant: "destructive",
      });
    },
  });

  // Handle vehicle selection for checkout
  const handleVehicleSelect = (vehicleNumber: string) => {
    const selectedVehicle = activeVehicles?.find(
      (v: any) => v.vehicleNumber === vehicleNumber,
    );
    if (selectedVehicle && mode === "checkout") {
      form.setValue("vehicleNumber", vehicleNumber);
      form.setValue("driverName", selectedVehicle.driverName);
      form.setValue("vendorId", selectedVehicle.vendorId?.toString() || "");
    }
  };

  const handleSubmit = form.handleSubmit((data) => {
    if (mode === "checkin") {
       const entryData = {
        vendorId: vendorId!,
        vehicleNumber,
        driverName,
        driverAadhaarNumber: driverAadhaar || undefined,
        driverPhotoUrl,
        numberOfLoaders,
        openingKm,
        loaders: loaders.filter(l => l.name.trim() !== '' && l.aadhaarNumber.trim() !== ''),
        manpower: manpower.filter(m => m.name.trim() !== ''),
      };
      vehicleEntryMutation.mutate({
        ...data,
        vendorId: parseInt(data.vendorId),
        openingKm: data.openingKm ? parseInt(data.openingKm) : undefined,
      });
    } else {
      // Handle checkout logic
      const selectedVehicle = activeVehicles?.find(
        (v: any) => v.vehicleNumber === data.vehicleNumber,
      );
      if (selectedVehicle) {
        vehicleExitMutation.mutate({
          checkinId: selectedVehicle.id,
          closingKm: data.openingKm ? parseInt(data.openingKm) : undefined,
        });
      }
    }
  });

  const handleCameraCapture = (photoDataUrl: string) => {
     if (cameraMode === "driver") {
            setDriverPhotoUrl(photoDataUrl);
          } else if (cameraMode === "loader") {
            updateLoader(loaderIndex, 'photoUrl', photoDataUrl);
          } else {
            setManpower((prev) =>
              prev.map((member, i) =>
                i === manpowerIndex ? { ...member, photoUrl: photoDataUrl } : member,
              ),
            );
          }
          setShowCamera(false);
  };

  const openCamera = (type: "driver" | "loader" | "supervisor") => {
    setCameraModal({ isOpen: true, type });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Vehicle Entry/Exit</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant={mode === "checkin" ? "default" : "outline"}
                onClick={() => setMode("checkin")}
                className={
                  mode === "checkin" ? "bg-success hover:bg-green-600" : ""
                }
              >
                <LogIn className="mr-2 h-4 w-4" />
                Check In
              </Button>
              <Button
                variant={mode === "checkout" ? "default" : "outline"}
                onClick={() => setMode("checkout")}
                className={
                  mode === "checkout" ? "bg-error hover:bg-red-600" : ""
                }
              >
                <LogOut className="mr-2 h-4 w-4" />
                Check Out
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
         <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Vehicle Number *</Label>
                <Input
                  id="vehicleNumber"
                  placeholder="MH01AB1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driverName">Driver Name *</Label>
                <Input
                  id="driverName"
                  placeholder="Driver's full name"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="driverAadhaar">Driver Aadhaar Number</Label>
                <Input
                  id="driverAadhaar"
                  placeholder="123456789012"
                  maxLength={12}
                  value={driverAadhaar}
                  onChange={(e) => setDriverAadhaar(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberOfLoaders">Number of Loaders</Label>
                <Input
                  id="numberOfLoaders"
                  type="number"
                  min="0"
                  max="10"
                  value={numberOfLoaders}
                  onChange={(e) => setNumberOfLoaders(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            {/* Loader Details Section */}
            {numberOfLoaders > 0 && (
              <div className="space-y-4">
                <Label className="text-base font-medium">Loader Details</Label>
                {Array.from({ length: numberOfLoaders }, (_, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <h4 className="font-medium">Loader {index + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                          placeholder="Loader's full name"
                          value={loaders[index]?.name || ''}
                          onChange={(e) => updateLoader(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Aadhaar Number *</Label>
                        <Input
                          placeholder="123456789012"
                          maxLength={12}
                          value={loaders[index]?.aadhaarNumber || ''}
                          onChange={(e) => updateLoader(index, 'aadhaarNumber', e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input
                          placeholder="Phone number"
                          value={loaders[index]?.phoneNumber || ''}
                          onChange={(e) => updateLoader(index, 'phoneNumber', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Photo</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => captureLoaderPhoto(index)}
                          className="w-full"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Capture Photo
                        </Button>
                        {loaders[index]?.photoUrl && (
                          <div className="text-sm text-green-600">✓ Photo captured</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Manpower Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Additional Manpower</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addManpowerMember}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Person
                </Button>
              </div>
              {manpower.map((member, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <h4 className="font-medium">Person {index + 1}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        placeholder="Full name"
                        value={member.name}
                        onChange={(e) => updateManpowerMember(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Aadhaar Number</Label>
                      <Input
                        placeholder="123456789012"
                        maxLength={12}
                        value={member.aadhaarNumber || ''}
                        onChange={(e) => updateManpowerMember(index, 'aadhaarNumber', e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input
                        placeholder="Phone number"
                        value={member.phoneNumber || ''}
                        onChange={(e) => updateManpowerMember(index, 'phoneNumber', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Photo</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setManpowerIndex(index);
                          setShowCamera(true);
                          setCameraMode("manpower");
                        }}
                        className="w-full"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Capture Photo
                      </Button>
                      {member.photoUrl && (
                        <div className="text-sm text-green-600">✓ Photo captured</div>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeManpowerMember(index)}
                  >
                    Remove Person
                  </Button>
                </div>
              ))}
            </div>
            <Button onClick={handleSubmit}>Save</Button>
          </div>
        </CardContent>
      </Card>

      <CameraModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={(photoUrl) => {
          if (cameraMode === "driver") {
            setDriverPhotoUrl(photoUrl);
          } else if (cameraMode === "loader") {
            updateLoader(loaderIndex, 'photoUrl', photoUrl);
          } else {
            setManpower((prev) =>
              prev.map((member, i) =>
                i === manpowerIndex ? { ...member, photoUrl } : member,
              ),
            );
          }
          setShowCamera(false);
        }}
        title={`Capture ${cameraMode} Photo`}
      />
    </>
  );
}