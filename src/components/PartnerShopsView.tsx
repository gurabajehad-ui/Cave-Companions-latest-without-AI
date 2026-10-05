import React, { useState, useEffect, useMemo } from 'react';
import { Search, Store, RefreshCw, ChevronRight, Plus, Loader2, MapPin, Building2, X, Ban, CheckCircle2, Trash2, AlertTriangle, Clock, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { MerchantVerificationRecord } from '../types';
import { BANGLADESH_DISTRICTS, isLocationMatchingDistrict, isLocationMatchingUpazila } from '../data/bangladeshGeo';
import { useLanguage } from '../context/LanguageContext';

interface PartnerShopsViewProps {
  onSelectShop: (shop: MerchantVerificationRecord) => void;
  onAddShopClick: () => void;
  initialStatus?: 'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'ACTIVE' | 'SUSPENDED';
  hideStatusFilter?: boolean;
}

export function PartnerShopsView({ onSelectShop, onAddShopClick, initialStatus = 'ACTIVE', hideStatusFilter = false }: PartnerShopsViewProps) {
  const { t, language } = useLanguage();
  const [shops, setShops] = useState<MerchantVerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedUpazila, setSelectedUpazila] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'ACTIVE' | 'SUSPENDED'>(initialStatus);

  // Modals state for suspend, approve, reject and delete
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [shopToSuspend, setShopToSuspend] = useState<MerchantVerificationRecord | null>(null);
  const [targetSuspendStatus, setTargetSuspendStatus] = useState<'ACTIVE' | 'SUSPENDED'>('SUSPENDED');

  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [shopToApprove, setShopToApprove] = useState<MerchantVerificationRecord | null>(null);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [shopToReject, setShopToReject] = useState<MerchantVerificationRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [shopToDelete, setShopToDelete] = useState<MerchantVerificationRecord | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchShops();
  }, [statusFilter]);

  const fetchShops = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminMerchants(statusFilter);
      if (res.success) {
        setShops(res.verifications || []);
      } else {
        setError('Failed to load shops.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading shops.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSuspendModal = (shop: MerchantVerificationRecord, newStatus: 'ACTIVE' | 'SUSPENDED') => {
    setShopToSuspend(shop);
    setTargetSuspendStatus(newStatus);
    setSuspendModalOpen(true);
  };

  const handleConfirmSuspend = async () => {
    if (!shopToSuspend) return;
    setActionLoading(true);
    try {
      const res = await api.updateAdminShopStatus(shopToSuspend.shopId, targetSuspendStatus);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: targetSuspendStatus === 'SUSPENDED'
            ? `শপ "${shopToSuspend.shopName}" সফলভাবে স্থগিত (Suspended) করা হয়েছে।`
            : `শপ "${shopToSuspend.shopName}" সফলভাবে পুনরায় সক্রিয় (Active) করা হয়েছে।`
        });
        setSuspendModalOpen(false);
        setShopToSuspend(null);
        await fetchShops();
      } else {
        setFeedback({ type: 'error', message: res.message || 'স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।' });
      }
    } catch (err: any) {
      console.error('Update status error:', err);
      setFeedback({ type: 'error', message: err.message || 'সার্ভার সমস্যা হয়েছে।' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleOpenApproveModal = (shop: MerchantVerificationRecord) => {
    setShopToApprove(shop);
    setApproveModalOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!shopToApprove) return;
    setActionLoading(true);
    try {
      const targetId = shopToApprove.merchantId || shopToApprove.id || shopToApprove.shopId;
      const res = await api.approveMerchantVerification(targetId);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message || `শপ "${shopToApprove.shopName}" সফলভাবে অনুমোদন (Approved) করা হয়েছে।`
        });
        setApproveModalOpen(false);
        setShopToApprove(null);
        await fetchShops();
      } else {
        setFeedback({ type: 'error', message: res.message || 'অনুমোদন করতে সমস্যা হয়েছে।' });
      }
    } catch (err: any) {
      console.error('Approve shop error:', err);
      setFeedback({ type: 'error', message: err.message || 'অনুমোদনে সমস্যা হয়েছে।' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleOpenRejectModal = (shop: MerchantVerificationRecord) => {
    setShopToReject(shop);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!shopToReject) return;
    if (!rejectionReason.trim()) {
      setFeedback({ type: 'error', message: 'অনুগ্রহ করে বাতিলের কারণ উল্লেখ করুন।' });
      return;
    }
    setActionLoading(true);
    try {
      const targetId = shopToReject.merchantId || shopToReject.id || shopToReject.shopId;
      const res = await api.rejectMerchantVerification(targetId, rejectionReason.trim());
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `শপ "${shopToReject.shopName}"-এর আবেদন বাতিল করা হয়েছে।`
        });
        setRejectModalOpen(false);
        setShopToReject(null);
        await fetchShops();
      } else {
        setFeedback({ type: 'error', message: res.message || 'বাতিল করতে সমস্যা হয়েছে।' });
      }
    } catch (err: any) {
      console.error('Reject shop error:', err);
      setFeedback({ type: 'error', message: err.message || 'বাতিল করতে সমস্যা হয়েছে।' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleOpenDeleteModal = (shop: MerchantVerificationRecord) => {
    setShopToDelete(shop);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!shopToDelete) return;
    setActionLoading(true);
    try {
      const res = await api.deleteAdminShop(shopToDelete.shopId);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `শপ "${shopToDelete.shopName}" সফলভাবে ডাটাবেস থেকে মুছে ফেলা হয়েছে।`
        });
        setDeleteModalOpen(false);
        setShopToDelete(null);
        await fetchShops();
      } else {
        setFeedback({ type: 'error', message: res.message || 'শপ মুছতে সমস্যা হয়েছে।' });
      }
    } catch (err: any) {
      console.error('Delete shop error:', err);
      setFeedback({ type: 'error', message: err.message || 'সার্ভার সমস্যা হয়েছে।' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const availableUpazilas = useMemo(() => {
    if (!selectedDistrict) return [];
    const found = BANGLADESH_DISTRICTS.find(
      d => d.district.toLowerCase() === selectedDistrict.toLowerCase() || 
           d.districtBn === selectedDistrict
    );
    return found ? found.upazilas : [];
  }, [selectedDistrict]);

  const handleDistrictChange = (dist: string) => {
    setSelectedDistrict(dist);
    setSelectedUpazila('');
  };

  const filteredShops = useMemo(() => {
    let list = [...shops];

    if (search.trim()) {
      const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
      list = list.filter(shop => {
        const combined = [
          shop.shopName,
          shop.ownerName,
          shop.phone,
          shop.businessType,
          shop.district,
          shop.upazilaThana,
          shop.shopAddress,
          shop.businessDescription
        ].filter(Boolean).join(' ').toLowerCase();
        
        return terms.every(term => combined.includes(term));
      });
    }

    if (selectedDistrict) {
      list = list.filter(shop => isLocationMatchingDistrict(shop as any, selectedDistrict));
    }

    if (selectedUpazila) {
      list = list.filter(shop => isLocationMatchingUpazila(shop as any, selectedUpazila));
    }

    return list;
  }, [shops, search, selectedDistrict, selectedUpazila]);

  return (
    <div className="space-y-4">
      {/* Action & Filter Bar */}
      <div className="flex flex-col gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {!hideStatusFilter && (
              <div className="flex flex-wrap gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                {(['ALL', 'ACTIVE', 'SUSPENDED', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status, idx) => (
                  <button
                    key={`ps-status-${status}-${idx}`}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      statusFilter === status
                        ? status === 'SUSPENDED' 
                          ? 'bg-rose-600 text-white shadow-md font-black' 
                          : 'bg-amber-500 text-slate-950 shadow-md font-black'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {status === 'ALL'
                      ? 'সকল শপ'
                      : status === 'ACTIVE'
                      ? 'সক্রিয় শপ'
                      : status === 'SUSPENDED'
                      ? 'স্থগিত শপ'
                      : status === 'PENDING'
                      ? 'পেন্ডিং আবেদন'
                      : status === 'APPROVED'
                      ? 'অনুমোদিত'
                      : 'বাতিলকৃত'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {!hideStatusFilter && (
              <button
                onClick={onAddShopClick}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'bn' ? 'নতুন পার্টনার শপ যুক্ত করুন' : 'Add New Partner Shop'}</span>
              </button>
            )}
            
            <button
              onClick={fetchShops}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title={language === 'bn' ? 'রিফ্রেশ করুন' : 'Refresh List'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`p-3 rounded-xl text-xs font-bold border flex items-center justify-between ${
            feedback.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}>
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search and Location Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('shop.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl focus-within:border-amber-500 transition">
            <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">জেলা (District)</label>
              <select
                value={selectedDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer truncate"
              >
                <option value="" className="bg-slate-900 text-slate-300">সব জেলা</option>
                {BANGLADESH_DISTRICTS.slice()
                  .sort((a, b) => a.districtBn.localeCompare(b.districtBn, 'bn'))
                  .map((d, idx) => (
                    <option key={`ps-dist-${d.district}-${idx}`} value={d.district} className="bg-slate-900 text-slate-200">
                      {d.districtBn} ({d.district})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1 bg-slate-950 border rounded-xl transition ${selectedDistrict ? 'border-slate-800 focus-within:border-amber-500' : 'border-slate-800/60 opacity-60'}`}>
            <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">উপজেলা (Upazila)</label>
              <select
                value={selectedUpazila}
                onChange={(e) => setSelectedUpazila(e.target.value)}
                disabled={!selectedDistrict}
                className="w-full bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer disabled:cursor-not-allowed truncate"
              >
                <option value="" className="bg-slate-900 text-slate-300">
                  {selectedDistrict ? 'সব উপজেলা' : 'প্রথমে জেলা সিলেক্ট করুন'}
                </option>
                {availableUpazilas.map((upazila, idx) => (
                  <option key={`${upazila}-${idx}`} value={upazila} className="bg-slate-900 text-slate-200">
                    {upazila}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-400">
          <span>মোট: {shops.length} টি, ফিল্টারকৃত: <strong className="text-amber-400">{filteredShops.length}</strong> টি</span>
          {(search || selectedDistrict || selectedUpazila) && (
            <button
              onClick={() => { setSearch(''); setSelectedDistrict(''); setSelectedUpazila(''); }}
              className="text-rose-400 hover:text-rose-300 font-bold"
            >
              রিসেট ফিল্টার
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-950/30 border border-rose-900/50 rounded-2xl text-rose-400 text-sm font-bold text-center">
          {error}
        </div>
      )}

      {/* Shop List Cards */}
      <div className="space-y-3">
        {loading && shops.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/30 border border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Loading partner shops...</p>
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl p-6 text-slate-500 text-sm">
            No partner shops found matching your criteria.
          </div>
        ) : (
          filteredShops.map((shop, idx) => {
            const isSuspended = shop.shopStatus === 'SUSPENDED';
            const isPending = !isSuspended && (shop.verificationStatus === 'PENDING' || shop.shopStatus === 'PENDING');
            const isRejected = !isSuspended && shop.verificationStatus === 'REJECTED';
            const isApproved = !isSuspended && !isPending && !isRejected;

            return (
              <div
                key={`${shop.id || shop.merchantId || 'shop'}-${idx}`}
                onClick={() => {
                  onSelectShop(shop);
                }}
                className={`group bg-slate-900 border ${
                  isSuspended 
                    ? 'border-rose-900/60 hover:border-rose-500/70 bg-rose-950/10' 
                    : isPending
                    ? 'border-amber-500/40 hover:border-amber-400/80 bg-amber-950/10'
                    : isRejected
                    ? 'border-rose-900/40 hover:border-rose-700 bg-slate-900'
                    : 'border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80'
                } rounded-2xl p-4 transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between shadow-sm hover:shadow-md gap-4`}
              >
                <div className="flex items-start md:items-center gap-4 w-full">
                  <div className={`w-12 h-12 rounded-full ${
                    isSuspended 
                      ? 'bg-rose-950/40 border-rose-800 text-rose-400' 
                      : isPending
                      ? 'bg-amber-950/40 border-amber-700 text-amber-400'
                      : isRejected
                      ? 'bg-rose-950/40 border-rose-800 text-rose-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 group-hover:text-amber-400'
                  } border flex items-center justify-center shrink-0 shadow-inner transition-colors`}>
                    <Store className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="text-base font-bold text-white truncate">{shop.shopName}</h4>
                      
                      {/* Operational Status Badge */}
                      {isSuspended ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                          <Ban className="w-2.5 h-2.5" />
                          <span>স্থগিত (SUSPENDED)</span>
                        </span>
                      ) : isPending ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                          <Clock className="w-2.5 h-2.5" />
                          <span>অনুমোদনের জন্য অপেক্ষমাণ (PENDING)</span>
                        </span>
                      ) : isRejected ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                          <X className="w-2.5 h-2.5" />
                          <span>বাতিলকৃত (REJECTED)</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>সক্রিয় (ACTIVE)</span>
                        </span>
                      )}

                      {/* Total Commission Badge if available */}
                      {shop.acceptedTotalCommission !== undefined && shop.acceptedTotalCommission !== null && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold shrink-0 bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          কমিশন: {shop.acceptedTotalCommission}%
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="truncate">{shop.ownerName || 'Unknown Owner'}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-700 shrink-0" />
                      <span className="font-mono">{shop.phone || 'No phone'}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-700 shrink-0" />
                      <span className="capitalize truncate">{shop.businessType || 'General'}</span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-600" />
                        <span>{shop.district ? `${shop.upazilaThana ? shop.upazilaThana + ', ' : ''}${shop.district}` : 'No address'}</span>
                      </div>
                      {shop.acceptedGoldPlatformCommission !== undefined && (
                        <div className="text-emerald-400 font-medium">
                          CC প্ল্যাটফর্ম শেয়ার: {shop.acceptedGoldPlatformCommission}% (গোল্ড)
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
                  {isPending ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenApproveModal(shop);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/40"
                        title="শপ অনুমোদন করুন"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>অনুমোদন দিন</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenRejectModal(shop);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="আবেদন বাতিল করুন"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>বাতিল</span>
                      </button>
                    </>
                  ) : isSuspended ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSuspendModal(shop, 'ACTIVE');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      title="শপ পুনরায় সক্রিয় করুন"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>সক্রিয় করুন</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSuspendModal(shop, 'SUSPENDED');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      title="শপ সাময়িক স্থগিত করুন"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>স্থগিত করুন</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDeleteModal(shop);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="শপ স্থায়ীভাবে মুছে ফেলুন"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>মুছুন</span>
                  </button>

                  <div className="text-slate-500 group-hover:text-amber-400 transition-colors flex items-center text-xs font-medium pl-2">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================= */}
      {/* APPROVE SHOP CONFIRMATION MODAL                           */}
      {/* ========================================================= */}
      {approveModalOpen && shopToApprove && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-fadeIn flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-800/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-2 text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="font-black text-white text-lg">
              পার্টনার শপ অনুমোদন (Approve) করতে চান?
            </h3>

            <p className="text-sm text-slate-300 leading-relaxed">
              আপনি কি নিশ্চিত যে আপনি <strong>"{shopToApprove.shopName}"</strong> শপ ও মার্চেন্ট অ্যাকাউন্ট অনুমোদন করতে চান?
              <br /><br />
              <span className="text-emerald-400 text-xs block bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 text-left space-y-1">
                ✓ <strong>অনুমোদনের পর:</strong>
                <br />• শপের স্ট্যাটাস সক্রিয় (Active) হবে।
                <br />• মার্চেন্ট সিস্টেমে লগইন করতে পারবেন।
                <br />• গ্রাহকরা অ্যাপে শপটি দেখতে পারবেন এবং অফার রিডিম করতে পারবেন।
                {shopToApprove.acceptedTotalCommission !== undefined && (
                  <span className="block pt-1 font-bold text-amber-300">
                    • মোট কমিশন: {shopToApprove.acceptedTotalCommission}%
                  </span>
                )}
              </span>
            </p>

            <div className="flex flex-col gap-2 pt-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmApprove}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>হ্যাঁ, অনুমোদন করুন (Approve Shop)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setApproveModalOpen(false);
                  setShopToApprove(null);
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-all cursor-pointer"
              >
                বাতিল (Cancel)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* REJECT SHOP CONFIRMATION MODAL                            */}
      {/* ========================================================= */}
      {rejectModalOpen && shopToReject && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-fadeIn flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-left">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-2 text-rose-400">
              <AlertCircle className="w-8 h-8" />
            </div>

            <h3 className="font-black text-white text-lg text-center">
              আবেদন বাতিল (Reject) করুন
            </h3>

            <p className="text-sm text-slate-300 text-center">
              আপনি <strong>"{shopToReject.shopName}"</strong>-এর আবেদন বাতিল করতে যাচ্ছেন।
            </p>

            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold text-rose-300">
                বাতিলের কারণ (Rejection Reason) <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="বাতিলের কারণ লিখুন (যেমন: ভুল ট্রেড লাইসেন্স বা অস্পষ্ট ছবি)..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                disabled={actionLoading || !rejectionReason.trim()}
                onClick={handleConfirmReject}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    <span>বাতিল নিশ্চিত করুন (Confirm Reject)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setRejectModalOpen(false);
                  setShopToReject(null);
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-all cursor-pointer text-center"
              >
                ফিরে যান (Cancel)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUSPEND / REACTIVATE CONFIRMATION MODAL                   */}
      {/* ========================================================= */}
      {suspendModalOpen && shopToSuspend && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-fadeIn flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-center">
            <div className={`w-16 h-16 ${
              targetSuspendStatus === 'SUSPENDED' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
            } rounded-full flex items-center justify-center mx-auto mb-2`}>
              {targetSuspendStatus === 'SUSPENDED' ? (
                <AlertTriangle className="w-8 h-8" />
              ) : (
                <CheckCircle2 className="w-8 h-8" />
              )}
            </div>

            <h3 className="font-black text-white text-lg">
              {targetSuspendStatus === 'SUSPENDED' 
                ? 'পার্টনার শপ স্থগিত (Suspend) করতে চান?' 
                : 'পার্টনার শপ পুনরায় সক্রিয় (Reactivate) করতে চান?'}
            </h3>

            <p className="text-sm text-slate-300 leading-relaxed">
              {targetSuspendStatus === 'SUSPENDED' ? (
                <>
                  আপনি কি নিশ্চিত যে আপনি <strong>"{shopToSuspend.shopName}"</strong> পার্টনার শপটি স্থগিত করতে চান?
                  <br /><br />
                  <span className="text-amber-400 text-xs block bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 text-left">
                    ⚠️ <strong>স্থগিত থাকাকালীন প্রভাব:</strong>
                    <br />• মার্চেন্ট অ্যাকাউন্টে লগইন করতে পারবেন না।
                    <br />• সাধারণ গ্রাহকদের কাছে শপটি দৃশ্যমান থাকবে না।
                    <br />• কোনো ডিসকাউন্ট টোকেন রিডিম করা যাবে না।
                  </span>
                </>
              ) : (
                <>
                  আপনি কি নিশ্চিত যে আপনি <strong>"{shopToSuspend.shopName}"</strong> পার্টনার শপটি পুনরায় সক্রিয় করতে চান?
                  <br /><br />
                  <span className="text-emerald-400 text-xs block bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 text-left">
                    ✓ <strong>সক্রিয়করণের প্রভাব:</strong>
                    <br />• মার্চেন্ট যথারীতি অ্যাকাউন্টে প্রবেশ করতে পারবেন।
                    <br />• শপটি গ্রাহকদের কাছে লাইভ হবে এবং টোকেন রিডিম কার্যকর থাকবে।
                  </span>
                </>
              )}
            </p>

            <div className="flex flex-col gap-2 pt-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmSuspend}
                className={`w-full py-3 ${
                  targetSuspendStatus === 'SUSPENDED'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                } font-black rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50`}
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {targetSuspendStatus === 'SUSPENDED' ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>
                      {targetSuspendStatus === 'SUSPENDED' ? 'হ্যাঁ, স্থগিত করুন (Confirm Suspend)' : 'হ্যাঁ, সক্রিয় করুন (Confirm Reactivate)'}
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setSuspendModalOpen(false);
                  setShopToSuspend(null);
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-all cursor-pointer"
              >
                বাতিল (Cancel)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DELETE SHOP CONFIRMATION MODAL                            */}
      {/* ========================================================= */}
      {deleteModalOpen && shopToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-fadeIn flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-center">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-2 text-rose-500">
              <Trash2 className="w-8 h-8" />
            </div>

            <h3 className="font-black text-white text-lg">
              পার্টনার শপ স্থায়ীভাবে মুছে ফেলতে চান?
            </h3>

            <p className="text-sm text-slate-300 leading-relaxed">
              আপনি কি নিশ্চিত যে আপনি <strong>"{shopToDelete.shopName}"</strong> পার্টনার শপটি স্থায়ীভাবে মুছে ফেলতে চান?
              <br /><br />
              <span className="text-rose-400 text-xs block bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 text-left">
                🚨 <strong>সতর্কতা (Warning):</strong>
                <br />• এই কাজটি <strong>স্থায়ী ও অপরিবর্তনীয় (Cannot be undone)</strong>।
                <br />• শপের যাবতীয় তথ্য, মার্চেন্ট অ্যাকাউন্ট, কিউআর কোড এবং অফার সিস্টেম থেকে স্থায়ীভাবে মুছে ফেলা হবে।
              </span>
            </p>

            <div className="flex flex-col gap-2 pt-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmDelete}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-950/40 disabled:opacity-50"
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>DELETE PERMANENTLY (স্থায়ীভাবে মুছে ফেলুন)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setDeleteModalOpen(false);
                  setShopToDelete(null);
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-all cursor-pointer"
              >
                বাতিল (Cancel)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DELETE SHOP CONFIRMATION MODAL                            */}
      {/* ========================================================= */}
      {deleteModalOpen && shopToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-fadeIn flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-center">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-2 text-rose-500">
              <Trash2 className="w-8 h-8" />
            </div>

            <h3 className="font-black text-white text-lg">
              পার্টনার শপ স্থায়ীভাবে মুছে ফেলতে চান?
            </h3>

            <p className="text-sm text-slate-300 leading-relaxed">
              আপনি কি নিশ্চিত যে আপনি <strong>"{shopToDelete.shopName}"</strong> পার্টনার শপটি স্থায়ীভাবে মুছে ফেলতে চান?
              <br /><br />
              <span className="text-rose-400 text-xs block bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 text-left">
                🚨 <strong>সতর্কতা (Warning):</strong>
                <br />• এই কাজটি <strong>স্থায়ী ও অপরিবর্তনীয় (Cannot be undone)</strong>।
                <br />• শপের যাবতীয় তথ্য, মার্চেন্ট অ্যাকাউন্ট, কিউআর কোড এবং অফার সিস্টেম থেকে স্থায়ীভাবে মুছে ফেলা হবে।
              </span>
            </p>

            <div className="flex flex-col gap-2 pt-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmDelete}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-950/40 disabled:opacity-50"
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>DELETE PERMANENTLY (স্থায়ীভাবে মুছে ফেলুন)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setDeleteModalOpen(false);
                  setShopToDelete(null);
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-all cursor-pointer"
              >
                বাতিল (Cancel)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
