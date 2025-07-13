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
  supervisorId: z.string().optional(),
});

interface VehicleFormProps {
  storeId: number;
  operatorId: number;
}

interface Photos {
  driver?: string;
  loader?: string;
  supervisor?: string;
}

export default function VehicleForm({ storeId, operatorId }: VehicleFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Add missing mode state
  const [mode, setMode] = useState<"checkin" | "checkout">("checkin");
  const [cameraModal, setCameraModal] = useState<{
    isOpen: boolean;
    type: "driver" | "loader" | "supervisor";
  }>({ isOpen: false, type: "driver" });

  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverAadhaar, setDriverAadhaar] = useState("");
  const [numberOfLoaders, setNumberOfLoaders] = useState(0);
  const [loaders, setLoaders] = useState<
    Array<{
      name: string;
      aadhaarNumber: string;
      phoneNumber?: string;
      photoUrl?: string;
    }>
  >([]);
  const [vendorId, setVendorId] = useState<number | undefined>();
  const [openingKm, setOpeningKm] = useState<number | undefined>();
  const [driverPhotoUrl, setDriverPhotoUrl] = useState<string>("");

  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<
    "driver" | "supervisor" | "loader"
  >("driver");
  const [loaderIndex, setLoaderIndex] = useState(0);

  // Add missing photos state
  const [photos, setPhotos] = useState<Photos>({});

  const updateLoader = (index: number, field: string, value: string) => {
    setLoaders((prev) => {
      const updated = [...prev];
      if (!updated[index]) {
        updated[index] = {
          name: "",
          aadhaarNumber: "",
          phoneNumber: "",
          photoUrl: "",
        };
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

  const openCamera = (type: "driver" | "loader" | "supervisor") => {
    setCameraModal({ isOpen: true, type });
  };

  const form = useForm({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      vendorId: "",
      vehicleNumber: "",
      driverName: "",
      openingKm: "",
      loaderName: "",
      supervisorId: "",
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const { data: supervisors } = useQuery({
    queryKey: ["/api/supervisors"],
  });

  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const { data: supervisors } = useQuery({
    queryKey: ["/api/supervisors"],
  });

  const { data: activeVehicles } = useQuery({
    queryKey: ["/api/dashboard/active-vehicles", storeId],
  });

  const vehicleEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      const supervisorData = data.supervisorId
        ? supervisors?.find((s: any) => s.id === parseInt(data.supervisorId))
        : null;

      return await apiRequest("POST", "/api/vehicles/entry", {
        ...data,
        storeId,
        operatorId,
        driverPhotoUrl: photos.driver || driverPhotoUrl,
        supervisorPhotoUrl: photos.supervisor,
        loaders: loaders.filter(
          (l) => l.name.trim() !== "" && l.aadhaarNumber.trim() !== "",
        ),
        supervisor: supervisorData
          ? {
              id: supervisorData.id,
              name: supervisorData.name,
              vendorId: supervisorData.vendorId,
              photoUrl: photos.supervisor,
            }
          : null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vehicle checked in successfully",
      });
      form.reset();
      setPhotos({});
      setVehicleNumber("");
      setDriverName("");
      setDriverAadhaar("");
      setDriverPhotoUrl("");
      setNumberOfLoaders(0);
      setLoaders([]);
      setVendorId(undefined);
      setOpeningKm(undefined);
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
      setVehicleNumber("");
      setDriverName("");
      setVendorId(undefined);
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
      setVehicleNumber(vehicleNumber);
      setDriverName(selectedVehicle.driverName);
      setVendorId(selectedVehicle.vendorId);
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
        loaders: loaders.filter(
          (l) => l.name.trim() !== "" && l.aadhaarNumber.trim() !== "",
        ),
        manpower: manpower.filter((m) => m.name.trim() !== ""),
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
    if (cameraModal.type === "driver") {
      setDriverPhotoUrl(photoDataUrl);
      setPhotos((prev) => ({ ...prev, driver: photoDataUrl }));
    } else if (cameraModal.type === "loader") {
      updateLoader(loaderIndex, "photoUrl", photoDataUrl);
    } else if (cameraModal.type === "supervisor") {
      setPhotos((prev) => ({ ...prev, supervisor: photoDataUrl }));
    }
    setCameraModal({ isOpen: false, type: "driver" });
  };

  // Add vendor selection component for checkin mode
  const renderVendorSelect = () => {
    if (mode !== "checkin") return null;

    return (
      <div className="space-y-2">
        <Label htmlFor="vendor">Vendor *</Label>
        <Select
          value={vendorId?.toString()}
          onValueChange={(value) => setVendorId(parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a vendor" />
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
    );
  };

  // Add vehicle select for checkout mode
  const renderVehicleSelect = () => {
    if (mode !== "checkout") return null;

    return (
      <div className="space-y-2">
        <Label htmlFor="activeVehicle">Select Vehicle to Check Out *</Label>
        <Select value={vehicleNumber} onValueChange={handleVehicleSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select an active vehicle" />
          </SelectTrigger>
          <SelectContent>
            {activeVehicles?.map((vehicle: any) => (
              <SelectItem key={vehicle.id} value={vehicle.vehicleNumber}>
                {vehicle.vehicleNumber} - {vehicle.driverName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
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
                  mode === "checkin" ? "bg-green-600 hover:bg-green-700" : ""
                }
              >
                <LogIn className="mr-2 h-4 w-4" />
                Check In
              </Button>
              <Button
                variant={mode === "checkout" ? "default" : "outline"}
                onClick={() => setMode("checkout")}
                className={
                  mode === "checkout" ? "bg-red-600 hover:bg-red-700" : ""
                }
              >
                <LogOut className="mr-2 h-4 w-4" />
                Check Out
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Vendor/Vehicle Selection */}
            {renderVendorSelect()}
            {renderVehicleSelect()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Vehicle Number *</Label>
                <Input
                  id="vehicleNumber"
                  placeholder="MH01AB1234"
                  value={vehicleNumber}
                  onChange={(e) =>
                    setVehicleNumber(e.target.value.toUpperCase())
                  }
                  className="uppercase"
                  disabled={mode === "checkout"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driverName">Driver Name *</Label>
                <Input
                  id="driverName"
                  placeholder="Driver's full name"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  disabled={mode === "checkout"}
                />
              </div>
            </div>

            {mode === "checkin" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="driverAadhaar">Driver Aadhaar Number</Label>
                    <Input
                      id="driverAadhaar"
                      placeholder="123456789012"
                      maxLength={12}
                      value={driverAadhaar}
                      onChange={(e) =>
                        setDriverAadhaar(e.target.value.replace(/\D/g, ""))
                      }
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
                      onChange={(e) =>
                        setNumberOfLoaders(parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>

                {/* Driver Photo */}
                <div className="space-y-2">
                  <Label>Driver Photo</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openCamera("driver")}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {photos.driver ? "Retake Photo" : "Capture Photo"}
                  </Button>
                  {photos.driver && (
                    <div className="text-sm text-green-600">
                      ✓ Photo captured
                    </div>
                  )}
                </div>

                {/* Supervisor Selection */}
                <div className="space-y-2">
                  <Label htmlFor="supervisor">Supervisor</Label>
                  <Controller
                    name="supervisorId"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a supervisor" />
                        </SelectTrigger>
                        <SelectContent>
                          {supervisors?.map((supervisor: any) => (
                            <SelectItem
                              key={supervisor.id}
                              value={supervisor.id.toString()}
                            >
                              {supervisor.name} ({supervisor.vendor?.name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.watch("supervisorId") && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openCamera("supervisor")}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {photos.supervisor ? "Retake Photo" : "Capture Photo"}
                    </Button>
                  )}
                  {photos.supervisor && (
                    <div className="text-sm text-green-600">
                      ✓ Photo captured
                    </div>
                  )}
                </div>

                {/* Loader Details Section */}
                {numberOfLoaders > 0 && (
                  <div className="space-y-4">
                    <Label className="text-base font-medium">
                      Loader Details
                    </Label>
                    {Array.from({ length: numberOfLoaders }, (_, index) => (
                      <div
                        key={index}
                        className="p-4 border rounded-lg space-y-3"
                      >
                        <h4 className="font-medium">Loader {index + 1}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input
                              placeholder="Loader's full name"
                              value={loaders[index]?.name || ""}
                              onChange={(e) =>
                                updateLoader(index, "name", e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Aadhaar Number *</Label>
                            <Input
                              placeholder="123456789012"
                              maxLength={12}
                              value={loaders[index]?.aadhaarNumber || ""}
                              onChange={(e) =>
                                updateLoader(
                                  index,
                                  "aadhaarNumber",
                                  e.target.value.replace(/\D/g, ""),
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <Input
                              placeholder="Phone number"
                              value={loaders[index]?.phoneNumber || ""}
                              onChange={(e) =>
                                updateLoader(
                                  index,
                                  "phoneNumber",
                                  e.target.value,
                                )
                              }
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
                              <div className="text-sm text-green-600">
                                ✓ Photo captured
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Opening/Closing KM */}
                <div className="space-y-2">
                  <Label htmlFor="km">
                    {mode === "checkin" ? "Opening KM" : "Closing KM"}
                  </Label>
                  <Input
                    id="km"
                    type="number"
                    placeholder="Enter kilometers"
                    value={openingKm || ""}
                    onChange={(e) =>
                      setOpeningKm(parseInt(e.target.value) || undefined)
                    }
                  />
                </div>
              </>
            )}

            {mode === "checkout" && (
              <div className="space-y-2">
                <Label htmlFor="km">Closing KM</Label>
                <Input
                  id="km"
                  type="number"
                  placeholder="Enter kilometers"
                  value={openingKm || ""}
                  onChange={(e) =>
                    setOpeningKm(parseInt(e.target.value) || undefined)
                  }
                />
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={
                vehicleEntryMutation.isPending || vehicleExitMutation.isPending
              }
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {mode === "checkin" ? "Check In Vehicle" : "Check Out Vehicle"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <CameraModal
        isOpen={cameraModal.isOpen}
        onClose={() => setCameraModal({ isOpen: false, type: "driver" })}
        onCapture={handleCameraCapture}
        title={`Capture ${cameraModal.type} Photo`}
      />
    </>
  );
}

// import { useState } from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import { Badge } from "@/components/ui/badge";
// import { Camera, Save, LogIn, LogOut, Plus } from "lucide-react";
// import { apiRequest } from "@/lib/queryClient";
// import { useToast } from "@/hooks/use-toast";
// import CameraModal from "./camera-modal";
// import { z } from "zod";
// import { Controller } from "react-hook-form";

// const vehicleFormSchema = z.object({
//   vendorId: z.string().min(1, "Vendor is required"),
//   vehicleNumber: z.string().min(1, "Vehicle number is required"),
//   driverName: z.string().min(1, "Driver name is required"),
//   openingKm: z.string().optional(),
//   loaderName: z.string().optional(),
//   supervisorName: z.string().optional(),
// });

// interface VehicleFormProps {
//   storeId: number;
//   operatorId: number;
// }

// interface ManpowerMember {
//   name: string;
//   aadhaarNumber?: string;
//   phoneNumber?: string;
//   photoUrl?: string;
// }

// interface Photos {
//   driver?: string;
//   loader?: string;
//   supervisor?: string;
// }

// export default function VehicleForm({ storeId, operatorId }: VehicleFormProps) {
//   const { toast } = useToast();
//   const queryClient = useQueryClient();

//   // Add missing mode state
//   const [mode, setMode] = useState<"checkin" | "checkout">("checkin");

//   const [vehicleNumber, setVehicleNumber] = useState("");
//   const [driverName, setDriverName] = useState("");
//   const [driverAadhaar, setDriverAadhaar] = useState("");
//   const [numberOfLoaders, setNumberOfLoaders] = useState(0);
//   const [loaders, setLoaders] = useState<
//     Array<{
//       name: string;
//       aadhaarNumber: string;
//       phoneNumber?: string;
//       photoUrl?: string;
//     }>
//   >([]);
//   const [vendorId, setVendorId] = useState<number | undefined>();
//   const [openingKm, setOpeningKm] = useState<number | undefined>();
//   const [driverPhotoUrl, setDriverPhotoUrl] = useState<string>("");

//   const [manpower, setManpower] = useState<ManpowerMember[]>([]);
//   const [showCamera, setShowCamera] = useState(false);
//   const [cameraMode, setCameraMode] = useState<
//     "driver" | "manpower" | "loader"
//   >("driver");
//   const [manpowerIndex, setManpowerIndex] = useState(0);
//   const [loaderIndex, setLoaderIndex] = useState(0);

//   // Add missing photos state
//   const [photos, setPhotos] = useState<Photos>({});

//   const addManpowerMember = () => {
//     setManpower((prev) => [...prev, { name: "" }]);
//   };

//   const updateManpowerMember = (
//     index: number,
//     field: string,
//     value: string,
//   ) => {
//     setManpower((prev) =>
//       prev.map((member, i) =>
//         i === index ? { ...member, [field]: value } : member,
//       ),
//     );
//   };

//   const removeManpowerMember = (index: number) => {
//     setManpower((prev) => prev.filter((_, i) => i !== index));
//   };

//   const captureDriverPhoto = () => {
//     setShowCamera(true);
//     setCameraMode("driver");
//   };

//   const updateLoader = (index: number, field: string, value: string) => {
//     setLoaders((prev) => {
//       const updated = [...prev];
//       if (!updated[index]) {
//         updated[index] = {
//           name: "",
//           aadhaarNumber: "",
//           phoneNumber: "",
//           photoUrl: "",
//         };
//       }
//       updated[index] = { ...updated[index], [field]: value };
//       return updated;
//     });
//   };

//   const captureLoaderPhoto = (index: number) => {
//     setLoaderIndex(index);
//     setShowCamera(true);
//     setCameraMode("loader");
//   };

//   const form = useForm({
//     resolver: zodResolver(vehicleFormSchema),
//     defaultValues: {
//       vendorId: "",
//       vehicleNumber: "",
//       driverName: "",
//       openingKm: "",
//       loaderName: "",
//       supervisorName: "",
//     },
//   });

//   const { data: vendors } = useQuery({
//     queryKey: ["/api/vendors"],
//   });

//   const { data: activeVehicles } = useQuery({
//     queryKey: ["/api/dashboard/active-vehicles", storeId],
//   });

//   const vehicleEntryMutation = useMutation({
//     mutationFn: async (data: any) => {
//       return await apiRequest("POST", "/api/vehicles/entry", {
//         ...data,
//         storeId,
//         operatorId,
//         driverPhotoUrl: photos.driver || driverPhotoUrl,
//         manpower: [
//           ...(data.loaderName
//             ? [
//                 {
//                   name: data.loaderName,
//                   role: "loader",
//                   photoUrl: photos.loader,
//                 },
//               ]
//             : []),
//           ...(data.supervisorName
//             ? [
//                 {
//                   name: data.supervisorName,
//                   role: "supervisor",
//                   photoUrl: photos.supervisor,
//                 },
//               ]
//             : []),
//         ].filter(Boolean),
//       });
//     },
//     onSuccess: () => {
//       toast({
//         title: "Success",
//         description: "Vehicle checked in successfully",
//       });
//       form.reset();
//       setPhotos({});
//       setVehicleNumber("");
//       setDriverName("");
//       setDriverAadhaar("");
//       setDriverPhotoUrl("");
//       setNumberOfLoaders(0);
//       setLoaders([]);
//       setManpower([]);
//       setVendorId(undefined);
//       setOpeningKm(undefined);
//       queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
//     },
//     onError: (error: any) => {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to check in vehicle",
//         variant: "destructive",
//       });
//     },
//   });

//   const vehicleExitMutation = useMutation({
//     mutationFn: async (data: { checkinId: number; closingKm?: number }) => {
//       return await apiRequest("POST", "/api/vehicles/exit", data);
//     },
//     onSuccess: () => {
//       toast({
//         title: "Success",
//         description: "Vehicle checked out successfully",
//       });
//       form.reset();
//       setVehicleNumber("");
//       setDriverName("");
//       setVendorId(undefined);
//       queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
//     },
//     onError: (error: any) => {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to check out vehicle",
//         variant: "destructive",
//       });
//     },
//   });

//   // Handle vehicle selection for checkout
//   const handleVehicleSelect = (vehicleNumber: string) => {
//     const selectedVehicle = activeVehicles?.find(
//       (v: any) => v.vehicleNumber === vehicleNumber,
//     );
//     if (selectedVehicle && mode === "checkout") {
//       form.setValue("vehicleNumber", vehicleNumber);
//       form.setValue("driverName", selectedVehicle.driverName);
//       form.setValue("vendorId", selectedVehicle.vendorId?.toString() || "");
//       setVehicleNumber(vehicleNumber);
//       setDriverName(selectedVehicle.driverName);
//       setVendorId(selectedVehicle.vendorId);
//     }
//   };

//   const handleSubmit = form.handleSubmit((data) => {
//     if (mode === "checkin") {
//       const entryData = {
//         vendorId: vendorId!,
//         vehicleNumber,
//         driverName,
//         driverAadhaarNumber: driverAadhaar || undefined,
//         driverPhotoUrl,
//         numberOfLoaders,
//         openingKm,
//         loaders: loaders.filter(
//           (l) => l.name.trim() !== "" && l.aadhaarNumber.trim() !== "",
//         ),
//         manpower: manpower.filter((m) => m.name.trim() !== ""),
//       };
//       vehicleEntryMutation.mutate({
//         ...data,
//         vendorId: parseInt(data.vendorId),
//         openingKm: data.openingKm ? parseInt(data.openingKm) : undefined,
//       });
//     } else {
//       // Handle checkout logic
//       const selectedVehicle = activeVehicles?.find(
//         (v: any) => v.vehicleNumber === data.vehicleNumber,
//       );
//       if (selectedVehicle) {
//         vehicleExitMutation.mutate({
//           checkinId: selectedVehicle.id,
//           closingKm: data.openingKm ? parseInt(data.openingKm) : undefined,
//         });
//       }
//     }
//   });

//   const handleCameraCapture = (photoDataUrl: string) => {
//     if (cameraMode === "driver") {
//       setDriverPhotoUrl(photoDataUrl);
//       setPhotos((prev) => ({ ...prev, driver: photoDataUrl }));
//     } else if (cameraMode === "loader") {
//       updateLoader(loaderIndex, "photoUrl", photoDataUrl);
//     } else {
//       setManpower((prev) =>
//         prev.map((member, i) =>
//           i === manpowerIndex ? { ...member, photoUrl: photoDataUrl } : member,
//         ),
//       );
//     }
//     setShowCamera(false);
//   };

//   // Add vendor selection component for checkin mode
//   const renderVendorSelect = () => {
//     if (mode !== "checkin") return null;

//     return (
//       <div className="space-y-2">
//         <Label htmlFor="vendor">Vendor *</Label>
//         <Select
//           value={vendorId?.toString()}
//           onValueChange={(value) => setVendorId(parseInt(value))}
//         >
//           <SelectTrigger>
//             <SelectValue placeholder="Select a vendor" />
//           </SelectTrigger>
//           <SelectContent>
//             {vendors?.map((vendor: any) => (
//               <SelectItem key={vendor.id} value={vendor.id.toString()}>
//                 {vendor.name}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//       </div>
//     );
//   };

//   // Add vehicle select for checkout mode
//   const renderVehicleSelect = () => {
//     if (mode !== "checkout") return null;

//     return (
//       <div className="space-y-2">
//         <Label htmlFor="activeVehicle">Select Vehicle to Check Out *</Label>
//         <Select value={vehicleNumber} onValueChange={handleVehicleSelect}>
//           <SelectTrigger>
//             <SelectValue placeholder="Select an active vehicle" />
//           </SelectTrigger>
//           <SelectContent>
//             {activeVehicles?.map((vehicle: any) => (
//               <SelectItem key={vehicle.id} value={vehicle.vehicleNumber}>
//                 {vehicle.vehicleNumber} - {vehicle.driverName}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//       </div>
//     );
//   };

//   return (
//     <>
//       <Card>
//         <CardHeader>
//           <div className="flex items-center justify-between">
//             <CardTitle className="text-xl">Vehicle Entry/Exit</CardTitle>
//             <div className="flex items-center space-x-2">
//               <Button
//                 variant={mode === "checkin" ? "default" : "outline"}
//                 onClick={() => setMode("checkin")}
//                 className={
//                   mode === "checkin" ? "bg-green-600 hover:bg-green-700" : ""
//                 }
//               >
//                 <LogIn className="mr-2 h-4 w-4" />
//                 Check In
//               </Button>
//               <Button
//                 variant={mode === "checkout" ? "default" : "outline"}
//                 onClick={() => setMode("checkout")}
//                 className={
//                   mode === "checkout" ? "bg-red-600 hover:bg-red-700" : ""
//                 }
//               >
//                 <LogOut className="mr-2 h-4 w-4" />
//                 Check Out
//               </Button>
//             </div>
//           </div>
//         </CardHeader>
//         <CardContent>
//           <div className="space-y-4">
//             {/* Vendor/Vehicle Selection */}
//             {renderVendorSelect()}
//             {renderVehicleSelect()}

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div className="space-y-2">
//                 <Label htmlFor="vehicleNumber">Vehicle Number *</Label>
//                 <Input
//                   id="vehicleNumber"
//                   placeholder="MH01AB1234"
//                   value={vehicleNumber}
//                   onChange={(e) =>
//                     setVehicleNumber(e.target.value.toUpperCase())
//                   }
//                   className="uppercase"
//                   disabled={mode === "checkout"}
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="driverName">Driver Name *</Label>
//                 <Input
//                   id="driverName"
//                   placeholder="Driver's full name"
//                   value={driverName}
//                   onChange={(e) => setDriverName(e.target.value)}
//                   disabled={mode === "checkout"}
//                 />
//               </div>
//             </div>

//             {mode === "checkin" && (
//               <>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div className="space-y-2">
//                     <Label htmlFor="driverAadhaar">Driver Aadhaar Number</Label>
//                     <Input
//                       id="driverAadhaar"
//                       placeholder="123456789012"
//                       maxLength={12}
//                       value={driverAadhaar}
//                       onChange={(e) =>
//                         setDriverAadhaar(e.target.value.replace(/\D/g, ""))
//                       }
//                     />
//                   </div>
//                   <div className="space-y-2">
//                     <Label htmlFor="numberOfLoaders">Number of Loaders</Label>
//                     <Input
//                       id="numberOfLoaders"
//                       type="number"
//                       min="0"
//                       max="10"
//                       value={numberOfLoaders}
//                       onChange={(e) =>
//                         setNumberOfLoaders(parseInt(e.target.value) || 0)
//                       }
//                     />
//                   </div>
//                 </div>

//                 {/* Driver Photo */}
//                 <div className="space-y-2">
//                   <Label>Driver Photo</Label>
//                   <Button
//                     type="button"
//                     variant="outline"
//                     size="sm"
//                     onClick={captureDriverPhoto}
//                   >
//                     <Camera className="h-4 w-4 mr-2" />
//                     Capture Driver Photo
//                   </Button>
//                   {driverPhotoUrl && (
//                     <div className="text-sm text-green-600">
//                       ✓ Photo captured
//                     </div>
//                   )}
//                 </div>

//                 {/* Loader Details Section */}
//                 {numberOfLoaders > 0 && (
//                   <div className="space-y-4">
//                     <Label className="text-base font-medium">
//                       Loader Details
//                     </Label>
//                     {Array.from({ length: numberOfLoaders }, (_, index) => (
//                       <div
//                         key={index}
//                         className="p-4 border rounded-lg space-y-3"
//                       >
//                         <h4 className="font-medium">Loader {index + 1}</h4>
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                           <div className="space-y-2">
//                             <Label>Name *</Label>
//                             <Input
//                               placeholder="Loader's full name"
//                               value={loaders[index]?.name || ""}
//                               onChange={(e) =>
//                                 updateLoader(index, "name", e.target.value)
//                               }
//                             />
//                           </div>
//                           <div className="space-y-2">
//                             <Label>Aadhaar Number *</Label>
//                             <Input
//                               placeholder="123456789012"
//                               maxLength={12}
//                               value={loaders[index]?.aadhaarNumber || ""}
//                               onChange={(e) =>
//                                 updateLoader(
//                                   index,
//                                   "aadhaarNumber",
//                                   e.target.value.replace(/\D/g, ""),
//                                 )
//                               }
//                             />
//                           </div>
//                           <div className="space-y-2">
//                             <Label>Phone Number</Label>
//                             <Input
//                               placeholder="Phone number"
//                               value={loaders[index]?.phoneNumber || ""}
//                               onChange={(e) =>
//                                 updateLoader(
//                                   index,
//                                   "phoneNumber",
//                                   e.target.value,
//                                 )
//                               }
//                             />
//                           </div>
//                           <div className="space-y-2">
//                             <Label>Photo</Label>
//                             <Button
//                               type="button"
//                               variant="outline"
//                               size="sm"
//                               onClick={() => captureLoaderPhoto(index)}
//                               className="w-full"
//                             >
//                               <Camera className="h-4 w-4 mr-2" />
//                               Capture Photo
//                             </Button>
//                             {loaders[index]?.photoUrl && (
//                               <div className="text-sm text-green-600">
//                                 ✓ Photo captured
//                               </div>
//                             )}
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 )}

//                 {/* Manpower Section */}
//                 <div className="space-y-4">
//                   <div className="flex items-center justify-between">
//                     <Label className="text-base font-medium">
//                       Additional Manpower
//                     </Label>
//                     <Button
//                       type="button"
//                       variant="outline"
//                       size="sm"
//                       onClick={addManpowerMember}
//                       className="flex items-center gap-2"
//                     >
//                       <Plus className="h-4 w-4" />
//                       Add Person
//                     </Button>
//                   </div>
//                   {manpower.map((member, index) => (
//                     <div
//                       key={index}
//                       className="p-4 border rounded-lg space-y-3"
//                     >
//                       <h4 className="font-medium">Person {index + 1}</h4>
//                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                         <div className="space-y-2">
//                           <Label>Name *</Label>
//                           <Input
//                             placeholder="Full name"
//                             value={member.name}
//                             onChange={(e) =>
//                               updateManpowerMember(
//                                 index,
//                                 "name",
//                                 e.target.value,
//                               )
//                             }
//                           />
//                         </div>
//                         <div className="space-y-2">
//                           <Label>Aadhaar Number</Label>
//                           <Input
//                             placeholder="123456789012"
//                             maxLength={12}
//                             value={member.aadhaarNumber || ""}
//                             onChange={(e) =>
//                               updateManpowerMember(
//                                 index,
//                                 "aadhaarNumber",
//                                 e.target.value.replace(/\D/g, ""),
//                               )
//                             }
//                           />
//                         </div>
//                         <div className="space-y-2">
//                           <Label>Phone Number</Label>
//                           <Input
//                             placeholder="Phone number"
//                             value={member.phoneNumber || ""}
//                             onChange={(e) =>
//                               updateManpowerMember(
//                                 index,
//                                 "phoneNumber",
//                                 e.target.value,
//                               )
//                             }
//                           />
//                         </div>
//                         <div className="space-y-2">
//                           <Label>Photo</Label>
//                           <Button
//                             type="button"
//                             variant="outline"
//                             size="sm"
//                             onClick={() => {
//                               setManpowerIndex(index);
//                               setShowCamera(true);
//                               setCameraMode("manpower");
//                             }}
//                             className="w-full"
//                           >
//                             <Camera className="h-4 w-4 mr-2" />
//                             Capture Photo
//                           </Button>
//                           {member.photoUrl && (
//                             <div className="text-sm text-green-600">
//                               ✓ Photo captured
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                       <Button
//                         type="button"
//                         variant="destructive"
//                         size="sm"
//                         onClick={() => removeManpowerMember(index)}
//                       >
//                         Remove Person
//                       </Button>
//                     </div>
//                   ))}
//                 </div>
//               </>
//             )}

//             {/* Opening/Closing KM */}
//             <div className="space-y-2">
//               <Label htmlFor="km">
//                 {mode === "checkin" ? "Opening KM" : "Closing KM"}
//               </Label>
//               <Input
//                 id="km"
//                 type="number"
//                 placeholder="Enter kilometers"
//                 value={openingKm || ""}
//                 onChange={(e) =>
//                   setOpeningKm(parseInt(e.target.value) || undefined)
//                 }
//               />
//             </div>

//             <Button
//               onClick={handleSubmit}
//               disabled={
//                 vehicleEntryMutation.isPending || vehicleExitMutation.isPending
//               }
//               className="w-full"
//             >
//               <Save className="h-4 w-4 mr-2" />
//               {mode === "checkin" ? "Check In Vehicle" : "Check Out Vehicle"}
//             </Button>
//           </div>
//         </CardContent>
//       </Card>

//       <CameraModal
//         isOpen={showCamera}
//         onClose={() => setShowCamera(false)}
//         onCapture={handleCameraCapture}
//         title={`Capture ${cameraMode} Photo`}
//       />
//     </>
//   );
// }

// import { useState } from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import { Badge } from "@/components/ui/badge";
// import { Camera, Save, LogIn, LogOut, Plus } from "lucide-react";
// import { apiRequest } from "@/lib/queryClient";
// import { useToast } from "@/hooks/use-toast";
// import CameraModal from "./camera-modal";
// import { z } from "zod";
// import { Controller } from "react-hook-form";

// const vehicleFormSchema = z.object({
//   vendorId: z.string().min(1, "Vendor is required"),
//   vehicleNumber: z.string().min(1, "Vehicle number is required"),
//   driverName: z.string().min(1, "Driver name is required"),
//   openingKm: z.string().optional(),
//   loaderName: z.string().optional(),
//   supervisorName: z.string().optional(),
// });

// interface VehicleFormProps {
//   storeId: number;
//   operatorId: number;
// }

// interface ManpowerMember {
//   name: string;
//   aadhaarNumber?: string;
//   phoneNumber?: string;
//   photoUrl?: string;
// }

// export default function VehicleForm({ storeId, operatorId }: VehicleFormProps) {
//   const { toast } = useToast();
//   const queryClient = useQueryClient();

//   const [vehicleNumber, setVehicleNumber] = useState("");
//   const [driverName, setDriverName] = useState("");
//   const [driverAadhaar, setDriverAadhaar] = useState("");
//   const [numberOfLoaders, setNumberOfLoaders] = useState(0);
//   const [loaders, setLoaders] = useState<Array<{
//     name: string;
//     aadhaarNumber: string;
//     phoneNumber?: string;
//     photoUrl?: string;
//   }>>([]);
//   const [vendorId, setVendorId] = useState<number | undefined>();
//   const [openingKm, setOpeningKm] = useState<number | undefined>();
//   const [driverPhotoUrl, setDriverPhotoUrl] = useState<string>("");

//   const [manpower, setManpower] = useState<ManpowerMember[]>([]);
//   const [showCamera, setShowCamera] = useState(false);
//   const [cameraMode, setCameraMode] = useState<"driver" | "manpower" | "loader">("driver");
//   const [manpowerIndex, setManpowerIndex] = useState(0);
//   const [loaderIndex, setLoaderIndex] = useState(0);

//   const addManpowerMember = () => {
//     setManpower((prev) => [...prev, { name: "" }]);
//   };

//   const updateManpowerMember = (index: number, field: string, value: string) => {
//     setManpower((prev) =>
//       prev.map((member, i) => (i === index ? { ...member, [field]: value } : member)),
//     );
//   };

//   const removeManpowerMember = (index: number) => {
//     setManpower((prev) => prev.filter((_, i) => i !== index));
//   };

//   const captureDriverPhoto = () => {
//     setShowCamera(true);
//     setCameraMode("driver");
//   };

//   const updateLoader = (index: number, field: string, value: string) => {
//     setLoaders(prev => {
//       const updated = [...prev];
//       if (!updated[index]) {
//         updated[index] = { name: '', aadhaarNumber: '', phoneNumber: '', photoUrl: '' };
//       }
//       updated[index] = { ...updated[index], [field]: value };
//       return updated;
//     });
//   };

//   const captureLoaderPhoto = (index: number) => {
//     setLoaderIndex(index);
//     setShowCamera(true);
//     setCameraMode("loader");
//   };

//   const form = useForm({
//     resolver: zodResolver(vehicleFormSchema),
//     defaultValues: {
//       vendorId: "",
//       vehicleNumber: "",
//       driverName: "",
//       openingKm: "",
//       loaderName: "",
//       supervisorName: "",
//     },
//   });

//   const { data: vendors } = useQuery({
//     queryKey: ["/api/vendors"],
//   });

//   const { data: activeVehicles } = useQuery({
//     queryKey: ["/api/dashboard/active-vehicles", storeId],
//   });

//   const vehicleEntryMutation = useMutation({
//     mutationFn: async (data: any) => {
//       return await apiRequest("POST", "/api/vehicles/entry", {
//         ...data,
//         storeId,
//         operatorId,
//         driverPhotoUrl: photos.driver,
//         manpower: [
//           ...(data.loaderName
//             ? [
//                 {
//                   name: data.loaderName,
//                   role: "loader",
//                   photoUrl: photos.loader,
//                 },
//               ]
//             : []),
//           ...(data.supervisorName
//             ? [
//                 {
//                   name: data.supervisorName,
//                   role: "supervisor",
//                   photoUrl: photos.supervisor,
//                 },
//               ]
//             : []),
//         ].filter(Boolean),
//       });
//     },
//     onSuccess: () => {
//       toast({
//         title: "Success",
//         description: "Vehicle checked in successfully",
//       });
//       form.reset();
//       setPhotos({});
//       queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
//     },
//     onError: (error: any) => {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to check in vehicle",
//         variant: "destructive",
//       });
//     },
//   });

//   const vehicleExitMutation = useMutation({
//     mutationFn: async (data: { checkinId: number; closingKm?: number }) => {
//       return await apiRequest("POST", "/api/vehicles/exit", data);
//     },
//     onSuccess: () => {
//       toast({
//         title: "Success",
//         description: "Vehicle checked out successfully",
//       });
//       form.reset();
//       queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
//     },
//     onError: (error: any) => {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to check out vehicle",
//         variant: "destructive",
//       });
//     },
//   });

//   // Handle vehicle selection for checkout
//   const handleVehicleSelect = (vehicleNumber: string) => {
//     const selectedVehicle = activeVehicles?.find(
//       (v: any) => v.vehicleNumber === vehicleNumber,
//     );
//     if (selectedVehicle && mode === "checkout") {
//       form.setValue("vehicleNumber", vehicleNumber);
//       form.setValue("driverName", selectedVehicle.driverName);
//       form.setValue("vendorId", selectedVehicle.vendorId?.toString() || "");
//     }
//   };

//   const handleSubmit = form.handleSubmit((data) => {
//     if (mode === "checkin") {
//        const entryData = {
//         vendorId: vendorId!,
//         vehicleNumber,
//         driverName,
//         driverAadhaarNumber: driverAadhaar || undefined,
//         driverPhotoUrl,
//         numberOfLoaders,
//         openingKm,
//         loaders: loaders.filter(l => l.name.trim() !== '' && l.aadhaarNumber.trim() !== ''),
//         manpower: manpower.filter(m => m.name.trim() !== ''),
//       };
//       vehicleEntryMutation.mutate({
//         ...data,
//         vendorId: parseInt(data.vendorId),
//         openingKm: data.openingKm ? parseInt(data.openingKm) : undefined,
//       });
//     } else {
//       // Handle checkout logic
//       const selectedVehicle = activeVehicles?.find(
//         (v: any) => v.vehicleNumber === data.vehicleNumber,
//       );
//       if (selectedVehicle) {
//         vehicleExitMutation.mutate({
//           checkinId: selectedVehicle.id,
//           closingKm: data.openingKm ? parseInt(data.openingKm) : undefined,
//         });
//       }
//     }
//   });

//   const handleCameraCapture = (photoDataUrl: string) => {
//      if (cameraMode === "driver") {
//             setDriverPhotoUrl(photoDataUrl);
//           } else if (cameraMode === "loader") {
//             updateLoader(loaderIndex, 'photoUrl', photoDataUrl);
//           } else {
//             setManpower((prev) =>
//               prev.map((member, i) =>
//                 i === manpowerIndex ? { ...member, photoUrl: photoDataUrl } : member,
//               ),
//             );
//           }
//           setShowCamera(false);
//   };

//   const openCamera = (type: "driver" | "loader" | "supervisor") => {
//     setCameraModal({ isOpen: true, type });
//   };

//   return (
//     <>
//       <Card>
//         <CardHeader>
//           <div className="flex items-center justify-between">
//             <CardTitle className="text-xl">Vehicle Entry/Exit</CardTitle>
//             <div className="flex items-center space-x-2">
//               <Button
//                 variant={mode === "checkin" ? "default" : "outline"}
//                 onClick={() => setMode("checkin")}
//                 className={
//                   mode === "checkin" ? "bg-success hover:bg-green-600" : ""
//                 }
//               >
//                 <LogIn className="mr-2 h-4 w-4" />
//                 Check In
//               </Button>
//               <Button
//                 variant={mode === "checkout" ? "default" : "outline"}
//                 onClick={() => setMode("checkout")}
//                 className={
//                   mode === "checkout" ? "bg-error hover:bg-red-600" : ""
//                 }
//               >
//                 <LogOut className="mr-2 h-4 w-4" />
//                 Check Out
//               </Button>
//             </div>
//           </div>
//         </CardHeader>
//         <CardContent>
//          <div>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div className="space-y-2">
//                 <Label htmlFor="vehicleNumber">Vehicle Number *</Label>
//                 <Input
//                   id="vehicleNumber"
//                   placeholder="MH01AB1234"
//                   value={vehicleNumber}
//                   onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
//                   className="uppercase"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="driverName">Driver Name *</Label>
//                 <Input
//                   id="driverName"
//                   placeholder="Driver's full name"
//                   value={driverName}
//                   onChange={(e) => setDriverName(e.target.value)}
//                 />
//               </div>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div className="space-y-2">
//                 <Label htmlFor="driverAadhaar">Driver Aadhaar Number</Label>
//                 <Input
//                   id="driverAadhaar"
//                   placeholder="123456789012"
//                   maxLength={12}
//                   value={driverAadhaar}
//                   onChange={(e) => setDriverAadhaar(e.target.value.replace(/\D/g, ''))}
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="numberOfLoaders">Number of Loaders</Label>
//                 <Input
//                   id="numberOfLoaders"
//                   type="number"
//                   min="0"
//                   max="10"
//                   value={numberOfLoaders}
//                   onChange={(e) => setNumberOfLoaders(parseInt(e.target.value) || 0)}
//                 />
//               </div>
//             </div>
//             {/* Loader Details Section */}
//             {numberOfLoaders > 0 && (
//               <div className="space-y-4">
//                 <Label className="text-base font-medium">Loader Details</Label>
//                 {Array.from({ length: numberOfLoaders }, (_, index) => (
//                   <div key={index} className="p-4 border rounded-lg space-y-3">
//                     <h4 className="font-medium">Loader {index + 1}</h4>
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                       <div className="space-y-2">
//                         <Label>Name *</Label>
//                         <Input
//                           placeholder="Loader's full name"
//                           value={loaders[index]?.name || ''}
//                           onChange={(e) => updateLoader(index, 'name', e.target.value)}
//                         />
//                       </div>
//                       <div className="space-y-2">
//                         <Label>Aadhaar Number *</Label>
//                         <Input
//                           placeholder="123456789012"
//                           maxLength={12}
//                           value={loaders[index]?.aadhaarNumber || ''}
//                           onChange={(e) => updateLoader(index, 'aadhaarNumber', e.target.value.replace(/\D/g, ''))}
//                         />
//                       </div>
//                       <div className="space-y-2">
//                         <Label>Phone Number</Label>
//                         <Input
//                           placeholder="Phone number"
//                           value={loaders[index]?.phoneNumber || ''}
//                           onChange={(e) => updateLoader(index, 'phoneNumber', e.target.value)}
//                         />
//                       </div>
//                       <div className="space-y-2">
//                         <Label>Photo</Label>
//                         <Button
//                           type="button"
//                           variant="outline"
//                           size="sm"
//                           onClick={() => captureLoaderPhoto(index)}
//                           className="w-full"
//                         >
//                           <Camera className="h-4 w-4 mr-2" />
//                           Capture Photo
//                         </Button>
//                         {loaders[index]?.photoUrl && (
//                           <div className="text-sm text-green-600">✓ Photo captured</div>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}

//             {/* Manpower Section */}
//             <div className="space-y-4">
//               <div className="flex items-center justify-between">
//                 <Label className="text-base font-medium">Additional Manpower</Label>
//                 <Button
//                   type="button"
//                   variant="outline"
//                   size="sm"
//                   onClick={addManpowerMember}
//                   className="flex items-center gap-2"
//                 >
//                   <Plus className="h-4 w-4" />
//                   Add Person
//                 </Button>
//               </div>
//               {manpower.map((member, index) => (
//                 <div key={index} className="p-4 border rounded-lg space-y-3">
//                   <h4 className="font-medium">Person {index + 1}</h4>
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                     <div className="space-y-2">
//                       <Label>Name *</Label>
//                       <Input
//                         placeholder="Full name"
//                         value={member.name}
//                         onChange={(e) => updateManpowerMember(index, 'name', e.target.value)}
//                       />
//                     </div>
//                     <div className="space-y-2">
//                       <Label>Aadhaar Number</Label>
//                       <Input
//                         placeholder="123456789012"
//                         maxLength={12}
//                         value={member.aadhaarNumber || ''}
//                         onChange={(e) => updateManpowerMember(index, 'aadhaarNumber', e.target.value.replace(/\D/g, ''))}
//                       />
//                     </div>
//                     <div className="space-y-2">
//                       <Label>Phone Number</Label>
//                       <Input
//                         placeholder="Phone number"
//                         value={member.phoneNumber || ''}
//                         onChange={(e) => updateManpowerMember(index, 'phoneNumber', e.target.value)}
//                       />
//                     </div>
//                     <div className="space-y-2">
//                       <Label>Photo</Label>
//                       <Button
//                         type="button"
//                         variant="outline"
//                         size="sm"
//                         onClick={() => {
//                           setManpowerIndex(index);
//                           setShowCamera(true);
//                           setCameraMode("manpower");
//                         }}
//                         className="w-full"
//                       >
//                         <Camera className="h-4 w-4 mr-2" />
//                         Capture Photo
//                       </Button>
//                       {member.photoUrl && (
//                         <div className="text-sm text-green-600">✓ Photo captured</div>
//                       )}
//                     </div>
//                   </div>
//                   <Button
//                     type="button"
//                     variant="destructive"
//                     size="sm"
//                     onClick={() => removeManpowerMember(index)}
//                   >
//                     Remove Person
//                   </Button>
//                 </div>
//               ))}
//             </div>
//             <Button onClick={handleSubmit}>Save</Button>
//           </div>
//         </CardContent>
//       </Card>

//       <CameraModal
//         isOpen={showCamera}
//         onClose={() => setShowCamera(false)}
//         onCapture={(photoUrl) => {
//           if (cameraMode === "driver") {
//             setDriverPhotoUrl(photoUrl);
//           } else if (cameraMode === "loader") {
//             updateLoader(loaderIndex, 'photoUrl', photoUrl);
//           } else {
//             setManpower((prev) =>
//               prev.map((member, i) =>
//                 i === manpowerIndex ? { ...member, photoUrl } : member,
//               ),
//             );
//           }
//           setShowCamera(false);
//         }}
//         title={`Capture ${cameraMode} Photo`}
//       />
//     </>
//   );
// }
