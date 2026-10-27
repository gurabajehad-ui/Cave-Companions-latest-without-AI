import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, query as fsQuery, limit as fsLimit, orderBy as fsOrderBy, Firestore } from 'firebase/firestore';

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
export interface RestoredSnapshot {
  buffer: Buffer;
  updatedAt?: string;
}

/**
 * Restores the latest SQLite database snapshot from Firestore.
 * Returns null if no snapshot exists or if an error occurs.
 */
export async function restoreDatabaseSnapshotFromFirestore(): Promise<RestoredSnapshot | null> {
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
    
    // Validate SQLite magic header: "SQLite format 3\0" (16 bytes)
    const sqliteHeader = Buffer.from('SQLite format 3\0');
    if (uncompressedBuffer.length < 16 || !uncompressedBuffer.subarray(0, 16).equals(sqliteHeader)) {
      console.warn('[Firestore Persistence] Restored remote snapshot is not a valid SQLite database ("file is not a database"). Deleting corrupted remote snapshot from Firestore.');
      try {
        await deleteDoc(docRef);
      } catch (dErr) {
        console.warn('[Firestore Persistence] Failed to delete corrupted snapshot doc:', dErr);
      }
      return null;
    }

    console.log(`[Firestore Persistence] Successfully restored database snapshot from Firestore! (${(uncompressedBuffer.length / 1024).toFixed(1)} KB, saved at: ${docData.updatedAt || 'unknown'})`);
    return {
      buffer: uncompressedBuffer,
      updatedAt: docData.updatedAt
    };
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
    const saveTimestamp = new Date().toISOString();

    if (b64.length > CHUNK_SIZE) {
      const chunkCount = Math.ceil(b64.length / CHUNK_SIZE);
      for (let i = 0; i < chunkCount; i++) {
        const chunkStr = b64.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const chunkRef = doc(db, '_pilot_persistence', `db_snapshot_part_${i}`);
        await Promise.race([
          setDoc(chunkRef, {
            data: chunkStr,
            partIndex: i,
            updatedAt: saveTimestamp
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Chunk upload timeout')), 8000))
        ]);
      }

      const metaRef = doc(db, '_pilot_persistence', 'db_snapshot');
      await Promise.race([
        setDoc(metaRef, {
          isChunked: true,
          chunkCount,
          uncompressedSize: buffer.length,
          gzippedSize: gzipped.length,
          updatedAt: saveTimestamp
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Meta upload timeout')), 5000))
      ]);
    } else {
      const docRef = doc(db, '_pilot_persistence', 'db_snapshot');
      await Promise.race([
        setDoc(docRef, {
          isChunked: false,
          data: b64,
          uncompressedSize: buffer.length,
          gzippedSize: gzipped.length,
          updatedAt: saveTimestamp
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Snapshot upload timeout')), 8000))
      ]);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Firestore Persistence] Saved database snapshot to Firestore in ${elapsed}ms (${(gzipped.length / 1024).toFixed(1)} KB gzipped).`);
    return true;
  } catch (err: any) {
    console.warn('[Firestore Persistence] Non-fatal snapshot sync warning (individual documents are safely synced):', err.message);
    return false;
  }
}

/**
 * Immediately flushes pending or provided database binary buffer to Firestore without debounce delay.
 */
export async function flushDatabaseSyncImmediate(getBufferFn?: () => Buffer): Promise<boolean> {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }

  let buf: Buffer | null = null;
  if (getBufferFn) {
    try {
      buf = getBufferFn();
    } catch (e: any) {
      console.error('[Firestore Persistence] Error generating buffer for immediate flush:', e.message);
    }
  } else {
    buf = pendingSaveBuffer;
  }
  pendingSaveBuffer = null;

  if (!buf) return true;

  try {
    isSaving = true;
    const ok = await saveDatabaseSnapshotToFirestore(buf);
    return ok;
  } catch (err: any) {
    console.error('[Firestore Persistence] Immediate flush error:', err.message);
    return false;
  } finally {
    isSaving = false;
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
  }, 2500); // 2.5 second debounce
}

/**
 * Persists an individual prayer attendance record directly to Firestore.
 * This ensures that even if container snapshots are delayed, the attendance
 * record itself is immediately and permanently persisted to cloud storage.
 */
export async function persistPrayerAttendanceToFirestore(attendance: any): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !attendance || !attendance.id) return false;

  try {
    const docRef = doc(db, 'prayer_attendances', String(attendance.id));
    const safeData: Record<string, any> = {
      id: String(attendance.id),
      userId: String(attendance.userId || attendance.user_id || ''),
      mosqueId: String(attendance.mosqueId || attendance.mosque_id || ''),
      mosqueName: String(attendance.mosqueName || attendance.mosque_name || ''),
      prayerType: String(attendance.prayerType || attendance.prayer_type || '').toLowerCase(),
      date: String(attendance.date || ''),
      verifiedAt: attendance.verifiedAt || attendance.verified_at || new Date().toISOString(),
      status: String(attendance.status || 'verified'),
      qrPayload: String(attendance.qrPayload || attendance.qr_payload || ''),
      securityStatus: String(attendance.securityStatus || attendance.security_status || 'verified'),
      riskScore: Number(attendance.riskScore || attendance.risk_score || 0),
      riskReasons: String(attendance.riskReasons || attendance.risk_reason || ''),
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, safeData, { merge: true });
    console.log(`[Firestore Persistence] Successfully persisted prayer attendance record ${attendance.id} for user ${safeData.userId} (${safeData.date}/${safeData.prayerType}) directly to Firestore.`);
    return true;
  } catch (err: any) {
    console.warn(`[Firestore Persistence] Warning persisting prayer attendance ${attendance?.id}:`, err.message);
    return false;
  }
}

/**
 * Syncs recent prayer attendance records from Firestore into the local SQLite database.
 * Run during database initialization to guarantee that records saved in previous containers
 * are never lost.
 */
export async function syncRemotePrayerAttendancesToLocal(sqliteDb: any): Promise<number> {
  const db = getFirestoreDb();
  if (!db || !sqliteDb) return 0;

  try {
    const collRef = collection(db, 'prayer_attendances');
    const q = fsQuery(collRef, fsLimit(500));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return 0;

    let syncedCount = 0;
    for (const d of snapshot.docs) {
      const data = d.data();
      if (!data || !data.id || !data.userId || !data.prayerType || !data.date) continue;

      try {
        const stmt = `
          INSERT OR IGNORE INTO prayer_attendances 
          (id, user_id, mosque_id, mosque_name, prayer_type, date, verified_at, status, qr_payload, security_status, risk_score, risk_reasons)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `;
        sqliteDb.exec(stmt, {
          '$1': String(data.id),
          '$2': String(data.userId),
          '$3': String(data.mosqueId || ''),
          '$4': String(data.mosqueName || 'Mosque'),
          '$5': String(data.prayerType).toLowerCase(),
          '$6': String(data.date),
          '$7': String(data.verifiedAt || new Date().toISOString()),
          '$8': String(data.status || 'verified'),
          '$9': String(data.qrPayload || ''),
          '$10': String(data.securityStatus || 'verified'),
          '$11': Number(data.riskScore || 0),
          '$12': String(data.riskReasons || '')
        });
        syncedCount++;
      } catch (insertErr: any) {
        // Ignore single record sync warning
      }
    }

    if (syncedCount > 0) {
      console.log(`[Firestore Persistence] Synchronized ${syncedCount} remote prayer attendance records from Firestore into local database.`);
    }
    return syncedCount;
  } catch (err: any) {
    console.warn('[Firestore Persistence] Syncing remote prayer attendances warning:', err.message);
    return 0;
  }
}

/**
 * Direct individual Firestore persistence & synchronization for Users, Merchants, Shops, Products, Riders, Circles, and Tokens.
 */
export async function persistUserToFirestore(user: any): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !user || !user.id) return false;
  try {
    const docRef = doc(db, 'users', String(user.id));
    await setDoc(docRef, { ...user, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err: any) {
    console.warn('[Firestore Persistence] User persist warning:', err.message);
    return false;
  }
}

export async function persistMerchantToFirestore(merchant: any): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !merchant || !merchant.id) return false;
  try {
    const docRef = doc(db, 'merchants', String(merchant.id));
    await setDoc(docRef, { ...merchant, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err: any) {
    console.warn('[Firestore Persistence] Merchant persist warning:', err.message);
    return false;
  }
}

export async function persistShopToFirestore(shop: any): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !shop || !shop.id) return false;
  try {
    const docRef = doc(db, 'shops', String(shop.id));
    await setDoc(docRef, { ...shop, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err: any) {
    console.warn('[Firestore Persistence] Shop persist warning:', err.message);
    return false;
  }
}

export async function persistProductToFirestore(product: any): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !product || !product.id) return false;
  try {
    const docRef = doc(db, 'products', String(product.id));
    await setDoc(docRef, { ...product, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err: any) {
    console.warn('[Firestore Persistence] Product persist warning:', err.message);
    return false;
  }
}

export async function persistRiderToFirestore(rider: any): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !rider || !rider.id) return false;
  try {
    const docRef = doc(db, 'riders', String(rider.id));
    await setDoc(docRef, { ...rider, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err: any) {
    console.warn('[Firestore Persistence] Rider persist warning:', err.message);
    return false;
  }
}

export async function persistCircleToFirestore(circle: any): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !circle || !circle.id) return false;
  try {
    const docRef = doc(db, 'circles', String(circle.id));
    await setDoc(docRef, { ...circle, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err: any) {
    console.warn('[Firestore Persistence] Circle persist warning:', err.message);
    return false;
  }
}

export async function persistTokenToFirestore(token: any): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !token || !token.id) return false;
  try {
    const docRef = doc(db, 'tokens', String(token.id));
    await setDoc(docRef, { ...token, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err: any) {
    console.warn('[Firestore Persistence] Token persist warning:', err.message);
    return false;
  }
}

export async function deleteRecordFromFirestore(collectionName: string, id: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !collectionName || !id) return false;
  try {
    const docRef = doc(db, collectionName, String(id));
    await deleteDoc(docRef);
    return true;
  } catch (err: any) {
    console.warn(`[Firestore Persistence] Delete from ${collectionName}/${id} warning:`, err.message);
    return false;
  }
}

export async function persistOrderToFirestore(order: any): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !order || !order.id) return false;
  try {
    const docRef = doc(db, 'orders', String(order.id));
    await setDoc(docRef, { ...order, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err: any) {
    console.warn('[Firestore Persistence] Order persist warning:', err.message);
    return false;
  }
}

export async function syncAllRemoteRecordsToLocal(sqliteDb: any): Promise<void> {
  const db = getFirestoreDb();
  if (!db || !sqliteDb) return;

  try {
    // 1. Sync Users
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      for (const d of usersSnap.docs) {
        const u = d.data();
        if (!u || !u.id) continue;
        try {
          sqliteDb.run(`
            INSERT OR REPLACE INTO users (id, full_name, phone, email, password_hash, gender, age, date_of_birth, marital_status, district, upazila, address, is_verified, photo_url, status, created_at, last_login_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            String(u.id), String(u.fullName || u.full_name || 'User'), String(u.phone || ''), u.email || null, u.passwordHash || u.password_hash || null,
            String(u.gender || 'male'), u.age ? Number(u.age) : null, u.dateOfBirth || u.date_of_birth || null, u.maritalStatus || u.marital_status || null,
            u.district || null, u.upazila || null, u.address || null, u.isVerified !== false ? 1 : 0,
            u.photoUrl || u.photo_url || null, String(u.status || 'active'), String(u.createdAt || u.created_at || new Date().toISOString()),
            String(u.lastLoginAt || u.last_login_at || new Date().toISOString())
          ]);
        } catch {}
      }
    } catch (uErr: any) {
      console.warn('[Firestore Persistence] Sync users error:', uErr.message);
    }

    // 2. Sync Shops
    try {
      const shopsSnap = await getDocs(collection(db, 'shops'));
      for (const d of shopsSnap.docs) {
        const s = d.data();
        if (!s || !s.id) continue;
        try {
          sqliteDb.run(`
            INSERT OR REPLACE INTO shops (id, name, name_bn, owner_id, phone, address, area, district, latitude, longitude, category, description, opening_hours, status, qr_identifier, qr_secret, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            String(s.id), String(s.name || 'Shop'), String(s.nameBn || s.name_bn || s.name || 'দোকান'), String(s.ownerId || s.owner_id || ''),
            String(s.phone || ''), String(s.address || ''), String(s.area || ''), String(s.district || ''),
            Number(s.latitude || 0), Number(s.longitude || 0), String(s.category || 'General'), s.description || null,
            s.openingHours || s.opening_hours || '9 AM - 10 PM', String(s.status || 'ACTIVE'),
            String(s.qrIdentifier || s.qr_identifier || `QR-${s.id}`), String(s.qrSecret || s.qr_secret || `SEC-${s.id}`),
            String(s.createdAt || s.created_at || new Date().toISOString()), String(s.updatedAt || s.updated_at || new Date().toISOString())
          ]);
        } catch {}
      }
    } catch (sErr: any) {
      console.warn('[Firestore Persistence] Sync shops error:', sErr.message);
    }

    // 3. Sync Merchants
    try {
      const merchSnap = await getDocs(collection(db, 'merchants'));
      for (const d of merchSnap.docs) {
        const m = d.data();
        if (!m || !m.id) continue;
        try {
          sqliteDb.run(`
            INSERT OR REPLACE INTO merchants (id, name, phone, pin, shop_id, role, status, token_version, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            String(m.id), String(m.name || 'Merchant'), String(m.phone || ''), String(m.pin || ''), String(m.shopId || m.shop_id || ''),
            String(m.role || 'MERCHANT'), String(m.status || 'active'), Number(m.tokenVersion || m.token_version || 1),
            String(m.createdAt || m.created_at || new Date().toISOString())
          ]);
        } catch {}
      }
    } catch (mErr: any) {
      console.warn('[Firestore Persistence] Sync merchants error:', mErr.message);
    }

    // 4. Sync Products
    try {
      const prodSnap = await getDocs(collection(db, 'products'));
      for (const d of prodSnap.docs) {
        const p = d.data();
        if (!p || !p.id) continue;
        try {
          sqliteDb.run(`
            INSERT OR REPLACE INTO products (id, shop_id, name, description, category, original_price, weight_kg, image_url, gallery, is_available, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            String(p.id), String(p.shopId || p.shop_id || ''), String(p.name || 'Product'), p.description || null,
            p.category || null, Number(p.originalPrice || p.original_price || 0), Number(p.weightKg || p.weight_kg || 1.0),
            p.imageUrl || p.image_url || null, typeof p.gallery === 'string' ? p.gallery : JSON.stringify(p.gallery || []),
            p.isAvailable !== false ? 1 : 0, String(p.status || 'PENDING'),
            String(p.createdAt || p.created_at || new Date().toISOString()), String(p.updatedAt || p.updated_at || new Date().toISOString())
          ]);
        } catch {}
      }
    } catch (pErr: any) {
      console.warn('[Firestore Persistence] Sync products error:', pErr.message);
    }

    // 5. Sync Riders
    try {
      const riderSnap = await getDocs(collection(db, 'riders'));
      for (const d of riderSnap.docs) {
        const r = d.data();
        if (!r || !r.id) continue;
        try {
          sqliteDb.run(`
            INSERT OR REPLACE INTO riders (id, full_name, phone, password_hash, pin_code, nid_number, vehicle_type, photo_url, status, approval_status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            String(r.id), String(r.fullName || r.full_name || 'Rider'), String(r.phone || ''), r.passwordHash || r.password_hash || null,
            r.pinCode || r.pin_code || null, r.nidNumber || r.nid_number || null, String(r.vehicleType || r.vehicle_type || 'BICYCLE'),
            r.photoUrl || r.photo_url || null, String(r.status || 'OFFLINE'), String(r.approvalStatus || r.approval_status || 'PENDING'),
            String(r.createdAt || r.created_at || new Date().toISOString()), String(r.updatedAt || r.updated_at || new Date().toISOString())
          ]);
        } catch {}
      }
    } catch (rErr: any) {
      console.warn('[Firestore Persistence] Sync riders error:', rErr.message);
    }

    // 6. Sync Circles
    try {
      const circleSnap = await getDocs(collection(db, 'circles'));
      for (const d of circleSnap.docs) {
        const c = d.data();
        if (!c || !c.id) continue;
        try {
          sqliteDb.run(`
            INSERT OR REPLACE INTO prayer_circles (id, name, description, admin_id, invite_code, max_members, is_private, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            String(c.id), String(c.name || 'Circle'), c.description || null, String(c.adminId || c.admin_id || ''),
            c.inviteCode || c.invite_code || null, Number(c.maxMembers || c.max_members || 50),
            c.isPrivate || c.is_private ? 1 : 0, String(c.createdAt || c.created_at || new Date().toISOString())
          ]);
        } catch {}
      }
    } catch (cErr: any) {
      console.warn('[Firestore Persistence] Sync circles error:', cErr.message);
    }

    // 7. Sync Tokens
    try {
      const tokenSnap = await getDocs(collection(db, 'tokens'));
      for (const d of tokenSnap.docs) {
        const t = d.data();
        if (!t || !t.id) continue;
        try {
          sqliteDb.run(`
            INSERT OR REPLACE INTO tokens (id, user_id, token_type, status, earned_date, created_at, used_at, source_prayer_count, is_donated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            String(t.id), String(t.userId || t.user_id || ''), String(t.tokenType || t.token_type || 'BRONZE'),
            String(t.status || 'AVAILABLE'), String(t.earnedDate || t.earned_date || new Date().toISOString().split('T')[0]),
            String(t.createdAt || t.created_at || new Date().toISOString()), t.usedAt || t.used_at || null,
            Number(t.sourcePrayerCount || t.source_prayer_count || 5), t.isDonated || t.is_donated ? 1 : 0
          ]);
        } catch {}
      }
    } catch (tErr: any) {
      console.warn('[Firestore Persistence] Sync tokens error:', tErr.message);
    }

    console.log('[Firestore Persistence] Successfully synchronized all remote users, shops, merchants, products, riders, circles, and tokens into local database.');
  } catch (err: any) {
    console.warn('[Firestore Persistence] syncAllRemoteRecordsToLocal warning:', err.message);
  }
}


