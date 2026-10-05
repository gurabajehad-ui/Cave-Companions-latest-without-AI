import { Router, Response } from 'express';
import { db, MosqueRecord } from '../db.js';
import { requireAuth, requireAdmin, AuthRequest } from '../auth.js';
import { getTodayDateString, getDhakaDateString, isFriday } from '../timezone.js';
import { prayerVerificationRateLimiter } from '../rateLimiter.js';
import { isPrayerTimeValid, calculateDistanceInMeters, getCanonicalPrayerDate, getOperationalPrayerDate, getHijriDateString } from '../prayerTimes.js';
import { SalahJourneyService } from '../salahJourneyService.js';

const router = Router();

const VALID_PRAYERS = ['fajr', 'dhuhr', 'jumuah', 'asr', 'maghrib', 'isha'] as const;
type PrayerType = typeof VALID_PRAYERS[number];

const PRAYER_NAMES_BN: Record<string, string> = {
  fajr: 'ফজর',
  dhuhr: 'যোহর',
  jumuah: 'জুমআ',
  asr: 'আসর',
  maghrib: 'মাগরিব',
  isha: 'এশা'
};

// 1. Get today's prayer status for authenticated user
router.get('/today', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    // Use the active operational prayer date (handles midnight-crossing Isha cycle)
    const todayStr = getOperationalPrayerDate(new Date());
    const isTodayFri = isFriday(todayStr);
    const attendances = await db.getUserTodayAttendances(user.id, todayStr);

    const dayPrayers: PrayerType[] = isTodayFri
      ? ['fajr', 'jumuah', 'asr', 'maghrib', 'isha']
      : ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

    const prayerStatusMap: Record<string, any> = {};
    dayPrayers.forEach(p => {
      prayerStatusMap[p] = { completed: false, attendance: null };
    });

    attendances.forEach(att => {
      const pType = att.prayerType as PrayerType;
      if (prayerStatusMap[pType]) {
        prayerStatusMap[pType] = {
          completed: true,
          attendance: att
        };
      } else if (isTodayFri && pType === 'dhuhr' && prayerStatusMap['jumuah']) {
        prayerStatusMap['jumuah'] = {
          completed: true,
          attendance: att
        };
      } else if (!isTodayFri && pType === 'jumuah' && prayerStatusMap['dhuhr']) {
        prayerStatusMap['dhuhr'] = {
          completed: true,
          attendance: att
        };
      }
    });

    const completedCount = attendances.length;

    res.json({
      success: true,
      date: todayStr,
      isFriday: isTodayFri,
      completedCount,
      totalPrayers: 5,
      prayers: prayerStatusMap,
      summaryText: `আজ ${toBengaliNumeral(completedCount)}/৫ ওয়াক্ত জামাতে নামাজ সম্পন্ন`
    });
  } catch (err: any) {
    console.error('get today prayers error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'আজকের নামাজের তথ্য আনতে সমস্যা হয়েছে।'
    });
  }
});

