import { PrayerType } from '../types';
import * as adhanModule from 'adhan';

const adhan: any = (adhanModule as any).default || adhanModule;
const Coordinates = adhan.Coordinates;
const CalculationMethod = adhan.CalculationMethod;
const AdhanPrayerTimes = adhan.PrayerTimes;
const Madhab = adhan.Madhab;

export interface LocationCoords {
  latitude: number;
  longitude: number;
  locationName?: string;
  source: 'gps' | 'district' | 'default';
}

export interface CalculatedPrayerTime {
  type: PrayerType;
  nameBn: string;
  nameEn: string;
  startTime: Date; // Exact JavaScript Date for start of prayer
  reminderTime: Date; // Exactly 10 minutes before startTime
  formattedTimeBn: string; // e.g., "০৫:১০ AM"
  formattedReminderBn: string; // e.g., "০৫:০০ AM"
}

export type LocationPrayerTimes = Partial<Record<PrayerType, CalculatedPrayerTime>> & Record<string, CalculatedPrayerTime>;

// Comprehensive district coordinates in Bangladesh for fallback and GPS nearest-district lookup
export const DISTRICT_COORDINATES: Record<string, { lat: number; lng: number; nameBn: string }> = {
  'Dhaka': { lat: 23.8103, lng: 90.4125, nameBn: 'ঢাকা' },
  'Chattogram': { lat: 22.3569, lng: 91.7832, nameBn: 'চট্টগ্রাম' },
  'Sylhet': { lat: 24.8949, lng: 91.8687, nameBn: 'সিলেট' },
  'Rajshahi': { lat: 24.3745, lng: 88.6042, nameBn: 'রাজশাহী' },
  'Khulna': { lat: 22.8456, lng: 89.5403, nameBn: 'খুলনা' },
  'Barishal': { lat: 22.7010, lng: 90.3535, nameBn: 'বরিশাল' },
  'Rangpur': { lat: 25.7439, lng: 89.2752, nameBn: 'রংপুর' },
  'Mymensingh': { lat: 24.7471, lng: 90.4203, nameBn: 'ময়মনসিংহ' },
  'Cumilla': { lat: 23.4607, lng: 91.1809, nameBn: 'কুমিল্লা' },
  "Cox's Bazar": { lat: 21.4272, lng: 92.0058, nameBn: 'কক্সবাজার' },
  'Bogra': { lat: 24.8481, lng: 89.3730, nameBn: 'বগুড়া' },
  'Bogura': { lat: 24.8481, lng: 89.3730, nameBn: 'বগুড়া' },
  'Jashore': { lat: 23.1664, lng: 89.2081, nameBn: 'যশোর' },
  'Pabna': { lat: 24.0129, lng: 89.2530, nameBn: 'পাবনা' },
  'Noakhali': { lat: 22.8696, lng: 91.0993, nameBn: 'নোয়াখালী' },
  'Feni': { lat: 23.0159, lng: 91.3976, nameBn: 'ফেনী' },
  'Brahmanbaria': { lat: 23.9571, lng: 91.1119, nameBn: 'ব্রাহ্মণবাড়িয়া' },
  'Gazipur': { lat: 24.0023, lng: 90.4264, nameBn: 'গাজীপুর' },
  'Narayanganj': { lat: 23.6238, lng: 90.5000, nameBn: 'নারায়ণগঞ্জ' },
  'Tangail': { lat: 24.2513, lng: 89.9167, nameBn: 'টাঙ্গাইল' },
  'Kushtia': { lat: 23.9013, lng: 89.1204, nameBn: 'কুষ্টিয়া' },
  'Dinajpur': { lat: 25.6217, lng: 88.6354, nameBn: 'দিনাজপুর' },
  'Faridpur': { lat: 23.6071, lng: 89.8425, nameBn: 'ফরিদপুর' },
  'Kishoreganj': { lat: 24.4449, lng: 90.7766, nameBn: 'কিশোরগঞ্জ' },
  'Natore': { lat: 24.4102, lng: 88.9876, nameBn: 'নাটোর' },
  'Naogaon': { lat: 24.8103, lng: 88.9414, nameBn: 'নওগাঁ' },
  'Sirajganj': { lat: 24.4534, lng: 89.7008, nameBn: 'সিরাজগঞ্জ' },
  'Joypurhat': { lat: 25.1023, lng: 89.0270, nameBn: 'জয়পুরহাট' },
  'Chapainawabganj': { lat: 24.5965, lng: 88.2775, nameBn: 'চাঁপাইনবাবগঞ্জ' },
  'Kurigram': { lat: 25.8072, lng: 89.6295, nameBn: 'কুড়িগ্রাম' },
  'Gaibandha': { lat: 25.3297, lng: 89.5430, nameBn: 'গাইবান্ধা' },
  'Lalmonirhat': { lat: 25.9165, lng: 89.4532, nameBn: 'লালমনিরহাট' },
  'Nilphamari': { lat: 25.9312, lng: 88.8560, nameBn: 'নীলফামারী' },
  'Panchagarh': { lat: 26.3354, lng: 88.5517, nameBn: 'পঞ্চগড়' },
  'Thakurgaon': { lat: 26.0318, lng: 88.4684, nameBn: 'ঠাকুরগাঁও' },
  'Sherpur': { lat: 25.0188, lng: 90.0175, nameBn: 'শেরপুর' },
  'Jamalpur': { lat: 24.9220, lng: 89.9463, nameBn: 'জামালপুর' },
  'Netrokona': { lat: 24.8833, lng: 90.7333, nameBn: 'নেত্রকোণা' },
  'Habiganj': { lat: 24.3750, lng: 91.4167, nameBn: 'হবিগঞ্জ' },
  'Moulvibazar': { lat: 24.4833, lng: 91.7667, nameBn: 'মৌলভীবাজার' },
  'Sunamganj': { lat: 25.0667, lng: 91.4000, nameBn: 'সুনামগঞ্জ' },
  'Narsingdi': { lat: 23.9167, lng: 90.7167, nameBn: 'নরসিংদী' },
  'Manikganj': { lat: 23.8617, lng: 90.0003, nameBn: 'মানিকগঞ্জ' },
  'Munshiganj': { lat: 23.5500, lng: 90.5333, nameBn: 'মুন্সীগঞ্জ' },
  'Rajbari': { lat: 23.7574, lng: 89.6444, nameBn: 'রাজবাড়ী' },
  'Gopalganj': { lat: 23.0050, lng: 89.8266, nameBn: 'গোপালগঞ্জ' },
  'Madaripur': { lat: 23.1641, lng: 90.1897, nameBn: 'মাদারীপুর' },
  'Shariatpur': { lat: 23.2083, lng: 90.3528, nameBn: 'শরীয়তপুর' },
  'Satkhira': { lat: 22.7156, lng: 89.0700, nameBn: 'সাতক্ষীরা' },
  'Bagerhat': { lat: 22.6602, lng: 89.7895, nameBn: 'বাগেরহাট' },
  'Magura': { lat: 23.4855, lng: 89.4198, nameBn: 'মাগুরা' },
  'Narail': { lat: 23.1725, lng: 89.5126, nameBn: 'নড়াইল' },
  'Jhenaidah': { lat: 23.5450, lng: 89.1726, nameBn: 'ঝিনাইদহ' },
  'Chuadanga': { lat: 23.6401, lng: 88.8418, nameBn: 'চুয়াডাঙ্গা' },
  'Meherpur': { lat: 23.7622, lng: 88.6318, nameBn: 'মেহেরপুর' },
  'Bhola': { lat: 22.6859, lng: 90.6481, nameBn: 'ভোলা' },
  'Patuakhali': { lat: 22.3596, lng: 90.3299, nameBn: 'পটুয়াখালী' },
  'Barguna': { lat: 22.1558, lng: 90.1264, nameBn: 'বরগুনা' },
  'Jhalokati': { lat: 22.6422, lng: 90.1987, nameBn: 'ঝালকাঠি' },
  'Pirojpur': { lat: 22.5791, lng: 89.9759, nameBn: 'পিরোজপুর' },
  'Lakshmipur': { lat: 22.9447, lng: 90.8282, nameBn: 'লক্ষ্মীপুর' },
  'Chandpur': { lat: 23.2333, lng: 90.6667, nameBn: 'চাঁদপুর' },
  'Khagrachhari': { lat: 23.1193, lng: 91.9847, nameBn: 'খাগড়াছড়ি' },
  'Rangamati': { lat: 22.6533, lng: 92.1753, nameBn: 'রাঙ্গামাটি' },
  'Bandarban': { lat: 22.1953, lng: 92.2184, nameBn: 'বান্দরবান' }
};

