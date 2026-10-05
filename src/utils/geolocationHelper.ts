/**
 * Robust Geolocation helper with auto-fallback and graceful error handling.
 */

export interface GeolocationResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  error?: string;
  errorCode?: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED';
}

export async function getCurrentCoordinates(): Promise<GeolocationResult> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return {
      success: false,
      error: 'ডিভাইসে জিপিএস লোকেশন সমর্থিত নয়।',
      errorCode: 'NOT_SUPPORTED'
    };
  }

  // Helper promise for getCurrentPosition
  const getPos = (options: PositionOptions): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  };

  try {
    // Attempt 1: High accuracy (works great on mobile GPS)
    const position = await getPos({
      enableHighAccuracy: true,
      timeout: 6000,
      maximumAge: 10000
    });

    return {
      success: true,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy
    };
  } catch (err: any) {
    // If permission was explicitly denied, do not retry
    if (err?.code === 1 || err?.name === 'NotAllowedError') {
      return {
        success: false,
        error: 'ব্রাউজার বা ডিভাইসে লোকেশন পারমিশন অফ করা আছে। পারমিশন অন করে চেষ্টা করুন।',
        errorCode: 'PERMISSION_DENIED'
      };
    }

    // Attempt 2: Low accuracy fallback (works on desktop/WiFi/cellular)
    try {
      const fallbackPos = await getPos({
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 60000
      });

      return {
        success: true,
        latitude: fallbackPos.coords.latitude,
        longitude: fallbackPos.coords.longitude,
        accuracy: fallbackPos.coords.accuracy
      };
    } catch (fallbackErr: any) {
      let msg = 'বর্তমান লোকেশন পাওয়া যায়নি। আপনি ম্যাপে ক্লিক করে বা এলাকা সার্চ করে লোকেশন সেট করতে পারেন।';
      let code: GeolocationResult['errorCode'] = 'POSITION_UNAVAILABLE';

      if (fallbackErr?.code === 1) {
        msg = 'লোকেশন পারমিশন দেওয়া হয়নি। ব্রাউজার সেটিংসে গিয়ে লোকেশন এলাউ (Allow) করুন।';
        code = 'PERMISSION_DENIED';
      } else if (fallbackErr?.code === 3) {
        msg = 'লোকেশন শনাক্ত করতে সময় বেশি লেগেছে। অনুগ্রহ করে ম্যাপে সরাসরি সিলেক্ট করুন।';
        code = 'TIMEOUT';
      }

      return {
        success: false,
        error: msg,
        errorCode: code
      };
    }
  }
}
