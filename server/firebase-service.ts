// firebase-service.ts
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { Readable } from 'stream';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

const bucket = admin.storage().bucket();

// Converts a File (from Node) to a stream buffer
function bufferToStream(buffer: Buffer): Readable {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
}

async function uploadFile(file: File | Buffer, destination: string): Promise<string> {
  const fileBuffer = file instanceof Buffer ? file : await file.arrayBuffer();
  const buffer = Buffer.from(fileBuffer);

  const fileName = `${destination}-${uuidv4()}.jpg`;
  const fileRef = bucket.file(fileName);

  const stream = fileRef.createWriteStream({
    metadata: {
      contentType: 'image/jpeg',
    },
    resumable: false,
  });

  return new Promise((resolve, reject) => {
    stream.on('error', reject);
    stream.on('finish', async () => {
      await fileRef.makePublic(); // or use signed URLs instead
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileRef.name}`;
      resolve(publicUrl);
    });

    bufferToStream(buffer).pipe(stream);
  });
}

async function deletePhoto(photoUrl: string): Promise<void> {
  const filePath = decodeURIComponent(photoUrl.split('/').slice(-1)[0]);
  const file = bucket.file(filePath);
  await file.delete();
}

export const photoManager = {
  async handleDriverPhotoUpload(file: File, vehicleNumber: string): Promise<string> {
    return uploadFile(file, `driverPhotos/${vehicleNumber}`);
  },

  async handleManpowerPhotoUpload(file: File, checkinId: number, name: string): Promise<string> {
    const safeName = name.replace(/\s+/g, '-').toLowerCase();
    return uploadFile(file, `manpowerPhotos/${checkinId}-${safeName}`);
  },

  async replacePhoto(
    oldUrl: string | null,
    newFile: File,
    type: 'driver' | 'manpower',
    meta: Record<string, string | number>
  ): Promise<string> {
    if (oldUrl) {
      try {
        await deletePhoto(oldUrl);
      } catch (err) {
        console.warn(`Failed to delete old photo: ${oldUrl}`, err);
      }
    }

    const destination = type === 'driver'
      ? `driverPhotos/${meta.vehicleNumber}`
      : `manpowerPhotos/${meta.checkinId}-${(meta.name as string).replace(/\s+/g, '-').toLowerCase()}`;

    return uploadFile(newFile, destination);
  },

  firebaseService: {
    deletePhoto
  }
};
