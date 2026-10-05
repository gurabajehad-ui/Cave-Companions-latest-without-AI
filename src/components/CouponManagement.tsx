import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, Percent, DollarSign, ToggleLeft, ToggleRight, Check, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export const CouponManagement: React.FC = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCoupon, setNewCoupon] = useState({ code: '', discountType: 'percentage', discountValue: 0, usageLimit: 1 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getAdminCoupons();
      setCoupons(res.coupons || []);
    } catch (err: any) {
      console.error('Error fetching coupons:', err);
      setErrorMsg('কুপন লোড করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newCoupon.code.trim()) {
      setErrorMsg('অনুগ্রহ করে একটি কুপন কোড লিখুন।');
      return;
    }
    if (newCoupon.discountValue <= 0) {
      setErrorMsg('অনুগ্রহ করে ছাড়ের সঠিক পরিমাণ নির্ধারণ করুন।');
      return;
    }
    if (newCoupon.discountType === 'percentage' && newCoupon.discountValue > 100) {
      setErrorMsg('শতাংশ ছাড়ের পরিমাণ ১০০% এর বেশি হতে পারবে না।');
      return;
    }
    if (newCoupon.usageLimit < 1) {
      setErrorMsg('ব্যবহারের সীমা অন্তত ১ হতে হবে।');
      return;
    }

    try {
      const formatted = {
        ...newCoupon,
        code: newCoupon.code.trim().toUpperCase()
      };
      const res = await api.createAdminCoupon(formatted);
      if (res.success) {
        setSuccessMsg('কুপনটি সফলভাবে তৈরি করা হয়েছে!');
        setNewCoupon({ code: '', discountType: 'percentage', discountValue: 0, usageLimit: 1 });
        fetchCoupons();
      } else {
        setErrorMsg('কুপন তৈরি করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      console.error('Error creating coupon:', err);
      setErrorMsg(err.message || 'কুপন তৈরি করতে সমস্যা হয়েছে।');
    }
  };

  const deleteCoupon = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }

    setConfirmDeleteId(null);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Optimistic update
    const originalCoupons = [...coupons];
    setCoupons(prev => prev.filter(c => c.id !== id));

    try {
      const res = await api.deleteAdminCoupon(id);
      if (res.success) {
        setSuccessMsg('কুপনটি সফলভাবে ডিলিট করা হয়েছে!');
        // Re-fetch to ensure sync with server
        fetchCoupons();
      } else {
        setCoupons(originalCoupons); // Rollback
        setErrorMsg('কুপন ডিলিট করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      setCoupons(originalCoupons); // Rollback
      console.error('Error deleting coupon:', err);
      setErrorMsg('কুপন ডিলিট করতে ব্যর্থ হয়েছে।');
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.updateAdminCouponStatus(id, !currentStatus);
      if (res.success) {
        setSuccessMsg(`কুপনটি সফলভাবে ${!currentStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে!`);
        fetchCoupons();
      } else {
        setErrorMsg('কুপন স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      console.error('Error toggling coupon status:', err);
      setErrorMsg('কুপন স্ট্যাটাস পরিবর্তন করতে ব্যর্থ হয়েছে।');
    }
  };

  const updateCouponUsageLimit = async (id: string, newLimit: number) => {
    if (newLimit < 1) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.updateAdminCouponUsageLimit(id, newLimit);
      if (res.success) {
        setSuccessMsg('ব্যবহারের সীমা আপডেট করা হয়েছে!');
        fetchCoupons();
      } else {
        setErrorMsg('সীমা আপডেট করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      setErrorMsg('সীমা আপডেট করতে ব্যর্থ হয়েছে।');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Status Alerts */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2">
            <Tag className="w-6 h-6 text-amber-500" />
            <span>কুপন ম্যানেজমেন্ট</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            গ্রাহকদের জন্য বিভিন্ন অফার ও কুপন কোড তৈরি এবং নিয়ন্ত্রণ করুন।
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-400 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-950/40 border border-rose-800 text-xs text-rose-400 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Coupon Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-5 space-y-4 h-fit">
          <h2 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2">নতুন কুপন যুক্ত করুন</h2>
          <form onSubmit={createCoupon} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">কুপন কোড</label>
              <input
                type="text"
                placeholder="যেমন: SAVE10, EidMubarak"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">ছাড়ের ধরন</label>
                <select
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  value={newCoupon.discountType}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value })}
                >
                  <option value="percentage">শতাংশ (%)</option>
                  <option value="amount">টাকা (৳)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">ছাড়ের পরিমাণ</label>
                <input
                  type="number"
                  min="1"
                  placeholder="যেমন: ১০ বা ১০০"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  value={newCoupon.discountValue || ''}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">সর্বমোট ব্যবহারের সীমা (usage limit)</label>
              <input
                type="number"
                min="1"
                placeholder="যেমন: ৫০ বার ব্যবহার করা যাবে"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                value={newCoupon.usageLimit || ''}
                onChange={(e) => setNewCoupon({ ...newCoupon, usageLimit: Number(e.target.value) })}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] transition text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>কুপন তৈরি করুন</span>
            </button>
          </form>
        </div>

        {/* Coupon List Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-5 lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
            <span>কুপন তালিকা</span>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-semibold">
              মোট: {coupons.length}
            </span>
          </h2>

          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">লোড হচ্ছে...</div>
          ) : coupons.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">কোনো কুপন তৈরি করা হয়নি।</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <th className="p-3 font-semibold text-slate-300">কোড</th>
                    <th className="p-3 font-semibold text-slate-300 text-center">ছাড়ের ধরন</th>
                    <th className="p-3 font-semibold text-slate-300 text-center">ছাড়ের পরিমাণ</th>
                    <th className="p-3 font-semibold text-slate-300 text-center">সীমা/ব্যবহার</th>
                    <th className="p-3 font-semibold text-slate-300 text-center">অবস্থা</th>
                    <th className="p-3 font-semibold text-slate-300 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {coupons.map((c, idx) => {
                    const isLimitReached = c.usedCount >= c.usageLimit;
                    return (
                      <tr key={`cpn-${c.id || 'c'}-${idx}`} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono font-bold text-amber-400 uppercase select-all">
                          {c.code}
                        </td>
                        <td className="p-3 text-center">
                          {c.discountType === 'percentage' ? (
                            <span className="inline-flex items-center gap-1 bg-amber-950/40 text-amber-400 px-2.5 py-1 rounded-full border border-amber-900/50 text-[10px] font-semibold">
                              <Percent className="w-3 h-3" />
                              <span>শতাংশ (%)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-950/40 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-900/50 text-[10px] font-semibold">
                              <DollarSign className="w-3 h-3" />
                              <span>টাকা (৳)</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center text-slate-100 font-bold">
                          {c.discountType === 'percentage' ? `${c.discountValue}%` : `৳${c.discountValue}`}
                        </td>
                        <td className="p-3 text-center text-slate-300 font-medium">
                          <span className={isLimitReached ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                            {c.usedCount}
                          </span>
                          <span className="text-slate-500"> / </span>
                          <input
                            type="number"
                            defaultValue={c.usageLimit}
                            onBlur={(e) => updateCouponUsageLimit(c.id, Number(e.target.value))}
                            className="w-16 bg-slate-950 border border-slate-700 text-slate-100 rounded px-1 text-center focus:border-amber-500 focus:outline-none"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => toggleStatus(c.id, c.isActive)}
                            className="focus:outline-none transition-transform active:scale-90 inline-flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800"
                            title={c.isActive ? 'নিষ্ক্রিয় করতে ক্লিক করুন' : 'সক্রিয় করতে ক্লিক করুন'}
                          >
                            {c.isActive ? (
                              <>
                                <ToggleRight className="w-5 h-5 text-emerald-500 cursor-pointer" />
                                <span className="text-emerald-400 font-semibold text-[10px]">সক্রিয়</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-5 h-5 text-slate-500 cursor-pointer" />
                                <span className="text-slate-400 font-semibold text-[10px]">নিষ্ক্রিয়</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          {confirmDeleteId === c.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => deleteCoupon(c.id)}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[10px] uppercase transition-all cursor-pointer"
                                title="ডিলিট নিশ্চিত করুন"
                              >
                                নিশ্চিত?
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-[10px] transition-all cursor-pointer"
                                title="বাতিল করুন"
                              >
                                বাতিল
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => deleteCoupon(c.id)}
                              className="p-1.5 bg-rose-950/40 border border-rose-900/50 hover:bg-rose-900 text-rose-400 hover:text-white rounded-lg transition-all cursor-pointer"
                              title="কুপন ডিলিট করুন"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