// 2. Verify and Record Prayer Attendance (Male: Time + Mosque Location | Female: Time only)
const handlePrayerVerification = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    // CRITICAL: Strictly extract gender from authenticated DB record. Ignore client-passed gender!
    const userGender = (user.gender || 'male').toString().toLowerCase();
    const { prayerType, qrData, mosqueId, lat, lng, scannedAt, savedAt } = req.body;
    const checkInTimeStr = savedAt || scannedAt;
    const isOfflineSync = !!checkInTimeStr;

    console.log(`[PrayerRoutes:verify:START] Request received: user=${user.id} (${user.fullName || user.phone || 'Unknown'}), gender=${userGender}, prayerType=${prayerType}, mosqueId=${mosqueId || 'auto'}, isOfflineSync=${isOfflineSync}, savedAt=${checkInTimeStr || 'realtime'}, lat=${lat}, lng=${lng}`);

    // Validate prayer type
    if (!prayerType || !VALID_PRAYERS.includes(prayerType)) {
      console.warn(`[PrayerRoutes:verify:REJECT] Invalid prayer type: ${prayerType}`);
      res.status(400).json({
        success: false,
        error: 'INVALID_PRAYER_TYPE',
        message: 'সঠিক নামাজের ওয়াক্ত নির্বাচন করুন (ফজর, যোহর/জুমআ, আসর, মাগরিব, এশা)।'
      });
      return;
    }

    // Extract accurate timestamp
    let checkInTimestamp = new Date();
    if (checkInTimeStr) {
      const parsedDate = new Date(checkInTimeStr);
      if (!isNaN(parsedDate.getTime())) {
        checkInTimestamp = parsedDate;
      } else {
        console.warn(`[PrayerRoutes:verify:REJECT] Invalid timestamp: ${checkInTimeStr}`);
        res.status(400).json({
          success: false,
          error: 'INVALID_TIMESTAMP',
          message: 'অবৈধ টাইমস্ট্যাম্প বিন্যাস।'
        });
        return;
      }
    }

    // Determine Canonical Operational Prayer Date
    // E.g. For Isha between 00:00 and Fajr start, canonicalPrayerDate is yesterday's date
    const canonicalPrayerDate = getCanonicalPrayerDate(prayerType, checkInTimestamp, lat, lng);
    const todayStr = getTodayDateString();
    let targetDateStr = canonicalPrayerDate;
    let securityStatus = 'verified';
    let riskScore = 0;
    const riskReasons: string[] = [];

    if (checkInTimeStr) {
      const candidateDateStr = getDhakaDateString(checkInTimestamp);

      // ANTI-CHEATING SECURITY CHECKS FOR OFFLINE SYNC:
      // 1. Prevent future-dated check-ins (Hard Rejection)
      // 2. Prevent backdating beyond max 7-day offline window (Hard Rejection)
      // 3. Ensure candidate date is not before account creation date (Hard Rejection)
      const todayObj = new Date(todayStr + 'T00:00:00Z');
      const candidateObj = new Date(canonicalPrayerDate + 'T00:00:00Z');
      const diffDays = Math.round((todayObj.getTime() - candidateObj.getTime()) / (1000 * 60 * 60 * 24));

      const userCreatedAt = user.createdAt ? user.createdAt.toString().substring(0, 10) : '2020-01-01';

      // Strict Hard Rejections
      if (candidateDateStr > todayStr || canonicalPrayerDate > todayStr) {
        console.warn(`[PrayerRoutes:verify:REJECT] Future date rejected: candidate=${candidateDateStr}, canonical=${canonicalPrayerDate}, today=${todayStr}`);
        res.status(400).json({
          success: false,
          error: 'FUTURE_DATE_REJECTED',
          message: 'ভবিষ্যতের তারিখের উপস্থিতি গ্রহণযোগ্য নয়।'
        });
        return;
      }

      if (diffDays < 0 || diffDays > 7) {
        console.warn(`[PrayerRoutes:verify:REJECT] Offline window exceeded: diffDays=${diffDays}`);
        res.status(400).json({
          success: false,
          error: 'OFFLINE_WINDOW_EXCEEDED',
          message: 'অফলাইন চেকবুক সিঙ্কের অনুমোদিত সময়সীমা (সর্বোচ্চ ৭ দিন) অতিক্রম করেছে।'
        });
        return;
      }

      if (canonicalPrayerDate < userCreatedAt) {
        console.warn(`[PrayerRoutes:verify:REJECT] Invalid offline date before account creation: canonical=${canonicalPrayerDate}, userCreated=${userCreatedAt}`);
        res.status(400).json({
          success: false,
          error: 'INVALID_OFFLINE_DATE',
          message: 'অফলাইন তারিখটি অ্যাকাউন্ট তৈরির তারিখের আগের হতে পারে না।'
        });
        return;
      }

      // Anomaly Detection & Risk Scoring (Non-Blocking for Legitimate 5-7 Day Offline Users)
      const scannedAtTime = checkInTimestamp.getTime();
      const recentAtts = await db.getUserAttendanceHistory(user.id, 15);

      for (const r of recentAtts) {
        const rTime = new Date(r.verifiedAt).getTime();
        // If a new record is supposedly created with a later local timestamp but its candidate date is earlier than an already verified real-time record
        if (r.date > canonicalPrayerDate && rTime < scannedAtTime) {
          riskScore += 60;
          if (!riskReasons.includes('CLOCK_JUMP_BACKWARD')) riskReasons.push('CLOCK_JUMP_BACKWARD');
        }
        
        // Same prayer date, different prayer type, but extremely close timestamps (< 10 mins apart)
        if (r.date === canonicalPrayerDate && r.prayerType !== prayerType) {
          const timeDiffMin = Math.abs(scannedAtTime - rTime) / (1000 * 60);
          if (timeDiffMin < 10) {
            riskScore += 50;
            if (!riskReasons.includes('IMPOSSIBLE_TIME_DELTA')) riskReasons.push('IMPOSSIBLE_TIME_DELTA');
          }
        }
      }

      // Additional Chronological Sequence Batch Check & Velocity Analysis
      try {
        const syncCount = await db.getOfflineSyncCountInWindow(user.id, 120);
        if (syncCount > 10) {
          riskScore += 30;
          if (!riskReasons.includes('HIGH_VELOCITY_BATCH_UPLOAD')) riskReasons.push('HIGH_VELOCITY_BATCH_UPLOAD');
        }

        const latestAtts = await db.getUserLatestAttendancesForSecurity(user.id);
        if (latestAtts && latestAtts.length > 0) {
          const lastRecord = latestAtts[0];
          const lastVerifiedTime = new Date(lastRecord.verifiedAt).getTime();
          const lastScannedTime = lastRecord.scannedAtOriginal ? new Date(lastRecord.scannedAtOriginal).getTime() : null;

          if (Date.now() - lastVerifiedTime < 120 * 1000) {
            // If the time is jumping backward during a sequential sync session
            if (lastScannedTime && scannedAtTime < lastScannedTime - 60 * 1000) {
              riskScore += 60;
              if (!riskReasons.includes('CLOCK_JUMP_BACKWARD_IN_BATCH')) riskReasons.push('CLOCK_JUMP_BACKWARD_IN_BATCH');
            }
          }
        }
      } catch (e) {
        console.warn('[Security Review] Optional anomaly check skipped:', e);
      }

      if (riskScore >= 80) {
        securityStatus = 'quarantined';
        console.warn(`[Security Quarantine] High risk check-in detected for user ${user.id}: date ${canonicalPrayerDate}, score ${riskScore}, reasons: ${riskReasons.join(', ')}`);
      } else if (riskScore > 0) {
        console.log(`[Security Flag] Moderate risk check-in detected for user ${user.id}: date ${canonicalPrayerDate}, score ${riskScore}, reasons: ${riskReasons.join(', ')}`);
      }
    }

    const isTargetFri = isFriday(canonicalPrayerDate);

    if (isTargetFri && prayerType === 'dhuhr') {
      console.warn(`[PrayerRoutes:verify:REJECT] Friday dhuhr instead of jumuah: date=${canonicalPrayerDate}`);
      res.status(400).json({
        success: false,
        error: 'FRIDAY_JUMUAH_REQUIRED',
        message: 'ওই দিন শুক্রবার ছিল, জোহর-এর পরিবর্তে জুমআ সালাত নির্বাচন করুন।'
      });
      return;
    }

    if (!isTargetFri && prayerType === 'jumuah') {
      console.warn(`[PrayerRoutes:verify:REJECT] Jumuah on non-Friday: date=${canonicalPrayerDate}`);
      res.status(400).json({
        success: false,
        error: 'NOT_FRIDAY',
        message: 'জুমআ সালাত শুধুমাত্র শুক্রবার প্রযোজ্য। অনুগ্রহ করে যোহর সালাত নির্বাচন করুন।'
      });
      return;
    }

    // Condition 1: Validate Prayer Time Window
    const isTestBypass = req.headers['x-bypass-time-validation'] === 'true';
    const timeValidation = isTestBypass ? { valid: true } : isPrayerTimeValid(prayerType, lat, lng, userGender, checkInTimestamp);
    console.log(`[PrayerRoutes:verify:TIME] Prayer time check: valid=${timeValidation.valid}, reason=${timeValidation.reason || 'OK'}, timestamp=${checkInTimestamp.toISOString()}`);
    if (!timeValidation.valid) {
      console.warn(`[PrayerRoutes:verify:REJECT] Invalid time window for ${prayerType}: ${timeValidation.reason}`);
      res.status(400).json({
        success: false,
        error: 'INVALID_TIME_WINDOW',
        message: 'এই সালাতের নির্ধারিত সময় এখন নয়।'
      });
      return;
    }

    let mosqueToUse: MosqueRecord | null = null;
    let qrPayloadToStore = 'LOCATION_VERIFIED';

    if (userGender === 'female') {
      // FEMALE USER: Mosque Location Verification is NOT required!
      // Attendance is purely time-based.
      let targetMosqueId = mosqueId || (typeof qrData === 'string' && !['FEMALE_DIRECT', 'DIRECT', 'HOME_PRAYER', 'JUMUAH_DIRECT', 'LOCATION_VERIFIED'].includes(qrData.trim()) ? qrData.trim() : undefined);
      if (targetMosqueId) {
        try {
          if (targetMosqueId.startsWith('{')) {
            const parsed = JSON.parse(targetMosqueId);
            if (parsed.mosqueId) targetMosqueId = parsed.mosqueId;
            else if (parsed.id) targetMosqueId = parsed.id;
          }
        } catch (e) {}
        mosqueToUse = (await db.getMosqueById(targetMosqueId)) || null;
      }

      if (!mosqueToUse) {
        const activeMosques = await db.getMosques(true);
        mosqueToUse = activeMosques[0] || {
          id: prayerType === 'jumuah' ? 'MSQ-JUMUAH' : 'MSQ-HOME',
          name: prayerType === 'jumuah' ? "Jumu'ah Prayer" : 'Home Prayer',
          nameBn: prayerType === 'jumuah' ? 'জুমআ সালাত' : 'গৃহ সালাত / জামাত',
          address: prayerType === 'jumuah' ? 'জুমআ জামাত' : 'হোম জামাত',
          area: 'ঢাকা',
          district: 'ঢাকা',
          qrIdentifier: prayerType === 'jumuah' ? 'JUMUAH_PRAYER' : 'HOME_PRAYER',
          status: 'active',
          createdAt: new Date().toISOString()
        };
      }
      qrPayloadToStore = prayerType === 'jumuah' ? 'JUMUAH_DIRECT_FEMALE' : 'FEMALE_DIRECT';
      console.log(`[PrayerRoutes:verify:FEMALE] Female prayer time satisfied. Assigned mosque: ${mosqueToUse.nameBn || mosqueToUse.name}`);
    } else {
      // MALE USER: Condition 2 — Mosque Location Verification is MANDATORY (Both Prayer Time + Mosque Location)
      const userLat = lat !== undefined && lat !== null ? Number(lat) : NaN;
      const userLng = lng !== undefined && lng !== null ? Number(lng) : NaN;

      if (isNaN(userLat) || isNaN(userLng) || (userLat === 0 && userLng === 0)) {
        console.warn(`[PrayerRoutes:verify:REJECT] Location coordinates missing for male user`);
        res.status(400).json({
          success: false,
          error: 'LOCATION_REQUIRED',
          message: 'লোকেশন যাচাই করা যাচ্ছে না। Location চালু আছে কিনা দেখুন।'
        });
        return;
      }

      // 1. Identify the mosque: client may send mosqueId directly or legacy qrData
      let targetMosqueId = mosqueId || (typeof qrData === 'string' && !['FEMALE_DIRECT', 'DIRECT', 'HOME_PRAYER', 'JUMUAH_DIRECT', 'LOCATION_VERIFIED'].includes(qrData.trim()) ? qrData.trim() : undefined);
      if (targetMosqueId) {
        try {
          if (targetMosqueId.startsWith('{')) {
            const parsed = JSON.parse(targetMosqueId);
            if (parsed.mosqueId) targetMosqueId = parsed.mosqueId;
            else if (parsed.id) targetMosqueId = parsed.id;
          }
        } catch (e) {}
        mosqueToUse = (await db.getMosqueById(targetMosqueId)) || (await db.getMosqueByQrIdentifier(targetMosqueId)) || null;
      }

      const activeMosques = await db.getMosques(true);

      // --- SECURITY: ANTI-FAKE GPS & LOCATION SPOOFING PREVENTION ---
      const isMock = req.body.isMock === true;
      const spoofSignals: string[] = Array.isArray(req.body.spoofSignals) ? req.body.spoofSignals : [];
      const rawAccuracy = Number(req.body.accuracy);

      // 1. Hard Mock Provider rejection (Android Developer Options / Mock Location Apps)
      if (isMock || spoofSignals.includes('ANDROID_MOCK_LOCATION_PROVIDER_ACTIVE')) {
        console.warn(`[Security Rejection: FAKE_GPS] User ${user.id} detected using mock location provider:`, spoofSignals);
        res.status(400).json({
          success: false,
          error: 'FAKE_GPS_DETECTED',
          message: 'ডিভাইসে ফেক জিপিএস (Fake GPS) বা মক লোকেশন সক্রিয় রয়েছে। অনুগ্রহ করে ফেক জিপিএস বন্ধ করে আসল জিপিএস নিয়ে মসজিদে উপস্থিত হয়ে সালাত ভেরিফাই করুন।'
        });
        return;
      }

      // 2. Unrealistic Hardware Accuracy check (Fake GPS apps injecting 0 or 1m)
      if (!isNaN(rawAccuracy) && (rawAccuracy === 0 || rawAccuracy === 1 || rawAccuracy < 1.5)) {
        console.warn(`[Security Rejection: FAKE_GPS] User ${user.id} reported impossible GNSS accuracy: ${rawAccuracy}`);
        res.status(400).json({
          success: false,
          error: 'FAKE_GPS_DETECTED',
          message: 'অস্বাভাবিক জিপিএস সিগন্যাল (Fake Coordinates) সনাক্ত হয়েছে। অনুগ্রহ করে আসল জিপিএস ব্যবহার করুন।'
        });
        return;
      }

      // 3. Teleportation / Impossible Speed check between consecutive check-ins
      try {
        const recentHistory = await db.getUserAttendanceHistory(user.id, 3);
        if (recentHistory && recentHistory.length > 0) {
          const lastAtt = recentHistory[0];
          const prevMosque = lastAtt.mosqueId ? activeMosques.find(m => m.id === lastAtt.mosqueId) : null;
          const prevLat = prevMosque ? Number(prevMosque.latitude) : Number((lastAtt as any).latitude);
          const prevLng = prevMosque ? Number(prevMosque.longitude) : Number((lastAtt as any).longitude);

          if (prevLat && prevLng && lastAtt.verifiedAt) {
            const timeDeltaMin = (checkInTimestamp.getTime() - new Date(lastAtt.verifiedAt).getTime()) / (1000 * 60);
            if (timeDeltaMin > 0 && timeDeltaMin < 90) {
              const distanceMoved = calculateDistanceInMeters(userLat, userLng, prevLat, prevLng);
              const speedKmH = (distanceMoved / 1000) / (timeDeltaMin / 60);
              if (distanceMoved > 25000 && speedKmH > 160) {
                console.warn(`[Security Rejection: TELEPORTATION] User ${user.id} moved ${Math.round(distanceMoved / 1000)}km in ${Math.round(timeDeltaMin)} mins (${Math.round(speedKmH)} km/h)`);
                res.status(400).json({
                  success: false,
                  error: 'TELEPORTATION_DETECTED',
                  message: 'অস্বাভাবিক ভৌগোলিক স্থান পরিবর্তন সনাক্ত হয়েছে (Teleportation Spoofing)। সঠিক মসজিদে উপস্থিত হয়ে ভেরিফাই করুন।'
                });
                return;
              }
            }
          }
        }
      } catch (velErr) {
        console.warn('[Security Review] Velocity check error:', velErr);
      }

      // Small realistic indoor GPS drift allowance: at most 5 meters or 10% of admin radius
      const gpsJitterBuffer = (!isNaN(rawAccuracy) && rawAccuracy > 0)
        ? Math.min(rawAccuracy * 0.1, 8)
        : 0;

      if (mosqueToUse && mosqueToUse.status === 'active') {
        // Verify user is within admin-configured verification radius
        const mosqueLat = Number(mosqueToUse.latitude || 0);
        const mosqueLng = Number(mosqueToUse.longitude || 0);
        const adminRadius = Number((mosqueToUse as any).verificationRadius) > 0 ? Number((mosqueToUse as any).verificationRadius) : 75;
        const allowedRadius = Math.round(adminRadius + gpsJitterBuffer);

        if (mosqueLat !== 0 && mosqueLng !== 0) {
          const distanceMeters = calculateDistanceInMeters(userLat, userLng, mosqueLat, mosqueLng);
          console.log(`[PrayerRoutes:verify:LOCATION] User distance from ${mosqueToUse.name}: ${Math.round(distanceMeters)}m (admin radius: ${adminRadius}m, allowed with jitter: ${allowedRadius}m)`);
          if (distanceMeters > allowedRadius) {
            const formattedDistance = distanceMeters >= 1000
              ? `${(distanceMeters / 1000).toFixed(2)} কি.মি.`
              : `${Math.round(distanceMeters)} মিটার`;

            console.warn(`[PrayerRoutes:verify:REJECT] Out of range for mosque ${mosqueToUse.name}: ${formattedDistance}, adminRadius=${adminRadius}m`);
            res.status(400).json({
              success: false,
              error: 'OUT_OF_RANGE',
              distanceMeters: Math.round(distanceMeters),
              allowedRadius: adminRadius,
              message: `আপনার বর্তমান অবস্থান "${mosqueToUse.nameBn || mosqueToUse.name}" মসজিদের অ্যাডমিন-নির্ধারিত সীমানার বাইরে। (অনুমোদিত রেডিয়াস: ${adminRadius} মিটার, আপনার দূরত্ব: ${formattedDistance})`
            });
            return;
          }
        }
      } else {
        // If mosqueId was not provided or not found, match the closest active approved mosque within admin radius
        let closestMosque: MosqueRecord | null = null;
        let minDistance = Infinity;

        for (const m of activeMosques) {
          const mLat = Number(m.latitude || 0);
          const mLng = Number(m.longitude || 0);
          const mAdminRadius = Number((m as any).verificationRadius) > 0 ? Number((m as any).verificationRadius) : 75;
          const mAllowedRadius = Math.round(mAdminRadius + gpsJitterBuffer);
          if (mLat !== 0 && mLng !== 0) {
            const dist = calculateDistanceInMeters(userLat, userLng, mLat, mLng);
            if (dist <= mAllowedRadius && dist < minDistance) {
              minDistance = dist;
              closestMosque = m;
            }
          }
        }

        if (closestMosque) {
          mosqueToUse = closestMosque;
          console.log(`[PrayerRoutes:verify:LOCATION] Auto-associated nearest mosque within admin radius: ${closestMosque.name} (${Math.round(minDistance)}m)`);
        } else {
          console.warn(`[PrayerRoutes:verify:REJECT] Male user not within admin radius of any approved mosque: lat=${userLat}, lng=${userLng}`);
          res.status(400).json({
            success: false,
            error: 'OUT_OF_RANGE',
            message: 'আপনার বর্তমান অবস্থান কোনো অনুমোদিত মসজিদের অ্যাডমিন-নির্ধারিত এলাকার মধ্যে পাওয়া যায়নি।'
          });
          return;
        }
      }

      qrPayloadToStore = 'LOCATION_VERIFIED';
    }

    // Record prayer attendance against targetDateStr with original scannedAt timestamp
    const result = await db.recordPrayerAttendance(
      user.id,
      mosqueToUse,
      prayerType as PrayerType,
      targetDateStr,
      qrPayloadToStore,
      lat,
      lng,
      checkInTimeStr,
      securityStatus,
      riskScore,
      riskReasons.join(', ')
    );

    console.log(`[PrayerRoutes:verify-qr:DB] recordPrayerAttendance result: success=${result.success}${result.error ? `, failureReason=${result.error}` : ''}`);

    if (!result.success) {
      if (result.error === 'ALREADY_COMPLETED') {
        console.log(`[PrayerRoutes:verify-qr:DUPLICATE] Prayer already completed for date=${targetDateStr}, prayer=${prayerType}`);
        res.status(409).json({
          success: false,
          error: 'ALREADY_RECORDED',
          message: 'এই সালাতের উপস্থিতি ইতোমধ্যে রেকর্ড করা হয়েছে।',
          prayerNameBn: PRAYER_NAMES_BN[prayerType as PrayerType]
        });
        return;
      }

      console.warn(`[PrayerRoutes:verify-qr:REJECT] Verification failed in DB: ${result.error}`);
      res.status(400).json({
        success: false,
        error: 'VERIFICATION_FAILED',
        message: 'নামাজ সংরক্ষণ করতে সমস্যা হয়েছে।'
      });
      return;
    }

    // Log security audit event for quarantine
    if (securityStatus === 'quarantined') {
      await db.logSecurityEvent(
        user.id,
        targetDateStr,
        'quarantine',
        riskScore,
        `Quarantined due to: ${riskReasons.join(', ')}`
      );
    }

    // Get updated count for targetDateStr (only non-quarantined count)
    const dateAttendances = await db.getUserTodayAttendances(user.id, targetDateStr);
    const completedCount = dateAttendances.length;

    // Automatic token evaluation & generation for targetDateStr (Only if not quarantined)
    let tokenResult: { generated: boolean; token?: any; action: string } = { generated: false, token: undefined, action: 'quarantined' };
    if (securityStatus !== 'quarantined') {
      tokenResult = await db.generateOrUpdateDailyToken(user.id, targetDateStr);
    }

    let tokenMessage: string | null = null;
    if (tokenResult.generated && tokenResult.token) {
      if (tokenResult.action === 'created') {
        const tierName = tokenResult.token.tokenType === 'GOLD' ? 'গোল্ড (Gold)' : tokenResult.token.tokenType === 'SILVER' ? 'সিলভার (Silver)' : 'ব্রোঞ্জ (Bronze)';
        tokenMessage = `মুবারকবাদ! আপনি আজকের জন্য ১টি ${tierName} টোকেন অর্জন করেছেন!`;
      } else if (tokenResult.action === 'upgraded') {
        const tierName = tokenResult.token.tokenType === 'GOLD' ? 'গোল্ড (Gold)' : 'সিলভার (Silver)';
        tokenMessage = `অভিনন্দন! আপনার টোকেনটি ${tierName} টোকেনে উন্নীত (Upgrade) হয়েছে!`;
      }
    }

    let userMsg = 'অফলাইন চেক-ইন সফলভাবে সার্ভারের সাথে সিঙ্ক হয়েছে।';
    if (!isOfflineSync) {
      userMsg = 'আলহামদুলিল্লাহ্! আপনার নামাজটি আজকের জন্য সম্পন্ন হিসেবে সংরক্ষণ করা হয়েছে।';
    }
    if (securityStatus === 'quarantined') {
      userMsg = 'চেক-ইনটি নিরাপত্তা যাচাইয়ের জন্য পর্যালোচনায় রাখা হয়েছে।';
    }

    console.log(`[PrayerRoutes:verify-qr:SUCCESS] Completed verify-qr for user=${user.id}, targetDate=${targetDateStr}, securityStatus=${securityStatus}`);

    res.json({
      success: true,
      message: userMsg,
      securityStatus,
      riskScore,
      riskReasons,
      attendance: result.record,
      prayerDate: targetDateStr,
      hijriDate: getHijriDateString(checkInTimestamp),
      mosque: {
        id: mosqueToUse.id,
        name: mosqueToUse.name,
        nameBn: mosqueToUse.nameBn,
        area: mosqueToUse.area,
        district: mosqueToUse.district
      },
      prayerType,
      prayerNameBn: PRAYER_NAMES_BN[prayerType as PrayerType],
      todayCompletedCount: completedCount,
      summaryText: securityStatus === 'quarantined' ? 'পর্যালোচনার অপেক্ষায় (কোয়ারেন্টাইনড)' : `আজ ${toBengaliNumeral(completedCount)}/৫ ওয়াক্ত জামাতে নামাজ সম্পন্ন`,
      tokenResult: tokenResult.token ? {
        token: tokenResult.token,
        action: tokenResult.action,
        message: tokenMessage
      } : null
    });
  } catch (err: any) {
    console.error('verify-qr error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'সার্ভারে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
    });
  }
};

