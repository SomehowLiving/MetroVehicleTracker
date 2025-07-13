import { storage } from './storage';
import { photoManager } from './firebase-service';
import { 
  type Vehicle, type Checkin, type Manpower,
  type InsertVehicle, type InsertCheckin, type InsertManpower 
} from "@shared/schema";

export interface VehicleWithPhoto extends Omit<InsertVehicle, 'driverPhotoUrl'> {
  driverPhoto?: File;
}

export interface ManpowerWithPhoto extends Omit<InsertManpower, 'photoUrl'> {
  photo?: File;
}

export interface CheckinWithManpower extends InsertCheckin {
  manpowerData?: ManpowerWithPhoto[];
}

export class VehicleManagementService {
  /**
   * Create a new vehicle with driver photo upload
   * @param vehicleData - Vehicle data with optional photo
   * @returns Promise<Vehicle> - Created vehicle record
   */
  async createVehicle(vehicleData: VehicleWithPhoto): Promise<Vehicle> {
    try {
      let driverPhotoUrl: string | null = null;

      // Upload driver photo if provided
      if (vehicleData.driverPhoto) {
        driverPhotoUrl = await photoManager.handleDriverPhotoUpload(
          vehicleData.driverPhoto, 
          vehicleData.vehicleNumber
        );
      }

      // Create vehicle record in database
      const vehicle = await storage.createVehicle({
        ...vehicleData,
        driverPhotoUrl
      });

      return vehicle;
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw new Error('Failed to create vehicle');
    }
  }

  /**
   * Update vehicle with new driver photo
   * @param vehicleId - Vehicle ID
   * @param updates - Update data
   * @param newDriverPhoto - New driver photo file
   * @returns Promise<Vehicle> - Updated vehicle record
   */
  async updateVehicle(
    vehicleId: number, 
    updates: Partial<VehicleWithPhoto>, 
    newDriverPhoto?: File
  ): Promise<Vehicle> {
    try {
      const existingVehicle = await storage.getVehicleById(vehicleId);
      if (!existingVehicle) {
        throw new Error('Vehicle not found');
      }

      let driverPhotoUrl = existingVehicle.driverPhotoUrl;

      // Handle photo update
      if (newDriverPhoto) {
        driverPhotoUrl = await photoManager.replacePhoto(
          existingVehicle.driverPhotoUrl,
          newDriverPhoto,
          'driver',
          { vehicleNumber: existingVehicle.vehicleNumber }
        );
      }

      // Update vehicle record
      // Note: This assumes you have an updateVehicle method in your storage interface
      // You'll need to add this method to your IStorage interface and implement it

      return {
        ...existingVehicle,
        ...updates,
        driverPhotoUrl
      };
    } catch (error) {
      console.error('Error updating vehicle:', error);
      throw new Error('Failed to update vehicle');
    }
  }

  /**
   * Create a new checkin with manpower photos
   * @param checkinData - Checkin data with manpower information
   * @returns Promise<Checkin> - Created checkin record
   */
  async createCheckin(checkinData: CheckinWithManpower): Promise<Checkin> {
    try {
      // Create checkin record first
      const checkin = await storage.createCheckin({
        storeId: checkinData.storeId,
        vehicleNumber: checkinData.vehicleNumber,
        vendorId: checkinData.vendorId,
        purpose: checkinData.purpose,
        status: checkinData.status || 'In',
        openingKm: checkinData.openingKm,
        closingKm: checkinData.closingKm,
        openingKmTimestamp: checkinData.openingKmTimestamp,
        closingKmTimestamp: checkinData.closingKmTimestamp
      });

      // Create manpower records with photos
      if (checkinData.manpowerData && checkinData.manpowerData.length > 0) {
        await Promise.all(
          checkinData.manpowerData.map(async (manpowerData) => {
            let photoUrl: string | null = null;

            // Upload manpower photo if provided
            if (manpowerData.photo) {
              photoUrl = await photoManager.handleManpowerPhotoUpload(
                manpowerData.photo,
                checkin.id,
                manpowerData.name
              );
            }

            // Create manpower record
            await storage.createManpower({
              checkinId: checkin.id,
              name: manpowerData.name,
              idNumber: manpowerData.idNumber,
              photoUrl
            });
          })
        );
      }

      return checkin;
    } catch (error) {
      console.error('Error creating checkin:', error);
      throw new Error('Failed to create checkin');
    }
  }

