import { apiRequest } from "./queryClient";

export interface ExportOptions {
  startDate: string;
  endDate: string;
  storeId?: number;
  format?: 'csv' | 'excel' | 'pdf';
}

export async function exportData(options: ExportOptions) {
  try {
    const response = await apiRequest("POST", "/api/export/csv", options);
    
    if (options.format === 'csv') {
      const blob = new Blob([await response.text()], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metro_vehicle_report_${options.startDate}_${options.endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
    
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
