import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Flame,
  Award,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldCheck,
  Zap,
  Check,
  BookOpen,
  Activity,
  Heart,
  Plus,
  Info,
  TrendingUp,
  Coins,
  Smile,
  HelpCircle
} from 'lucide-react';
import { api } from '../services/api';
import {
  JourneySummaryResponse,
  JourneyCalendarResponse,
  JourneyDayDetailResponse,
  CalendarDayInfo,
  UserToken
} from '../types';
import { toBnNumber, formatBnDate, getHijriDate } from '../data/prayerConfig';
import { useLanguage } from '../context/LanguageContext';
import { journeyDataService, DonationImpactData } from '../services/journeyDataService';

interface SalahJourneyViewProps {
  onBack?: () => void;
  onOpenTasbih?: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, msg: string) => void;
}

export const SalahJourneyView: React.FC<SalahJourneyViewProps> = ({
  onBack,
  onOpenTasbih,
  onShowToast
}) => {
  const { language } = useLanguage();
  const formatNum = (val: number | string) => (language === 'bn' ? toBnNumber(val) : String(val));

  // Current Date formatting
  const todayDateObj = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => todayDateObj.toISOString().split('T')[0], [todayDateObj]);

  const hijriInfo = useMemo(() => getHijriDate(todayDateObj), [todayDateObj]);

  const formattedTodayGregorian = useMemo(() => {
    if (language === 'bn') {
      return formatBnDate(todayStr);
    }
    return todayDateObj.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [language, todayStr, todayDateObj]);

  const formattedTodayHijri = useMemo(() => {
    return language === 'bn' ? hijriInfo.bengali : hijriInfo.english;
  }, [language, hijriInfo]);

  // Main active tab
  const [activeTab, setActiveTab] = useState<'today' | 'calendar' | 'details' | 'summary' | 'records'>('today');

  // Sub tab inside details section
  const [worshipTab, setWorshipTab] = useState<'salah' | 'sawm' | 'quran' | 'tasbih' | 'donation'>('salah');

  // API Data States
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summary, setSummary] = useState<JourneySummaryResponse | null>(null);

  // Calendar States
  const [currentYear, setCurrentYear] = useState(todayDateObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(todayDateObj.getMonth() + 1);
  const [calendarData, setCalendarData] = useState<JourneyCalendarResponse | null>(null);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [dayDetail, setDayDetail] = useState<JourneyDayDetailResponse | null>(null);
  const [loadingDayDetail, setLoadingDayDetail] = useState(false);

  // Local Journey Records (Sawm, Quran, Tasbih)
  const [sawmRecord, setSawmRecord] = useState(() => journeyDataService.getSawmRecord(todayStr));
  const [quranMinutes, setQuranMinutes] = useState(() => journeyDataService.getQuranMinutes(todayStr));
  const [tasbihCount, setTasbihCount] = useState(() => journeyDataService.getTasbihCount(todayStr));

  // Donation Impact Data
  const [myTokensData, setMyTokensData] = useState<any>(null);
  const [donationImpact, setDonationImpact] = useState<DonationImpactData>(() =>
    journeyDataService.calculateDonationImpact(null)
  );

  // Monthly aggregated totals
  const monthlySawm = useMemo(
    () => journeyDataService.getMonthlySawmCount(currentYear, currentMonth),
    [currentYear, currentMonth, sawmRecord]
  );
  const monthlyQuran = useMemo(
    () => journeyDataService.getMonthlyQuranMinutes(currentYear, currentMonth),
    [currentYear, currentMonth, quranMinutes]
  );
  const monthlyTasbih = useMemo(
    () => journeyDataService.getMonthlyTasbihCount(currentYear, currentMonth),
    [currentYear, currentMonth, tasbihCount]
  );

  // Management Modal
  const [showManageModal, setShowManageModal] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Fetch Journey Summary from API
  const fetchSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      const res = await api.getJourneySummary();
      setSummary(res);
    } catch (err: any) {
      console.error('Failed to load journey summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // Fetch Tokens for Donation Impact
  const fetchTokens = useCallback(async () => {
    try {
      const data = await api.getMyTokens();
      setMyTokensData(data);
      const calculated = journeyDataService.calculateDonationImpact(data);
      setDonationImpact(calculated);
    } catch (e) {
      console.warn('Failed to load user tokens for donation impact calculation:', e);
    }
  }, []);

  // Fetch Calendar Data
  const fetchCalendar = useCallback(async (year: number, month: number) => {
    try {
      setLoadingCalendar(true);
      const res = await api.getJourneyCalendar(year, month);
      setCalendarData(res);
    } catch (err: any) {
      console.error('Failed to load calendar data:', err);
    } finally {
      setLoadingCalendar(false);
    }
  }, []);

  // Fetch Day Detail
  const fetchDayDetail = useCallback(async (dateStr: string) => {
    try {
      setLoadingDayDetail(true);
      setSelectedDate(dateStr);
      const res = await api.getJourneyDayDetail(dateStr);
      setDayDetail(res);
    } catch (err: any) {
      console.error('Failed to load day detail:', err);
    } finally {
      setLoadingDayDetail(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSummary();
    fetchTokens();
  }, [fetchSummary, fetchTokens]);

  useEffect(() => {
    if (activeTab === 'calendar') {
      fetchCalendar(currentYear, currentMonth);
    }
  }, [activeTab, currentYear, currentMonth, fetchCalendar]);

  useEffect(() => {
    fetchDayDetail(selectedDate);
  }, [selectedDate, fetchDayDetail]);

  // Handlers for Local Actions
  const handleToggleSawm = (completed: boolean, type: 'fard' | 'ramadan' | 'sunnah' | 'nafil' = 'fard') => {
    const updated = journeyDataService.setSawmRecord(todayStr, completed, type);
    setSawmRecord(updated);
    if (completed) {
      onShowToast(
        'success',
        language === 'bn' ? 'আলহামদুলিল্লাহ' : 'Alhamdulillah',
        language === 'bn' ? 'আজকের সাওম রেকর্ড করা হয়েছে।' : 'Today\'s fast has been recorded.'
      );
    }
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(prev => prev - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(prev => prev + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Start New Journey
  const handleStartNewJourney = async () => {
    try {
      setActionInProgress(true);
      const res = await api.startNewJourney();
      onShowToast('success', language === 'bn' ? 'সফল' : 'Success', res.message || (language === 'bn' ? 'নতুন কেভ জার্নি শুরু হয়েছে!' : 'New Cave Journey started!'));
      setShowManageModal(false);
      await fetchSummary();
      await fetchCalendar(currentYear, currentMonth);
    } catch (err: any) {
      onShowToast('error', language === 'bn' ? 'ত্রুটি' : 'Error', err?.message || (language === 'bn' ? 'নতুন জার্নি শুরু করা যায়নি।' : 'Failed to start new journey.'));
    } finally {
      setActionInProgress(false);
    }
  };

  // Reset local trackers (Quran minutes & Tasbih count) for today to correct any test values
  const handleResetTodayLocalData = () => {
    // Set to 0 in local storage
    journeyDataService.setQuranMinutes(todayStr, 0);
    journeyDataService.setTasbihCount(todayStr, 0);
    
    // Update local state
    setQuranMinutes(0);
    setTasbihCount(0);
    
    onShowToast(
      'success',
      language === 'bn' ? 'রিসেট সম্পন্ন হয়েছে' : 'Reset Completed',
      language === 'bn' ? 'আজকের কুরআন সময় ও জিকির গণনা মুছে ০ করা হয়েছে।' : 'Today\'s Quran time and Tasbih counts have been set to 0.'
    );
    setShowManageModal(false);
  };

  // Current Streak display
  const currentStreakDays = summary?.currentStreak || 0;
  const isStreakActive = currentStreakDays > 0;

  // Today's verified prayers count (e.g., 5/5 or 3/5)
  const todayCompletedPrayers = useMemo(() => {
    if (!summary) return 0;
    return summary.todayCompletedPrayers ?? 0;
  }, [summary]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 pb-12 animate-fade-in text-slate-100">
      {/* TOP HEADER BAR */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
              title={language === 'bn' ? 'ফিরে যান' : 'Go Back'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                <Sparkles className="w-4 h-4" />
              </span>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {language === 'bn' ? 'আমার কেভ জার্নি' : 'My Cave Journey'}
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {language === 'bn'
                ? 'আপনার ভালো কাজের পথচলার একটি ব্যক্তিগত স্মৃতি।'
                : 'A personal record of your journey of good deeds.'}
            </p>
          </div>
        </div>

        {/* Options Button */}
        <button
          onClick={() => setShowManageModal(true)}
          className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-emerald-700/60 text-xs font-bold text-slate-300 hover:text-emerald-400 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
          <span>{language === 'bn' ? 'অপশন' : 'Options'}</span>
        </button>
      </div>

      {/* TODAY DATE BAR (BILINGUAL GREGORIAN + HIJRI) */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-800/50 flex flex-wrap items-center justify-between gap-2 shadow-inner">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-300">
            {language === 'bn' ? 'আজ:' : 'Today:'}
          </span>
          <span className="text-xs font-black text-white">
            {formattedTodayGregorian}
          </span>
        </div>
        <div className="text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-800/50 px-2.5 py-1 rounded-xl">
          {formattedTodayHijri}
        </div>
      </div>

      {/* MAIN NAVIGATION TABS */}
      <div className="grid grid-cols-5 gap-1 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl">
        {[
          { id: 'today', label: language === 'bn' ? 'আজ' : 'Today', icon: Zap },
          { id: 'calendar', label: language === 'bn' ? 'ক্যালেন্ডার' : 'Calendar', icon: CalendarIcon },
          { id: 'details', label: language === 'bn' ? 'আমলসমূহ' : 'Activities', icon: BookOpen },
          { id: 'summary', label: language === 'bn' ? 'মাসিক' : 'Monthly', icon: Award },
          { id: 'records', label: language === 'bn' ? 'রেকর্ড' : 'Records', icon: Flame }
        ].map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={`sj-tab-${tab.id}-${idx}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TODAY'S JOURNEY CENTRAL CARD */}
      {/* ========================================================================= */}
      {activeTab === 'today' && (
        <div className="space-y-4">
          {/* Central Today's Journey Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950/40 to-slate-950 border border-emerald-800/60 shadow-2xl relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-800/40 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{language === 'bn' ? 'আজকের পথচলা' : 'Today\'s Journey'}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'bn' ? 'দৈনন্দিন ভালো কাজের সংক্ষিপ্ত রূপরেখা' : 'Summary of your good deeds today'}
                </p>
              </div>

              {/* Gentle Encouragement Banner */}
              <div className="text-right">
                <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800">
                  {todayCompletedPrayers >= 5 || sawmRecord?.completed
                    ? (language === 'bn' ? 'আজকের পথচলা সুন্দরভাবে এগোচ্ছে।' : 'Your journey is moving beautifully today.')
                    : (language === 'bn' ? 'দিন এখনো শেষ হয়নি।' : 'The day isn\'t over yet.')}
                </span>
              </div>
            </div>

            {/* 5 Central Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* 1. Salah */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800 shrink-0">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">
                      {language === 'bn' ? '🌙 সালাত' : '🌙 Salah'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {language === 'bn' ? 'জামাতে আদায়' : 'Completed in Jama\'ah'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-white">
                    {formatNum(todayCompletedPrayers)} / {formatNum(5)}
                  </span>
                </div>
              </div>

              {/* 2. Sawm */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-950 text-amber-400 flex items-center justify-center border border-amber-800 shrink-0">
                    <Heart className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">
                      {language === 'bn' ? '🌙 সাওম' : '🌙 Sawm'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {sawmRecord?.completed
                        ? (language === 'bn' ? 'আলহামদুলিল্লাহ' : 'Alhamdulillah')
                        : (language === 'bn' ? 'আজকের রোজা' : 'Today\'s fast')}
                    </span>
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => handleToggleSawm(!sawmRecord?.completed)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      sawmRecord?.completed
                        ? 'bg-emerald-600 text-white border border-emerald-500 shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                    }`}
                  >
                    {sawmRecord?.completed
                      ? (language === 'bn' ? 'সম্পন্ন ✓' : 'Completed ✓')
                      : (language === 'bn' ? 'রেকর্ড করুন' : 'Record Fast')}
                  </button>
                </div>
              </div>

              {/* 3. Quran */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-950 text-teal-400 flex items-center justify-center border border-teal-800 shrink-0">
                    <BookOpen className="w-5 h-5 text-teal-300" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">
                      {language === 'bn' ? '📖 কুরআন' : '📖 Quran'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {language === 'bn' ? 'পাঠের সময় (স্বয়ংক্রিয়)' : 'Reading time (Auto)'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-teal-300">
                    {formatNum(quranMinutes)} {language === 'bn' ? 'মিনিট' : 'min'}
                  </span>
                  {quranMinutes > 0 && (
                    <button
                      onClick={() => {
                        journeyDataService.setQuranMinutes(todayStr, 0);
                        setQuranMinutes(0);
                        onShowToast('success', language === 'bn' ? 'রিসেট সফল' : 'Reset Success', language === 'bn' ? 'কুরআন তিলাওয়াত সময় ০ করা হয়েছে।' : 'Quran time has been reset to 0.');
                      }}
                      className="px-2 py-1 rounded-lg bg-red-950 hover:bg-red-900 text-red-400 border border-red-900/60 text-[10px] font-bold cursor-pointer transition-all shrink-0"
                    >
                      {language === 'bn' ? 'রিসেট' : 'Reset'}
                    </button>
                  )}
                </div>
              </div>

              {/* 4. Tasbih */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-950 text-purple-300 flex items-center justify-center border border-purple-800 shrink-0">
                    <Activity className="w-5 h-5 text-purple-300" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">
                      {language === 'bn' ? '📿 তাসবিহ' : '📿 Tasbih'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {language === 'bn' ? 'মোট সংখ্যা (স্বয়ংক্রিয়)' : 'Total count (Auto)'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-purple-300">
                    {formatNum(tasbihCount)} {language === 'bn' ? 'বার' : ''}
                  </span>
                  {tasbihCount > 0 && (
                    <button
                      onClick={() => {
                        journeyDataService.setTasbihCount(todayStr, 0);
                        setTasbihCount(0);
                        onShowToast('success', language === 'bn' ? 'রিসেট সফল' : 'Reset Success', language === 'bn' ? 'তাসবিহ সংখ্যা ০ করা হয়েছে।' : 'Tasbih count has been reset to 0.');
                      }}
                      className="px-2 py-1 rounded-lg bg-red-950 hover:bg-red-900 text-red-400 border border-red-900/60 text-[10px] font-bold cursor-pointer transition-all shrink-0 mr-1"
                    >
                      {language === 'bn' ? 'রিসেট' : 'Reset'}
                    </button>
                  )}
                  {onOpenTasbih && (
                    <button
                      onClick={onOpenTasbih}
                      className="px-2.5 py-1.5 rounded-xl bg-purple-900/80 text-purple-200 hover:bg-purple-800 hover:text-white transition-all border border-purple-700/60 cursor-pointer text-xs font-bold shadow-sm shrink-0"
                    >
                      {language === 'bn' ? 'পড়ুন' : 'Count'}
                    </button>
                  )}
                </div>
              </div>

              {/* 5. Verified Donation Impact */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between sm:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-950 text-rose-300 flex items-center justify-center border border-rose-800 shrink-0">
                    <Coins className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">
                      {language === 'bn' ? '🤲 দানের প্রভাব (বাস্তবায়িত)' : '🤲 Donation Impact (Verified)'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {language === 'bn'
                        ? `${formatNum(donationImpact.totalPledgedCount)} টি দানকৃত (${formatNum(donationImpact.realizedCount)} টি বাস্তবায়িত)`
                        : `${donationImpact.totalPledgedCount} pledged (${donationImpact.realizedCount} realized/verified)`}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-rose-300 block">
                    ৳ {language === 'bn' ? donationImpact.realizedAmountBn : donationImpact.realizedAmountEn}
                  </span>
                  <span className="text-[10px] text-rose-400/80 font-bold">
                    {language === 'bn'
                      ? `বাস্তবায়ন হার: ${formatNum(donationImpact.utilizationRate)}%`
                      : `Realization Rate: ${donationImpact.utilizationRate}%`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PERSONAL CONSISTENCY & NON-GUILT STREAK CARD */}
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <h3 className="text-xs font-bold text-slate-300">
                  {language === 'bn' ? 'ধারাবাহিকতা' : 'Consistency'}
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-400">
                {isStreakActive
                  ? (language === 'bn'
                      ? `${formatNum(currentStreakDays)} দিন ধরে আপনার যাত্রা চলছে`
                      : `${currentStreakDays} days of continued progress`)
                  : (language === 'bn'
                      ? 'আজ থেকে আবার শুরু করা যাক।'
                      : 'A new beginning starts today.')}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {language === 'bn'
                ? `এই মাসে আপনি মোট ${formatNum(summary?.totalDaysRecorded || monthlySawm.completedDays || 1)} টি দিনে আপনার আমলগুলো নথিভুক্ত করেছেন।`
                : `You've recorded your journey on ${summary?.totalDaysRecorded || monthlySawm.completedDays || 1} days this month.`}
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MONTHLY JOURNEY CALENDAR */}
      {/* ========================================================================= */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <h3 className="text-sm font-black text-white">
                  {language === 'bn'
                    ? `${toBnNumber(currentYear)} সালের ${currentMonth}ম মাস`
                    : `${new Date(currentYear, currentMonth - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}`}
                </h3>
                <p className="text-[11px] text-amber-300/90 font-medium mt-0.5">
                  {language === 'bn' ? 'গ্রেগরিয়ান + হিজরী ক্যালেন্ডার' : 'Gregorian + Hijri Calendar'}
                </p>
              </div>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar Grid Header */}
            <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-800 pb-2">
              {(language === 'bn'
                ? ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি']
                : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
              ).map((dayName, idx) => (
                <span key={`sj-day-head-${idx}`} className="text-[10px] font-bold text-slate-400">
                  {dayName}
                </span>
              ))}
            </div>

            {/* Calendar Days Grid */}
            {loadingCalendar ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {language === 'bn' ? 'ক্যালেন্ডার লোড হচ্ছে...' : 'Loading calendar...'}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5">
                {calendarData?.days?.map((dayInfo: CalendarDayInfo, idx: number) => {
                  const dayObj = new Date(dayInfo.date);
                  const dayHijri = getHijriDate(dayObj);
                  const isSelected = selectedDate === dayInfo.date;

                  return (
                    <button
                      key={`sj-date-${dayInfo.date}-${idx}`}
                      onClick={() => fetchDayDetail(dayInfo.date)}
                      className={`p-2 rounded-2xl flex flex-col items-center justify-between min-h-[52px] border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-amber-400 shadow-md scale-105'
                          : dayInfo.isToday
                          ? 'bg-slate-800 border-emerald-500/80 text-white'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {/* Gregorian Day Number */}
                      <span className="text-xs font-bold">
                        {formatNum(dayObj.getDate())}
                      </span>

                      {/* Hijri Day Info */}
                      <span className="text-[8px] text-amber-300/90 truncate max-w-full font-mono">
                        {language === 'bn' ? `${dayHijri.dayBn}` : `${dayHijri.english.split(' ')[0]}`}
                      </span>

                      {/* Activity Indicator Dots */}
                      <div className="flex items-center gap-0.5 mt-1">
                        {dayInfo.completedCount > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        )}
                        {journeyDataService.getSawmRecord(dayInfo.date)?.completed && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        )}
                        {journeyDataService.getQuranMinutes(dayInfo.date) > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                        )}
                        {journeyDataService.getTasbihCount(dayInfo.date) > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* SELECTED DAY DETAIL PANEL */}
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h4 className="text-xs font-bold text-amber-300">
                  {selectedDate === todayStr
                    ? (language === 'bn' ? 'আজকের পথচলা' : 'Today\'s Journey')
                    : (language === 'bn' ? `তারিখ: ${formatBnDate(selectedDate)}` : `Date: ${selectedDate}`)}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {language === 'bn' ? getHijriDate(selectedDate).bengali : getHijriDate(selectedDate).english}
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-400">
                {language === 'bn' ? 'দিনটির বিবরন' : 'Day Detail'}
              </span>
            </div>

            {loadingDayDetail ? (
              <p className="text-xs text-slate-400 text-center py-4">
                {language === 'bn' ? 'বিস্তারিত তথ্য লোড হচ্ছে...' : 'Loading details...'}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">{language === 'bn' ? 'সালাত' : 'Salah'}</span>
                  <span className="font-bold text-emerald-300">
                    {formatNum(dayDetail?.completedCount || 0)} / {formatNum(5)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">{language === 'bn' ? 'সাওম' : 'Sawm'}</span>
                  <span className="font-bold text-amber-300">
                    {journeyDataService.getSawmRecord(selectedDate)?.completed
                      ? (language === 'bn' ? 'সম্পন্ন ✓' : 'Completed ✓')
                      : (language === 'bn' ? 'রেকর্ড করা হয়নি' : 'Not recorded')}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">{language === 'bn' ? 'কুরআন' : 'Quran'}</span>
                  <span className="font-bold text-teal-300">
                    {formatNum(journeyDataService.getQuranMinutes(selectedDate))} {language === 'bn' ? 'মিনিট' : 'min'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">{language === 'bn' ? 'তাসবিহ' : 'Tasbih'}</span>
                  <span className="font-bold text-purple-300">
                    {formatNum(journeyDataService.getTasbihCount(selectedDate))} {language === 'bn' ? 'বার' : ''}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: INDIVIDUAL WORSHIP DETAILS (SALAH, SAWM, QURAN, TASBIH, DONATION) */}
      {/* ========================================================================= */}
      {activeTab === 'details' && (
        <div className="space-y-4">
          {/* Sub Navigation Bar for Worship Types */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
            {[
              { id: 'salah', label: language === 'bn' ? 'সালাত' : 'Salah', icon: ShieldCheck },
              { id: 'sawm', label: language === 'bn' ? 'সাওম' : 'Sawm', icon: Heart },
              { id: 'quran', label: language === 'bn' ? 'কুরআন' : 'Quran', icon: BookOpen },
              { id: 'tasbih', label: language === 'bn' ? 'তাসবিহ' : 'Tasbih', icon: Activity },
              { id: 'donation', label: language === 'bn' ? 'দানের প্রভাব' : 'Donation Impact', icon: Coins }
            ].map((item, idx) => {
              const Icon = item.icon;
              const isSel = worshipTab === item.id;
              return (
                <button
                  key={`sj-worship-${item.id}-${idx}`}
                  onClick={() => setWorshipTab(item.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isSel
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* 1. SALAH DETAILED SECTION */}
          {worshipTab === 'salah' && (
            <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{language === 'bn' ? 'সালাত রেকর্ড ও যাচাইকৃত উপস্থিতি' : 'Salah Record & Verified Attendance'}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'মসজিদের জিও-ফেন্স লোকেশনের মাধ্যমে আপনার জামাতে আদায়কৃত সালাতসমূহ নিরাপদভাবে যাচাই করা হয়।'
                  : 'Your prayers completed in Jama\'ah are securely verified using mosque geo-fencing.'}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">{language === 'bn' ? 'মোট যাচাইকৃত জামাত' : 'Total Verified Jama\'ah'}</span>
                  <span className="text-lg font-black text-emerald-400">
                    {formatNum(summary?.totalCompletedPrayers || 0)} {language === 'bn' ? 'ওয়াক্ত' : 'prayers'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">{language === 'bn' ? 'ধারাবাহিক স্ট্রিক' : 'Continuous Streak'}</span>
                  <span className="text-lg font-black text-amber-400">
                    {formatNum(summary?.currentStreak || 0)} {language === 'bn' ? 'দিন' : 'Days'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. SAWM (FASTING) DETAILED SECTION */}
          {worshipTab === 'sawm' && (
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Heart className="w-4 h-4 text-amber-400" />
                    <span>{language === 'bn' ? 'সাওম (রোজা)' : 'Sawm (Fasting)'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {language === 'bn'
                      ? 'ব্যক্তিগত ইবাদত হিসেবে আপনার রোজার পথচলা নথিভুক্ত করুন।'
                      : 'Self-record your fasting as a personal worship journey.'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-800">
                    {monthlySawm.completedDays} / {monthlySawm.totalDays} {language === 'bn' ? 'দিন' : 'days'}
                  </span>
                </div>
              </div>

              {/* Fasting Toggle Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-950 to-amber-950/20 border border-amber-800/40 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">
                    {language === 'bn' ? 'আজকের সাওম সম্পন্ন করেছেন?' : 'Did you complete today\'s fast?'}
                  </span>
                  <span className="text-[11px] text-amber-300/80">
                    {sawmRecord?.completed
                      ? (language === 'bn' ? 'আলহামদুলিল্লাহ! আপনার রোজা নথিভুক্ত হয়েছে।' : 'Alhamdulillah! Your fast is recorded.')
                      : (language === 'bn' ? 'সহজ এক ক্লিকে রেকর্ড করুন।' : 'Record with a simple tap.')}
                  </span>
                </div>
                <button
                  onClick={() => handleToggleSawm(!sawmRecord?.completed)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    sawmRecord?.completed
                      ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  {sawmRecord?.completed
                    ? (language === 'bn' ? 'সম্পন্ন ✓' : 'Completed ✓')
                    : (language === 'bn' ? 'সাওম রেকর্ড করুন' : 'Record Fast')}
                </button>
              </div>

              {/* Ramadan Experience Section */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-emerald-300">
                  {language === 'bn' ? 'রমজানের সাওম' : 'Ramadan Fasting'}
                </h4>
                <p className="text-xs text-slate-400">
                  {language === 'bn'
                    ? 'রমজান মাসে আপনার রোজা ট্র্যাকিং আরো সহজ ও স্বাচ্ছন্দ্যময় হবে।'
                    : 'Track your fasting during Ramadan smoothly and peacefully.'}
                </p>
                <div className="text-xs font-medium text-slate-300 pt-1">
                  {language === 'bn'
                    ? `এই মাসে ${toBnNumber(Math.max(0, monthlySawm.totalDays - monthlySawm.completedDays))}টি দিন স্ব-রেকর্ড করার সুযোগ রয়েছে।`
                    : `${Math.max(0, monthlySawm.totalDays - monthlySawm.completedDays)} days remain open to record this month.`}
                </div>
              </div>
            </div>
          )}

          {/* 3. QURAN DETAILED SECTION */}
          {worshipTab === 'quran' && (
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-teal-400" />
                    <span>{language === 'bn' ? 'অ্যাপে আপনার কুরআন পাঠের সময়' : 'Your Quran reading time in the app'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {language === 'bn'
                      ? 'অ্যাপের মধ্যে কুরআন তিলাওয়াতের সক্রিয় সময় এখানে স্বয়ংক্রিয়ভাবে হিসাব করা হয়।'
                      : 'Time spent reading Quran in the app is automatically recorded.'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-300 block">
                    {language === 'bn' ? 'আজকের মোট সময়' : 'Total time today'}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-base font-black text-teal-300">
                      {formatNum(quranMinutes)} {language === 'bn' ? 'মিনিট' : 'min'}
                    </span>
                    {quranMinutes > 0 && (
                      <button
                        onClick={() => {
                          journeyDataService.setQuranMinutes(todayStr, 0);
                          setQuranMinutes(0);
                          onShowToast('success', language === 'bn' ? 'রিসেট সফল' : 'Reset Success', language === 'bn' ? 'কুরআন তিলাওয়াত সময় ০ করা হয়েছে।' : 'Quran time has been reset to 0.');
                        }}
                        className="px-2 py-0.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-900/40 text-[10px] font-bold cursor-pointer transition-all"
                      >
                        {language === 'bn' ? 'রিসেট' : 'Reset'}
                      </button>
                    )}
                  </div>
                </div>
                <span className="text-xs text-teal-400/80 bg-teal-950/60 px-3 py-1.5 rounded-xl border border-teal-800/60 font-medium">
                  {language === 'bn' ? 'স্বয়ংক্রিয় ট্র্যাকিং সক্রিয়' : 'Automatic Tracking Active'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">{language === 'bn' ? 'এই মাসের মোট সময়' : 'This Month Total'}</span>
                  <span className="text-sm font-bold text-teal-300">
                    {formatNum(Math.floor(monthlyQuran / 60))} {language === 'bn' ? 'ঘণ্টা' : 'h'} {formatNum(monthlyQuran % 60)} {language === 'bn' ? 'মিনিট' : 'm'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">{language === 'bn' ? 'ধারাবাহিক অভ্যাস' : 'Consistency'}</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {monthlyQuran > 0
                      ? (language === 'bn' ? 'নিয়মিত পাঠ চলছে' : 'Active habits')
                      : (language === 'bn' ? 'আজই শুরু করুন' : 'Start today')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4. TASBIH DETAILED SECTION */}
          {worshipTab === 'tasbih' && (
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span>{language === 'bn' ? 'অ্যাপে আপনার তাসবিহ পাঠ' : 'Your Tasbih activity in the app'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {language === 'bn'
                      ? 'ডিজিটাল তাসবিহ কাউন্টারে জিকির সম্পূর্ণ হলে এখানে স্বয়ংক্রিয়ভাবে যুক্ত হয়।'
                      : 'Counts are automatically recorded when using the Digital Tasbih counter.'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-300 block">
                    {language === 'bn' ? 'আজকের জিকির' : 'Today\'s Dhikr'}
                  </span>
                  <span className="text-lg font-black text-purple-300">
                    {formatNum(tasbihCount)} {language === 'bn' ? 'বার' : ''}
                  </span>
                </div>
                {onOpenTasbih && (
                  <button
                    onClick={onOpenTasbih}
                    className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs cursor-pointer hover:bg-purple-500 shadow-sm"
                  >
                    {language === 'bn' ? 'তাসবিহ কাউন্টার খুলুন' : 'Open Tasbih Counter'}
                  </button>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                <span className="text-slate-400 block">{language === 'bn' ? 'এই মাসের মোট জিকির' : 'This Month Total'}</span>
                <span className="text-sm font-bold text-purple-300">
                  {formatNum(monthlyTasbih)} {language === 'bn' ? 'বার' : ''}
                </span>
              </div>
            </div>
          )}

          {/* 5. MY DONATION IMPACT DETAILED SECTION */}
          {worshipTab === 'donation' && (
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Coins className="w-4 h-4 text-rose-400" />
                    <span>{language === 'bn' ? 'আমার দানের প্রভাব' : 'My Donation Impact'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {language === 'bn'
                      ? 'বাস্তবে ব্যবহৃত ও নিবন্ধিত টোকেনসমূহের সুনির্দিষ্ট তথ্য।'
                      : 'Verified details of actually redeemed and realized donated tokens.'}
                  </p>
                </div>
              </div>

              {/* Explaining Microcopy */}
              <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-200 leading-relaxed">
                {language === 'bn'
                  ? '“আপনার একটি টোকেন, যখন বাস্তবে ব্যবহৃত হয়—তখনই তা দানের প্রভাবে পরিণত হয়।”'
                  : '“A donated token becomes real impact when it is actually used.”'}
              </div>

              {/* Stats Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">{language === 'bn' ? 'মোট দান করার সিদ্ধান্ত' : 'Pledged Tokens'}</span>
                  <span className="text-base font-black text-white">
                    {formatNum(donationImpact.totalPledgedCount)} {language === 'bn' ? 'টি' : ''}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">{language === 'bn' ? 'বাস্তবে ব্যবহৃত/দানকৃত' : 'Realized Donations'}</span>
                  <span className="text-base font-black text-rose-400">
                    {formatNum(donationImpact.realizedCount)} {language === 'bn' ? 'টি' : ''}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-slate-400 block">{language === 'bn' ? 'দানের ব্যবহার হার' : 'Utilization Rate'}</span>
                  <span className="text-base font-black text-amber-300">
                    {formatNum(donationImpact.utilizationRate)}%
                  </span>
                </div>
              </div>

              {/* Total Financial Realized Amount */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/50 to-slate-950 border border-rose-800/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-300 block">
                    {language === 'bn' ? 'মোট বাস্তব দানের প্রভাব' : 'Total Realized Donation Impact'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {language === 'bn'
                      ? `আপনার দান করা টোকেনের ${formatNum(donationImpact.utilizationRate)}% ইতোমধ্যে বাস্তব ব্যবহারে পরিণত হয়েছে।`
                      : `${donationImpact.utilizationRate}% of your donated tokens have turned into realized donations through actual use.`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-rose-300">
                    ৳ {language === 'bn' ? donationImpact.realizedAmountBn : donationImpact.realizedAmountEn}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MONTHLY SUMMARY & REFLECTION */}
      {/* ========================================================================= */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>{language === 'bn' ? 'এই মাসের পথচলা' : 'This Month\'s Journey'}</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 text-[11px] block">{language === 'bn' ? 'সালাত রেকর্ড' : 'Salah Recorded'}</span>
                <span className="text-base font-bold text-emerald-400">
                  {formatNum(monthlySawm.completedDays || summary?.totalDaysRecorded || 0)} {language === 'bn' ? 'দিন' : 'days'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 text-[11px] block">{language === 'bn' ? 'সাওম' : 'Sawm'}</span>
                <span className="text-base font-bold text-amber-400">
                  {formatNum(monthlySawm.completedDays)} {language === 'bn' ? 'দিন' : 'days'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 text-[11px] block">{language === 'bn' ? 'কুরআন সময়' : 'Quran Time'}</span>
                <span className="text-base font-bold text-teal-300">
                  {formatNum(Math.floor(monthlyQuran / 60))}h {formatNum(monthlyQuran % 60)}m
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 text-[11px] block">{language === 'bn' ? 'বাস্তব দান' : 'Verified Donation'}</span>
                <span className="text-base font-bold text-rose-300">
                  ৳ {language === 'bn' ? donationImpact.realizedAmountBn : donationImpact.realizedAmountEn}
                </span>
              </div>
            </div>

            {/* Reflection Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-950 to-teal-950/60 border border-emerald-800/50 text-xs text-slate-300 space-y-1.5 shadow-inner">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <Sparkles className="w-4 h-4" />
                <span>{language === 'bn' ? 'মাসিক চিন্তন' : 'Monthly Reflection'}</span>
              </div>
              <p className="leading-relaxed text-slate-300">
                {language === 'bn'
                  ? '“এই মাসে আপনি যে ভালো অভ্যাসগুলো ধরে রেখেছেন, সেগুলোই আপনার পথচলার সবচেয়ে সুন্দর অংশ।”'
                  : '“The habits you continued this month are one of the most meaningful parts of your journey.”'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: PERSONAL RECORDS */}
      {/* ========================================================================= */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>{language === 'bn' ? 'আমার রেকর্ড' : 'My Records'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">{language === 'bn' ? 'সর্বোচ্চ সালাত ধারাবাহিকতা' : 'Longest Salah Consistency'}</span>
                  <span className="text-sm font-bold text-orange-400">
                    {formatNum(summary?.bestStreak || 0)} {language === 'bn' ? 'দিন' : 'Days'}
                  </span>
                </div>
                <Award className="w-5 h-5 text-amber-400 shrink-0" />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">{language === 'bn' ? 'সর্বোচ্চ কুরআন পাঠ সময়' : 'Highest Quran Reading Time'}</span>
                  <span className="text-sm font-bold text-teal-300">
                    {formatNum(quranMinutes)} {language === 'bn' ? 'মিনিট' : 'min'}
                  </span>
                </div>
                <BookOpen className="w-5 h-5 text-teal-400 shrink-0" />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">{language === 'bn' ? 'সর্বোচ্চ তাসবিহ জিকির' : 'Highest Tasbih Count'}</span>
                  <span className="text-sm font-bold text-purple-300">
                    {formatNum(tasbihCount)} {language === 'bn' ? 'বার' : ''}
                  </span>
                </div>
                <Activity className="w-5 h-5 text-purple-400 shrink-0" />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">{language === 'bn' ? 'বাস্তবায়িত দান প্রভাব' : 'Most Realized Donation Tokens'}</span>
                  <span className="text-sm font-bold text-rose-300">
                    {formatNum(donationImpact.realizedCount)} {language === 'bn' ? 'টি টোকেন' : 'Tokens'}
                  </span>
                </div>
                <Coins className="w-5 h-5 text-rose-400 shrink-0" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OPTIONS / MANAGEMENT MODAL */}
      <AnimatePresence>
        {showManageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4 text-slate-100"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'bn' ? 'কন্ট্রোল ও অপশনস' : 'Controls & Options'}</span>
                </h3>
                <button
                  onClick={() => setShowManageModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Reset Local Data Option */}
                <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-2">
                  <h4 className="text-xs font-bold text-slate-200">
                    {language === 'bn' ? 'আজকের জিকির ও কুরআন সময় রিসেট' : "Reset Today's Trackers"}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {language === 'bn'
                      ? 'অসাবধানতাবশত কোনো ভুল ইনপুট বা টেস্ট রিডিং টাইম হয়ে থাকলে তা রিসেট করে ০ করতে পারেন।'
                      : 'If you made any accidental manual inputs or test reading time today, reset them to 0.'}
                  </p>
                  <button
                    onClick={handleResetTodayLocalData}
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs hover:bg-red-950/40 hover:text-red-400 hover:border-red-900/60 transition-all cursor-pointer shadow-sm"
                  >
                    {language === 'bn' ? 'আজকের ডাটা রিসেট করুন' : "Reset Today's Data"}
                  </button>
                </div>

                {/* Start Fresh Journey Option */}
                <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-2">
                  <h4 className="text-xs font-bold text-slate-200">
                    {language === 'bn' ? 'নতুন ধারাবাহিকতা শুরু করুন' : 'Start a New Journey'}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {language === 'bn'
                      ? 'আপনার আগের জার্নি বা ইবাদত রেকর্ড মুছে যাবে না। শুধু আজ থেকে একটি নতুন ধারাবাহিকতা স্ট্রিক শুরু হবে।'
                      : 'Your previous history will not be deleted. Only your consistency period will start again from today.'}
                  </p>
                  <button
                    onClick={handleStartNewJourney}
                    disabled={actionInProgress}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {language === 'bn' ? 'নতুনভাবে শুরু করুন' : 'Start Fresh'}
                  </button>
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    onClick={() => setShowManageModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    {language === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
