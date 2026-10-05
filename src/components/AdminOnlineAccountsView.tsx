import React, { useState, useEffect } from 'react';
import { Download, Search, FileText, TrendingUp, AlertCircle, RefreshCw, Trash2, X, Heart, User, Landmark } from 'lucide-react';
import { OnlineAccountsSummary, OnlineFinancialRecord } from '../types';
import { api } from '../services/api';
import { UserDetailModal } from './UserDetailModal';
import { MosqueDetailModal } from './MosqueDetailModal';

export const AdminOnlineAccountsView: React.FC = () => {
  const [summary, setSummary] = useState<OnlineAccountsSummary | null>(null);
  const [records, setRecords] = useState<OnlineFinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<OnlineFinancialRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Detail Modals State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedMosqueInfo, setSelectedMosqueInfo] = useState<{ id?: string | null; name?: string | null } | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminOnlineAccounts({
        search: searchQuery || undefined
      });
      if (res.success) {
        setSummary(res.summary);
        setRecords(res.records || []);
      }
    } catch (err) {
      console.error('Error fetching online accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAccounts();
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    setExporting(true);
    try {
      await api.downloadAdminOnlineAccountsReport({
        format,
        searchQuery: searchQuery || undefined
      });
    } catch (err: any) {
      console.error('Export error:', err);
      alert(err.message || 'ডাউনলোড করতে সমস্যা হয়েছে।');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    const targetId = recordToDelete.id;
    const targetRecord = recordToDelete;
    setDeleting(true);
    try {
      const res = await api.deleteAdminOnlineAccountRecord(targetId);
      if (res.success) {
        // Remove from state immediately
        setRecords(prev => prev.filter(r => r.id !== targetId));
        if (summary) {
          setSummary(prev => prev ? {
            ...prev,
            totalItemCount: Math.max(0, prev.totalItemCount - 1),
            totalSales: Math.max(0, prev.totalSales - (targetRecord.customerProductPayable || 0)),
            totalShopReceivable: Math.max(0, prev.totalShopReceivable - (targetRecord.shopReceivable || 0)),
            totalNetIncome: Math.max(0, prev.totalNetIncome - (targetRecord.netIncome || 0)),
          } : null);
        }
        setRecordToDelete(null);
        await fetchAccounts();
      } else {
        alert(res.message || 'ইতিহাস মুছে ফেলতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(err.message || 'ইতিহাস মুছে ফেলতে সমস্যা হয়েছে।');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Online হিসাব (Online Financial Accounts)</h3>
              <p className="text-xs text-slate-500">
                ডেলিভারি সম্পন্ন হওয়া (Delivered) সকল অনলাইন অর্ডারের নির্ভুল আর্থিক হিসাব ও কমিশন হিসাব।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAccounts}
              disabled={loading}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              title="রিফ্রেশ করুন"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={records.length === 0 || exporting}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              PDF ডাউনলোড
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={records.length === 0 || exporting}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              CSV / Excel
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                console.log('Online accounts search input onChange fired. Value:', e.target.value);
                setSearchQuery(e.target.value);
              }}
              onFocus={e => {
                console.log('Online accounts search input onFocus fired');
              }}
              onKeyDown={e => {
                console.log('Online accounts search input onKeyDown fired. Key:', e.key);
              }}
              placeholder="ফোন নম্বর বা অর্ডার নম্বর দিয়ে খুঁজুন"
              className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={async () => {
                  setSearchQuery('');
                  setLoading(true);
                  try {
                    const res = await api.getAdminOnlineAccounts({
                      search: undefined
                    });
                    if (res.success) {
                      setSummary(res.summary);
                      setRecords(res.records || []);
                    }
                  } catch (err) {
                    console.error('Error clearing search:', err);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="অনুসন্ধান মুছুন"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            ফিল্টার
          </button>
        </form>
      </div>

      {/* Financial Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">হিসাব লোড হচ্ছে...</div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            {searchQuery ? (
              <h4 className="text-sm font-bold text-slate-700">কোনো মিল পাওয়া যায়নি</h4>
            ) : (
              <>
                <h4 className="text-sm font-bold text-slate-700">কোনো ডেলিভারি হিসাব রেকর্ড পাওয়া যায়নি</h4>
                <p className="text-xs text-slate-400">ডেলিভারি সম্পন্ন হলে স্বয়ংক্রিয়ভাবে এখানে হিসাব চলে আসবে।</p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                  <th className="py-3 px-3">অর্ডার নং</th>
                  <th className="py-3 px-3">ইউজার / গ্রাহক</th>
                  <th className="py-3 px-3">দোকান</th>
                  <th className="py-3 px-3">পণ্য</th>
                  <th className="py-3 px-3 text-center">পরিমাণ</th>
                  <th className="py-3 px-3 text-right">মূল মূল্য</th>
                  <th className="py-3 px-3 text-right">টোকেন ছাড়</th>
                  <th className="py-3 px-3 text-right">কুপন ছাড়</th>
                  <th className="py-3 px-3 text-center">দানকৃত অর্থ</th>
                  <th className="py-3 px-3 text-right">গ্রাহক প্রদান</th>
                  <th className="py-3 px-3 text-right">কমিশন (%)</th>
                  <th className="py-3 px-3 text-right">শপ পাবে</th>
                  <th className="py-3 px-3 text-right">CC নেট ইনকাম</th>
                  <th className="py-3 px-3">ডেলিভারি তারিখ</th>
                  <th className="py-3 px-3 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record, rIdx) => (
                  <tr key={`aoa-rec-${record.id || 'r'}-${rIdx}`} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-3 font-bold text-slate-900">#{record.orderNumber}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {record.customerName || record.customerPhone ? (
                        <button
                          onClick={() => setSelectedUserId(record.userId || record.customerPhone || record.customerName)}
                          className="font-bold text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-1 cursor-pointer text-left"
                          title="গ্রাহকের বিস্তারিত তথ্য দেখুন"
                        >
                          <User className="w-3 h-3 text-amber-600 flex-shrink-0" />
                          <span>{record.customerName || 'গ্রাহক'}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                      {record.customerPhone && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{record.customerPhone}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">{record.shopName}</td>
                    <td className="py-3 px-3 text-slate-700">{record.productName}</td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-800">{record.quantity}</td>
                    <td className="py-3 px-3 text-right text-slate-700">৳{record.originalPrice * record.quantity}</td>
                    <td className="py-3 px-3 text-right font-medium text-amber-700">
                      {record.tokenDiscountAmount > 0 && !record.isDonated ? (
                        <span>
                          {record.tokenType} (-৳{record.tokenDiscountAmount})
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-purple-700">
                      {record.couponDiscountAmount && record.couponDiscountAmount > 0 ? (
                        <span title={record.couponCode || 'কুপন'}>
                          {record.couponCode || 'কুপন'} (-৳{record.couponDiscountAmount})
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {record.isDonated ? (
                        <span className="font-extrabold text-rose-600 flex items-center justify-center gap-0.5 whitespace-nowrap">
                          <Heart className="w-3 h-3 fill-current text-rose-600 animate-pulse" />
                          ৳{(record.donatedAmount || 0).toLocaleString('bn-BD')}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">৳{record.customerProductPayable}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{record.commissionRate}%</td>
                    <td className="py-3 px-3 text-right font-bold text-indigo-700">৳{record.shopReceivable}</td>
                    <td className="py-3 px-3 text-right font-extrabold text-emerald-700">৳{record.netIncome}</td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {new Date(record.deliveredAt).toLocaleDateString('bn-BD')}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setRecordToDelete(record)}
                        className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="হিসাবের ইতিহাস মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-600 font-bold text-base">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                </div>
                হিসাবের ইতিহাস মোছার নিশ্চিতকরণ
              </div>
              <button
                onClick={() => setRecordToDelete(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-1">
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                আপনি কি নিশ্চিত যে এই হিসাবের তথ্য মুছে ফেলতে চান?
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-800">
                <div><strong>অর্ডার নং:</strong> #{recordToDelete.orderNumber}</div>
                <div><strong>দোকান:</strong> {recordToDelete.shopName}</div>
                <div><strong>পণ্য:</strong> {recordToDelete.productName} (x{recordToDelete.quantity})</div>
                <div><strong>নেট ইনকাম:</strong> ৳{recordToDelete.netIncome}</div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                <strong>বিঃদ্রঃ:</strong> এটি শুধুমাত্র Online হিসাব তালিকা থেকে এই আয়/আর্থিক রেকর্ডটি মুছে ফেলবে। এটি মূল কাস্টমার অর্ডার, পেমেন্ট স্টেটাস, পণ্য বা মার্চেন্ট অ্যাকাউন্টে কোনো প্রভাব ফেলবে না।
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRecordToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    মুছে ফেলা হচ্ছে...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    হ্যাঁ, মুছে ফেলুন
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User & Mosque Detail Modals */}
      <UserDetailModal
        identifier={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
      <MosqueDetailModal
        mosqueId={selectedMosqueInfo?.id}
        mosqueName={selectedMosqueInfo?.name}
        onClose={() => setSelectedMosqueInfo(null)}
      />
    </div>
  );
};
