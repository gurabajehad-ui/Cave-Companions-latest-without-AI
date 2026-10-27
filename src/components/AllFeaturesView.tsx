import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Compass,
  Video,
  Users,
  Bell,
  Landmark,
  ArrowLeft,
  X,
  Layers,
  Flame
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { PrayerReminderCard } from './PrayerReminderCard';

// Custom Tasbih Icon to match ProfileView
const TasbihRosaryIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5 text-amber-400' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8" strokeDasharray="2 3" />
    <circle cx="12" cy="4" r="1.5" fill="currentColor" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" />
    <circle cx="20" cy="12" r="1.5" fill="currentColor" />
    <circle cx="17.5" cy="17.5" r="1.5" fill="currentColor" />
    <circle cx="12" cy="20" r="1.5" fill="currentColor" />
    <circle cx="6.5" cy="17.5" r="1.5" fill="currentColor" />
    <circle cx="4" cy="12" r="1.5" fill="currentColor" />
    <circle cx="6.5" cy="6.5" r="1.5" fill="currentColor" />
    <path d="M12 20v3m-1.5 0h3" />
  </svg>
);

// Custom Hisnul Muslim Emblem
const HisnulMuslimEmblem: React.FC<{ className?: string }> = ({ className = 'w-5 h-5 text-amber-400' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
    <path d="M12 6.5v7" />
    <path d="M9 10h6" />
    <circle cx="12" cy="10" r="2.5" />
    <path d="M6 18h12" />
  </svg>
);

interface AllFeaturesViewProps {
  onBack?: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenQibla: () => void;
  onOpenTasbih: () => void;
  onOpenMosques?: () => void;
  onShowToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, msg: string) => void;
}

