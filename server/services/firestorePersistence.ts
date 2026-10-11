import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, Firestore } from 'firebase/firestore';

let firestoreInstance: Firestore | null = null;
let isInitialized = false;
let saveDebounceTimer: NodeJS.Timeout | null = null;
let isSaving = false;
let pendingSaveBuffer: Buffer | null = null;

function getFirestoreDb(): Firestore | null {
  if (firestoreInstance) return firestoreInstance;
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.warn('[Firestore Persistence] firebase-applet-config.json not found.');
      return null;
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!config.apiKey || !config.projectId) {
      console.warn('[Firestore Persistence] Missing Firebase config credentials.');
      return null;
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(config);
    const databaseId = config.firestoreDatabaseId || undefined;
    firestoreInstance = getFirestore(app, databaseId);
    isInitialized = true;
    console.log(`[Firestore Persistence] Successfully connected to Firestore (DB: ${databaseId || 'default'}).`);
    return firestoreInstance;
  } catch (err: any) {
    console.error('[Firestore Persistence] Failed to initialize Firestore SDK:', err.message);
    return null;
  }
}

/**
 * Restores the latest SQLite database snapshot from Firestore.
 * Returns null if no snapshot exists or if an error occurs.
 */
export async function restoreDatabaseSnapshotFromFirestore(): Promise<Buffer | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    console.log('[Firestore Persistence] Checking for persistent database snapshot in Firestore...');
    const docRef = doc(db, '_pilot_persistence', 'db_snapshot');
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      console.log('[Firestore Persistence] No remote database snapshot found. Starting fresh or with local state.');
      return null;
    }

    const docData = snap.data();
    if (!docData || !docData.data) {
      console.warn('[Firestore Persistence] Snapshot document is empty or invalid.');
      return null;
    }

    let gzippedBuffer: Buffer;
    if (docData.isChunked && docData.chunkCount > 1) {
      console.log(`[Firestore Persistence] Reassembling chunked snapshot (${docData.chunkCount} parts)...`);
      const chunks: Buffer[] = [];
      for (let i = 0; i < docData.chunkCount; i++) {
        const chunkRef = doc(db, '_pilot_persistence', `db_snapshot_part_${i}`);
        const chunkSnap = await getDoc(chunkRef);
        if (!chunkSnap.exists()) {
          throw new Error(`Missing snapshot chunk ${i}`);
        }
        chunks.push(Buffer.from(chunkSnap.data().data, 'base64'));
      }
      gzippedBuffer = Buffer.concat(chunks);
    } else {
      gzippedBuffer = Buffer.from(docData.data, 'base64');
    }

    const uncompressedBuffer = zlib.gunzipSync(gzippedBuffer);
    console.log(`[Firestore Persistence] Successfully restored database snapshot from Firestore! (${(uncompressedBuffer.length / 1024).toFixed(1)} KB, saved at: ${docData.updatedAt || 'unknown'})`);
    return uncompressedBuffer;
  } catch (err: any) {
    console.error('[Firestore Persistence] Error restoring snapshot from Firestore:', err.message);
    return null;
  }
}

/**
 * Persists a SQLite database binary buffer to Firestore with gzip compression and chunking support.
 */
export async function saveDatabaseSnapshotToFirestore(buffer: Buffer): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    const startTime = Date.now();
    const gzipped = zlib.gzipSync(buffer);
    const b64 = gzipped.toString('base64');
    const CHUNK_SIZE = 700000; // Safe size for Firestore 1MB limit

    if (b64.length > CHUNK_SIZE) {
      const chunkCount = Math.ceil(b64.length / CHUNK_SIZE);
      for (let i = 0; i < chunkCount; i++) {
        const chunkStr = b64.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const chunkRef = doc(db, '_pilot_persistence', `db_snapshot_part_${i}`);
        await setDoc(chunkRef, {
          data: chunkStr,
          partIndex: i,
          updatedAt: new Date().toISOString()
        });
      }

      const metaRef = doc(db, '_pilot_persistence', 'db_snapshot');
      await setDoc(metaRef, {
        isChunked: true,
        chunkCount,
        uncompressedSize: buffer.length,
        gzippedSize: gzipped.length,
        updatedAt: new Date().toISOString()
      });
    } else {
      const docRef = doc(db, '_pilot_persistence', 'db_snapshot');
      await setDoc(docRef, {
        isChunked: false,
        data: b64,
        uncompressedSize: buffer.length,
        gzippedSize: gzipped.length,
        updatedAt: new Date().toISOString()
      });
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Firestore Persistence] Saved database snapshot to Firestore in ${elapsed}ms (${(gzipped.length / 1024).toFixed(1)} KB gzipped).`);
    return true;
  } catch (err: any) {
    console.error('[Firestore Persistence] Failed to save snapshot to Firestore:', err.message);
    return false;
  }
}

/**
 * Debounced trigger to persist database state to Firestore after SQLite changes.
 */
export function queueDatabaseSync(getBufferFn: () => Buffer) {
  try {
    pendingSaveBuffer = getBufferFn();
  } catch (err: any) {
    console.error('[Firestore Persistence] Error getting buffer for sync:', err.message);
    return;
  }

  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }

  saveDebounceTimer = setTimeout(async () => {
    if (isSaving || !pendingSaveBuffer) return;
    isSaving = true;
    const buf = pendingSaveBuffer;
    pendingSaveBuffer = null;

    try {
      await saveDatabaseSnapshotToFirestore(buf);
    } catch (err: any) {
      console.error('[Firestore Persistence] Sync task error:', err.message);
    } finally {
      isSaving = false;
      // If new changes arrived while saving, queue another save
      if (pendingSaveBuffer) {
        queueDatabaseSync(() => pendingSaveBuffer!);
      }
    }
  }, 3000); // 3 second debounce
}
