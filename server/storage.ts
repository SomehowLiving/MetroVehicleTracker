import { eq, and, gte, lte, desc, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  stores,
  users,
  vendors,
  vehicles,
  checkins,
  manpower,
  vehicleLoaders,
  vendorSupervisors,
  fraudLogs,
  type Store,
  type User,
  type Vendor,
  type Vehicle,
  type Checkin,
  type Manpower,
  type VehicleLoader,
  type VendorSupervisor,
  type FraudLog,
  type InsertStore,
  type InsertUser,
  type InsertVendor,
  type InsertVehicle,
  type InsertCheckin,
  type InsertManpower,
  type InsertVehicleLoader,
  type InsertVendorSupervisor,
  type InsertFraudLog,
  type FraudCheck,
} from "@shared/schema";

// Database connection
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  console.log(
    "Available env vars:",
    Object.keys(process.env).filter((key) => key.includes("DATABASE")),
  );
  throw new Error("DATABASE_URL is not set");
}

console.log("🔗 Connecting to database...");
console.log(
  "🔗 Database URL hostname:",
  new URL(process.env.DATABASE_URL).hostname,
);

const client = postgres(process.env.DATABASE_URL, {
  ssl: { rejectUnauthorized: false }, // Force SSL for Supabase
  onnotice: () => {}, // Suppress notices
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});
const db = drizzle(client);

// Test database connection
client`SELECT 1`
  .then(() => {
    console.log("✅ Database connected successfully");
  })
  .catch((error) => {
    console.error("❌ Database connection failed:", error.message);
    console.error("❌ Full error:", error);
    console.log("💡 Check your DATABASE_URL in Secrets/Environment variables");
    console.log("💡 Ensure your Supabase database is running and accessible");
  });

export interface IStorage {
  // Users
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Stores
  getAllStores(): Promise<Store[]>;
  getStoreById(id: number): Promise<Store | undefined>;
  createStore(store: InsertStore): Promise<Store>;

  // Vendors
  getAllVendors(): Promise<Vendor[]>;
  getVendorById(id: number): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;

  // Vehicles
  getVehicleByNumber(vehicleNumber: string): Promise<Vehicle | undefined>;
  getVehicleById(id: number): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: number, updates: Partial<Vehicle>): Promise<Vehicle>;

  // Checkins
  getCheckinById(id: number): Promise<Checkin | undefined>;
  getActiveCheckins(storeId?: number): Promise<Checkin[]>;
  getCheckinsByDateRange(
    startDate: Date,
    endDate: Date,
    storeId?: number,
  ): Promise<Checkin[]>;
  getCheckinsByVehicle(vehicleNumber: string): Promise<Checkin[]>;
  createCheckin(checkin: InsertCheckin): Promise<Checkin>;
  updateCheckin(id: number, updates: Partial<Checkin>): Promise<Checkin>;

  // Manpower
  getManpowerByCheckinId(checkinId: number): Promise<Manpower[]>;
  createManpower(manpower: InsertManpower): Promise<Manpower>;

  // Vehicle Loaders
  getVehicleLoaders(vehicleId: number): Promise<VehicleLoader[]>;
  createVehicleLoader(loader: InsertVehicleLoader): Promise<VehicleLoader>;
  updateVehicleLoader(
    id: number,
    updates: Partial<VehicleLoader>,
  ): Promise<VehicleLoader>;
  getVehicleLoaderByAadhaar(
    aadhaarNumber: string,
  ): Promise<VehicleLoader | null>;

  // Vendor Supervisors
  getVendorSupervisors(
    vendorId: number,
    storeId: number,
  ): Promise<VendorSupervisor[]>;
  createVendorSupervisor(
    supervisor: InsertVendorSupervisor,
  ): Promise<VendorSupervisor>;
  getVendorSupervisorByAadhaar(
    aadhaarNumber: string,
  ): Promise<VendorSupervisor | null>;

  // Fraud Detection
  getFraudulentCheckins(storeId?: number, limit?: number): Promise<Checkin[]>;
  getFraudLogs(checkinId?: number): Promise<FraudLog[]>;
  createFraudLog(log: InsertFraudLog): Promise<FraudLog>;
  getRecentFraudAlerts(hours?: number): Promise<FraudLog[]>;
  createCheckinWithFraudDetection(
    checkin: InsertCheckin,
    previousCheckins?: Checkin[],
  ): Promise<{ checkin: Checkin; fraudChecks: FraudCheck[] }>;
  resolveFraudAlert(alertId: number, resolvedBy: number): Promise<void>;
  getFraudStats(storeId?: number): Promise<{
    totalFraudulent: number;
    unresolvedAlerts: number;
    fraudByType: Array<{ type: string; count: number; severity: string }>;
  }>;

  // Dashboard queries
  getTodaysCheckinsCount(storeId?: number): Promise<number>;
  getCurrentlyInsideCount(storeId?: number): Promise<number>;
  getExtendedStaysCount(storeId?: number): Promise<number>;
  getStoreVehicleCounts(): Promise<
    { storeId: number; storeName: string; vehicleCount: number }[]
  >;
}

