import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Tag,
  Store,
  Clock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  Check,
  X,
  ShieldAlert,
  Info
} from 'lucide-react';
import { api, removeStoredAdminToken } from '../services/api';
import { ProductPriceChangeRequest, ProductDeleteRequest } from '../types';

type SubTab = 'add-requests' | 'price-requests' | 'delete-requests';

interface ProductAddRequestItem {
  id: string;
  productId: string;
  shopId: string;
  shopName: string;
  merchantName: string;
  name: string;
  description: string;
  category: string;
  originalPrice: number;
  imageUrl: string;
  gallery: string[];
  isAvailable: boolean;
  status: string;
  rejectionReason?: string;
  submittedAt: string;
}

export const AdminProductApprovalView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SubTab>('add-requests');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [addRequests, setAddRequests] = useState<ProductAddRequestItem[]>([]);
  const [priceRequests, setPriceRequests] = useState<ProductPriceChangeRequest[]>([]);
  const [deleteRequests, setDeleteRequests] = useState<ProductDeleteRequest[]>([]);

  // Action / Rejection Modal State
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectItemInfo, setRejectItemInfo] = useState<{ id: string; type: SubTab; name: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Custom Overlay Toast & Confirmation states for robust iframe support
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  const askConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        onConfirm();
      }
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [addRes, priceRes, deleteRes] = await Promise.allSettled([
        api.getPendingProductAddRequests(),
        api.getPendingPriceChangeRequests(),
        api.getPendingDeleteRequests()
      ]);

      let hasError = false;
      let lastErrMsg = '';

      if (addRes.status === 'fulfilled' && addRes.value?.success) {
        setAddRequests(addRes.value.requests || []);
      } else if (addRes.status === 'rejected') {
        hasError = true;
        lastErrMsg = addRes.reason?.message || 'পণ্য যোগ রিকোয়েস্ট লোড করতে সমস্যা।';
      }

      if (priceRes.status === 'fulfilled' && priceRes.value?.success) {
        setPriceRequests(priceRes.value.requests || []);
      } else if (priceRes.status === 'rejected') {
        hasError = true;
        lastErrMsg = priceRes.reason?.message || 'মূল্য পরিবর্তন রিকোয়েস্ট লোড করতে সমস্যা।';
      }

      if (deleteRes.status === 'fulfilled' && deleteRes.value?.success) {
        setDeleteRequests(deleteRes.value.requests || []);
      } else if (deleteRes.status === 'rejected') {
        hasError = true;
        lastErrMsg = deleteRes.reason?.message || 'ডিলেট রিকোয়েস্ট লোড করতে সমস্যা।';
      }

      if (hasError && addRes.status === 'rejected' && priceRes.status === 'rejected' && deleteRes.status === 'rejected') {
        setFetchError(lastErrMsg || 'অনুরোধগুলো লোড করা সম্ভব হয়নি। এডমিন সেশন মেয়াদোত্তীর্ণ হতে পারে।');
      }
    } catch (err: any) {
      console.error('Error loading product management requests:', err);
      setFetchError(err.message || 'রিকোয়েস্টসমূহ লোড করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers for Add Requests ---
  const handleApproveAdd = (productId: string) => {
    askConfirmation(
      'পণ্য অনুমোদন নিশ্চিতকরণ',
      'আপনি কি নিশ্চিত যে এই নতুন পণ্যটি অনুমোদন করে লাইভ করতে চান?',
      async () => {
        setProcessingId(productId);
        try {
          const res = await api.approveProductAddRequest(productId);
          if (res.success) {
            showToast(res.message || 'পণ্য সফলভাবে অনুমোদিত হয়েছে!', 'success');
            loadData();
          } else {
            showToast(res.message || 'অনুমোদন করতে সমস্যা হয়েছে।', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'অনুমোদন প্রক্রিয়া করতে সমস্যা হয়েছে।', 'error');
        } finally {
          setProcessingId(null);
        }
      }
    );
  };

  // --- Handlers for Price Change Requests ---
  const handleApprovePrice = (requestId: string) => {
    askConfirmation(
      'মূল্য পরিবর্তন অনুমোদন নিশ্চিতকরণ',
      'আপনি কি নিশ্চিত যে নতুন মূল্য পরিবর্তনটি অনুমোদন করতে চান?',
      async () => {
        setProcessingId(requestId);
        try {
          const res = await api.approvePriceChangeRequest(requestId);
          if (res.success) {
            showToast(res.message || 'মূল্য পরিবর্তন সফলভাবে অনুমোদিত হয়েছে!', 'success');
            loadData();
          } else {
            showToast(res.message || 'মূল্য পরিবর্তন অনুমোদন ব্যর্থ হয়েছে।', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'মূল্য পরিবর্তন প্রক্রিয়াকরণে সমস্যা হয়েছে।', 'error');
        } finally {
          setProcessingId(null);
        }
      }
    );
  };

  // --- Handlers for Delete Requests ---
  const handleApproveDelete = (requestId: string) => {
    askConfirmation(
      'পণ্য ডিলেট অনুমোদন নিশ্চিতকরণ',
      'আপনি কি নিশ্চিত যে এই পণ্যটি ডিলেট করার অনুমোদন দিতে চান? এটি লাইভ শপ থেকে অবিলম্বে মুছে যাবে।',
      async () => {
        setProcessingId(requestId);
        try {
          const res = await api.approveDeleteRequest(requestId);
          if (res.success) {
            showToast(res.message || 'পণ্য ডিলেট রিকোয়েস্ট অনুমোদিত ও পণ্যটি মোছা হয়েছে!', 'success');
            loadData();
          } else {
            showToast(res.message || 'ডিলেট রিকোয়েস্ট অনুমোদন করতে ব্যর্থ হয়েছে।', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'ডিলেট রিকোয়েস্ট প্রক্রিয়াকরণে সমস্যা হয়েছে।', 'error');
        } finally {
          setProcessingId(null);
        }
      }
    );
  };

  const handleDeleteHistory = (id: string, type: SubTab, name: string) => {
    askConfirmation(
      'রেকর্ড মুছে ফেলা নিশ্চিতকরণ',
      `আপনি কি নিশ্চিত যে "${name}" সংক্রান্ত এই রিকোয়েস্ট রেকর্ডটি স্থায়ীভাবে মুছে ফেলতে চান?`,
      async () => {
        setProcessingId(id);
        try {
          let res;
          if (type === 'add-requests') {
            res = await api.deleteProductAddRequest(id);
          } else if (type === 'price-requests') {
            res = await api.deletePriceChangeRequestRecord(id);
          } else {
            res = await api.deleteDeleteRequestRecord(id);
          }

          if (res.success) {
            showToast(res.message || 'রিকোয়েস্ট রেকর্ড সফলভাবে মুছে ফেলা হয়েছে।', 'success');
            loadData();
          } else {
            showToast(res.message || 'রেকর্ড মুছতে সমস্যা হয়েছে।', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'রেকর্ড মুছতে ত্রুটি ঘটেছে।', 'error');
        } finally {
          setProcessingId(null);
        }
      }
    );
  };

  // --- Open Rejection Modal ---
  const openRejectModal = (id: string, type: SubTab, name: string) => {
    setRejectItemInfo({ id, type, name });
    setRejectionReason('');
    setRejectError(null);
    setRejectModalOpen(true);
  };

  // --- Submit Rejection ---
  const handleConfirmReject = async () => {
    if (!rejectItemInfo) return;
    if (!rejectionReason.trim()) {
      setRejectError('প্রত্যাখ্যান করার উপযুক্ত কারণ লিখুন।');
      return;
    }

    setProcessingId(rejectItemInfo.id);
    try {
      let res;
      if (rejectItemInfo.type === 'add-requests') {
        res = await api.rejectProductAddRequest(rejectItemInfo.id, rejectionReason.trim());
      } else if (rejectItemInfo.type === 'price-requests') {
        res = await api.rejectPriceChangeRequest(rejectItemInfo.id, rejectionReason.trim());
      } else {
        res = await api.rejectDeleteRequest(rejectItemInfo.id, rejectionReason.trim());
      }

      if (res.success) {
        showToast(res.message || 'রিকোয়েস্ট প্রত্যাখ্যান করা হয়েছে। মার্চেন্টকে নোটিফিকেশন পাঠানো হয়েছে।', 'success');
        setRejectModalOpen(false);
        loadData();
      } else {
        setRejectError(res.message || 'প্রত্যাখ্যান করতে ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setRejectError(err.message || 'অনুরোধ প্রক্রিয়াকরণে সমস্যা হয়েছে।');
    } finally {
      setProcessingId(null);
    }
  };

  // Filtering
  const filteredAdd = addRequests.filter(
    item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.merchantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPrice = priceRequests.filter(
    item =>
      (item.productName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.shopName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.merchantName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDelete = deleteRequests.filter(
    item =>
      (item.productName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.shopName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.merchantName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm mb-1">
            <ShoppingBag className="w-4 h-4" />
            <span>পণ্য ব্যবস্থাপনা ও অনুমোদন সিস্টেম</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">পণ্য রিকোয়েস্ট অনুমোদন বোর্ড</h2>
          <p className="text-xs text-slate-500 mt-1">
            মার্চেন্টদের নতুন পণ্য, মূল্য পরিবর্তন এবং পণ্য মোছার আবেদন পর্যালোচনা ও অনুমোদন করুন।
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="self-start md:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>রিফ্রেশ করুন</span>
        </button>
      </div>

      {fetchError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-rose-700 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span className="font-semibold">{fetchError}</span>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition text-xs shrink-0 cursor-pointer"
          >
            পুনরায় চেষ্টা করুন
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('add-requests')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'add-requests'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>পণ্য যোগ করার রিকোয়েস্ট</span>
            {addRequests.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'add-requests' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {addRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('price-requests')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'price-requests'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>প্রাইস পরিবর্তনের রিকোয়েস্ট</span>
            {priceRequests.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'price-requests' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                {priceRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('delete-requests')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'delete-requests'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>পণ্য ডিলেট করার রিকোয়েস্ট</span>
            {deleteRequests.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'delete-requests' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
              }`}>
                {deleteRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="পণ্য বা শপের নাম দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white text-slate-900 placeholder-slate-400 font-medium border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Main Content Areas */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">পণ্য রিকোয়েস্ট তথ্য লোড হচ্ছে...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: NEW PRODUCT ADD REQUESTS */}
          {activeTab === 'add-requests' && (
            <div>
              {filteredAdd.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">কোনো পেন্ডিং নতুন পণ্য রিকোয়েস্ট নেই</h3>
                  <p className="text-xs text-slate-500 mt-1">সব নতুন পণ্য অনুমোদন দেওয়া হয়ে গেছে।</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAdd.map((item, idx) => (
                    <div
                      key={`apa-add-${item.id || 'a'}-${idx}`}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between space-y-4"
                    >
                      <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 shrink-0 overflow-hidden relative flex items-center justify-center">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <ShoppingBag className="w-8 h-8 text-slate-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-0.5">
                            <Store className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{item.shopName}</span>
                            <span>•</span>
                            <span className="text-slate-400 font-normal">{item.merchantName}</span>
                          </div>

                          <h3 className="text-sm font-bold text-slate-900 truncate">{item.name}</h3>

                          {item.category && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded-md">
                              {item.category}
                            </span>
                          )}

                          {item.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.description}</p>
                          )}

                          <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">অনুরোধকৃত মূল্য:</span>
                              <span className="text-sm font-extrabold text-emerald-700">
                                ৳{Number(item.originalPrice).toLocaleString('bn-BD')}
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                              ⚖️ ওজন: {Number((item as any).weightKg || 1).toFixed(1)} কেজি
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(item.submittedAt).toLocaleDateString('bn-BD')}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            disabled={processingId === item.productId}
                            onClick={() => handleDeleteHistory(item.productId, 'add-requests', item.name)}
                            className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer flex items-center gap-1"
                            title="রেকর্ড ডিলেট করুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            disabled={processingId === item.productId}
                            onClick={() => openRejectModal(item.productId, 'add-requests', item.name)}
                            className="px-3 py-1.5 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition cursor-pointer flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>প্রত্যাখ্যান</span>
                          </button>

                          <button
                            disabled={processingId === item.productId}
                            onClick={() => handleApproveAdd(item.productId)}
                            className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>অনুমোদন করুন</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PRICE CHANGE REQUESTS */}
          {activeTab === 'price-requests' && (
            <div>
              {filteredPrice.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">কোনো পেন্ডিং প্রাইস পরিবর্তন রিকোয়েস্ট নেই</h3>
                  <p className="text-xs text-slate-500 mt-1">সব মূল্য পরিবর্তনের আবেদন নিস্পত্তি করা হয়েছে।</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPrice.map((item, idx) => {
                    const reqPrice = item.requestedNewPrice ?? item.requestedPrice ?? item.oldPrice;
                    const priceDiff = reqPrice - item.oldPrice;
                    const isIncrease = priceDiff > 0;
                    const pctChange = item.oldPrice > 0 ? Math.abs((priceDiff / item.oldPrice) * 100).toFixed(1) : '0';
                    const requestDate = item.submittedAt || item.createdAt || '';

                    return (
                      <div
                        key={`apa-pr-${item.id || 'p'}-${idx}`}
                        className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between space-y-4"
                      >
                        <div className="flex gap-4">
                          <div className="w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 shrink-0 overflow-hidden relative flex items-center justify-center">
                            {item.productImageUrl ? (
                              <img
                                src={item.productImageUrl}
                                alt={item.productName}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <ShoppingBag className="w-8 h-8 text-slate-400" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-0.5">
                              <Store className="w-3 h-3 text-slate-400" />
                              <span className="truncate">{item.shopName}</span>
                              <span>•</span>
                              <span className="text-slate-400 font-normal">{item.merchantName}</span>
                            </div>

                            <h3 className="text-sm font-bold text-slate-900 truncate">{item.productName}</h3>

                            <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-around text-center">
                              <div>
                                <span className="text-[10px] text-slate-500 font-bold block">বর্তমান লাইভ প্রাইস</span>
                                <span className="text-sm font-extrabold text-slate-700">
                                  ৳{Number(item.oldPrice || 0).toLocaleString('bn-BD')}
                                </span>
                              </div>

                              <ArrowRight className="w-4 h-4 text-slate-400" />

                              <div>
                                <span className="text-[10px] text-slate-500 font-bold block">আবেদনকৃত নতুন প্রাইস</span>
                                <span className="text-sm font-extrabold text-emerald-700">
                                  ৳{Number(reqPrice).toLocaleString('bn-BD')}
                                </span>
                              </div>
                            </div>

                            <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                              {isIncrease ? (
                                <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                                  <TrendingUp className="w-3 h-3" />
                                  +{pctChange}% বৃদ্ধি
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                  <TrendingDown className="w-3 h-3" />
                                  -{pctChange}% হ্রাস
                                </span>
                              )}
                              <span className="text-slate-400">| বর্তমান মূল্য লাইভে বজায় রয়েছে</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>{requestDate ? new Date(requestDate).toLocaleDateString('bn-BD') : 'তারিখ পাওয়া যায়নি'}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              disabled={processingId === item.id}
                              onClick={() => handleDeleteHistory(item.id, 'price-requests', item.productName)}
                              className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer flex items-center gap-1"
                              title="রেকর্ড ডিলেট করুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              disabled={processingId === item.id}
                              onClick={() => openRejectModal(item.id, 'price-requests', item.productName)}
                              className="px-3 py-1.5 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition cursor-pointer flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>প্রত্যাখ্যান</span>
                            </button>

                            <button
                              disabled={processingId === item.id}
                              onClick={() => handleApprovePrice(item.id)}
                              className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>অনুমোদন করুন</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRODUCT DELETE REQUESTS */}
          {activeTab === 'delete-requests' && (
            <div>
              {filteredDelete.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">কোনো পেন্ডিং ডিলেট রিকোয়েস্ট নেই</h3>
                  <p className="text-xs text-slate-500 mt-1">সব পণ্য মোছার আবেদন পর্যালোচনা সম্পন্ন করা হয়েছে।</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDelete.map((item, idx) => (
                    <div
                      key={`apa-del-${item.id || 'd'}-${idx}`}
                      className="bg-white rounded-2xl border border-rose-200 p-4 shadow-xs flex flex-col justify-between space-y-4"
                    >
                      <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-xl border border-rose-100 bg-rose-50 shrink-0 overflow-hidden relative flex items-center justify-center">
                          {item.productImageUrl ? (
                            <img
                              src={item.productImageUrl}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <ShoppingBag className="w-8 h-8 text-rose-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-0.5">
                            <Store className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{item.shopName}</span>
                            <span>•</span>
                            <span className="text-slate-400 font-normal">{item.merchantName}</span>
                          </div>

                          <h3 className="text-sm font-bold text-slate-900 truncate">{item.productName}</h3>

                          <div className="mt-1 text-xs font-bold text-slate-700">
                            বর্তমান মূল্য: ৳{Number(item.productPrice || 0).toLocaleString('bn-BD')}
                          </div>

                          {item.reason && (
                            <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                              <span className="font-bold text-slate-800">মার্চেন্টের কারণ:</span> {item.reason}
                            </div>
                          )}

                          <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-1.5 rounded flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                            <span>অনুমোদন দিলে সিস্টেম চেক করবে (অর্ডার রেফারেন্স থাকলে সফট-ডিলেট হবে)।</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{item.submittedAt || item.createdAt ? new Date(item.submittedAt || item.createdAt!).toLocaleDateString('bn-BD') : 'তারিখ পাওয়া যায়নি'}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            disabled={processingId === item.id}
                            onClick={() => handleDeleteHistory(item.id, 'delete-requests', item.productName)}
                            className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer flex items-center gap-1"
                            title="রেকর্ড ডিলেট করুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            disabled={processingId === item.id}
                            onClick={() => openRejectModal(item.id, 'delete-requests', item.productName)}
                            className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>ডিলেট বাতিল</span>
                          </button>

                          <button
                            disabled={processingId === item.id}
                            onClick={() => handleApproveDelete(item.id)}
                            className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>অনুমোদন ও ডিলেট</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Mandatory Rejection Reason Modal */}
      <AnimatePresence>
        {rejectModalOpen && rejectItemInfo && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
            onClick={e => {
              if (e.target === e.currentTarget) setRejectModalOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>রিকোয়েস্ট প্রত্যাখ্যান করুন</span>
                </div>
                <button
                  onClick={() => setRejectModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <p className="text-xs text-slate-600 mb-2">
                  <span className="font-bold text-slate-900">"{rejectItemInfo.name}"</span> এর জন্য প্রত্যাখ্যানের সুনির্দিষ্ট কারণ উল্লেখ করুন (মার্চেন্ট নোটিফিকেশনে দেখতে পাবেন):
                </p>

                <textarea
                  rows={3}
                  placeholder="যেমন: পণ্যের ছবি অস্পষ্ট, অনুপযুক্ত ক্যাটাগরি বা মূল্য অতিরিক্ত..."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                />

                {rejectError && (
                  <p className="text-xs text-rose-600 font-medium mt-1.5">{rejectError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  disabled={!!processingId}
                  onClick={handleConfirmReject}
                  className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
                >
                  <span>প্রত্যাখ্যান নিশ্চিত করুন</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Toast Banner */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Dialog Overlay */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                <span>{confirmModal.title}</span>
              </div>
              
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {confirmModal.message}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  না, বাতিল করুন
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                  }}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer"
                >
                  হ্যাঁ, নিশ্চিত করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
