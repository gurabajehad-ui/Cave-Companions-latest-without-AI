import React from 'react';
import { 
  ArrowLeft, 
  Coins, 
  Sparkles, 
  Award, 
  CheckCircle2, 
  ShieldCheck, 
  Info, 
  ShoppingBag, 
  HeartHandshake, 
  ChevronRight,
  HelpCircle,
  Flame,
  Clock,
  Compass
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface TokenRulesViewProps {
  onBack: () => void;
  onNavigateToTokens?: () => void;
  onNavigateToShops?: () => void;
}

export const TokenRulesView: React.FC<TokenRulesViewProps> = ({
  onBack,
  onNavigateToTokens,
  onNavigateToShops
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 -mx-4 -mt-1.5 sm:mx-0 sm:mt-0 sm:rounded-3xl sm:border sm:border-slate-800/80 overflow-hidden">
      {/* Top App Bar / Header */}
      <div className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer shadow-xs active:scale-95"
            aria-label={isBn ? 'পেছনে যান' : 'Go back'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-black text-white flex items-center gap-1.5">
              <span>{isBn ? 'টোকেন অর্জনের নিয়মাবলী' : 'Token Earning Rules'}</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h1>
            <p className="text-[11px] text-emerald-400/90 font-medium">
              {isBn ? 'সালাতের মাধ্যমে রিওয়ার্ড টোকেন ও ব্যবহারের গাইড' : 'Daily Salah rewards & usage guidelines'}
            </p>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
          <Coins className="w-4 h-4" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-xl mx-auto p-4 space-y-5">
        
        {/* Hero Concept Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#04281f] via-[#021815] to-[#010e0c] border border-emerald-500/30 p-5 shadow-lg">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl shrink-0 shadow-inner">
              🪙
            </div>
            <div className="space-y-1.5">
              <h2 className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                {isBn ? 'কেভ টোকেন রিওয়ার্ড সিস্টেম কী?' : 'What is Cave Token Reward?'}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isBn
                  ? 'দৈনিক মসজিদে জামাতে সালাত আদায়ের জন্য আপনাকে বিশেষ টোকেন উপহার দেওয়া হয়। এই টোকেন দিয়ে পার্টনার শপ থেকে ডিসকাউন্ট পেতে পারেন অথবা মসজিদে সরাসরি সাদাকাহ হিসেবে অনুদান করতে পারেন।'
                  : 'Tokens are special daily rewards earned by praying in congregation (Jama\'ah) at approved mosques. Use your tokens to unlock partner shop discounts or donate them directly as Sadakah for mosque funds.'}
              </p>
            </div>
          </div>
        </div>

        {/* Earning Tiers Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>{isBn ? 'দৈনিক টোকেন অর্জনের ধাপসমূহ' : 'Daily Token Earning Tiers'}</span>
            </h2>
            <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full font-bold">
              {isBn ? 'প্রতিদিন ১টি সর্বোচ্চ' : 'Max 1 / Day'}
            </span>
          </div>

          {/* Tier 1: Gold */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/40 p-4 shadow-md transition-all hover:border-amber-400/60">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                🥇
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                    <span>{isBn ? 'গোল্ড টোকেন (Gold Token)' : 'Gold Token'}</span>
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-300 shrink-0">
                    {isBn ? '৫ ওয়াক্ত জামাত' : '5 Waqt Jama\'ah'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  {isBn
                    ? 'সারাদিনে ফজর, যোহর/জুমা, আসর, মাগরিব ও এশা—মোট ৫ ওয়াক্ত জামাতে আদায় করলে দিনশেষে ১টি গোল্ড টোকেন অর্জিত হবে।'
                    : 'Complete all 5 daily prayers (Fajr, Dhuhr/Jumuah, Asr, Maghrib, Isha) in Jama\'ah to earn 1 Gold Token.'}
                </p>
                <div className="pt-1 flex items-center gap-2 text-[11px] text-amber-400 font-bold">
                  <span>✨ {isBn ? 'সর্বোচ্চ ডিসকাউন্ট রেট ও সর্বোচ্চ সাদাকাহ মূল্য' : 'Highest discount rate & maximum Sadakah value'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tier 2: Silver */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800/40 via-slate-900 to-slate-900 border border-slate-400/30 p-4 shadow-md transition-all hover:border-slate-300/50">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-slate-400/15 border border-slate-300/40 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                🥈
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-slate-200 flex items-center gap-1.5">
                    <span>{isBn ? 'সিলভার টোকেন (Silver Token)' : 'Silver Token'}</span>
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-700/50 border border-slate-500/40 text-slate-200 shrink-0">
                    {isBn ? '৪ ওয়াক্ত জামাত' : '4 Waqt Jama\'ah'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  {isBn
                    ? 'দিনের যেকোনো ৪টি ওয়াক্ত মসজিদে জামাতে আদায় করলে আপনি পাবেন ১টি সিলভার টোকেন।'
                    : 'Complete any 4 prayers of the day in Jama\'ah at an approved mosque to earn 1 Silver Token.'}
                </p>
                <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-300 font-bold">
                  <span>🌟 {isBn ? 'মাঝারি মানের ডিসকাউন্ট অফার প্রযোজ্য' : 'Standard shopping discount benefits'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tier 3: Bronze */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900 border border-amber-700/30 p-4 shadow-md transition-all hover:border-amber-600/50">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-700/20 border border-amber-700/40 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                🥉
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-amber-500 flex items-center gap-1.5">
                    <span>{isBn ? 'ব্রোঞ্জ টোকেন (Bronze Token)' : 'Bronze Token'}</span>
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-950/50 border border-amber-700/40 text-amber-400 shrink-0">
                    {isBn ? '৩ ওয়াক্ত জামাত' : '3 Waqt Jama\'ah'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  {isBn
                    ? 'দিনের যেকোনো ৩টি ওয়াক্ত মসজিদে জামাতে আদায় করলে অর্জিত হবে ১টি ব্রোঞ্জ টোকেন।'
                    : 'Complete any 3 prayers of the day in Jama\'ah at an approved mosque to earn 1 Bronze Token.'}
                </p>
                <div className="pt-1 flex items-center gap-2 text-[11px] text-amber-500/90 font-bold">
                  <span>🌱 {isBn ? 'প্রাথমিক এন্ট্রি লেভেল রিওয়ার্ড' : 'Entry level reward & savings tier'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Redemption & Usage Guidelines */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4.5 space-y-3.5 shadow-md">
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>{isBn ? 'টোকেন ব্যবহারের নিয়মাবলী' : 'Token Usage & Redemption Rules'}</span>
          </h2>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">
                  {isBn ? '১. একটি অর্ডারে একটি টোকেন:' : '1. One Token Per Purchase:'}
                </span>
                <span className="text-slate-400 text-[11px] leading-relaxed">
                  {isBn
                    ? 'যেকোনো পার্টনার শপ থেকে কেনাকাটার সময় আপনার ওয়ালেটের যেকোনো একটি বৈধ টোকেন রিডিম করে নির্ধারিত ডিসকাউন্ট পেতে পারেন।'
                    : 'You can apply any 1 available token per purchase to unlock exclusive partner store discounts.'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">
                  {isBn ? '২. একবার ব্যবহারের নীতি:' : '2. Single Use Policy:'}
                </span>
                <span className="text-slate-400 text-[11px] leading-relaxed">
                  {isBn
                    ? 'প্রতিটি টোকেন একবারই ব্যবহারযোগ্য। সফলভাবে কেনাকাটায় রিডিম হলে তা ব্যবহৃত তালিকায় স্থানান্তরিত হবে।'
                    : 'Each earned token is single-use and will be marked as redeemed once applied to an order.'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <HeartHandshake className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">
                  {isBn ? '৩. সরাসরি মসজিদ ফান্ডে সাদাকাহ:' : '3. Donate Directly as Sadakah:'}
                </span>
                <span className="text-slate-400 text-[11px] leading-relaxed">
                  {isBn
                    ? 'কেনাকাটার ডিসকাউন্ট না চাইলে আপনার টোকেনটি "My Tokens" পেজ থেকে স্থানীয় মসজিদের উন্নয়ন ফান্ডে সাদাকাহ করতে পারেন।'
                    : 'If you prefer not to use shopping discounts, you can donate your tokens directly to local mosque welfare funds via My Tokens.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Verification & Anti-Spoofing Guidelines */}
        <div className="bg-[#021612] border border-emerald-900/60 rounded-3xl p-4.5 space-y-2.5 shadow-md">
          <h2 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{isBn ? 'সালাত যাচাই ও সততা সংক্রান্ত নীতিমালা' : 'Fairness & Verification Policy'}</span>
          </h2>
          <p className="text-[11px] text-emerald-200/80 leading-relaxed">
            {isBn
              ? 'কেভ কম্প্যানিয়ন্স সিস্টেমে জামাতের সালাত যাচাই জিপিএস ও মসজিদের অনুমোদিত জিওফেন্সের মাধ্যমে স্বয়ংক্রিয়ভাবে নিশ্চিত করা হয়। কোনো প্রকার ফেক/মক লোকেশন ব্যবহার করলে একাউন্ট সাময়িক বা স্থায়ীভাবে স্থগিত হতে পারে।'
              : 'Prayer attendance is verified via GPS location within approved mosque boundaries. The system automatically detects simulated coordinates or GPS spoofing to maintain community integrity.'}
          </p>
        </div>

        {/* Quick Navigation Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          {onNavigateToTokens && (
            <button
              type="button"
              onClick={onNavigateToTokens}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-98"
            >
              <Coins className="w-4 h-4 text-amber-300" />
              <span>{isBn ? 'আমার টোকেন ওয়ালেট দেখুন' : 'View My Tokens'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {onNavigateToShops && (
            <button
              type="button"
              onClick={onNavigateToShops}
              className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span>{isBn ? 'পার্টনার শপ দেখুন' : 'Partner Shops'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onBack}
            className="py-3 px-4 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-slate-400 hover:text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span>{isBn ? 'হোমে ফিরুন' : 'Back to Home'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
