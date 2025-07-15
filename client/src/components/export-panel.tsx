import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Download, Mail, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportData, emailExport } from "@/lib/export";

export function ExportPanel() {
  const { toast } = useToast();
  const [exportForm, setExportForm] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    storeId: "all", // Changed from "" to "all"
    format: "csv",
    email: "",
  });

  const { data: stores } = useQuery({
    queryKey: ["/api/stores"],
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const success = await exportData({
        startDate: exportForm.startDate,
        endDate: exportForm.endDate,
        storeId:
          exportForm.storeId === "all"
            ? undefined
            : parseInt(exportForm.storeId), // Handle "all" case
        format: exportForm.format as "csv" | "excel" | "pdf",
      });
      return success;
    },
    onSuccess: (success) => {
      if (success) {
        toast({
          title: "Success",
          description: "Report exported successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to export report",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive",
      });
    },
  });

  const emailMutation = useMutation({
    mutationFn: async () => {
      if (!exportForm.email) {
        throw new Error("Email address is required");
      }
      const success = await emailExport({
        startDate: exportForm.startDate,
        endDate: exportForm.endDate,
        storeId:
          exportForm.storeId === "all"
            ? undefined
            : parseInt(exportForm.storeId), // Handle "all" case
        format: exportForm.format as "csv" | "excel" | "pdf",
        email: exportForm.email,
      });
      return success;
    },
    onSuccess: (success) => {
      if (success) {
        toast({
          title: "Success",
          description: "Report sent to email successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send report",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send report",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    exportMutation.mutate();
  };

  const handleEmailExport = () => {
    emailMutation.mutate();
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    if (!exportForm.startDate || !exportForm.endDate) {
      toast({
        title: "Missing Dates",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch("/api/export/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: exportForm.startDate,
          endDate: exportForm.endDate,
          storeId: exportForm.storeId || null,
          format: "csv",
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        const startDateStr = new Date(exportForm.startDate).toISOString().split('T')[0];
        const endDateStr = new Date(exportForm.endDate).toISOString().split('T')[0];
        const storeText = exportForm.storeId ? `Store${exportForm.storeId}_` : 'AllStores_';
        a.download = `${storeText}Vehicle_Report_${startDateStr}_to_${endDateStr}.csv`;

        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Export Successful",
          description: "CSV file downloaded successfully",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || "Export failed");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export CSV. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range */}
        <div className="space-y-2">
          <Label>Date Range</Label>
          <div className="grid grid-cols-1 gap-2">
            <div>
              <Label htmlFor="startDate" className="text-sm">
                From
              </Label>
              <Input
                id="startDate"
                type="date"
                value={exportForm.startDate}
                onChange={(e) =>
                  setExportForm((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-sm">
                To
              </Label>
              <Input
                id="endDate"
                type="date"
                value={exportForm.endDate}
                onChange={(e) =>
                  setExportForm((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Store Selection */}
        <div className="space-y-2">
          <Label>Store</Label>
          <Select
            value={exportForm.storeId}
            onValueChange={(value) =>
              setExportForm((prev) => ({ ...prev, storeId: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores?.map((store: any) => (
                <SelectItem key={store.id} value={store.id.toString()}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Format Selection */}
        <div className="space-y-2">
          <Label>Format</Label>
          <Select
            value={exportForm.format}
            onValueChange={(value) =>
              setExportForm((prev) => ({ ...prev, format: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Email Input */}
        <div className="space-y-2">
          <Label htmlFor="email">Email Address (for email export)</Label>
          <Input
            id="email"
            type="email"
            placeholder="your-email@example.com"
            value={exportForm.email}
            onChange={(e) =>
              setExportForm((prev) => ({ ...prev, email: e.target.value }))
            }
          />
        </div>

        {/* Export Buttons */}
        <div className="space-y-2">
          <Button
            onClick={handleExport}
            className="w-full bg-metro-blue hover:bg-metro-deep-blue text-white"
            disabled={exportMutation.isPending}
          >
            <Download className="mr-2 h-4 w-4" />
            {exportMutation.isPending ? "Exporting..." : "Export Data"}
          </Button>

          <Button
            onClick={handleEmailExport}
            className="w-full bg-metro-yellow text-metro-blue hover:bg-yellow-400"
            disabled={emailMutation.isPending || !exportForm.email}
          >
            <Mail className="mr-2 h-4 w-4" />
            {emailMutation.isPending ? "Sending..." : "Email Export"}
          </Button>
        </div>

        {/* Quick Export Options */}
        <div className="pt-4 border-t">
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Quick Export
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date().toISOString().split("T")[0];
                setExportForm((prev) => ({
                  ...prev,
                  startDate: today,
                  endDate: today,
                }));
              }}
            >
              <Calendar className="mr-1 h-3 w-3" />
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const weekAgo = new Date(
                  today.getTime() - 7 * 24 * 60 * 60 * 1000,
                );
                setExportForm((prev) => ({
                  ...prev,
                  startDate: weekAgo.toISOString().split("T")[0],
                  endDate: today.toISOString().split("T")[0],
                }));
              }}
            >
              <Calendar className="mr-1 h-3 w-3" />
              This Week
            </Button>
          </div>
        </div>
        <Button
          onClick={handleExportCSV}
          disabled={isExporting}
          className="w-full"
        >
          {isExporting ? (
            <>
              <Download className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}