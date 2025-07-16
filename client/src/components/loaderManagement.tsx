import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Camera, LogIn, LogOut, Save } from "lucide-react";
import React from "react";

const loaderFormSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  name: z.string().min(1, "Loader name is required"),
  aadhaarNumber: z.string().min(12, "Aadhaar number must be 12 digits"),
  phoneNumber: z.string().optional(),
});

// Loader form state
const [loaderVendorId, setLoaderVendorId] = useState<number | undefined>();
const [loaderName, setLoaderName] = useState("");
const [loaderAadhaar, setLoaderAadhaar] = useState("");
const [loaderPhone, setLoaderPhone] = useState("");

// Loader states
const [loaderMode, setLoaderMode] = useState("checkin");
const [loaderSearchTerm, setLoaderSearchTerm] = useState("");
const [isLoaderFound, setIsLoaderFound] = useState(false);
const [loaderVendorName, setLoaderVendorName] = useState("");
const [loaderCheckInTime, setLoaderCheckInTime] = useState("");

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

const onLoaderSubmit = (data: any) => {
  console.log("Loader form submitted:", data);
  // Add loader mutation logic here
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
};


// Loader Check-in mutation
const loaderCheckinMutation = useMutation({
  mutationFn: async (data: any) => {
    return await apiRequest("POST", "/api/loaders/checkin", {
      ...data,
      storeId,
      operatorId,
      photoUrl: photos.loader,
      checkInTime: new Date().toISOString(),
    });
  },
  onSuccess: () => {
    toast({
      title: "Success",
      description: "Loader checked in successfully",
    });
    resetLoaderForm();
    queryClient.invalidateQueries({ queryKey: ["/api/loaders"] });
    queryClient.invalidateQueries({ queryKey: ["/api/loaders/active"] });
  },
  onError: (error: any) => {
    toast({
      title: "Error",
      description: error.message || "Failed to check in loader",
      variant: "destructive",
    });
  },
});

// Loader Check-out mutation
const loaderCheckoutMutation = useMutation({
  mutationFn: async (data: any) => {
    return await apiRequest("POST", "/api/loaders/checkout", {
      ...data,
      storeId,
      operatorId,
      checkOutTime: new Date().toISOString(),
    });
  },
  onSuccess: () => {
    toast({
      title: "Success",
      description: "Loader checked out successfully",
    });
    resetLoaderForm();
    setLoaderMode("checkin");
    setIsLoaderFound(false);
    setLoaderSearchTerm("");
    queryClient.invalidateQueries({ queryKey: ["/api/loaders"] });
    queryClient.invalidateQueries({ queryKey: ["/api/loaders/active"] });
  },
  onError: (error: any) => {
    toast({
      title: "Error",
      description: error.message || "Failed to check out loader",
      variant: "destructive",
    });
  },
});


// Loader handlers
const handleLoaderModeChange = (mode) => {
  setLoaderMode(mode);

  // Reset form
  loaderForm.reset();

  // Reset states
  setLoaderName("");
  setLoaderAadhaar("");
  setLoaderPhone("");
  setLoaderVendorId(null);
  setLoaderSearchTerm("");
  setIsLoaderFound(false);
  setLoaderVendorName("");
  setLoaderCheckInTime("");

  // Clear photo if switching modes
  if (photos.loader) {
    setPhotos((prev) => ({ ...prev, loader: null }));
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
    return;
  }

  // Search in active loaders (you'll need to fetch this data)
  // This could be from an API call or local state
  const activeLoaders = activeLoadersData || []; // Replace with your actual data source

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

    // Set form values
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
  }
};


const handleLoaderSubmit = async () => {
  try {
    if (loaderMode === "checkin") {
      // Validate form
      const isValid = await loaderForm.trigger();
      if (!isValid) return;

      // Prepare check-in data
      const loaderData = {
        name: loaderName,
        aadhaarNumber: loaderAadhaar,
        phoneNumber: loaderPhone,
        vendorId: loaderVendorId,
        photo: photos.loader,
        checkInTime: new Date().toISOString(),
      };

      // Call check-in mutation
      await loaderCheckinMutation.mutateAsync(loaderData);

      // Reset form after successful check-in
      handleLoaderModeChange("checkin");
    } else if (loaderMode === "checkout") {
      if (!isLoaderFound) {
        toast.error("Please search and select a loader first");
        return;
      }

      // Prepare check-out data
      const checkoutData = {
        name: loaderName,
        aadhaarNumber: loaderAadhaar,
        checkOutTime: new Date().toISOString(),
      };

      // Call check-out mutation
      await loaderCheckoutMutation.mutateAsync(checkoutData);

      // Reset form after successful check-out
      handleLoaderModeChange("checkout");
    }
  } catch (error) {
    console.error("Error submitting loader:", error);
    toast.error(error.message || "An error occurred");
  }
};

const fetchActiveLoaders = async () => {
  try {
    // Replace with your actual API endpoint
    const response = await fetch("/api/loaders/active");
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching active loaders:", error);
    return [];
  }
};

const { data: activeLoadersData } = useQuery({
  queryKey: ["activeLoaders"],
  queryFn: fetchActiveLoaders,
  enabled: loaderMode === "checkout",
});

const openCamera = (type: "driver" | "loader" | "supervisor") => {
  setCameraModal({ isOpen: true, type });
};

