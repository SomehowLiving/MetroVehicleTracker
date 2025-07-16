import { useState, useEffect } from "react";
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
// import { LoaderManagement } from "./loaderManagement.tsx";

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

  const [closingKm, setClosingKm] = useState<number | undefined>();
  const [selectedCheckinId, setSelectedCheckinId] = useState<
    number | undefined
  >();
  const [isVehicleFound, setIsVehicleFound] = useState(false);
  // In your component, make sure you have this state declared:
  const [activeVehicles, setActiveVehicles] = useState<any[]>([]);

  // Enhanced version with live search suggestions:

  const [vehicleSuggestions, setVehicleSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Supervisor form state
  const [supervisorVendorId, setSupervisorVendorId] = useState<
    number | undefined
  >();
  const [supervisorName, setSupervisorName] = useState("");
  const [supervisorAadhaar, setSupervisorAadhaar] = useState("");
  const [supervisorPhone, setSupervisorPhone] = useState("");
  const [supervisorCheckinId, setSupervisorCheckinId] = useState(null);
  const [loaderCheckinId, setLoaderCheckinId] = useState(null);

  // Loader form state
  const [loaderVendorId, setLoaderVendorId] = useState<number | undefined>();
  const [loaderName, setLoaderName] = useState("");
  const [loaderAadhaar, setLoaderAadhaar] = useState("");
  const [loaderPhone, setLoaderPhone] = useState("");

  // Supervisor states
  const [supervisorMode, setSupervisorMode] = useState("checkin");
  const [supervisorSearchTerm, setSupervisorSearchTerm] = useState("");
  const [isSupervisorFound, setIsSupervisorFound] = useState(false);
  const [supervisorVendorName, setSupervisorVendorName] = useState("");
  const [supervisorCheckInTime, setSupervisorCheckInTime] = useState("");

  // Loader states
  const [loaderMode, setLoaderMode] = useState("checkin");
  const [loaderSearchTerm, setLoaderSearchTerm] = useState("");
  const [isLoaderFound, setIsLoaderFound] = useState(false);
  const [loaderVendorName, setLoaderVendorName] = useState("");
  const [loaderCheckInTime, setLoaderCheckInTime] = useState("");

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

  const fetchActiveVehicles = async () => {
    try {
      const response = await fetch("/api/vehicles/active");
      const data = await response.json();

      // Debug: Log the fetched data
      console.log("Fetched active vehicles:", data);

      // Set the active vehicles state
      setActiveVehicles(data);
    } catch (error) {
      console.error("Error fetching active vehicles:", error);
      toast({
        title: "Error",
        description: "Failed to load active vehicles",
        variant: "destructive",
      });
    }
  };

  const vehicleForm = useForm({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      vendorId: "", // this will be a string from the dropdown
      vehicleNumber: "",
      driverName: "",
      aadhaarNumber: "",
      openingKm: "",
      // operatorId: 1,
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

  const { data: fetchedactiveVehicles } = useQuery({
    queryKey: ["/api/dashboard/active-vehicles", storeId],
  });
  // Vehicle mutations
  const vehicleEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Vehicle entry mutation data:", data);
      // Convert string fields to number where needed before sending to API
      console.log("Resolved operatorId:", operatorId);
      const payload = {
        ...data,
        vendorId: Number(data.vendorId),
        openingKm: data.openingKm ? Number(data.openingKm) : undefined,
        storeId: Number(storeId), // from hook/context
        //operatorId: user?.id,
        operatorId: Number(operatorId) || 1, // from auth context or similar
        driverPhotoUrl: photos.driver,
        driverAadhaarNumber: driverAadhaar || undefined,
      };
      console.log("Sending payload:", payload);
      // Send the cleaned payload to your API
      return await apiRequest("POST", "/api/vehicles/entry", payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vehicle checked in successfully",
      });
      resetVehicleForm();
      // Refresh active vehicles list
      fetchActiveVehicles();
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

  // Form submission handlers
  const onVehicleSubmit = (data: any) => {
    console.log("Vehicle form submitted:", data);
    vehicleEntryMutation.mutate(data);
  };

  const onSupervisorSubmit = (data: any) => {
    console.log("Supervisor form submitted:", data);
    // Add supervisor mutation logic here
  };

  const onLoaderSubmit = (data: any) => {
    console.log("Loader form submitted:", data);
    // Add loader mutation logic here
  };

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
      // Refresh active vehicles list
      fetchActiveVehicles();
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

  const supervisorCheckinMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch("/api/supervisor/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to check in supervisor");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["activeSupervisors"]);
    },
  });

  const supervisorCheckoutMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch("/api/supervisor/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to check out supervisor");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["activeSupervisors"]);
    },
  });

  const loaderCheckinMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch("/api/labour/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to check in loader");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["activeLoaders"]);
    },
  });

  const loaderCheckoutMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch("/api/labour/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to check out loader");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["activeLoaders"]);
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
    setClosingKm(undefined);
    setSelectedCheckinId(undefined);
    setIsVehicleFound(false);
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

  // Handle vehicle number input for checkout
  const handleVehicleNumberChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setVehicleNumber(upperValue);
    vehicleForm.setValue("vehicleNumber", upperValue);

    if (vehicleMode === "checkout" && upperValue.length > 0) {
      console.log("Active vehicles:", activeVehicles);
      console.log("Searching for vehicle:", upperValue);

      // First, try exact match
      const exactMatch = activeVehicles?.find((v: any) => {
        const vehicleNum = v.vehicleNumber?.toUpperCase();
        const isActive = v.status === "In";
        return vehicleNum === upperValue && isActive;
      });

      if (exactMatch) {
        // Exact match found - populate details
        console.log("Exact match found:", exactMatch);

        vehicleForm.setValue("driverName", exactMatch.driverName || "");
        vehicleForm.setValue("aadhaarNumber", exactMatch.aadhaarNumber || "");
        vehicleForm.setValue(
          "openingKm",
          exactMatch.openingKm?.toString() || "",
        );

        setDriverName(exactMatch.driverName || "");
        setDriverAadhaar(exactMatch.aadhaarNumber || "");
        setOpeningKm(parseFloat(exactMatch.openingKm) || undefined);
        setSelectedCheckinId(exactMatch.id);
        setIsVehicleFound(true);
        setShowSuggestions(false);

        vehicleForm.clearErrors("vehicleNumber");

        toast({
          title: "Success",
          description: `Vehicle ${exactMatch.vehicleNumber} found - Driver: ${exactMatch.driverName}`,
          variant: "default",
        });
      } else {
        // No exact match - show suggestions if input is substantial
        if (upperValue.length >= 2) {
          const suggestions =
            activeVehicles?.filter((v: any) => {
              const vehicleNum = v.vehicleNumber?.toUpperCase();
              const isActive = v.status === "In";
              return vehicleNum?.includes(upperValue) && isActive;
            }) || [];

          console.log("Suggestions found:", suggestions);
          setVehicleSuggestions(suggestions);
          setShowSuggestions(suggestions.length > 0);
        } else {
          setShowSuggestions(false);
        }

        // Clear form data
        vehicleForm.setValue("driverName", "");
        vehicleForm.setValue("aadhaarNumber", "");
        vehicleForm.setValue("openingKm", "");

        setDriverName("");
        setDriverAadhaar("");
        setOpeningKm(undefined);
        setSelectedCheckinId(undefined);
        setIsVehicleFound(false);
        setClosingKm(undefined);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  // Function to select a suggestion
  const selectVehicleSuggestion = (vehicle: any) => {
    setVehicleNumber(vehicle.vehicleNumber);
    vehicleForm.setValue("vehicleNumber", vehicle.vehicleNumber);
    setShowSuggestions(false);

    // Trigger the search with the selected vehicle
    handleVehicleNumberChange(vehicle.vehicleNumber);
  };

  // Handle closing KM input
  const handleClosingKmChange = (value: string) => {
    const numValue = parseInt(value) || undefined;
    setClosingKm(numValue);

    // Validate against opening KM
    if (numValue && openingKm && numValue < openingKm) {
      // Show error but still allow input
      return;
    }
  };

  useEffect(() => {
    fetchActiveVehicles();
  }, []);

  // Fixed: Reset function for mode change
  const handleModeChange = (mode: "checkin" | "checkout") => {
    setVehicleMode(mode);
    resetVehicleForm();
    // Refresh active vehicles when switching to checkout
    if (mode === "checkout") {
      fetchActiveVehicles();
    }
  };

  const handleVehicleSubmit = () => {
    if (vehicleMode === "checkin") {
      // Use form validation for checkin
      vehicleForm.handleSubmit((data) => {
        vehicleEntryMutation.mutate({
          ...data,
          vendorId: parseInt(data.vendorId),
          openingKm: data.openingKm ? parseInt(data.openingKm) : undefined,
        });
      })();
    } else {
      // Direct handling for checkout (no form validation needed)
      if (!isVehicleFound) {
        toast({
          title: "Error",
          description: "Vehicle not found in active vehicles",
          variant: "destructive",
        });
        return;
      }
      if (!selectedCheckinId || !closingKm) {
        toast({
          title: "Error",
          description: "Please enter closing KM",
          variant: "destructive",
        });
        return;
      }
      if (closingKm < (openingKm || 0)) {
        toast({
          title: "Error",
          description: "Closing KM cannot be less than opening KM",
          variant: "destructive",
        });
        return;
      }
      vehicleExitMutation.mutate({
        checkinId: selectedCheckinId,
        closingKm: closingKm,
      });
    }
  };

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

  // // Supervisor and loader handlers
  const handleSupervisorModeChange = (mode) => {
    setSupervisorMode(mode);
    supervisorForm.reset();
    setSupervisorName("");
    setSupervisorAadhaar("");
    setSupervisorPhone("");
    setSupervisorVendorId(null);
    setSupervisorSearchTerm("");
    setIsSupervisorFound(false);
    setSupervisorVendorName("");
    setSupervisorCheckInTime("");
    setSupervisorCheckinId(null); // Add this line

    if (photos.supervisor) {
      setPhotos((prev) => ({ ...prev, supervisor: null }));
    }
  };

  const handleLoaderModeChange = (mode) => {
    setLoaderMode(mode);
    loaderForm.reset();
    setLoaderName("");
    setLoaderAadhaar("");
    setLoaderPhone("");
    setLoaderVendorId(null);
    setLoaderSearchTerm("");
    setIsLoaderFound(false);
    setLoaderVendorName("");
    setLoaderCheckInTime("");
    setLoaderCheckinId(null); // Add this line

    if (photos.loader) {
      setPhotos((prev) => ({ ...prev, loader: null }));
    }
  };

  const handleSupervisorSearch = (searchTerm) => {
    setSupervisorSearchTerm(searchTerm);
    supervisorForm.setValue("name", searchTerm);

    if (!searchTerm.trim()) {
      setIsSupervisorFound(false);
      setSupervisorName("");
      setSupervisorAadhaar("");
      setSupervisorPhone("");
      setSupervisorVendorName("");
      setSupervisorCheckInTime("");
      setSupervisorCheckinId(null); // Add this line
      return;
    }

    const activeSupervisors = Array.isArray(activeSupervisorsData)
      ? activeSupervisorsData
      : [];

    const foundSupervisor = activeSupervisors.find(
      (supervisor) =>
        supervisor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supervisor.aadhaarNumber.includes(searchTerm) ||
        supervisor.phoneNumber.includes(searchTerm),
    );

    if (foundSupervisor) {
      setIsSupervisorFound(true);
      setSupervisorName(foundSupervisor.name);
      setSupervisorAadhaar(foundSupervisor.aadhaarNumber);
      setSupervisorPhone(foundSupervisor.phoneNumber);
      setSupervisorVendorName(foundSupervisor.vendorName);
      setSupervisorCheckInTime(foundSupervisor.checkInTime);
      setSupervisorCheckinId(foundSupervisor.checkinId); // Add this line

      supervisorForm.setValue("name", foundSupervisor.name);
      supervisorForm.setValue("aadhaarNumber", foundSupervisor.aadhaarNumber);
      supervisorForm.setValue("phoneNumber", foundSupervisor.phoneNumber);
      supervisorForm.setValue(
        "vendorId",
        foundSupervisor.vendorId?.toString() || "",
      );
    } else {
      setIsSupervisorFound(false);
      setSupervisorName("");
      setSupervisorAadhaar("");
      setSupervisorPhone("");
      setSupervisorVendorName("");
      setSupervisorCheckInTime("");
      setSupervisorCheckinId(null); // Add this line
    }
  };

  const handleLoaderSearch = (searchTerm) => {
    setLoaderSearchTerm(searchTerm);
    loaderForm.setValue("name", searchTerm);

    if (!searchTerm.trim()) {
      setIsLoaderFound(false);
      setLoaderName("");
      setLoaderAadhaar("");
      setLoaderPhone("");
      setLoaderVendorName("");
      setLoaderCheckInTime("");
      setLoaderCheckinId(null); // Add this line
      return;
    }

    const activeLoaders = Array.isArray(activeLoadersData)
      ? activeLoadersData
      : [];

    const foundLoader = activeLoaders.find(
      (loader) =>
        loader.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loader.aadhaarNumber.includes(searchTerm) ||
        loader.phoneNumber.includes(searchTerm),
    );

    if (foundLoader) {
      setIsLoaderFound(true);
      setLoaderName(foundLoader.name);
      setLoaderAadhaar(foundLoader.aadhaarNumber);
      setLoaderPhone(foundLoader.phoneNumber);
      setLoaderVendorName(foundLoader.vendorName);
      setLoaderCheckInTime(foundLoader.checkInTime);
      setLoaderCheckinId(foundLoader.checkinId); // Add this line

      loaderForm.setValue("name", foundLoader.name);
      loaderForm.setValue("aadhaarNumber", foundLoader.aadhaarNumber);
      loaderForm.setValue("phoneNumber", foundLoader.phoneNumber);
      loaderForm.setValue("vendorId", foundLoader.vendorId?.toString() || "");
    } else {
      setIsLoaderFound(false);
      setLoaderName("");
      setLoaderAadhaar("");
      setLoaderPhone("");
      setLoaderVendorName("");
      setLoaderCheckInTime("");
      setLoaderCheckinId(null); // Add this line
    }
  };

  // Enhanced submit handlers for both modes
  const handleSupervisorSubmit = async () => {
    try {
      if (supervisorMode === "checkin") {
        const isValid = await supervisorForm.trigger();
        if (!isValid) return;

        const supervisorData = {
          name: supervisorName,
          aadhaarNumber: supervisorAadhaar,
          phoneNumber: supervisorPhone,
          vendorId: supervisorVendorId,
          supervisorId: supervisorVendorId,
          storeId: 1, // You may need to get this from your app context
          photo: photos.supervisor,
        };

        await supervisorCheckinMutation.mutateAsync(supervisorData);
        handleSupervisorModeChange("checkin");
        // toast.success("Supervisor checked in successfully!");
        toast({
          title: "Success",
          description: "Supervisor checked in successfully!",
          variant: "default", // or "destructive" if it's an error
        });
      } else if (supervisorMode === "checkout") {
        if (!isSupervisorFound || !supervisorCheckinId) {
          toast({
            title: "Error",
            description: "Please search and select a supervisor first",
            variant: "destructive",
          });
          return;
        }

        const checkoutData = {
          checkinId: supervisorCheckinId, // This is what your API expects
        };

        await supervisorCheckoutMutation.mutateAsync(checkoutData);
        handleSupervisorModeChange("checkout");
        // toast.success("Supervisor checked out successfully!");
        toast({
          title: "Success",
          description: "Supervisor checked out successfully!",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error submitting supervisor:", error);

      toast({
        title: "Error",
        description:
          error.message || "An error occurred during supervisor submission",
        variant: "destructive",
      });
    }
  };

  const handleLoaderSubmit = async () => {
    try {
      if (loaderMode === "checkin") {
        const isValid = await loaderForm.trigger();
        if (!isValid) return;

        const loaderData = {
          name: loaderName,
          aadhaarNumber: loaderAadhaar,
          phoneNumber: loaderPhone,
          vendorId: loaderVendorId,
          loaderId: loaderVendorId,
          storeId: 1, // You may need to get this from your app context
          photo: photos.loader,
        };

        await loaderCheckinMutation.mutateAsync(loaderData);
        handleLoaderModeChange("checkin");
        // toast.success("Loader checked in successfully!");
        toast({
          title: "Success",
          description: "Loader checked in successfully!",
          variant: "default",
        });
      } else if (loaderMode === "checkout") {
        if (!isLoaderFound || !loaderCheckinId) {
          toast({
            title: "Error",
            description: "Please search and select a loader first",
            variant: "destructive",
          });
          return;
        }

        const checkoutData = {
          checkinId: loaderCheckinId, // This is what your API expects
        };

        await loaderCheckoutMutation.mutateAsync(checkoutData);
        handleLoaderModeChange("checkout");
        // toast.success("Loader checked out successfully!");
        toast({
          title: "Success",
          description: "Loader checked out successfully!",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error submitting loader:", error);
      toast({
        title: "Error",
        description:
          error.message || "An error occurred during loader submission",
        variant: "destructive",
      });
    }
  };

  const fetchActiveSupervisors = async () => {
    try {
      const response = await fetch("/api/supervisor/checkins");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON");
      }

      const data = await response.json();

      const transformedData = Array.isArray(data)
        ? data.map((checkin) => ({
            name: checkin.name,
            aadhaarNumber: checkin.aadhaarNumber,
            phoneNumber: checkin.phoneNumber,
            vendorId: checkin.vendorId,
            vendorName: checkin.vendorName,
            checkInTime: checkin.checkinTime,
            checkinId: checkin.id,
            storeId: checkin.storeId,
            supervisorId: checkin.supervisorId,
          }))
        : [];

      return transformedData;
    } catch (error) {
      console.error("Error fetching active supervisors:", error);
      return [];
    }
  };

  const fetchActiveLoaders = async () => {
    try {
      const response = await fetch("/api/labour/checkins");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON");
      }

      const data = await response.json();

      const transformedData = Array.isArray(data)
        ? data.map((checkin) => ({
            name: checkin.name,
            aadhaarNumber: checkin.aadhaarNumber,
            phoneNumber: checkin.phoneNumber,
            vendorId: checkin.vendorId,
            vendorName: checkin.vendorName,
            checkInTime: checkin.checkinTime,
            checkinId: checkin.id,
            storeId: checkin.storeId,
            loaderId: checkin.loaderId,
          }))
        : [];

      return transformedData;
    } catch (error) {
      console.error("Error fetching active loaders:", error);
      return [];
    }
  };
  const {
    data: activeSupervisorsData,
    isLoading: supervisorsLoading,
    error: supervisorsError,
  } = useQuery({
    queryKey: ["activeSupervisors"],
    queryFn: fetchActiveSupervisors,
    enabled: supervisorMode === "checkout",
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const {
    data: activeLoadersData,
    isLoading: loadersLoading,
    error: loadersError,
  } = useQuery({
    queryKey: ["activeLoaders"],
    queryFn: fetchActiveLoaders,
    enabled: loaderMode === "checkout",
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

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
                    onClick={() => handleModeChange("checkin")}
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
                    onClick={() => handleModeChange("checkout")}
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
                      <div className="relative">
                        <Input
                          placeholder="Type vehicle number (e.g., KA23RT4567)"
                          value={vehicleForm.watch("vehicleNumber")}
                          onChange={(e) => {
                            handleVehicleNumberChange(e.target.value);
                          }}
                          className={`uppercase ${
                            vehicleForm.formState.errors.vehicleNumber
                              ? "border-red-500"
                              : ""
                          } ${
                            vehicleNumber && !isVehicleFound
                              ? "border-red-500"
                              : ""
                          }`}
                        />

                        {/* Suggestions dropdown */}
                        {showSuggestions && vehicleSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {vehicleSuggestions.map((vehicle) => (
                              <div
                                key={vehicle.id}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                                onClick={() => selectVehicleSuggestion(vehicle)}
                              >
                                <div className="font-medium">
                                  {vehicle.vehicleNumber}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Driver: {vehicle.driverName} | KM:{" "}
                                  {vehicle.openingKm}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="text-xs text-gray-500 mt-1">
                          Type vehicle number to search active vehicles
                        </p>

                        {vehicleNumber &&
                          !isVehicleFound &&
                          !showSuggestions && (
                            <p className="text-sm text-red-500 mt-1">
                              Vehicle not found in active vehicles
                            </p>
                          )}

                        {isVehicleFound && (
                          <p className="text-sm text-green-600 mt-1">
                            ✓ Vehicle found and details populated
                          </p>
                        )}
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
                  <>
                    {/* Driver Details - Auto-populated and disabled */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Driver Aadhaar</Label>
                        <Input
                          value={driverAadhaar}
                          disabled
                          className="bg-gray-50"
                          placeholder={
                            isVehicleFound ? "" : "Enter vehicle number first"
                          }
                        />
                      </div>
                    </div>

                    {/* KM Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Opening KM</Label>
                        <Input
                          type="number"
                          value={openingKm || ""}
                          disabled
                          className="bg-gray-50"
                          placeholder={
                            isVehicleFound ? "" : "Enter vehicle number first"
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Closing KM *</Label>
                        <Input
                          type="number"
                          placeholder="Enter closing kilometers"
                          value={closingKm || ""}
                          onChange={(e) =>
                            handleClosingKmChange(e.target.value)
                          }
                          disabled={!isVehicleFound} // Disable if vehicle not found
                          className={
                            closingKm && openingKm && closingKm < openingKm
                              ? "border-red-500"
                              : ""
                          }
                        />
                        {!isVehicleFound && (
                          <p className="text-sm text-gray-500">
                            Find vehicle first to enter closing KM
                          </p>
                        )}
                        {closingKm && openingKm && closingKm < openingKm && (
                          <p className="text-sm text-red-500">
                            Closing KM cannot be less than opening KM (
                            {openingKm})
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <Button
                  //onClick={handleVehicleSubmit}
                  onClick={() => {
                    console.log("Button clicked!"); // Add this line
                    handleVehicleSubmit();
                  }}
                  disabled={
                    vehicleEntryMutation.isPending ||
                    vehicleExitMutation.isPending ||
                    (vehicleMode === "checkout" &&
                      (!isVehicleFound ||
                        !closingKm ||
                        closingKm < (openingKm || 0)))
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Supervisor Management</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={
                      supervisorMode === "checkin" ? "default" : "outline"
                    }
                    onClick={() => handleSupervisorModeChange("checkin")}
                    className={
                      supervisorMode === "checkin"
                        ? "bg-green-600 hover:bg-green-700"
                        : ""
                    }
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Check In
                  </Button>
                  <Button
                    variant={
                      supervisorMode === "checkout" ? "default" : "outline"
                    }
                    onClick={() => handleSupervisorModeChange("checkout")}
                    className={
                      supervisorMode === "checkout"
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
                {supervisorMode === "checkin" && (
                  <div className="space-y-2">
                    <Label>
                      {getFieldLabel(
                        "Vendor",
                        "vendorId",
                        supervisorFormSchema,
                      )}
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
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {getFieldLabel(
                        "Supervisor Name",
                        "name",
                        supervisorFormSchema,
                      )}
                    </Label>
                    {supervisorMode === "checkout" ? (
                      <div className="space-y-2">
                        <Label>Search Supervisor</Label>
                        <div className="relative">
                          <Input
                            value={supervisorSearchTerm}
                            onChange={(e) =>
                              handleSupervisorSearch(e.target.value)
                            }
                            placeholder="Search by name, Aadhaar, or phone"
                            className="pr-10"
                            disabled={supervisorsLoading}
                          />
                          {supervisorsLoading && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                            </div>
                          )}
                        </div>
                        {supervisorsError && (
                          <p className="text-sm text-red-500">
                            Error loading supervisors:{" "}
                            {supervisorsError.message}
                          </p>
                        )}
                        {supervisorSearchTerm &&
                          !supervisorsLoading &&
                          !isSupervisorFound && (
                            <p className="text-sm text-yellow-600">
                              No supervisor found matching "
                              {supervisorSearchTerm}"
                            </p>
                          )}
                        {isSupervisorFound && (
                          <p className="text-sm text-green-600">
                            ✓ Supervisor found: {supervisorName}
                          </p>
                        )}
                      </div>
                    ) : (
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
                    )}
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
                      disabled={supervisorMode === "checkout"}
                      className={`${
                        supervisorForm.formState.errors.aadhaarNumber
                          ? "border-red-500"
                          : ""
                      } ${supervisorMode === "checkout" ? "bg-gray-50" : ""}`}
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
                      disabled={supervisorMode === "checkout"}
                      className={`${
                        supervisorForm.formState.errors.phoneNumber
                          ? "border-red-500"
                          : ""
                      } ${supervisorMode === "checkout" ? "bg-gray-50" : ""}`}
                    />
                    {supervisorForm.formState.errors.phoneNumber && (
                      <p className="text-sm text-red-500">
                        {supervisorForm.formState.errors.phoneNumber.message}
                      </p>
                    )}
                  </div>
                  {supervisorMode === "checkout" && (
                    <div className="space-y-2">
                      <Label>Vendor</Label>
                      <Input
                        value={supervisorVendorName || ""}
                        disabled
                        className="bg-gray-50"
                        placeholder={
                          isSupervisorFound ? "" : "Search supervisor first"
                        }
                      />
                    </div>
                  )}
                </div>

                {/* Check In Time Display for Checkout */}
                {supervisorMode === "checkout" && isSupervisorFound && (
                  <div className="space-y-2">
                    <Label>Check In Time</Label>
                    <Input
                      value={supervisorCheckInTime || ""}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                )}

                {/* Supervisor Photo Section - Only for Check In */}
                {supervisorMode === "checkin" && (
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
                )}

                <Button
                  onClick={handleSupervisorSubmit}
                  disabled={
                    supervisorCheckinMutation.isPending ||
                    supervisorCheckoutMutation.isPending ||
                    (supervisorMode === "checkout" &&
                      (!isSupervisorFound || supervisorsLoading))
                  }
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {supervisorCheckinMutation.isPending ||
                  supervisorCheckoutMutation.isPending
                    ? "Processing..."
                    : supervisorMode === "checkin"
                      ? "Check In Supervisor"
                      : "Check Out Supervisor"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loader Management Section */}

        {activeSection === "loader" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Loader Management</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={loaderMode === "checkin" ? "default" : "outline"}
                    onClick={() => handleLoaderModeChange("checkin")}
                    className={
                      loaderMode === "checkin"
                        ? "bg-green-600 hover:bg-green-700"
                        : ""
                    }
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Check In
                  </Button>
                  <Button
                    variant={loaderMode === "checkout" ? "default" : "outline"}
                    onClick={() => handleLoaderModeChange("checkout")}
                    className={
                      loaderMode === "checkout"
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
                {loaderMode === "checkin" && (
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
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {getFieldLabel("Loader Name", "name", loaderFormSchema)}
                    </Label>
                    {loaderMode === "checkout" ? (
                      <div className="space-y-2">
                        <Label>Search Loader</Label>
                        <div className="relative">
                          <Input
                            value={loaderSearchTerm}
                            onChange={(e) => handleLoaderSearch(e.target.value)}
                            placeholder="Search by name, Aadhaar, or phone"
                            className="pr-10"
                            disabled={loadersLoading}
                          />
                          {loadersLoading && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                            </div>
                          )}
                        </div>
                        {loadersError && (
                          <p className="text-sm text-red-500">
                            Error loading loaders: {loadersError.message}
                          </p>
                        )}
                        {loaderSearchTerm &&
                          !loadersLoading &&
                          !isLoaderFound && (
                            <p className="text-sm text-yellow-600">
                              No loader found matching "{loaderSearchTerm}"
                            </p>
                          )}
                        {isLoaderFound && (
                          <p className="text-sm text-green-600">
                            ✓ Loader found: {loaderName}
                          </p>
                        )}
                      </div>
                    ) : (
                      <Input
                        placeholder="Loader's full name"
                        value={loaderForm.watch("name")}
                        onChange={(e) => {
                          loaderForm.setValue("name", e.target.value);
                          setLoaderName(e.target.value);
                        }}
                        className={
                          loaderForm.formState.errors.name
                            ? "border-red-500"
                            : ""
                        }
                      />
                    )}
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
                      disabled={loaderMode === "checkout"}
                      className={`${
                        loaderForm.formState.errors.aadhaarNumber
                          ? "border-red-500"
                          : ""
                      } ${loaderMode === "checkout" ? "bg-gray-50" : ""}`}
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
                      disabled={loaderMode === "checkout"}
                      className={`${
                        loaderForm.formState.errors.phoneNumber
                          ? "border-red-500"
                          : ""
                      } ${loaderMode === "checkout" ? "bg-gray-50" : ""}`}
                    />
                    {loaderForm.formState.errors.phoneNumber && (
                      <p className="text-sm text-red-500">
                        {loaderForm.formState.errors.phoneNumber.message}
                      </p>
                    )}
                  </div>
                  {loaderMode === "checkout" && (
                    <div className="space-y-2">
                      <Label>Vendor</Label>
                      <Input
                        value={loaderVendorName || ""}
                        disabled
                        className="bg-gray-50"
                        placeholder={isLoaderFound ? "" : "Search loader first"}
                      />
                    </div>
                  )}
                </div>

                {/* Check In Time Display for Checkout */}
                {loaderMode === "checkout" && isLoaderFound && (
                  <div className="space-y-2">
                    <Label>Check In Time</Label>
                    <Input
                      value={loaderCheckInTime || ""}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                )}

                {/* Loader Photo Section - Only for Check In */}
                {loaderMode === "checkin" && (
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
                )}
                {/* Loader Button */}
                <Button
                  onClick={handleLoaderSubmit}
                  disabled={
                    loaderCheckinMutation.isPending ||
                    loaderCheckoutMutation.isPending ||
                    (loaderMode === "checkout" &&
                      (!isLoaderFound || loadersLoading))
                  }
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loaderCheckinMutation.isPending ||
                  loaderCheckoutMutation.isPending
                    ? "Processing..."
                    : loaderMode === "checkin"
                      ? "Check In Loader"
                      : "Check Out Loader"}
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













// import { useState, useEffect } from "react";
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
// import {
//   Camera,
//   Save,
//   LogIn,
//   LogOut,
//   Plus,
//   UserPlus,
//   Users,
// } from "lucide-react";
// import { apiRequest } from "@/lib/queryClient";
// import { useToast } from "@/hooks/use-toast";
// import CameraModal from "./camera-modal";
// import { z } from "zod";
// // import { LoaderManagement } from "./loaderManagement.tsx";

// const vehicleFormSchema = z.object({
//   vendorId: z.string().min(1, "Vendor is required"),
//   vehicleNumber: z.string().min(1, "Vehicle number is required"),
//   driverName: z.string().min(1, "Driver name is required"),
//   aadhaarNumber: z.string().min(12, "Aadhaar number must be 12 digits"),
//   openingKm: z.string().min(1, "KM is required"),
// });

// const supervisorFormSchema = z.object({
//   vendorId: z.string().min(1, "Vendor is required"),
//   name: z.string().min(1, "Supervisor name is required"),
//   aadhaarNumber: z.string().min(12, "Aadhaar number must be 12 digits"),
//   phoneNumber: z.string().optional(),
// });

// const loaderFormSchema = z.object({
//   vendorId: z.string().min(1, "Vendor is required"),
//   name: z.string().min(1, "Loader name is required"),
//   aadhaarNumber: z.string().min(12, "Aadhaar number must be 12 digits"),
//   phoneNumber: z.string().optional(),
// });

// interface VehicleFormProps {
//   storeId: number;
//   operatorId: number;
// }

// export default function VehicleForm({ storeId, operatorId }: VehicleFormProps) {
//   const { toast } = useToast();
//   const queryClient = useQueryClient();

//   // Vehicle form state
//   const [vehicleMode, setVehicleMode] = useState<"checkin" | "checkout">(
//     "checkin",
//   );
//   const [vehicleNumber, setVehicleNumber] = useState("");
//   const [driverName, setDriverName] = useState("");
//   const [driverAadhaar, setDriverAadhaar] = useState("");
//   const [vendorId, setVendorId] = useState<number | undefined>();
//   const [openingKm, setOpeningKm] = useState<number | undefined>();

//   const [closingKm, setClosingKm] = useState<number | undefined>();
//   const [selectedCheckinId, setSelectedCheckinId] = useState<
//     number | undefined
//   >();
//   const [isVehicleFound, setIsVehicleFound] = useState(false);
//   // In your component, make sure you have this state declared:
//   const [activeVehicles, setActiveVehicles] = useState<any[]>([]);

//   // Enhanced version with live search suggestions:

//   const [vehicleSuggestions, setVehicleSuggestions] = useState<any[]>([]);
//   const [showSuggestions, setShowSuggestions] = useState(false);

//   // Supervisor form state
//   const [supervisorVendorId, setSupervisorVendorId] = useState<
//     number | undefined
//   >();
//   const [supervisorName, setSupervisorName] = useState("");
//   const [supervisorAadhaar, setSupervisorAadhaar] = useState("");
//   const [supervisorPhone, setSupervisorPhone] = useState("");

//   // Loader form state
//   const [loaderVendorId, setLoaderVendorId] = useState<number | undefined>();
//   const [loaderName, setLoaderName] = useState("");
//   const [loaderAadhaar, setLoaderAadhaar] = useState("");
//   const [loaderPhone, setLoaderPhone] = useState("");

//   // Supervisor states
//   const [supervisorMode, setSupervisorMode] = useState("checkin");
//   const [supervisorSearchTerm, setSupervisorSearchTerm] = useState("");
//   const [isSupervisorFound, setIsSupervisorFound] = useState(false);
//   const [supervisorVendorName, setSupervisorVendorName] = useState("");
//   const [supervisorCheckInTime, setSupervisorCheckInTime] = useState("");

//   // Loader states
//   const [loaderMode, setLoaderMode] = useState("checkin");
//   const [loaderSearchTerm, setLoaderSearchTerm] = useState("");
//   const [isLoaderFound, setIsLoaderFound] = useState(false);
//   const [loaderVendorName, setLoaderVendorName] = useState("");
//   const [loaderCheckInTime, setLoaderCheckInTime] = useState("");

//   // Updated camera state (working version)
//   const [cameraModal, setCameraModal] = useState<{
//     isOpen: boolean;
//     type: "driver" | "loader" | "supervisor";
//   }>({ isOpen: false, type: "driver" });

//   // Updated photos state (working version)
//   const [photos, setPhotos] = useState<{
//     driver?: string;
//     loader?: string;
//     supervisor?: string;
//   }>({});

//   // Active section state
//   const [activeSection, setActiveSection] = useState<
//     "vehicle" | "supervisor" | "loader"
//   >("vehicle");

//   const fetchActiveVehicles = async () => {
//     try {
//       const response = await fetch("/api/vehicles/active");
//       const data = await response.json();

//       // Debug: Log the fetched data
//       console.log("Fetched active vehicles:", data);

//       // Set the active vehicles state
//       setActiveVehicles(data);
//     } catch (error) {
//       console.error("Error fetching active vehicles:", error);
//       toast({
//         title: "Error",
//         description: "Failed to load active vehicles",
//         variant: "destructive",
//       });
//     }
//   };

//   const vehicleForm = useForm({
//     resolver: zodResolver(vehicleFormSchema),
//     defaultValues: {
//       vendorId: "", // this will be a string from the dropdown
//       vehicleNumber: "",
//       driverName: "",
//       aadhaarNumber: "",
//       openingKm: "",
//       // operatorId: 1,
//     },
//   });

//   const supervisorForm = useForm({
//     resolver: zodResolver(supervisorFormSchema),
//     defaultValues: {
//       vendorId: "",
//       name: "",
//       aadhaarNumber: "",
//       phoneNumber: "",
//     },
//   });

//   const loaderForm = useForm({
//     resolver: zodResolver(loaderFormSchema),
//     defaultValues: {
//       vendorId: "",
//       name: "",
//       aadhaarNumber: "",
//       phoneNumber: "",
//     },
//   });

//   const getFieldLabel = (baseLabel: string, fieldName: string, schema: any) => {
//     try {
//       const field = schema.shape[fieldName];
//       const isRequired = !field.isOptional();
//       return baseLabel + (isRequired ? " *" : "");
//     } catch {
//       return baseLabel;
//     }
//   };

//   const { data: vendors } = useQuery({
//     queryKey: ["/api/vendors"],
//   });

//   const { data: fetchedactiveVehicles } = useQuery({
//     queryKey: ["/api/dashboard/active-vehicles", storeId],
//   });
//   // Vehicle mutations
//   const vehicleEntryMutation = useMutation({
//     mutationFn: async (data: any) => {
//       console.log("Vehicle entry mutation data:", data);
//       // Convert string fields to number where needed before sending to API
//       console.log("Resolved operatorId:", operatorId);
//       const payload = {
//         ...data,
//         vendorId: Number(data.vendorId),
//         openingKm: data.openingKm ? Number(data.openingKm) : undefined,
//         storeId: Number(storeId), // from hook/context
//         //operatorId: user?.id,
//         operatorId: Number(operatorId) || 1, // from auth context or similar
//         driverPhotoUrl: photos.driver,
//         driverAadhaarNumber: driverAadhaar || undefined,
//       };
//       console.log("Sending payload:", payload);
//       // Send the cleaned payload to your API
//       return await apiRequest("POST", "/api/vehicles/entry", payload);
//     },
//     onSuccess: () => {
//       toast({
//         title: "Success",
//         description: "Vehicle checked in successfully",
//       });
//       resetVehicleForm();
//       // Refresh active vehicles list
//       fetchActiveVehicles();
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

//   // Form submission handlers
//   const onVehicleSubmit = (data: any) => {
//     console.log("Vehicle form submitted:", data);
//     vehicleEntryMutation.mutate(data);
//   };

//   const onSupervisorSubmit = (data: any) => {
//     console.log("Supervisor form submitted:", data);
//     // Add supervisor mutation logic here
//   };

//   const onLoaderSubmit = (data: any) => {
//     console.log("Loader form submitted:", data);
//     // Add loader mutation logic here
//   };

//   const vehicleExitMutation = useMutation({
//     mutationFn: async (data: { checkinId: number; closingKm?: number }) => {
//       return await apiRequest("POST", "/api/vehicles/exit", data);
//     },
//     onSuccess: () => {
//       toast({
//         title: "Success",
//         description: "Vehicle checked out successfully",
//       });
//       resetVehicleForm();
//       // Refresh active vehicles list
//       fetchActiveVehicles();
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

//   // Supervisor mutation
//   const supervisorMutation = useMutation({
//     mutationFn: async (data: any) => {
//       return await apiRequest("POST", "/api/supervisors", {
//         ...data,
//         storeId,
//         operatorId,
//         photoUrl: photos.supervisor,
//       });
//     },
//     onSuccess: () => {
//       toast({
//         title: "Success",
//         description: "Supervisor added successfully",
//       });
//       resetSupervisorForm();
//       queryClient.invalidateQueries({ queryKey: ["/api/supervisors"] });
//     },
//     onError: (error: any) => {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to add supervisor",
//         variant: "destructive",
//       });
//     },
//   });

//   // Loader mutation
//   const loaderMutation = useMutation({
//     mutationFn: async (data: any) => {
//       return await apiRequest("POST", "/api/loaders", {
//         ...data,
//         storeId,
//         operatorId,
//         photoUrl: photos.loader,
//       });
//     },
//     onSuccess: () => {
//       toast({
//         title: "Success",
//         description: "Loader added successfully",
//       });
//       resetLoaderForm();
//       queryClient.invalidateQueries({ queryKey: ["/api/loaders"] });
//     },
//     onError: (error: any) => {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to add loader",
//         variant: "destructive",
//       });
//     },
//   });

//   // Supervisor Check-in mutation
//   const supervisorCheckinMutation = useMutation({
//     mutationFn: async (data: any) => {
//       return await apiRequest("POST", "/api/supervisors/checkin", {
//         ...data,
//         storeId,
//         operatorId,
//         photoUrl: photos.supervisor,
//         checkInTime: new Date().toISOString(),
//       });
//     },
//     onSuccess: () => {
//       toast({
//         title: "Success",
//         description: "Supervisor checked in successfully",
//       });
//       resetSupervisorForm();
//       queryClient.invalidateQueries({ queryKey: ["/api/supervisors"] });
//       queryClient.invalidateQueries({ queryKey: ["/api/supervisors/active"] });
//     },
//     onError: (error: any) => {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to check in supervisor",
//         variant: "destructive",
//       });
//     },
//   });

//   // Supervisor Check-out mutation
//   const supervisorCheckoutMutation = useMutation({
//     mutationFn: async (data: any) => {
//       return await apiRequest("POST", "/api/supervisors/checkout", {
//         ...data,
//         storeId,
//         operatorId,
//         checkOutTime: new Date().toISOString(),
//       });
//     },
//     onSuccess: () => {
//       toast({
//         title: "Success",
//         description: "Supervisor checked out successfully",
//       });
//       resetSupervisorForm();
//       setSupervisorMode("checkin");
//       setIsSupervisorFound(false);
//       setSupervisorSearchTerm("");
//       queryClient.invalidateQueries({ queryKey: ["/api/supervisors"] });
//       queryClient.invalidateQueries({ queryKey: ["/api/supervisors/active"] });
//     },
//     onError: (error: any) => {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to check out supervisor",
//         variant: "destructive",
//       });
//     },
//   });

//   // Loader Check-in mutation
//   const loaderCheckinMutation = useMutation({
//     mutationFn: async (data: any) => {
//       return await apiRequest("POST", "/api/loaders/checkin", {
//         ...data,
//         storeId,
//         operatorId,
//         photoUrl: photos.loader,
//         checkInTime: new Date().toISOString(),
//       });
//     },
//     onSuccess: () => {
//       toast({
//         title: "Success",
//         description: "Loader checked in successfully",
//       });
//       resetLoaderForm();
//       queryClient.invalidateQueries({ queryKey: ["/api/loaders"] });
//       queryClient.invalidateQueries({ queryKey: ["/api/loaders/active"] });
//     },
//     onError: (error: any) => {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to check in loader",
//         variant: "destructive",
//       });
//     },
//   });

//   // Loader Check-out mutation
//   const loaderCheckoutMutation = useMutation({
//     mutationFn: async (data: any) => {
//       return await apiRequest("POST", "/api/loaders/checkout", {
//         ...data,
//         storeId,
//         operatorId,
//         checkOutTime: new Date().toISOString(),
//       });
//     },
//     onSuccess: () => {
//       toast({
//         title: "Success",
//         description: "Loader checked out successfully",
//       });
//       resetLoaderForm();
//       setLoaderMode("checkin");
//       setIsLoaderFound(false);
//       setLoaderSearchTerm("");
//       queryClient.invalidateQueries({ queryKey: ["/api/loaders"] });
//       queryClient.invalidateQueries({ queryKey: ["/api/loaders/active"] });
//     },
//     onError: (error: any) => {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to check out loader",
//         variant: "destructive",
//       });
//     },
//   });
//   // Reset functions
//   const resetVehicleForm = () => {
//     vehicleForm.reset();
//     setVehicleNumber("");
//     setDriverName("");
//     setDriverAadhaar("");
//     setVendorId(undefined);
//     setOpeningKm(undefined);
//     setClosingKm(undefined);
//     setSelectedCheckinId(undefined);
//     setIsVehicleFound(false);
//     // Clear photos when resetting
//     setPhotos((prev) => ({ ...prev, driver: undefined }));
//   };

//   const resetSupervisorForm = () => {
//     supervisorForm.reset();
//     setSupervisorVendorId(undefined);
//     setSupervisorName("");
//     setSupervisorAadhaar("");
//     setSupervisorPhone("");
//     // Clear photos when resetting
//     setPhotos((prev) => ({ ...prev, supervisor: undefined }));
//   };

//   const resetLoaderForm = () => {
//     loaderForm.reset();
//     setLoaderVendorId(undefined);
//     setLoaderName("");
//     setLoaderAadhaar("");
//     setLoaderPhone("");
//     // Clear photos when resetting
//     setPhotos((prev) => ({ ...prev, loader: undefined }));
//   };

//   // Handle vehicle number input for checkout
//   const handleVehicleNumberChange = (value: string) => {
//     const upperValue = value.toUpperCase();
//     setVehicleNumber(upperValue);
//     vehicleForm.setValue("vehicleNumber", upperValue);

//     if (vehicleMode === "checkout" && upperValue.length > 0) {
//       console.log("Active vehicles:", activeVehicles);
//       console.log("Searching for vehicle:", upperValue);

//       // First, try exact match
//       const exactMatch = activeVehicles?.find((v: any) => {
//         const vehicleNum = v.vehicleNumber?.toUpperCase();
//         const isActive = v.status === "In";
//         return vehicleNum === upperValue && isActive;
//       });

//       if (exactMatch) {
//         // Exact match found - populate details
//         console.log("Exact match found:", exactMatch);

//         vehicleForm.setValue("driverName", exactMatch.driverName || "");
//         vehicleForm.setValue("aadhaarNumber", exactMatch.aadhaarNumber || "");
//         vehicleForm.setValue(
//           "openingKm",
//           exactMatch.openingKm?.toString() || "",
//         );

//         setDriverName(exactMatch.driverName || "");
//         setDriverAadhaar(exactMatch.aadhaarNumber || "");
//         setOpeningKm(parseFloat(exactMatch.openingKm) || undefined);
//         setSelectedCheckinId(exactMatch.id);
//         setIsVehicleFound(true);
//         setShowSuggestions(false);

//         vehicleForm.clearErrors("vehicleNumber");

//         toast({
//           title: "Success",
//           description: `Vehicle ${exactMatch.vehicleNumber} found - Driver: ${exactMatch.driverName}`,
//           variant: "default",
//         });
//       } else {
//         // No exact match - show suggestions if input is substantial
//         if (upperValue.length >= 2) {
//           const suggestions =
//             activeVehicles?.filter((v: any) => {
//               const vehicleNum = v.vehicleNumber?.toUpperCase();
//               const isActive = v.status === "In";
//               return vehicleNum?.includes(upperValue) && isActive;
//             }) || [];

//           console.log("Suggestions found:", suggestions);
//           setVehicleSuggestions(suggestions);
//           setShowSuggestions(suggestions.length > 0);
//         } else {
//           setShowSuggestions(false);
//         }

//         // Clear form data
//         vehicleForm.setValue("driverName", "");
//         vehicleForm.setValue("aadhaarNumber", "");
//         vehicleForm.setValue("openingKm", "");

//         setDriverName("");
//         setDriverAadhaar("");
//         setOpeningKm(undefined);
//         setSelectedCheckinId(undefined);
//         setIsVehicleFound(false);
//         setClosingKm(undefined);
//       }
//     } else {
//       setShowSuggestions(false);
//     }
//   };

//   // Function to select a suggestion
//   const selectVehicleSuggestion = (vehicle: any) => {
//     setVehicleNumber(vehicle.vehicleNumber);
//     vehicleForm.setValue("vehicleNumber", vehicle.vehicleNumber);
//     setShowSuggestions(false);

//     // Trigger the search with the selected vehicle
//     handleVehicleNumberChange(vehicle.vehicleNumber);
//   };

//   // Handle closing KM input
//   const handleClosingKmChange = (value: string) => {
//     const numValue = parseInt(value) || undefined;
//     setClosingKm(numValue);

//     // Validate against opening KM
//     if (numValue && openingKm && numValue < openingKm) {
//       // Show error but still allow input
//       return;
//     }
//   };

//   useEffect(() => {
//     fetchActiveVehicles();
//   }, []);

//   // Fixed: Reset function for mode change
//   const handleModeChange = (mode: "checkin" | "checkout") => {
//     setVehicleMode(mode);
//     resetVehicleForm();
//     // Refresh active vehicles when switching to checkout
//     if (mode === "checkout") {
//       fetchActiveVehicles();
//     }
//   };

//   const handleVehicleSubmit = () => {
//     if (vehicleMode === "checkin") {
//       // Use form validation for checkin
//       vehicleForm.handleSubmit((data) => {
//         vehicleEntryMutation.mutate({
//           ...data,
//           vendorId: parseInt(data.vendorId),
//           openingKm: data.openingKm ? parseInt(data.openingKm) : undefined,
//         });
//       })();
//     } else {
//       // Direct handling for checkout (no form validation needed)
//       if (!isVehicleFound) {
//         toast({
//           title: "Error",
//           description: "Vehicle not found in active vehicles",
//           variant: "destructive",
//         });
//         return;
//       }
//       if (!selectedCheckinId || !closingKm) {
//         toast({
//           title: "Error",
//           description: "Please enter closing KM",
//           variant: "destructive",
//         });
//         return;
//       }
//       if (closingKm < (openingKm || 0)) {
//         toast({
//           title: "Error",
//           description: "Closing KM cannot be less than opening KM",
//           variant: "destructive",
//         });
//         return;
//       }
//       vehicleExitMutation.mutate({
//         checkinId: selectedCheckinId,
//         closingKm: closingKm,
//       });
//     }
//   };

//   // const handleSupervisorSubmit = supervisorForm.handleSubmit((data) => {
//   //   supervisorMutation.mutate({
//   //     ...data,
//   //     vendorId: parseInt(data.vendorId),
//   //   });
//   // });

//   // const handleLoaderSubmit = loaderForm.handleSubmit((data) => {
//   //   loaderMutation.mutate({
//   //     ...data,
//   //     vendorId: parseInt(data.vendorId),
//   //   });
//   // });

//   // Updated camera handlers (working version)
//   const handleCameraCapture = (photoDataUrl: string) => {
//     console.log("Captured Photo Data URL:", photoDataUrl);
//     console.log("Camera type:", cameraModal.type);
//     setPhotos((prev) => ({ ...prev, [cameraModal.type]: photoDataUrl }));
//     setCameraModal({ isOpen: false, type: "driver" });
//   };

//   const openCamera = (type: "driver" | "loader" | "supervisor") => {
//     setCameraModal({ isOpen: true, type });
//   };

//   // Supervisor handlers
//   const handleSupervisorModeChange = (mode) => {
//     setSupervisorMode(mode);

//     // Reset form
//     supervisorForm.reset();

//     // Reset states
//     setSupervisorName("");
//     setSupervisorAadhaar("");
//     setSupervisorPhone("");
//     setSupervisorVendorId(null);
//     setSupervisorSearchTerm("");
//     setIsSupervisorFound(false);
//     setSupervisorVendorName("");
//     setSupervisorCheckInTime("");

//     // Clear photo if switching modes
//     if (photos.supervisor) {
//       setPhotos((prev) => ({ ...prev, supervisor: null }));
//     }
//   };

//   const handleSupervisorSearch = (searchTerm) => {
//     setSupervisorSearchTerm(searchTerm);
//     supervisorForm.setValue("name", searchTerm);

//     if (!searchTerm.trim()) {
//       setIsSupervisorFound(false);
//       setSupervisorName("");
//       setSupervisorAadhaar("");
//       setSupervisorPhone("");
//       setSupervisorVendorName("");
//       setSupervisorCheckInTime("");
//       return;
//     }

//     // Search in active supervisors (you'll need to fetch this data)
//     // This could be from an API call or local state
//     const activeSupervisors = activeSupervisorsData || []; // Replace with your actual data source

//     const foundSupervisor = activeSupervisors.find(
//       (supervisor) =>
//         supervisor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         supervisor.aadhaarNumber.includes(searchTerm) ||
//         supervisor.phoneNumber.includes(searchTerm),
//     );

//     if (foundSupervisor) {
//       setIsSupervisorFound(true);
//       setSupervisorName(foundSupervisor.name);
//       setSupervisorAadhaar(foundSupervisor.aadhaarNumber);
//       setSupervisorPhone(foundSupervisor.phoneNumber);
//       setSupervisorVendorName(foundSupervisor.vendorName);
//       setSupervisorCheckInTime(foundSupervisor.checkInTime);

//       // Set form values
//       supervisorForm.setValue("name", foundSupervisor.name);
//       supervisorForm.setValue("aadhaarNumber", foundSupervisor.aadhaarNumber);
//       supervisorForm.setValue("phoneNumber", foundSupervisor.phoneNumber);
//       supervisorForm.setValue(
//         "vendorId",
//         foundSupervisor.vendorId?.toString() || "",
//       );
//     } else {
//       setIsSupervisorFound(false);
//       setSupervisorName("");
//       setSupervisorAadhaar("");
//       setSupervisorPhone("");
//       setSupervisorVendorName("");
//       setSupervisorCheckInTime("");
//     }
//   };

//   // Loader handlers
//   const handleLoaderModeChange = (mode) => {
//     setLoaderMode(mode);

//     // Reset form
//     loaderForm.reset();

//     // Reset states
//     setLoaderName("");
//     setLoaderAadhaar("");
//     setLoaderPhone("");
//     setLoaderVendorId(null);
//     setLoaderSearchTerm("");
//     setIsLoaderFound(false);
//     setLoaderVendorName("");
//     setLoaderCheckInTime("");

//     // Clear photo if switching modes
//     if (photos.loader) {
//       setPhotos((prev) => ({ ...prev, loader: null }));
//     }
//   };

//   const handleLoaderSearch = (searchTerm) => {
//     setLoaderSearchTerm(searchTerm);
//     loaderForm.setValue("name", searchTerm);

//     if (!searchTerm.trim()) {
//       setIsLoaderFound(false);
//       setLoaderName("");
//       setLoaderAadhaar("");
//       setLoaderPhone("");
//       setLoaderVendorName("");
//       setLoaderCheckInTime("");
//       return;
//     }

//     // Search in active loaders (you'll need to fetch this data)
//     // This could be from an API call or local state
//     const activeLoaders = activeLoadersData || []; // Replace with your actual data source

//     const foundLoader = activeLoaders.find(
//       (loader) =>
//         loader.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         loader.aadhaarNumber.includes(searchTerm) ||
//         loader.phoneNumber.includes(searchTerm),
//     );

//     if (foundLoader) {
//       setIsLoaderFound(true);
//       setLoaderName(foundLoader.name);
//       setLoaderAadhaar(foundLoader.aadhaarNumber);
//       setLoaderPhone(foundLoader.phoneNumber);
//       setLoaderVendorName(foundLoader.vendorName);
//       setLoaderCheckInTime(foundLoader.checkInTime);

//       // Set form values
//       loaderForm.setValue("name", foundLoader.name);
//       loaderForm.setValue("aadhaarNumber", foundLoader.aadhaarNumber);
//       loaderForm.setValue("phoneNumber", foundLoader.phoneNumber);
//       loaderForm.setValue("vendorId", foundLoader.vendorId?.toString() || "");
//     } else {
//       setIsLoaderFound(false);
//       setLoaderName("");
//       setLoaderAadhaar("");
//       setLoaderPhone("");
//       setLoaderVendorName("");
//       setLoaderCheckInTime("");
//     }
//   };

//   // Enhanced submit handlers for both modes
//   const handleSupervisorSubmit = async () => {
//     try {
//       if (supervisorMode === "checkin") {
//         // Validate form
//         const isValid = await supervisorForm.trigger();
//         if (!isValid) return;

//         // Prepare check-in data
//         const supervisorData = {
//           name: supervisorName,
//           aadhaarNumber: supervisorAadhaar,
//           phoneNumber: supervisorPhone,
//           vendorId: supervisorVendorId,
//           photo: photos.supervisor,
//           checkInTime: new Date().toISOString(),
//         };

//         // Call check-in mutation
//         await supervisorCheckinMutation.mutateAsync(supervisorData);

//         // Reset form after successful check-in
//         handleSupervisorModeChange("checkin");
//       } else if (supervisorMode === "checkout") {
//         if (!isSupervisorFound) {
//           toast.error("Please search and select a supervisor first");
//           return;
//         }

//         // Prepare check-out data
//         const checkoutData = {
//           name: supervisorName,
//           aadhaarNumber: supervisorAadhaar,
//           checkOutTime: new Date().toISOString(),
//         };

//         // Call check-out mutation
//         await supervisorCheckoutMutation.mutateAsync(checkoutData);

//         // Reset form after successful check-out
//         handleSupervisorModeChange("checkout");
//       }
//     } catch (error) {
//       console.error("Error submitting supervisor:", error);
//       toast.error(error.message || "An error occurred");
//     }
//   };

//   const handleLoaderSubmit = async () => {
//     try {
//       if (loaderMode === "checkin") {
//         // Validate form
//         const isValid = await loaderForm.trigger();
//         if (!isValid) return;

//         // Prepare check-in data
//         const loaderData = {
//           name: loaderName,
//           aadhaarNumber: loaderAadhaar,
//           phoneNumber: loaderPhone,
//           vendorId: loaderVendorId,
//           photo: photos.loader,
//           checkInTime: new Date().toISOString(),
//         };

//         // Call check-in mutation
//         await loaderCheckinMutation.mutateAsync(loaderData);

//         // Reset form after successful check-in
//         handleLoaderModeChange("checkin");
//       } else if (loaderMode === "checkout") {
//         if (!isLoaderFound) {
//           toast.error("Please search and select a loader first");
//           return;
//         }

//         // Prepare check-out data
//         const checkoutData = {
//           name: loaderName,
//           aadhaarNumber: loaderAadhaar,
//           checkOutTime: new Date().toISOString(),
//         };

//         // Call check-out mutation
//         await loaderCheckoutMutation.mutateAsync(checkoutData);

//         // Reset form after successful check-out
//         handleLoaderModeChange("checkout");
//       }
//     } catch (error) {
//       console.error("Error submitting loader:", error);
//       toast.error(error.message || "An error occurred");
//     }
//   };

//   // Additional helper functions for fetching active supervisors and loaders
//   const fetchActiveSupervisors = async () => {
//     try {
//       // Replace with your actual API endpoint
//       const response = await fetch("/api/supervisors/active");
//       const data = await response.json();
//       return data;
//     } catch (error) {
//       console.error("Error fetching active supervisors:", error);
//       return [];
//     }
//   };

//   const fetchActiveLoaders = async () => {
//     try {
//       // Replace with your actual API endpoint
//       const response = await fetch("/api/loaders/active");
//       const data = await response.json();
//       return data;
//     } catch (error) {
//       console.error("Error fetching active loaders:", error);
//       return [];
//     }
//   };

//   // You might want to use React Query or similar for better data management
//   // Example with React Query:
//   const { data: activeSupervisorsData } = useQuery({
//     queryKey: ["activeSupervisors"],
//     queryFn: fetchActiveSupervisors,
//     enabled: supervisorMode === "checkout",
//   });

//   const { data: activeLoadersData } = useQuery({
//     queryKey: ["activeLoaders"],
//     queryFn: fetchActiveLoaders,
//     enabled: loaderMode === "checkout",
//   });

//   return (
//     <>
//       <div className="space-y-6">
//         {/* Section Navigation */}
//         <div className="flex space-x-2 mb-6">
//           <Button
//             variant={activeSection === "vehicle" ? "default" : "outline"}
//             onClick={() => setActiveSection("vehicle")}
//           >
//             <LogIn className="mr-2 h-4 w-4" />
//             Vehicle Management
//           </Button>
//           <Button
//             variant={activeSection === "supervisor" ? "default" : "outline"}
//             onClick={() => setActiveSection("supervisor")}
//           >
//             <UserPlus className="mr-2 h-4 w-4" />
//             Supervisor Management
//           </Button>
//           <Button
//             variant={activeSection === "loader" ? "default" : "outline"}
//             onClick={() => setActiveSection("loader")}
//           >
//             <Users className="mr-2 h-4 w-4" />
//             Loader Management
//           </Button>
//         </div>

//         {/* Vehicle Management Section */}
//         {activeSection === "vehicle" && (
//           <Card>
//             <CardHeader>
//               <div className="flex items-center justify-between">
//                 <CardTitle className="text-xl">Vehicle Entry/Exit</CardTitle>
//                 <div className="flex items-center space-x-2">
//                   <Button
//                     variant={vehicleMode === "checkin" ? "default" : "outline"}
//                     onClick={() => handleModeChange("checkin")}
//                     className={
//                       vehicleMode === "checkin"
//                         ? "bg-green-600 hover:bg-green-700"
//                         : ""
//                     }
//                   >
//                     <LogIn className="mr-2 h-4 w-4" />
//                     Check In
//                   </Button>
//                   <Button
//                     variant={vehicleMode === "checkout" ? "default" : "outline"}
//                     onClick={() => handleModeChange("checkout")}
//                     className={
//                       vehicleMode === "checkout"
//                         ? "bg-red-600 hover:bg-red-700"
//                         : ""
//                     }
//                   >
//                     <LogOut className="mr-2 h-4 w-4" />
//                     Check Out
//                   </Button>
//                 </div>
//               </div>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-4">
//                 {/* Vendor Selection for Check In */}
//                 {vehicleMode === "checkin" && (
//                   <div className="space-y-2">
//                     <Label>
//                       {getFieldLabel("Vendor", "vendorId", vehicleFormSchema)}
//                     </Label>
//                     <Select
//                       value={vehicleForm.watch("vendorId")}
//                       onValueChange={(value) => {
//                         vehicleForm.setValue("vendorId", value);
//                         setVendorId(parseInt(value));
//                       }}
//                     >
//                       <SelectTrigger
//                         className={
//                           vehicleForm.formState.errors.vendorId
//                             ? "border-red-500"
//                             : ""
//                         }
//                       >
//                         <SelectValue placeholder="Select a vendor" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {vendors?.map((vendor: any) => (
//                           <SelectItem
//                             key={vendor.id}
//                             value={vendor.id.toString()}
//                           >
//                             {vendor.name}
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                     {vehicleForm.formState.errors.vendorId && (
//                       <p className="text-sm text-red-500">
//                         {vehicleForm.formState.errors.vendorId.message}
//                       </p>
//                     )}
//                   </div>
//                 )}

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div className="space-y-2">
//                     <Label>
//                       {getFieldLabel(
//                         "Vehicle Number",
//                         "vehicleNumber",
//                         vehicleFormSchema,
//                       )}
//                     </Label>
//                     {vehicleMode === "checkout" ? (
//                       <div className="relative">
//                         <Input
//                           placeholder="Type vehicle number (e.g., KA23RT4567)"
//                           value={vehicleForm.watch("vehicleNumber")}
//                           onChange={(e) => {
//                             handleVehicleNumberChange(e.target.value);
//                           }}
//                           className={`uppercase ${
//                             vehicleForm.formState.errors.vehicleNumber
//                               ? "border-red-500"
//                               : ""
//                           } ${
//                             vehicleNumber && !isVehicleFound
//                               ? "border-red-500"
//                               : ""
//                           }`}
//                         />

//                         {/* Suggestions dropdown */}
//                         {showSuggestions && vehicleSuggestions.length > 0 && (
//                           <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
//                             {vehicleSuggestions.map((vehicle) => (
//                               <div
//                                 key={vehicle.id}
//                                 className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
//                                 onClick={() => selectVehicleSuggestion(vehicle)}
//                               >
//                                 <div className="font-medium">
//                                   {vehicle.vehicleNumber}
//                                 </div>
//                                 <div className="text-sm text-gray-600">
//                                   Driver: {vehicle.driverName} | KM:{" "}
//                                   {vehicle.openingKm}
//                                 </div>
//                               </div>
//                             ))}
//                           </div>
//                         )}

//                         <p className="text-xs text-gray-500 mt-1">
//                           Type vehicle number to search active vehicles
//                         </p>

//                         {vehicleNumber &&
//                           !isVehicleFound &&
//                           !showSuggestions && (
//                             <p className="text-sm text-red-500 mt-1">
//                               Vehicle not found in active vehicles
//                             </p>
//                           )}

//                         {isVehicleFound && (
//                           <p className="text-sm text-green-600 mt-1">
//                             ✓ Vehicle found and details populated
//                           </p>
//                         )}
//                       </div>
//                     ) : (
//                       <Input
//                         placeholder="MH01AB1234"
//                         value={vehicleForm.watch("vehicleNumber")}
//                         onChange={(e) => {
//                           const value = e.target.value.toUpperCase();
//                           vehicleForm.setValue("vehicleNumber", value);
//                           setVehicleNumber(value);
//                         }}
//                         className={`uppercase ${vehicleForm.formState.errors.vehicleNumber ? "border-red-500" : ""}`}
//                       />
//                     )}
//                     {vehicleForm.formState.errors.vehicleNumber && (
//                       <p className="text-sm text-red-500">
//                         {vehicleForm.formState.errors.vehicleNumber.message}
//                       </p>
//                     )}
//                   </div>
//                   <div className="space-y-2">
//                     <Label>
//                       {getFieldLabel(
//                         "Driver Name",
//                         "driverName",
//                         vehicleFormSchema,
//                       )}
//                     </Label>
//                     <Input
//                       placeholder="Driver's full name"
//                       value={vehicleForm.watch("driverName")}
//                       onChange={(e) => {
//                         vehicleForm.setValue("driverName", e.target.value);
//                         setDriverName(e.target.value);
//                       }}
//                       disabled={vehicleMode === "checkout"}
//                       className={
//                         vehicleForm.formState.errors.driverName
//                           ? "border-red-500"
//                           : ""
//                       }
//                     />
//                     {vehicleForm.formState.errors.driverName && (
//                       <p className="text-sm text-red-500">
//                         {vehicleForm.formState.errors.driverName.message}
//                       </p>
//                     )}
//                   </div>
//                 </div>

//                 {vehicleMode === "checkin" && (
//                   <>
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                       <div className="space-y-2">
//                         <Label>
//                           {getFieldLabel(
//                             "Driver Aadhaar Number",
//                             "aadhaarNumber",
//                             vehicleFormSchema,
//                           )}
//                         </Label>
//                         <Input
//                           placeholder="123456789012"
//                           maxLength={12}
//                           value={vehicleForm.watch("aadhaarNumber")}
//                           onChange={(e) => {
//                             const value = e.target.value.replace(/\D/g, "");
//                             vehicleForm.setValue("aadhaarNumber", value);
//                             setDriverAadhaar(value);
//                           }}
//                           className={
//                             vehicleForm.formState.errors.aadhaarNumber
//                               ? "border-red-500"
//                               : ""
//                           }
//                         />
//                         {vehicleForm.formState.errors.aadhaarNumber && (
//                           <p className="text-sm text-red-500">
//                             {vehicleForm.formState.errors.aadhaarNumber.message}
//                           </p>
//                         )}
//                       </div>
//                       <div className="space-y-2">
//                         <Label>
//                           {getFieldLabel(
//                             "Opening KM",
//                             "openingKm",
//                             vehicleFormSchema,
//                           )}
//                         </Label>
//                         <Input
//                           type="number"
//                           placeholder="Enter kilometers"
//                           value={vehicleForm.watch("openingKm")}
//                           onChange={(e) => {
//                             vehicleForm.setValue("openingKm", e.target.value);
//                             setOpeningKm(parseInt(e.target.value) || undefined);
//                           }}
//                           className={
//                             vehicleForm.formState.errors.openingKm
//                               ? "border-red-500"
//                               : ""
//                           }
//                         />
//                         {vehicleForm.formState.errors.openingKm && (
//                           <p className="text-sm text-red-500">
//                             {vehicleForm.formState.errors.openingKm.message}
//                           </p>
//                         )}
//                       </div>
//                     </div>

//                     {/* Driver Photo Section */}
//                     <div className="space-y-2">
//                       <Label>Driver Photo</Label>
//                       <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
//                         {photos.driver ? (
//                           <div className="space-y-2">
//                             <img
//                               src={photos.driver}
//                               alt="Driver"
//                               className="w-32 h-32 object-cover rounded-lg mx-auto"
//                             />
//                             <Badge variant="secondary">Photo captured</Badge>
//                           </div>
//                         ) : (
//                           <div className="space-y-2">
//                             <Camera className="h-12 w-12 text-gray-400 mx-auto" />
//                             <p className="text-sm text-gray-600">
//                               Click to capture driver photo
//                             </p>
//                           </div>
//                         )}
//                         <Button
//                           type="button"
//                           variant="outline"
//                           onClick={() => openCamera("driver")}
//                           className="mt-2"
//                         >
//                           <Camera className="mr-2 h-4 w-4" />
//                           {photos.driver ? "Retake Photo" : "Capture Photo"}
//                         </Button>
//                       </div>
//                     </div>
//                   </>
//                 )}

//                 {vehicleMode === "checkout" && (
//                   <>
//                     {/* Driver Details - Auto-populated and disabled */}
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                       <div className="space-y-2">
//                         <Label>Driver Aadhaar</Label>
//                         <Input
//                           value={driverAadhaar}
//                           disabled
//                           className="bg-gray-50"
//                           placeholder={
//                             isVehicleFound ? "" : "Enter vehicle number first"
//                           }
//                         />
//                       </div>
//                     </div>

//                     {/* KM Details */}
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                       <div className="space-y-2">
//                         <Label>Opening KM</Label>
//                         <Input
//                           type="number"
//                           value={openingKm || ""}
//                           disabled
//                           className="bg-gray-50"
//                           placeholder={
//                             isVehicleFound ? "" : "Enter vehicle number first"
//                           }
//                         />
//                       </div>
//                       <div className="space-y-2">
//                         <Label>Closing KM *</Label>
//                         <Input
//                           type="number"
//                           placeholder="Enter closing kilometers"
//                           value={closingKm || ""}
//                           onChange={(e) =>
//                             handleClosingKmChange(e.target.value)
//                           }
//                           disabled={!isVehicleFound} // Disable if vehicle not found
//                           className={
//                             closingKm && openingKm && closingKm < openingKm
//                               ? "border-red-500"
//                               : ""
//                           }
//                         />
//                         {!isVehicleFound && (
//                           <p className="text-sm text-gray-500">
//                             Find vehicle first to enter closing KM
//                           </p>
//                         )}
//                         {closingKm && openingKm && closingKm < openingKm && (
//                           <p className="text-sm text-red-500">
//                             Closing KM cannot be less than opening KM (
//                             {openingKm})
//                           </p>
//                         )}
//                       </div>
//                     </div>
//                   </>
//                 )}

//                 <Button
//                   //onClick={handleVehicleSubmit}
//                   onClick={() => {
//                     console.log("Button clicked!"); // Add this line
//                     handleVehicleSubmit();
//                   }}
//                   disabled={
//                     vehicleEntryMutation.isPending ||
//                     vehicleExitMutation.isPending ||
//                     (vehicleMode === "checkout" &&
//                       (!isVehicleFound ||
//                         !closingKm ||
//                         closingKm < (openingKm || 0)))
//                   }
//                   className="w-full"
//                 >
//                   <Save className="h-4 w-4 mr-2" />
//                   {vehicleMode === "checkin"
//                     ? "Check In Vehicle"
//                     : "Check Out Vehicle"}
//                 </Button>
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* Supervisor Management Section */}
//         {activeSection === "supervisor" && (
//           <Card>
//             <CardHeader>
//               <div className="flex items-center justify-between">
//                 <CardTitle className="text-xl">Supervisor Management</CardTitle>
//                 <div className="flex items-center space-x-2">
//                   <Button
//                     variant={
//                       supervisorMode === "checkin" ? "default" : "outline"
//                     }
//                     onClick={() => handleSupervisorModeChange("checkin")}
//                     className={
//                       supervisorMode === "checkin"
//                         ? "bg-green-600 hover:bg-green-700"
//                         : ""
//                     }
//                   >
//                     <LogIn className="mr-2 h-4 w-4" />
//                     Check In
//                   </Button>
//                   <Button
//                     variant={
//                       supervisorMode === "checkout" ? "default" : "outline"
//                     }
//                     onClick={() => handleSupervisorModeChange("checkout")}
//                     className={
//                       supervisorMode === "checkout"
//                         ? "bg-red-600 hover:bg-red-700"
//                         : ""
//                     }
//                   >
//                     <LogOut className="mr-2 h-4 w-4" />
//                     Check Out
//                   </Button>
//                 </div>
//               </div>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-4">
//                 {/* Vendor Selection for Check In */}
//                 {supervisorMode === "checkin" && (
//                   <div className="space-y-2">
//                     <Label>
//                       {getFieldLabel(
//                         "Vendor",
//                         "vendorId",
//                         supervisorFormSchema,
//                       )}
//                     </Label>
//                     <Select
//                       value={supervisorForm.watch("vendorId")}
//                       onValueChange={(value) => {
//                         supervisorForm.setValue("vendorId", value);
//                         setSupervisorVendorId(parseInt(value));
//                       }}
//                     >
//                       <SelectTrigger
//                         className={
//                           supervisorForm.formState.errors.vendorId
//                             ? "border-red-500"
//                             : ""
//                         }
//                       >
//                         <SelectValue placeholder="Select a vendor" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {vendors?.map((vendor: any) => (
//                           <SelectItem
//                             key={vendor.id}
//                             value={vendor.id.toString()}
//                           >
//                             {vendor.name}
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                     {supervisorForm.formState.errors.vendorId && (
//                       <p className="text-sm text-red-500">
//                         {supervisorForm.formState.errors.vendorId.message}
//                       </p>
//                     )}
//                   </div>
//                 )}

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div className="space-y-2">
//                     <Label>
//                       {getFieldLabel(
//                         "Supervisor Name",
//                         "name",
//                         supervisorFormSchema,
//                       )}
//                     </Label>
//                     {supervisorMode === "checkout" ? (
//                       <div className="space-y-2">
//                         <Input
//                           placeholder="Type supervisor name or Aadhaar"
//                           value={supervisorForm.watch("name")}
//                           onChange={(e) => {
//                             handleSupervisorSearch(e.target.value);
//                           }}
//                           className={`${
//                             supervisorForm.formState.errors.name
//                               ? "border-red-500"
//                               : ""
//                           } ${
//                             supervisorSearchTerm && !isSupervisorFound
//                               ? "border-red-500"
//                               : ""
//                           }`}
//                         />
//                         <p className="text-xs text-gray-500">
//                           Type name or Aadhaar to search active supervisor
//                         </p>
//                         {supervisorSearchTerm && !isSupervisorFound && (
//                           <p className="text-sm text-red-500">
//                             Supervisor not found in active supervisors
//                           </p>
//                         )}
//                         {isSupervisorFound && (
//                           <p className="text-sm text-green-600">
//                             ✓ Supervisor found and details populated
//                           </p>
//                         )}
//                       </div>
//                     ) : (
//                       <Input
//                         placeholder="Supervisor's full name"
//                         value={supervisorForm.watch("name")}
//                         onChange={(e) => {
//                           supervisorForm.setValue("name", e.target.value);
//                           setSupervisorName(e.target.value);
//                         }}
//                         className={
//                           supervisorForm.formState.errors.name
//                             ? "border-red-500"
//                             : ""
//                         }
//                       />
//                     )}
//                     {supervisorForm.formState.errors.name && (
//                       <p className="text-sm text-red-500">
//                         {supervisorForm.formState.errors.name.message}
//                       </p>
//                     )}
//                   </div>
//                   <div className="space-y-2">
//                     <Label>
//                       {getFieldLabel(
//                         "Aadhaar Number",
//                         "aadhaarNumber",
//                         supervisorFormSchema,
//                       )}
//                     </Label>
//                     <Input
//                       placeholder="123456789012"
//                       maxLength={12}
//                       value={supervisorForm.watch("aadhaarNumber")}
//                       onChange={(e) => {
//                         const value = e.target.value.replace(/\D/g, "");
//                         supervisorForm.setValue("aadhaarNumber", value);
//                         setSupervisorAadhaar(value);
//                       }}
//                       disabled={supervisorMode === "checkout"}
//                       className={`${
//                         supervisorForm.formState.errors.aadhaarNumber
//                           ? "border-red-500"
//                           : ""
//                       } ${supervisorMode === "checkout" ? "bg-gray-50" : ""}`}
//                     />
//                     {supervisorForm.formState.errors.aadhaarNumber && (
//                       <p className="text-sm text-red-500">
//                         {supervisorForm.formState.errors.aadhaarNumber.message}
//                       </p>
//                     )}
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div className="space-y-2">
//                     <Label>
//                       {getFieldLabel(
//                         "Phone Number",
//                         "phoneNumber",
//                         supervisorFormSchema,
//                       )}
//                     </Label>
//                     <Input
//                       placeholder="Phone number"
//                       value={supervisorForm.watch("phoneNumber")}
//                       onChange={(e) => {
//                         supervisorForm.setValue("phoneNumber", e.target.value);
//                         setSupervisorPhone(e.target.value);
//                       }}
//                       disabled={supervisorMode === "checkout"}
//                       className={`${
//                         supervisorForm.formState.errors.phoneNumber
//                           ? "border-red-500"
//                           : ""
//                       } ${supervisorMode === "checkout" ? "bg-gray-50" : ""}`}
//                     />
//                     {supervisorForm.formState.errors.phoneNumber && (
//                       <p className="text-sm text-red-500">
//                         {supervisorForm.formState.errors.phoneNumber.message}
//                       </p>
//                     )}
//                   </div>
//                   {supervisorMode === "checkout" && (
//                     <div className="space-y-2">
//                       <Label>Vendor</Label>
//                       <Input
//                         value={supervisorVendorName || ""}
//                         disabled
//                         className="bg-gray-50"
//                         placeholder={
//                           isSupervisorFound ? "" : "Search supervisor first"
//                         }
//                       />
//                     </div>
//                   )}
//                 </div>

//                 {/* Check In Time Display for Checkout */}
//                 {supervisorMode === "checkout" && isSupervisorFound && (
//                   <div className="space-y-2">
//                     <Label>Check In Time</Label>
//                     <Input
//                       value={supervisorCheckInTime || ""}
//                       disabled
//                       className="bg-gray-50"
//                     />
//                   </div>
//                 )}

//                 {/* Supervisor Photo Section - Only for Check In */}
//                 {supervisorMode === "checkin" && (
//                   <div className="space-y-2">
//                     <Label>Supervisor Photo</Label>
//                     <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
//                       {photos.supervisor ? (
//                         <div className="space-y-2">
//                           <img
//                             src={photos.supervisor}
//                             alt="Supervisor"
//                             className="w-32 h-32 object-cover rounded-lg mx-auto"
//                           />
//                           <Badge variant="secondary">Photo captured</Badge>
//                         </div>
//                       ) : (
//                         <div className="space-y-2">
//                           <Camera className="h-12 w-12 text-gray-400 mx-auto" />
//                           <p className="text-sm text-gray-600">
//                             Click to capture supervisor photo
//                           </p>
//                         </div>
//                       )}
//                       <Button
//                         type="button"
//                         variant="outline"
//                         onClick={() => openCamera("supervisor")}
//                         className="mt-2"
//                       >
//                         <Camera className="mr-2 h-4 w-4" />
//                         {photos.supervisor ? "Retake Photo" : "Capture Photo"}
//                       </Button>
//                     </div>
//                   </div>
//                 )}

//                 <Button
//                   onClick={handleSupervisorSubmit}
//                   disabled={
//                     supervisorCheckinMutation.isPending ||
//                     supervisorCheckoutMutation.isPending ||
//                     (supervisorMode === "checkout" && !isSupervisorFound)
//                   }
//                   className="w-full"
//                 >
//                   <Save className="h-4 w-4 mr-2" />
//                   {supervisorMode === "checkin"
//                     ? "Check In Supervisor"
//                     : "Check Out Supervisor"}
//                 </Button>
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* Loader Management Section */}

//         {activeSection === "loader" && (
//           <Card>
//             <CardHeader>
//               <div className="flex items-center justify-between">
//                 <CardTitle className="text-xl">Loader Management</CardTitle>
//                 <div className="flex items-center space-x-2">
//                   <Button
//                     variant={loaderMode === "checkin" ? "default" : "outline"}
//                     onClick={() => handleLoaderModeChange("checkin")}
//                     className={
//                       loaderMode === "checkin"
//                         ? "bg-green-600 hover:bg-green-700"
//                         : ""
//                     }
//                   >
//                     <LogIn className="mr-2 h-4 w-4" />
//                     Check In
//                   </Button>
//                   <Button
//                     variant={loaderMode === "checkout" ? "default" : "outline"}
//                     onClick={() => handleLoaderModeChange("checkout")}
//                     className={
//                       loaderMode === "checkout"
//                         ? "bg-red-600 hover:bg-red-700"
//                         : ""
//                     }
//                   >
//                     <LogOut className="mr-2 h-4 w-4" />
//                     Check Out
//                   </Button>
//                 </div>
//               </div>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-4">
//                 {/* Vendor Selection for Check In */}
//                 {loaderMode === "checkin" && (
//                   <div className="space-y-2">
//                     <Label>
//                       {getFieldLabel("Vendor", "vendorId", loaderFormSchema)}
//                     </Label>
//                     <Select
//                       value={loaderForm.watch("vendorId")}
//                       onValueChange={(value) => {
//                         loaderForm.setValue("vendorId", value);
//                         setLoaderVendorId(parseInt(value));
//                       }}
//                     >
//                       <SelectTrigger
//                         className={
//                           loaderForm.formState.errors.vendorId
//                             ? "border-red-500"
//                             : ""
//                         }
//                       >
//                         <SelectValue placeholder="Select a vendor" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {vendors?.map((vendor: any) => (
//                           <SelectItem
//                             key={vendor.id}
//                             value={vendor.id.toString()}
//                           >
//                             {vendor.name}
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                     {loaderForm.formState.errors.vendorId && (
//                       <p className="text-sm text-red-500">
//                         {loaderForm.formState.errors.vendorId.message}
//                       </p>
//                     )}
//                   </div>
//                 )}

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div className="space-y-2">
//                     <Label>
//                       {getFieldLabel("Loader Name", "name", loaderFormSchema)}
//                     </Label>
//                     {loaderMode === "checkout" ? (
//                       <div className="space-y-2">
//                         <Input
//                           placeholder="Type loader name or Aadhaar"
//                           value={loaderForm.watch("name")}
//                           onChange={(e) => {
//                             handleLoaderSearch(e.target.value);
//                           }}
//                           className={`${
//                             loaderForm.formState.errors.name
//                               ? "border-red-500"
//                               : ""
//                           } ${
//                             loaderSearchTerm && !isLoaderFound
//                               ? "border-red-500"
//                               : ""
//                           }`}
//                         />
//                         <p className="text-xs text-gray-500">
//                           Type name or Aadhaar to search active loader
//                         </p>
//                         {loaderSearchTerm && !isLoaderFound && (
//                           <p className="text-sm text-red-500">
//                             Loader not found in active loaders
//                           </p>
//                         )}
//                         {isLoaderFound && (
//                           <p className="text-sm text-green-600">
//                             ✓ Loader found and details populated
//                           </p>
//                         )}
//                       </div>
//                     ) : (
//                       <Input
//                         placeholder="Loader's full name"
//                         value={loaderForm.watch("name")}
//                         onChange={(e) => {
//                           loaderForm.setValue("name", e.target.value);
//                           setLoaderName(e.target.value);
//                         }}
//                         className={
//                           loaderForm.formState.errors.name
//                             ? "border-red-500"
//                             : ""
//                         }
//                       />
//                     )}
//                     {loaderForm.formState.errors.name && (
//                       <p className="text-sm text-red-500">
//                         {loaderForm.formState.errors.name.message}
//                       </p>
//                     )}
//                   </div>
//                   <div className="space-y-2">
//                     <Label>
//                       {getFieldLabel(
//                         "Aadhaar Number",
//                         "aadhaarNumber",
//                         loaderFormSchema,
//                       )}
//                     </Label>
//                     <Input
//                       placeholder="123456789012"
//                       maxLength={12}
//                       value={loaderForm.watch("aadhaarNumber")}
//                       onChange={(e) => {
//                         const value = e.target.value.replace(/\D/g, "");
//                         loaderForm.setValue("aadhaarNumber", value);
//                         setLoaderAadhaar(value);
//                       }}
//                       disabled={loaderMode === "checkout"}
//                       className={`${
//                         loaderForm.formState.errors.aadhaarNumber
//                           ? "border-red-500"
//                           : ""
//                       } ${loaderMode === "checkout" ? "bg-gray-50" : ""}`}
//                     />
//                     {loaderForm.formState.errors.aadhaarNumber && (
//                       <p className="text-sm text-red-500">
//                         {loaderForm.formState.errors.aadhaarNumber.message}
//                       </p>
//                     )}
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div className="space-y-2">
//                     <Label>
//                       {getFieldLabel(
//                         "Phone Number",
//                         "phoneNumber",
//                         loaderFormSchema,
//                       )}
//                     </Label>
//                     <Input
//                       placeholder="Phone number"
//                       value={loaderForm.watch("phoneNumber")}
//                       onChange={(e) => {
//                         loaderForm.setValue("phoneNumber", e.target.value);
//                         setLoaderPhone(e.target.value);
//                       }}
//                       disabled={loaderMode === "checkout"}
//                       className={`${
//                         loaderForm.formState.errors.phoneNumber
//                           ? "border-red-500"
//                           : ""
//                       } ${loaderMode === "checkout" ? "bg-gray-50" : ""}`}
//                     />
//                     {loaderForm.formState.errors.phoneNumber && (
//                       <p className="text-sm text-red-500">
//                         {loaderForm.formState.errors.phoneNumber.message}
//                       </p>
//                     )}
//                   </div>
//                   {loaderMode === "checkout" && (
//                     <div className="space-y-2">
//                       <Label>Vendor</Label>
//                       <Input
//                         value={loaderVendorName || ""}
//                         disabled
//                         className="bg-gray-50"
//                         placeholder={isLoaderFound ? "" : "Search loader first"}
//                       />
//                     </div>
//                   )}
//                 </div>

//                 {/* Check In Time Display for Checkout */}
//                 {loaderMode === "checkout" && isLoaderFound && (
//                   <div className="space-y-2">
//                     <Label>Check In Time</Label>
//                     <Input
//                       value={loaderCheckInTime || ""}
//                       disabled
//                       className="bg-gray-50"
//                     />
//                   </div>
//                 )}

//                 {/* Loader Photo Section - Only for Check In */}
//                 {loaderMode === "checkin" && (
//                   <div className="space-y-2">
//                     <Label>Loader Photo</Label>
//                     <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
//                       {photos.loader ? (
//                         <div className="space-y-2">
//                           <img
//                             src={photos.loader}
//                             alt="Loader"
//                             className="w-32 h-32 object-cover rounded-lg mx-auto"
//                           />
//                           <Badge variant="secondary">Photo captured</Badge>
//                         </div>
//                       ) : (
//                         <div className="space-y-2">
//                           <Camera className="h-12 w-12 text-gray-400 mx-auto" />
//                           <p className="text-sm text-gray-600">
//                             Click to capture loader photo
//                           </p>
//                         </div>
//                       )}
//                       <Button
//                         type="button"
//                         variant="outline"
//                         onClick={() => openCamera("loader")}
//                         className="mt-2"
//                       >
//                         <Camera className="mr-2 h-4 w-4" />
//                         {photos.loader ? "Retake Photo" : "Capture Photo"}
//                       </Button>
//                     </div>
//                   </div>
//                 )}

//                 <Button
//                   onClick={handleLoaderSubmit}
//                   disabled={
//                     loaderCheckinMutation.isPending ||
//                     loaderCheckoutMutation.isPending ||
//                     (loaderMode === "checkout" && !isLoaderFound)
//                   }
//                   className="w-full"
//                 >
//                   <Save className="h-4 w-4 mr-2" />
//                   {loaderMode === "checkin"
//                     ? "Check In Loader"
//                     : "Check Out Loader"}
//                 </Button>
//               </div>
//             </CardContent>
//           </Card>
//         )}
//       </div>

//       <CameraModal
//         isOpen={cameraModal.isOpen}
//         onClose={() => setCameraModal({ isOpen: false, type: "driver" })}
//         onCapture={handleCameraCapture}
//         title={`Capture ${cameraModal.type} Photo`}
//       />
//     </>
//   );
// }
