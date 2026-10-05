import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, ChevronRight, BarChart3, AlertCircle, Info, Sunrise, Sun, SunMedium, Sunset, Moon } from 'lucide-react';
import { Coordinates, CalculationMethod, PrayerTimes as AdhanPrayerTimes, Madhab } from 'adhan';
import { getSavedOrGpsLocation, getFastInitialLocation, getDhakaDateClient, isFridayClient } from '../services/prayerTimeService';
import { toBnNumber, formatBnDate, getHijriDate, parseAppDate } from '../data/prayerConfig';
import { api } from '../services/api';
import { JourneyTeaser, TodayPrayerStatus, PrayerType, UserToken } from '../types';
import { offlineSyncService } from '../services/offlineSyncService';
import { useLanguage } from '../context/LanguageContext';

interface DailyProgressCardProps {
  todayStatus?: TodayPrayerStatus | null;
  completedCount: number;
  totalPrayers?: number;
  dateStr: string;
  userDistrict?: string;
  userGender?: string;
  onOpenJourney?: () => void;
  onOpenTokens?: () => void;
  onOpenTokenRules?: () => void;
}

interface CircularPrayerCountdownProps {
  coords: { lat: number; lng: number } | null;
  onCurrentWaqtChange?: (waqtKey: string) => void;
}

// Elegant Mosque Silhouette Icon matching user screenshot
const MosqueEmblem: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    aria-hidden="true"
  >
    {/* Central Dome */}
    <path d="M12 3.5c-.3 0-.6.2-.6.5v.4C9.8 5 8.7 6.6 8.7 8.5v1.2h6.6V8.5c0-1.9-1.1-3.5-2.7-4.1V4c0-.3-.3-.5-.6-.5z" />
    {/* Crescent Top */}
    <path d="M12 1.6a1 1 0 1 0 1 1 .25.25 0 0 1-.5 0 .5.5 0 1 1-.5-.5.25.25 0 0 1 0-.5z" />
    {/* Main Facade */}
    <path d="M7 11.2h10V20H7z" />
    {/* Arch Portal */}
    <path d="M10.2 20v-3.2a1.8 1.8 0 0 1 3.6 0V20h-3.6z" className="text-[#041913]" fill="currentColor" />
    {/* Left Minaret */}
    <path d="M4.6 9.8l.9-1.8.9 1.8V20h-1.8V9.8zm.5-2.5a.4.4 0 1 0 0-.8.4.4 0 0 0 0 .8z" />
    {/* Right Minaret */}
    <path d="M17.6 9.8l.9-1.8.9 1.8V20h-1.8V9.8zm.5-2.5a.4.4 0 1 0 0-.8.4.4 0 0 0 0 .8z" />
  </svg>
);

