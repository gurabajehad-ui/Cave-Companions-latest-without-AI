import * as adhanModule from 'adhan';

const adhan: any = (adhanModule as any).default || adhanModule;
const Coordinates = adhan.Coordinates;
const CalculationMethod = adhan.CalculationMethod;
const PrayerTimes = adhan.PrayerTimes;
const Madhab = adhan.Madhab;

import { getDhakaDate, getDhakaDateString, isFriday } from './timezone.js';

/**
 * Calculates geographic distance in meters between two lat/lng coordinates using the Haversine formula.
 */
export function calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Returns the Canonical Operational Prayer Date (YYYY-MM-DD) for any prayer attendance.
 * Crucial for midnight-crossing prayer windows (e.g. Isha):
 * - If Isha is prayed between midnight and Fajr start (00:00 - 04:30), it belongs to the PREVIOUS day's prayer cycle.
 * - If Isha is prayed in the evening (19:30 - 23:59), it belongs to TODAY's prayer cycle.
 * - For daytime prayers (Fajr, Dhuhr, Asr, Maghrib), canonical date is the calendar date in Bangladesh time.
 */
export function getCanonicalPrayerDate(
  prayerType: string,
  customTime?: Date | string,
  lat?: number,
  lng?: number
): string {
  const nowUtc = customTime ? (typeof customTime === 'string' ? new Date(customTime) : customTime) : new Date();
  const dhakaDate = getDhakaDate(nowUtc);
  const coordinates = new Coordinates(lat || 23.8103, lng || 90.4125);
  const params = CalculationMethod.Karachi();
  params.madhab = Madhab.Hanafi;

  const pt = new PrayerTimes(coordinates, dhakaDate, params);

  // If prayer is Isha and timestamp is in the early morning before today's Fajr begins
  if (prayerType === 'isha') {
    if (nowUtc < pt.fajr) {
      const prevDay = new Date(dhakaDate.getTime() - 24 * 60 * 60 * 1000);
      return getDhakaDateString(prevDay);
    }
  }

  return getDhakaDateString(nowUtc);
}

/**
 * Returns the currently active operational prayer date.
 * If current time is between midnight and Fajr, the active prayer cycle is the previous evening (yesterday).
 * Once Fajr begins, the active prayer cycle becomes today.
 */
export function getOperationalPrayerDate(
  customTime?: Date | string,
  lat?: number,
  lng?: number
): string {
  const nowUtc = customTime ? (typeof customTime === 'string' ? new Date(customTime) : customTime) : new Date();
  const dhakaDate = getDhakaDate(nowUtc);
  const coordinates = new Coordinates(lat || 23.8103, lng || 90.4125);
  const params = CalculationMethod.Karachi();
  params.madhab = Madhab.Hanafi;

  const pt = new PrayerTimes(coordinates, dhakaDate, params);

  if (nowUtc < pt.fajr) {
    const prevDay = new Date(dhakaDate.getTime() - 24 * 60 * 60 * 1000);
    return getDhakaDateString(prevDay);
  }
  return getDhakaDateString(nowUtc);
}

/**
 * Formats the Islamic (Hijri) date string in Bangladesh timezone.
 */
export function getHijriDateString(dateInput?: string | Date): string {
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

export function isPrayerTimeValid(
  prayerType: string,
  lat?: number,
  lng?: number,
  gender?: string,
  customTime?: Date
): { valid: boolean; reason?: string } {
  const nowUtc = customTime || new Date();
  const dhakaDate = getDhakaDate(nowUtc);
  const dhakaIsFriday = isFriday(nowUtc);

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

  const pt = new PrayerTimes(coordinates, dhakaDate, params);

  // Next and previous day for seamless boundary calculation
  const prevDay = new Date(dhakaDate.getTime() - 24 * 60 * 60 * 1000);
  const ptPrev = new PrayerTimes(coordinates, prevDay, params);

  const nextDay = new Date(dhakaDate.getTime() + 24 * 60 * 60 * 1000);
  const ptNext = new PrayerTimes(coordinates, nextDay, params);

  // If currently early morning before Fajr, the active Isha window is yesterday's Isha until today's Fajr
  let ishaStart = pt.isha;
  let ishaEnd = ptNext.fajr;
  if (nowUtc < pt.fajr) {
    ishaStart = ptPrev.isha;
    ishaEnd = pt.fajr;
  }

  // Create windows:
  // Fajr: Fajr to Sunrise
  // Dhuhr / Jumu'ah: Dhuhr to Asr
  // Asr: Asr to Maghrib
  // Maghrib: Maghrib to Isha
  // Isha: Isha to next day's Fajr
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
    // Determine if it's too early or too late
    if (nowUtc < validStart) {
      return { valid: false, reason: 'সালাতের সময় এখনো শুরু হয়নি। সময় হলে সালাত সম্পন্ন করুন।' };
    } else {
      return { valid: false, reason: 'এই সালাতের সময় শেষ হয়েছে।' };
    }
  }
}
