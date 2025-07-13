import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase-client";

function generateStoragePath(prefix: string, identifier: string): string {
  return `${prefix}/${identifier}-${Date.now()}`;
}

export const photoManager = {
  async uploadDriverPhoto(file: File, vehicleNumber: string): Promise<string> {
    const path = generateStoragePath("driverPhotos", vehicleNumber);
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  },

  async uploadManpowerPhoto(file: File, checkinId: number, name: string): Promise<string> {
    const safeName = name.replace(/\s+/g, "-").toLowerCase();
    const path = generateStoragePath("manpowerPhotos", `${checkinId}-${safeName}`);
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  },

  // Add methods that match server expectations
  async handleDriverPhotoUpload(file: File, vehicleNumber: string): Promise<string> {
    return this.uploadDriverPhoto(file, vehicleNumber);
  },

  async handleManpowerPhotoUpload(file: File, checkinId: number, name: string): Promise<string> {
    return this.uploadManpowerPhoto(file, checkinId, name);
  }
};


// // firebase-service.ts (frontend version)
// import {
//   ref,
//   uploadBytes,
//   getDownloadURL,
//   deleteObject,
// } from "firebase/storage";
// import { storage } from "./firebase";

// function generatePath(prefix: string, identifier: string) {
//   return `${prefix}/${identifier}-${Date.now()}`;
// }

// export const photoManager = {
//   async handleDriverPhotoUpload(
//     file: File,
//     vehicleNumber: string,
//   ): Promise<string> {
//     const path = generatePath("driverPhotos", vehicleNumber);
//     const fileRef = ref(storage, path);
//     await uploadBytes(fileRef, file);
//     return await getDownloadURL(fileRef);
//   },

//   async handleManpowerPhotoUpload(
//     file: File,
//     checkinId: number,
//     name: string,
//   ): Promise<string> {
//     const safeName = name.replace(/\s+/g, "-").toLowerCase();
//     const path = generatePath("manpowerPhotos", `${checkinId}-${safeName}`);
//     const fileRef = ref(storage, path);
//     await uploadBytes(fileRef, file);
//     return await getDownloadURL(fileRef);
//   },

//   async replacePhoto(
//     oldUrl: string | null,
//     newFile: File,
//     type: "driver" | "manpower",
//     meta: Record<string, string | number>,
//   ): Promise<string> {
//     if (oldUrl) {
//       try {
//         const path = new URL(oldUrl).pathname.split("/o/")[1].split("?")[0]; // decode Firebase path
//         const fileRef = ref(storage, decodeURIComponent(path));
//         await deleteObject(fileRef);
//       } catch (err) {
//         console.warn("Failed to delete old photo:", err);
//       }
//     }

//     if (type === "driver") {
//       return await photoManager.handleDriverPhotoUpload(
//         newFile,
//         String(meta.vehicleNumber),
//       );
//     } else {
//       return await photoManager.handleManpowerPhotoUpload(
//         newFile,
//         Number(meta.checkinId),
//         String(meta.name),
//       );
//     }
//   },

//   firebaseService: {
//     async deletePhoto(photoUrl: string): Promise<void> {
//       const path = new URL(photoUrl).pathname.split("/o/")[1].split("?")[0];
//       const fileRef = ref(storage, decodeURIComponent(path));
//       await deleteObject(fileRef);
//     },
//   },
// };