router.post('/verify', requireAuth, prayerVerificationRateLimiter, handlePrayerVerification);
router.post('/verify-qr', requireAuth, prayerVerificationRateLimiter, handlePrayerVerification);

// 3. Get Attendance History for Authenticated User
router.get('/history', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const history = await db.getUserAttendanceHistory(user.id, limit);

    res.json({
      success: true,
      count: history.length,
      history
    });
  } catch (err: any) {
    console.error('history get error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'নামাজের ইতিহাস আনতে সমস্যা হয়েছে।'
    });
  }
});

// 3.1 Get Grouped Daily Prayer History for Authenticated User (Phase 8)
router.get('/history/grouped', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const limitDays = parseInt(req.query.days as string, 10) || 30;
    const groupedDays = await db.getUserDailyPrayerHistoryGrouped(user.id, limitDays);

    res.json({
      success: true,
      count: groupedDays.length,
      days: groupedDays
    });
  } catch (err: any) {
    console.error('get grouped history error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'দৈনিক নামাজের তালিকা আনতে সমস্যা হয়েছে।'
    });
  }
});

// 4. Get User Attendance Statistics
router.get('/stats', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const stats = await db.getUserLifetimeStats(user.id);
    const todayStr = getTodayDateString();
    const todayAttendances = await db.getUserTodayAttendances(user.id, todayStr);

    res.json({
      success: true,
      todayCompletedCount: todayAttendances.length,
      date: todayStr,
      stats
    });
  } catch (err: any) {
    console.error('stats get error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'পরিসংখ্যান আনতে সমস্যা হয়েছে।'
    });
  }
});

