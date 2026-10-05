import { PrayerInfo, PrayerType } from '../types';

export const PRAYERS_CONFIG: Record<PrayerType, PrayerInfo> = {
  fajr: {
    type: 'fajr',
    nameBn: 'ফজর',
    nameEn: 'Fajr',
    nameAr: 'الفجر',
    timeWindowBn: 'ভোর ৪:৪৫ - ভোর ৫:৫০',
    timeWindowEn: '04:45 AM - 05:50 AM',
    iconName: 'Sunrise',
    descriptionBn: 'ভোরের প্রথম ফরজ সালাত',
    rakats: '২ রাকাত ফরজ'
  },
  dhuhr: {
    type: 'dhuhr',
    nameBn: 'যোহর',
    nameEn: 'Dhuhr',
    nameAr: 'الظهر',
    timeWindowBn: 'দুপুর ১২:১৫ - বিকেল ৪:১৫',
    timeWindowEn: '12:15 PM - 04:15 PM',
    iconName: 'Sun',
    descriptionBn: 'দুপুরের চার রাকাত ফরজ সালাত',
    rakats: '৪ রাকাত ফরজ'
  },
  jumuah: {
    type: 'jumuah',
    nameBn: 'জুমআ',
    nameEn: "Jumu'ah",
    nameAr: 'الجمعة',
    timeWindowBn: 'দুপুর ১২:১৫ - বিকেল ৪:১৫',
    timeWindowEn: '12:15 PM - 04:15 PM',
    iconName: 'Sun',
    descriptionBn: 'শুক্রবার জুমআর দুই রাকাত ফরজ সালাত',
    rakats: '২ রাকাত ফরজ'
  },
  asr: {
    type: 'asr',
    nameBn: 'আসর',
    nameEn: 'Asr',
    nameAr: 'العصر',
    timeWindowBn: 'বিকেল ৪:৩০ - সন্ধ্যা ৬:২০',
    timeWindowEn: '04:30 PM - 06:20 PM',
    iconName: 'CloudSun',
    descriptionBn: 'বিকেলের মধ্যবর্তী সালাত',
    rakats: '৪ রাকাত ফরজ'
  },
  maghrib: {
    type: 'maghrib',
    nameBn: 'মাগরিব',
    nameEn: 'Maghrib',
    nameAr: 'المغرب',
    timeWindowBn: 'সন্ধ্যা ৬:২৫ - সন্ধ্যা ৭:৩০',
    timeWindowEn: '06:25 PM - 07:30 PM',
    iconName: 'Sunset',
    descriptionBn: 'সূর্যাস্তের পর প্রথম ফরজ সালাত',
    rakats: '৩ রাকাত ফরজ'
  },
  isha: {
    type: 'isha',
    nameBn: 'এশা',
    nameEn: 'Isha',
    nameAr: 'العشاء',
    timeWindowBn: 'রাত ৭:৪০ - রাত ৩:৩০',
    timeWindowEn: '07:40 PM - 03:30 AM',
    iconName: 'Moon',
    descriptionBn: 'রাতের শেষ ফরজ সালাত',
    rakats: '৪ রাকাত ফরজ'
  }
};

