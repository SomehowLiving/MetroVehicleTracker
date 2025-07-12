import cron from 'node-cron';
import { storage } from '../storage';
import { sendVendorReport } from './email';

export class SchedulerService {
  private isInitialized = false;

  public initialize() {
    if (this.isInitialized) {
      return;
    }

    // Run vendor reports every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
      console.log('Running scheduled vendor reports...');
      await this.generateVendorReports();
    });

    // Run daily cleanup at midnight
    cron.schedule('0 0 * * *', async () => {
      console.log('Running daily cleanup...');
      await this.dailyCleanup();
    });

    this.isInitialized = true;
    console.log('Scheduler service initialized');
  }

  private async generateVendorReports() {
    try {
      const vendors = await storage.getAllVendors();
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const now = new Date();

      for (const vendor of vendors) {
        // Get checkins for this vendor in the last 30 minutes
        const checkins = await storage.getCheckinsByDateRange(thirtyMinutesAgo, now);
        const vendorCheckins = checkins.filter(c => c.vendorName === vendor.name);

        if (vendorCheckins.length > 0) {
          const reportData = vendorCheckins.map(checkin => ({
            vehicleNumber: checkin.vehicleNumber,
            driverName: checkin.driverName,
            storeName: checkin.storeName,
            entryTime: checkin.createdAt.toISOString(),
            exitTime: checkin.closingKmTimestamp?.toISOString() || 'Not yet',
            status: checkin.status,
            openingKm: checkin.openingKm || 0,
            closingKm: checkin.closingKm || 0
          }));

          const reportPeriod = `${thirtyMinutesAgo.toLocaleString()} - ${now.toLocaleString()}`;
          
          await sendVendorReport(
            vendor.email,
            vendor.name,
            reportData,
            reportPeriod
          );
        }
      }
    } catch (error) {
      console.error('Error generating vendor reports:', error);
    }
  }

  private async dailyCleanup() {
    try {
      // This would be where we clean up old data, photos, etc.
      // For now, just log the cleanup
      console.log('Daily cleanup completed');
    } catch (error) {
      console.error('Error during daily cleanup:', error);
    }
  }
}

export const schedulerService = new SchedulerService();