  /**
   * Add manpower to existing checkin
   * @param checkinId - Checkin ID
   * @param manpowerData - Manpower data with photo
   * @returns Promise<Manpower> - Created manpower record
   */
  async addManpowerToCheckin(checkinId: number, manpowerData: ManpowerWithPhoto): Promise<Manpower> {
    try {
      // Verify checkin exists
      const checkin = await storage.getCheckinById(checkinId);
      if (!checkin) {
        throw new Error('Checkin not found');
      }

      let photoUrl: string | null = null;

      // Upload manpower photo if provided
      if (manpowerData.photo) {
        photoUrl = await photoManager.handleManpowerPhotoUpload(
          manpowerData.photo,
          checkinId,
          manpowerData.name
        );
      }

      // Create manpower record
      const manpower = await storage.createManpower({
        checkinId,
        name: manpowerData.name,
        idNumber: manpowerData.idNumber,
        photoUrl
      });

      return manpower;
    } catch (error) {
      console.error('Error adding manpower:', error);
      throw new Error('Failed to add manpower');
    }
  }

  /**
   * Get checkin with all manpower details
   * @param checkinId - Checkin ID
   * @returns Promise<Checkin & { manpower: Manpower[] }> - Checkin with manpower
   */
  async getCheckinWithManpower(checkinId: number): Promise<Checkin & { manpower: Manpower[] }> {
    try {
      const checkin = await storage.getCheckinById(checkinId);
      if (!checkin) {
        throw new Error('Checkin not found');
      }

      const manpower = await storage.getManpowerByCheckinId(checkinId);

      return {
        ...checkin,
        manpower
      };
    } catch (error) {
      console.error('Error fetching checkin with manpower:', error);
      throw new Error('Failed to fetch checkin details');
    }
  }

  /**
   * Update checkin status (for checkout)
   * @param checkinId - Checkin ID
   * @param status - New status
   * @param closingKm - Closing kilometer reading
   * @returns Promise<Checkin> - Updated checkin
   */
  async updateCheckinStatus(
    checkinId: number, 
    status: 'In' | 'Out', 
    closingKm?: number
  ): Promise<Checkin> {
    try {
      const updates: Partial<Checkin> = { status };

      if (closingKm !== undefined) {
        updates.closingKm = closingKm;
        updates.closingKmTimestamp = new Date();
      }

      const updatedCheckin = await storage.updateCheckin(checkinId, updates);
      return updatedCheckin;
    } catch (error) {
      console.error('Error updating checkin status:', error);
      throw new Error('Failed to update checkin status');
    }
  }

  /**
   * Get dashboard data for a specific store
   * @param storeId - Store ID (optional)
   * @returns Promise<DashboardData> - Dashboard statistics
   */
  async getDashboardData(storeId?: number) {
    try {
      const [
        todaysCheckins,
        currentlyInside,
        extendedStays,
        storeVehicleCounts
      ] = await Promise.all([
        storage.getTodaysCheckinsCount(storeId),
        storage.getCurrentlyInsideCount(storeId),
        storage.getExtendedStaysCount(storeId),
        storage.getStoreVehicleCounts()
      ]);

      return {
        todaysCheckins,
        currentlyInside,
        extendedStays,
        storeVehicleCounts
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw new Error('Failed to fetch dashboard data');
    }
  }

  /**
   * Clean up photos when deleting records
   * @param vehicleId - Vehicle ID to delete
   */
  async deleteVehicle(vehicleId: number): Promise<void> {
    try {
      const vehicle = await storage.getVehicleById(vehicleId);
      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      // Delete driver photo if exists
      if (vehicle.driverPhotoUrl) {
        try {
          await photoManager.firebaseService.deletePhoto(vehicle.driverPhotoUrl);
        } catch (error) {
          console.warn('Failed to delete driver photo:', error);
        }
      }

      // Note: You'll need to implement deleteVehicle method in your storage interface
      // await storage.deleteVehicle(vehicleId);
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      throw new Error('Failed to delete vehicle');
    }
  }

  /**
   * Search vehicles by various criteria
   * @param criteria - Search criteria
   * @returns Promise<Vehicle[]> - Matching vehicles
   */
  async searchVehicles(criteria: {
    vehicleNumber?: string;
    driverName?: string;
    vendorId?: number;
  }): Promise<Vehicle[]> {
    try {
      // Note: You'll need to implement search methods in your storage interface
      // For now, this is a placeholder implementation
      if (criteria.vehicleNumber) {
        const vehicle = await storage.getVehicleByNumber(criteria.vehicleNumber);
        return vehicle ? [vehicle] : [];
      }

      // Implement other search criteria as needed
      return [];
    } catch (error) {
      console.error('Error searching vehicles:', error);
      throw new Error('Failed to search vehicles');
    }
  }
}

// Export singleton instance
export const vehicleManagementService = new VehicleManagementService();