export const PRAYER_ORDER: PrayerType[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/**
 * Checks if a given date string (YYYY-MM-DD) or Date object is Friday
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
      return dateInput.getDay() === 5;
    }
  }
  return new Date().getDay() === 5;
}

/**
 * Returns today's prayer list order based on whether today/given date is Friday.
 * Sunday - Thursday, Saturday: Fajr, Dhuhr, Asr, Maghrib, Isha
 * Friday: Fajr, Jumu'ah, Asr, Maghrib, Isha
 */
export function getTodayPrayerOrder(dateInput?: string | Date): PrayerType[] {
  return isFriday(dateInput)
    ? ['fajr', 'jumuah', 'asr', 'maghrib', 'isha']
    : ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
}

export const HADITHS = [
  {
    textBn: 'রাসূলুল্লাহ ﷺ বলেছেন: "জামাতে নামাজের মর্যাদা একাকী নামাজের চেয়ে সাতাশ (২৭) গুণ বেশি।"',
    textEn: 'The Messenger of Allah ﷺ said: "Prayer in congregation is twenty-seven times more meritorious than a prayer performed individually."',
    sourceBn: 'সহিহ বুখারি: ৬৪৫, সহিহ মুসলিম: ৬৫০',
    sourceEn: 'Sahih Bukhari: 645, Sahih Muslim: 650'
  },
  {
    textBn: 'রাসূলুল্লাহ ﷺ বলেছেন: "যে ব্যক্তি এশার নামাজ জামাতে আদায় করল, সে যেন অর্ধেক রাত সালাত আদায় করল। আর যে ফজরের নামাজও জামাতে আদায় করল, সে যেন সারা রাত সালাত আদায় করল।"',
    textEn: 'The Messenger of Allah ﷺ said: "He who prays Isha in congregation, it is as if he prayed half the night; and whoever prays Fajr in congregation, it is as if he prayed the whole night."',
    sourceBn: 'সহিহ মুসলিম: ৬৫৬',
    sourceEn: 'Sahih Muslim: 656'
  },
  {
    textBn: 'রাসূলুল্লাহ ﷺ বলেছেন: "যে ব্যক্তি চল্লিশ দিন যাবত প্রথম তাকবিরের সাথে জামাতে নামাজ আদায় করবে, তার জন্য দুটি মুক্তিপত্র লেখা হবে: জাহান্নাম থেকে মুক্তি এবং মুনাফেকি থেকে মুক্তি।"',
    textEn: 'The Messenger of Allah ﷺ said: "Whoever prays to Allah in congregation for forty days, catching the first takbir, two freedoms are written for him: freedom from the Fire and freedom from hypocrisy."',
    sourceBn: 'জামে আত-তিরমিজি: ২৪১',
    sourceEn: 'Jami at-Tirmidhi: 241'
  }
];

export function formatNumber(num: number | string | null | undefined, lang: 'bn' | 'en' = 'bn'): string {
  if (num === null || num === undefined) return lang === 'bn' ? '০' : '0';
  if (lang === 'bn') {
    return toBnNumber(num);
  }
  return String(num);
}

export function toBnNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return '০';
  const digits: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
  };
  return String(num).replace(/\d/g, d => digits[d] || d);
}

export function formatBnTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('bn-BD', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return isoString;
  }
}

const ISLAMIC_MONTHS_BN = [
  'মুহররম', 'সফর', 'রবিউল আউয়াল', 'রবিউস সানি',
  'জমাদিউল আউয়াল', 'জমাদিউস সানি', 'রজব', 'শাবান',
  'রমজান', 'শাওয়াল', 'জিলকদ', 'জিলহজ্জ'
];

const ISLAMIC_MONTHS_EN = [
  'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
  'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
];

const GREGORIAN_MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const BN_WEEKDAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
const EN_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface HijriDateInfo {
  bengali: string;
  bengaliWithDay: string;
  english: string;
  englishWithDay: string;
  monthBn: string;
  dayBn: string;
  yearBn: string;
  weekdayBn: string;
}

export function parseAppDate(dateInput?: string | Date): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? new Date() : dateInput;
  if (typeof dateInput === 'string') {
    // Check if it's YYYY-MM-DD
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return new Date(year, month, day, 12, 0, 0);
    }
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  return new Date();
}

/**
 * Returns Gregorian (English) date in Bengali
 * e.g. "সোমবার, ২৪ আগস্ট ২০২৬" or "২৪ আগস্ট ২০২৬"
 */
export function formatGregorianBnDate(dateInput?: string | Date, includeWeekday: boolean = false): string {
  try {
    const d = parseAppDate(dateInput);
    const weekday = BN_WEEKDAYS[d.getDay()] || '';
    const day = toBnNumber(d.getDate());
    const month = GREGORIAN_MONTHS_BN[d.getMonth()] || '';
    const year = toBnNumber(d.getFullYear());

    if (includeWeekday && weekday) {
      return `${weekday}, ${day} ${month} ${year}`;
    }
    return `${day} ${month} ${year}`;
  } catch (e) {
    return typeof dateInput === 'string' ? dateInput : '';
  }
}

/**
 * Calculates and returns Hijri Date in Bengali
 * Format: "১১ ই রবিউল আউয়াল ১৪৪৮ হিজরী"
 */
