import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema , createSelectSchema } from "drizzle-zod";

import { z } from "zod";

// export const stores = pgTable("stores", {
//   id: serial("id").primaryKey(),
//   name: text("name").notNull(),
//   location: text("location").notNull(),
//   isActive: boolean("is_active").default(true),
//   createdAt: timestamp("created_at").defaultNow(),
// });
export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// export const users = pgTable("users", {
//   id: serial("id").primaryKey(),
//   username: text("username").notNull().unique(),
//   password: text("password").notNull(),
//   name: text("name").notNull(),
//   email: text("email"),
//   role: text("role").notNull(), // 'admin' | 'gate_operator'
//   storeId: integer("store_id").references(() => stores.id),
//   createdAt: timestamp("created_at").defaultNow(),
// });
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  role: varchar("role", { length: 20 }).notNull(), // 'admin' | 'gate_operator'
  storeId: integer("store_id").references(() => stores.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// export const vendors = pgTable("vendors", {
//   id: serial("id").primaryKey(),
//   name: text("name").notNull(),
//   email: text("email").notNull(),
//   isActive: boolean("is_active").default(true),
// });
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// export const vehicles = pgTable("vehicles", {
//   id: serial("id").primaryKey(),
//   vehicleNumber: text("vehicle_number").notNull().unique(),
//   vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
//   driverName: text("driver_name").notNull(),
//   driverPhotoUrl: text("driver_photo_url"),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// Updated Vehicle table with Aadhaar
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  vehicleNumber: varchar("vehicle_number", { length: 50 }).notNull().unique(),
  vendorId: integer("vendor_id").references(() => vendors.id),
  driverName: varchar("driver_name", { length: 255 }).notNull(),
  driverAadhaarNumber: varchar("driver_aadhaar_number", { length: 12 }).unique(),
  driverPhotoUrl: varchar("driver_photo_url", { length: 500 }),
  numberOfLoaders: integer("number_of_loaders").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// NEW: Vehicle-specific loaders table
export const vehicleLoaders = pgTable("vehicle_loaders", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  aadhaarNumber: varchar("aadhaar_number", { length: 12 }).notNull().unique(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  photoUrl: varchar("photo_url", { length: 500 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// NEW: Vendor-store supervisors table
export const vendorSupervisors = pgTable("vendor_supervisors", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  storeId: integer("store_id").references(() => stores.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  aadhaarNumber: varchar("aadhaar_number", { length: 12 }).notNull().unique(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  photoUrl: varchar("photo_url", { length: 500 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});


export const checkins = pgTable("checkins", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id),
  storeId: integer("store_id").references(() => stores.id).notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  operatorId: integer("operator_id").references(() => users.id),
  purpose: text("purpose"),
  // openingKm: integer("opening_km"),
  // openingKmTimestamp: timestamp("opening_km_timestamp"),
  // closingKm: integer("closing_km"),
  // closingKmTimestamp: timestamp("closing_km_timestamp"),
  // KM readings with fraud detection
  openingKm: decimal("opening_km", { precision: 10, scale: 2 }),
  openingKmTimestamp: timestamp("opening_km_timestamp"),
  closingKm: decimal("closing_km", { precision: 10, scale: 2 }),
  closingKmTimestamp: timestamp("closing_km_timestamp"),
  // Fraud detection flags
  isFraudulent: boolean("is_fraudulent").default(false),
  fraudFlags: jsonb("fraud_flags"), // Store array of fraud types
  fraudNotes: text("fraud_notes"),

  // status: text("status").notNull().default("In"), // 'In' | 'Out' | 'Completed'
  // createdAt: timestamp("created_at").defaultNow(),
  // updatedAt: timestamp("updated_at").defaultNow(),
  // Denormalized fields for faster queries
//   vehicleNumber: text("vehicle_number").notNull(),
//   vendorName: text("vendor_name").notNull(),
//   driverName: text("driver_name").notNull(),
//   storeName: text("store_name").notNull(),
// });
   
  status: varchar("status", { length: 20 }).notNull(), // 'In' | 'Out' | 'Completed'
  // Denormalized fields for performance
    vehicleNumber: varchar("vehicle_number", { length: 50 }).notNull(),
    vendorName: varchar("vendor_name", { length: 255 }).notNull(),
    driverName: varchar("driver_name", { length: 255 }).notNull(),
    storeName: varchar("store_name", { length: 255 }).notNull(),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// export const manpower = pgTable("manpower", {
//   id: serial("id").primaryKey(),
//   checkinId: integer("checkin_id").references(() => checkins.id).notNull(),
//   name: text("name").notNull(),
//   idNumber: text("id_number"),
//   photoUrl: text("photo_url"),
// });
// Updated manpower table to link loaders to vehicles
export const manpower = pgTable("manpower", {
  id: serial("id").primaryKey(),
  checkinId: integer("checkin_id").references(() => checkins.id).notNull(),
  vehicleLoaderId: integer("vehicle_loader_id").references(() => vehicleLoaders.id), // Link to vehicle loader
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(), // 'loader' | 'helper'
  idNumber: varchar("id_number", { length: 50 }),
  photoUrl: varchar("photo_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// NEW: Fraud detection logs table
export const fraudLogs = pgTable("fraud_logs", {
  id: serial("id").primaryKey(),
  checkinId: integer("checkin_id").references(() => checkins.id).notNull(),
  fraudType: varchar("fraud_type", { length: 100 }).notNull(),
  description: text("description").notNull(),
  severity: varchar("severity", { length: 20 }).notNull(), // 'low' | 'medium' | 'high'
  isResolved: boolean("is_resolved").default(false),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertStoreSchema = createInsertSchema(stores).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true });
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true });
export const insertCheckinSchema = createInsertSchema(checkins).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertManpowerSchema = createInsertSchema(manpower).omit({ id: true });

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["admin", "gate_operator"]),
});

// Vehicle entry schema
export const vehicleEntrySchema = z.object({
  vendorId: z.number(),
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
  driverName: z.string().min(1, "Driver name is required"),
  driverAadhaarNumber: z.string().length(12, "Aadhaar number must be 12 digits").optional(),
  driverPhotoUrl: z.string().optional(),
  numberOfLoaders: z.number().min(0).optional(),
  openingKm: z.number().optional(),
  loaders: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    aadhaarNumber: z.string().length(12, "Aadhaar number must be 12 digits"),
    phoneNumber: z.string().optional(),
    photoUrl: z.string().optional(),
  })).optional(),
});

export const insertVehicleLoaderSchema = createInsertSchema(vehicleLoaders).omit({ id: true });
export const insertVendorSupervisorSchema = createInsertSchema(vendorSupervisors).omit({ id: true });
export const insertFraudLogSchema = createInsertSchema(fraudLogs).omit({ id: true });
export const selectVehicleLoaderSchema = createSelectSchema(vehicleLoaders);
export const selectVendorSupervisorSchema = createSelectSchema(vendorSupervisors);
export const selectFraudLogSchema = createSelectSchema(fraudLogs);



// Export types
export type Store = typeof stores.$inferSelect;
export type User = typeof users.$inferSelect;
export type Vendor = typeof vendors.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Checkin = typeof checkins.$inferSelect;
export type Manpower = typeof manpower.$inferSelect;

export type InsertStore = z.infer<typeof insertStoreSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type InsertCheckin = z.infer<typeof insertCheckinSchema>;
export type InsertManpower = z.infer<typeof insertManpowerSchema>;

export type LoginData = z.infer<typeof loginSchema>;
export type VehicleEntryData = z.infer<typeof vehicleEntrySchema>;

export type InsertVehicleLoader = z.infer<typeof insertVehicleLoaderSchema>;
export type InsertVendorSupervisor = z.infer<typeof insertVendorSupervisorSchema>;
export type InsertFraudLog = z.infer<typeof insertFraudLogSchema>;

export type VehicleLoader = z.infer<typeof selectVehicleLoaderSchema>;
export type VendorSupervisor = z.infer<typeof selectVendorSupervisorSchema>;
export type FraudLog = z.infer<typeof selectFraudLogSchema>;