/**
 * Finds the nearest district name in Bengali based on latitude and longitude
 */
export function findNearestDistrict(lat: number, lng: number, userDistrict?: string): string {
  if (userDistrict) {
    const matchKey = Object.keys(DISTRICT_COORDINATES).find(
      key => key.toLowerCase() === userDistrict.toLowerCase() ||
             DISTRICT_COORDINATES[key].nameBn === userDistrict
    );
    if (matchKey) {
      return DISTRICT_COORDINATES[matchKey].nameBn;
    }
  }

  let minDistanceSq = Infinity;
  let nearestName = 'ঢাকা';

  for (const key of Object.keys(DISTRICT_COORDINATES)) {
    const dist = DISTRICT_COORDINATES[key];
    const dLat = dist.lat - lat;
    const dLng = dist.lng - lng;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      nearestName = dist.nameBn;
    }
  }

  return nearestName;
}

const DEFAULT_COORDS: LocationCoords = {
  latitude: 23.8103,
  longitude: 90.4125,
  locationName: 'ঢাকা (ডিফল্ট)',
  source: 'default'
};

// Converts number to Bengali digits
function toBnDigits(numStr: string | number): string {
  const bnDigits: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
  };
  return String(numStr).replace(/\d/g, d => bnDigits[d] || d);
}

