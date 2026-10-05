/**
 * Asia/Dhaka (Bangladesh Standard Time, UTC+6) Date & Time Utilities
 */

/**
 * Returns current Date in Bangladesh Time (Asia/Dhaka, UTC+6)
 */
export function getDhakaDate(now?: Date): Date {
  const target = now || new Date();
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
}

/**
 * Returns YYYY-MM-DD for any given Date or ISO string in Bangladesh Time (Asia/Dhaka)
 */
export function getDhakaDateString(dateInput?: string | Date): string {
  const target = dateInput ? (typeof dateInput === 'string' ? new Date(dateInput) : dateInput) : new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(target);
}

/**
 * Returns YYYY-MM-DD for today in Bangladesh Time (Asia/Dhaka)
 */
export function getTodayDateString(): string {
  return getDhakaDateString(new Date());
}

/**
 * Returns YYYY-MM-DD for yesterday in Bangladesh Time (Asia/Dhaka)
 */
export function getYesterdayDateString(): string {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return getDhakaDateString(yesterday);
}

/**
 * Returns grace-period status for previous day's token claims.
 * Window: 00:00 -> 11:59 AM Bangladesh Time (Asia/Dhaka).
 */
export function getGracePeriodInfo(): {
  inGracePeriod: boolean;
  todayDateStr: string;
  yesterdayDateStr: string;
  currentHour: number;
  currentMinute: number;
  remainingMinutes: number;
} {
  const now = new Date();
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  const parts = timeFormatter.formatToParts(now);
  let hour = 0;
  let minute = 0;
  for (const p of parts) {
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
  }

  // Grace period runs from 00:00 to 11:59:59 (hour 0 through 11)
  const inGracePeriod = hour < 12;
  const todayDateStr = getTodayDateString();
  const yesterdayDateStr = getYesterdayDateString();

  // Calculate minutes remaining until 12:00 PM
  let remainingMinutes = 0;
  if (inGracePeriod) {
    const endMinutes = 12 * 60; // 720 minutes from midnight
    const currentMinutes = hour * 60 + minute;
    remainingMinutes = Math.max(0, endMinutes - currentMinutes);
  }

  return {
    inGracePeriod,
    todayDateStr,
    yesterdayDateStr,
    currentHour: hour,
    currentMinute: minute,
    remainingMinutes
  };
}

/**
 * Normalizes phone numbers to standard 11-digit Bangladeshi format (01XXXXXXXXX)
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+880')) {
    cleaned = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('880')) {
    cleaned = '0' + cleaned.substring(3);
  }
  return cleaned;
}

/**
 * Checks if a given date or today in Bangladesh/Dhaka is Friday.
 */
export function isFriday(dateInput?: string | Date): boolean {
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
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        weekday: 'short'
      });
      return formatter.format(dateInput) === 'Fri';
    }
  }
  const dhaka = getDhakaDate();
  return dhaka.getDay() === 5;
}

/**
 * Standard secure phone masking for customer privacy in merchant-visible reports/PDFs.
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return 'N/A';
  const clean = phone.trim();
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}*******${clean.slice(8)}`;
  }
  if (clean.length > 11) {
    const cleanNoCountry = clean.startsWith('+88') ? clean.slice(3) : clean;
    if (cleanNoCountry.length === 11) {
      return `+88${cleanNoCountry.slice(0, 3)}*******${cleanNoCountry.slice(8)}`;
    }
    return `${clean.slice(0, 3)}*******${clean.slice(-3)}`;
  }
  if (clean.length >= 6) {
    return `${clean.slice(0, 2)}*******${clean.slice(-2)}`;
  }
  return clean;
}


