import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  isActive: boolean("is_active").default(true),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  role: text("role").notNull(), // 'admin' | 'gate_operator'
  storeId: integer("store_id").references(() => stores.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  isActive: boolean("is_active").default(true),
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  vehicleNumber: text("vehicle_number").notNull().unique(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  driverName: text("driver_name").notNull(),
  driverPhotoUrl: text("driver_photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const checkins = pgTable("checkins", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id),
  storeId: integer("store_id").references(() => stores.id).notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  operatorId: integer("operator_id").references(() => users.id),
  purpose: text("purpose"),
  openingKm: integer("opening_km"),
  openingKmTimestamp: timestamp("opening_km_timestamp"),
  closingKm: integer("closing_km"),
  closingKmTimestamp: timestamp("closing_km_timestamp"),
  status: text("status").notNull().default("In"), // 'In' | 'Out' | 'Completed'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Denormalized fields for faster queries
  vehicleNumber: text("vehicle_number").notNull(),
  vendorName: text("vendor_name").notNull(),
  driverName: text("driver_name").notNull(),
  storeName: text("store_name").notNull(),
});

export const manpower = pgTable("manpower", {
  id: serial("id").primaryKey(),
  checkinId: integer("checkin_id").references(() => checkins.id).notNull(),
  name: text("name").notNull(),
  idNumber: text("id_number"),
  photoUrl: text("photo_url"),
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
  driverPhotoUrl: z.string().optional(),
  openingKm: z.number().optional(),
  manpower: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    role: z.string().min(1, "Role is required"),
    photoUrl: z.string().optional(),
  })).optional(),
});

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
