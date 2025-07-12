
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBYour-API-Key-Here",
  authDomain: "metrovehicletracker.firebaseapp.com",
  projectId: "metrovehicletracker",
  storageBucket: "metrovehicletracker.firebasestorage.app",
  messagingSenderId: "419507510469",
  appId: "1:419507510469:web:6455debdf840fb644c64ac",
  measurementId: "G-DF7DKWQ2ZC"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Test Firebase connection and authentication
export const testFirebaseConnection = async () => {
  try {
    console.log("🔥 Testing Firebase connection...");
    
    // Test 1: Basic connection
    console.log("✅ Firebase app initialized:", app.name);
    console.log("✅ Firestore instance created");
    console.log("✅ Auth instance created");
    
    // Test 2: Write a test document
    const testDoc = await addDoc(collection(db, "connection-test"), {
      test: true,
      timestamp: new Date(),
      message: "Firebase connection test successful"
    });
    console.log("✅ Test document written with ID:", testDoc.id);
    
    return {
      success: true,
      appName: app.name,
      testDocId: testDoc.id,
      config: {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain
      }
    };
  } catch (error) {
    console.error("❌ Firebase connection test failed:", error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
};

// Sample function to write data to Firestore
export const writeSampleData = async () => {
  try {
    // Add a new document with auto-generated ID
    const docRef = await addDoc(collection(db, "vehicles"), {
      vehicleNumber: "MH01AB1234",
      driverName: "John Doe",
      status: "In",
      timestamp: new Date(),
      storeId: 1
    });
    
    console.log("Document written with ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error adding document: ", error);
    throw error;
  }
};

// Sample function to write data with custom ID
export const writeVehicleEntry = async (vehicleData: any) => {
  try {
    await setDoc(doc(db, "vehicle-entries", `entry-${Date.now()}`), {
      ...vehicleData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log("Vehicle entry saved to Firestore");
  } catch (error) {
    console.error("Error saving vehicle entry: ", error);
    throw error;
  }
};

export default app;
