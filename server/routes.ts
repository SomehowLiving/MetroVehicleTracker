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
      const { username, password, role } = loginSchema.parse(req.body);

      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password || user.role !== role) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

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
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.json({ message: "Logged out successfully" });
  });

  // Store routes
  app.get("/api/stores", async (req, res) => {
    try {
      const stores = await storage.getAllStores();
      const storeVehicleCounts = await storage.getStoreVehicleCounts();

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
      res.status(500).json({ message: "Error fetching stores" });
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
      const { storeId, operatorId } = req.body; // These should come from auth middleware

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
      }

      // Create checkin record
      const checkin = await storage.createCheckin({
        vehicleId: vehicle.id,
        storeId: storeId,
        operatorId: operatorId,
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
            role: person.role,
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

  app.get("/api/dashboard/active-vehicles", async (req, res) => {
    try {
      const { storeId } = req.query;
      const storeIdNum = storeId ? parseInt(storeId as string) : undefined;

      const activeCheckins = await storage.getActiveCheckins(storeIdNum);

      // Add duration calculation
      const vehiclesWithDuration = activeCheckins.map((checkin) => {
        const durationMs = checkin.createdAt
          ? Date.now() - checkin.createdAt.getTime()
          : 0;
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor(
          (durationMs % (1000 * 60 * 60)) / (1000 * 60),
        );

        return {
          ...checkin,
          duration: `${hours}h ${minutes}m`,
          isExtended: hours >= 4,
        };
      });

      res.json(vehiclesWithDuration);
    } catch (error) {
      res.status(500).json({ message: "Error fetching active vehicles" });
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
  });``

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