import { api } from './api';
import { PrayerType } from '../types';
import { getCanonicalPrayerDateClient } from './prayerTimeService';

export type SyncItemStatus = 'pending' | 'syncing' | 'synced' | 'rejected' | 'failed_retryable' | 'quarantined';

export interface PendingCheckIn {
  id: string;
  prayerType: PrayerType;
  mosqueId?: string;
  qrData?: string;
  lat?: number;
  lng?: number;
  savedAt: string;
  scannedAt?: string; // backwards compatibility alias for local storage
  syncStatus?: SyncItemStatus;
  lastSyncError?: string;
  syncAttempts?: number;
  lastSyncAttemptAt?: string;
}

const STORAGE_KEY = 'cave_companions_offline_queue';
const CACHED_MOSQUES_KEY = 'cave_companions_cached_mosques';

// Helper to notify other parts of the app when offline queue changes
export function notifyOfflineQueueUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cave_offline_queue_updated'));
  }
}

class OfflineSyncService {
  private isSyncing = false;
  private onSyncCompleteCallback: (() => void) | null = null;
  private onShowToastCallback: ((type: 'success' | 'error' | 'info' | 'warning', title: string, msg: string) => void) | null = null;
  private autoSyncInterval: any = null;

  public init(
    onSyncComplete: () => void,
    onShowToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, msg: string) => void
  ) {
    this.onSyncCompleteCallback = onSyncComplete;
    this.onShowToastCallback = onShowToast;

    if (typeof window !== 'undefined') {
      // 1. Listen for online status to trigger immediate automatic sync
      window.addEventListener('online', () => {
        console.log('[OfflineSync] Device is online. Initiating automatic queue sync...');
        this.syncPendingCheckIns();
      });

      // 2. Also listen for window focus/resume (when user unlocks phone or opens tab)
      window.addEventListener('focus', () => {
        if (navigator.onLine && this.getPendingCheckIns().length > 0) {
          this.syncPendingCheckIns();
        }
      });

      // 3. Periodic Auto-Sync Timer (checks every 20 seconds for pending items if online)
      if (this.autoSyncInterval) {
        clearInterval(this.autoSyncInterval);
      }
      this.autoSyncInterval = setInterval(() => {
        if (typeof navigator !== 'undefined' && navigator.onLine && !this.isSyncing) {
          const queue = this.getPendingCheckIns();
          if (queue.length > 0) {
            console.log('[OfflineSync] Periodic background worker triggered sync for', queue.length, 'items');
            this.syncPendingCheckIns();
          }
        }
      }, 20000);

      // 4. Try syncing on initialization if already online
      if (navigator.onLine) {
        setTimeout(() => {
          this.syncPendingCheckIns();
        }, 1500);
      }
    }
  }

  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Save fetched mosques to local storage for offline lookup
   */
  public cacheMosques(mosques: any[]) {
    try {
      localStorage.setItem(CACHED_MOSQUES_KEY, JSON.stringify(mosques));
    } catch (e) {
      console.error('[OfflineSync] Failed to cache mosques:', e);
    }
  }

  /**
   * Get cached mosques
   */
  public getCachedMosques(): any[] {
    try {
      const data = localStorage.getItem(CACHED_MOSQUES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Retrieve all pending offline check-ins
   */
  public getPendingCheckIns(): PendingCheckIn[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Check if a specific prayer is pending in the offline queue for today's canonical cycle
   */
  public isPrayerPendingInOfflineQueue(prayerType: PrayerType, dateStr?: string): PendingCheckIn | undefined {
    const queue = this.getPendingCheckIns();
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    
    return queue.find(item => {
      const itemTimestamp = item.savedAt || item.scannedAt;
      const itemCanonicalDate = getCanonicalPrayerDateClient(item.prayerType, itemTimestamp, item.lat, item.lng);
      return item.prayerType === prayerType && itemCanonicalDate === targetDate;
    });
  }

  /**
   * Add a check-in to the offline queue
   */
  public addPendingCheckIn(prayerType: PrayerType, mosqueIdOrQrData?: string, lat?: number, lng?: number): PendingCheckIn {
    const queue = this.getPendingCheckIns();
    const savedAtIso = new Date().toISOString();
    
    // Check if there is already a pending check-in for the SAME prayerType in the SAME canonical prayer cycle
    const canonicalDateStr = getCanonicalPrayerDateClient(prayerType, savedAtIso, lat, lng);
    const existingIndex = queue.findIndex(item => {
      const itemTimestamp = item.savedAt || item.scannedAt;
      const itemCanonicalDate = getCanonicalPrayerDateClient(item.prayerType, itemTimestamp, item.lat, item.lng);
      return item.prayerType === prayerType && itemCanonicalDate === canonicalDateStr;
    });

    if (existingIndex !== -1) {
      console.log(`[OfflineSync] Pending check-in for ${prayerType} in canonical prayer cycle (${canonicalDateStr}) already exists in queue. Skipping duplicate.`);
      return queue[existingIndex];
    }

    const newCheckIn: PendingCheckIn = {
      id: 'offline-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      prayerType,
      mosqueId: mosqueIdOrQrData,
      qrData: mosqueIdOrQrData,
      lat,
      lng,
      savedAt: savedAtIso,
      scannedAt: savedAtIso,
      syncStatus: 'pending',
      syncAttempts: 0
    };

    queue.push(newCheckIn);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    notifyOfflineQueueUpdated();
    console.log('[OfflineSync] Added check-in to offline queue:', newCheckIn);
    return newCheckIn;
  }

  /**
   * Synchronize all pending check-ins with the server
   */
  public async syncPendingCheckIns(force = false): Promise<void> {
    if (this.isSyncing && !force) {
      console.log('[OfflineSync] Sync is already running. Skipping concurrent trigger.');
      return;
    }

    const rawQueue = this.getPendingCheckIns();
    if (rawQueue.length === 0) {
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('[OfflineSync] Device is currently offline. Sync postponed until connection is restored.');
      return;
    }

    this.isSyncing = true;
    notifyOfflineQueueUpdated();

    console.log(`[OfflineSync:START] ==========================================`);
    console.log(`[OfflineSync:START] Starting sync for ${rawQueue.length} offline check-ins at ${new Date().toISOString()}`);
    console.log(`[OfflineSync:START] ==========================================`);

    // Sort queue by savedAt timestamp ascending (chronological order)
    const queueSnapshot = [...rawQueue].sort((a, b) => {
      const timeA = new Date(a.savedAt || a.scannedAt || 0).getTime();
      const timeB = new Date(b.savedAt || b.scannedAt || 0).getTime();
      return timeA - timeB;
    });

    if (this.onShowToastCallback && force) {
      this.onShowToastCallback(
        'info',
        'সিঙ্ক্রোনাইজেশন শুরু',
        `অফলাইনে সংরক্ষিত ${queueSnapshot.length}টি উপস্থিতি সার্ভারের সাথে সিঙ্ক হচ্ছে...`
      );
    }

    const remainingQueue: PendingCheckIn[] = [];
    let syncedCount = 0;
    let duplicateCount = 0;
    let quarantinedCount = 0;
    let invalidQrCount = 0;
    let invalidLocationCount = 0;
    let expiredPrayerCount = 0;
    let otherRejectedCount = 0;
    let retryableCount = 0;
    const rejectionMessages: string[] = [];

    try {
      // Process every item independently — failure of one must NEVER stop others!
      for (let i = 0; i < queueSnapshot.length; i++) {
        const item = queueSnapshot[i];
        const itemTime = item.savedAt || item.scannedAt;
        console.log(`[OfflineSync:ITEM ${i + 1}/${queueSnapshot.length}] Processing item ${item.id} (${item.prayerType}) saved at ${itemTime}...`);

        try {
          // Wrap API request in a strict 12-second timeout per item to prevent indefinite hanging
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              const timeoutErr: any = new Error('সার্ভার রেসপন্স টাইমআউট (১২ সেকেন্ড)');
              timeoutErr.isTimeout = true;
              reject(timeoutErr);
            }, 12000);
          });

          const syncRequestPromise = api.syncOfflineCheckIn(
            item.prayerType,
            item.mosqueId || item.qrData,
            item.lat,
            item.lng,
            itemTime
          );

          console.log(`[OfflineSync:ITEM ${i + 1}] Request payload dispatched: prayerType=${item.prayerType}, savedAt=${itemTime}, lat=${item.lat}, lng=${item.lng}`);

          const result: any = await Promise.race([syncRequestPromise, timeoutPromise]);

          console.log(`[OfflineSync:ITEM ${i + 1}] Server response received:`, result);

          if (result && result.success) {
            if (result.securityStatus === 'quarantined') {
              quarantinedCount++;
              console.log(`[OfflineSync:ITEM ${i + 1}] Result -> QUARANTINED (Terminal: removed from retry queue)`);
            } else {
              syncedCount++;
              console.log(`[OfflineSync:ITEM ${i + 1}] Result -> SYNCED_SUCCESS (Terminal: removed from retry queue)`);
            }
          } else {
            // Unsuccessful response without throwing
            const errorCode = result?.error || '';
            const errorMsg = result?.message || '';
            console.warn(`[OfflineSync:ITEM ${i + 1}] Non-success server payload:`, result);

            if (errorCode === 'ALREADY_RECORDED' || errorCode === 'ALREADY_COMPLETED' || errorMsg.includes('ইতিমধ্যে')) {
              duplicateCount++;
              console.log(`[OfflineSync:ITEM ${i + 1}] Result -> DUPLICATE_RESOLVED (Terminal: removed from retry queue)`);
            } else if (errorCode === 'INVALID_MOSQUE_QR' || errorCode === 'MOSQUE_QR_REQUIRED' || errorMsg.includes('QR Code')) {
              invalidQrCount++;
              rejectionMessages.push(errorMsg || 'যাচাইকরণ তথ্য বৈধ নয়। চেক-ইনটি গ্রহণ করা হয়নি।');
              console.log(`[OfflineSync:ITEM ${i + 1}] Result -> REJECTED_INVALID_QR (Terminal: removed from retry queue)`);
            } else if (errorCode === 'OUT_OF_RANGE' || errorCode === 'LOCATION_REQUIRED' || errorMsg.includes('দূরত্ব') || errorMsg.includes('লোকেশন')) {
              invalidLocationCount++;
              rejectionMessages.push(errorMsg || 'মসজিদের নির্ধারিত এলাকার মধ্যে না থাকায় চেক-ইনটি গ্রহণ করা হয়নি।');
              console.log(`[OfflineSync:ITEM ${i + 1}] Result -> REJECTED_INVALID_LOCATION (Terminal: removed from retry queue)`);
            } else if (errorCode === 'INVALID_TIME_WINDOW' || errorCode === 'FUTURE_DATE_REJECTED' || errorCode === 'OFFLINE_WINDOW_EXCEEDED' || errorCode === 'NOT_FRIDAY' || errorCode === 'FRIDAY_JUMUAH_REQUIRED') {
              expiredPrayerCount++;
              rejectionMessages.push(errorMsg || 'এই সালাতের নির্ধারিত সময়ের বাইরে হওয়ায় চেক-ইনটি গ্রহণ করা হয়নি।');
              console.log(`[OfflineSync:ITEM ${i + 1}] Result -> REJECTED_EXPIRED_PRAYER (Terminal: removed from retry queue)`);
            } else {
              otherRejectedCount++;
              rejectionMessages.push(errorMsg || 'চেক-ইনটি সার্ভার কর্তৃক প্রত্যাখ্যাত হয়েছে।');
              console.log(`[OfflineSync:ITEM ${i + 1}] Result -> REJECTED_OTHER (Terminal: removed from retry queue)`);
            }
          }
        } catch (err: any) {
          console.error(`[OfflineSync:ITEM ${i + 1}] Error during sync:`, err);

          const status = err.status || err.response?.status;
          const errorCode = err.data?.error || err.error || '';
          const errorMsg = err.message || err.data?.message || '';

          const isAlreadyRecorded = status === 409 || errorCode === 'ALREADY_RECORDED' || errorCode === 'ALREADY_COMPLETED' || errorMsg.includes('ইতিমধ্যে');
          const isInvalidQr = (status === 400 && (errorCode === 'INVALID_MOSQUE_QR' || errorCode === 'MOSQUE_QR_REQUIRED')) || errorMsg.includes('QR Code') || errorMsg.includes('বৈধ নয়') || errorMsg.includes('সঠিক QR Code নয়');
          const isInvalidLocation = (status === 400 && (errorCode === 'OUT_OF_RANGE' || errorCode === 'LOCATION_REQUIRED')) || errorMsg.includes('দূরত্ব') || errorMsg.includes('লোকেশন');
          const isExpiredPrayer = (status === 400 && (errorCode === 'INVALID_TIME_WINDOW' || errorCode === 'FUTURE_DATE_REJECTED' || errorCode === 'OFFLINE_WINDOW_EXCEEDED' || errorCode === 'NOT_FRIDAY' || errorCode === 'FRIDAY_JUMUAH_REQUIRED')) || errorMsg.includes('ওয়াক্তের সময়') || errorMsg.includes('সময় পার হয়ে গেছে') || errorMsg.includes('সময় শেষ হয়ে গেছে');
          const isOtherTerminalRejection = status === 400 && (errorCode === 'INVALID_OFFLINE_DATE' || errorCode === 'INVALID_PRAYER_TYPE' || errorCode === 'INVALID_TIMESTAMP');

          if (isAlreadyRecorded) {
            duplicateCount++;
            console.log(`[OfflineSync:ITEM ${i + 1}] Result -> DUPLICATE_RESOLVED (Terminal: removed from retry queue)`);
          } else if (isInvalidQr) {
            invalidQrCount++;
            rejectionMessages.push(errorMsg || 'যাচাইকরণ তথ্য বৈধ নয়। চেক-ইনটি গ্রহণ করা হয়নি।');
            console.log(`[OfflineSync:ITEM ${i + 1}] Result -> REJECTED_INVALID_QR (Terminal: removed from retry queue)`);
          } else if (isInvalidLocation) {
            invalidLocationCount++;
            rejectionMessages.push(errorMsg || 'মসজিদের নির্ধারিত এলাকার মধ্যে না থাকায় চেক-ইনটি গ্রহণ করা হয়নি।');
            console.log(`[OfflineSync:ITEM ${i + 1}] Result -> REJECTED_INVALID_LOCATION (Terminal: removed from retry queue)`);
          } else if (isExpiredPrayer) {
            expiredPrayerCount++;
            rejectionMessages.push(errorMsg || 'এই সালাতের নির্ধারিত সময়ের বাইরে হওয়ায় চেক-ইনটি গ্রহণ করা হয়নি।');
            console.log(`[OfflineSync:ITEM ${i + 1}] Result -> REJECTED_EXPIRED_PRAYER (Terminal: removed from retry queue)`);
          } else if (isOtherTerminalRejection) {
            otherRejectedCount++;
            rejectionMessages.push(errorMsg || 'চেক-ইনটি সার্ভার কর্তৃক প্রত্যাখ্যাত হয়েছে।');
            console.log(`[OfflineSync:ITEM ${i + 1}] Result -> REJECTED_OTHER (Terminal: removed from retry queue)`);
          } else {
            // Temporary network/server error or timeout -> keep in queue for future retry
            retryableCount++;
            remainingQueue.push({
              ...item,
              syncStatus: 'failed_retryable',
              lastSyncError: errorMsg || 'সার্ভার সংযোগ সমস্যা',
              syncAttempts: (item.syncAttempts || 0) + 1,
              lastSyncAttemptAt: new Date().toISOString()
            });
            console.log(`[OfflineSync:ITEM ${i + 1}] Result -> FAILED_RETRYABLE (Retained in queue for next sync)`);
          }
        }
      }
    } finally {
      // Always save remaining items and release lock
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingQueue));
      this.isSyncing = false;
      notifyOfflineQueueUpdated();

      console.log(`[OfflineSync:COMPLETE] ==========================================`);
      console.log(`[OfflineSync:COMPLETE] Sync loop finished:`);
      console.log(`  - Synced successfully: ${syncedCount}`);
      console.log(`  - Quarantined: ${quarantinedCount}`);
      console.log(`  - Already recorded duplicates: ${duplicateCount}`);
      console.log(`  - Invalid QR rejected: ${invalidQrCount}`);
      console.log(`  - Invalid location rejected: ${invalidLocationCount}`);
      console.log(`  - Expired prayer rejected: ${expiredPrayerCount}`);
      console.log(`  - Other rejections: ${otherRejectedCount}`);
      console.log(`  - Retryable network errors: ${retryableCount}`);
      console.log(`  - Remaining items in queue: ${remainingQueue.length}`);
      console.log(`[OfflineSync:COMPLETE] ==========================================`);

      // Provide clear, structured user feedback for each distinct result category
      if (this.onShowToastCallback) {
        if (syncedCount > 0) {
          this.onShowToastCallback(
            'success',
            'সিঙ্ক সম্পন্ন',
            `${syncedCount}টি অফলাইন চেক-ইন সফলভাবে সার্ভারের সাথে সিঙ্ক হয়েছে।`
          );
        }

        if (invalidLocationCount > 0) {
          this.onShowToastCallback(
            'error',
            'লোকেশন ভেরিফিকেশন ব্যর্থ',
            'মসজিদের নির্ধারিত এলাকার মধ্যে না থাকায় চেক-ইনটি গ্রহণ করা হয়নি।'
          );
        }

        if (expiredPrayerCount > 0) {
          this.onShowToastCallback(
            'error',
            'ওয়াক্ত অতিক্রান্ত',
            'এই সালাতের নির্ধারিত সময়ের বাইরে হওয়ায় চেক-ইনটি গ্রহণ করা হয়নি।'
          );
        }

        if (quarantinedCount > 0) {
          this.onShowToastCallback(
            'warning',
            'পর্যালোচনায় রাখা হয়েছে',
            'চেক-ইনটি নিরাপত্তা যাচাইয়ের জন্য পর্যালোচনায় রাখা হয়েছে।'
          );
        }
      }

      // Notify parent app if any attendance record state changed on server
      if (syncedCount > 0 || duplicateCount > 0 || quarantinedCount > 0) {
        if (this.onSyncCompleteCallback) {
          try {
            this.onSyncCompleteCallback();
          } catch (e) {
            console.error('[OfflineSync] Error in onSyncCompleteCallback:', e);
          }
        }
      }
    }
  }

  /**
   * Clear all pending check-ins
   */
  public clearQueue() {
    localStorage.removeItem(STORAGE_KEY);
    notifyOfflineQueueUpdated();
  }
}

export const offlineSyncService = new OfflineSyncService();
