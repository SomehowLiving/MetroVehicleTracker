import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Camera, Save, LogIn, LogOut } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CameraModal from "./camera-modal";
import { z } from "zod";

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

export default function VehicleForm({ storeId, operatorId }: VehicleFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'checkin' | 'checkout'>('checkin');
  const [cameraModal, setCameraModal] = useState<{
    isOpen: boolean;
    type: 'driver' | 'loader' | 'supervisor';
  }>({ isOpen: false, type: 'driver' });
  const [photos, setPhotos] = useState<{
    driver?: string;
    loader?: string;
    supervisor?: string;
  }>({});

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
          ...(data.loaderName ? [{ name: data.loaderName, role: 'loader', photoUrl: photos.loader }] : []),
          ...(data.supervisorName ? [{ name: data.supervisorName, role: 'supervisor', photoUrl: photos.supervisor }] : [])
        ].filter(Boolean)
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Vehicle checked in successfully" });
      form.reset();
      setPhotos({});
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to check in vehicle",
        variant: "destructive"
      });
    },
  });

  const vehicleExitMutation = useMutation({
    mutationFn: async (data: { checkinId: number; closingKm?: number }) => {
      return await apiRequest("POST", "/api/vehicles/exit", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Vehicle checked out successfully" });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to check out vehicle",
        variant: "destructive"
      });
    },
  });

  // Handle vehicle selection for checkout
  const handleVehicleSelect = (vehicleNumber: string) => {
    const selectedVehicle = activeVehicles?.find((v: any) => v.vehicleNumber === vehicleNumber);
    if (selectedVehicle && mode === 'checkout') {
      form.setValue('vehicleNumber', vehicleNumber);
      form.setValue('driverName', selectedVehicle.driverName);
      form.setValue('vendorId', selectedVehicle.vendorId?.toString() || '');
    }
  };

  const handleSubmit = form.handleSubmit((data) => {
    if (mode === 'checkin') {
      vehicleEntryMutation.mutate({
        ...data,
        vendorId: parseInt(data.vendorId),
        openingKm: data.openingKm ? parseInt(data.openingKm) : undefined,
      });
    } else {
      // Handle checkout logic
      const selectedVehicle = activeVehicles?.find((v: any) => v.vehicleNumber === data.vehicleNumber);
      if (selectedVehicle) {
        vehicleExitMutation.mutate({
          checkinId: selectedVehicle.id,
          closingKm: data.openingKm ? parseInt(data.openingKm) : undefined,
        });
      }
    }
  });

  const handleCameraCapture = (photoDataUrl: string) => {
    setPhotos(prev => ({ ...prev, [cameraModal.type]: photoDataUrl }));
  };

  const openCamera = (type: 'driver' | 'loader' | 'supervisor') => {
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
                variant={mode === 'checkin' ? 'default' : 'outline'}
                onClick={() => setMode('checkin')}
                className={mode === 'checkin' ? 'bg-success hover:bg-green-600' : ''}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Check In
              </Button>
              <Button
                variant={mode === 'checkout' ? 'default' : 'outline'}
                onClick={() => setMode('checkout')}
                className={mode === 'checkout' ? 'bg-error hover:bg-red-600' : ''}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Check Out
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vendor Selection */}
              <div className="space-y-2">
                <Label htmlFor="vendorId">Vendor Name</Label>
                <Select {...form.register("vendorId")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors?.map((vendor: any) => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.vendorId && (
                  <p className="text-sm text-red-600">{form.formState.errors.vendorId.message}</p>
                )}
              </div>

              {/* Vehicle Number */}
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                {mode === 'checkout' ? (
                  <Select 
                    value={form.watch("vehicleNumber")} 
                    onValueChange={handleVehicleSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeVehicles?.map((vehicle: any) => (
                        <SelectItem key={vehicle.id} value={vehicle.vehicleNumber}>
                          {vehicle.vehicleNumber} - {vehicle.driverName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="vehicleNumber"
                    placeholder="MH-01-AB-1234"
                    {...form.register("vehicleNumber")}
                  />
                )}
                {form.formState.errors.vehicleNumber && (
                  <p className="text-sm text-red-600">{form.formState.errors.vehicleNumber.message}</p>
                )}
              </div>

              {/* Driver Name */}
              <div className="space-y-2">
                <Label htmlFor="driverName">Driver Name</Label>
                <Input
                  id="driverName"
                  placeholder="Driver Name"
                  readOnly={mode === 'checkout'}
                  className={mode === 'checkout' ? 'bg-gray-100' : ''}
                  {...form.register("driverName")}
                />
                {form.formState.errors.driverName && (
                  <p className="text-sm text-red-600">{form.formState.errors.driverName.message}</p>
                )}
              </div>

              {/* Opening/Closing KM */}
              <div className="space-y-2">
                <Label htmlFor="openingKm">{mode === 'checkin' ? 'Opening KM' : 'Closing KM'}</Label>
                <Input
                  id="openingKm"
                  type="number"
                  placeholder="12345"
                  {...form.register("openingKm")}
                />
              </div>
            </div>

            {/* Driver Photo */}
            <div className="space-y-2">
              <Label>Driver Photo</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {photos.driver ? (
                  <div className="space-y-2">
                    <img src={photos.driver} alt="Driver" className="w-32 h-32 object-cover rounded-lg mx-auto" />
                    <Badge variant="secondary">Photo captured</Badge>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Camera className="h-12 w-12 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600">Click to capture driver photo</p>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openCamera('driver')}
                  className="mt-2"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {photos.driver ? 'Retake Photo' : 'Capture Photo'}
                </Button>
              </div>
            </div>

            {/* Manpower Details */}
            {mode === 'checkin' && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Manpower Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="loaderName">Loader Name</Label>
                    <Input
                      id="loaderName"
                      placeholder="Loader Name"
                      {...form.register("loaderName")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openCamera('loader')}
                      className="text-metro-blue hover:text-metro-deep-blue"
                    >
                      <Camera className="mr-1 h-4 w-4" />
                      {photos.loader ? 'Retake Photo' : 'Capture Photo'}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supervisorName">Supervisor Name</Label>
                    <Input
                      id="supervisorName"
                      placeholder="Supervisor Name"
                      {...form.register("supervisorName")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openCamera('supervisor')}
                      className="text-metro-blue hover:text-metro-deep-blue"
                    >
                      <Camera className="mr-1 h-4 w-4" />
                      {photos.supervisor ? 'Retake Photo' : 'Capture Photo'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                className="bg-metro-blue hover:bg-metro-deep-blue"
                disabled={vehicleEntryMutation.isPending || vehicleExitMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {vehicleEntryMutation.isPending || vehicleExitMutation.isPending 
                  ? "Saving..." 
                  : `Save ${mode === 'checkin' ? 'Entry' : 'Exit'}`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <CameraModal
        isOpen={cameraModal.isOpen}
        onClose={() => setCameraModal({ isOpen: false, type: 'driver' })}
        onCapture={handleCameraCapture}
        title={`Capture ${cameraModal.type} Photo`}
      />
    </>
  );
}
