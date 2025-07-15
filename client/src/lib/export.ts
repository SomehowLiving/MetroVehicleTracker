import { apiRequest } from "./queryClient";

export interface ExportOptions {
  startDate: string;
  endDate: string;
  storeId?: number;
  format?: 'csv' | 'excel' | 'pdf';
}

export async function exportData(options: ExportOptions) {
  try {
    const response = await fetch("/api/export/csv", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }
    
    let blob: Blob;
    let fileName: string;
    let fileExtension: string;

    switch (options.format) {
      case 'excel':
        blob = new Blob([await response.arrayBuffer()], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        fileExtension = 'xlsx';
        break;
      case 'pdf':
        blob = new Blob([await response.arrayBuffer()], { type: 'application/pdf' });
        fileExtension = 'pdf';
        break;
      default: // csv
        blob = new Blob([await response.text()], { type: 'text/csv' });
        fileExtension = 'csv';
        break;
    }

    fileName = `metro_vehicle_report_${options.startDate}_${options.endDate}.${fileExtension}`;
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error("Export failed:", error);
    return false;
  }
}

export async function emailExport(options: ExportOptions & { email: string }) {
  try {
    await apiRequest("POST", "/api/export/email", options);
    return true;
  } catch (error) {
    console.error("Email export failed:", error);
    return false;
  }
}
