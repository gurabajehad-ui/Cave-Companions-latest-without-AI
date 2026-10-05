import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Receipt, X, Store, Sparkles, Calendar, CheckCircle2, DollarSign, FileText } from 'lucide-react';
import { api } from '../services/api';
import { UserRedemptionRecord, TokenType } from '../types';
import { toBnNumber } from '../data/prayerConfig';
import { DigitalCashMemoModal } from './DigitalCashMemoModal';
import { useLanguage } from '../context/LanguageContext';

interface RedemptionHistoryModalProps {
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const RedemptionHistoryModal: React.FC<RedemptionHistoryModalProps> = ({
  onClose,
  onShowToast
}) => {
  const { language } = useLanguage();
  const [redemptions, setRedemptions] = useState<UserRedemptionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMemoRedemption, setSelectedMemoRedemption] = useState<UserRedemptionRecord | null>(null);

  const formatNum = (val: string | number) => {
    return language === 'bn' ? toBnNumber(val) : String(val);
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const data = await api.getMyRedemptions();
        if (data.success) {
          setRedemptions(data.redemptions);
        }
      } catch (err: any) {
        console.error('Failed to load redemption history:', err);
        onShowToast(
          'error', 
          language === 'bn' ? 'ত্রুটি' : 'Error', 
          err.message || (language === 'bn' ? 'রিডেম্পশন ইতিহাস লোড করা যায়নি।' : 'Failed to load redemption history.')
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [onShowToast, language]);

  const getTokenBadge = (type: TokenType) => {
    switch (type) {
      case 'GOLD':
        return { icon: '🥇', label: language === 'bn' ? 'গোল্ড' : 'Gold', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'SILVER':
        return { icon: '🥈', label: language === 'bn' ? 'সিলভার' : 'Silver', bg: 'bg-slate-500/20 text-slate-200 border-slate-400/40' };
      case 'BRONZE':
        return { icon: '🥉', label: language === 'bn' ? 'ব্রোঞ্জ' : 'Bronze', bg: 'bg-orange-500/20 text-amber-400 border-orange-500/40' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-100 relative max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                {language === 'bn' ? 'আমার রিডেম্পশন ইতিহাস' : 'My Redemption History'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'bn' ? 'পার্টনার শপে ব্যবহৃত টোকেন ও ডিসকাউন্টের বিবরণ' : 'Details of tokens & discounts used at partner shops'}
              </p>
            </div>
          </div>

          <button
            id="close-redemption-history-btn"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {isLoading ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400">{language === 'bn' ? 'ইতিহাস লোড হচ্ছে...' : 'Loading history...'}</p>
            </div>
          ) : redemptions.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 p-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/60 text-slate-400 flex items-center justify-center mx-auto text-2xl">
                🧾
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm">
                  {language === 'bn' ? 'কোনো রিডেম্পশন পাওয়া যায়নি' : 'No Redemptions Found'}
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {language === 'bn' 
                    ? 'আপনি এখনো কোনো পার্টনার শপে টোকেন ব্যবহার করেননি। পার্টনার শপ তালিকা থেকে ডিসকাউন্ট গ্রহণ করুন।' 
                    : 'You have not used tokens at any partner shop yet. Claim discounts from the partner shop list.'}
                </p>
              </div>
            </div>
          ) : (
            redemptions.map((item, idx) => {
              const badge = getTokenBadge(item.tokenType);
              return (
                <div
                  key={`rhm-item-${item.id || 'r'}-${idx}`}
                  id={`redemption-card-${item.id}`}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-emerald-400" />
                        <h4 className="font-bold text-white text-sm">
                          {item.shopName}
                        </h4>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {language === 'bn' ? 'রসিদ:' : 'Receipt:'} {item.id}
                      </span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${badge.bg}`}>
                      {badge.icon} {badge.label} ({formatNum(item.discountPercentage)}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-900/90 text-xs border border-slate-800/60">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{language === 'bn' ? 'মোট ক্রয়' : 'Total Purchase'}</span>
                      <span className="font-bold text-white">৳ {formatNum(item.purchaseAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-400 block">{language === 'bn' ? 'ছাড় পেয়েছেন' : 'Discount'}</span>
                      <span className="font-bold text-emerald-400">৳ {formatNum(item.discountAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-300 block">{language === 'bn' ? 'পরিশোধ করেছেন' : 'Paid Amount'}</span>
                      <span className="font-extrabold text-amber-300">৳ {formatNum(item.finalPayableAmount)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {new Date(item.createdAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </span>
                    
                    <button
                      onClick={() => setSelectedMemoRedemption(item)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {language === 'bn' ? 'ডিজিটাল ক্যাশ মেমো' : 'Digital Cash Memo'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          id="close-history-modal-bottom-btn"
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all shrink-0 cursor-pointer"
        >
          {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
        </button>
      </motion.div>

      {/* Digital Cash Memo Modal */}
      {selectedMemoRedemption && (
        <DigitalCashMemoModal
          isOpen={!!selectedMemoRedemption}
          onClose={() => setSelectedMemoRedemption(null)}
          redemption={selectedMemoRedemption}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
