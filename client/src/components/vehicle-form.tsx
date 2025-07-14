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
import {
  Camera,
  Save,
  LogIn,
  LogOut,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CameraModal from "./camera-modal";
import { z } from "zod";

const vehicleFormSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
  driverName: z.string().min(1, "Driver name is required"),
  aadhaarNumber: z.string().min(12, "Aadhaar number must be 12 digits"),
  openingKm: z.string().min(1, "KM is required"),
});

const supervisorFormSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  name: z.string().min(1, "Supervisor name is required"),
  aadhaarNumber: z.string().min(12, "Aadhaar number must be 12 digits"),
  phoneNumber: z.string().optional(),
});

const loaderFormSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  name: z.string().min(1, "Loader name is required"),
  aadhaarNumber: z.string().min(12, "Aadhaar number must be 12 digits"),
  phoneNumber: z.string().optional(),
});

interface VehicleFormProps {
  storeId: number;
  operatorId: number;
}

export default function VehicleForm({ storeId, operatorId }: VehicleFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Vehicle form state
  const [vehicleMode, setVehicleMode] = useState<"checkin" | "checkout">(
    "checkin",
  );
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverAadhaar, setDriverAadhaar] = useState("");
  const [vendorId, setVendorId] = useState<number | undefined>();
  const [openingKm, setOpeningKm] = useState<number | undefined>();

  // Supervisor form state
  const [supervisorVendorId, setSupervisorVendorId] = useState<
    number | undefined
  >();
  const [supervisorName, setSupervisorName] = useState("");
  const [supervisorAadhaar, setSupervisorAadhaar] = useState("");
  const [supervisorPhone, setSupervisorPhone] = useState("");

  // Loader form state
  const [loaderVendorId, setLoaderVendorId] = useState<number | undefined>();
  const [loaderName, setLoaderName] = useState("");
  const [loaderAadhaar, setLoaderAadhaar] = useState("");
  const [loaderPhone, setLoaderPhone] = useState("");

  // Updated camera state (working version)
  const [cameraModal, setCameraModal] = useState<{
    isOpen: boolean;
    type: "driver" | "loader" | "supervisor";
  }>({ isOpen: false, type: "driver" });

  // Updated photos state (working version)
  const [photos, setPhotos] = useState<{
    driver?: string;
    loader?: string;
    supervisor?: string;
  }>({});

  // Active section state
  const [activeSection, setActiveSection] = useState<
    "vehicle" | "supervisor" | "loader"
  >("vehicle");

  const vehicleForm = useForm({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      vendorId: "",
      vehicleNumber: "",
      driverName: "",
      aadhaarNumber: "",
      openingKm: "",
    },
  });

  const supervisorForm = useForm({
    resolver: zodResolver(supervisorFormSchema),
    defaultValues: {
      vendorId: "",
      name: "",
      aadhaarNumber: "",
      phoneNumber: "",
    },
  });

  const loaderForm = useForm({
    resolver: zodResolver(loaderFormSchema),
    defaultValues: {
      vendorId: "",
      name: "",
      aadhaarNumber: "",
      phoneNumber: "",
    },
  });

  const getFieldLabel = (baseLabel: string, fieldName: string, schema: any) => {
    try {
      const field = schema.shape[fieldName];
      const isRequired = !field.isOptional();
      return baseLabel + (isRequired ? " *" : "");
    } catch {
      return baseLabel;
    }
  };

  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const { data: activeVehicles } = useQuery({
    queryKey: ["/api/dashboard/active-vehicles", storeId],
  });

  // Vehicle mutations
  const vehicleEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/vehicles/entry", {
        ...data,
        storeId,
        operatorId,
        driverPhotoUrl: photos.driver,
        driverAadhaarNumber: driverAadhaar || undefined,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vehicle checked in successfully",
      });
      resetVehicleForm();
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
      resetVehicleForm();
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

  // Supervisor mutation
  const supervisorMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/supervisors", {
        ...data,
        storeId,
        operatorId,
        photoUrl: photos.supervisor,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Supervisor added successfully",
      });
      resetSupervisorForm();
      queryClient.invalidateQueries({ queryKey: ["/api/supervisors"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add supervisor",
        variant: "destructive",
      });
    },
  });

  // Loader mutation
  const loaderMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/loaders", {
        ...data,
        storeId,
        operatorId,
        photoUrl: photos.loader,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Loader added successfully",
      });
      resetLoaderForm();
      queryClient.invalidateQueries({ queryKey: ["/api/loaders"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add loader",
        variant: "destructive",
      });
    },
  });

  // Reset functions
  const resetVehicleForm = () => {
    vehicleForm.reset();
    setVehicleNumber("");
    setDriverName("");
    setDriverAadhaar("");
    setVendorId(undefined);
    setOpeningKm(undefined);
    // Clear photos when resetting
    setPhotos((prev) => ({ ...prev, driver: undefined }));
  };

  const resetSupervisorForm = () => {
    supervisorForm.reset();
    setSupervisorVendorId(undefined);
    setSupervisorName("");
    setSupervisorAadhaar("");
    setSupervisorPhone("");
    // Clear photos when resetting
    setPhotos((prev) => ({ ...prev, supervisor: undefined }));
  };

  const resetLoaderForm = () => {
    loaderForm.reset();
    setLoaderVendorId(undefined);
    setLoaderName("");
    setLoaderAadhaar("");
    setLoaderPhone("");
    // Clear photos when resetting
    setPhotos((prev) => ({ ...prev, loader: undefined }));
  };

  // Handle vehicle selection for checkout
  // Add new function for vehicle number input
  const handleVehicleNumberChange = (value: string) => {
    setVehicleNumber(value.toUpperCase());

    if (vehicleMode === "checkout" && value.length > 0) {
      const selectedVehicle = activeVehicles?.find(
        (v: any) => v.vehicleNumber.toUpperCase() === value.toUpperCase(),
      );

      if (selectedVehicle) {
        vehicleForm.setValue("vehicleNumber", value.toUpperCase());
        vehicleForm.setValue("driverName", selectedVehicle.driverName);
        vehicleForm.setValue(
          "vendorId",
          selectedVehicle.vendorId?.toString() || "",
        );
        setDriverName(selectedVehicle.driverName);
        setVendorId(selectedVehicle.vendorId);
      } else {
        // Clear fields if no match
        vehicleForm.setValue("driverName", "");
        vehicleForm.setValue("vendorId", "");
        setDriverName("");
        setVendorId(undefined);
      }
    }
  };

  // handleVehicleSelect for dropdown
  const handleVehicleSelect = (vehicleNumber: string) => {
    const selectedVehicle = activeVehicles?.find(
      (v: any) => v.vehicleNumber === vehicleNumber,
    );
    if (selectedVehicle && vehicleMode === "checkout") {
      vehicleForm.setValue("vehicleNumber", vehicleNumber);
      vehicleForm.setValue("driverName", selectedVehicle.driverName);
      vehicleForm.setValue(
        "vendorId",
        selectedVehicle.vendorId?.toString() || "",
      );
      setVehicleNumber(vehicleNumber);
      setDriverName(selectedVehicle.driverName);
      setVendorId(selectedVehicle.vendorId);
    }
  };

  // Submit handlers
  const handleVehicleSubmit = vehicleForm.handleSubmit((data) => {
    if (vehicleMode === "checkin") {
      vehicleEntryMutation.mutate({
        ...data,
        vendorId: parseInt(data.vendorId),
        openingKm: data.openingKm ? parseInt(data.openingKm) : undefined,
      });
    } else {
      const selectedVehicle = activeVehicles?.find(
        (v: any) =>
          v.vehicleNumber.toUpperCase() === data.vehicleNumber.toUpperCase(),
      );
      if (selectedVehicle) {
        vehicleExitMutation.mutate({
          checkinId: selectedVehicle.id,
          closingKm: data.openingKm ? parseInt(data.openingKm) : undefined,
        });
      }
    }
  });

  const handleSupervisorSubmit = supervisorForm.handleSubmit((data) => {
    supervisorMutation.mutate({
      ...data,
      vendorId: parseInt(data.vendorId),
    });
  });

  const handleLoaderSubmit = loaderForm.handleSubmit((data) => {
    loaderMutation.mutate({
      ...data,
      vendorId: parseInt(data.vendorId),
    });
  });

  // Updated camera handlers (working version)
  const handleCameraCapture = (photoDataUrl: string) => {
    console.log("Captured Photo Data URL:", photoDataUrl);
    console.log("Camera type:", cameraModal.type);
    setPhotos((prev) => ({ ...prev, [cameraModal.type]: photoDataUrl }));
    setCameraModal({ isOpen: false, type: "driver" });
  };

  const openCamera = (type: "driver" | "loader" | "supervisor") => {
    setCameraModal({ isOpen: true, type });
  };

  return (
    <>
      <div className="space-y-6">
        {/* Section Navigation */}
        <div className="flex space-x-2 mb-6">
          <Button
            variant={activeSection === "vehicle" ? "default" : "outline"}
            onClick={() => setActiveSection("vehicle")}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Vehicle Management
          </Button>
          <Button
            variant={activeSection === "supervisor" ? "default" : "outline"}
            onClick={() => setActiveSection("supervisor")}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Supervisor Management
          </Button>
          <Button
            variant={activeSection === "loader" ? "default" : "outline"}
            onClick={() => setActiveSection("loader")}
          >
            <Users className="mr-2 h-4 w-4" />
            Loader Management
          </Button>
        </div>

        {/* Vehicle Management Section */}
        {activeSection === "vehicle" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Vehicle Entry/Exit</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={vehicleMode === "checkin" ? "default" : "outline"}
                    onClick={() => setVehicleMode("checkin")}
                    className={
                      vehicleMode === "checkin"
                        ? "bg-green-600 hover:bg-green-700"
                        : ""
                    }
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Check In
                  </Button>
                  <Button
                    variant={vehicleMode === "checkout" ? "default" : "outline"}
                    onClick={() => setVehicleMode("checkout")}
                    className={
                      vehicleMode === "checkout"
                        ? "bg-red-600 hover:bg-red-700"
                        : ""
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
                {/* Vendor Selection for Check In */}
                {vehicleMode === "checkin" && (
                  <div className="space-y-2">
                    <Label>
                      {getFieldLabel("Vendor", "vendorId", vehicleFormSchema)}
                    </Label>
                    <Select
                      value={vehicleForm.watch("vendorId")}
                      onValueChange={(value) => {
                        vehicleForm.setValue("vendorId", value);
                        setVendorId(parseInt(value));
                      }}
                    >
                      <SelectTrigger
                        className={
                          vehicleForm.formState.errors.vendorId
                            ? "border-red-500"
                            : ""
                        }
                      >
                        <SelectValue placeholder="Select a vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors?.map((vendor: any) => (
                          <SelectItem
                            key={vendor.id}
                            value={vendor.id.toString()}
                          >
                            {vendor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {vehicleForm.formState.errors.vendorId && (
                      <p className="text-sm text-red-500">
                        {vehicleForm.formState.errors.vendorId.message}
                      </p>
                    )}
                  </div>
                )}
                {/* Vehicle Selection for Check Out */}
                {vehicleMode === "checkout" && (
                  <div className="space-y-2">
                    <Label>Select Vehicle to Check Out *</Label>
                    <Select
                      value={vehicleNumber}
                      onValueChange={handleVehicleSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an active vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeVehicles?.map((vehicle: any) => (
                          <SelectItem
                            key={vehicle.id}
                            value={vehicle.vehicleNumber}
                          >
                            {vehicle.vehicleNumber} - {vehicle.driverName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {getFieldLabel(
                        "Vehicle Number",
                        "vehicleNumber",
                        vehicleFormSchema,
                      )}
                    </Label>
                    {vehicleMode === "checkout" ? (
                      <div className="space-y-2">
                        <Input
                          placeholder="Type vehicle number (e.g., MH01AB1234)"
                          value={vehicleForm.watch("vehicleNumber")}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase();
                            vehicleForm.setValue("vehicleNumber", value);
                            handleVehicleNumberChange(value);
                          }}
                          className={`uppercase ${vehicleForm.formState.errors.vehicleNumber ? "border-red-500" : ""}`}
                        />
                        <p className="text-xs text-gray-500">
                          Type vehicle number to auto-fill details
                        </p>
                      </div>
                    ) : (
                      <Input
                        placeholder="MH01AB1234"
                        value={vehicleForm.watch("vehicleNumber")}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          vehicleForm.setValue("vehicleNumber", value);
                          setVehicleNumber(value);
                        }}
                        className={`uppercase ${vehicleForm.formState.errors.vehicleNumber ? "border-red-500" : ""}`}
                      />
                    )}
                    {vehicleForm.formState.errors.vehicleNumber && (
                      <p className="text-sm text-red-500">
                        {vehicleForm.formState.errors.vehicleNumber.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>
                      {getFieldLabel(
                        "Driver Name",
                        "driverName",
                        vehicleFormSchema,
                      )}
                    </Label>
                    <Input
                      placeholder="Driver's full name"
                      value={vehicleForm.watch("driverName")}
                      onChange={(e) => {
                        vehicleForm.setValue("driverName", e.target.value);
                        setDriverName(e.target.value);
                      }}
                      disabled={vehicleMode === "checkout"}
                      className={
                        vehicleForm.formState.errors.driverName
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {vehicleForm.formState.errors.driverName && (
                      <p className="text-sm text-red-500">
                        {vehicleForm.formState.errors.driverName.message}
                      </p>
                    )}
                  </div>
                </div>

                {vehicleMode === "checkin" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>
                          {getFieldLabel(
                            "Driver Aadhaar Number",
                            "aadhaarNumber",
                            vehicleFormSchema,
                          )}
                        </Label>
                        <Input
                          placeholder="123456789012"
                          maxLength={12}
                          value={vehicleForm.watch("aadhaarNumber")}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            vehicleForm.setValue("aadhaarNumber", value);
                            setDriverAadhaar(value);
                          }}
                          className={
                            vehicleForm.formState.errors.aadhaarNumber
                              ? "border-red-500"
                              : ""
                          }
                        />
                        {vehicleForm.formState.errors.aadhaarNumber && (
                          <p className="text-sm text-red-500">
                            {vehicleForm.formState.errors.aadhaarNumber.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>
                          {getFieldLabel(
                            "Opening KM",
                            "openingKm",
                            vehicleFormSchema,
                          )}
                        </Label>
                        <Input
                          type="number"
                          placeholder="Enter kilometers"
                          value={vehicleForm.watch("openingKm")}
                          onChange={(e) => {
                            vehicleForm.setValue("openingKm", e.target.value);
                            setOpeningKm(parseInt(e.target.value) || undefined);
                          }}
                          className={
                            vehicleForm.formState.errors.openingKm
                              ? "border-red-500"
                              : ""
                          }
                        />
                        {vehicleForm.formState.errors.openingKm && (
                          <p className="text-sm text-red-500">
                            {vehicleForm.formState.errors.openingKm.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Driver Photo Section */}
                    <div className="space-y-2">
                      <Label>Driver Photo</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        {photos.driver ? (
                          <div className="space-y-2">
                            <img
                              src={photos.driver}
                              alt="Driver"
                              className="w-32 h-32 object-cover rounded-lg mx-auto"
                            />
                            <Badge variant="secondary">Photo captured</Badge>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Camera className="h-12 w-12 text-gray-400 mx-auto" />
                            <p className="text-sm text-gray-600">
                              Click to capture driver photo
                            </p>
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openCamera("driver")}
                          className="mt-2"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          {photos.driver ? "Retake Photo" : "Capture Photo"}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {vehicleMode === "checkout" && (
                  <div className="space-y-2">
                    <Label>
                      {getFieldLabel(
                        "Closing KM",
                        "openingKm",
                        vehicleFormSchema,
                      )}
                    </Label>
                    <Input
                      type="number"
                      placeholder="Enter kilometers"
                      value={vehicleForm.watch("openingKm")}
                      onChange={(e) => {
                        vehicleForm.setValue("openingKm", e.target.value);
                        setOpeningKm(parseInt(e.target.value) || undefined);
                      }}
                      className={
                        vehicleForm.formState.errors.openingKm
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {vehicleForm.formState.errors.openingKm && (
                      <p className="text-sm text-red-500">
                        {vehicleForm.formState.errors.openingKm.message}
                      </p>
                    )}
                  </div>
                )}

                <Button
                  onClick={handleVehicleSubmit}
                  disabled={
                    vehicleEntryMutation.isPending ||
                    vehicleExitMutation.isPending
                  }
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {vehicleMode === "checkin"
                    ? "Check In Vehicle"
                    : "Check Out Vehicle"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Supervisor Management Section */}
        {activeSection === "supervisor" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Supervisor Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    {getFieldLabel("Vendor", "vendorId", supervisorFormSchema)}
                  </Label>
                  <Select
                    value={supervisorForm.watch("vendorId")}
                    onValueChange={(value) => {
                      supervisorForm.setValue("vendorId", value);
                      setSupervisorVendorId(parseInt(value));
                    }}
                  >
                    <SelectTrigger
                      className={
                        supervisorForm.formState.errors.vendorId
                          ? "border-red-500"
                          : ""
                      }
                    >
                      <SelectValue placeholder="Select a vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors?.map((vendor: any) => (
                        <SelectItem
                          key={vendor.id}
                          value={vendor.id.toString()}
                        >
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {supervisorForm.formState.errors.vendorId && (
                    <p className="text-sm text-red-500">
                      {supervisorForm.formState.errors.vendorId.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {getFieldLabel(
                        "Supervisor Name",
                        "name",
                        supervisorFormSchema,
                      )}
                    </Label>
                    <Input
                      placeholder="Supervisor's full name"
                      value={supervisorForm.watch("name")}
                      onChange={(e) => {
                        supervisorForm.setValue("name", e.target.value);
                        setSupervisorName(e.target.value);
                      }}
                      className={
                        supervisorForm.formState.errors.name
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {supervisorForm.formState.errors.name && (
                      <p className="text-sm text-red-500">
                        {supervisorForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>
                      {getFieldLabel(
                        "Aadhaar Number",
                        "aadhaarNumber",
                        supervisorFormSchema,
                      )}
                    </Label>
                    <Input
                      placeholder="123456789012"
                      maxLength={12}
                      value={supervisorForm.watch("aadhaarNumber")}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        supervisorForm.setValue("aadhaarNumber", value);
                        setSupervisorAadhaar(value);
                      }}
                      className={
                        supervisorForm.formState.errors.aadhaarNumber
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {supervisorForm.formState.errors.aadhaarNumber && (
                      <p className="text-sm text-red-500">
                        {supervisorForm.formState.errors.aadhaarNumber.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {getFieldLabel(
                        "Phone Number",
                        "phoneNumber",
                        supervisorFormSchema,
                      )}
                    </Label>
                    <Input
                      placeholder="Phone number"
                      value={supervisorForm.watch("phoneNumber")}
                      onChange={(e) => {
                        supervisorForm.setValue("phoneNumber", e.target.value);
                        setSupervisorPhone(e.target.value);
                      }}
                      className={
                        supervisorForm.formState.errors.phoneNumber
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {supervisorForm.formState.errors.phoneNumber && (
                      <p className="text-sm text-red-500">
                        {supervisorForm.formState.errors.phoneNumber.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Supervisor Photo Section - Optional */}
                <div className="space-y-2">
                  <Label>Supervisor Photo</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    {photos.supervisor ? (
                      <div className="space-y-2">
                        <img
                          src={photos.supervisor}
                          alt="Supervisor"
                          className="w-32 h-32 object-cover rounded-lg mx-auto"
                        />
                        <Badge variant="secondary">Photo captured</Badge>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Camera className="h-12 w-12 text-gray-400 mx-auto" />
                        <p className="text-sm text-gray-600">
                          Click to capture supervisor photo
                        </p>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openCamera("supervisor")}
                      className="mt-2"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      {photos.supervisor ? "Retake Photo" : "Capture Photo"}
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleSupervisorSubmit}
                  disabled={supervisorMutation.isPending}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Add Supervisor
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loader Management Section */}
        {activeSection === "loader" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Loader Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    {getFieldLabel("Vendor", "vendorId", loaderFormSchema)}
                  </Label>
                  <Select
                    value={loaderForm.watch("vendorId")}
                    onValueChange={(value) => {
                      loaderForm.setValue("vendorId", value);
                      setLoaderVendorId(parseInt(value));
                    }}
                  >
                    <SelectTrigger
                      className={
                        loaderForm.formState.errors.vendorId
                          ? "border-red-500"
                          : ""
                      }
                    >
                      <SelectValue placeholder="Select a vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors?.map((vendor: any) => (
                        <SelectItem
                          key={vendor.id}
                          value={vendor.id.toString()}
                        >
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {loaderForm.formState.errors.vendorId && (
                    <p className="text-sm text-red-500">
                      {loaderForm.formState.errors.vendorId.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {getFieldLabel("Loader Name", "name", loaderFormSchema)}
                    </Label>
                    <Input
                      placeholder="Loader's full name"
                      value={loaderForm.watch("name")}
                      onChange={(e) => {
                        loaderForm.setValue("name", e.target.value);
                        setLoaderName(e.target.value);
                      }}
                      className={
                        loaderForm.formState.errors.name ? "border-red-500" : ""
                      }
                    />
                    {loaderForm.formState.errors.name && (
                      <p className="text-sm text-red-500">
                        {loaderForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>
                      {getFieldLabel(
                        "Aadhaar Number",
                        "aadhaarNumber",
                        loaderFormSchema,
                      )}
                    </Label>
                    <Input
                      placeholder="123456789012"
                      maxLength={12}
                      value={loaderForm.watch("aadhaarNumber")}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        loaderForm.setValue("aadhaarNumber", value);
                        setLoaderAadhaar(value);
                      }}
                      className={
                        loaderForm.formState.errors.aadhaarNumber
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {loaderForm.formState.errors.aadhaarNumber && (
                      <p className="text-sm text-red-500">
                        {loaderForm.formState.errors.aadhaarNumber.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {getFieldLabel(
                        "Phone Number",
                        "phoneNumber",
                        loaderFormSchema,
                      )}
                    </Label>
                    <Input
                      placeholder="Phone number"
                      value={loaderForm.watch("phoneNumber")}
                      onChange={(e) => {
                        loaderForm.setValue("phoneNumber", e.target.value);
                        setLoaderPhone(e.target.value);
                      }}
                      className={
                        loaderForm.formState.errors.phoneNumber
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {loaderForm.formState.errors.phoneNumber && (
                      <p className="text-sm text-red-500">
                        {loaderForm.formState.errors.phoneNumber.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Loader Photo Section - Optional */}
                <div className="space-y-2">
                  <Label>Loader Photo</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    {photos.loader ? (
                      <div className="space-y-2">
                        <img
                          src={photos.loader}
                          alt="Loader"
                          className="w-32 h-32 object-cover rounded-lg mx-auto"
                        />
                        <Badge variant="secondary">Photo captured</Badge>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Camera className="h-12 w-12 text-gray-400 mx-auto" />
                        <p className="text-sm text-gray-600">
                          Click to capture loader photo
                        </p>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openCamera("loader")}
                      className="mt-2"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      {photos.loader ? "Retake Photo" : "Capture Photo"}
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleLoaderSubmit}
                  disabled={loaderMutation.isPending}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Add Loader
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <CameraModal
        isOpen={cameraModal.isOpen}
        onClose={() => setCameraModal({ isOpen: false, type: "driver" })}
        onCapture={handleCameraCapture}
        title={`Capture ${cameraModal.type} Photo`}
      />
    </>
  );
}
