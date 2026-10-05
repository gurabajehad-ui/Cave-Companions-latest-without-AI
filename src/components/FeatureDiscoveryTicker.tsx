import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Compass,
  Heart,
  Users,
  Landmark,
  ChevronRight,
  X,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface FeatureDiscoveryTickerProps {
  onNavigateTab: (tab: string) => void;
  onOpenQibla: () => void;
  onOpenMosques: () => void;
}

interface TickerItem {
  id: string;
  promptBn: string;
  promptEn: string;
  actionBn: string;
  actionEn: string;
  icon: React.ReactNode;
  actionType: 'tab' | 'qibla' | 'mosque';
  targetTab?: string;
}

export const FeatureDiscoveryTicker: React.FC<FeatureDiscoveryTickerProps> = ({
  onNavigateTab,
  onOpenQibla,
  onOpenMosques
}) => {
  const { language } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const items: TickerItem[] = [
    {
      id: 'quran',
      promptBn: 'কুরআন মাজীদ তিলাওয়াত করতে চান?',
      promptEn: 'Want to recite the Holy Quran?',
      actionBn: 'তিলাওয়াত করুন',
      actionEn: 'Read Quran',
      icon: <BookOpen className="w-4 h-4 text-amber-300" />,
      actionType: 'tab',
      targetTab: 'quran'
    },
    {
      id: 'qibla',
      promptBn: 'কিবলা খুঁজে পাচ্ছেন না?',
      promptEn: "Can't find the Qibla direction?",
      actionBn: 'কিবলা কম্পাস',
      actionEn: 'Qibla Compass',
      icon: <Compass className="w-4 h-4 text-amber-300" />,
      actionType: 'qibla'
    },
    {
      id: 'hisnul_muslim',
      promptBn: 'মাসনুন দো‘আ গুলো পড়ুন',
      promptEn: 'Read daily authentic Masnoon Duas',
      actionBn: 'দো‘আ সমূহ',
      actionEn: 'View Duas',
      icon: <Heart className="w-4 h-4 text-amber-300" />,
      actionType: 'tab',
      targetTab: 'hisnul_muslim'
    },
    {
      id: 'cave_circle',
      promptBn: 'বন্ধু ও পরিবারকে ভালো কাজের দাওয়াত দিন',
      promptEn: 'Invite family & friends to good deeds',
      actionBn: 'কেভ সার্কেল',
      actionEn: 'Cave Circle',
      icon: <Users className="w-4 h-4 text-amber-300" />,
      actionType: 'tab',
      targetTab: 'cave_circle'
    },
    {
      id: 'mosques',
      promptBn: 'আপনার আশেপাশের মসজিদ দেখতে চান?',
      promptEn: 'Want to discover mosques near you?',
      actionBn: 'মসজিদ তালিকা',
      actionEn: 'Find Mosques',
      icon: <Landmark className="w-4 h-4 text-amber-300" />,
      actionType: 'mosque'
    }
  ];

  // Auto-rotate every 2.5 seconds
  useEffect(() => {
    if (isPaused || isDismissed) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isPaused, isDismissed, items.length]);

  if (isDismissed) return null;

  const activeItem = items[currentIndex];

  const handleItemClick = () => {
    if (activeItem.actionType === 'tab' && activeItem.targetTab) {
      onNavigateTab(activeItem.targetTab);
    } else if (activeItem.actionType === 'qibla') {
      onOpenQibla();
    } else if (activeItem.actionType === 'mosque') {
      onOpenMosques();
    }
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      className="w-full"
    >
      <div
        onClick={handleItemClick}
        className="group relative overflow-hidden rounded-2xl bg-[#031d16] hover:bg-[#05291f] border border-[#0d4737] hover:border-amber-400/50 p-3 sm:p-3.5 shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 text-white active:scale-[0.99]"
      >
        {/* Left Accent Bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-emerald-400 to-emerald-600" />

        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Icon Badge */}
          <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-[#06291f] border border-[#0e4f3a] text-amber-300 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
            {activeItem.icon}
          </div>

          {/* Animated Prompt Text */}
          <div className="min-w-0 flex-1 h-6 flex items-center overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeItem.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="w-full flex items-center"
              >
                <span className="text-[12.5px] sm:text-sm font-bold text-slate-100 group-hover:text-amber-200 transition-colors leading-tight line-clamp-1">
                  {language === 'bn' ? activeItem.promptBn : activeItem.promptEn}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleItemClick();
            }}
            className="px-2.5 sm:px-3 py-1.5 rounded-full bg-[#053225] group-hover:bg-[#084232] border border-[#0f5c45] text-amber-300 group-hover:text-amber-200 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <span>{language === 'bn' ? activeItem.actionBn : activeItem.actionEn}</span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-300 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