export function getHijriDate(dateInput?: string | Date): HijriDateInfo {
  try {
    const date = parseAppDate(dateInput);
    const weekdayBn = BN_WEEKDAYS[date.getDay()] || '';

    // To align with Islamic Foundation Bangladesh standards,
    // the Hijri calendar date is calculated as 1 day behind Saudi Umm al-Qura.
    const dateForHijri = new Date(date.getTime() - 24 * 60 * 60 * 1000);

    let day = 1;
    let month = 1;
    let year = 1448;
    let found = false;

    // 1. Try Intl with numeric parts to get precise Hijri day, month number (1-12), and year
    try {
      const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
      });
      const parts = formatter.formatToParts(dateForHijri);
      const dStr = parts.find(p => p.type === 'day')?.value;
      const mStr = parts.find(p => p.type === 'month')?.value;
      const yStr = parts.find(p => p.type === 'year')?.value;

      if (dStr && mStr && yStr) {
        const parsedD = parseInt(dStr, 10);
        const parsedM = parseInt(mStr, 10);
        const parsedY = parseInt(yStr, 10);
        if (!isNaN(parsedD) && !isNaN(parsedM) && !isNaN(parsedY) && parsedM >= 1 && parsedM <= 12 && parsedY > 1400) {
          day = parsedD;
          month = parsedM;
          year = parsedY;
          found = true;
        }
      }
    } catch (err) {}

    if (!found) {
      try {
        const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-nu-latn', {
          day: 'numeric',
          month: 'numeric',
          year: 'numeric'
        });
        const parts = formatter.formatToParts(dateForHijri);
        const dStr = parts.find(p => p.type === 'day')?.value;
        const mStr = parts.find(p => p.type === 'month')?.value;
        const yStr = parts.find(p => p.type === 'year')?.value;

        if (dStr && mStr && yStr) {
          const parsedD = parseInt(dStr, 10);
          const parsedM = parseInt(mStr, 10);
          const parsedY = parseInt(yStr, 10);
          if (!isNaN(parsedD) && !isNaN(parsedM) && !isNaN(parsedY) && parsedM >= 1 && parsedM <= 12 && parsedY > 1400) {
            day = parsedD;
            month = parsedM;
            year = parsedY;
            found = true;
          }
        }
      } catch (err) {}
    }

    // 2. Algorithmic Fallback
    if (!found) {
      const jd = Math.floor((dateForHijri.getTime() / 86400000) + 2440587.5);
      const l = jd - 1948440 + 10632;
      const n = Math.floor((l - 1) / 10631);
      const l2 = l - 10631 * n + 354;
      const j = (Math.floor((10985 - l2) / 5316)) * (Math.floor((50 * l2) / 17719)) + (Math.floor(l2 / 5670)) * (Math.floor((43 * l2) / 15238));
      const l3 = l2 - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
      const m = Math.floor((24 * l3) / 709);
      const d = l3 - Math.floor((709 * m) / 24);
      const y = 30 * n + j - 30;

      month = Math.max(1, Math.min(12, m));
      day = Math.max(1, Math.min(30, d));
      year = y;
    }

    const monthIndex = Math.max(0, Math.min(11, month - 1));
    const monthBn = ISLAMIC_MONTHS_BN[monthIndex] || 'রবিউল আউয়াল';
    const monthEn = ISLAMIC_MONTHS_EN[monthIndex] || 'Rabi al-Awwal';
    const weekdayEn = EN_WEEKDAYS[date.getDay()] || '';
    const dayBn = toBnNumber(day);
    const yearBn = toBnNumber(year);

    const bengali = `${dayBn} ই ${monthBn} ${yearBn} হিজরী`;
    const bengaliWithDay = `${weekdayBn}, ${bengali}`;
    const english = `${day} ${monthEn} ${year} AH`;
    const englishWithDay = `${weekdayEn}, ${english}`;

    return { bengali, bengaliWithDay, english, englishWithDay, monthBn, dayBn, yearBn, weekdayBn };
  } catch (e) {
    return { bengali: '', bengaliWithDay: '', english: '', englishWithDay: '', monthBn: '', dayBn: '', yearBn: '', weekdayBn: '' };
  }
}

export function formatBnDate(dateString: string): string {
  return formatGregorianBnDate(dateString, true);
}

export function formatBnHijriDate(dateInput?: string | Date): string {
  return getHijriDate(dateInput).bengali;
}

export function formatBnFullHijriDate(dateInput?: string | Date): string {
  return getHijriDate(dateInput).bengaliWithDay;
}