export function formatTimeBn(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hStr = hours < 10 ? `0${hours}` : `${hours}`;
  const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${toBnDigits(hStr)}:${toBnDigits(mStr)} ${ampm}`;
}

/**
 * Astronomical solar calculation fallback for Prayer Times
 */
function calculateSolarPrayerTimes(lat: number, lng: number, date: Date = new Date()) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);

  // Timezone offset in hours
  const tzOffsetHours = -d.getTimezoneOffset() / 60;

  // Day of year
  const startOfYear = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Solar declination & Equation of Time (approximate)
  const b = (2 * Math.PI * (dayOfYear - 81)) / 364;
  const eqTime = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b); // minutes
  const declination = 23.45 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365); // degrees

  const rad = (deg: number) => (deg * Math.PI) / 180;
  const deg = (rad: number) => (rad * 180) / Math.PI;

  const latRad = rad(lat);
  const declRad = rad(declination);

  // Solar Noon in local time
  const solarNoonMinutes = 720 - 4 * lng - eqTime + tzOffsetHours * 60;

  // Hour Angle helper
  const hourAngle = (angle: number) => {
    const angleRad = rad(angle);
    const cosHA = (Math.sin(angleRad) - Math.sin(latRad) * Math.sin(declRad)) / (Math.cos(latRad) * Math.cos(declRad));
    if (cosHA > 1) return 0;
    if (cosHA < -1) return 180;
    return deg(Math.acos(cosHA));
  };

  // Fajr: 18° below horizon
  const haFajr = hourAngle(-18);
  const fajrMin = solarNoonMinutes - (haFajr * 4);

  // Dhuhr: solar noon + 2 min safety margin
  const dhuhrMin = solarNoonMinutes + 2;

  // Asr: Shafi'i method (shadow factor = 1)
  const acot = (x: number) => Math.atan(1 / x);
  const asrAlt = deg(acot(1 + Math.tan(Math.abs(latRad - declRad))));
  const haAsr = hourAngle(asrAlt);
  const asrMin = solarNoonMinutes + (haAsr * 4);

  // Maghrib: 0.833° below horizon (sunset)
  const haMaghrib = hourAngle(-0.833);
  const maghribMin = solarNoonMinutes + (haMaghrib * 4);

  // Isha: 18° below horizon
  const haIsha = hourAngle(-18);
  const ishaMin = solarNoonMinutes + (haIsha * 4);

  const makeDate = (totalMinutes: number) => {
    const timeDate = new Date(date);
    const h = Math.floor(totalMinutes / 60);
    const m = Math.floor(totalMinutes % 60);
    timeDate.setHours(h, m, 0, 0);
    return timeDate;
  };

  return {
    fajr: makeDate(fajrMin),
    dhuhr: makeDate(dhuhrMin),
    asr: makeDate(asrMin),
    maghrib: makeDate(maghribMin),
    isha: makeDate(ishaMin)
  };
}

const aladhanCache: Record<string, { timesMap: { fajr: Date; dhuhr: Date; asr: Date; maghrib: Date; isha: Date }; timestamp: number }> = {};

/**
 * Fetch or Calculate Prayer Times for Location (Instant local calculation using Adhan)
 */
export async function calculatePrayerTimes(
  coords: LocationCoords,
  date: Date = new Date()
): Promise<LocationPrayerTimes> {
  const dhakaDate = getDhakaDateClient(date);
  const coordinates = new Coordinates(coords.latitude, coords.longitude);
  const params = CalculationMethod.Karachi();
  params.madhab = Madhab.Hanafi;

  let pt: any = null;
  try {
    pt = new AdhanPrayerTimes(coordinates, dhakaDate, params);
  } catch (err) {
    console.warn('Adhan JS library calculation failed, using solar calculation fallback:', err);
  }

  let timesMap: { fajr: Date; dhuhr: Date; jumuah: Date; asr: Date; maghrib: Date; isha: Date };

  if (pt && pt.fajr && pt.dhuhr && pt.asr && pt.maghrib && pt.isha) {
    timesMap = {
      fajr: pt.fajr,
      dhuhr: pt.dhuhr,
      jumuah: pt.dhuhr,
      asr: pt.asr,
      maghrib: pt.maghrib,
      isha: pt.isha
    };
  } else {
    const solar = calculateSolarPrayerTimes(coords.latitude, coords.longitude, date);
    timesMap = {
      ...solar,
      jumuah: solar.dhuhr
    };
  }

  const namesBn: Record<PrayerType, string> = {
    fajr: 'ফজর',
    dhuhr: 'যোহর',
    jumuah: 'জুমআ',
    asr: 'আসর',
    maghrib: 'মাগরিব',
    isha: 'এশা'
  };

  const namesEn: Record<PrayerType, string> = {
    fajr: 'Fajr',
    dhuhr: 'Dhuhr',
    jumuah: "Jumu'ah",
    asr: 'Asr',
    maghrib: 'Maghrib',
    isha: 'Isha'
  };

  const prayers: PrayerType[] = ['fajr', 'dhuhr', 'jumuah', 'asr', 'maghrib', 'isha'];
  const result = {} as LocationPrayerTimes;

  prayers.forEach(p => {
    const startTime = timesMap[p];
    // Exactly 10 minutes before prayer start time
    const reminderTime = new Date(startTime.getTime() - 10 * 60 * 1000);

    result[p] = {
      type: p,
      nameBn: namesBn[p],
      nameEn: namesEn[p],
      startTime,
      reminderTime,
      formattedTimeBn: formatTimeBn(startTime),
      formattedReminderBn: formatTimeBn(reminderTime)
    };
  });

  // Calculate Jumu'ah for Friday (same start/reminder time as Dhuhr)
  const dhuhrTime = timesMap.dhuhr;
  const jumuahReminder = new Date(dhuhrTime.getTime() - 10 * 60 * 1000);
  result['jumuah'] = {
    type: 'jumuah',
    nameBn: 'জুমআ',
    nameEn: "Jumu'ah",
    startTime: dhuhrTime,
    reminderTime: jumuahReminder,
    formattedTimeBn: formatTimeBn(dhuhrTime),
    formattedReminderBn: formatTimeBn(jumuahReminder)
  };

  return result;
}

// In-memory cache & pending promise to avoid redundant concurrent hardware GPS queries
const LOCATION_STORAGE_KEY = 'cave_cached_location_v2';

const loadStoredLocation = (): { coords: LocationCoords; timestamp: number } | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.coords && typeof parsed.timestamp === 'number') {
        // Valid for up to 30 minutes
        if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          return parsed;
        }
      }
    }
  } catch (e) {}
  return null;
};

let cachedLocationResult: { coords: LocationCoords; timestamp: number } | null = loadStoredLocation();
let pendingLocationPromise: Promise<LocationCoords> | null = null;

/**
 * Synchronous fast initial coordinates based on district or cached location
 */
export function getFastInitialLocation(userDistrict?: string): LocationCoords {
  if (!cachedLocationResult) {
    cachedLocationResult = loadStoredLocation();
  }
  if (cachedLocationResult) {
    return cachedLocationResult.coords;
  }
  return getDistrictLocationFallback(userDistrict);
}

/**
 * Get device GPS coordinates or user's selected district coordinates
 */
export function getSavedOrGpsLocation(userDistrict?: string): Promise<LocationCoords> {
  const now = Date.now();
  // Return cached result if less than 15 minutes old
  if (!cachedLocationResult) {
    cachedLocationResult = loadStoredLocation();
  }
  if (cachedLocationResult && (now - cachedLocationResult.timestamp < 15 * 60 * 1000)) {
    return Promise.resolve(cachedLocationResult.coords);
  }

  // Deduplicate ongoing request
  if (pendingLocationPromise) {
    return pendingLocationPromise;
  }

  pendingLocationPromise = new Promise<LocationCoords>(resolve => {
    let resolved = false;
    const finish = (loc: LocationCoords) => {
      if (resolved) return;
      resolved = true;
      cachedLocationResult = { coords: loc, timestamp: Date.now() };
      try {
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(cachedLocationResult));
      } catch (e) {}
      pendingLocationPromise = null;
      resolve(loc);
    };

    // 1. Try Browser GPS with fast 800ms timeout to avoid UI blocking
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const districtName = findNearestDistrict(position.coords.latitude, position.coords.longitude, userDistrict);
          finish({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            locationName: districtName,
            source: 'gps'
          });
        },
        error => {
          finish(getDistrictLocationFallback(userDistrict));
        },
        { timeout: 800, maximumAge: 600000 }
      );
    } else {
      finish(getDistrictLocationFallback(userDistrict));
    }
  });

  return pendingLocationPromise;
}

function getDistrictLocationFallback(userDistrict?: string): LocationCoords {
  if (userDistrict) {
    const matchKey = Object.keys(DISTRICT_COORDINATES).find(
      key => key.toLowerCase() === userDistrict.toLowerCase() ||
             DISTRICT_COORDINATES[key].nameBn === userDistrict
    );
    if (matchKey) {
      const item = DISTRICT_COORDINATES[matchKey];
      return {
        latitude: item.lat,
        longitude: item.lng,
        locationName: item.nameBn,
        source: 'district'
      };
    }
  }

  // Check saved district in localStorage
  const storedDistrict = localStorage.getItem('user_district');
  if (storedDistrict && DISTRICT_COORDINATES[storedDistrict]) {
    const item = DISTRICT_COORDINATES[storedDistrict];
    return {
      latitude: item.lat,
      longitude: item.lng,
      locationName: item.nameBn,
      source: 'district'
    };
  }

  return DEFAULT_COORDS;
}

export function getDhakaDateClient(now?: Date): Date {
  const target = now || new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(target);
    const map: Record<string, string> = {};
    for (const part of parts) {
      map[part.type] = part.value;
    }
    return new Date(
      `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`
    );
  } catch (e) {
    return target;
  }
}

export function getDhakaDateStringClient(dateInput?: string | Date): string {
  const target = dateInput ? (typeof dateInput === 'string' ? new Date(dateInput) : dateInput) : new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(target);
}

export function isFridayClient(dateInput?: string | Date): boolean {
  if (dateInput) {
    if (typeof dateInput === 'string') {
      const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const y = parseInt(match[1], 10);
        const m = parseInt(match[2], 10) - 1;
        const d = parseInt(match[3], 10);
        const dt = new Date(Date.UTC(y, m, d, 12, 0, 0));
        return dt.getUTCDay() === 5;
      }
    } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Dhaka',
          weekday: 'short'
        });
        return formatter.format(dateInput) === 'Fri';
      } catch (e) {
        return dateInput.getDay() === 5;
      }
    }
  }
  const dhakaStr = getDhakaDateStringClient();
  return isFridayClient(dhakaStr);
}

/**
 * Returns the Canonical Operational Prayer Date (YYYY-MM-DD) on the client side.
 * For midnight-crossing prayer windows (Isha prayed between 00:00 and Fajr start):
 * maps to the previous calendar day's prayer cycle.
 */
export function getCanonicalPrayerDateClient(
  prayerType: PrayerType | string,
  customTime?: Date | string,
  lat?: number,
  lng?: number
): string {
  const nowUtc = customTime ? (typeof customTime === 'string' ? new Date(customTime) : customTime) : new Date();
  const dhakaDate = getDhakaDateClient(nowUtc);
  const coordinates = new Coordinates(lat || 23.8103, lng || 90.4125);
  const params = CalculationMethod.Karachi();
  params.madhab = Madhab.Hanafi;

  const pt = new AdhanPrayerTimes(coordinates, dhakaDate, params);

  if (prayerType === 'isha') {
    if (nowUtc < pt.fajr) {
      const prevDay = new Date(dhakaDate.getTime() - 24 * 60 * 60 * 1000);
      return getDhakaDateStringClient(prevDay);
    }
  }

  return getDhakaDateStringClient(nowUtc);
}

/**
 * Returns the currently active operational prayer date on client.
 */
export function getOperationalPrayerDateClient(
  customTime?: Date | string,
  lat?: number,
  lng?: number
): string {
  const nowUtc = customTime ? (typeof customTime === 'string' ? new Date(customTime) : customTime) : new Date();
  const dhakaDate = getDhakaDateClient(nowUtc);
  const coordinates = new Coordinates(lat || 23.8103, lng || 90.4125);
  const params = CalculationMethod.Karachi();
  params.madhab = Madhab.Hanafi;

  const pt = new AdhanPrayerTimes(coordinates, dhakaDate, params);

  if (nowUtc < pt.fajr) {
    const prevDay = new Date(dhakaDate.getTime() - 24 * 60 * 60 * 1000);
    return getDhakaDateStringClient(prevDay);
  }
  return getDhakaDateStringClient(nowUtc);
}

/**
 * Formats the Islamic Hijri date string on the client.
 */
export function getHijriDateStringClient(dateInput?: string | Date): string {
  const target = dateInput ? (typeof dateInput === 'string' ? new Date(dateInput) : dateInput) : new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    return formatter.format(target);
  } catch (e) {
    return '';
  }
}

export function isClientPrayerTimeValidOffline(
  prayerType: string,
  lat?: number,
  lng?: number,
  gender?: string,
  customTime?: Date
): { valid: boolean; reason?: string } {
  const nowUtc = customTime || new Date();
  const dhakaDate = getDhakaDateClient(nowUtc);
  const dhakaIsFriday = isFridayClient(nowUtc);

  // Friday Rule Validation:
  if (dhakaIsFriday && prayerType === 'dhuhr') {
    return {
      valid: false,
      reason: 'আজ শুক্রবার, জোহর-এর পরিবর্তে জুমআ সালাত যাচাই করুন।'
    };
  }

  if (!dhakaIsFriday && prayerType === 'jumuah') {
    return {
      valid: false,
      reason: 'জুমআ সালাত শুধুমাত্র শুক্রবারেই প্রযোজ্য। অনুগ্রহ করে যোহর সালাত যাচাই করুন।'
    };
  }

  // Default to Dhaka coordinates if not provided
  const coordinates = new Coordinates(lat || 23.8103, lng || 90.4125);
  const params = CalculationMethod.Karachi(); // Hanafi
  params.madhab = Madhab.Hanafi; // Hanafi for Asr

  const pt = new AdhanPrayerTimes(coordinates, dhakaDate, params);

  // Next and previous day for seamless boundary calculation
  const prevDay = new Date(dhakaDate.getTime() - 24 * 60 * 60 * 1000);
  const ptPrev = new AdhanPrayerTimes(coordinates, prevDay, params);

  const nextDay = new Date(dhakaDate.getTime() + 24 * 60 * 60 * 1000);
  const ptNext = new AdhanPrayerTimes(coordinates, nextDay, params);

  // If currently early morning before Fajr, the active Isha window is yesterday's Isha until today's Fajr
  let ishaStart = pt.isha;
  let ishaEnd = ptNext.fajr;
  if (nowUtc < pt.fajr) {
    ishaStart = ptPrev.isha;
    ishaEnd = pt.fajr;
  }

  // Create windows
  const times = {
    fajr: { start: pt.fajr, end: pt.sunrise },
    dhuhr: { start: pt.dhuhr, end: pt.asr },
    jumuah: { start: pt.dhuhr, end: pt.asr },
    asr: { start: pt.asr, end: pt.maghrib },
    maghrib: { start: pt.maghrib, end: pt.isha },
    isha: { start: ishaStart, end: ishaEnd }
  };

  const window = times[prayerType as keyof typeof times];
  if (!window) {
    return { valid: false, reason: 'অবৈধ ওয়াক্ত' };
  }

  // Grace period before / after. 5 mins buffer
  const bufferMs = 5 * 60 * 1000;
  const validStart = new Date(window.start.getTime() - bufferMs);
  const validEnd = new Date(window.end.getTime() + bufferMs);

  if (nowUtc >= validStart && nowUtc <= validEnd) {
    return { valid: true };
  } else {
    if (nowUtc < validStart) {
      return { valid: false, reason: 'সালাতের সময় এখনো শুরু হয়নি। সময় হলে সালাত সম্পন্ন করুন।' };
    } else {
      return { valid: false, reason: 'এই সালাতের সময় শেষ হয়েছে।' };
    }
  }
}
