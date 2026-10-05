import React, { useState } from 'react';
import { Clock, CheckCircle, ShieldCheck, Coins, MapPin, Sparkles, Flame, Check } from 'lucide-react';
import { UserProfile } from '../types';

interface PrayerTimesViewProps {
  currentUser: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
}

interface PrayerInfo {
  id: string;
  name: string;
  time: string;
  tokensReward: number;
  completed: boolean;
}

export const PrayerTimesView: React.FC<PrayerTimesViewProps> = ({ currentUser: rawUser, onUpdateUser }) => {
  const currentUser = rawUser as any;
  const [prayers, setPrayers] = useState<PrayerInfo[]>([
    { id: 'fajr', name: 'ফজর (Fajr)', time: '০৫:০৫ AM', tokensReward: 10, completed: true },
    { id: 'dhuhr', name: 'জোহর (Dhuhr)', time: '১২:১৫ PM', tokensReward: 5, completed: false },
    { id: 'asr', name: 'আসর (Asr)', time: '০৪:১৫ PM', tokensReward: 5, completed: false },
    { id: 'maghrib', name: 'মাগরিব (Maghrib)', time: '০৬:০৫ PM', tokensReward: 5, completed: false },
    { id: 'isha', name: 'এশা (Isha)', time: '০৭:২৫ PM', tokensReward: 5, completed: false },
  ]);

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const togglePrayer = (id: string) => {
    setPrayers(prev =>
      prev.map(p => {
        if (p.id === id) {
          const nextState = !p.completed;
          if (nextState) {
            onUpdateUser({
              silverTokens: currentUser.silverTokens + p.tokensReward,
              jamaatStreak: currentUser.jamaatStreak + 1,
            } as any);
            setNotificationMsg(`মাশাআল্লাহ! ${p.name} জামা'আতের জন্য ${p.tokensReward} সিলভার টোকেন যুক্ত হয়েছে।`);
            setTimeout(() => setNotificationMsg(null), 4000);
          }
          return { ...p, completed: nextState };
        }
        return p;
      })
    );
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-900/90 via-slate-900 to-emerald-950 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> ঢাকা, বাংলাদেশ
              </span>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" /> {currentUser.jamaatStreak} দিন জামা'আত স্ট্রিক
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-2">আজকের সালাতের সময়সূচী</h1>
            <p className="text-slate-300 text-xs mt-1">
              মসজিদে জামা'আতে সালাত আদায় করুন এবং সিলভার/গোল্ড টোকেন অর্জন করুন।
            </p>
          </div>

          <div className="bg-slate-950/80 border border-emerald-500/20 p-3.5 rounded-xl flex items-center gap-3">
            <Coins className="w-8 h-8 text-amber-400" />
            <div>
              <div className="text-xs text-slate-400">আপনার টোকেন রিওয়ার্ড</div>
              <div className="text-lg font-bold text-amber-400">
                {currentUser.silverTokens} <span className="text-xs font-normal text-slate-300">সিলভার</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {notificationMsg && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-fadeIn shadow-lg">
          <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Prayer Times Grid */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" /> ৫ ওয়াক্ত সালাত ও জামা'আত ট্র্যাকার
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {prayers.map(prayer => (
            <div
              key={prayer.id}
              onClick={() => togglePrayer(prayer.id)}
              className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between shadow-md ${
                prayer.completed
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                    prayer.completed
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {prayer.completed ? <Check className="w-6 h-6 stroke-[3]" /> : <Clock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{prayer.name}</h3>
                  <p className="text-xs text-slate-400">{prayer.time}</p>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium inline-block ${
                    prayer.completed
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {prayer.completed ? 'জামা\'আতে আদায়কৃত' : `+${prayer.tokensReward} টোকেন`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
