import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
  varchar,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/* ============================ FRAUD CHECK INTERFACE ============================ */
// Interface to match fraud-detection service
export interface FraudCheck {
  type: string;
  severity: "low" | "medium" | "high";
  description: string;
  detected: boolean;
}

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  role: varchar("role", { length: 20 }).notNull(),
  storeId: integer("store_id").references(() => stores.id), //gate-operator, fsd(full service deli), admin
  createdAt: timestamp("created_at").defaultNow(),
});

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  // sapId: varchar("sap_id", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  vehicleNumber: varchar("vehicle_number", { length: 50 }).notNull().unique(), // License plate
  vendorId: integer("vendor_id")
    .references(() => vendors.id)
    .notNull(), // Belongs to vendor - REQUIRED
  driverName: varchar("driver_name", { length: 255 }).notNull(),
  driverAadhaarNumber: varchar("driver_aadhaar_number", {
    length: 12,
  }).unique(),
  driverPhotoUrl: varchar("driver_photo_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  // odometer reading
});

// Individual loaders assigned to vehicles
export const vehicleLoaders = pgTable("vehicle_loaders", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id")
    .references(() => vehicles.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  aadhaarNumber: varchar("aadhaar_number", { length: 12 }).notNull().unique(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  photoUrl: varchar("photo_url", { length: 500 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// CHANGED: Rename to vendorLoaders and associate with vendor instead of vehicle
export const vendorLoaders = pgTable("vendor_loaders", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id")
    .references(() => vendors.id)
    .notNull(),
  storeId: integer("store_id")
    .references(() => stores.id)
    .notNull(), // Add store association
  name: varchar("name", { length: 255 }).notNull(),
  aadhaarNumber: varchar("aadhaar_number", { length: 12 }).notNull().unique(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  photoUrl: varchar("photo_url", { length: 500 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vendorSupervisors = pgTable("vendor_supervisors", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id")
    .references(() => vendors.id)
    .notNull(),
  storeId: integer("store_id")
    .references(() => stores.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  aadhaarNumber: varchar("aadhaar_number", { length: 12 }).notNull().unique(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  photoUrl: varchar("photo_url", { length: 500 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// checkin, checkout for both supervisor and loader

export const checkins = pgTable("checkins", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id")
    .references(() => vehicles.id)
    .notNull(), // Make required
  storeId: integer("store_id")
    .references(() => stores.id)
    .notNull(),
  vendorId: integer("vendor_id")
    .references(() => vendors.id)
    .notNull(),
  operatorId: integer("operator_id")
    .references(() => users.id)
    .notNull(), // Make required
  purpose: text("purpose"),
  openingKm: decimal("opening_km", { precision: 10, scale: 2 }),
  openingKmTimestamp: timestamp("opening_km_timestamp"),
  closingKm: decimal("closing_km", { precision: 10, scale: 2 }),
  closingKmTimestamp: timestamp("closing_km_timestamp"),
  isFraudulent: boolean("is_fraudulent").default(false),
  fraudFlags: jsonb("fraud_flags"),
  fraudNotes: text("fraud_notes"),
  status: varchar("status", { length: 20 }).notNull().default("active"), // Add default
  vehicleNumber: varchar("vehicle_number", { length: 50 }).notNull(),
  vendorName: varchar("vendor_name", { length: 255 }).notNull(),
  driverName: varchar("driver_name", { length: 255 }).notNull(),
  storeName: varchar("store_name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CHANGED: Link to vendorLoaders instead of vehicleLoaders
export const checkinLoaders = pgTable("checkin_loaders", {
  id: serial("id").primaryKey(),
  checkinId: integer("checkin_id")
    .references(() => checkins.id)
    .notNull(),
  vendorLoaderId: integer("vendor_loader_id")
    .references(() => vendorLoaders.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fraudLogs = pgTable("fraud_logs", {
  id: serial("id").primaryKey(),
  checkinId: integer("checkin_id")
    .references(() => checkins.id)
    .notNull(),
  fraudType: varchar("fraud_type", { length: 100 }).notNull(),
  description: text("description").notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  isResolved: boolean("is_resolved").default(false),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ENHANCED: Manpower assigned during a vehicle check-in (supports both registered and ad-hoc)
export const manpower = pgTable("manpower", {
  id: serial("id").primaryKey(),
  checkinId: integer("checkin_id")
    .references(() => checkins.id)
    .notNull(),
  vendorLoaderId: integer("vendor_loader_id").references(
    () => vendorLoaders.id,
  ), // Optional - for registered loaders
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(), // E.g., loader, supervisor
  idNumber: varchar("id_number", { length: 50 }),
  photoUrl: varchar("photo_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ============================ ZOD VALIDATION SCHEMAS ============================ */

// Basic insert schemas used in backend services
export const insertStoreSchema = createInsertSchema(stores).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
});
export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
});
export const insertCheckinSchema = createInsertSchema(checkins).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertManpowerSchema = createInsertSchema(manpower).omit({
  id: true,
});
// UPDATED: Loader schema for vendor association
export const insertVendorLoaderSchema = createInsertSchema(vendorLoaders).omit({
  id: true,
});
export const insertVendorSupervisorSchema = createInsertSchema(
  vendorSupervisors,
).omit({ id: true });
export const insertFraudLogSchema = createInsertSchema(fraudLogs).omit({
  id: true,
});
export const insertCheckinLoaderSchema = createInsertSchema(
  checkinLoaders,
).omit({ id: true });

// UPDATED: More comprehensive vehicle entry schema
//-------------------------------working well-------------------------------//
export const vehicleEntrySchema = z.object({
  // Coerce string inputs (like from dropdowns) to number
  vendorId: z.coerce.number().min(1, "Vendor is required"),

  // Validate vehicle number format (e.g., MH01AB1234)
  vehicleNumber: z
    .string()
    .min(1, "Vehicle number is required")
    .regex(
      /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/,
      "Invalid vehicle number format",
    ),

  driverName: z.string().min(1, "Driver name is required"),

  // Aadhaar is optional, must be 12 digits if provided
  driverAadhaarNumber: z
    .string()
    .length(12, "Aadhaar number must be 12 digits")
    .regex(/^[0-9]{12}$/, "Must contain only digits")
    .optional(),

  // Optional URL
  driverPhotoUrl: z.string().url().optional(),

  // Coerce input like "123" -> 123 and validate
  openingKm: z.coerce.number().min(0, "Opening KM must be positive").optional(),

  // Coerce these too — these are sent from frontend as strings sometimes
  storeId: z.coerce.number().min(1, "Store is required"),
  operatorId: z.coerce.number().min(1, "Operator is required"),
});
/* ============================ FRONTEND FORM SCHEMAS ============================ */

// Frontend form validation (used in client-side forms)
// Vehicle form validation
export const vehicleFormSchema = z.object({
  // vendorId: z.string().min(1, "Vendor is required"),
  vendorId: z.coerce.number().min(1, "Vendor is required"),
  vehicleNumber: z
    .string()
    .min(1, "Vehicle number is required")
    .regex(
      /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/,
      "Invalid vehicle number format (e.g., MH01AB1234)",
    ),
  driverName: z.string().min(2, "Driver name must be at least 2 characters"),
  aadhaarNumber: z
    .string()
    .length(12, "Aadhaar number must be exactly 12 digits")
    .regex(/^[0-9]{12}$/, "Must contain only digits"),
  openingKm: z
    .string()
    .min(1, "KM is required")
    .regex(/^\d+$/, "KM must be a number"),
});

// Vendor supervisor form validation
export const supervisorFormSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  aadhaarNumber: z
    .string()
    .length(12, "Must be exactly 12 digits")
    .regex(/^[0-9]{12}$/, "Digits only"),
  phoneNumber: z
    .string()
    .optional()
    .refine((val) => !val || /^[0-9]{10}$/.test(val), "Must be 10 digits"),
  operatorId: z.coerce.number().min(1, "Operator is required"),
});

// Vendor loader form validation
export const loaderFormSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  aadhaarNumber: z
    .string()
    .length(12, "Must be exactly 12 digits")
    .regex(/^[0-9]{12}$/, "Digits only"),
  phoneNumber: z
    .string()
    .optional()
    .refine((val) => !val || /^[0-9]{10}$/.test(val), "Must be 10 digits"),
});

/* ============================ API SCHEMAS ============================ */
// Manpower entry schema for API
export const manpowerEntrySchema = z.object({
  name: z.string().min(2),
  role: z.string().min(1),
  photoUrl: z.string().url().optional(),
});

// Vehicle check-in API payload schema

// Vehicle check-out API payload schema
export const vehicleExitSchema = z.object({
  checkinId: z.number().int().positive(),
  closingKm: z.number().int().min(0).optional(),
});

// Supervisor entry API payload
export const supervisorEntrySchema = z.object({
  vendorId: z.number().int().positive(),
  storeId: z.number().int().positive(),
  operatorId: z.number().int().positive(),
  name: z.string().min(2),
  aadhaarNumber: z
    .string()
    .length(12)
    .regex(/^[0-9]{12}$/),
  phoneNumber: z
    .string()
    .optional()
    .refine((val) => !val || /^[0-9]{10}$/.test(val)),
  photoUrl: z.string().url().optional(),
});

// Vendor loader entry API payload
export const loaderEntrySchema = z.object({
  vendorId: z.number().int().positive(),
  storeId: z.number().int().positive(),
  operatorId: z.number().int().positive(),
  name: z.string().min(2),
  aadhaarNumber: z
    .string()
    .length(12)
    .regex(/^[0-9]{12}$/),
  phoneNumber: z
    .string()
    .optional()
    .refine((val) => !val || /^[0-9]{10}$/.test(val)),
  photoUrl: z.string().url().optional(),
});

/* ============================ LEGACY SCHEMAS ============================ */

// Login schema for legacy support
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["admin", "gate_operator"]),
});

/* ============================ SELECT SCHEMAS ============================ */

export const selectVendorLoaderSchema = createSelectSchema(vendorLoaders);
export const selectVendorSupervisorSchema =
  createSelectSchema(vendorSupervisors);
export const selectFraudLogSchema = createSelectSchema(fraudLogs);
export const selectCheckinLoaderSchema = createSelectSchema(checkinLoaders);

/* ============================ TYPE EXPORTS ============================ */

// Select types for querying
export type Store = typeof stores.$inferSelect;
export type User = typeof users.$inferSelect;
export type Vendor = typeof vendors.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Checkin = typeof checkins.$inferSelect;
export type Manpower = typeof manpower.$inferSelect;
export type VendorLoader = typeof vendorLoaders.$inferSelect;
export type VendorSupervisor = typeof vendorSupervisors.$inferSelect;
export type FraudLog = typeof fraudLogs.$inferSelect;
export type CheckinLoader = typeof checkinLoaders.$inferSelect;

// Insert types for creating records
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type InsertCheckin = z.infer<typeof insertCheckinSchema>;
export type InsertManpower = z.infer<typeof insertManpowerSchema>;
export type InsertVendorLoader = z.infer<typeof insertVendorLoaderSchema>;
export type InsertVendorSupervisor = z.infer<
  typeof insertVendorSupervisorSchema
>;
export type InsertFraudLog = z.infer<typeof insertFraudLogSchema>;
export type InsertCheckinLoader = z.infer<typeof insertCheckinLoaderSchema>;

// Types for form validation on frontend
export type VehicleFormData = z.infer<typeof vehicleFormSchema>;
export type SupervisorFormData = z.infer<typeof supervisorFormSchema>;
export type LoaderFormData = z.infer<typeof loaderFormSchema>;

// Types for API request payloads
export type VehicleEntryData = z.infer<typeof vehicleEntrySchema>;
export type VehicleExitData = z.infer<typeof vehicleExitSchema>;
export type SupervisorEntryData = z.infer<typeof supervisorEntrySchema>;
export type LoaderEntryData = z.infer<typeof loaderEntrySchema>;

// Legacy login type
export type LoginData = z.infer<typeof loginSchema>;

// // Drizzle ORM and Zod imports for schema definitions and validation
// import {
//   pgTable,
//   text,
//   serial,
//   integer,
//   boolean,
//   timestamp,
//   jsonb,
//   varchar,
//   decimal,
// } from "drizzle-orm/pg-core";
// import { createInsertSchema, createSelectSchema } from "drizzle-zod";
// import { z } from "zod";

// /* ============================ FRAUD CHECK INTERFACE ============================ */
// // Fraud-detection service
// export interface FraudCheck {
//   type: string;
//   severity: 'low' | 'medium' | 'high';
//   description: string;
//   detected: boolean;
// }
// /* ============================ DATABASE TABLES ============================ */

// // Table for all retail or operational store locations
// export const stores = pgTable("stores", {
//   id: serial("id").primaryKey(), // Unique store ID
//   name: varchar("name", { length: 255 }).notNull(), // Store name
//   location: varchar("location", { length: 255 }), // Physical location (optional)
//   isActive: boolean("is_active").default(true), // Flag for store status
//   createdAt: timestamp("created_at").defaultNow(), // Timestamp of creation
// });

// // User accounts for system access (admin, gate operator, etc.)
// export const users = pgTable("users", {
//   id: serial("id").primaryKey(),
//   username: varchar("username", { length: 50 }).notNull().unique(),
//   password: varchar("password", { length: 255 }).notNull(),
//   name: varchar("name", { length: 255 }).notNull(),
//   email: varchar("email", { length: 255 }),
//   role: varchar("role", { length: 20 }).notNull(), // Role in system (admin/gate_operator)
//   storeId: integer("store_id").references(() => stores.id), // Linked store (optional)
//   createdAt: timestamp("created_at").defaultNow(),
// });

// // Vendor table to manage logistics or transport vendors
// export const vendors = pgTable("vendors", {
//   id: serial("id").primaryKey(),
//   name: varchar("name", { length: 255 }).notNull(),
//   email: varchar("email", { length: 255 }),
//   isActive: boolean("is_active").default(true),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// // Vehicle records including vendor link and driver info
// export const vehicles = pgTable("vehicles", {
//   id: serial("id").primaryKey(),
//   vehicleNumber: varchar("vehicle_number", { length: 50 }).notNull().unique(), // License plate
//   vendorId: integer("vendor_id").references(() => vendors.id), // Belongs to vendor
//   driverName: varchar("driver_name", { length: 255 }).notNull(),
//   driverAadhaarNumber: varchar("driver_aadhaar_number", {
//     length: 12,
//   }).unique(),
//   driverPhotoUrl: varchar("driver_photo_url", { length: 500 }),
//   numberOfLoaders: integer("number_of_loaders").default(0),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// // Individual loaders assigned to vehicles
// export const vehicleLoaders = pgTable("vehicle_loaders", {
//   id: serial("id").primaryKey(),
//   vehicleId: integer("vehicle_id")
//     .references(() => vehicles.id)
//     .notNull(),
//   name: varchar("name", { length: 255 }).notNull(),
//   aadhaarNumber: varchar("aadhaar_number", { length: 12 }).notNull().unique(),
//   phoneNumber: varchar("phone_number", { length: 20 }),
//   photoUrl: varchar("photo_url", { length: 500 }),
//   isActive: boolean("is_active").default(true),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// // CHANGED: Rename to vendorLoaders and associate with vendor instead of vehicle
// export const vendorLoaders = pgTable("vendor_loaders", {
//   id: serial("id").primaryKey(),
//   vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
//   storeId: integer("store_id").references(() => stores.id).notNull(), // Add store association
//   name: varchar("name", { length: 255 }).notNull(),
//   aadhaarNumber: varchar("aadhaar_number", { length: 12 }).notNull().unique(),
//   phoneNumber: varchar("phone_number", { length: 20 }),
//   photoUrl: varchar("photo_url", { length: 500 }),
//   isActive: boolean("is_active").default(true),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// // Vendor supervisors responsible for operations at specific stores
// export const vendorSupervisors = pgTable("vendor_supervisors", {
//   id: serial("id").primaryKey(),
//   vendorId: integer("vendor_id")
//     .references(() => vendors.id)
//     .notNull(),
//   storeId: integer("store_id")
//     .references(() => stores.id)
//     .notNull(),
//   name: varchar("name", { length: 255 }).notNull(),
//   aadhaarNumber: varchar("aadhaar_number", { length: 12 }).notNull().unique(),
//   phoneNumber: varchar("phone_number", { length: 20 }),
//   photoUrl: varchar("photo_url", { length: 500 }),
//   isActive: boolean("is_active").default(true),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// // Check-in events for vehicles entering a store
// export const checkins = pgTable("checkins", {
//   id: serial("id").primaryKey(),
//   vehicleId: integer("vehicle_id").references(() => vehicles.id),
//   storeId: integer("store_id")
//     .references(() => stores.id)
//     .notNull(),
//   vendorId: integer("vendor_id")
//     .references(() => vendors.id)
//     .notNull(),
//   operatorId: integer("operator_id").references(() => users.id),
//   purpose: text("purpose"), // Reason for visit
//   openingKm: decimal("opening_km", { precision: 10, scale: 2 }),
//   openingKmTimestamp: timestamp("opening_km_timestamp"),
//   closingKm: decimal("closing_km", { precision: 10, scale: 2 }),
//   closingKmTimestamp: timestamp("closing_km_timestamp"),
//   isFraudulent: boolean("is_fraudulent").default(false), // Flag for suspicious activity
//   fraudFlags: jsonb("fraud_flags"), // Details about detected fraud
//   fraudNotes: text("fraud_notes"),
//   status: varchar("status", { length: 20 }).notNull(), // Check-in status (e.g., "open", "closed")
//   vehicleNumber: varchar("vehicle_number", { length: 50 }).notNull(),
//   vendorName: varchar("vendor_name", { length: 255 }).notNull(),
//   driverName: varchar("driver_name", { length: 255 }).notNull(),
//   storeName: varchar("store_name", { length: 255 }).notNull(),
//   createdAt: timestamp("created_at").defaultNow(),
//   updatedAt: timestamp("updated_at").defaultNow(),
// });

// // Manpower assigned during a vehicle check-in
// export const manpower = pgTable("manpower", {
//   id: serial("id").primaryKey(),
//   checkinId: integer("checkin_id")
//     .references(() => checkins.id)
//     .notNull(),
//   vehicleLoaderId: integer("vehicle_loader_id").references(
//     () => vehicleLoaders.id,
//   ),
//   name: varchar("name", { length: 255 }).notNull(),
//   role: varchar("role", { length: 50 }).notNull(), // E.g., loader, supervisor
//   idNumber: varchar("id_number", { length: 50 }),
//   photoUrl: varchar("photo_url", { length: 500 }),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// // Logs to track and categorize frauds related to check-ins
// export const fraudLogs = pgTable("fraud_logs", {
//   id: serial("id").primaryKey(),
//   checkinId: integer("checkin_id")
//     .references(() => checkins.id)
//     .notNull(),
//   fraudType: varchar("fraud_type", { length: 100 }).notNull(),
//   description: text("description").notNull(),
//   severity: varchar("severity", { length: 20 }).notNull(),
//   isResolved: boolean("is_resolved").default(false),
//   resolvedBy: integer("resolved_by").references(() => users.id),
//   resolvedAt: timestamp("resolved_at"),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// /* ============================ ZOD VALIDATION SCHEMAS ============================ */

// // Basic insert schemas used in backend services
// export const insertStoreSchema = createInsertSchema(stores).omit({ id: true });
// export const insertUserSchema = createInsertSchema(users).omit({
//   id: true,
//   createdAt: true,
// });
// export const insertVendorSchema = createInsertSchema(vendors).omit({
//   id: true,
// });
// export const insertVehicleSchema = createInsertSchema(vehicles).omit({
//   id: true,
//   createdAt: true,
// });
// export const insertCheckinSchema = createInsertSchema(checkins).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });
// export const insertManpowerSchema = createInsertSchema(manpower).omit({
//   id: true,
// });
// export const insertVehicleLoaderSchema = createInsertSchema(
//   vehicleLoaders,
// ).omit({ id: true });
// export const insertVendorSupervisorSchema = createInsertSchema(
//   vendorSupervisors,
// ).omit({ id: true });
// export const insertFraudLogSchema = createInsertSchema(fraudLogs).omit({
//   id: true,
// });

// // Frontend form validation (used in client-side forms)

// // Vehicle form validation
// export const vehicleFormSchema = z.object({
//   vendorId: z.string().min(1, "Vendor is required"),
//   vehicleNumber: z
//     .string()
//     .min(1, "Vehicle number is required")
//     .regex(
//       /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/,
//       "Invalid vehicle number format (e.g., MH01AB1234)",
//     ),
//   driverName: z.string().min(2, "Driver name must be at least 2 characters"),
//   aadhaarNumber: z
//     .string()
//     .length(12, "Aadhaar number must be exactly 12 digits")
//     .regex(/^[0-9]{12}$/, "Must contain only digits"),
//   openingKm: z
//     .string()
//     .min(1, "KM is required")
//     .regex(/^\d+$/, "KM must be a number"),
// });

// // Vendor supervisor form validation
// export const supervisorFormSchema = z.object({
//   vendorId: z.string().min(1, "Vendor is required"),
//   name: z.string().min(2, "Name must be at least 2 characters"),
//   aadhaarNumber: z
//     .string()
//     .length(12, "Must be exactly 12 digits")
//     .regex(/^[0-9]{12}$/, "Digits only"),
//   phoneNumber: z
//     .string()
//     .optional()
//     .refine((val) => !val || /^[0-9]{10}$/.test(val), "Must be 10 digits"),
// });

// // Vehicle loader form validation
// export const loaderFormSchema = z.object({
//   vendorId: z.string().min(1, "Vendor is required"),
//   name: z.string().min(2, "Name must be at least 2 characters"),
//   aadhaarNumber: z
//     .string()
//     .length(12, "Must be exactly 12 digits")
//     .regex(/^[0-9]{12}$/, "Digits only"),
//   phoneNumber: z
//     .string()
//     .optional()
//     .refine((val) => !val || /^[0-9]{10}$/.test(val), "Must be 10 digits"),
// });

// /* ============================ API SCHEMAS ============================ */

// // Vehicle check-in API payload schema
// export const vehicleEntrySchema = z.object({
//   vendorId: z.number().int().positive(),
//   vehicleNumber: z.string().regex(/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/),
//   driverName: z.string().min(2),
//   driverAadhaarNumber: z
//     .string()
//     .length(12)
//     .regex(/^[0-9]{12}$/)
//     .optional(),
//   driverPhotoUrl: z.string().url().optional(),
//   openingKm: z.number().int().min(0).optional(),
//   storeId: z.number().int().positive(),
//   operatorId: z.number().int().positive(),
// });

// // Vehicle check-out API payload schema
// export const vehicleExitSchema = z.object({
//   checkinId: z.number().int().positive(),
//   closingKm: z.number().int().min(0).optional(),
// });

// // Supervisor entry API payload
// export const supervisorEntrySchema = z.object({
//   vendorId: z.number().int().positive(),
//   storeId: z.number().int().positive(),
//   operatorId: z.number().int().positive(),
//   name: z.string().min(2),
//   aadhaarNumber: z
//     .string()
//     .length(12)
//     .regex(/^[0-9]{12}$/),
//   phoneNumber: z
//     .string()
//     .optional()
//     .refine((val) => !val || /^[0-9]{10}$/.test(val)),
//   photoUrl: z.string().url().optional(),
// });

// // Loader entry API payload
// export const loaderEntrySchema = z.object({
//   vendorId: z.number().int().positive(),
//   storeId: z.number().int().positive(),
//   operatorId: z.number().int().positive(),
//   name: z.string().min(2),
//   aadhaarNumber: z
//     .string()
//     .length(12)
//     .regex(/^[0-9]{12}$/),
//   phoneNumber: z
//     .string()
//     .optional()
//     .refine((val) => !val || /^[0-9]{10}$/.test(val)),
//   photoUrl: z.string().url().optional(),
// });

// /* ============================ LEGACY SCHEMAS ============================ */

// // Login schema for legacy support
// export const loginSchema = z.object({
//   username: z.string().min(1),
//   password: z.string().min(1),
//   role: z.enum(["admin", "gate_operator"]),
// });

// /* ============================ SELECT SCHEMAS ============================ */

// export const selectVehicleLoaderSchema = createSelectSchema(vehicleLoaders);
// export const selectVendorSupervisorSchema =
//   createSelectSchema(vendorSupervisors);
// export const selectFraudLogSchema = createSelectSchema(fraudLogs);

// /* ============================ TYPE EXPORTS ============================ */

// // Select types for querying
// export type Store = typeof stores.$inferSelect;
// export type User = typeof users.$inferSelect;
// export type Vendor = typeof vendors.$inferSelect;
// export type Vehicle = typeof vehicles.$inferSelect;
// export type Checkin = typeof checkins.$inferSelect;
// export type Manpower = typeof manpower.$inferSelect;
// export type VehicleLoader = typeof vehicleLoaders.$inferSelect;
// export type VendorSupervisor = typeof vendorSupervisors.$inferSelect;
// export type FraudLog = typeof fraudLogs.$inferSelect;

// // Insert types for creating records
// export type InsertStore = z.infer<typeof insertStoreSchema>;
// export type InsertUser = z.infer<typeof insertUserSchema>;
// export type InsertVendor = z.infer<typeof insertVendorSchema>;
// export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
// export type InsertCheckin = z.infer<typeof insertCheckinSchema>;
// export type InsertManpower = z.infer<typeof insertManpowerSchema>;
// export type InsertVehicleLoader = z.infer<typeof insertVehicleLoaderSchema>;
// export type InsertVendorSupervisor = z.infer<
//   typeof insertVendorSupervisorSchema
// >;
// export type InsertFraudLog = z.infer<typeof insertFraudLogSchema>;

// // Types for form validation on frontend
// export type VehicleFormData = z.infer<typeof vehicleFormSchema>;
// export type SupervisorFormData = z.infer<typeof supervisorFormSchema>;
// export type LoaderFormData = z.infer<typeof loaderFormSchema>;

// // Types for API request payloads
// export type VehicleEntryData = z.infer<typeof vehicleEntrySchema>;
// export type VehicleExitData = z.infer<typeof vehicleExitSchema>;
// export type SupervisorEntryData = z.infer<typeof supervisorEntrySchema>;
// export type LoaderEntryData = z.infer<typeof loaderEntrySchema>;

// // Legacy login type
// export type LoginData = z.infer<typeof loginSchema>;

//----------initial working!-------------------//

// import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, decimal } from "drizzle-orm/pg-core";
// import { createInsertSchema , createSelectSchema } from "drizzle-zod";

// import { z } from "zod";

// // export const stores = pgTable("stores", {
// //   id: serial("id").primaryKey(),
// //   name: text("name").notNull(),
// //   location: text("location").notNull(),
// //   isActive: boolean("is_active").default(true),
// //   createdAt: timestamp("created_at").defaultNow(),
// // });
// export const stores = pgTable("stores", {
//   id: serial("id").primaryKey(),
//   name: varchar("name", { length: 255 }).notNull(),
//   location: varchar("location", { length: 255 }),
//   isActive: boolean("is_active").default(true),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// // export const users = pgTable("users", {
// //   id: serial("id").primaryKey(),
// //   username: text("username").notNull().unique(),
// //   password: text("password").notNull(),
// //   name: text("name").notNull(),
// //   email: text("email"),
// //   role: text("role").notNull(), // 'admin' | 'gate_operator'
// //   storeId: integer("store_id").references(() => stores.id),
// //   createdAt: timestamp("created_at").defaultNow(),
// // });
// export const users = pgTable("users", {
//   id: serial("id").primaryKey(),
//   username: varchar("username", { length: 50 }).notNull().unique(),
//   password: varchar("password", { length: 255 }).notNull(),
//   name: varchar("name", { length: 255 }).notNull(),
//   email: varchar("email", { length: 255 }),
//   role: varchar("role", { length: 20 }).notNull(), // 'admin' | 'gate_operator'
//   storeId: integer("store_id").references(() => stores.id),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// // export const vendors = pgTable("vendors", {
// //   id: serial("id").primaryKey(),
// //   name: text("name").notNull(),
// //   email: text("email").notNull(),
// //   isActive: boolean("is_active").default(true),
// // });
// export const vendors = pgTable("vendors", {
//   id: serial("id").primaryKey(),
//   name: varchar("name", { length: 255 }).notNull(),
//   email: varchar("email", { length: 255 }),
//   isActive: boolean("is_active").default(true),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// // export const vehicles = pgTable("vehicles", {
// //   id: serial("id").primaryKey(),
// //   vehicleNumber: text("vehicle_number").notNull().unique(),
// //   vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
// //   driverName: text("driver_name").notNull(),
// //   driverPhotoUrl: text("driver_photo_url"),
// //   createdAt: timestamp("created_at").defaultNow(),
// // });

// // Updated Vehicle table with Aadhaar
// export const vehicles = pgTable("vehicles", {
//   id: serial("id").primaryKey(),
//   vehicleNumber: varchar("vehicle_number", { length: 50 }).notNull().unique(),
//   vendorId: integer("vendor_id").references(() => vendors.id),
//   driverName: varchar("driver_name", { length: 255 }).notNull(),
//   driverAadhaarNumber: varchar("driver_aadhaar_number", { length: 12 }).unique(),
//   driverPhotoUrl: varchar("driver_photo_url", { length: 500 }),
//   numberOfLoaders: integer("number_of_loaders").default(0),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// // NEW: Vehicle-specific loaders table
// export const vehicleLoaders = pgTable("vehicle_loaders", {
//   id: serial("id").primaryKey(),
//   vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
//   name: varchar("name", { length: 255 }).notNull(),
//   aadhaarNumber: varchar("aadhaar_number", { length: 12 }).notNull().unique(),
//   phoneNumber: varchar("phone_number", { length: 20 }),
//   photoUrl: varchar("photo_url", { length: 500 }),
//   isActive: boolean("is_active").default(true),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// // NEW: Vendor-store supervisors table
// export const vendorSupervisors = pgTable("vendor_supervisors", {
//   id: serial("id").primaryKey(),
//   vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
//   storeId: integer("store_id").references(() => stores.id).notNull(),
//   name: varchar("name", { length: 255 }).notNull(),
//   aadhaarNumber: varchar("aadhaar_number", { length: 12 }).notNull().unique(),
//   phoneNumber: varchar("phone_number", { length: 20 }),
//   photoUrl: varchar("photo_url", { length: 500 }),
//   isActive: boolean("is_active").default(true),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// export const checkins = pgTable("checkins", {
//   id: serial("id").primaryKey(),
//   vehicleId: integer("vehicle_id").references(() => vehicles.id),
//   storeId: integer("store_id").references(() => stores.id).notNull(),
//   vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
//   operatorId: integer("operator_id").references(() => users.id),
//   purpose: text("purpose"),
//   // openingKm: integer("opening_km"),
//   // openingKmTimestamp: timestamp("opening_km_timestamp"),
//   // closingKm: integer("closing_km"),
//   // closingKmTimestamp: timestamp("closing_km_timestamp"),
//   // KM readings with fraud detection
//   openingKm: decimal("opening_km", { precision: 10, scale: 2 }),
//   openingKmTimestamp: timestamp("opening_km_timestamp"),
//   closingKm: decimal("closing_km", { precision: 10, scale: 2 }),
//   closingKmTimestamp: timestamp("closing_km_timestamp"),
//   // Fraud detection flags
//   isFraudulent: boolean("is_fraudulent").default(false),
//   fraudFlags: jsonb("fraud_flags"), // Store array of fraud types
//   fraudNotes: text("fraud_notes"),

//   // status: text("status").notNull().default("In"), // 'In' | 'Out' | 'Completed'
//   // createdAt: timestamp("created_at").defaultNow(),
//   // updatedAt: timestamp("updated_at").defaultNow(),
//   // Denormalized fields for faster queries
// //   vehicleNumber: text("vehicle_number").notNull(),
// //   vendorName: text("vendor_name").notNull(),
// //   driverName: text("driver_name").notNull(),
// //   storeName: text("store_name").notNull(),
// // });

//   status: varchar("status", { length: 20 }).notNull(), // 'In' | 'Out' | 'Completed'
//   // Denormalized fields for performance
//     vehicleNumber: varchar("vehicle_number", { length: 50 }).notNull(),
//     vendorName: varchar("vendor_name", { length: 255 }).notNull(),
//     driverName: varchar("driver_name", { length: 255 }).notNull(),
//     storeName: varchar("store_name", { length: 255 }).notNull(),

//     createdAt: timestamp("created_at").defaultNow(),
//     updatedAt: timestamp("updated_at").defaultNow(),
// });

// // export const manpower = pgTable("manpower", {
// //   id: serial("id").primaryKey(),
// //   checkinId: integer("checkin_id").references(() => checkins.id).notNull(),
// //   name: text("name").notNull(),
// //   idNumber: text("id_number"),
// //   photoUrl: text("photo_url"),
// // });
// // Updated manpower table to link loaders to vehicles
// export const manpower = pgTable("manpower", {
//   id: serial("id").primaryKey(),
//   checkinId: integer("checkin_id").references(() => checkins.id).notNull(),
//   vehicleLoaderId: integer("vehicle_loader_id").references(() => vehicleLoaders.id), // Link to vehicle loader
//   name: varchar("name", { length: 255 }).notNull(),
//   role: varchar("role", { length: 50 }).notNull(), // 'loader' | 'helper'
//   idNumber: varchar("id_number", { length: 50 }),
//   photoUrl: varchar("photo_url", { length: 500 }),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// // NEW: Fraud detection logs table
// export const fraudLogs = pgTable("fraud_logs", {
//   id: serial("id").primaryKey(),
//   checkinId: integer("checkin_id").references(() => checkins.id).notNull(),
//   fraudType: varchar("fraud_type", { length: 100 }).notNull(),
//   description: text("description").notNull(),
//   severity: varchar("severity", { length: 20 }).notNull(), // 'low' | 'medium' | 'high'
//   isResolved: boolean("is_resolved").default(false),
//   resolvedBy: integer("resolved_by").references(() => users.id),
//   resolvedAt: timestamp("resolved_at"),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// // Insert schemas
// export const insertStoreSchema = createInsertSchema(stores).omit({ id: true });
// export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
// export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true });
// export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true });
// export const insertCheckinSchema = createInsertSchema(checkins).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true
// });
// export const insertManpowerSchema = createInsertSchema(manpower).omit({ id: true });

// // Login schema
// export const loginSchema = z.object({
//   username: z.string().min(1, "Username is required"),
//   password: z.string().min(1, "Password is required"),
//   role: z.enum(["admin", "gate_operator"]),
// });

// // Vehicle entry schema
// export const vehicleEntrySchema = z.object({
//   vendorId: z.number(),
//   vehicleNumber: z.string().min(1, "Vehicle number is required"),
//   driverName: z.string().min(1, "Driver name is required"),
//   driverAadhaarNumber: z.string().length(12, "Aadhaar number must be 12 digits").optional(),
//   driverPhotoUrl: z.string().optional(),
//   numberOfLoaders: z.number().min(0).optional(),
//   openingKm: z.number().optional(),
//   loaders: z.array(z.object({
//     name: z.string().min(1, "Name is required"),
//     aadhaarNumber: z.string().length(12, "Aadhaar number must be 12 digits"),
//     phoneNumber: z.string().optional(),
//     photoUrl: z.string().optional(),
//   })).optional(),
// });

// export const insertVehicleLoaderSchema = createInsertSchema(vehicleLoaders).omit({ id: true });
// export const insertVendorSupervisorSchema = createInsertSchema(vendorSupervisors).omit({ id: true });
// export const insertFraudLogSchema = createInsertSchema(fraudLogs).omit({ id: true });
// export const selectVehicleLoaderSchema = createSelectSchema(vehicleLoaders);
// export const selectVendorSupervisorSchema = createSelectSchema(vendorSupervisors);
// export const selectFraudLogSchema = createSelectSchema(fraudLogs);

// // Export types
// export type Store = typeof stores.$inferSelect;
// export type User = typeof users.$inferSelect;
// export type Vendor = typeof vendors.$inferSelect;
// export type Vehicle = typeof vehicles.$inferSelect;
// export type Checkin = typeof checkins.$inferSelect;
// export type Manpower = typeof manpower.$inferSelect;

// export type InsertStore = z.infer<typeof insertStoreSchema>;
// export type InsertUser = z.infer<typeof insertUserSchema>;
// export type InsertVendor = z.infer<typeof insertVendorSchema>;
// export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
// export type InsertCheckin = z.infer<typeof insertCheckinSchema>;
// export type InsertManpower = z.infer<typeof insertManpowerSchema>;

// export type LoginData = z.infer<typeof loginSchema>;
// export type VehicleEntryData = z.infer<typeof vehicleEntrySchema>;

// export type InsertVehicleLoader = z.infer<typeof insertVehicleLoaderSchema>;
// export type InsertVendorSupervisor = z.infer<typeof insertVendorSupervisorSchema>;
// export type InsertFraudLog = z.infer<typeof insertFraudLogSchema>;

// export type VehicleLoader = z.infer<typeof selectVehicleLoaderSchema>;
// export type VendorSupervisor = z.infer<typeof selectVendorSupervisorSchema>;
// export type FraudLog = z.infer<typeof selectFraudLogSchema>;
