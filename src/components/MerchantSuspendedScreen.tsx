import React from 'react';
import { AlertOctagon, PhoneCall, RefreshCw, LogOut } from 'lucide-react';

interface MerchantSuspendedScreenProps {
  verification?: any;
  shop?: any;
  merchant?: any;
  onRefresh?: () => void;
  onLogout: () => void;
}

export const MerchantSuspendedScreen: React.FC<MerchantSuspendedScreenProps> = ({
  verification,
  shop,
  merchant,
  onRefresh,
  onLogout
}) => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-gradient-to-br from-red-950 via-slate-900 to-amber-950 border border-red-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl text-white text-center">
        <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/40 shadow-inner">
          <AlertOctagon className="w-10 h-10" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 mb-2">
          অ্যাকাউন্ট সাময়িক স্থগিত (ACCOUNT SUSPENDED)
        </span>

        <h2 className="text-xl sm:text-2xl font-bold text-red-100">
          আপনার মার্চেন্ট অ্যাকাউন্ট বা পার্টনার শপ স্থগিত করা হয়েছে
        </h2>

        {shop && (
          <p className="text-sm font-semibold text-amber-300 mt-1">
            দোকান: {shop.nameBn || shop.name}
          </p>
        )}

        {/* Reason Box */}
        <div className="mt-5 bg-slate-950/80 border border-red-500/30 rounded-2xl p-4 text-left space-y-2">
          <span className="text-xs font-bold text-red-300 block">
            স্থগিতের বিবরণ (Suspension Details):
          </span>
          <p className="text-sm text-slate-200 bg-red-950/40 p-3 rounded-xl border border-red-500/20">
            {shop?.suspensionReason || verification?.suspensionReason || 'নীতিমালা লঙ্ঘন বা প্রশাসনিক পর্যালোচনার কারণে আপনার মার্চেন্ট এক্সেস সাময়িকভাবে স্থগিত রয়েছে।'}
          </p>
        </div>

        <p className="text-xs text-slate-300 mt-4 leading-relaxed max-w-md mx-auto">
          অ্যাকাউন্ট পুনরায় সক্রিয় করতে অথবা বিস্তারিত জানতে অনুগ্রহ করে অ্যাডমিন বা সাপোর্ট টিমের সাথে সরাসরি যোগাযোগ করুন।
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <a
            href="tel:+8801700000000"
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-colors"
          >
            <PhoneCall className="w-4 h-4" />
            হেল্পলাইনে যোগাযোগ করুন
          </a>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              স্ট্যাটাস রিফ্রেশ করুন
            </button>
          )}

          <button
            onClick={onLogout}
            className="px-4 py-2.5 rounded-xl bg-red-900/60 hover:bg-red-800 text-red-200 font-semibold text-xs flex items-center gap-2 border border-red-500/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            লগআউট
          </button>
        </div>
      </div>
    </div>
  );
};
