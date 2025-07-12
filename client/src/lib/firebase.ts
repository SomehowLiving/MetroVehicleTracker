
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