// type Props = {
//   loaderMode: "checkin" | "checkout";
//   handleLoaderModeChange: (mode: "checkin" | "checkout") => void;
//   loaderForm: any;
//   vendors: any[];
//   loaderVendorId: number | null;
//   setLoaderVendorId: (id: number) => void;
//   setLoaderName: (name: string) => void;
//   setLoaderAadhaar: (aadhaar: string) => void;
//   setLoaderPhone: (phone: string) => void;
//   getFieldLabel: (label: string, field: string, schema: any) => string;
//   loaderFormSchema: any;
//   loaderSearchTerm: string;
//   isLoaderFound: boolean;
//   loaderVendorName: string;
//   loaderCheckInTime: string;
//   photos: any;
//   openCamera: (type: string) => void;
//   handleLoaderSearch: (term: string) => void;
//   handleLoaderSubmit: () => void;
//   loaderCheckinMutation: any;
//   loaderCheckoutMutation: any;
// };

export const LoaderManagement: React.FC<Props> = ({
  loaderMode,
  handleLoaderModeChange,
  loaderForm,
  vendors,
  loaderVendorId,
  setLoaderVendorId,
  setLoaderName,
  setLoaderAadhaar,
  setLoaderPhone,
  getFieldLabel,
  loaderFormSchema,
  loaderSearchTerm,
  isLoaderFound,
  loaderVendorName,
  loaderCheckInTime,
  photos,
  openCamera,
  handleLoaderSearch,
  handleLoaderSubmit,
  loaderCheckinMutation,
  loaderCheckoutMutation,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Loader Management</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant={loaderMode === "checkin" ? "default" : "outline"}
              onClick={() => handleLoaderModeChange("checkin")}
              className={
                loaderMode === "checkin" ? "bg-green-600 hover:bg-green-700" : ""
              }
            >
              <LogIn className="mr-2 h-4 w-4" />
              Check In
            </Button>
            <Button
              variant={loaderMode === "checkout" ? "default" : "outline"}
              onClick={() => handleLoaderModeChange("checkout")}
              className={
                loaderMode === "checkout" ? "bg-red-600 hover:bg-red-700" : ""
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
          {/* Vendor selection only for check-in */}
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
                    loaderForm.formState.errors.vendorId ? "border-red-500" : ""
                  }
                >
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
              {loaderForm.formState.errors.vendorId && (
                <p className="text-sm text-red-500">
                  {loaderForm.formState.errors.vendorId.message}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name field */}
            <div className="space-y-2">
              <Label>
                {getFieldLabel("Loader Name", "name", loaderFormSchema)}
              </Label>
              {loaderMode === "checkout" ? (
                <>
                  <Input
                    placeholder="Type loader name or Aadhaar"
                    value={loaderForm.watch("name")}
                    onChange={(e) => handleLoaderSearch(e.target.value)}
                    className={`${
                      loaderForm.formState.errors.name ? "border-red-500" : ""
                    } ${
                      loaderSearchTerm && !isLoaderFound
                        ? "border-red-500"
                        : ""
                    }`}
                  />
                  <p className="text-xs text-gray-500">
                    Type name or Aadhaar to search active loader
                  </p>
                  {loaderSearchTerm && !isLoaderFound && (
                    <p className="text-sm text-red-500">
                      Loader not found in active loaders
                    </p>
                  )}
                  {isLoaderFound && (
                    <p className="text-sm text-green-600">
                      ✓ Loader found and details populated
                    </p>
                  )}
                </>
              ) : (
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
              )}
              {loaderForm.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {loaderForm.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Aadhaar field */}
            <div className="space-y-2">
              <Label>
                {getFieldLabel("Aadhaar Number", "aadhaarNumber", loaderFormSchema)}
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

          {/* Phone and Vendor (on checkout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                {getFieldLabel("Phone Number", "phoneNumber", loaderFormSchema)}
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

          {/* Checkin time */}
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

          {/* Photo Capture */}
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

          <Button
            onClick={handleLoaderSubmit}
            disabled={
              loaderCheckinMutation.isPending ||
              loaderCheckoutMutation.isPending ||
              (loaderMode === "checkout" && !isLoaderFound)
            }
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {loaderMode === "checkin" ? "Check In Loader" : "Check Out Loader"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};


///------------------in vehicle form-------------
{activeSection === "loader" && (
  <LoaderManagement
    loaderMode={loaderMode}
    handleLoaderModeChange={handleLoaderModeChange}
    loaderForm={loaderForm}
    vendors={vendors}
    loaderVendorId={loaderVendorId}
    setLoaderVendorId={setLoaderVendorId}
    setLoaderName={setLoaderName}
    setLoaderAadhaar={setLoaderAadhaar}
    setLoaderPhone={setLoaderPhone}
    getFieldLabel={getFieldLabel}
    loaderFormSchema={loaderFormSchema}
    loaderSearchTerm={loaderSearchTerm}
    isLoaderFound={isLoaderFound}
    loaderVendorName={loaderVendorName}
    loaderCheckInTime={loaderCheckInTime}
    photos={photos}
    openCamera={openCamera}
    handleLoaderSearch={handleLoaderSearch}
    handleLoaderSubmit={handleLoaderSubmit}
    loaderCheckinMutation={loaderCheckinMutation}
    loaderCheckoutMutation={loaderCheckoutMutation}
  />