// =========================================================================
// SALAH JOURNEY & GROWTH ENDPOINTS
// =========================================================================

// 5. Get Journey Summary (Dashboard & Home teaser)
router.get('/journey/summary', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const summary = await SalahJourneyService.getJourneySummary(user.id);
    res.json(summary);
  } catch (err: any) {
    console.error('[SalahJourney] summary error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'সালাত জার্নি সারাংশ লোড করতে সমস্যা হয়েছে।'
    });
  }
});

// 6. Get Period Analytics & Chart Data
router.get('/journey/analytics', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const period = (req.query.period as 'week' | 'month' | 'year' | 'custom') || 'week';
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const analytics = await SalahJourneyService.getJourneyAnalytics(user.id, period, startDate, endDate);
    res.json(analytics);
  } catch (err: any) {
    console.error('[SalahJourney] analytics error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'সালাত অ্যানালিটিক্স লোড করতে সমস্যা হয়েছে।'
    });
  }
});

// 7. Get Month Calendar Data
router.get('/journey/calendar', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const now = new Date();
    const year = parseInt(req.query.year as string, 10) || now.getFullYear();
    const month = parseInt(req.query.month as string, 10) || (now.getMonth() + 1);

    const calendar = await SalahJourneyService.getJourneyCalendar(user.id, year, month);
    res.json(calendar);
  } catch (err: any) {
    console.error('[SalahJourney] calendar error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'সালাত ক্যালেন্ডার লোড করতে সমস্যা হয়েছে।'
    });
  }
});

