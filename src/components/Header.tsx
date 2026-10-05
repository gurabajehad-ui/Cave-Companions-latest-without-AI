import React from 'react';
import { Bell, MapPin, Orbit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AppLogo } from './AppLogo';
import { formatLocationName } from '../data/bangladeshGeo';

interface HeaderProps {
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  showInstallPrompt?: boolean;
  onInstallClick?: () => void;
  onOpenTasbih?: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onOpenTasbih
}) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  return (
    <header className="w-full px-1.5 sm:px-3 pt-2 pb-1 max-w-2xl mx-auto" style={{ contain: 'layout style', transform: 'translateZ(0)' }}>
      <div className="rounded-3xl border border-[#0c4334] bg-[#022119] px-4 py-3 shadow-md text-white space-y-3">
        {/* Top Row: Logo + Prominent Cave Companions + Circular Action Buttons */}
        <div className="flex items-center justify-between gap-3">
          {/* Brand Identity: Logo with active status dot + Cave Companions */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo */}
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-2xl border border-[#0a4838] overflow-hidden bg-[#033024] flex items-center justify-center shadow-inner">
                <AppLogo className="w-full h-full object-cover" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#022119]" />
            </div>

            {/* Prominent Title */}
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
              Cave Companions
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="relative w-9 h-9 rounded-full bg-[#033024] hover:bg-[#043f2f] border border-[#0a4838] text-amber-300 flex items-center justify-center transition cursor-pointer active:scale-95 shadow-xs"
                title={t('header.notifications')}
                aria-label={t('header.notifications')}
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[9px] font-black bg-rose-500 text-white flex items-center justify-center">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Second Row: Green dot + Greeting and Location pill on the right */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-xs sm:text-[13px] font-medium text-emerald-100/90 truncate">
              {t('header.greeting')},{' '}
              <span className="text-amber-300 font-bold">
                {user?.fullName || 'Jameul Islam'}
              </span>
            </span>
          </div>

          {/* Location Pill */}
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-200 bg-[#033024] border border-[#0a4838] px-3 py-1 rounded-full shrink-0 shadow-xs">
            <MapPin className="w-3 h-3 text-amber-300" />
            <span className="max-w-[85px] sm:max-w-[120px] truncate">{formatLocationName(user?.district || 'Gaibandha', language)}</span>
          </span>
        </div>
      </div>
    </header>
  );
});