export const AllFeaturesView: React.FC<AllFeaturesViewProps> = ({
  onBack,
  onNavigateTab,
  onOpenQibla,
  onOpenTasbih,
  onOpenMosques,
  onShowToast
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [showReminderModal, setShowReminderModal] = useState(false);

  const featureList = useMemo(() => [
    // 1. Quran & Adhkar
    {
      id: 'quran',
      nameBn: 'কুরআন মাজীদ',
      nameEn: 'Holy Quran',
      descBn: 'বিশুদ্ধ তিলাওয়াত, বাংলা অনুবাদ, খতম ট্র্যাকার ও বুকমার্ক',
      descEn: 'Pure recitation, Bengali translation, khatm tracker & bookmarks',
      category: 'quran',
      icon: BookOpen,
      action: () => onNavigateTab('quran')
    },
    {
      id: 'tasbih',
      nameBn: 'ডিজিটাল তাসবীহ',
      nameEn: 'Digital Tasbih',
      descBn: 'যিকির কাউন্টার, কাস্টম আজকার, ভাইব্রেশন ও হিস্ট্রি',
      descEn: 'Zikr counter, custom adhkar, vibration & session history',
      category: 'quran',
      icon: TasbihRosaryIcon,
      action: () => onOpenTasbih()
    },
    {
      id: 'hisnul_muslim',
      nameBn: 'হিসনুল মুসলিম',
      nameEn: 'Hisnul Muslim',
      descBn: 'দৈনন্দিন জীবনের প্রয়োজনীয় সহিহ দু\'আ ও সকাল-সন্ধ্যার জিকির',
      descEn: 'Authentic daily supplications & morning-evening adhkar',
      category: 'quran',
      icon: HisnulMuslimEmblem,
      action: () => onNavigateTab('hisnul_muslim')
    },

    // 2. Worship & Prayers
    {
      id: 'prayer_journey',
      nameBn: 'কেভ জার্নি',
      nameEn: 'Cave Journey',
      descBn: '৫ ওয়াক্ত সালাত, রোজা, কুরআন তিলাওয়াত ও আমল ট্র্যাকিং অ্যানালিটিক্স',
      descEn: '5 daily prayers, fasting, Quran recitation & spiritual journey analytics',
      category: 'worship',
      icon: Flame,
      action: () => onNavigateTab('prayer_journey')
    },
    {
      id: 'prayer_reminder',
      nameBn: 'নামাজের রিমাইন্ডার',
      nameEn: 'Prayer Reminder',
      descBn: 'ওয়াক্তভিত্তিক আজান ও এলার্ম নোটিফিকেশন সেটিংস',
      descEn: 'Waqt-based adhan alert & notification preferences',
      category: 'worship',
      icon: Bell,
      action: () => setShowReminderModal(true)
    },

    // 3. Community & Direction
    {
      id: 'cave_circle',
      nameBn: 'কেভ সার্কেল',
      nameEn: 'Cave Circle',
      descBn: 'দ্বীনি বন্ধুদের সাথে গ্রুপ স্ট্রিক ও নেক কাজের প্রতিযোগিতা',
      descEn: 'Halqa groups, collaborative streaks & competitive good deeds',
      category: 'community',
      icon: Users,
      action: () => onNavigateTab('cave_circle')
    },
    {
      id: 'qibla',
      nameBn: 'কিবলা কম্পাস',
      nameEn: 'Qibla Direction',
      descBn: 'লাইভ জিপিএস সেন্সর দ্বারা পবিত্র কাবার নিখুঁত দিকনির্ণয়',
      descEn: 'Accurate Kaaba direction using live GPS compass sensors',
      category: 'community',
      icon: Compass,
      action: () => onOpenQibla()
    },
    {
      id: 'mosque',
      nameBn: 'নিকটস্থ মসজিদ',
      nameEn: 'Nearby Mosques',
      descBn: 'আপনার চারপাশের মসজিদ ও জুমার স্থান খুঁজে নিন',
      descEn: 'Locate nearby masjids and Jumu\'ah prayer spots easily',
      category: 'community',
      icon: Landmark,
      action: () => onOpenMosques?.()
    },
    {
      id: 'blog',
      nameBn: 'কেভ মিডিয়া',
      nameEn: 'CAVE Media',
      descBn: 'আহলে সুন্নাহ ওয়াল জামাআহ্-এর আলেমদের ইসলামিক লেকচার ও আলোচনা',
      descEn: 'Authentic Islamic lectures, knowledge videos & media',
      category: 'community',
      icon: Video,
      action: () => onNavigateTab('blog')
    }
  ], [isBn, onNavigateTab, onOpenQibla, onOpenTasbih, onOpenMosques]);

  return (
    <div className="w-full max-w-2xl mx-auto px-1 sm:px-2 py-3 sm:py-4 space-y-3.5 sm:space-y-4 pb-24 text-slate-100 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-none bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isBn ? 'ফিরে যান' : 'Go Back'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 leading-tight">
              <Layers className="w-5 h-5 text-amber-400 shrink-0" />
              <span>{isBn ? 'সকল ফিচার ও টুলস' : 'All Features & Tools'}</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-emerald-300/80 font-medium mt-0.5">
              {isBn ? 'আপনার পূর্ণাঙ্গ দ্বীনি লাইফস্টাইল ও ইবাদতের সহযোগী' : 'Your complete Islamic lifestyle & worship companion'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Feature Grid: Compact 3 items per row with right-angled corners */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {featureList.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={item.action}
              className="flex flex-col items-center justify-center py-2.5 px-1 sm:py-3.5 sm:px-2 rounded-none text-center transition-all cursor-pointer group active:scale-95 shadow-xs gap-1.5 bg-[#031d16] hover:bg-[#052b20] border border-[#0b4233] hover:border-amber-400/50"
            >
              {/* Icon Wrapper */}
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-none flex items-center justify-center transition-transform group-hover:scale-105 shadow-inner bg-[#072c21] border border-[#0f543e] text-amber-400">
                  <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400" />
                </div>
              </div>

              {/* Title */}
              <span className="text-[11px] sm:text-xs font-semibold leading-snug line-clamp-2 text-slate-100 group-hover:text-amber-200 px-0.5 min-h-[30px] flex items-center justify-center text-center">
                {isBn ? item.nameBn : item.nameEn}
              </span>
            </button>
          );
        })}
      </div>

      {/* Reminder Modal if Opened */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowReminderModal(false)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <PrayerReminderCard onShowToast={onShowToast} />
          </div>
        </div>
      )}
    </div>
  );
};