// Circular Countdown Dial Component matching user screenshot
const CircularPrayerCountdown: React.FC<CircularPrayerCountdownProps> = React.memo(({ coords, onCurrentWaqtChange }) => {
  const { t, language } = useLanguage();
  const timeRef = useRef<HTMLSpanElement>(null);
  const prayerNameRef = useRef<HTMLHeadingElement>(null);
  const statusLabelRef = useRef<HTMLSpanElement>(null);
  const progressCircleRef = useRef<SVGCircleElement>(null);
  const lastWaqtKeyRef = useRef<string>('');
  const forbiddenBadgeRef = useRef<HTMLDivElement>(null);

  // Circumference for r=43: 2 * Math.PI * 43 ≈ 270.18
  const CIRCUMFERENCE = 270.18;

  useEffect(() => {
    if (!coords) return;

    let cachedDateStr = '';
    let ptCache: any = null;
    let ptTomorrowCache: any = null;

    const updateDOM = () => {
      const nowUtc = new Date();
      const dhakaDate = getDhakaDateClient(nowUtc);
      const dateKey = `${dhakaDate.getFullYear()}-${dhakaDate.getMonth()}-${dhakaDate.getDate()}_${coords.lat}_${coords.lng}`;

      if (dateKey !== cachedDateStr || !ptCache) {
        cachedDateStr = dateKey;
        const coordinates = new Coordinates(coords.lat, coords.lng);
        const params = CalculationMethod.Karachi();
        params.madhab = Madhab.Hanafi;
        ptCache = new AdhanPrayerTimes(coordinates, dhakaDate, params);
        const tomorrow = new Date(dhakaDate.getTime() + 24 * 60 * 60 * 1000);
        ptTomorrowCache = new AdhanPrayerTimes(coordinates, tomorrow, params);
      }

      const pt = ptCache;
      const ptTomorrow = ptTomorrowCache;
      const isFriday = isFridayClient(nowUtc);

      let nextName = '';
      let waqtKey = 'fajr';
      let startTime = new Date();
      let targetTime = new Date();
      let isEnding = true;

      if (nowUtc < pt.fajr) {
        nextName = language === 'bn' ? 'ফজর' : 'Fajr';
        waqtKey = 'fajr';
        startTime = new Date(pt.fajr.getTime() - 8 * 60 * 60 * 1000);
        targetTime = pt.fajr;
        isEnding = false;
      } else if (nowUtc >= pt.fajr && nowUtc < pt.sunrise) {
        nextName = language === 'bn' ? 'ফজর' : 'Fajr';
        waqtKey = 'fajr';
        startTime = pt.fajr;
        targetTime = pt.sunrise;
        isEnding = true;
      } else if (nowUtc >= pt.sunrise && nowUtc < pt.dhuhr) {
        nextName = language === 'bn' ? (isFriday ? "জুম'আ" : 'যোহর') : (isFriday ? "Jumu'ah" : 'Dhuhr');
        waqtKey = isFriday ? 'jumuah' : 'dhuhr';
        startTime = pt.sunrise;
        targetTime = pt.dhuhr;
        isEnding = false;
      } else if (nowUtc >= pt.dhuhr && nowUtc < pt.asr) {
        nextName = language === 'bn' ? (isFriday ? "জুম'আ" : 'যোহর') : (isFriday ? "Jumu'ah" : 'Dhuhr');
        waqtKey = isFriday ? 'jumuah' : 'dhuhr';
        startTime = pt.dhuhr;
        targetTime = pt.asr;
        isEnding = true;
      } else if (nowUtc >= pt.asr && nowUtc < pt.maghrib) {
        nextName = language === 'bn' ? 'আসর' : 'Asr';
        waqtKey = 'asr';
        startTime = pt.asr;
        targetTime = pt.maghrib;
        isEnding = true;
      } else if (nowUtc >= pt.maghrib && nowUtc < pt.isha) {
        nextName = language === 'bn' ? 'মাগরিব' : 'Maghrib';
        waqtKey = 'maghrib';
        startTime = pt.maghrib;
        targetTime = pt.isha;
      } else {
        nextName = language === 'bn' ? 'এশা' : 'Isha';
        waqtKey = 'isha';
        startTime = pt.isha;
        targetTime = ptTomorrow.fajr;
        isEnding = true;
      }

      // ONLY notify parent if waqt key actually changed (5 times a day instead of every second!)
      if (lastWaqtKeyRef.current !== waqtKey) {
        lastWaqtKeyRef.current = waqtKey;
        if (onCurrentWaqtChange) {
          onCurrentWaqtChange(waqtKey);
        }
      }

      const isSunriseForbidden = nowUtc >= pt.sunrise && nowUtc < new Date(pt.sunrise.getTime() + 15 * 60 * 1000);
      const isMiddayForbidden = nowUtc >= new Date(pt.dhuhr.getTime() - 7 * 60 * 1000) && nowUtc < pt.dhuhr;
      const isSunsetForbidden = nowUtc >= new Date(pt.maghrib.getTime() - 15 * 60 * 1000) && nowUtc < pt.maghrib;
      const isForbidden = isSunriseForbidden || isMiddayForbidden || isSunsetForbidden;

      const totalDuration = Math.max(1, targetTime.getTime() - startTime.getTime());
      const elapsed = Math.max(0, Math.min(totalDuration, nowUtc.getTime() - startTime.getTime()));
      const progressFraction = isEnding 
        ? Math.max(0, Math.min(1, 1 - elapsed / totalDuration)) 
        : Math.max(0, Math.min(1, elapsed / totalDuration));

      const diffMs = Math.max(0, targetTime.getTime() - nowUtc.getTime());
      const diffSecondsTotal = Math.floor(diffMs / 1000);

      const hours = Math.floor(diffSecondsTotal / 3600);
      const minutes = Math.floor((diffSecondsTotal % 3600) / 60);
      const seconds = diffSecondsTotal % 60;

      const hStr = String(hours).padStart(2, '0');
      const mStr = String(minutes).padStart(2, '0');
      const sStr = String(seconds).padStart(2, '0');

      const formatted = language === 'bn'
        ? `${toBnNumber(hStr)}:${toBnNumber(mStr)}:${toBnNumber(sStr)}`
        : `${hStr}:${mStr}:${sStr}`;

      if (timeRef.current) {
        timeRef.current.textContent = formatted;
      }

      if (prayerNameRef.current) {
        prayerNameRef.current.textContent = nextName;
      }

      if (statusLabelRef.current) {
        statusLabelRef.current.textContent = isEnding 
          ? (language === 'bn' ? 'শেষ হতে বাকি' : 'Time Left')
          : (language === 'bn' ? 'শুরু হতে বাকি' : 'Starts In');
      }

      if (progressCircleRef.current) {
        const activeArcLength = Math.max(0.08, progressFraction) * CIRCUMFERENCE;
        progressCircleRef.current.style.strokeDasharray = `${activeArcLength} ${CIRCUMFERENCE}`;
      }

      if (forbiddenBadgeRef.current) {
        forbiddenBadgeRef.current.style.display = isForbidden ? 'inline-flex' : 'none';
      }
    };

    updateDOM();
    const timer = setInterval(updateDOM, 1000);
    return () => clearInterval(timer);
  }, [coords, language, t, onCurrentWaqtChange]);

  return (
    <div 
      className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center shrink-0 select-none"
      style={{ transform: 'translate3d(0, 0, 0)', backfaceVisibility: 'hidden' }}
    >
      {/* Background Soft Emerald Radial Gradient (Zero GPU Blur Overhead) */}
      <div className="absolute inset-1 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.14)_0%,transparent_75%)] pointer-events-none" />

      {/* SVG Circular Progress Dial */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full -rotate-90 pointer-events-none"
        style={{ transform: 'rotate(-90deg) translateZ(0)', shapeRendering: 'geometricPrecision' }}
      >
        <defs>
          <linearGradient id="emeraldDialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* Outer Fine Ring */}
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="#0d3b2f"
          strokeWidth="1"
          strokeDasharray="2 3"
          className="opacity-40"
        />

        {/* Inactive Track Ring */}
        <circle
          cx="50"
          cy="50"
          r="41"
          fill="none"
          stroke="#072920"
          strokeWidth="5"
          className="opacity-95"
        />

        {/* Active Glowing Progress Arc */}
        <circle
          ref={progressCircleRef}
          cx="50"
          cy="50"
          r="41"
          fill="none"
          stroke="url(#emeraldDialGrad)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeDasharray="45 270.18"
          strokeDashoffset="0"
          style={{ transition: 'stroke-dasharray 0.4s ease-out' }}
        />
      </svg>

      {/* Center Widget Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1 space-y-0.5 pointer-events-none">
        {/* Mosque Emblem */}
        <div className="text-emerald-300 drop-shadow-sm -mt-1 transform transition-transform">
          <MosqueEmblem className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>

        {/* Waqt Name */}
        <h3
          ref={prayerNameRef}
          className="text-xs sm:text-sm font-bold text-white tracking-tight leading-tight drop-shadow-sm"
        >
          {language === 'bn' ? 'ফজর' : 'Fajr'}
        </h3>

        {/* Status Label (e.g. শেষ হতে বাকি) */}
        <span
          ref={statusLabelRef}
          className="text-[9px] sm:text-[10px] text-emerald-200/70 font-medium tracking-wide leading-none"
        >
          {language === 'bn' ? 'শেষ হতে বাকি' : 'Time Left'}
        </span>

        {/* Monospace Amber Digital Timer */}
        <span
          ref={timeRef}
          className="text-xs sm:text-sm font-black font-mono tracking-wider text-[#fbbf24] leading-tight pt-0.5 drop-shadow-[0_0_8px_rgba(251,191,36,0.35)]"
        >
          {language === 'bn' ? '০০:০২:৩৬' : '00:02:36'}
        </span>

        {/* Forbidden Prayer Alert */}
        <div
          ref={forbiddenBadgeRef}
          style={{ display: 'none' }}
          className="items-center gap-1 text-[8px] font-bold text-rose-300 bg-rose-950/90 border border-rose-600/40 px-1.5 py-0.5 rounded-full absolute -bottom-2 shadow-lg"
        >
          <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
          {t('prayer.forbidden')}
        </div>
      </div>
    </div>
  );
});

let cachedTeaserData: { teaser: JourneyTeaser; timestamp: number } | null = null;
let cachedTokensData: { tokens: UserToken[]; timestamp: number } | null = null;

export const clearDailyProgressCardCache = () => {
  cachedTeaserData = null;
  cachedTokensData = null;
};

export const DailyProgressCard: React.FC<DailyProgressCardProps> = React.memo(({
  todayStatus,
  completedCount,
  totalPrayers = 5,
  dateStr,
  userDistrict,
  userGender,
  onOpenJourney,
  onOpenTokens,
  onOpenTokenRules
}) => {
  const { language } = useLanguage();
  const hijri = getHijriDate(dateStr);
  const isFemale = (userGender || '').toLowerCase() === 'female';

  const [teaser, setTeaser] = useState<JourneyTeaser | null>(null);
  const [todayToken, setTodayToken] = useState<UserToken | null>(null);
  const [currentActiveWaqt, setCurrentActiveWaqt] = useState<string>('fajr');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(() => {
    const init = getFastInitialLocation(userDistrict);
    return { lat: init.latitude, lng: init.longitude };
  });
  const [offlinePendingState, setOfflinePendingState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const checkOffline = () => {
      const types: PrayerType[] = ['fajr', 'dhuhr', 'jumuah', 'asr', 'maghrib', 'isha'];
      const map: Record<string, boolean> = {};
      types.forEach(t => {
        map[t] = Boolean(offlineSyncService.isPrayerPendingInOfflineQueue(t));
      });
      setOfflinePendingState(map);
    };

    checkOffline();
    window.addEventListener('cave_offline_queue_updated', checkOffline);
    return () => {
      window.removeEventListener('cave_offline_queue_updated', checkOffline);
    };
  }, []);

  const isFriday = useMemo(() => {
    if (typeof todayStatus?.isFriday === 'boolean') {
      return todayStatus.isFriday;
    }
    return isFridayClient(new Date());
  }, [todayStatus?.isFriday]);

  // Compute 5-Prayer Timings based on Location & Adhan Engine
  const prayerTimings = useMemo(() => {
    if (!coords) {
      return {
        fajr: language === 'bn' ? '০৪:৪৩' : '04:43',
        dhuhr: language === 'bn' ? '১২:০৫' : '12:05',
        asr: language === 'bn' ? '০৩:৪৪' : '03:44',
        maghrib: language === 'bn' ? '০৫:৪৮' : '05:48',
        isha: language === 'bn' ? '০৭:৩৩' : '07:33',
      };
    }

    try {
      const dhakaDate = getDhakaDateClient(new Date());
      const coordinates = new Coordinates(coords.lat, coords.lng);
      const params = CalculationMethod.Karachi();
      params.madhab = Madhab.Hanafi;
      const pt = new AdhanPrayerTimes(coordinates, dhakaDate, params);

      const formatTime = (d: Date) => {
        let hours = d.getHours();
        const minutes = d.getMinutes();
        hours = hours % 12;
        hours = hours ? hours : 12;
        const hStr = String(hours).padStart(2, '0');
        const mStr = String(minutes).padStart(2, '0');
        return language === 'bn' ? `${toBnNumber(hStr)}:${toBnNumber(mStr)}` : `${hStr}:${mStr}`;
      };

      return {
        fajr: formatTime(pt.fajr),
        dhuhr: formatTime(pt.dhuhr),
        asr: formatTime(pt.asr),
        maghrib: formatTime(pt.maghrib),
        isha: formatTime(pt.isha),
      };
    } catch {
      return {
        fajr: language === 'bn' ? '০৪:৪৩' : '04:43',
        dhuhr: language === 'bn' ? '১২:০৫' : '12:05',
        asr: language === 'bn' ? '০৩:৪৪' : '03:44',
        maghrib: language === 'bn' ? '০৫:৪৮' : '05:48',
        isha: language === 'bn' ? '০৭:৩৩' : '07:33',
      };
    }
  }, [coords, language]);

  const prayerSteps = useMemo(() => {
    const dhuhrOrJumuahKey: PrayerType = isFriday ? 'jumuah' : 'dhuhr';
    const dhuhrOrJumuahLabel = isFriday
      ? (language === 'bn' ? "জুম'আ" : "Jumu'ah")
      : (language === 'bn' ? 'যোহর' : 'Dhuhr');

    const checkDone = (type: PrayerType) => {
      if (todayStatus?.prayers && (todayStatus.prayers as any)[type]) {
        return Boolean((todayStatus.prayers as any)[type]?.completed);
      }
      if (todayStatus?.attendances && Array.isArray(todayStatus.attendances)) {
        return todayStatus.attendances.some((a: any) => {
          if (type === 'jumuah' || type === 'dhuhr') {
            return a.prayerType === 'jumuah' || a.prayerType === 'dhuhr';
          }
          return a.prayerType === type;
        });
      }
      return false;
    };

    return [
      { 
        key: 'fajr' as PrayerType, 
        label: language === 'bn' ? 'ফজর' : 'Fajr', 
        time: prayerTimings.fajr,
        icon: Sunrise,
        isDone: checkDone('fajr') || Boolean(offlinePendingState['fajr']),
        isActive: currentActiveWaqt === 'fajr'
      },
      { 
        key: dhuhrOrJumuahKey, 
        label: dhuhrOrJumuahLabel, 
        time: prayerTimings.dhuhr,
        icon: Sun,
        isDone: checkDone('jumuah') || checkDone('dhuhr') || Boolean(offlinePendingState['jumuah']) || Boolean(offlinePendingState['dhuhr']),
        isActive: currentActiveWaqt === 'dhuhr' || currentActiveWaqt === 'jumuah'
      },
      { 
        key: 'asr' as PrayerType, 
        label: language === 'bn' ? 'আসর' : 'Asr', 
        time: prayerTimings.asr,
        icon: SunMedium,
        isDone: checkDone('asr') || Boolean(offlinePendingState['asr']),
        isActive: currentActiveWaqt === 'asr'
      },
      { 
        key: 'maghrib' as PrayerType, 
        label: language === 'bn' ? 'মাগরিব' : 'Maghrib', 
        time: prayerTimings.maghrib,
        icon: Sunset,
        isDone: checkDone('maghrib') || Boolean(offlinePendingState['maghrib']),
        isActive: currentActiveWaqt === 'maghrib'
      },
      { 
        key: 'isha' as PrayerType, 
        label: language === 'bn' ? 'এশা' : 'Isha', 
        time: prayerTimings.isha,
        icon: Moon,
        isDone: checkDone('isha') || Boolean(offlinePendingState['isha']),
        isActive: currentActiveWaqt === 'isha'
      },
    ];
  }, [isFriday, todayStatus?.prayers, offlinePendingState, language, prayerTimings, currentActiveWaqt]);

  useEffect(() => {
    let isMounted = true;
    const token = typeof window !== 'undefined' ? localStorage.getItem('cave_companions_auth_token') : null;
    if (cachedTeaserData && (Date.now() - cachedTeaserData.timestamp < 60000)) {
      setTeaser(cachedTeaserData.teaser);
    } else {
      api.getJourneySummary().then(res => {
        if (isMounted && res?.teaser) {
          cachedTeaserData = { teaser: res.teaser, timestamp: Date.now() };
          setTeaser(res.teaser);
        }
      }).catch(err => {
        console.warn('Failed to load journey teaser:', err);
      });
    }

    if (cachedTokensData && (Date.now() - cachedTokensData.timestamp < 60000)) {
      const todayStr = dateStr || new Date().toISOString().split('T')[0];
      const match = cachedTokensData.tokens.find(t => t.earnedDate === todayStr);
      if (match && isMounted) {
        setTodayToken(match);
      }
    } else {
      api.getMyTokens().then(res => {
        if (isMounted && res?.success) {
          const todayStr = dateStr || new Date().toISOString().split('T')[0];
          const allTokens = [...(res.availableTokens || []), ...(res.usedTokens || [])];
          cachedTokensData = { tokens: allTokens, timestamp: Date.now() };
          const match = allTokens.find(t => t.earnedDate === todayStr);
          if (match) {
            setTodayToken(match);
          }
        }
      }).catch(err => {
        console.warn('Failed to load tokens:', err);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [completedCount, dateStr]);

  useEffect(() => {
    let isMounted = true;
    getSavedOrGpsLocation(userDistrict).then(loc => {
      if (isMounted) {
        setCoords(prev => {
          if (prev && Math.abs(prev.lat - loc.latitude) < 0.0001 && Math.abs(prev.lng - loc.longitude) < 0.0001) {
            return prev;
          }
          return { lat: loc.latitude, lng: loc.longitude };
        });
      }
    }).catch(() => {
      if (isMounted) {
        setCoords(prev => prev || { lat: 23.8103, lng: 90.4125 });
      }
    });
    return () => { isMounted = false; };
  }, [userDistrict]);

  // Token Tier details with refined quiet luxury palette
  const tokenTierInfo = useMemo(() => {
    const effectiveCount = completedCount;
    const tokenType = todayToken?.tokenType;

    if (tokenType === 'GOLD' || effectiveCount >= 5) {
      return {
        type: 'GOLD',
        tokenName: language === 'bn' ? 'গোল্ড টোকেন' : 'Gold Token',
        emoji: '🥇',
        headline: language === 'bn' ? 'আজ আপনার অর্জিত' : "Today's Earnings",
        textColor: 'text-[#f59e0b]',
        badgeBg: 'bg-amber-950/40 border-amber-500/40'
      };
    }
    if (tokenType === 'SILVER' || effectiveCount === 4) {
      return {
        type: 'SILVER',
        tokenName: language === 'bn' ? 'সিলভার টোকেন' : 'Silver Token',
        emoji: '🥈',
        headline: language === 'bn' ? 'আজ আপনার অর্জিত' : "Today's Earnings",
        textColor: 'text-slate-200',
        badgeBg: 'bg-slate-800/40 border-slate-400/40'
      };
    }
    if (tokenType === 'BRONZE' || effectiveCount === 3) {
      return {
        type: 'BRONZE',
        tokenName: language === 'bn' ? 'ব্রোঞ্জ টোকেন' : 'Bronze Token',
        emoji: '🥉',
        headline: language === 'bn' ? 'আজ আপনার অর্জিত' : "Today's Earnings",
        textColor: 'text-amber-600',
        badgeBg: 'bg-amber-950/40 border-amber-700/40'
      };
    }
    return {
      type: 'NONE',
      tokenName: language === 'bn' ? 'কোনো টোকেন নেই' : 'No Token',
      emoji: '🪙',
      headline: language === 'bn' ? 'আজ আপনার অর্জিত' : "Today's Earnings",
      textColor: 'text-[#f59e0b]',
      badgeBg: 'bg-[#06241b] border-[#0f4d3c]'
    };
  }, [todayToken, completedCount, language]);

  const gregorianDateText = useMemo(() => {
    if (language === 'bn') return formatBnDate(dateStr);
    try {
      const d = parseAppDate(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }, [dateStr, language]);

  return (
    <div 
      style={{ transform: 'translate3d(0, 0, 0)', backfaceVisibility: 'hidden' }}
      className="relative overflow-hidden rounded-[30px] sm:rounded-[34px] border border-[#13493b]/70 bg-gradient-to-b from-[#041d16] via-[#031711] to-[#02110c] p-4.5 sm:p-5.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] text-white space-y-4 sm:space-y-4.5"
    >
      {/* Zero-Lag Ambient Radial Accents */}
      <div className="absolute top-0 right-0 w-52 h-52 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.09)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-52 h-52 bg-[radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.05)_0%,transparent_70%)] pointer-events-none" />

      {/* 1. Top Header: Hijri Date & Gregorian Date */}
      <div className="flex items-center gap-3.5 relative z-10">
        {/* Calendar Icon Badge - Quiet Luxury Metallic Glass */}
        <div className="w-10.5 h-10.5 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#083025] to-[#041a14] border border-[#d4af37]/35 flex items-center justify-center text-[#fbbf24] shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(251,191,36,0.2)]">
          <Calendar className="w-5 h-5 text-[#fbbf24] drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]" />
        </div>

        {/* 2-Line Date Typography */}
        <div className="flex flex-col min-w-0 justify-center">
          <h2 className="text-sm sm:text-base font-bold text-[#f8fafc] tracking-tight leading-tight truncate drop-shadow-sm">
            {language === 'bn' 
              ? (hijri.bengali || '১৫ই রবিউস সানি ১৪৪৮ হিজরী') 
              : (hijri.english || '15 Rabi al-Thani 1448 AH')}
          </h2>
          <span className="text-xs text-emerald-200/60 font-medium leading-tight mt-0.5 truncate tracking-wide">
            {gregorianDateText}
          </span>
        </div>
      </div>

      {/* Subtle Luxury Half-Divider Line under Date (Matching Reference Image) */}
      <div className="w-[68%] sm:w-[65%] h-[1px] bg-gradient-to-r from-emerald-500/35 via-[#105643]/55 to-transparent relative z-10 -mt-1 -mb-0.5" />

      {/* 2. Middle Row: Left (Today's Salah Stats) & Right (Circular Dial Timer) */}
      <div className="flex items-center justify-between gap-2 px-1 pt-0.5 relative z-10">
        {/* Left Stats Section */}
        <div className="flex flex-col justify-center space-y-0.5">
          <span className="text-sm sm:text-base font-medium text-slate-200 tracking-tight">
            {language === 'bn' ? 'আজকের সালাত' : "Today's Salah"}
          </span>

          <div className="flex items-baseline gap-1 pt-1">
            <span 
              className="text-4xl sm:text-5xl font-black text-[#fbbf24] font-mono tracking-tight leading-none drop-shadow-[0_0_14px_rgba(251,191,36,0.35)]"
            >
              {language === 'bn' ? toBnNumber(completedCount) : completedCount}
            </span>
            <span className="text-2xl sm:text-3xl font-light text-emerald-500/40 mx-1">
              /
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-slate-300 font-mono">
              {language === 'bn' ? toBnNumber(totalPrayers) : totalPrayers}
            </span>
          </div>

          <span className="text-xs sm:text-sm font-medium text-emerald-200/60 pt-1 tracking-wide">
            {isFemale 
              ? (language === 'bn' ? 'সালাত সম্পন্ন' : 'Prayers Completed') 
              : (language === 'bn' ? 'সালাত সম্পন্ন' : 'Prayers Completed')}
          </span>
        </div>

        {/* Right Circular Dial Widget */}
        <CircularPrayerCountdown 
          coords={coords} 
          onCurrentWaqtChange={setCurrentActiveWaqt} 
        />
      </div>

      {/* 3. 5-Prayer Timings Grid Container (Refined Luxury Tile Layout) */}
      <div className="rounded-[22px] bg-gradient-to-b from-[#021812]/95 to-[#01110c]/95 border border-[#0d4233]/70 p-2.5 sm:p-3 shadow-inner relative z-10">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center">
          {prayerSteps.map((step, idx) => {
            const IconComponent = step.icon;
            const isDone = Boolean(step.isDone);
            const isActive = Boolean(step.isActive);

            return (
              <div 
                key={`dpc-waqt-${step.key}-${idx}`} 
                className={`flex flex-col items-center justify-between py-1.5 px-0.5 rounded-xl transition-all duration-300 ${
                  isDone 
                    ? 'bg-[#181203]/40 border border-[#d4af37]/20 shadow-[0_2px_8px_rgba(212,175,55,0.06)]' 
                    : isActive 
                      ? 'bg-[#06281e]/60 border border-emerald-500/25 shadow-[0_2px_8px_rgba(16,185,129,0.08)]' 
                      : 'bg-transparent border border-transparent'
                }`}
              >
                {/* Top Icon Badge */}
                <div className="h-9 flex items-center justify-center">
                  {isDone ? (
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-b from-amber-500/20 to-amber-950/50 border border-amber-400/70 flex items-center justify-center text-amber-300 ring-2 ring-amber-400/20 shadow-[0_0_12px_rgba(245,158,11,0.35)] transition-transform hover:scale-105">
                      <IconComponent className="w-4 h-4 text-amber-300 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]" />
                    </div>
                  ) : isActive ? (
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-b from-emerald-500/20 to-emerald-950/60 border border-emerald-400/70 flex items-center justify-center text-emerald-300 ring-3 ring-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.35)] transition-transform hover:scale-105">
                      <IconComponent className="w-4 h-4 text-emerald-300 drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-slate-400/70 hover:text-slate-300 transition-colors">
                      <IconComponent className="w-4 h-4 text-slate-400/80" />
                    </div>
                  )}
                </div>

                {/* Waqt Name */}
                <span className={`text-[11px] sm:text-xs font-bold truncate mt-1 tracking-tight ${
                  isDone 
                    ? 'text-amber-200 font-extrabold' 
                    : isActive 
                      ? 'text-emerald-300 font-bold' 
                      : 'text-slate-200'
                }`}>
                  {step.label}
                </span>

                {/* Waqt Calculated Time */}
                <span className={`text-[10px] sm:text-[11px] font-mono font-medium mt-0.5 ${
                  isDone 
                    ? 'text-amber-300/85' 
                    : isActive 
                      ? 'text-emerald-200/85' 
                      : 'text-slate-400'
                }`}>
                  {step.time}
                </span>

                {/* Bottom Glowing Bar Indicator */}
                <div className="w-full mt-2 px-1">
                  {isDone ? (
                    <div className="w-full h-1 sm:h-1.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 shadow-[0_0_10px_rgba(245,158,11,0.9)] transition-all" />
                  ) : isActive ? (
                    <div className="w-full h-1 sm:h-1.5 rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)] transition-all" />
                  ) : (
                    <div className="w-full h-1 sm:h-1.5 rounded-full bg-[#052219] border border-[#083628]" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Bottom Item 1: "আজ আপনার অর্জিত" (Today's Earnings) */}
      <button 
        type="button"
        onClick={() => {
          if (onOpenTokenRules) {
            onOpenTokenRules();
          } else if (onOpenTokens) {
            onOpenTokens();
          }
        }}
        className="w-full text-left p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-[#031d16]/95 via-[#04241c]/90 to-[#031d16]/95 hover:from-[#05261d] hover:to-[#041f17] border border-[#0d4435]/80 hover:border-emerald-500/40 flex items-center justify-between gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all cursor-pointer active:scale-[0.99] group relative z-10"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Golden Coin Icon matching screenshot */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#ffdf6b] via-[#e5a928] to-[#9c6a0c] p-0.5 shadow-[0_0_12px_rgba(245,158,11,0.4)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-full bg-gradient-to-b from-[#fcd34d] to-[#d97706] flex items-center justify-center border border-amber-200/40 text-amber-950 font-black text-sm">
              ★
            </div>
          </div>

          {/* 2-Line Typography */}
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <span className="text-xs text-slate-300 font-medium leading-tight">
              {tokenTierInfo.headline}
            </span>
            <span className={`text-sm sm:text-base font-bold ${tokenTierInfo.textColor} leading-tight mt-0.5 truncate`}>
              {tokenTierInfo.tokenName}
            </span>
          </div>
        </div>

        {/* Info & Chevron Icon */}
        <div className="flex items-center gap-2 shrink-0 text-emerald-400/80 group-hover:text-emerald-300 transition-colors">
          <Info className="w-4 h-4" />
          <ChevronRight className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </div>
      </button>

      {/* 5. Bottom Item 2: "আমার কেভ জার্নি" (My Cave Journey) */}
      {onOpenJourney && (
        <button
          onClick={onOpenJourney}
          className="w-full text-left p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-[#031d16]/95 via-[#04241c]/90 to-[#031d16]/95 hover:from-[#05261d] hover:to-[#041f17] border border-[#0d4435]/80 hover:border-emerald-500/40 transition-all flex items-center justify-between gap-3 cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.3)] active:scale-[0.99] group relative z-10"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Golden BarChart Icon Badge */}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#082e23] to-[#041a14] border border-[#d4af37]/35 flex items-center justify-center text-[#fbbf24] shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(251,191,36,0.2)] group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5 text-[#fbbf24] drop-shadow-[0_0_4px_rgba(251,191,36,0.35)]" />
            </div>

            {/* 2-Line Typography */}
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {language === 'bn' ? 'আমার কেভ জার্নি' : 'My Cave Journey'}
                </span>
                {teaser?.badgeText ? (
                  <span className="text-[10px] font-bold text-emerald-300 bg-[#083628] border border-[#0f543e] px-1.5 py-0.5 rounded-md">
                    {language === 'bn' ? teaser.badgeText : (teaser.badgeTextEn || teaser.badgeText)}
                  </span>
                ) : null}
              </div>
              <span className="text-xs text-emerald-200/60 font-normal truncate mt-0.5">
                {language === 'bn'
                  ? (teaser
                      ? (teaser.secondaryStat ? `${teaser.primaryStat} • ${teaser.secondaryStat}` : teaser.primaryStat)
                      : 'দ্বীনি জীবন ও আত্মিক অগ্রগতির পথচলা ...')
                  : (teaser
                      ? (teaser.primaryStatEn
                          ? (teaser.secondaryStatEn ? `${teaser.primaryStatEn} • ${teaser.secondaryStatEn}` : teaser.primaryStatEn)
                          : 'Your journey of faith, deeds & spiritual growth ...')
                      : 'Your journey of faith, deeds & spiritual growth ...')}
              </span>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-emerald-400/80 shrink-0 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all" />
        </button>
      )}
    </div>
  );
});
