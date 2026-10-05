import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Award,
  Sparkles,
  CheckCircle2,
  Clock,
  QrCode,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Info,
  RefreshCw,
  History,
  Coins,
  ChevronRight,
  X,
  Store,
  Check,
  Heart,
  Gift,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import { MyTokensResponse, TokenType, UserToken, UserRedemptionRecord } from '../types';
import { toBnNumber } from '../data/prayerConfig';
import { ShopRedemptionModal } from './ShopRedemptionModal';
import { useLanguage } from '../context/LanguageContext';

interface MyTokenViewProps {
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  onNavigateToHome?: () => void;
  onNavigateToShops?: () => void;
}

export const MyTokenView: React.FC<MyTokenViewProps> = ({
  onShowToast,
  onNavigateToHome,
  onNavigateToShops
}) => {
  const { t, language } = useLanguage();
  const [tokenData, setTokenData] = useState<MyTokensResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'used' | 'donated'>('available');

  // Token Use Flow States (Phase 5 & 6)
  const [selectedTokenForUse, setSelectedTokenForUse] = useState<UserToken | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRedeemScreen, setShowRedeemScreen] = useState(false);
  const [showDirectRedeemModal, setShowDirectRedeemModal] = useState(false);

  // Donation States
  const [selectedTokenForDonation, setSelectedTokenForDonation] = useState<UserToken | null>(null);
  const [showDonationConfirmModal, setShowDonationConfirmModal] = useState(false);
  const [isDonating, setIsDonating] = useState(false);

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'used' | 'donated';
    tokenId?: string;
    isAll?: boolean;
    title: string;
    description: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch tokens from backend
  const fetchTokens = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getMyTokens();
      setTokenData(data);
    } catch (err: any) {
      console.error('Failed to fetch tokens:', err);
      if (onShowToast) {
        onShowToast('error', language === 'bn' ? 'ত্রুটি' : 'Error', err.message || (language === 'bn' ? 'টোকেন তথ্য লোড করতে সমস্যা হয়েছে।' : 'Failed to load token information.'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast, language]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // Handle clicking "USE" on an available token
  const handleInitiateUse = (token: UserToken) => {
    setSelectedTokenForUse(token);
    setShowConfirmModal(true);
  };

  // Handle clicking "Donate" on an available token
  const handleInitiateDonate = (token: UserToken) => {
    setSelectedTokenForDonation(token);
    setShowDonationConfirmModal(true);
  };

  // Handle confirming the donation
  const handleConfirmDonate = async () => {
    if (!selectedTokenForDonation) return;
    try {
      setIsDonating(true);
      const res = await api.donateToken(selectedTokenForDonation.id);
      if (onShowToast) {
        onShowToast('success', language === 'bn' ? 'আলহামদুলিল্লাহ!' : 'Alhamdulillah!', res.message || (language === 'bn' ? 'টোকেনটি সফলভাবে দান করা হয়েছে।' : 'Token donated successfully.'));
      }
      setShowDonationConfirmModal(false);
      setSelectedTokenForDonation(null);
      await fetchTokens();
    } catch (err: any) {
      console.error('Donate token error:', err);
      if (onShowToast) {
        onShowToast('error', language === 'bn' ? 'ত্রুটি' : 'Error', err.message || (language === 'bn' ? 'টোকেন দান করতে সমস্যা হয়েছে।' : 'Failed to donate token.'));
      }
    } finally {
      setIsDonating(false);
    }
  };

  // Handle continuing from confirmation modal to Redeem Screen
  const handleProceedToRedeem = () => {
    setShowConfirmModal(false);
    setShowDirectRedeemModal(true);
  };

  // Handle close redeem screen
  const handleCloseRedeemScreen = () => {
    setShowRedeemScreen(false);
    setShowDirectRedeemModal(false);
    setSelectedTokenForUse(null);
  };

  const handleRedemptionDone = (redemption: UserRedemptionRecord) => {
    fetchTokens();
    setShowDirectRedeemModal(false);
    setSelectedTokenForUse(null);
  };

  const getTierDetails = (type: TokenType) => {
    switch (type) {
      case 'GOLD':
        return {
          titleBn: 'গোল্ড টোকেন',
          titleEn: 'GOLD TOKEN',
          icon: '🥇',
          bgGradient: 'from-amber-950/80 via-yellow-950/40 to-slate-900',
          borderClass: 'border-amber-500/60 hover:border-amber-400',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
          textColor: 'text-amber-300',
          requiredPrayers: 5,
          desc: language === 'bn' ? 'দৈনিক ৫ ওয়াক্ত জামাতে নামাজ সম্পন্ন' : '5 Waqt daily in Jama\'ah completed'
        };
      case 'SILVER':
        return {
          titleBn: 'সিলভার টোকেন',
          titleEn: 'SILVER TOKEN',
          icon: '🥈',
          bgGradient: 'from-slate-800/80 via-slate-900/40 to-slate-950',
          borderClass: 'border-slate-400/50 hover:border-slate-300',
          badgeBg: 'bg-slate-500/20 text-slate-200 border-slate-400/50',
          textColor: 'text-slate-200',
          requiredPrayers: 4,
          desc: language === 'bn' ? 'দৈনিক ৪ ওয়াক্ত জামাতে নামাজ সম্পন্ন' : '4 Waqt daily in Jama\'ah completed'
        };
      case 'BRONZE':
      default:
        return {
          titleBn: 'ব্রোঞ্জ টোকেন',
          titleEn: 'BRONZE TOKEN',
          icon: '🥉',
          bgGradient: 'from-amber-950/50 via-orange-950/30 to-slate-950',
          borderClass: 'border-amber-700/60 hover:border-amber-600',
          badgeBg: 'bg-amber-800/20 text-amber-400 border-amber-700/50',
          textColor: 'text-amber-400',
          requiredPrayers: 3,
          desc: language === 'bn' ? 'দৈনিক ৩ ওয়াক্ত জামাতে নামাজ সম্পন্ন' : '3 Waqt daily in Jama\'ah completed'
        };
    }
  };

  const formatFormattedDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      if (language === 'bn') {
        const monthsBn = [
          'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
          'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
        ];
        const monthIndex = parseInt(month, 10) - 1;
        return `${toBnNumber(parseInt(day, 10))} ${monthsBn[monthIndex] || month}, ${toBnNumber(parseInt(year, 10))}`;
      } else {
        const monthsEn = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        const monthIndex = parseInt(month, 10) - 1;
        return `${parseInt(day, 10)} ${monthsEn[monthIndex] || month}, ${year}`;
      }
    } catch (e) {
      return dateStr;
    }
  };

  const availableTokens = tokenData?.availableTokens || [];
  const usedTokens = tokenData?.usedTokens || [];
  const donatedTokens = [...availableTokens, ...usedTokens].filter(t => t.isDonated);
  const canRedeemToday = tokenData ? tokenData.canRedeemToday : true;
  const dailyWarning = tokenData?.dailyRedeemWarning;

  const promptDeleteUsed = (tokenId?: string) => {
    setDeleteModal({
      isOpen: true,
      type: 'used',
      tokenId,
      isAll: !tokenId,
      title: tokenId 
        ? (language === 'bn' ? 'ব্যবহারের ইতিহাস মুছুন' : 'Delete Used History')
        : (language === 'bn' ? 'সকল ব্যবহারের ইতিহাস মুছুন' : 'Clear All Used History'),
      description: tokenId
        ? (language === 'bn' ? 'আপনি কি নিশ্চিত যে এই টোকেন ব্যবহারের ইতিহাসটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this token usage history?')
        : (language === 'bn' ? 'আপনি কি নিশ্চিত যে সকল ব্যবহারের ইতিহাস মুছে ফেলতে চান?' : 'Are you sure you want to clear all used token history?')
    });
  };

  const promptDeleteDonated = (tokenId?: string) => {
    setDeleteModal({
      isOpen: true,
      type: 'donated',
      tokenId,
      isAll: !tokenId,
      title: tokenId 
        ? (language === 'bn' ? 'দান করার ইতিহাস মুছুন' : 'Delete Donation History')
        : (language === 'bn' ? 'সকল দান করার ইতিহাস মুছুন' : 'Clear All Donated History'),
      description: tokenId
        ? (language === 'bn' ? 'আপনি কি নিশ্চিত যে এই দান করার ইতিহাসটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this donation history?')
        : (language === 'bn' ? 'আপনি কি নিশ্চিত যে সকল দান করার ইতিহাস মুছে ফেলতে চান?' : 'Are you sure you want to clear all donation history?')
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    try {
      setIsDeleting(true);
      let res;
      if (deleteModal.type === 'used') {
        res = await api.deleteUsedTokenHistory(deleteModal.tokenId);
      } else {
        res = await api.deleteDonatedTokenHistory(deleteModal.tokenId);
      }
      if (res.success) {
        if (onShowToast) onShowToast('success', language === 'bn' ? 'মুছে ফেলা হয়েছে' : 'Deleted', res.message);
        setDeleteModal(null);
        await fetchTokens();
      }
    } catch (err: any) {
      if (onShowToast) onShowToast('error', language === 'bn' ? 'ত্রুটি' : 'Error', err.message || (language === 'bn' ? 'মুছে ফেলা সম্ভব হয়নি।' : 'Failed to delete.'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div id="my-token-view-container" className="space-y-4 sm:space-y-5 pb-24 text-slate-100 max-w-5xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-amber-950/70 border border-emerald-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-8 -top-8 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              {t('token.title')}
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed max-w-md">
              {language === 'bn' ? 'আর সম্মান তো কেবল আল্লাহর, তাঁর রাসূলের এবং মুমিনদের; কিন্তু মুনাফিকরা তা জানে না' : 'And honor belongs to Allah, and to His Messenger, and to the believers...'}
            </p>
          </div>

          <button
            id="refresh-tokens-btn"
            onClick={fetchTokens}
            disabled={isLoading}
            className="p-2.5 rounded-xl sm:rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-emerald-400 hover:text-emerald-300 transition-all shrink-0 active:scale-95 cursor-pointer"
            title={language === 'bn' ? 'রিফ্রেশ করুন' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation: Available Tokens vs Used Tokens History vs Donated */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-x-auto scrollbar-none">
        <button
          id="tab-available-tokens"
          onClick={() => setActiveTab('available')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'available'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Award className="w-3.5 h-3.5 shrink-0" />
          <span>{language === 'bn' ? 'ব্যবহারযোগ্য' : 'Available'} ({language === 'bn' ? toBnNumber(availableTokens.length) : availableTokens.length})</span>
        </button>

        <button
          id="tab-used-tokens"
          onClick={() => setActiveTab('used')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'used'
              ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <History className="w-3.5 h-3.5 shrink-0" />
          <span>{language === 'bn' ? 'ইতিহাস' : 'History'} ({language === 'bn' ? toBnNumber(usedTokens.length) : usedTokens.length})</span>
        </button>

        <button
          id="tab-donated-tokens"
          onClick={() => setActiveTab('donated')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'donated'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Heart className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{language === 'bn' ? 'দানকৃত' : 'Donated'} ({language === 'bn' ? toBnNumber(donatedTokens.length) : donatedTokens.length})</span>
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium">{t('common.loading')}</p>
        </div>
      )}

      {/* Tab 1: Available Tokens List */}
      {!isLoading && activeTab === 'available' && (
        <div className="space-y-4">
          {availableTokens.length === 0 ? (
            /* Empty State for Available Tokens */
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-7 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-3xl">
                🪙
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h3 className="text-base font-bold text-white">
                  {t('token.noAvailableTokens')}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t('token.dailyPrayerTip')}
                </p>
                <div className="grid grid-cols-3 gap-2 pt-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-900/60">
                    <span className="text-base">🥉</span>
                    <p className="font-bold text-amber-400 mt-1">{t('token.threePrayers')}</p>
                    <span className="text-[10px] text-slate-400">{language === 'bn' ? 'ব্রোঞ্জ' : 'Bronze'}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/40 border border-slate-700/60">
                    <span className="text-base">🥈</span>
                    <p className="font-bold text-slate-200 mt-1">{t('token.fourPrayers')}</p>
                    <span className="text-[10px] text-slate-400">{language === 'bn' ? 'সিলভার' : 'Silver'}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-500/40">
                    <span className="text-base">🥇</span>
                    <p className="font-bold text-amber-300 mt-1">{t('token.fivePrayers')}</p>
                    <span className="text-[10px] text-slate-400">{language === 'bn' ? 'গোল্ড' : 'Gold'}</span>
                  </div>
                </div>
              </div>

              {onNavigateToHome && (
                <button
                  id="empty-go-home-btn"
                  onClick={onNavigateToHome}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-all active:scale-95"
                >
                  <span>{t('token.viewTodayPrayers')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {availableTokens.map((token, idx) => {
                const tier = getTierDetails(token.tokenType);
                return (
                  <motion.div
                    key={`avail-tok-${token.id || 'tok'}-${idx}`}
                    id={`token-card-${token.id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.25) }}
                    className={`p-3 rounded-2xl bg-gradient-to-r ${tier.bgGradient} border ${tier.borderClass} shadow-md transition-all flex flex-col justify-between gap-2.5 relative overflow-hidden`}
                  >
                    {/* Top: Token Info & Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-950/60 border border-white/10 flex items-center justify-center text-lg shrink-0 shadow-inner">
                          {tier.icon}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold border ${tier.badgeBg}`}>
                              {language === 'bn' ? tier.titleBn : tier.titleEn}
                            </span>
                            {token.isDonated ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-600 text-white flex items-center gap-0.5 border border-emerald-400">
                                <Heart className="w-2.5 h-2.5 fill-current shrink-0 text-white animate-pulse" />
                                <span>{language === 'bn' ? 'দানকৃত' : 'Donated'}</span>
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                {language === 'bn' ? 'উপলব্ধ' : 'AVAILABLE'}
                              </span>
                            )}
                          </div>

                          <h3 className={`text-xs sm:text-sm font-extrabold ${tier.textColor} truncate`}>
                            {language === 'bn' ? tier.titleBn : tier.titleEn}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Source prayers, date & Action Button */}
                    <div className="space-y-2.5 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between gap-1.5 text-[10px] text-slate-300">
                        <span className="flex items-center gap-1 shrink-0 font-medium">
                          <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{language === 'bn' ? `${toBnNumber(token.sourcePrayerCount)}/৫ ওয়াক্ত` : `${token.sourcePrayerCount}/5 Prayers`}</span>
                        </span>
                        <span className="truncate text-slate-400 text-right">
                          {formatFormattedDate(token.earnedDate)}
                        </span>
                      </div>

                      {token.isDonated ? (
                        <div className="space-y-1.5 w-full">
                          <p className="text-[9.5px] text-emerald-300 font-bold text-center flex items-center justify-center gap-1 bg-emerald-950/40 py-1 px-1.5 rounded-lg border border-emerald-500/30">
                            <Heart className="w-2.5 h-2.5 fill-current text-emerald-400" />
                            <span>{t('token.donatedDesc')}</span>
                          </p>
                          <button
                            id={`use-token-btn-${token.id}`}
                            onClick={() => handleInitiateUse(token)}
                            className="w-full py-1.5 px-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-[11px] font-black shadow-xs hover:shadow-amber-500/20 transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>{language === 'bn' ? 'ব্যবহার করুন' : 'Use Token'}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 w-full">
                          <button
                            id={`donate-token-btn-${token.id}`}
                            onClick={() => handleInitiateDonate(token)}
                            className="flex-1 py-1.5 px-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-[11px] font-black shadow-xs hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer border border-emerald-500/20"
                          >
                            <Heart className="w-3 h-3 fill-current text-white" />
                            <span>{t('token.donate')}</span>
                          </button>

                          <button
                            id={`use-token-btn-${token.id}`}
                            onClick={() => handleInitiateUse(token)}
                            className="flex-1 py-1.5 px-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-[11px] font-black shadow-xs hover:shadow-amber-500/20 transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>{t('token.use')}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Used Tokens History */}
      {!isLoading && activeTab === 'used' && (
        <div className="space-y-4">
          {usedTokens.length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                id="delete-all-used-history-btn"
                onClick={() => promptDeleteUsed()}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('token.clearAllHistory')}</span>
              </button>
            </div>
          )}
          {usedTokens.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                <History className="w-5 h-5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white">
                {t('token.noTokensUsed')}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'bn' ? 'আপনার অর্জিত টোকেনগুলো পার্টনার আউটলেটে ব্যবহারের পর এখানে সংরক্ষিত থাকবে।' : 'Your earned tokens will be recorded here after redeeming at partner outlets.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {usedTokens.map((token, idx) => {
                const tier = getTierDetails(token.tokenType);
                return (
                  <div
                    key={`used-tok-${token.id || 'used'}-${idx}`}
                    id={`used-token-card-${token.id}`}
                    className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between gap-2 opacity-80 relative group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-base shrink-0 grayscale">
                          {tier.icon}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-200 truncate">
                              {language === 'bn' ? tier.titleBn : tier.titleEn}
                            </h4>
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              {language === 'bn' ? 'ব্যবহৃত' : 'USED'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {language === 'bn' ? `${toBnNumber(token.sourcePrayerCount)} ওয়াক্ত জামাত` : `${token.sourcePrayerCount} Prayers`}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        id={`delete-used-token-btn-${token.id}`}
                        onClick={() => promptDeleteUsed(token.id)}
                        title={language === 'bn' ? 'এই ইতিহাস মুছুন' : 'Delete this record'}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors shrink-0 cursor-pointer active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-400 space-y-0.5 pt-1.5 border-t border-slate-800/80">
                      <p className="truncate">{language === 'bn' ? 'অর্জিত:' : 'Earned:'} {formatFormattedDate(token.earnedDate)}</p>
                      {token.usedAt && (
                        <p className="text-amber-400/80 truncate">
                          {language === 'bn' ? 'ব্যবহৃত:' : 'Used:'} {formatFormattedDate(token.usedAt.split('T')[0])}
                        </p>
                      )}
                      {token.redemptionRef && (
                        <p className="text-[9px] text-slate-500 font-mono truncate">
                          {language === 'bn' ? 'রেফ:' : 'Ref:'} {token.redemptionRef}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Donated Tokens List */}
      {!isLoading && activeTab === 'donated' && (
        <div className="space-y-4">
          {donatedTokens.length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                id="delete-all-donated-history-btn"
                onClick={() => promptDeleteDonated()}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('token.clearAllDonated')}</span>
              </button>
            </div>
          )}
          {donatedTokens.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <Heart className="w-6 h-6 fill-current text-emerald-500 animate-pulse" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white">
                {t('token.noTokensDonated')}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {language === 'bn' ? 'আপনার অর্জিত গোল্ড, সিলভার বা ব্রোঞ্জ টোকেনগুলো দান করে দিন। এর ফলে ক্রয়ের ডিসকাউন্ট অর্থ সরাসরি আপনার পছন্দের মসজিদের কল্যাণ তহবিলে যুক্ত হবে।' : 'Donate your earned Gold, Silver, or Bronze tokens. The discount amount will be donated directly to your selected mosque charity fund.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {donatedTokens.map((token, idx) => {
                const tier = getTierDetails(token.tokenType);
                return (
                  <div
                    key={`donated-tok-${token.id || 'don'}-${idx}`}
                    id={`donated-token-card-${token.id}`}
                    className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col justify-between gap-2.5 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-950 border border-emerald-500/20 flex items-center justify-center text-base shrink-0">
                          {tier.icon}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-200 truncate">
                              {language === 'bn' ? tier.titleBn : tier.titleEn}
                            </h4>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {language === 'bn' ? `${toBnNumber(token.sourcePrayerCount)} ওয়াক্ত জামাত` : `${token.sourcePrayerCount} Prayers`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold bg-emerald-600 text-white flex items-center gap-0.5 border border-emerald-500">
                          <Heart className="w-2.5 h-2.5 fill-current shrink-0" />
                          <span>{language === 'bn' ? 'দানকৃত' : 'Donated'}</span>
                        </span>

                        <button
                          type="button"
                          id={`delete-donated-token-btn-${token.id}`}
                          onClick={() => promptDeleteDonated(token.id)}
                          title={language === 'bn' ? 'এই ইতিহাস মুছুন' : 'Delete this record'}
                          className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors shrink-0 cursor-pointer active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-300 space-y-1 pt-2 border-t border-emerald-500/10">
                      <p className="truncate">{language === 'bn' ? 'অর্জিত:' : 'Earned:'} {formatFormattedDate(token.earnedDate)}</p>
                      {token.earnedMosqueName && (
                        <p className="text-emerald-400 font-bold truncate flex items-center gap-1">
                          <Store className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{language === 'bn' ? 'মসজিদ:' : 'Mosque:'} {token.earnedMosqueName}</span>
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-1.5 pt-1">
                        <span className="text-[9px] text-slate-500 font-mono truncate">
                          {language === 'bn' ? 'আইডি:' : 'ID:'} {token.id}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                          token.status === 'USED' 
                            ? 'bg-slate-800 text-slate-400 border border-slate-700' 
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {token.status === 'USED' 
                            ? (language === 'bn' ? 'ব্যবহৃত' : 'USED') 
                            : (language === 'bn' ? 'ব্যবহারযোগ্য' : 'AVAILABLE')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}


      {/* ==================================================== */}
      {/* MODAL 1: TOKEN USE CONFIRMATION DIALOG (Phase 5)     */}
      {/* ==================================================== */}
      <AnimatePresence>
        {showConfirmModal && selectedTokenForUse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-100 relative overflow-hidden"
            >
              {/* Top bar with close */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold uppercase">
                  <Coins className="w-3 h-3" />
                  <span>{t('token.useConfirmTitle')}</span>
                </div>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Title */}
              <div>
                <h3 className="text-lg font-bold text-white">
                  {language === 'bn' ? 'আপনি কি এই Token ব্যবহার করতে চান?' : 'Do you want to use this Token?'}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  {language === 'bn' ? 'নিচের টোকেনের বিবরণ যাচাই করে এগিয়ে যান:' : 'Verify token details below to proceed:'}
                </p>
              </div>

              {/* Selected Token Card Preview */}
              {(() => {
                const tier = getTierDetails(selectedTokenForUse.tokenType);
                return (
                  <div className={`p-4 rounded-2xl bg-gradient-to-r ${tier.bgGradient} border ${tier.borderClass} space-y-2`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{tier.icon}</span>
                        <div>
                          <h4 className={`text-sm font-bold ${tier.textColor}`}>
                            {language === 'bn' ? tier.titleBn : tier.titleEn} ({selectedTokenForUse.tokenType})
                          </h4>
                          <span className="text-[10px] text-emerald-300 font-bold">
                            STATUS: AVAILABLE
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-300 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-white/10">
                        {language === 'bn' ? `${toBnNumber(selectedTokenForUse.sourcePrayerCount)}/৫ ওয়াক্ত` : `${selectedTokenForUse.sourcePrayerCount}/5 Prayers`}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-white/10 text-xs text-slate-300 flex justify-between">
                      <span>{language === 'bn' ? 'অর্জিত তারিখ:' : 'Earned Date:'}</span>
                      <strong className="text-white">{formatFormattedDate(selectedTokenForUse.earnedDate)}</strong>
                    </div>
                  </div>
                );
              })()}

              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/50 flex items-start gap-2 text-xs text-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  {language === 'bn' ? 'এগিয়ে গেলে আপনাকে পার্টনার দোকান QR স্ক্যানিং পেজে নিয়ে যাওয়া হবে। কিউআর কোড সফলভাবে স্ক্যান না হওয়া পর্যন্ত আপনার টোকেনটি অক্ষত থাকবে।' : 'Proceeding will take you to the partner shop QR redemption screen. Your token remains untouched until the redemption is successfully completed.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  id="confirm-modal-cancel-btn"
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all"
                >
                  {t('common.cancel')}
                </button>

                <button
                  id="confirm-modal-proceed-btn"
                  type="button"
                  onClick={handleProceedToRedeem}
                  className="flex-1 py-2.5 px-4 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg hover:shadow-amber-500/20 active:scale-95"
                >
                  <span>{t('common.continue')}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL 1.5: TOKEN DONATION CONFIRMATION DIALOG        */}
      {/* ==================================================== */}
      <AnimatePresence>
        {showDonationConfirmModal && selectedTokenForDonation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-emerald-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-100 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

              {/* Top bar with close */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold uppercase">
                  <Heart className="w-3 h-3 fill-current text-emerald-400" />
                  <span>{t('token.donateConfirmTitle')}</span>
                </div>
                <button
                  onClick={() => setShowDonationConfirmModal(false)}
                  disabled={isDonating}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Title */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>{language === 'bn' ? 'আপনি কি এই টোকেনটি দান করতে চান?' : 'Do you want to donate this token?'}</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  {t('token.donateNotice')}
                </p>
              </div>

              {/* preview card */}
              {(() => {
                const tier = getTierDetails(selectedTokenForDonation.tokenType);
                return (
                  <div className={`p-4 rounded-2xl bg-gradient-to-r ${tier.bgGradient} border border-emerald-500/30 space-y-2`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{tier.icon}</span>
                        <div>
                          <h4 className={`text-sm font-bold ${tier.textColor}`}>
                            {language === 'bn' ? tier.titleBn : tier.titleEn} ({selectedTokenForDonation.tokenType})
                          </h4>
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <Heart className="w-2.5 h-2.5 fill-current text-emerald-400" />
                            <span>{language === 'bn' ? 'মহৎ উদ্দেশ্যে প্রস্তুত' : 'Ready for Charity'}</span>
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-300 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-white/10">
                        {language === 'bn' ? `${toBnNumber(selectedTokenForDonation.sourcePrayerCount)}/৫ ওয়াক্ত` : `${selectedTokenForDonation.sourcePrayerCount}/5 Prayers`}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-white/10 text-xs text-slate-300 flex justify-between">
                      <span>{language === 'bn' ? 'অর্জিত তারিখ:' : 'Earned Date:'}</span>
                      <strong className="text-white">{formatFormattedDate(selectedTokenForDonation.earnedDate)}</strong>
                    </div>
                  </div>
                );
              })()}

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs text-slate-300 leading-relaxed">
                <div className="flex items-start gap-2 text-[11px]">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{language === 'bn' ? 'টোকেনটির মেয়াদ শেষ হবে না, আপনি এটি দোকানে ব্যবহার করতে পারবেন।' : 'The token will not expire, you can redeem it at shops.'}</span>
                </div>
                <div className="flex items-start gap-2 text-[11px]">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{language === 'bn' ? 'দোকানে ব্যবহারের সময় আপনি কোনো ব্যক্তিগত ডিসকাউন্ট পাবেন না (ফুল বিল দিতে হবে)।' : 'No personal discount will be deducted from your bill.'}</span>
                </div>
                <div className="flex items-start gap-2 text-[11px]">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{language === 'bn' ? 'আপনার ভাগের ডিসকাউন্টের সমপরিমাণ অর্থ মসজিদের তহবিলে সরাসরি দান হিসেবে জমা হবে।' : 'The entire discount value goes directly to the mosque welfare fund.'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  id="donate-modal-cancel-btn"
                  type="button"
                  onClick={() => setShowDonationConfirmModal(false)}
                  disabled={isDonating}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>

                <button
                  id="donate-modal-confirm-btn"
                  type="button"
                  onClick={handleConfirmDonate}
                  disabled={isDonating}
                  className="flex-1 py-2.5 px-4 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg hover:shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                >
                  <span>{isDonating ? (language === 'bn' ? 'প্রক্রিয়া চলছে...' : 'Processing...') : (language === 'bn' ? 'দান করুন (Donate)' : 'Donate Token')}</span>
                  <Heart className="w-4 h-4 fill-current text-white shrink-0" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* DIRECT PHASE 6 REDEEM MODAL                         */}
      {/* ==================================================== */}
      <AnimatePresence>
        {showDirectRedeemModal && selectedTokenForUse && (
          <ShopRedemptionModal
            initialToken={selectedTokenForUse}
            availableTokens={availableTokens}
            onClose={handleCloseRedeemScreen}
            onSuccess={handleRedemptionDone}
            onShowToast={onShowToast || (() => {})}
          />
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* DELETE HISTORY CONFIRMATION MODAL                   */}
      {/* ==================================================== */}
      <AnimatePresence>
        {deleteModal?.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center text-slate-100"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  {deleteModal.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {deleteModal.description}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  id="cancel-delete-modal-btn"
                  onClick={() => setDeleteModal(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  id="confirm-delete-modal-btn"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg hover:shadow-rose-600/30 disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('common.delete')}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

