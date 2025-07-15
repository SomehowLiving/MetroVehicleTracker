import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketService } from "./services/websocket";
import { schedulerService } from "./services/scheduler";
import { sendEmail } from "./services/email";
import { z } from "zod";
import {
  loginSchema,
  vehicleEntrySchema,
  insertVehicleSchema,
  insertCheckinSchema,
  insertManpowerSchema,
  supervisorCheckinSchema,
  labourCheckinSchema,
} from "@shared/schema";

let wsService: WebSocketService;

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize WebSocket service
  wsService = new WebSocketService(httpServer);

  // Initialize scheduler
  schedulerService.initialize();

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log("🔐 Login attempt:", { body: req.body });

      const { username, password, role } = loginSchema.parse(req.body);
      console.log("✅ Schema validation passed:", { username, role });

      const user = await storage.getUserByUsername(username);
      console.log("🔍 User lookup result:", user ? "Found" : "Not found");

      if (!user) {
        console.log("❌ User not found:", username);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.password !== password) {
        console.log("❌ Password mismatch for user:", username);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.role !== role) {
        console.log(
          "❌ Role mismatch for user:",
          username,
          "Expected:",
          role,
          "Actual:",
          user.role,
        );
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log("✅ Login successful for user:", username);

      // In production, use proper JWT tokens
      const token = Buffer.from(
        JSON.stringify({
          userId: user.id,
          role: user.role,
          storeId: user.storeId,
        }),
      ).toString("base64");

      res.json({
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          storeId: user.storeId,
        },
        token,
      });
    } catch (error) {
      console.error("❌ Login error:", error);
      res.status(400).json({
        message: "Invalid request data",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.json({ message: "Logged out successfully" });
  });

  // Store routes
  app.get("/api/stores", async (req, res) => {
    try {
      console.log("📍 Fetching stores...");
      const stores = await storage.getAllStores();
      console.log(`✅ Found ${stores.length} stores`);

      const storeVehicleCounts = await storage.getStoreVehicleCounts();
      console.log(
        `✅ Got vehicle counts for ${storeVehicleCounts.length} stores`,
      );

      const storesWithCounts = stores.map((store) => {
        const count = storeVehicleCounts.find((c) => c.storeId === store.id);
        return {
          ...store,
          vehiclesIn: count?.vehicleCount || 0,
          vehiclesOut: 0, // This would be calculated based on completed checkins
        };
      });

      res.json(storesWithCounts);
    } catch (error) {
      console.error("❌ Error fetching stores:", error);
      res.status(500).json({
        message: "Error fetching stores",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  });

  app.get("/api/stores/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const store = await storage.getStoreById(id);

      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      res.json(store);
    } catch (error) {
      res.status(500).json({ message: "Error fetching store" });
    }
  });

  // Vendor routes
  app.get("/api/vendors", async (req, res) => {
    try {
      const vendors = await storage.getAllVendors();
      res.json(vendors);
    } catch (error) {
      res.status(500).json({ message: "Error fetching vendors" });
    }
  });

  // Vehicle routes
  app.post("/api/vehicles/entry", async (req, res) => {
    try {
      const entryData = vehicleEntrySchema.parse(req.body);
      const { storeId = 1, operatorId = 1 } = req.body; // Default values for testing

      // Check for duplicate entry
      const existingVehicle = await storage.getVehicleByNumber(
        entryData.vehicleNumber,
      );
      if (existingVehicle) {
        // Check if there's an active checkin for this vehicle
        const activeCheckins = await storage.getActiveCheckins();
        const duplicateCheckin = activeCheckins.find(
          (c) => c.vehicleNumber === entryData.vehicleNumber,
        );

        if (duplicateCheckin) {
          return res
            .status(400)
            .json({ message: "Vehicle is already checked in" });
        }
      }

      // Get vendor and store info for denormalization
      const vendor = await storage.getVendorById(entryData.vendorId);
      const store = await storage.getStoreById(storeId);

      if (!vendor || !store) {
        return res.status(400).json({ message: "Invalid vendor or store" });
      }

      // Create or update vehicle record
      let vehicle = existingVehicle;
      if (!vehicle) {
        vehicle = await storage.createVehicle({
          vehicleNumber: entryData.vehicleNumber,
          vendorId: entryData.vendorId,
          driverName: entryData.driverName,
          driverPhotoUrl: entryData.driverPhotoUrl,
        });
      } else if (entryData.driverPhotoUrl) {
        // Update existing vehicle with new photo URL if provided
        vehicle = await storage.updateVehicle(vehicle.id, {
          driverPhotoUrl: entryData.driverPhotoUrl,
        });
      }

      // Create checkin record
      const checkin = await storage.createCheckin({
        vehicleId: vehicle.id,
        storeId: storeId,
        vendorId: entryData.vendorId,
        operatorId: operatorId,
        purpose: "Delivery", // Default purpose
        openingKm: entryData.openingKm,
        openingKmTimestamp: entryData.openingKm ? new Date() : null,
        closingKm: null,
        closingKmTimestamp: null,
        status: "In",
        vehicleNumber: entryData.vehicleNumber,
        vendorName: vendor.name,
        driverName: entryData.driverName,
        storeName: store.name,
      });

      // Add manpower if provided
      if (entryData.manpower) {
        for (const person of entryData.manpower) {
          await storage.createManpower({
            checkinId: checkin.id,
            name: person.name,
            idNumber: person.role, // Using role as idNumber for now
            photoUrl: person.photoUrl,
          });
        }
      }

      // Notify via WebSocket
      wsService.notifyVehicleEntry({
        ...checkin,
        manpower: entryData.manpower || [],
      });

      res.json(checkin);
    } catch (error) {
      console.error("Vehicle entry error:", error);
      res.status(400).json({ message: "Error creating vehicle entry" });
    }
  });

  app.post("/api/vehicles/exit", async (req, res) => {
    try {
      const { checkinId, closingKm } = req.body;

      const checkin = await storage.getCheckinById(checkinId);
      if (!checkin) {
        return res.status(404).json({ message: "Checkin not found" });
      }

      if (checkin.status !== "In") {
        return res.status(400).json({ message: "Vehicle is not checked in" });
      }

      // Update checkin with exit data
      const updatedCheckin = await storage.updateCheckin(checkinId, {
        closingKm: closingKm,
        closingKmTimestamp: new Date(),
        status: "Out",
      });

      // Notify via WebSocket
      wsService.notifyVehicleExit(updatedCheckin);

      res.json(updatedCheckin);
    } catch (error) {
      console.error("Vehicle exit error:", error);
      res.status(400).json({ message: "Error processing vehicle exit" });
    }
  });

  app.get("/api/vehicles/search", async (req, res) => {
    try {
      const { vehicleNumber } = req.query;

      if (!vehicleNumber) {
        return res.status(400).json({ message: "Vehicle number is required" });
      }

      const checkins = await storage.getCheckinsByVehicle(
        vehicleNumber as string,
      );
      res.json(checkins);
    } catch (error) {
      res.status(500).json({ message: "Error searching vehicle" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/kpis", async (req, res) => {
    try {
      const { storeId } = req.query;
      const storeIdNum = storeId ? parseInt(storeId as string) : undefined;

      const [todaysCheckins, currentlyInside, extendedStays] =
        await Promise.all([
          storage.getTodaysCheckinsCount(storeIdNum),
          storage.getCurrentlyInsideCount(storeIdNum),
          storage.getExtendedStaysCount(storeIdNum),
        ]);

      // Calculate average stay time (simplified)
      const activeCheckins = await storage.getActiveCheckins(storeIdNum);
      const averageStayHours =
        activeCheckins.length > 0
          ? activeCheckins.reduce((sum, checkin) => {
              const hours = checkin.createdAt
                ? (Date.now() - checkin.createdAt.getTime()) / (1000 * 60 * 60)
                : 0;
              return sum + hours;
            }, 0) / activeCheckins.length
          : 0;

      res.json({
        todaysCheckins,
        currentlyInside,
        extendedStays,
        averageStayHours: Math.round(averageStayHours * 10) / 10,
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching KPIs" });
    }
  });

  app.get("/api/dashboard/kpis-yesterday", async (req, res) => {
    try {
      const { storeId } = req.query;
      const storeIdNum = storeId ? parseInt(storeId as string) : undefined;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const todayStart = new Date(yesterday);
      todayStart.setDate(todayStart.getDate() + 1);

      const yesterdayCheckins = await storage.getCheckinsByDateRange(
        yesterday,
        todayStart,
        storeIdNum,
      );

      const averageStayHours = yesterdayCheckins.length > 0
        ? yesterdayCheckins.reduce((sum, checkin) => {
            if (checkin.closingKmTimestamp && checkin.createdAt) {
              const hours = (checkin.closingKmTimestamp.getTime() - checkin.createdAt.getTime()) / (1000 * 60 * 60);
              return sum + hours;
            }
            return sum;
          }, 0) / yesterdayCheckins.filter(c => c.closingKmTimestamp).length
        : 0;

      res.json({
        todaysCheckins: yesterdayCheckins.length,
        averageStayHours: Math.round(averageStayHours * 10) / 10,
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching yesterday KPIs" });
    }
  });

  app.get("/api/dashboard/active-vehicles", async (req, res) => {
    try {
      const { storeId, includeAll } = req.query;
      const storeIdNum = storeId ? parseInt(storeId as string) : undefined;
      const showAll = includeAll === 'true';

      let checkins;
      if (showAll) {
        // Get today's checkins (both active and completed)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        checkins = await storage.getCheckinsByDateRange(today, tomorrow, storeIdNum);
      } else {
        // Get only active checkins
        checkins = await storage.getActiveCheckins(storeIdNum);
      }

      // Add duration calculation
      const vehiclesWithDuration = checkins.map((checkin) => {
        const startTime = checkin.createdAt?.getTime() || Date.now();
        const endTime = checkin.closingKmTimestamp?.getTime() || Date.now();
        const durationMs = endTime - startTime;
        
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

        return {
          ...checkin,
          duration: checkin.status === 'Out' ? `${hours}h ${minutes}m` : `${Math.floor((Date.now() - startTime) / (1000 * 60 * 60))}h ${Math.floor(((Date.now() - startTime) % (1000 * 60 * 60)) / (1000 * 60))}m`,
          isExtended: checkin.status === 'In' && (Date.now() - startTime) / (1000 * 60 * 60) >= 4,
        };
      });

      res.json(vehiclesWithDuration);
    } catch (error) {
      res.status(500).json({ message: "Error fetching vehicles" });
    }
  });

  app.get("/api/dashboard/recent-activity", async (req, res) => {
    try {
      const { storeId, limit = 10 } = req.query;
      const storeIdNum = storeId ? parseInt(storeId as string) : undefined;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const recentCheckins = await storage.getCheckinsByDateRange(
        today,
        tomorrow,
        storeIdNum,
      );
      const limitedCheckins = recentCheckins.slice(
        0,
        parseInt(limit as string),
      );

      res.json(limitedCheckins);
    } catch (error) {
      res.status(500).json({ message: "Error fetching recent activity" });
    }
  });

  app.get("/api/dashboard/store-counts", async (req, res) => {
    try {
      const { storeId } = req.query;
      const storeIdNum = storeId ? parseInt(storeId as string) : undefined;

      // Get store vehicle counts using your existing storage method
      const storeVehicleCounts = await storage.getStoreVehicleCounts();

      // If a specific store is requested, filter for that store
      if (storeIdNum) {
        const filteredCounts = storeVehicleCounts.filter(
          (count) => count.storeId === storeIdNum,
        );
        return res.json(filteredCounts);
      }

      // Return all store counts
      res.json(storeVehicleCounts);
    } catch (error) {
      console.error("Error fetching store counts:", error);
      res.status(500).json({
        message: "Error fetching store counts",
        error: error.message,
      });
    }
  });
  ``;

  // Export routes
  app.post("/api/export/csv", async (req, res) => {
    try {
      const { startDate, endDate, storeId, format = "csv" } = req.body;

      const start = new Date(startDate);
      const end = new Date(endDate);
      const storeIdNum = storeId ? parseInt(storeId) : undefined;

      const checkins = await storage.getCheckinsByDateRange(
        start,
        end,
        storeIdNum,
      );

      if (format === "csv") {
        const csvData = generateCSV(checkins);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="vehicle_report.csv"',
        );
        res.send(csvData);
      } else {
        res.json(checkins);
      }
    } catch (error) {
      res.status(500).json({ message: "Error generating export" });
    }
  });

  app.post("/api/export/email", async (req, res) => {
    try {
      const { startDate, endDate, storeId, email, format = "csv" } = req.body;

      const start = new Date(startDate);
      const end = new Date(endDate);
      const storeIdNum = storeId ? parseInt(storeId) : undefined;

      const checkins = await storage.getCheckinsByDateRange(
        start,
        end,
        storeIdNum,
      );
      const csvData = generateCSV(checkins);

      const success = await sendEmail({
        to: email,
        from: process.env.FROM_EMAIL || "noreply@metro.com",
        subject: `Metro Vehicle Report - ${start.toDateString()} to ${end.toDateString()}`,
        html: `
          <p>Please find attached your requested vehicle report.</p>
          <p>Report Period: ${start.toDateString()} to ${end.toDateString()}</p>
          <p>Total Records: ${checkins.length}</p>
        `,
        attachments: [
          {
            content: Buffer.from(csvData).toString("base64"),
            filename: "vehicle_report.csv",
            type: "text/csv",
            disposition: "attachment",
          },
        ],
      });

      if (success) {
        res.json({ message: "Report sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send report" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error sending export email" });
    }
  });

  // Fraud Detection Routes
  app.get("/api/fraud/stats", async (req, res) => {
    try {
      const { storeId } = req.query;
      const storeIdNum = storeId ? parseInt(storeId as string) : undefined;

      const fraudStats = await storage.getFraudStats(storeIdNum);
      res.json(fraudStats);
    } catch (error) {
      console.error("Error fetching fraud stats:", error);
      res.status(500).json({ message: "Error fetching fraud statistics" });
    }
  });

  app.get("/api/fraud/alerts", async (req, res) => {
    try {
      const { hours = 24 } = req.query;
      const alerts = await storage.getRecentFraudAlerts(
        parseInt(hours as string),
      );
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching fraud alerts:", error);
      res.status(500).json({ message: "Error fetching fraud alerts" });
    }
  });

  app.get("/api/fraud/checkins", async (req, res) => {
    try {
      const { storeId, limit = 50 } = req.query;
      const storeIdNum = storeId ? parseInt(storeId as string) : undefined;

      const fraudulentCheckins = await storage.getFraudulentCheckinsWithDetails(
        storeIdNum,
        parseInt(limit as string),
      );
      res.json(fraudulentCheckins);
    } catch (error) {
      console.error("Error fetching fraudulent checkins:", error);
      res.status(500).json({ message: "Error fetching fraudulent checkins" });
    }
  });

  app.post("/api/fraud/alerts/:id/resolve", async (req, res) => {
    try {
      const alertId = parseInt(req.params.id);
      const { resolvedBy = 1 } = req.body; // Default admin user

      await storage.resolveFraudAlert(alertId, resolvedBy);
      res.json({ message: "Alert resolved successfully" });
    } catch (error) {
      console.error("Error resolving fraud alert:", error);
      res.status(500).json({ message: "Error resolving fraud alert" });
    }
  });

  // Vehicle Loaders Routes
  app.get("/api/vehicles/:vehicleId/loaders", async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.vehicleId);
      const loaders = await storage.getVehicleLoaders(vehicleId);
      res.json(loaders);
    } catch (error) {
      console.error("Error fetching vehicle loaders:", error);
      res.status(500).json({ message: "Error fetching vehicle loaders" });
    }
  });

  app.post("/api/vehicles/:vehicleId/loaders", async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.vehicleId);
      const loaderData = req.body;

      const loader = await storage.createVehicleLoader({
        vehicleId,
        ...loaderData,
      });
      res.json(loader);
    } catch (error) {
      console.error("Error creating vehicle loader:", error);
      res.status(500).json({ message: "Error creating vehicle loader" });
    }
  });

  // Vendor Supervisors Routes
  app.get(
    "/api/vendors/:vendorId/stores/:storeId/supervisors",
    async (req, res) => {
      try {
        const vendorId = parseInt(req.params.vendorId);
        const storeId = parseInt(req.params.storeId);

        const supervisors = await storage.getVendorSupervisors(
          vendorId,
          storeId,
        );
        res.json(supervisors);
      } catch (error) {
        console.error("Error fetching vendor supervisors:", error);
        res.status(500).json({ message: "Error fetching vendor supervisors" });
      }
    },
  );

  app.post(
    "/api/vendors/:vendorId/stores/:storeId/supervisors",
    async (req, res) => {
      try {
        const vendorId = parseInt(req.params.vendorId);
        const storeId = parseInt(req.params.storeId);
        const supervisorData = req.body;

        const supervisor = await storage.createVendorSupervisor({
          vendorId,
          storeId,
          ...supervisorData,
        });
        res.json(supervisor);
      } catch (error) {
        console.error("Error creating vendor supervisor:", error);
        res.status(500).json({ message: "Error creating vendor supervisor" });
      }
    },
  );

  //---------------------additional-----------------------------
  // Supervisor routes
  app.post("/api/supervisors", async (req, res) => {
    try {
      const supervisorData = supervisorEntrySchema.parse(req.body);

      // Check for duplicate Aadhaar number
      const existingSupervisor = await storage.getVendorSupervisorByAadhaar(
        supervisorData.aadhaarNumber,
      );

      if (existingSupervisor) {
        return res.status(400).json({
          message: "Supervisor with this Aadhaar number already exists",
        });
      }

      // Validate vendor and store exist
      const vendor = await storage.getVendorById(supervisorData.vendorId);
      const store = await storage.getStoreById(supervisorData.storeId);

      if (!vendor) {
        return res.status(400).json({ message: "Invalid vendor" });
      }
      if (!store) {
        return res.status(400).json({ message: "Invalid store" });
      }

      // Create supervisor record
      const supervisor = await storage.createVendorSupervisor({
        vendorId: supervisorData.vendorId,
        storeId: supervisorData.storeId,
        name: supervisorData.name,
        aadhaarNumber: supervisorData.aadhaarNumber,
        phoneNumber: supervisorData.phoneNumber || null,
        photoUrl: supervisorData.photoUrl || null,
      });

      // Notify via WebSocket if needed
      wsService.notifySupervisorAdded?.(supervisor);

      res.json(supervisor);
    } catch (error) {
      console.error("Supervisor creation error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({
          message: "Invalid input data",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Error creating supervisor" });
    }
  });

  app.get("/api/supervisors", async (req, res) => {
    try {
      const { vendorId, storeId } = req.query;

      // If no filters provided, return empty array or all supervisors
      if (!vendorId && !storeId) {
        return res.json([]);
      }

      let supervisors;

      if (vendorId && storeId) {
        // Get supervisors for specific vendor and store
        supervisors = await storage.getVendorSupervisors(
          parseInt(vendorId as string),
          parseInt(storeId as string),
        );
      } else {
        // You might want to implement these methods in storage.ts
        // For now, return empty array
        supervisors = [];
      }

      res.json(supervisors);
    } catch (error) {
      console.error("Error fetching supervisors:", error);
      res.status(500).json({ message: "Error fetching supervisors" });
    }
  });

  app.get("/api/supervisors/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // You'll need to implement this method in storage.ts
      const supervisor = await storage.getVendorSupervisorById(parseInt(id));

      if (!supervisor) {
        return res.status(404).json({ message: "Supervisor not found" });
      }

      res.json(supervisor);
    } catch (error) {
      console.error("Error fetching supervisor:", error);
      res.status(500).json({ message: "Error fetching supervisor" });
    }
  });

  app.put("/api/supervisors/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if supervisor exists
      const existingSupervisor = await storage.getVendorSupervisorById(
        parseInt(id),
      );
      if (!existingSupervisor) {
        return res.status(404).json({ message: "Supervisor not found" });
      }

      // If updating Aadhaar, check for duplicates
      if (
        updateData.aadhaarNumber &&
        updateData.aadhaarNumber !== existingSupervisor.aadhaarNumber
      ) {
        const duplicateAadhaar = await storage.getVendorSupervisorByAadhaar(
          updateData.aadhaarNumber,
        );
        if (duplicateAadhaar) {
          return res.status(400).json({
            message: "Supervisor with this Aadhaar number already exists",
          });
        }
      }

      // Update supervisor
      const updatedSupervisor = await storage.updateVendorSupervisor(
        parseInt(id),
        updateData,
      );

      res.json(updatedSupervisor);
    } catch (error) {
      console.error("Error updating supervisor:", error);
      res.status(500).json({ message: "Error updating supervisor" });
    }
  });

  app.delete("/api/supervisors/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Soft delete by setting isActive to false
      const updatedSupervisor = await storage.updateVendorSupervisor(
        parseInt(id),
        {
          isActive: false,
        },
      );

      res.json({ message: "Supervisor deleted successfully" });
    } catch (error) {
      console.error("Error deleting supervisor:", error);
      res.status(500).json({ message: "Error deleting supervisor" });
    }
  });

  // Search supervisors by name or Aadhaar
  app.get("/api/supervisors/search", async (req, res) => {
    try {
      const { query, vendorId, storeId } = req.query;

      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      // You'll need to implement this method in storage.ts
      const supervisors = await storage.searchVendorSupervisors(
        query as string,
        vendorId ? parseInt(vendorId as string) : undefined,
        storeId ? parseInt(storeId as string) : undefined,
      );

      res.json(supervisors);
    } catch (error) {
      console.error("Error searching supervisors:", error);
      res.status(500).json({ message: "Error searching supervisors" });
    }
  });

  // FSD Checkin routes
  app.post("/api/fsd/checkin", async (req, res) => {
    try {
      const checkinData = req.body;
      
      // Check if FSD is already checked in
      const activeFsdCheckins = await storage.getActiveFsdCheckins();
      const existingCheckin = activeFsdCheckins.find(
        (c) => c.fsdId === checkinData.fsdId && c.storeId === checkinData.storeId
      );

      if (existingCheckin) {
        return res.status(400).json({ message: "FSD is already checked in" });
      }

      const checkin = await storage.createFsdCheckin({
        ...checkinData,
        status: "In",
        checkinTime: new Date(),
        createdBy: checkinData.fsdId || 1, // Use fsdId as created_by or default to 1
      });

      res.json(checkin);
    } catch (error) {
      console.error("FSD checkin error:", error);
      res.status(500).json({ message: "Error creating FSD checkin" });
    }
  });

  app.post("/api/fsd/checkout", async (req, res) => {
    try {
      const { checkinId } = req.body;

      const checkin = await storage.getFsdCheckinById(checkinId);
      if (!checkin) {
        return res.status(404).json({ message: "FSD checkin not found" });
      }

      if (checkin.status !== "In") {
        return res.status(400).json({ message: "FSD is not checked in" });
      }

      const updatedCheckin = await storage.updateFsdCheckin(checkinId, {
        status: "Out",
        checkoutTime: new Date(),
      });

      res.json(updatedCheckin);
    } catch (error) {
      console.error("FSD checkout error:", error);
      res.status(500).json({ message: "Error processing FSD checkout" });
    }
  });

  app.get("/api/fsd/checkins", async (req, res) => {
    try {
      const { storeId } = req.query;
      
      if (storeId) {
        const checkins = await storage.getFsdCheckinsByStore(parseInt(storeId as string));
        res.json(checkins);
      } else {
        const activeCheckins = await storage.getActiveFsdCheckins();
        res.json(activeCheckins);
      }
    } catch (error) {
      console.error("Error fetching FSD checkins:", error);
      res.status(500).json({ message: "Error fetching FSD checkins" });
    }
  });

  // Supervisor check-in/check-out routes
  app.post("/api/supervisor/checkin", async (req, res) => {
    try {
      const checkinData = supervisorCheckinSchema.parse(req.body);
      
      // Check if supervisor is already checked in
      const activeSupervisorCheckins = await storage.getActiveSupervisorCheckins();
      const existingCheckin = activeSupervisorCheckins.find(
        (c) => c.supervisorId === checkinData.supervisorId && c.storeId === checkinData.storeId
      );

      if (existingCheckin) {
        return res.status(400).json({ message: "Supervisor is already checked in" });
      }

      const checkin = await storage.createSupervisorCheckin({
        ...checkinData,
        status: "In",
        checkinTime: new Date(),
      });

      // Broadcast real-time update
      wsService.broadcastToAll({
        type: 'supervisor_checkin',
        data: checkin
      });

      res.json(checkin);
    } catch (error) {
      console.error("Supervisor checkin error:", error);
      res.status(500).json({ message: "Error creating supervisor checkin" });
    }
  });

  app.post("/api/supervisor/checkout", async (req, res) => {
    try {
      const { checkinId } = req.body;

      const checkin = await storage.getSupervisorCheckinById(checkinId);
      if (!checkin) {
        return res.status(404).json({ message: "Supervisor checkin not found" });
      }

      if (checkin.status !== "In") {
        return res.status(400).json({ message: "Supervisor is not checked in" });
      }

      const updatedCheckin = await storage.updateSupervisorCheckin(checkinId, {
        status: "Out",
        checkoutTime: new Date(),
      });

      // Broadcast real-time update
      wsService.broadcastToAll({
        type: 'supervisor_checkout',
        data: updatedCheckin
      });

      res.json(updatedCheckin);
    } catch (error) {
      console.error("Supervisor checkout error:", error);
      res.status(500).json({ message: "Error processing supervisor checkout" });
    }
  });

  app.get("/api/supervisor/checkins", async (req, res) => {
    try {
      const { storeId } = req.query;
      
      if (storeId) {
        const checkins = await storage.getSupervisorCheckinsByStore(parseInt(storeId as string));
        res.json(checkins);
      } else {
        const activeCheckins = await storage.getActiveSupervisorCheckins();
        res.json(activeCheckins);
      }
    } catch (error) {
      console.error("Error fetching supervisor checkins:", error);
      res.status(500).json({ message: "Error fetching supervisor checkins" });
    }
  });

  // Labour check-in/check-out routes
  app.post("/api/labour/checkin", async (req, res) => {
    try {
      const checkinData = labourCheckinSchema.parse(req.body);
      
      // Check if labour is already checked in
      const activeLabourCheckins = await storage.getActiveLabourCheckins();
      const existingCheckin = activeLabourCheckins.find(
        (c) => c.loaderId === checkinData.loaderId && c.storeId === checkinData.storeId
      );

      if (existingCheckin) {
        return res.status(400).json({ message: "Labour is already checked in" });
      }

      const checkin = await storage.createLabourCheckin({
        ...checkinData,
        status: "In",
        checkinTime: new Date(),
      });

      // Broadcast real-time update
      wsService.broadcastToAll({
        type: 'labour_checkin',
        data: checkin
      });

      res.json(checkin);
    } catch (error) {
      console.error("Labour checkin error:", error);
      res.status(500).json({ message: "Error creating labour checkin" });
    }
  });

  app.post("/api/labour/checkout", async (req, res) => {
    try {
      const { checkinId } = req.body;

      const checkin = await storage.getLabourCheckinById(checkinId);
      if (!checkin) {
        return res.status(404).json({ message: "Labour checkin not found" });
      }

      if (checkin.status !== "In") {
        return res.status(400).json({ message: "Labour is not checked in" });
      }

      const updatedCheckin = await storage.updateLabourCheckin(checkinId, {
        status: "Out",
        checkoutTime: new Date(),
      });

      // Broadcast real-time update
      wsService.broadcastToAll({
        type: 'labour_checkout',
        data: updatedCheckin
      });

      res.json(updatedCheckin);
    } catch (error) {
      console.error("Labour checkout error:", error);
      res.status(500).json({ message: "Error processing labour checkout" });
    }
  });

  app.get("/api/labour/checkins", async (req, res) => {
    try {
      const { storeId } = req.query;
      
      if (storeId) {
        const checkins = await storage.getLabourCheckinsByStore(parseInt(storeId as string));
        res.json(checkins);
      } else {
        const activeCheckins = await storage.getActiveLabourCheckins();
        res.json(activeCheckins);
      }
    } catch (error) {
      console.error("Error fetching labour checkins:", error);
      res.status(500).json({ message: "Error fetching labour checkins" });
    }
  });

  return httpServer;
}
function generateCSV(data: any[]): string {
  if (data.length === 0) return "";

  const headers = [
    "Vehicle Number",
    "Driver Name",
    "Vendor Name",
    "Store Name",
    "Entry Time",
    "Exit Time",
    "Status",
    "Opening KM",
    "Closing KM",
    "Duration (Hours)",
  ];

  const rows = data.map((checkin) => {
    const entryTime = checkin.createdAt.toLocaleString();
    const exitTime = checkin.closingKmTimestamp
      ? checkin.closingKmTimestamp.toLocaleString()
      : "Not yet";
    const duration = checkin.closingKmTimestamp
      ? Math.round(
          ((checkin.closingKmTimestamp.getTime() -
            checkin.createdAt.getTime()) /
            (1000 * 60 * 60)) *
            10,
        ) / 10
      : "Ongoing";

    return [
      checkin.vehicleNumber,
      checkin.driverName,
      checkin.vendorName,
      checkin.storeName,
      entryTime,
      exitTime,
      checkin.status,
      checkin.openingKm || 0,
      checkin.closingKm || 0,
      duration,
    ]
      .map((val) => `"${val}"`)
      .join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

// import { photoManager } from "./firebase-service";

// async function submitVehicleForm(vehicleData: {
//   vehicleNumber: string;
//   driverName: string;
//   vendorId: number;
//   driverPhoto: File;
// }) {
//   // Step 1: Upload photo to Firebase Storage
//   const photoUrl = await photoManager.uploadDriverPhoto(vehicleData.driverPhoto, vehicleData.vehicleNumber);

//   // Step 2: Send form data + photoUrl to backend
//   const response = await fetch("/api/vehicles", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json"
//     },
//     body: JSON.stringify({
//       vehicleNumber: vehicleData.vehicleNumber,
//       driverName: vehicleData.driverName,
//       vendorId: vehicleData.vendorId,
//       driverPhotoUrl: photoUrl // 🔥 send the photo URL, not the file
//     })
//   });

//   const result = await response.json();
//   return result;
// }