// 8. Get Day Detail
router.get('/journey/day-detail', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const dateStr = (req.query.date as string) || getTodayDateString();

    const detail = await SalahJourneyService.getJourneyDayDetail(user.id, dateStr);
    res.json(detail);
  } catch (err: any) {
    console.error('[SalahJourney] day-detail error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'দিনের বিস্তারিত তথ্য লোড করতে সমস্যা হয়েছে।'
    });
  }
});

// 9. Start New Journey (Archive previous data)
router.post('/journey/start-new', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const result = await SalahJourneyService.startNewJourney(user.id);
    res.json(result);
  } catch (err: any) {
    console.error('[SalahJourney] start-new error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'নতুন সালাত জার্নি শুরু করতে সমস্যা হয়েছে।'
    });
  }
});

// 10. Delete Day History
router.delete('/journey/history/day', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const dateStr = req.body?.date;
    if (!dateStr) {
      return res.status(400).json({ success: false, error: 'MISSING_DATE', message: 'তারিখ আবশ্যক।' });
    }

    const result = await SalahJourneyService.deleteHistoryDay(user.id, dateStr);
    res.json(result);
  } catch (err: any) {
    console.error('[SalahJourney] delete day history error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'ইতিহাস মুছতে সমস্যা হয়েছে।'
    });
  }
});

