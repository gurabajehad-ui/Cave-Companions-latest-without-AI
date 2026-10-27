import React from 'react';
import { Bell, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatLocationName } from '../data/bangladeshGeo';
import splashBg from '../assets/images/cave_splash_no_text_v2_1788014135103.jpg';

interface HeaderProps {
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  showInstallPrompt?: boolean;
  onInstallClick?: () => void;
  onOpenTasbih?: () => void;
  onOpenAllFeatures?: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  onOpenNotifications,
  unreadNotificationsCount = 0
}) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  return (
    <header className="relative w-full overflow-hidden bg-[#02140f] border-b border-emerald-500/25 shadow-[0_14px_40px_-10px_rgba(0,0,0,0.85)]">
      {/* 1. Cinematic Splash Screen Background Image */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <img 
          src={splashBg} 
          alt="" 
          decoding="async"
          className="w-full h-full object-cover object-[center_32%] opacity-60 scale-105 pointer-events-none"
          loading="eager"
        />

        {/* Multi-tier Luxury Dark & Emerald Ambient Vignette Overlays for Crisp Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#010907]/90 via-[#021812]/78 to-[#02140f] pointer-events-none" />
        
        {/* Warm Golden Campfire Radiance at Top-Right */}
        <div className="absolute -top-8 -right-8 w-72 h-52 bg-[radial-gradient(circle,rgba(245,158,11,0.22)_0%,transparent_70%)] pointer-events-none" />

        {/* Subtle Emerald Luster at Top-Left */}
        <div className="absolute -top-10 -left-10 w-60 h-44 bg-[radial-gradient(circle,rgba(16,185,129,0.18)_0%,transparent_70%)] pointer-events-none" />

        {/* Soft Bottom Fade into App Wall */}
        <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-[var(--bg-app,#02140f)] to-transparent pointer-events-none" />
        
        {/* Specular Top Edge Line */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-300/35 to-transparent pointer-events-none" />
      </div>

      {/* 2. Header Content Layer */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-3.5 sm:px-4 pt-3.5 pb-3.5 space-y-2.5">
        {/* Top Row: Title & Notification Bell */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight text-white leading-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] truncate">
              Cave Companions
            </h1>
          </div>

          {/* Action Button: Glass Notification Bell */}
          <div className="flex items-center gap-2 shrink-0">
            {onOpenNotifications && (
              <button
                type="button"
                onClick={onOpenNotifications}
                className="relative w-9 h-9 rounded-full bg-[#04241b]/80 hover:bg-[#07382a]/90 border border-emerald-400/35 text-amber-300 flex items-center justify-center transition cursor-pointer active:scale-95 shadow-[0_4px_14px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-md"
                title={t('header.notifications')}
                aria-label={t('header.notifications')}
              >
                <Bell className="w-4 h-4 drop-shadow-[0_0_6px_rgba(251,191,36,0.3)]" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[9px] font-black bg-rose-500 text-white flex items-center justify-center shadow-xs animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Second Row: Live Green Dot + Greeting and Location Glass Capsule */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2 min-w-0">
            {/* Pulsing Live Green Status Dot */}
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"></span>
            </span>

            <span className="text-xs sm:text-[13px] font-medium text-slate-200 truncate drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
              {t('header.greeting')},{' '}
              <span className="text-amber-300 font-bold drop-shadow-[0_0_6px_rgba(251,191,36,0.35)]">
                {user?.fullName || 'Jameul Islam'}
              </span>
            </span>
          </div>

          {/* Location Glass Pill Badge */}
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-200 bg-[#04241b]/80 border border-emerald-400/35 px-2.5 py-1 rounded-full shrink-0 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-md">
            <MapPin className="w-3.5 h-3.5 text-amber-300 drop-shadow-[0_0_4px_rgba(251,191,36,0.4)]" />
            <span className="max-w-[100px] sm:max-w-[140px] truncate">{formatLocationName(user?.district || 'Gaibandha', language)}</span>
          </span>
        </div>
      </div>
    </header>
  );
});
