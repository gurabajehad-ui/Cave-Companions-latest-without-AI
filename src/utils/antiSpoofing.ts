/**
 * Anti-Fake GPS & Geolocation Spoofing Prevention Engine
 * Cave Companions Security Module
 */

export interface AntiSpoofReport {
  isSpoofed: boolean;
  confidence: number; // 0 - 100
  reasons: string[];
  isMockProvider: boolean;
  accuracy: number;
  sampleVariance: number;
}

/**
 * Haversine formula to calculate distance in meters between two lat/lng pairs
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Evaluates a single or multiple geolocation readings for signs of spoofing,
 * mock location apps, and artificial coordinate injection.
 */
export function evaluateLocationSpoofing(
  sample1: GeolocationPosition,
  sample2?: GeolocationPosition | null,
  previousCheckIn?: { lat: number; lng: number; timestamp: number } | null
): AntiSpoofReport {
  const reasons: string[] = [];
  let score = 0;
  let isMock = false;

  const coords1 = sample1.coords;
  const rawMock1 = (coords1 as any).isMock || (coords1 as any).mocked;
  const rawMock2 = sample2 ? ((sample2.coords as any).isMock || (sample2.coords as any).mocked) : false;

  // 1. Explicit Android Mock Location flag (reported by WebView / Chrome Android Developer Options)
  if (rawMock1 || rawMock2) {
    isMock = true;
    score += 100;
    reasons.push('ANDROID_MOCK_LOCATION_PROVIDER_ACTIVE');
  }

  // 2. Unrealistic Hardware Accuracy Checks
  // Real GNSS (GPS/GLONASS) satellite chips on consumer smartphones cannot achieve 0m or 1m accuracy indoors or outdoors.
  // Fake GPS joystick apps commonly set accuracy to exactly 0, 1, or 5.
  if (coords1.accuracy === 0 || coords1.accuracy === 1) {
    score += 85;
    reasons.push('IMPOSSIBLE_PERFECT_ACCURACY_ZERO_OR_ONE');
  } else if (coords1.accuracy < 2.0 && coords1.accuracy > 0) {
    score += 65;
    reasons.push('UNREALISTIC_SUB_TWO_METER_ACCURACY');
  }

  // 3. Stale / Manipulated Timestamp
  const now = Date.now();
  const timeDelta = Math.abs(now - sample1.timestamp);
  if (timeDelta > 60000) {
    score += 40;
    reasons.push('STALE_OR_PRE_RECORDED_TIMESTAMP');
  }

  // 4. Micro-Jitter Analysis across consecutive samples
  // Real GPS sensors exhibit sub-meter satellite noise (DOP jitter).
  // Fake GPS software feeds an exact static double down to 10 decimal digits with 0 variance.
  let sampleVariance = 0;
  if (sample2) {
    const coords2 = sample2.coords;
    const distanceBetween = calculateDistanceMeters(
      coords1.latitude,
      coords1.longitude,
      coords2.latitude,
      coords2.longitude
    );
    const timeBetween = Math.abs(sample2.timestamp - sample1.timestamp);

    sampleVariance = distanceBetween;

    // If readings taken > 400ms apart are 100% mathematically identical down to 8 decimals
    // with exact same accuracy and altitude, flag coordinate lock
    if (
      timeBetween >= 300 &&
      coords1.latitude === coords2.latitude &&
      coords1.longitude === coords2.longitude &&
      coords1.accuracy === coords2.accuracy
    ) {
      score += 55;
      reasons.push('STATIC_COORDINATE_LOCK_NO_SATELLITE_JITTER');
    }
  }

  // 5. Impossible Travel Velocity (Teleportation check)
  if (previousCheckIn && previousCheckIn.lat && previousCheckIn.lng && previousCheckIn.timestamp) {
    const elapsedMinutes = (now - previousCheckIn.timestamp) / (1000 * 60);
    if (elapsedMinutes > 0 && elapsedMinutes < 120) {
      const distanceTravelled = calculateDistanceMeters(
        previousCheckIn.lat,
        previousCheckIn.lng,
        coords1.latitude,
        coords1.longitude
      );
      const speedKmH = (distanceTravelled / 1000) / (elapsedMinutes / 60);

      // Speed faster than 150 km/h (impossible in regular traffic / city walking)
      if (distanceTravelled > 15000 && speedKmH > 150) {
        score += 80;
        reasons.push(`TELEPORTATION_VELOCITY_${Math.round(speedKmH)}_KMH`);
      }
    }
  }

  const isSpoofed = isMock || score >= 75;

  return {
    isSpoofed,
    confidence: Math.min(100, score),
    reasons,
    isMockProvider: isMock,
    accuracy: coords1.accuracy,
    sampleVariance
  };
}

/**
 * Obtains device location with multi-sampling and anti-spoofing heuristics.
 */
export async function getSecureLocationWithAntiSpoof(
  previousCheckIn?: { lat: number; lng: number; timestamp: number } | null
): Promise<{
  coords: { lat: number; lng: number; accuracy: number };
  antiSpoof: AntiSpoofReport;
}> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    throw new Error('Geolocation is not supported by your browser.');
  }

  // Acquire first sample with high accuracy
  const sample1 = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => {
        // Retry once with standard accuracy if high-accuracy fails indoors
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  });

  // Short pause to allow real satellite receiver jitter
  let sample2: GeolocationPosition | null = null;
  try {
    await new Promise(r => setTimeout(r, 450));
    sample2 = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        () => resolve(sample1), // fallback to sample1 if second sample fails
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  } catch (e) {
    sample2 = null;
  }

  const report = evaluateLocationSpoofing(sample1, sample2, previousCheckIn);

  return {
    coords: {
      lat: sample1.coords.latitude,
      lng: sample1.coords.longitude,
      accuracy: sample1.coords.accuracy || 50
    },
    antiSpoof: report
  };
}