export class PostgresStorage implements IStorage {
  // User methods
  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return result[0];
  }

  async getUserById(id: number): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // Store methods
  async getAllStores(): Promise<Store[]> {
    return await db.select().from(stores);
  }

  async getStoreById(id: number): Promise<Store | undefined> {
    const result = await db
      .select()
      .from(stores)
      .where(eq(stores.id, id))
      .limit(1);
    return result[0];
  }

  async createStore(store: InsertStore): Promise<Store> {
    const result = await db.insert(stores).values(store).returning();
    return result[0];
  }

  // Vendor methods
  async getAllVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors);
  }

  async getVendorById(id: number): Promise<Vendor | undefined> {
    const result = await db
      .select()
      .from(vendors)
      .where(eq(vendors.id, id))
      .limit(1);
    return result[0];
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const result = await db.insert(vendors).values(vendor).returning();
    return result[0];
  }

  // Vehicle methods
  async getVehicleByNumber(
    vehicleNumber: string,
  ): Promise<Vehicle | undefined> {
    const result = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.vehicleNumber, vehicleNumber))
      .limit(1);
    return result[0];
  }

  async getVehicleById(id: number): Promise<Vehicle | undefined> {
    const result = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, id))
      .limit(1);
    return result[0];
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const result = await db.insert(vehicles).values(vehicle).returning();
    return result[0];
  }

  async updateVehicle(id: number, updates: Partial<Vehicle>): Promise<Vehicle> {
    const result = await db
      .update(vehicles)
      .set(updates)
      .where(eq(vehicles.id, id))
      .returning();

    if (!result[0]) {
      throw new Error(`Vehicle with id ${id} not found`);
    }
    return result[0];
  }

  // Checkin methods
  async getCheckinById(id: number): Promise<Checkin | undefined> {
    const result = await db
      .select()
      .from(checkins)
      .where(eq(checkins.id, id))
      .limit(1);
    return result[0];
  }

  async getActiveCheckins(storeId?: number): Promise<Checkin[]> {
    const conditions = [eq(checkins.status, "In")];
    if (storeId) {
      conditions.push(eq(checkins.storeId, storeId));
    }

    return await db
      .select()
      .from(checkins)
      .where(and(...conditions))
      .orderBy(desc(checkins.createdAt));
  }

  async getCheckinsByDateRange(
    startDate: Date,
    endDate: Date,
    storeId?: number,
  ): Promise<Checkin[]> {
    const conditions = [
      gte(checkins.createdAt, startDate),
      lte(checkins.createdAt, endDate),
    ];
    if (storeId) {
      conditions.push(eq(checkins.storeId, storeId));
    }

    return await db
      .select()
      .from(checkins)
      .where(and(...conditions))
      .orderBy(desc(checkins.createdAt));
  }

  async getCheckinsByVehicle(vehicleNumber: string): Promise<Checkin[]> {
    return await db
      .select()
      .from(checkins)
      .where(eq(checkins.vehicleNumber, vehicleNumber))
      .orderBy(desc(checkins.createdAt));
  }

  async createCheckin(checkin: InsertCheckin): Promise<Checkin> {
    const result = await db.insert(checkins).values(checkin).returning();
    return result[0];
  }

  async updateCheckin(id: number, updates: Partial<Checkin>): Promise<Checkin> {
    const result = await db
      .update(checkins)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(checkins.id, id))
      .returning();

    if (!result[0]) {
      throw new Error(`Checkin with id ${id} not found`);
    }
    return result[0];
  }

  // Manpower methods
  async getManpowerByCheckinId(checkinId: number): Promise<Manpower[]> {
    return await db
      .select()
      .from(manpower)
      .where(eq(manpower.checkinId, checkinId));
  }

  async createManpower(manpowerData: InsertManpower): Promise<Manpower> {
    const result = await db.insert(manpower).values(manpowerData).returning();
    return result[0];
  }

  // Vehicle Loaders methods
  async getVehicleLoaders(vehicleId: number): Promise<VehicleLoader[]> {
    return await db
      .select()
      .from(vehicleLoaders)
      .where(
        and(
          eq(vehicleLoaders.vehicleId, vehicleId),
          eq(vehicleLoaders.isActive, true),
        ),
      );
  }

  async createVehicleLoader(
    loader: InsertVehicleLoader,
  ): Promise<VehicleLoader> {
    const result = await db.insert(vehicleLoaders).values(loader).returning();
    return result[0];
  }

  async updateVehicleLoader(
    id: number,
    updates: Partial<VehicleLoader>,
  ): Promise<VehicleLoader> {
    const result = await db
      .update(vehicleLoaders)
      .set(updates)
      .where(eq(vehicleLoaders.id, id))
      .returning();

    if (!result[0]) {
      throw new Error(`Vehicle loader with id ${id} not found`);
    }
    return result[0];
  }

  async getVehicleLoaderByAadhaar(
    aadhaarNumber: string,
  ): Promise<VehicleLoader | null> {
    const result = await db
      .select()
      .from(vehicleLoaders)
      .where(eq(vehicleLoaders.aadhaarNumber, aadhaarNumber))
      .limit(1);
    return result[0] || null;
  }

  // Vendor Supervisors methods
  async getVendorSupervisors(
    vendorId: number,
    storeId: number,
  ): Promise<VendorSupervisor[]> {
    return await db
      .select()
      .from(vendorSupervisors)
      .where(
        and(
          eq(vendorSupervisors.vendorId, vendorId),
          eq(vendorSupervisors.storeId, storeId),
          eq(vendorSupervisors.isActive, true),
        ),
      );
  }

  async createVendorSupervisor(
    supervisor: InsertVendorSupervisor,
  ): Promise<VendorSupervisor> {
    const result = await db
      .insert(vendorSupervisors)
      .values(supervisor)
      .returning();
    return result[0];
  }

  async getVendorSupervisorByAadhaar(
    aadhaarNumber: string,
  ): Promise<VendorSupervisor | null> {
    const result = await db
      .select()
      .from(vendorSupervisors)
      .where(eq(vendorSupervisors.aadhaarNumber, aadhaarNumber))
      .limit(1);
    return result[0] || null;
  }

  // Fraud Detection methods
  async getFraudulentCheckins(
    storeId?: number,
    limit: number = 50,
  ): Promise<Checkin[]> {
    const conditions = [eq(checkins.isFraudulent, true)];
    if (storeId) {
      conditions.push(eq(checkins.storeId, storeId));
    }

    return await db
      .select()
      .from(checkins)
      .where(and(...conditions))
      .orderBy(desc(checkins.createdAt))
      .limit(limit);
  }

  async getFraudLogs(checkinId?: number): Promise<FraudLog[]> {
    const conditions = [];
    if (checkinId) {
      conditions.push(eq(fraudLogs.checkinId, checkinId));
    }

    return await db
      .select()
      .from(fraudLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(fraudLogs.createdAt));
  }

  async createFraudLog(log: InsertFraudLog): Promise<FraudLog> {
    const result = await db.insert(fraudLogs).values(log).returning();
    return result[0];
  }

  async getRecentFraudAlerts(hours: number = 24): Promise<FraudLog[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return await db
      .select()
      .from(fraudLogs)
      .where(
        and(gte(fraudLogs.createdAt, since), eq(fraudLogs.isResolved, false)),
      )
      .orderBy(desc(fraudLogs.createdAt));
  }

  async resolveFraudAlert(alertId: number, resolvedBy: number): Promise<void> {
    await db
      .update(fraudLogs)
      .set({
        isResolved: true,
        resolvedBy,
        resolvedAt: new Date(),
      })
      .where(eq(fraudLogs.id, alertId));
  }

  // Enhanced checkin method with fraud detection
  async createCheckinWithFraudDetection(
    checkin: InsertCheckin,
    previousCheckins: Checkin[] = [],
  ): Promise<{ checkin: Checkin; fraudChecks: FraudCheck[] }> {
    const { FraudDetectionService } = await import(
      "./services/fraud-detection"
    );

    // Run fraud detection
    const fraudChecks = FraudDetectionService.detectFraud({
      openingKm: checkin.openingKm
        ? parseFloat(checkin.openingKm.toString())
        : undefined,
      closingKm: checkin.closingKm
        ? parseFloat(checkin.closingKm.toString())
        : undefined,
      openingKmTimestamp: checkin.openingKmTimestamp,
      closingKmTimestamp: checkin.closingKmTimestamp,
      vehicleNumber: checkin.vehicleNumber,
      previousCheckins: previousCheckins.map((c) => ({
        openingKm: c.openingKm ? parseFloat(c.openingKm.toString()) : undefined,
        closingKm: c.closingKm ? parseFloat(c.closingKm.toString()) : undefined,
        openingKmTimestamp: c.openingKmTimestamp,
        closingKmTimestamp: c.closingKmTimestamp,
      })),
    });

    // Update checkin with fraud detection results
    const isFraudulent = FraudDetectionService.isFraudulent(fraudChecks);
    const fraudFlags = fraudChecks
      .filter((check) => check.detected)
      .map((check) => check.type);

    // Create checkin with fraud data
    const result = await db
      .insert(checkins)
      .values({
        ...checkin,
        isFraudulent,
        fraudFlags: fraudFlags.length > 0 ? fraudFlags : null,
      })
      .returning();

    const createdCheckin = result[0];

    // Log fraud alerts if any high-severity issues found
    if (
      fraudChecks.some((check) => check.detected && check.severity === "high")
    ) {
      await Promise.all(
        fraudChecks
          .filter((check) => check.detected && check.severity === "high")
          .map((check) =>
            db.insert(fraudLogs).values({
              checkinId: createdCheckin.id,
              fraudType: check.type,
              description: check.description,
              severity: check.severity,
              isResolved: false,
            }),
          ),
      );
    }

    return { checkin: createdCheckin, fraudChecks };
  }

  // Dashboard methods
  async getTodaysCheckinsCount(storeId?: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const conditions = [
      gte(checkins.createdAt, today),
      lte(checkins.createdAt, tomorrow),
    ];
    if (storeId) {
      conditions.push(eq(checkins.storeId, storeId));
    }

    const result = await db
      .select({ count: count() })
      .from(checkins)
      .where(and(...conditions));

    return result[0].count;
  }

  async getCurrentlyInsideCount(storeId?: number): Promise<number> {
    const conditions = [eq(checkins.status, "In")];
    if (storeId) {
      conditions.push(eq(checkins.storeId, storeId));
    }

    const result = await db
      .select({ count: count() })
      .from(checkins)
      .where(and(...conditions));

    return result[0].count;
  }

  async getExtendedStaysCount(storeId?: number): Promise<number> {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    const conditions = [
      eq(checkins.status, "In"),
      lte(checkins.createdAt, fourHoursAgo),
    ];
    if (storeId) {
      conditions.push(eq(checkins.storeId, storeId));
    }

    const result = await db
      .select({ count: count() })
      .from(checkins)
      .where(and(...conditions));

    return result[0].count;
  }

  async getStoreVehicleCounts(): Promise<
    { storeId: number; storeName: string; vehicleCount: number }[]
  > {
    const result = await db
      .select({
        storeId: stores.id,
        storeName: stores.name,
        vehicleCount: count(checkins.id),
      })
      .from(stores)
      .leftJoin(
        checkins,
        and(eq(checkins.storeId, stores.id), eq(checkins.status, "In")),
      )
      .groupBy(stores.id, stores.name)
      .orderBy(stores.name);

    return result.map((row) => ({
      storeId: row.storeId,
      storeName: row.storeName,
      vehicleCount: row.vehicleCount,
    }));
  }

  // Dashboard methods for fraud detection
  async getFraudStats(storeId?: number): Promise<{
    totalFraudulent: number;
    unresolvedAlerts: number;
    fraudByType: Array<{ type: string; count: number; severity: string }>;
  }> {
    const conditions = [];
    if (storeId) {
      conditions.push(eq(checkins.storeId, storeId));
    }

    // Total fraudulent checkins
    const totalFraudulent = await db
      .select({ count: count() })
      .from(checkins)
      .where(and(eq(checkins.isFraudulent, true), ...conditions));

    // Unresolved alerts
    const unresolvedAlerts = await db
      .select({ count: count() })
      .from(fraudLogs)
      .leftJoin(checkins, eq(fraudLogs.checkinId, checkins.id))
      .where(
        and(
          eq(fraudLogs.isResolved, false),
          ...(storeId ? [eq(checkins.storeId, storeId)] : []),
        ),
      );

    // Fraud by type
    const fraudByType = await db
      .select({
        type: fraudLogs.fraudType,
        count: count(),
        severity: fraudLogs.severity,
      })
      .from(fraudLogs)
      .leftJoin(checkins, eq(fraudLogs.checkinId, checkins.id))
      .where(storeId ? eq(checkins.storeId, storeId) : undefined)
      .groupBy(fraudLogs.fraudType, fraudLogs.severity)
      .orderBy(desc(count()));

    return {
      totalFraudulent: totalFraudulent[0].count,
      unresolvedAlerts: unresolvedAlerts[0].count,
      fraudByType: fraudByType.map((row) => ({
        type: row.type,
        count: row.count,
        severity: row.severity,
      })),
    };
  }
}

export const storage = new PostgresStorage();
