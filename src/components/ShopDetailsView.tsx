import React, { useState, useEffect } from 'react';
import { Store, Percent, Save, Loader2, ChevronRight, QrCode as QrCodeIcon, Download, RefreshCw, Eye, X, Ban, CheckCircle2, Trash2, AlertTriangle, ShieldAlert, Clock, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { MerchantVerificationRecord, ShopStatus } from '../types';
import QRCode from 'qrcode';
import { CommissionChangeHistory } from './CommissionChangeHistory';

interface ShopDetailsViewProps {
  shopId: string;
  verificationRecord?: MerchantVerificationRecord;
  onBack: () => void;
  onShopDeleted?: () => void;
  onShopStatusChanged?: (newStatus: 'ACTIVE' | 'SUSPENDED') => void;
}

export function ShopDetailsView({ shopId, verificationRecord, onBack, onShopDeleted, onShopStatusChanged }: ShopDetailsViewProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<ShopStatus>(
    (verificationRecord?.shopStatus as ShopStatus) || 'ACTIVE'
  );
  
  const [offers, setOffers] = useState({
    commissionPercent: 0,
    goldDiscountPercent: 0,
    silverDiscountPercent: 0,
    bronzeDiscountPercent: 0
  });

  const [qrData, setQrData] = useState<{ exists: boolean; qrIdentifier: string } | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const [generatingQr, setGeneratingQr] = useState(false);
  const [showFullQr, setShowFullQr] = useState(false);

  // Approval, Rejection, Suspend & Delete Modals state
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, [shopId]);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([
      fetchShopStatus(),
      fetchOffers(),
      fetchQr()
    ]);
    setLoading(false);
  };

  const fetchShopStatus = async () => {
    try {
      const res = await api.getAdminShopById(shopId);
      if (res.success && res.shop) {
        if (res.shop.status) {
          setCurrentStatus(res.shop.status as ShopStatus);
        }
      }
    } catch (err) {
      // If getAdminShopById fails, fallback to verificationRecord or existing state
      console.warn('Could not fetch single shop details, using fallback:', err);
    }
  };

  const fetchOffers = async () => {
    try {
      const res = await api.getAdminShopOffers(shopId);
      if (res.success) {
        setOffers({
          commissionPercent: res.commissionPercent || 0,
          goldDiscountPercent: res.goldDiscountPercent || 0,
          silverDiscountPercent: res.silverDiscountPercent || 0,
          bronzeDiscountPercent: res.bronzeDiscountPercent || 0
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQr = async () => {
    try {
      const res = await api.getAdminShopQr(shopId);
      if (res.success && res.qr) {
        setQrData(res.qr);
        if (res.qr.qrIdentifier) {
          generateQrImage(res.qr.qrIdentifier);
        }
      }
    } catch (err) {
      console.error('Failed to fetch QR:', err);
    }
  };

  const generateQrImage = async (identifier: string) => {
    try {
      const url = await QRCode.toDataURL(identifier, {
        width: 600,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' }
      });
      setQrImageUrl(url);
    } catch (err) {
      console.error('Failed to generate QR image:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.updateAdminShopOffers(shopId, offers);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message || 'অফার ও কমিশন সেটিংস সংরক্ষিত হয়েছে।' });
      } else {
        setFeedback({ type: 'error', message: res.message || 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে।' });
      }
    } catch (err: any) {
      console.error('Save settings error:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleGenerateQr = async () => {
    setGeneratingQr(true);
    try {
      const res = await api.generateAdminShopQr(shopId);
      if (res.success && res.shop && res.shop.qrIdentifier) {
        setQrData({ exists: true, qrIdentifier: res.shop.qrIdentifier });
        generateQrImage(res.shop.qrIdentifier);
        setFeedback({ type: 'success', message: 'নতুন কিউআর কোড সফলভাবে তৈরি হয়েছে।' });
      }
    } catch (err) {
      console.error('Failed to generate QR:', err);
      setFeedback({ type: 'error', message: 'কিউআর কোড তৈরিতে সমস্যা হয়েছে।' });
    } finally {
      setGeneratingQr(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleRegenerateQr = async () => {
    if (!window.confirm('বর্তমান QR Code বাতিল করে নতুন QR Code তৈরি করতে চান?')) return;
    setGeneratingQr(true);
    try {
      const res = await api.regenerateAdminShopQr(shopId);
      if (res.success && res.shop && res.shop.qrIdentifier) {
        setQrData({ exists: true, qrIdentifier: res.shop.qrIdentifier });
        generateQrImage(res.shop.qrIdentifier);
        setFeedback({ type: 'success', message: 'কিউআর কোড সফলভাবে পুনর্গঠন করা হয়েছে।' });
      }
    } catch (err) {
      console.error('Failed to regenerate QR:', err);
      setFeedback({ type: 'error', message: 'কিউআর কোড পুনর্গঠনে সমস্যা হয়েছে।' });
    } finally {
      setGeneratingQr(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleDownloadQr = () => {
    if (!qrImageUrl) return;
    const a = document.createElement('a');
    a.href = qrImageUrl;
    a.download = `shop-${(verificationRecord?.shopName || 'qr').replace(/[^a-z0-9]/gi, '_').toLowerCase()}-qr-code.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Confirm Approval
  const handleConfirmApprove = async () => {
    setActionLoading(true);
    try {
      const targetId = verificationRecord?.merchantId || verificationRecord?.id || shopId;
      const res = await api.approveMerchantVerification(targetId);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message || 'শপ ও মার্চেন্ট অ্যাকাউন্ট সফলভাবে অনুমোদন করা হয়েছে।'
        });
        setApproveModalOpen(false);
        setCurrentStatus('ACTIVE');
        onShopStatusChanged?.('ACTIVE');
        await fetchInitialData();
      } else {
        setFeedback({ type: 'error', message: res.message || 'অনুমোদন করতে ব্যর্থ হয়েছে।' });
      }
    } catch (err: any) {
      console.error('Approve shop error:', err);
      setFeedback({ type: 'error', message: err.message || 'সার্ভার সমস্যা হয়েছে।' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Confirm Rejection
  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      setFeedback({ type: 'error', message: 'অনুগ্রহ করে বাতিলের কারণ উল্লেখ করুন।' });
      return;
    }
    setActionLoading(true);
    try {
      const targetId = verificationRecord?.merchantId || verificationRecord?.id || shopId;
      const res = await api.rejectMerchantVerification(targetId, rejectionReason.trim());
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'আবেদন সফলভাবে বাতিল করা হয়েছে।'
        });
        setRejectModalOpen(false);
        await fetchInitialData();
      } else {
        setFeedback({ type: 'error', message: res.message || 'বাতিল করতে ব্যর্থ হয়েছে।' });
      }
    } catch (err: any) {
      console.error('Reject shop error:', err);
      setFeedback({ type: 'error', message: err.message || 'সার্ভার সমস্যা হয়েছে।' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Toggle Suspend Status
  const handleConfirmToggleSuspend = async () => {
    const nextStatus: 'ACTIVE' | 'SUSPENDED' = currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    setActionLoading(true);
    try {
      const res = await api.updateAdminShopStatus(shopId, nextStatus);
      if (res.success) {
        setCurrentStatus(nextStatus);
        setFeedback({
          type: 'success',
          message: nextStatus === 'SUSPENDED' 
            ? 'শপটি সফলভাবে সাময়িকভাবে স্থগিত (Suspended) করা হয়েছে।'
            : 'শপটি সফলভাবে পুনরায় সক্রিয় (Active) করা হয়েছে।'
        });
        setSuspendModalOpen(false);
        onShopStatusChanged?.(nextStatus);
      } else {
        setFeedback({ type: 'error', message: res.message || 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে।' });
      }
    } catch (err: any) {
      console.error('Error toggling shop status:', err);
      setFeedback({ type: 'error', message: err.message || 'সার্ভার সমস্যা হয়েছে।' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Permanent Delete
  const handleConfirmDelete = async () => {
    setActionLoading(true);
    try {
      const res = await api.deleteAdminShop(shopId);
      if (res.success) {
        setDeleteModalOpen(false);
        alert(`শপ "${verificationRecord?.shopName || ''}" সফলভাবে ডাটাবেস থেকে মুছে ফেলা হয়েছে।`);
        onShopDeleted?.();
        onBack();
      } else {
        setFeedback({ type: 'error', message: res.message || 'শপ মুছতে ব্যর্থ হয়েছে।' });
        setActionLoading(false);
      }
    } catch (err: any) {
      console.error('Error deleting shop:', err);
      setFeedback({ type: 'error', message: err.message || 'সার্ভার সমস্যা হয়েছে।' });
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-white flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-slate-400 text-sm">শপের তথ্য লোড হচ্ছে...</p>
      </div>
    );
  }

  const isSuspended = currentStatus === 'SUSPENDED';
  const isPending = !isSuspended && (currentStatus === 'PENDING' || verificationRecord?.verificationStatus === 'PENDING' || verificationRecord?.shopStatus === 'PENDING');
  const isRejected = !isSuspended && verificationRecord?.verificationStatus === 'REJECTED';
  const shopName = verificationRecord?.shopName || 'পার্টনার শপ';

  const totalComm = verificationRecord?.acceptedTotalCommission ?? offers.commissionPercent;
  const goldUser = verificationRecord?.acceptedGoldUserBenefit ?? offers.goldDiscountPercent;
  const silverUser = verificationRecord?.acceptedSilverUserBenefit ?? offers.silverDiscountPercent;
  const bronzeUser = verificationRecord?.acceptedBronzeUserBenefit ?? offers.bronzeDiscountPercent;
  const goldCC = verificationRecord?.acceptedGoldPlatformCommission ?? Math.max(0, Number((totalComm - goldUser).toFixed(2)));
  const silverCC = verificationRecord?.acceptedSilverPlatformCommission ?? Math.max(0, Number((totalComm - silverUser).toFixed(2)));
  const bronzeCC = verificationRecord?.acceptedBronzePlatformCommission ?? Math.max(0, Number((totalComm - bronzeUser).toFixed(2)));

  return (
    <div className="space-y-6">
      {/* Back and Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-amber-400 hover:text-amber-300 flex items-center gap-1.5 text-sm font-bold transition cursor-pointer"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          <span>তালিকায় ফিরে যান (Back to Shop List)</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className={`p-4 rounded-2xl text-sm font-bold border flex items-center justify-between shadow-lg ${
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

      {/* ========================================================= */}
      {/* TOP SHOP STATUS & PRIMARY ACTIONS BANNER                  */}
      {/* ========================================================= */}
      <div className={`p-5 rounded-2xl border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isSuspended
          ? 'bg-gradient-to-r from-rose-950/50 via-slate-900 to-slate-900 border-rose-800/80 text-rose-300'
          : isPending
          ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/60 text-amber-300'
          : isRejected
          ? 'bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border-rose-800/60 text-rose-300'
          : 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-800/60 text-emerald-300'
      }`}>
        <div className="flex items-start md:items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
            isSuspended 
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
              : isPending
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              : isRejected
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}>
            {isSuspended ? <Ban className="w-7 h-7" /> : isPending ? <Clock className="w-7 h-7" /> : isRejected ? <X className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7" />}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                isSuspended
                  ? 'bg-rose-600 text-white'
                  : isPending
                  ? 'bg-amber-500 text-slate-950 animate-pulse'
                  : isRejected
                  ? 'bg-rose-600 text-white'
                  : 'bg-emerald-500 text-slate-950'
              }`}>
                {isSuspended ? 'স্থগিত (SUSPENDED)' : isPending ? 'অনুমোদনের জন্য অপেক্ষমাণ (PENDING)' : isRejected ? 'বাতিলকৃত (REJECTED)' : 'সক্রিয় (ACTIVE)'}
              </span>
              <h1 className="text-xl font-black text-white">{shopName}</h1>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              {isSuspended
                ? '⚠️ এই পার্টনার শপটি বর্তমানে স্থগিত (Suspended) রয়েছে। মার্চেন্ট লগইন ব্লক করা এবং গ্রাহকদের অ্যাপে শপটি প্রদর্শিত হচ্ছে না।'
                : isPending
                ? '⏳ এই পার্টনার শপটি এখনো অনুমোদিত হয়নি (Pending Approval)। অ্যাডমিন অনুমোদন দিলে শপটি সক্রিয় হবে এবং গ্রাহকদের কাছে দৃশ্যমান হবে।'
                : isRejected
                ? '❌ এই পার্টনার শপের আবেদন বাতিল করা হয়েছে।'
                : '✓ শপটি সক্রিয় (Active) অবস্থায় রয়েছে। মার্চেন্ট সিস্টেমে যুক্ত আছেন এবং গ্রাহকরা অফার গ্রহণ করতে পারছেন।'}
            </p>
          </div>
        </div>

        {/* Quick Admin Actions */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
          {isPending ? (
            <>
              <button
                type="button"
                onClick={() => setApproveModalOpen(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl flex items-center gap-2 transition shadow-lg shadow-emerald-950/50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>অনুমোদন দিন (Approve)</span>
              </button>

              <button
                type="button"
                onClick={() => setRejectModalOpen(true)}
                className="px-4 py-2.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800 text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer"
              >
                <Ban className="w-4 h-4" />
                <span>বাতিল করুন (Reject)</span>
              </button>
            </>
          ) : isSuspended ? (
            <button
              type="button"
              onClick={() => setSuspendModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>শপ পুনরায় সক্রিয় করুন</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSuspendModalOpen(true)}
              className="px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer"
            >
              <Ban className="w-4 h-4" />
              <span>শপ সাময়িক স্থগিত করুন</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="px-4 py-2.5 bg-rose-600/15 hover:bg-rose-600/25 text-rose-400 border border-rose-500/40 text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>শপ মুছে ফেলুন</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION: COMMISSION & CAVE COMPANIONS PLATFORM RATE       */}
      {/* ========================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-white">
        <div className="flex items-center justify-between border-b border-slate-700 pb-2">
          <h2 className="text-lg font-bold flex items-center gap-2 text-amber-400">
            <Percent className="w-5 h-5 text-amber-400" /> কমিশন ও কেভ কম্প্যানিয়ন প্ল্যাটফর্ম শেয়ার (Commission Details)
          </h2>
          <span className="text-xs text-slate-400">মার্চেন্ট নিবন্ধন চুক্তির তথ্য</span>
        </div>
        
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div>
              <span className="text-xs text-slate-400 block">মার্চেন্ট কর্তৃক প্রস্তাবিত মোট কমিশন:</span>
              <span className="text-xl font-black text-amber-300">
                {totalComm}%
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">কমিশন বণ্টন নীতি:</span>
              <span className="text-xs text-emerald-400 font-mono font-bold">CC Commission = Total ({totalComm}%) - User Benefit</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl space-y-2">
              <span className="font-bold text-amber-400 block text-xs">🥇 গোল্ড টোকেন (Gold Token)</span>
              <div className="flex justify-between text-slate-300">
                <span>ইউজার ডিসকাউন্ট:</span>
                <span className="font-bold text-amber-300">{goldUser}%</span>
              </div>
              <div className="flex justify-between text-slate-300 border-t border-amber-500/20 pt-1">
                <span>কেভ কম্প্যানিয়ন কমিশন:</span>
                <span className="font-bold text-emerald-400 text-sm">{goldCC}%</span>
              </div>
            </div>

            <div className="bg-slate-400/10 border border-slate-400/20 p-3.5 rounded-xl space-y-2">
              <span className="font-bold text-slate-300 block text-xs">🥈 সিলভার টোকেন (Silver Token)</span>
              <div className="flex justify-between text-slate-300">
                <span>ইউজার ডিসকাউন্ট:</span>
                <span className="font-bold text-slate-200">{silverUser}%</span>
              </div>
              <div className="flex justify-between text-slate-300 border-t border-slate-400/20 pt-1">
                <span>কেভ কম্প্যানিয়ন কমিশন:</span>
                <span className="font-bold text-emerald-400 text-sm">{silverCC}%</span>
              </div>
            </div>

            <div className="bg-amber-700/10 border border-amber-700/20 p-3.5 rounded-xl space-y-2">
              <span className="font-bold text-amber-600 block text-xs">🥉 ব্রোঞ্জ টোকেন (Bronze Token)</span>
              <div className="flex justify-between text-slate-300">
                <span>ইউজার ডিসকাউন্ট:</span>
                <span className="font-bold text-amber-500">{bronzeUser}%</span>
              </div>
              <div className="flex justify-between text-slate-300 border-t border-amber-700/20 pt-1">
                <span>কেভ কম্প্যানিয়ন কমিশন:</span>
                <span className="font-bold text-emerald-400 text-sm">{bronzeCC}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verification & Owner Information */}
      {verificationRecord && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-8 text-white">
          <div>
            <h2 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2">SHOP INFORMATION</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <p><strong>Shop Name:</strong> {verificationRecord.shopName || 'Not provided'}</p>
              <p><strong>Shop Phone:</strong> {verificationRecord.shopPhone || 'Not provided'}</p>
              <p><strong>Business Type:</strong> {verificationRecord.businessType || 'Not provided'}</p>
              <p><strong>Shop Address:</strong> {verificationRecord.shopAddress || 'Not provided'}</p>
              <p><strong>District:</strong> {verificationRecord.district || 'Not provided'}</p>
              <p><strong>Upazila/Thana:</strong> {verificationRecord.upazilaThana || 'Not provided'}</p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2">OWNER INFORMATION</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <p><strong>Owner Name:</strong> {verificationRecord.ownerName || 'Not provided'}</p>
              <p><strong>Owner Phone:</strong> {verificationRecord.phone || 'Not provided'}</p>
              <p><strong>Owner Email:</strong> {verificationRecord.email || 'Not provided'}</p>
              <p><strong>NID Number:</strong> {verificationRecord.nidNumber || 'Not provided'}</p>
              <p><strong>Trade License Number:</strong> {verificationRecord.tradeLicenseNumber || 'Not provided'}</p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2">REGISTRATION DOCUMENTS</h2>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Shop Photo', url: verificationRecord.shopPhotoUrl },
                { label: 'NID Front', url: verificationRecord.nidFrontUrl },
                { label: 'NID Back', url: verificationRecord.nidBackUrl },
                { label: 'Owner Selfie (Merchant Photo)', url: verificationRecord.ownerSelfieUrl },
                { label: 'Trade License', url: verificationRecord.tradeLicenseUrl },
              ].map((doc, i) => (
                <div key={`shop-doc-${doc.label}-${i}`} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                  <span className="font-medium mb-2 sm:mb-0">{doc.label}</span>
                  {doc.url ? (
                    <div className="flex gap-3">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="bg-slate-700 hover:bg-slate-600 px-4 py-1.5 rounded-md text-amber-400 transition-colors">View</a>
                      <button onClick={() => api.downloadAdminDocument(doc.url!, doc.url!.split('/').pop() || 'document')} className="bg-amber-500/10 hover:bg-amber-500/20 px-4 py-1.5 rounded-md text-amber-400 border border-amber-500/30 transition-colors">Download</button>
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">Not Provided</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {verificationRecord.commissionChangeRequests && verificationRecord.commissionChangeRequests.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2">COMMISSION CHANGE REQUEST HISTORY</h2>
              <div className="space-y-3">
                {verificationRecord.commissionChangeRequests.map((req, idx) => (
                  <div key={`sdv-req-${req.id || 'req'}-${idx}`} className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400">অনুরোধকৃত কমিশন: {req.requestedCommissionPercent}%</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        req.status === 'rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {req.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-300">বর্তমান কমিশন ছিল: {req.currentCommissionPercent}%</p>
                    {req.reason && <p className="text-slate-400 italic">কারণ: {req.reason}</p>}
                    <p className="text-slate-500 text-[11px]">তারিখ: {new Date(req.createdAt).toLocaleString('bn-BD')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SHOP QR CODE Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-2">
          <QrCodeIcon className="text-amber-400" /> SHOP QR CODE
        </h2>
        
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-48 h-48 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center p-2 shrink-0 relative overflow-hidden">
            {generatingQr ? (
              <div className="flex flex-col items-center text-amber-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="text-xs font-mono">GENERATING...</span>
              </div>
            ) : qrImageUrl ? (
              <img src={qrImageUrl} alt="Shop QR Code" className="w-full h-full rounded-xl object-contain bg-white" />
            ) : (
              <div className="text-center text-slate-500">
                <QrCodeIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <span className="text-xs">No QR Code</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <p className="text-sm text-slate-300">
                Status: {qrData?.exists ? (
                  <span className="text-emerald-400 font-bold">Active</span>
                ) : (
                  <span className="text-slate-500 font-bold">Not Generated</span>
                )}
              </p>
              {qrData?.exists && qrData.qrIdentifier && (
                <p className="text-xs font-mono text-slate-500 mt-1">
                  ID: {qrData.qrIdentifier}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {qrData?.exists ? (
                <>
                  <button onClick={() => setShowFullQr(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-colors border border-slate-700 cursor-pointer">
                    <Eye className="w-4 h-4" /> View Full QR Code
                  </button>
                  <button onClick={handleDownloadQr} className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-sm font-bold transition-colors border border-amber-500/30 cursor-pointer">
                    <Download className="w-4 h-4" /> Download QR Code
                  </button>
                  <button onClick={handleRegenerateQr} disabled={generatingQr} className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-sm font-bold transition-colors border border-rose-500/30 cursor-pointer">
                    <RefreshCw className={`w-4 h-4 ${generatingQr ? 'animate-spin' : ''}`} /> Regenerate QR Code
                  </button>
                </>
              ) : (
                <button onClick={handleGenerateQr} disabled={generatingQr} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl text-sm font-bold transition-colors cursor-pointer">
                  {generatingQr ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCodeIcon className="w-4 h-4" />} Generate QR Code
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Commission & Token Offers */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Store className="text-amber-400" /> Commission & Token Offers
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-slate-400 text-sm">Cave Companions Commission (%)</label>
            <input type="number" value={offers.commissionPercent} onChange={e => setOffers({...offers, commissionPercent: Number(e.target.value)})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" />
          </div>
          <div>
            <label className="text-slate-400 text-sm">Gold Token Discount (%)</label>
            <input type="number" value={offers.goldDiscountPercent} onChange={e => setOffers({...offers, goldDiscountPercent: Number(e.target.value)})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" />
          </div>
          <div>
            <label className="text-slate-400 text-sm">Silver Token Discount (%)</label>
            <input type="number" value={offers.silverDiscountPercent} onChange={e => setOffers({...offers, silverDiscountPercent: Number(e.target.value)})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" />
          </div>
          <div>
            <label className="text-slate-400 text-sm">Bronze Token Discount (%)</label>
            <input type="number" value={offers.bronzeDiscountPercent} onChange={e => setOffers({...offers, bronzeDiscountPercent: Number(e.target.value)})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" />
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-400 text-slate-900 p-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition">
          {saving ? <Loader2 className="animate-spin" /> : <Save />} Save Settings
        </button>
      </div>

      {/* Commission Change History */}
      <CommissionChangeHistory shopId={shopId} />

      {/* ========================================================= */}
      {/* SECTION: DANGER ZONE (ঝুঁকিপূর্ণ কার্যক্রম)               */}
      {/* ========================================================= */}
      <div className="bg-slate-900 border border-rose-900/60 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex items-center gap-2 border-b border-rose-950 pb-3">
          <ShieldAlert className="w-5 h-5 text-rose-500" />
          <h3 className="text-lg font-black text-rose-400 tracking-wide">ঝুঁকিপূর্ণ কার্যক্রম (Danger Zone)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Shop Suspension */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                {isSuspended ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Ban className="w-4 h-4 text-amber-400" />}
                <span>{isSuspended ? 'শপ পুনরায় সক্রিয়করণ' : 'শপ সাময়িক স্থগিতকরণ'}</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isSuspended
                  ? 'শপটি পুনরায় চালু করলে মার্চেন্ট আবার অ্যাকাউন্টে লগইন করতে পারবেন এবং গ্রাহকরা ডিসকাউন্ট টোকেন ব্যবহার করতে পারবেন।'
                  : 'শপটি সাময়িকভাবে বন্ধ রাখুন। মার্চেন্ট লগইন ব্লক করা থাকবে এবং কোনো টোকেন রিডিম গ্রহণ করা যাবে না।'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSuspendModalOpen(true)}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                isSuspended
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {isSuspended ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
              <span>{isSuspended ? 'শপ পুনরায় সক্রিয় করুন' : 'শপ স্থগিত করুন (Suspend)'}</span>
            </button>
          </div>

          {/* Card 2: Permanent Deletion */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-rose-300 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>স্থায়ীভাবে মুছে ফেলা (Permanent Delete)</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                শপের প্রোফাইল, মার্চেন্ট অ্যাকাউন্ট, কিউআর কোড এবং অফার স্থায়ীভাবে ডাটাবেস থেকে মুছে যাবে। এই কাজটি আর ফিরিয়ে আনা সম্ভব নয়।
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>শপ স্থায়ীভাবে মুছে ফেলুন (Delete)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Full QR Modal */}
      {showFullQr && qrImageUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full relative shadow-2xl">
            <button 
              onClick={() => setShowFullQr(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-6 text-center">Shop QR Code</h3>
            <div className="bg-white p-4 rounded-2xl w-full aspect-square max-w-sm mx-auto mb-6 flex items-center justify-center">
              <img src={qrImageUrl} alt="Full Shop QR Code" className="w-full h-full object-contain" />
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-xs mb-4">
                ID: {qrData?.qrIdentifier}
              </p>
              <button onClick={handleDownloadQr} className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 mx-auto cursor-pointer">
                <Download className="w-4 h-4" /> Download QR Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* APPROVE CONFIRMATION MODAL                                */}
      {/* ========================================================= */}
      {approveModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-fadeIn flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="font-black text-white text-lg">
              পার্টনার শপ অনুমোদন করতে চান?
            </h3>

            <p className="text-sm text-slate-300 leading-relaxed">
              আপনি কি নিশ্চিত যে আপনি <strong>"{shopName}"</strong> শপ ও মার্চেন্ট অ্যাকাউন্ট অনুমোদন করতে চান?
              <br /><br />
              <span className="text-emerald-400 text-xs block bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 text-left space-y-1">
                ✓ <strong>অনুমোদনের প্রভাব:</strong>
                <br />• মার্চেন্ট অ্যাকাউন্টে স্বাভাবিকভাবে প্রবেশ করতে পারবেন।
                <br />• শপটি সক্রিয় (ACTIVE) হয়ে যাবে এবং সাধারণ ব্যবহারকারীদের নিকট প্রদর্শিত হবে।
                <br />• গ্রাহকরা ডিসকাউন্ট টোকেন রিডিম করতে পারবেন।
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
                    <span>হ্যাঁ, অনুমোদন করুন (Confirm Approve)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setApproveModalOpen(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-all cursor-pointer"
              >
                বাতিল (Cancel)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* REJECT CONFIRMATION MODAL                                 */}
      {/* ========================================================= */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-fadeIn flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-left">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="w-8 h-8" />
            </div>

            <h3 className="font-black text-white text-lg text-center">
              আবেদন বাতিল (Reject) করুন
            </h3>

            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold text-rose-300">
                বাতিলের কারণ (Rejection Reason) <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="বাতিলের কারণ লিখুন..."
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
                onClick={() => setRejectModalOpen(false)}
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
      {suspendModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-fadeIn flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-center">
            <div className={`w-16 h-16 ${
              !isSuspended ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
            } rounded-full flex items-center justify-center mx-auto mb-2`}>
              {!isSuspended ? (
                <AlertTriangle className="w-8 h-8" />
              ) : (
                <CheckCircle2 className="w-8 h-8" />
              )}
            </div>

            <h3 className="font-black text-white text-lg">
              {!isSuspended
                ? 'পার্টনার শপ স্থগিত (Suspend) করতে চান?'
                : 'পার্টনার শপ পুনরায় সক্রিয় (Reactivate) করতে চান?'}
            </h3>

            <p className="text-sm text-slate-300 leading-relaxed">
              {!isSuspended ? (
                <>
                  আপনি কি নিশ্চিত যে আপনি <strong>"{shopName}"</strong> পার্টনার শপটি সাময়িকভাবে স্থগিত করতে চান?
                  <br /><br />
                  <span className="text-amber-400 text-xs block bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 text-left">
                    ⚠️ <strong>স্থগিত থাকাকালীন ফলাফল:</strong>
                    <br />• মার্চেন্ট অ্যাকাউন্টে লগইন করতে পারবেন না।
                    <br />• সাধারণ গ্রাহকদের কাছে শপটি দৃশ্যমান থাকবে না।
                    <br />• কোনো ডিসকাউন্ট টোকেন রিডিম করা যাবে না।
                  </span>
                </>
              ) : (
                <>
                  আপনি কি নিশ্চিত যে আপনি <strong>"{shopName}"</strong> পার্টনার শপটি পুনরায় সক্রিয় করতে চান?
                  <br /><br />
                  <span className="text-emerald-400 text-xs block bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 text-left">
                    ✓ <strong>সক্রিয়করণের ফলাফল:</strong>
                    <br />• মার্চেন্ট যথারীতি অ্যাকাউন্টে প্রবেশ করতে পারবেন।
                    <br />• শপটি গ্রাহকদের কাছে লাইভ হবে এবং টোকেন রিডিম সুবিধা কার্যকর হবে।
                  </span>
                </>
              )}
            </p>

            <div className="flex flex-col gap-2 pt-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmToggleSuspend}
                className={`w-full py-3 ${
                  !isSuspended
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                } font-black rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50`}
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {!isSuspended ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>
                      {!isSuspended ? 'হ্যাঁ, স্থগিত করুন (Confirm Suspend)' : 'হ্যাঁ, সক্রিয় করুন (Confirm Reactivate)'}
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setSuspendModalOpen(false)}
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
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-fadeIn flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-center">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-2 text-rose-500">
              <Trash2 className="w-8 h-8" />
            </div>

            <h3 className="font-black text-white text-lg">
              পার্টনার শপ স্থায়ীভাবে মুছে ফেলতে চান?
            </h3>

            <p className="text-sm text-slate-300 leading-relaxed">
              আপনি কি নিশ্চিত যে আপনি <strong>"{shopName}"</strong> পার্টনার শপটি স্থায়ীভাবে মুছে ফেলতে চান?
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
                onClick={() => setDeleteModalOpen(false)}
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
