import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Clock, ShieldCheck, FileText, RefreshCw, LogOut, Store, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { MerchantProgressTracker } from './MerchantProgressTracker';

interface MerchantPendingScreenProps {
  shop: any;
  verification: any;
  onRefresh: () => void;
  onLogout: () => void;
}

export const MerchantPendingScreen: React.FC<MerchantPendingScreenProps> = ({
  shop,
  verification,
  onRefresh,
  onLogout
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-br from-amber-950/60 via-emerald-950/80 to-emerald-900/60 backdrop-blur-md rounded-2xl border border-amber-500/40 p-6 shadow-2xl text-white text-center">
        <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/30 animate-pulse">
          <Clock className="w-8 h-8" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30 mb-2">
          অ্যাডমিন পর্যালোচনার জন্য অপেক্ষমাণ (PENDING VERIFICATION)
        </span>

        <h2 className="text-xl sm:text-2xl font-bold text-amber-100">
          আপনার মার্চেন্ট রেজিস্ট্রেশন আবেদন সফলভাবে গৃহীত হয়েছে
        </h2>

        <p className="text-xs sm:text-sm text-emerald-200/90 max-w-xl mx-auto mt-2 leading-relaxed">
          গুহা কমপ্যানিয়নস অ্যাডমিন টিম আপনার ব্যবসায়ী নথিপত্র এবং মার্চেন্ট চুক্তি পরীক্ষা করছেন। যাচাই সম্পূর্ণ হলে আপনার একাউন্ট ও কাস্টমার কিউআর রিডেম্পশন সেবা সক্রিয় হবে।
        </p>

        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            স্ট্যাটাস রিফ্রেশ করুন
          </button>

          <button
            onClick={onLogout}
            className="px-4 py-2.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            লগআউট
          </button>
        </div>
      </div>

      {/* Visual Progress Tracker & Document Checklist */}
      <MerchantProgressTracker
        verification={verification}
        shop={shop}
        status="PENDING"
      />
    </div>
  );
};