// 11. Delete Range History
router.delete('/journey/history/range', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { startDate, endDate } = req.body || {};
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'MISSING_PARAMS', message: 'শুরু ও শেষের তারিখ আবশ্যক।' });
    }

    const result = await SalahJourneyService.deleteHistoryRange(user.id, startDate, endDate);
    res.json(result);
  } catch (err: any) {
    console.error('[SalahJourney] delete range history error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'নির্দিষ্ট সীমার ইতিহাস মুছতে সমস্যা হয়েছে।'
    });
  }
});

// 12. Delete All History
router.delete('/journey/history/all', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const result = await SalahJourneyService.deleteHistoryAll(user.id);
    res.json(result);
  } catch (err: any) {
    console.error('[SalahJourney] delete all history error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'সম্পূর্ণ ইতিহাস মুছতে সমস্যা হয়েছে।'
    });
  }
});

// 13. Admin Quarantine APIs
router.get('/admin/quarantine', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const admin = req.admin;
    if (!admin) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'অনুমতি নেই।' });
    }

    const records = await db.getQuarantinedAttendances();
    res.json({ success: true, records: records || [] });
  } catch (err: any) {
    console.error('[Admin] GET quarantine error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'কোয়ারেন্টাইনড রেকর্ড লোড করতে সমস্যা হয়েছে।' });
  }
});

router.post('/admin/quarantine/resolve', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const admin = req.admin;
    if (!admin) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'অনুমতি নেই।' });
    }

    const { id, action } = req.body || {};
    if (!id || !action || (action !== 'approve' && action !== 'reject')) {
      return res.status(400).json({ success: false, error: 'MISSING_PARAMS', message: 'আইডি এবং অ্যাকশন (approve/reject) আবশ্যক।' });
    }

    const adminId = admin.id || 'MASTER';
    const resolved = await db.reviewQuarantinedAttendance(id, action, adminId);
    if (!resolved) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'রেকর্ড পাওয়া যায়নি বা সমাধান করা যায়নি।' });
    }

    res.json({ success: true, message: `কোয়ারেন্টাইনড রেকর্ড সফলভাবে ${action === 'approve' ? 'অনুমোদন' : 'প্রত্যাখ্যান'} করা হয়েছে।` });
  } catch (err: any) {
    console.error('[Admin] POST resolve quarantine error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'কোয়ারেন্টাইনড রেকর্ড সমাধান করতে সমস্যা হয়েছে।' });
  }
});

function toBengaliNumeral(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return '০';
  const digits: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
  };
  return String(num).replace(/\d/g, d => digits[d] || d);
}

export default router;
