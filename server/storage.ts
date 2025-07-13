import { eq, and, gte, lte, desc, count } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { 
  stores, users, vendors, vehicles, checkins, manpower,
  type Store, type User, type Vendor, type Vehicle, type Checkin, type Manpower,
  type InsertStore, type InsertUser, type InsertVendor, type InsertVehicle, 
  type InsertCheckin, type InsertManpower 
} from "@shared/schema";

// Database connection
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.log('Available env vars:', Object.keys(process.env).filter(key => key.includes('DATABASE')));
  throw new Error('DATABASE_URL is not set');
}

console.log('🔗 Connecting to database...');
const client = postgres(process.env.DATABASE_URL, {
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  onnotice: () => {}, // Suppress notices
});
const db = drizzle(client);

// Test database connection
client`SELECT 1`.then(() => {
  console.log('✅ Database connected successfully');
}).catch((error) => {
  console.error('❌ Database connection failed:', error.message);
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
  getCheckinsByDateRange(startDate: Date, endDate: Date, storeId?: number): Promise<Checkin[]>;
  getCheckinsByVehicle(vehicleNumber: string): Promise<Checkin[]>;
  createCheckin(checkin: InsertCheckin): Promise<Checkin>;
  updateCheckin(id: number, updates: Partial<Checkin>): Promise<Checkin>;
  
  // Manpower
  getManpowerByCheckinId(checkinId: number): Promise<Manpower[]>;
  createManpower(manpower: InsertManpower): Promise<Manpower>;
  
  // Dashboard queries
  getTodaysCheckinsCount(storeId?: number): Promise<number>;
  getCurrentlyInsideCount(storeId?: number): Promise<number>;
  getExtendedStaysCount(storeId?: number): Promise<number>;
  getStoreVehicleCounts(): Promise<{ storeId: number; storeName: string; vehicleCount: number }[]>;
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
      const result = await db
        .insert(users)
        .values(user)
        .returning();
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
      const result = await db
        .insert(stores)
        .values(store)
        .returning();
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
      const result = await db
        .insert(vendors)
        .values(vendor)
        .returning();
      return result[0];
    }

    // Vehicle methods
    async getVehicleByNumber(vehicleNumber: string): Promise<Vehicle | undefined> {
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
      const result = await db
        .insert(vehicles)
        .values(vehicle)
        .returning();
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
      const conditions = [eq(checkins.status, 'In')];
      if (storeId) {
        conditions.push(eq(checkins.storeId, storeId));
      }

      return await db
        .select()
        .from(checkins)
        .where(and(...conditions))
        .orderBy(desc(checkins.createdAt));
    }

    async getCheckinsByDateRange(startDate: Date, endDate: Date, storeId?: number): Promise<Checkin[]> {
      const conditions = [
        gte(checkins.createdAt, startDate),
        lte(checkins.createdAt, endDate)
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
      const result = await db
        .insert(checkins)
        .values(checkin)
        .returning();
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
      const result = await db
        .insert(manpower)
        .values(manpowerData)
        .returning();
      return result[0];
    }

    // Dashboard methods
    async getTodaysCheckinsCount(storeId?: number): Promise<number> {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const conditions = [
        gte(checkins.createdAt, today),
        lte(checkins.createdAt, tomorrow)
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
      const conditions = [eq(checkins.status, 'In')];
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
        eq(checkins.status, 'In'),
        lte(checkins.createdAt, fourHoursAgo)
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

    // async getStoreVehicleCounts(): Promise<{ storeId: number; storeName: string; vehicleCount: number }[]> {
    //   const allStores = await this.getAllStores();
    //   const result = [];

    //   for (const store of allStores) {
    //     const vehicleCount = await this.getCurrentlyInsideCount(store.id);
    //     result.push({
    //       storeId: store.id,
    //       storeName: store.name,
    //       vehicleCount
    //     });
    //   }

    //   return result;
    // }
  async getStoreVehicleCounts(): Promise<{ storeId: number; storeName: string; vehicleCount: number }[]> {
    const result = await db
      .select({
        storeId: stores.id,
        storeName: stores.name,
        vehicleCount: count(checkins.id)
      })
      .from(stores)
      .leftJoin(checkins, and(
        eq(checkins.storeId, stores.id),
        eq(checkins.status, 'In')
      ))
      .groupBy(stores.id, stores.name)
      .orderBy(stores.name);

    return result.map(row => ({
      storeId: row.storeId,
      storeName: row.storeName,
      vehicleCount: row.vehicleCount
    }));
  }

  }

  export const storage = new PostgresStorage();

//   private stores: Map<number, Store>;
//   private users: Map<number, User>;
//   private vendors: Map<number, Vendor>;
//   private vehicles: Map<number, Vehicle>;
//   private checkins: Map<number, Checkin>;
//   private manpower: Map<number, Manpower>;
  
//   private currentStoreId: number = 1;
//   private currentUserId: number = 1;
//   private currentVendorId: number = 1;
//   private currentVehicleId: number = 1;
//   private currentCheckinId: number = 1;
//   private currentManpowerId: number = 1;

//   constructor() {
//     this.stores = new Map();
//     this.users = new Map();
//     this.vendors = new Map();
//     this.vehicles = new Map();
//     this.checkins = new Map();
//     this.manpower = new Map();
    
//     this.initializeMockData();
//   }

//   private initializeMockData() {
//     // Initialize 32 Metro stores
//     const storeData = [
//       { name: "Metro Mumbai Central", location: "Kamala Mills, Lower Parel, Mumbai" },
//       { name: "Metro Delhi Gurugram", location: "Sector 21, Gurugram, Haryana" },
//       { name: "Metro Bangalore Whitefield", location: "ITPL Road, Whitefield, Bangalore" },
//       { name: "Metro Chennai OMR", location: "Old Mahabalipuram Road, Chennai" },
//       { name: "Metro Hyderabad Gachibowli", location: "Gachibowli, Hyderabad" },
//       { name: "Metro Pune Hinjewadi", location: "Hinjewadi Phase 1, Pune" },
//       { name: "Metro Kolkata Salt Lake", location: "Salt Lake City, Kolkata" },
//       { name: "Metro Ahmedabad Prahlad Nagar", location: "Prahlad Nagar, Ahmedabad" },
//       { name: "Metro Noida Sector 18", location: "Sector 18, Noida" },
//       { name: "Metro Ghaziabad", location: "Raj Nagar, Ghaziabad" },
//       { name: "Metro Faridabad", location: "Sector 21, Faridabad" },
//       { name: "Metro Lucknow Gomti Nagar", location: "Gomti Nagar, Lucknow" },
//       { name: "Metro Kanpur", location: "Civil Lines, Kanpur" },
//       { name: "Metro Jaipur Malviya Nagar", location: "Malviya Nagar, Jaipur" },
//       { name: "Metro Indore", location: "Vijay Nagar, Indore" },
//       { name: "Metro Bhopal", location: "MP Nagar, Bhopal" },
//       { name: "Metro Nagpur", location: "Wardha Road, Nagpur" },
//       { name: "Metro Nashik", location: "Gangapur Road, Nashik" },
//       { name: "Metro Surat", location: "Adajan, Surat" },
//       { name: "Metro Vadodara", location: "Alkapuri, Vadodara" },
//       { name: "Metro Rajkot", location: "Kalawad Road, Rajkot" },
//       { name: "Metro Coimbatore", location: "Race Course Road, Coimbatore" },
//       { name: "Metro Kochi", location: "Edappally, Kochi" },
//       { name: "Metro Thiruvananthapuram", location: "Technopark, Thiruvananthapuram" },
//       { name: "Metro Visakhapatnam", location: "Dwaraka Nagar, Visakhapatnam" },
//       { name: "Metro Vijayawada", location: "Benz Circle, Vijayawada" },
//       { name: "Metro Mysore", location: "Hebbal, Mysore" },
//       { name: "Metro Mangalore", location: "Falnir, Mangalore" },
//       { name: "Metro Hubli", location: "Vidya Nagar, Hubli" },
//       { name: "Metro Chandigarh", location: "Sector 34, Chandigarh" },
//       { name: "Metro Ludhiana", location: "Ferozepur Road, Ludhiana" },
//       { name: "Metro Amritsar", location: "Lawrence Road, Amritsar" }
//     ];

//     storeData.forEach((store, index) => {
//       const storeRecord: Store = {
//         id: this.currentStoreId++,
//         name: store.name,
//         location: store.location,
//         isActive: true
//       };
//       this.stores.set(storeRecord.id, storeRecord);
//     });

//     // Initialize vendors
//     const vendorData = [
//       { name: "Reliance Fresh", email: "vendor@reliancefresh.com" },
//       { name: "BigBasket", email: "vendor@bigbasket.com" },
//       { name: "Grofers", email: "vendor@grofers.com" },
//       { name: "Amazon Fresh", email: "vendor@amazonfresh.com" },
//       { name: "Flipkart Grocery", email: "vendor@flipkart.com" }
//     ];

//     vendorData.forEach(vendor => {
//       const vendorRecord: Vendor = {
//         id: this.currentVendorId++,
//         name: vendor.name,
//         email: vendor.email,
//         isActive: true
//       };
//       this.vendors.set(vendorRecord.id, vendorRecord);
//     });

//     // Initialize admin user
//     const adminUser: User = {
//       id: this.currentUserId++,
//       username: "admin",
//       password: "admin123", // In production, this would be hashed
//       name: "Admin User",
//       email: "admin@metro.com",
//       role: "admin",
//       storeId: null,
//       createdAt: new Date()
//     };
//     this.users.set(adminUser.id, adminUser);

//     // Initialize gate operator users for first 3 stores
//     for (let i = 1; i <= 3; i++) {
//       const operatorUser: User = {
//         id: this.currentUserId++,
//         username: `operator${i}`,
//         password: "operator123", // In production, this would be hashed
//         name: `Gate Operator ${i}`,
//         email: `operator${i}@metro.com`,
//         role: "gate_operator",
//         storeId: i,
//         createdAt: new Date()
//       };
//       this.users.set(operatorUser.id, operatorUser);
//     }
//   }

//   // User methods
//   async getUserByUsername(username: string): Promise<User | undefined> {
//     return Array.from(this.users.values()).find(user => user.username === username);
//   }

//   async getUserById(id: number): Promise<User | undefined> {
//     return this.users.get(id);
//   }

//   async createUser(user: InsertUser): Promise<User> {
//     const newUser: User = {
//       ...user,
//       id: this.currentUserId++,
//       createdAt: new Date(),
//       email: user.email || null,
//       storeId: user.storeId || null
//     };
//     this.users.set(newUser.id, newUser);
//     return newUser;
//   }

//   // Store methods
//   async getAllStores(): Promise<Store[]> {
//     return Array.from(this.stores.values());
//   }

//   async getStoreById(id: number): Promise<Store | undefined> {
//     return this.stores.get(id);
//   }

//   async createStore(store: InsertStore): Promise<Store> {
//     const newStore: Store = {
//       ...store,
//       id: this.currentStoreId++,
//       isActive: store.isActive || null
//     };
//     this.stores.set(newStore.id, newStore);
//     return newStore;
//   }

//   // Vendor methods
//   async getAllVendors(): Promise<Vendor[]> {
//     return Array.from(this.vendors.values());
//   }

//   async getVendorById(id: number): Promise<Vendor | undefined> {
//     return this.vendors.get(id);
//   }

//   async createVendor(vendor: InsertVendor): Promise<Vendor> {
//     const newVendor: Vendor = {
//       ...vendor,
//       id: this.currentVendorId++,
//       isActive: vendor.isActive || null
//     };
//     this.vendors.set(newVendor.id, newVendor);
//     return newVendor;
//   }

//   // Vehicle methods
//   async getVehicleByNumber(vehicleNumber: string): Promise<Vehicle | undefined> {
//     return Array.from(this.vehicles.values()).find(vehicle => 
//       vehicle.vehicleNumber === vehicleNumber
//     );
//   }

//   async getVehicleById(id: number): Promise<Vehicle | undefined> {
//     return this.vehicles.get(id);
//   }

//   async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
//     const newVehicle: Vehicle = {
//       ...vehicle,
//       id: this.currentVehicleId++,
//       createdAt: new Date(),
//       driverPhotoUrl: vehicle.driverPhotoUrl || null
//     };
//     this.vehicles.set(newVehicle.id, newVehicle);
//     return newVehicle;
//   }

//   // Checkin methods
//   async getCheckinById(id: number): Promise<Checkin | undefined> {
//     return this.checkins.get(id);
//   }

//   async getActiveCheckins(storeId?: number): Promise<Checkin[]> {
//     const checkins = Array.from(this.checkins.values()).filter(checkin => 
//       checkin.status === "In" && (!storeId || checkin.storeId === storeId)
//     );
//     return checkins.sort((a, b) => {
//       const aTime = a.createdAt ? a.createdAt.getTime() : 0;
//       const bTime = b.createdAt ? b.createdAt.getTime() : 0;
//       return bTime - aTime;
//     });
//   }

//   async getCheckinsByDateRange(startDate: Date, endDate: Date, storeId?: number): Promise<Checkin[]> {
//     const checkins = Array.from(this.checkins.values()).filter(checkin => {
//       const inDateRange = checkin.createdAt && checkin.createdAt >= startDate && checkin.createdAt <= endDate;
//       const matchesStore = !storeId || checkin.storeId === storeId;
//       return inDateRange && matchesStore;
//     });
//     return checkins.sort((a, b) => {
//       const aTime = a.createdAt ? a.createdAt.getTime() : 0;
//       const bTime = b.createdAt ? b.createdAt.getTime() : 0;
//       return bTime - aTime;
//     });
//   }

//   async getCheckinsByVehicle(vehicleNumber: string): Promise<Checkin[]> {
//     const checkins = Array.from(this.checkins.values()).filter(checkin => 
//       checkin.vehicleNumber === vehicleNumber
//     );
//     return checkins.sort((a, b) => {
//       const aTime = a.createdAt ? a.createdAt.getTime() : 0;
//       const bTime = b.createdAt ? b.createdAt.getTime() : 0;
//       return bTime - aTime;
//     });
//   }

//   async createCheckin(checkin: InsertCheckin): Promise<Checkin> {
//     const newCheckin: Checkin = {
//       ...checkin,
//       id: this.currentCheckinId++,
//       createdAt: new Date(),
//       updatedAt: new Date(),
//       status: checkin.status || "In",
//       openingKm: checkin.openingKm || null,
//       closingKm: checkin.closingKm || null,
//       openingKmTimestamp: checkin.openingKmTimestamp || null,
//       closingKmTimestamp: checkin.closingKmTimestamp || null
//     };
//     this.checkins.set(newCheckin.id, newCheckin);
//     return newCheckin;
//   }

//   async updateCheckin(id: number, updates: Partial<Checkin>): Promise<Checkin> {
//     const checkin = this.checkins.get(id);
//     if (!checkin) {
//       throw new Error(`Checkin with id ${id} not found`);
//     }
    
//     const updatedCheckin: Checkin = {
//       ...checkin,
//       ...updates,
//       updatedAt: new Date()
//     };
//     this.checkins.set(id, updatedCheckin);
//     return updatedCheckin;
//   }

//   // Manpower methods
//   async getManpowerByCheckinId(checkinId: number): Promise<Manpower[]> {
//     return Array.from(this.manpower.values()).filter(m => m.checkinId === checkinId);
//   }

//   async createManpower(manpower: InsertManpower): Promise<Manpower> {
//     const newManpower: Manpower = {
//       ...manpower,
//       id: this.currentManpowerId++,
//       photoUrl: manpower.photoUrl || null
//     };
//     this.manpower.set(newManpower.id, newManpower);
//     return newManpower;
//   }

//   // Dashboard methods
//   async getTodaysCheckinsCount(storeId?: number): Promise<number> {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     const tomorrow = new Date(today);
//     tomorrow.setDate(tomorrow.getDate() + 1);
    
//     const checkins = await this.getCheckinsByDateRange(today, tomorrow, storeId);
//     return checkins.length;
//   }

//   async getCurrentlyInsideCount(storeId?: number): Promise<number> {
//     const activeCheckins = await this.getActiveCheckins(storeId);
//     return activeCheckins.length;
//   }

//   async getExtendedStaysCount(storeId?: number): Promise<number> {
//     const activeCheckins = await this.getActiveCheckins(storeId);
//     const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    
//     return activeCheckins.filter(checkin => 
//       checkin.createdAt && checkin.createdAt < fourHoursAgo
//     ).length;
//   }

//   async getStoreVehicleCounts(): Promise<{ storeId: number; storeName: string; vehicleCount: number }[]> {
//     const stores = await this.getAllStores();
//     const result = [];
    
//     for (const store of stores) {
//       const count = await this.getCurrentlyInsideCount(store.id);
//       result.push({
//         storeId: store.id,
//         storeName: store.name,
//         vehicleCount: count
//       });
//     }
    
//     return result;
//   }
// }

// export const storage = new MemStorage();
