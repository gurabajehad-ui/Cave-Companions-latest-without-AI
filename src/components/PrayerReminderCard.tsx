import React, { useState } from 'react';
import { Bell, Check, ShieldCheck, Send, Sparkles } from 'lucide-react';
import { prayerReminderService, PrayerReminderSettings } from '../services/prayerReminderService';
import { PrayerType } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface PrayerReminderCardProps {
  onShowToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, msg: string) => void;
  userDistrict?: string;
  onDistrictChange?: (district: string) => void;
}

const PRAYER_LABELS: { type: PrayerType; nameBn: string; nameEn: string }[] = [
  { type: 'fajr', nameBn: 'ফজর', nameEn: 'Fajr' },
  { type: 'dhuhr', nameBn: 'যোহর', nameEn: 'Dhuhr' },
  { type: 'asr', nameBn: 'আসর', nameEn: 'Asr' },
  { type: 'maghrib', nameBn: 'মাগরিব', nameEn: 'Maghrib' },
  { type: 'isha', nameBn: 'এশা', nameEn: 'Isha' }
];

export const PrayerReminderCard: React.FC<PrayerReminderCardProps> = ({
  onShowToast
}) => {
  const { language } = useLanguage();
  const [settings, setSettings] = useState<PrayerReminderSettings>(prayerReminderService.getSettings());
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);

  const handleToggleMaster = async (enabled: boolean) => {
    if (enabled) {
      const perm = await prayerReminderService.requestNotificationPermission();
      if (perm !== 'granted') {
        onShowToast(
          'warning', 
          language === 'bn' ? 'অনুমতি প্রয়োজন' : 'Permission Required', 
          language === 'bn' ? 'ব্রাউজার সেটিংসে গিয়ে নোটিফিকেশন অনুমতি প্রদান করুন।' : 'Please allow notification permission in your browser settings.'
        );
      }
    }
    const updated = prayerReminderService.saveSettings({ enabled, soundEnabled: false });
    setSettings(updated);
    if (enabled) {
      onShowToast(
        'success', 
        language === 'bn' ? 'রিমাইন্ডার সক্রিয়' : 'Reminder Active', 
        language === 'bn' ? 'সালাতের ওয়াক্ত শুরু হওয়ার সাইলেন্ট পুশ নোটিফিকেশন চালু হয়েছে।' : 'Silent push notifications for prayer times activated.'
      );
    } else {
      onShowToast(
        'info', 
        language === 'bn' ? 'রিমাইন্ডার স্থগিত' : 'Reminder Paused', 
        language === 'bn' ? 'সালাতের নোটিফিকেশন সাময়িকভাবে বন্ধ করা হলো।' : 'Prayer notifications paused.'
      );
    }
  };

  const handleTogglePrayer = (prayer: PrayerType) => {
    const current = settings.prayers[prayer] ?? true;
    const newPrayers = { ...settings.prayers, [prayer]: !current };
    const updated = prayerReminderService.saveSettings({ prayers: newPrayers });
    setSettings(updated);
  };

  const handleTestAlert = () => {
    setIsSendingTest(true);
    try {
      const testInfo = {
        type: 'dhuhr' as PrayerType,
        nameBn: 'যোহর',
        nameEn: 'Dhuhr',
        startTime: new Date(),
        formattedTimeBn: '১২:১৫ PM'
      };
      prayerReminderService.triggerReminderNotification(testInfo, false);
      onShowToast(
        'success', 
        language === 'bn' ? 'টেস্ট নোটিফিকেশন প্রেরিত' : 'Test Sent', 
        language === 'bn' ? 'শব্দবিহীন সাইলেন্ট পুশ নোটিফিকেশন পাঠানো হয়েছে।' : 'Silent push notification test sent.'
      );
    } catch (e) {
      onShowToast(
        'error', 
        language === 'bn' ? 'টেস্ট ব্যর্থ' : 'Test Failed', 
        language === 'bn' ? 'নোটিফিকেশন অনুমতি নিশ্চিত করুন।' : 'Ensure notification permissions are granted.'
      );
    } finally {
      setTimeout(() => setIsSendingTest(false), 1200);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#06281e]/40 border border-[#0c4334]/50 p-4 text-white space-y-3.5">
      {/* Decorative subtle ambient glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Bar with Master Toggle */}
      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-emerald-900/80 border border-emerald-600/40 flex items-center justify-center text-amber-300 shrink-0 shadow-sm">
            <Bell className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                {language === 'bn' ? 'সালাত পুশ রিমাইন্ডার' : 'Prayer Push Reminder'}
              </h3>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-900/90 text-amber-300 border border-emerald-600/50 font-semibold shadow-xs">
                {language === 'bn' ? 'শব্দহীন' : 'Silent'}
              </span>
            </div>
            <p className="text-[11px] text-emerald-300/80 truncate mt-0.5">
              {settings.enabled 
                ? (language === 'bn' ? 'ওয়াক্ত শুরু হলে শব্দবিহীন সাইলেন্ট নোটিফিকেশন' : 'Silent notification when prayer time starts') 
                : (language === 'bn' ? 'নোটিফিকেশন বর্তমানে বন্ধ রয়েছে' : 'Notifications are currently disabled')}
            </p>
          </div>
        </div>

        {/* Master Switch */}
        <button
          type="button"
          onClick={() => handleToggleMaster(!settings.enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 cursor-pointer shadow-inner ${
            settings.enabled ? 'bg-gradient-to-r from-emerald-500 to-teal-500 ring-2 ring-amber-400/40' : 'bg-slate-800 border border-slate-700'
          }`}
          title={settings.enabled ? (language === 'bn' ? 'নোটিফিকেশন চালু আছে' : 'Notification Enabled') : (language === 'bn' ? 'নোটিফিকেশন বন্ধ আছে' : 'Notification Disabled')}
        >
          <span
            className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform shadow-md ${
              settings.enabled ? 'translate-x-5.5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* When Enabled: Compact 5-Prayer Chips & Test Action */}
      {settings.enabled && (
        <div className="space-y-3 pt-1 relative z-10 border-t border-emerald-800/40">
          {/* Individual Prayer Selection Chips */}
          <div className="grid grid-cols-5 gap-1.5 pt-1">
            {PRAYER_LABELS.map((p, idx) => {
              const isSelected = settings.prayers[p.type] ?? true;
              const label = language === 'bn' ? p.nameBn : p.nameEn;
              return (
                <button
                  key={`prc-chip-${p.type}-${idx}`}
                  onClick={() => handleTogglePrayer(p.type)}
                  className={`py-1.5 px-1 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-900/80 border-amber-400/50 text-amber-300 shadow-xs'
                      : 'bg-emerald-950/40 border-emerald-900/60 text-emerald-500/50 line-through'
                  }`}
                  title={`${label} ${language === 'bn' ? 'ওয়াক্ত রিমাইন্ডার' : 'Reminder'}`}
                >
                  <span>{label}</span>
                  {isSelected && <Check className="w-3 h-3 text-amber-400 mt-0.5" />}
                </button>
              );
            })}
          </div>

          {/* Test Silent Notification + Info */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-300/80 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">
                {language === 'bn' ? 'ব্রাউজারে নোটিফিকেশন অনুমোদন নিশ্চিত রাখুন' : 'Ensure browser notifications are allowed'}
              </span>
            </div>

            <button
              onClick={handleTestAlert}
              disabled={isSendingTest}
              className="py-1 px-3 rounded-xl border border-emerald-600/50 bg-emerald-900/60 hover:bg-emerald-800/80 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shrink-0 shadow-xs"
            >
              <Send className={`w-3 h-3 ${isSendingTest ? 'animate-bounce text-amber-400' : ''}`} />
              <span>
                {isSendingTest 
                  ? (language === 'bn' ? 'পাঠানো হচ্ছে...' : 'Sending...') 
                  : (language === 'bn' ? 'টেস্ট এলার্ট' : 'Test Alert')}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
