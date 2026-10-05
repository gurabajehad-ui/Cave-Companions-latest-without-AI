import React, { useState, useEffect } from 'react';
import { History, Sparkles, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface CommissionChangeHistoryProps {
  shopId: string;
}

export function CommissionChangeHistory({ shopId }: CommissionChangeHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);

  const toBnNumber = (n: number | string) => {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(n).replace(/\d/g, (d) => bnDigits[Number(d)]);
  };

  useEffect(() => {
    fetchRequests();
  }, [shopId]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminShopCommissionRequests(shopId);
      if (res.success) {
        setRequests(res.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch commission change history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-2" />
        <span className="text-xs">কমিশন পরিবর্তনের ইতিহাস লোড হচ্ছে...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <History className="text-amber-400 w-5 h-5" />
          <span>কমিশন পরিবর্তনের ইতিহাস (COMMISSION CHANGE HISTORY)</span>
        </h2>
        <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700">
          মোট: {toBnNumber(requests.length)} টি
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="p-6 text-center text-slate-500 text-xs italic bg-slate-950/40 rounded-xl border border-slate-800/60">
          এই শপের জন্য কোনো কমিশন পরিবর্তনের ইতিহাস পাওয়া যায়নি।
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req, idx) => (
            <div key={`cch-req-${req.id || 'r'}-${idx}`} className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">
                  পূর্ববর্তী কমিশন: <strong className="text-slate-300">{toBnNumber(req.currentCommissionPercent)}%</strong> → প্রস্তাবিত কমিশন: <strong className="text-amber-400">{toBnNumber(req.requestedCommissionPercent)}%</strong>
                </span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                  req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  req.status === 'rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                  'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {req.status.toUpperCase()}
                </span>
              </div>

              {req.reason && (
                <p className="text-slate-300 text-[11px] italic bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-amber-400 font-bold not-italic">আবেদনের কারণ:</span> {req.reason}
                </p>
              )}

              {req.adminNote && (
                <p className="text-emerald-300 text-[11px] bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-emerald-400 font-bold">অ্যাডমিন নোট:</span> {req.adminNote}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                <span>আবেদনের তারিখ: {new Date(req.createdAt).toLocaleString('bn-BD')}</span>
                {req.reviewedAt && (
                  <span>রিভিউ তারিখ: {new Date(req.reviewedAt).toLocaleString('bn-BD')} {req.reviewedBy ? `(অ্যাডমিন: ${req.reviewedBy})` : ''}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
