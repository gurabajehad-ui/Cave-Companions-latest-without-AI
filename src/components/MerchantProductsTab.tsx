import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  Search, 
  ToggleLeft, 
  ToggleRight, 
  Camera, 
  UploadCloud, 
  RefreshCw, 
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { Product } from '../types';
import { api } from '../services/api';
import { optimizeImageForUpload } from '../utils/imageOptimizer';
import { calculateProductRelevance } from '../utils/marketSearch';

export const MerchantProductsTab: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Custom Iframe-Safe Notification Overlay states
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

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [weightKg, setWeightKg] = useState('1.0');
  const [isAvailable, setIsAvailable] = useState(true);

  // Gallery State
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMerchantProducts();
      if (res.success) {
        setProducts(res.products || []);
      }
    } catch (err: any) {
      console.error('Error fetching merchant products:', err);
      setError(err.message || 'পণ্য তালিকা লোড করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setDescription('');
    setOriginalPrice('');
    setWeightKg('');
    setIsAvailable(true);
    setImageUrls([]);
    setIsUploadingImage(false);
    setImageUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description || '');
    setOriginalPrice(String(product.originalPrice));
    setWeightKg(String(product.weightKg || 1.0));
    setIsAvailable(product.isAvailable);
    setImageUrls(product.gallery && product.gallery.length > 0 ? product.gallery : (product.imageUrl ? [product.imageUrl] : []));
    setIsUploadingImage(false);
    setImageUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setModalOpen(true);
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImageUploadError(null);
    setIsUploadingImage(true);

    try {
      const uploadPromises = Array.from(files).map(async (file: File) => {
        if (!file.type.startsWith('image/')) throw new Error(`${file.name} ছবি নয়।`);
        
        const optimized = await optimizeImageForUpload(file, 1600, 0.85);

        const uploadRes = await api.uploadProductImage(optimized.base64, optimized.fileName);
        if (!uploadRes.success || !uploadRes.imageUrl) throw new Error('আপলোড ব্যর্থ।');
        return uploadRes.imageUrl;
      });

      const urls = await Promise.all(uploadPromises);
      setImageUrls(prev => [...prev, ...urls]);
      e.target.value = '';
    } catch (err: any) {
      setImageUploadError(err.message || 'ছবি আপলোড করতে সমস্যা হয়েছে।');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const imagePreview = imageUrls.length > 0 ? imageUrls[0] : null;

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setImageUrls([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasValidImage = imageUrls.length > 0;
  const hasValidName = name.trim().length > 0;
  const hasValidDescription = true; // Description is optional
  const hasValidPrice = originalPrice.trim().length > 0 && !isNaN(Number(originalPrice)) && Number(originalPrice) > 0;
  const hasValidWeight = weightKg.trim().length > 0 && !isNaN(Number(weightKg)) && Number(weightKg) > 0;
  const isFormValid = hasValidImage && hasValidName && hasValidDescription && hasValidPrice && hasValidWeight;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploadingImage) {
      showToast('ছবি আপলোড হচ্ছে, দয়া করে অপেক্ষা করুন।', 'error');
      return;
    }
    if (submitting) return;

    if (!isFormValid) {
      if (!hasValidImage) showToast('কমপক্ষে একটি ছবি আপলোড করুন।', 'error');
      else if (!hasValidName) showToast('পণ্যের নাম লিখুন।', 'error');
      else if (!hasValidPrice) showToast('সঠিক মূল্য প্রদান করুন।', 'error');
      else if (!hasValidWeight) showToast('পণ্যের সঠিক ওজন (kg) লিখুন (০-এর বেশি)।', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        originalPrice: Number(originalPrice),
        weightKg: Number(weightKg),
        imageUrl: imageUrls[0] || '',
        gallery: imageUrls,
        isAvailable
      };

      if (editingProduct) {
        const res = await api.updateMerchantProduct(editingProduct.id, payload);
        if (res.success) {
          showToast(res.message || 'পণ্যের তথ্য সফলভাবে আপডেট হয়েছে।', 'success');
          setModalOpen(false);
          fetchProducts();
        }
      } else {
        const res = await api.addMerchantProduct(payload);
        if (res.success) {
          showToast(res.message || 'নতুন পণ্য যোগ করার রিকোয়েস্ট জমা দেওয়া হয়েছে।', 'success');
          setModalOpen(false);
          fetchProducts();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'পণ্য সংরক্ষণ করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailability = async (product: Product) => {
    setTogglingId(product.id);
    try {
      const res = await api.toggleMerchantProductAvailability(product.id);
      if (res.success) {
        setProducts(prev =>
          prev.map((p, idx) => (p.id === product.id ? { ...p, isAvailable: res.product.isAvailable } : p))
        );
        showToast('পণ্যের স্টক স্ট্যাটাস সফলভাবে আপডেট করা হয়েছে।', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'স্ট্যাটাস পরিবর্তন করা যায়নি।', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = (productId: string, status?: string) => {
    const isDirectDelete = status === 'PENDING' || status === 'REJECTED';
    const confirmTitle = isDirectDelete ? 'পণ্য মুছে ফেলা নিশ্চিতকরণ' : 'পণ্য ডিলেট রিকোয়েস্ট নিশ্চিতকরণ';
    const confirmMessage = isDirectDelete
      ? 'এই পণ্যটি লাইভ শপে নেই (পেন্ডিং বা রিজেক্টেড)। আপনি কি নিশ্চিত যে এটি আপনার তালিকা থেকে স্থায়ীভাবে মুছে ফেলতে চান?'
      : 'আপনি কি নিশ্চিত যে এই পণ্যটি মুছে ফেলার রিকোয়েস্ট পাঠাতে চান? এডমিন এটি অনুমোদন করলে পণ্যটি লাইভ শপ থেকে অবিলম্বে মুছে যাবে।';

    askConfirmation(
      confirmTitle,
      confirmMessage,
      async () => {
        setDeletingId(productId);
        try {
          const res = await api.deleteMerchantProduct(productId);
          if (res.success) {
            const successMsg = isDirectDelete
              ? (res.message || 'পণ্যটি সফলভাবে মুছে ফেলা হয়েছে।')
              : (res.message || 'পণ্য ডিলেট করার রিকোয়েস্ট এডমিন অনুমোদনের জন্য জমা দেওয়া হয়েছে।');
            showToast(successMsg, 'success');
            await fetchProducts();
          } else {
            showToast(res.message || 'পণ্য ডিলেট করা সম্ভব হয়নি।', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'পণ্য ডিলেট করতে সমস্যা হয়েছে।', 'error');
        } finally {
          setDeletingId(null);
        }
      }
    );
  };

  const filteredProducts = useMemo(() => {
    let list = products;
    if (statusFilter !== 'ALL') {
      list = list.filter(p => {
        const st = (p.status || 'APPROVED').toUpperCase();
        if (statusFilter === 'PENDING') return st === 'PENDING';
        if (statusFilter === 'APPROVED') return st === 'APPROVED';
        if (statusFilter === 'REJECTED') return st === 'REJECTED';
        return true;
      });
    }

    const q = searchQuery.trim();
    if (!q) return list;

    const scored: { product: Product; score: number }[] = [];
    for (const p of list) {
      const { matches, score } = calculateProductRelevance(p, q);
      if (matches) {
        scored.push({ product: p, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.product);
  }, [products, searchQuery, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-900">আমার পণ্য ব্যবস্থাপনা (My Products)</h3>
          <p className="text-xs text-slate-500">
            মার্কেটপ্লেসে আপনার দোকানের পণ্য ও ছবি যোগ করুন, স্টক নিয়ন্ত্রণ করুন এবং সহজে পরিচালনা করুন।
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          নতুন পণ্য যোগ করুন
        </button>
      </div>

      {/* Search Bar & Status Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="পণ্য বা আংশিক নাম দিয়ে খুঁজুন (যেমন: মধু, পাঞ্জাবি)..."
            className="w-full pl-10 pr-10 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 font-medium rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 absolute right-3 top-1/2 -translate-y-1/2 transition"
              title="সার্চ মুছুন"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            সকল পণ্য ({products.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100'
            }`}
          >
            <span>⏳ পেন্ডিং</span>
            <span className="px-1.5 py-0.2 bg-amber-200/80 rounded-full text-[10px] font-extrabold">
              {products.filter(p => (p.status || '').toUpperCase() === 'PENDING').length}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100'
            }`}
          >
            <span>✓ অনুমোদিত/লাইভ</span>
            <span className="px-1.5 py-0.2 bg-emerald-200/80 rounded-full text-[10px] font-extrabold">
              {products.filter(p => (p.status || 'APPROVED').toUpperCase() === 'APPROVED').length}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200/80 hover:bg-rose-100'
            }`}
          >
            <span>✕ প্রত্যাখ্যাত</span>
            <span className="px-1.5 py-0.2 bg-rose-200/80 rounded-full text-[10px] font-extrabold">
              {products.filter(p => (p.status || '').toUpperCase() === 'REJECTED').length}
            </span>
          </button>
        </div>
      </div>

      {/* Products Table / Cards */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          <ShoppingBag className="w-8 h-8 mx-auto mb-2 animate-bounce text-emerald-500 opacity-60" />
          পণ্য তালিকা লোড হচ্ছে...
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
          <p className="text-xs text-rose-700">{error}</p>
          <button
            onClick={fetchProducts}
            className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-12 bg-white rounded-2xl border border-slate-100 text-center space-y-2">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">কোনো পণ্য পাওয়া যায়নি</h4>
          <p className="text-xs text-slate-400">আপনার দোকানে এখনও কোনো পণ্য যোগ করা হয়নি।</p>
          <button
            onClick={openAddModal}
            className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            পণ্য যোগ করুন
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredProducts.map((product, pIdx) => {
            const isToggling = togglingId === product.id;
            const isDeleting = deletingId === product.id;

            return (
              <div
                key={`mpt-p-${product.id || 'p'}-${pIdx}`}
                className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between p-3.5 space-y-3"
              >
                <div className="flex gap-3">
                  <div className="w-16 h-16 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <ShoppingBag className="w-7 h-7 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-extrabold rounded ${
                          product.isAvailable
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {product.isAvailable ? 'উপলব্ধ (In Stock)' : 'অনুপলব্ধ (Out of Stock)'}
                      </span>
                      {product.status === 'PENDING' && (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-800 rounded border border-amber-200">
                          ⏳ এডমিন অনুমোদনের অপেক্ষায়
                        </span>
                      )}
                      {product.status === 'APPROVED' && (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
                          ✓ লাইভ
                        </span>
                      )}
                      {product.status === 'REJECTED' && (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold bg-rose-100 text-rose-800 rounded border border-rose-200">
                          ✕ প্রত্যাখ্যাত
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {product.name}
                    </h4>
                    {product.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {product.description}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-extrabold text-emerald-700">
                        মূল্য: ৳{Number(product.originalPrice || 0).toLocaleString('bn-BD')}
                      </span>
                      <span className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <span>⚖️ ওজন:</span>
                        <span>{Number(product.weightKg || 1).toFixed(1)} কেজি</span>
                      </span>
                    </div>

                    {/* Pending Price Change Notice */}
                    {product.pendingPriceChange && (
                      <div className="mt-1.5 p-1.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900">
                        <span className="font-bold">⏳ প্রাইস চেঞ্জ পেন্ডিং:</span> ৳{Number(product.pendingPriceChange.oldPrice || 0).toLocaleString('bn-BD')} ➔ <span className="font-extrabold text-amber-700">৳{Number(product.pendingPriceChange.requestedNewPrice ?? (product.pendingPriceChange as any).requestedPrice ?? 0).toLocaleString('bn-BD')}</span>
                      </div>
                    )}

                    {/* Pending Delete Request Notice */}
                    {product.pendingDeleteRequest && (
                      <div className="mt-1.5 p-1.5 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-800 font-medium">
                        ⚠️ পণ্যটি মুছে ফেলার রিকোয়েস্ট এডমিন অনুমোদনের অপেক্ষায় রয়েছে।
                      </div>
                    )}

                    {/* Rejection Reason Notice */}
                    {product.status === 'REJECTED' && product.rejectionReason && (
                      <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-900 space-y-1">
                        <div className="font-bold flex items-center gap-1 text-rose-700">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          প্রত্যাখ্যানের কারণ:
                        </div>
                        <p className="text-slate-700">{product.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Control Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    disabled={isToggling}
                    onClick={() => handleToggleAvailability(product)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                      product.isAvailable
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {product.isAvailable ? (
                      <ToggleRight className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-slate-400" />
                    )}
                    {product.isAvailable ? 'উপলব্ধ' : 'অনুপলব্ধ'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      title="এডিট করুন"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={deletingId === product.id || Boolean(product.pendingDeleteRequest)}
                      onClick={() => handleDelete(product.id, product.status)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition disabled:opacity-30 cursor-pointer"
                      title={product.pendingDeleteRequest ? "ডিলেট রিকোয়েস্ট পেন্ডিং রয়েছে" : "মুছে ফেলুন"}
                    >
                      {deletingId === product.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setModalOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 max-h-[92vh] flex flex-col pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  {editingProduct ? 'পণ্য সংশোধন করুন' : 'নতুন পণ্য যোগ করুন'}
                </h4>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
                {/* Hidden File Input supporting gallery and Android camera */}
                <input
                  type="file"
                  id="merchant-product-file-input"
                  ref={fileInputRef}
                  onChange={handleImageFileSelect}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                />

                {/* PRODUCT IMAGE SECTION */}
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      পণ্যের ছবি <span className="text-rose-500">*</span>
                    </label>
                    {isUploadingImage && (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        আপলোড হচ্ছে...
                      </span>
                    )}
                  </div>

                  {/* Image Upload Area / Preview Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {imageUrls.map((url, idx) => (
                      <div key={`mpt-img-preview-${idx}`} className="relative aspect-square rounded-xl border border-slate-200 bg-slate-50 overflow-hidden group shadow-sm">
                        <img
                          src={url}
                          alt={`Product Preview ${idx + 1}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setImageUrls(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1.5 right-1.5 p-1.5 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg cursor-pointer z-10 hover:bg-rose-600 active:scale-90"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/50 backdrop-blur-md rounded text-[10px] text-white font-bold">
                          {idx + 1}
                        </div>
                      </div>
                    ))}
                    
                    {imageUrls.length < 5 && (
                      <button
                        type="button"
                        onClick={triggerFileInput}
                        className="aspect-square border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-xl flex flex-col items-center justify-center transition cursor-pointer group active:scale-[0.98]"
                      >
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition shadow-xs mb-1.5">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-800 uppercase tracking-tighter">ছবি যোগ করুন</span>
                        <span className="text-[9px] text-emerald-600/70 font-bold">({imageUrls.length}/৫)</span>
                      </button>
                    )}
                  </div>

                  {imageUrls.length === 0 && !isUploadingImage && (
                    <div className="mt-2 flex items-center gap-1.5 text-rose-500 bg-rose-50 p-2 rounded-lg border border-rose-100">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <p className="text-[10px] font-bold italic">
                        কমপক্ষে একটি পণ্যের ছবি প্রদান করা আবশ্যক।
                      </p>
                    </div>
                  )}

                  {isUploadingImage && (
                    <div className="mt-2.5 p-2.5 bg-emerald-50/80 border border-emerald-100 rounded-xl flex items-center gap-2.5 animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <div className="flex-1">
                        <span className="text-[11px] font-bold text-emerald-800 block">সার্ভারে আপলোড হচ্ছে...</span>
                        <div className="w-full h-1 bg-emerald-200 rounded-full mt-1 overflow-hidden">
                          <div className="w-1/2 h-full bg-emerald-500 animate-[loading_1s_infinite]"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Image Upload Error Notice */}
                  {imageUploadError && (
                    <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-1.5 touch-manipulation">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                      <div className="flex-1">
                        <span>{imageUploadError}</span>
                        <button
                          type="button"
                          onClick={triggerFileInput}
                          className="ml-2 font-bold underline hover:text-rose-900 cursor-pointer touch-manipulation"
                        >
                          আবার চেষ্টা করুন
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* PRODUCT NAME */}
                <div className="relative z-10">
                  <label htmlFor="merchant-product-name-input" className="block text-xs font-bold text-slate-800 mb-1 cursor-pointer select-none touch-manipulation">
                    পণ্যের নাম <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="merchant-product-name-input"
                    name="productName"
                    type="text"
                    required
                    inputMode="text"
                    autoComplete="off"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="যেমন: খাঁটি গাওয়া ঘি (১ কেজি)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-950 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:text-slate-950 focus:outline-none transition font-medium cursor-text touch-manipulation"
                  />
                </div>

                {/* ORIGINAL PRICE & WEIGHT */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                  <div>
                    <label htmlFor="merchant-product-price-input" className="block text-xs font-bold text-slate-800 mb-1 cursor-pointer select-none touch-manipulation">
                      মূল্য (BDT) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="merchant-product-price-input"
                      name="productPrice"
                      type="number"
                      required
                      min="0"
                      step="any"
                      inputMode="numeric"
                      autoComplete="off"
                      value={originalPrice}
                      onChange={e => setOriginalPrice(e.target.value)}
                      placeholder="যেমন: 1200"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-950 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:text-slate-950 focus:outline-none transition font-medium cursor-text touch-manipulation"
                    />
                  </div>

                  <div>
                    <label htmlFor="merchant-product-weight-input" className="block text-xs font-bold text-slate-800 mb-1 cursor-pointer select-none touch-manipulation">
                      একক পণ্যের ওজন (Weight in kg) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="merchant-product-weight-input"
                        name="productWeight"
                        type="number"
                        required
                        min="0.01"
                        step="any"
                        inputMode="decimal"
                        autoComplete="off"
                        value={weightKg}
                        onChange={e => setWeightKg(e.target.value)}
                        placeholder="যেমন: ০.৫ বা ১.২"
                        className="w-full pl-3.5 pr-12 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-950 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:text-slate-950 focus:outline-none transition font-medium cursor-text touch-manipulation"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">kg</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      * এই ওজন চেক আউট এ ডেলিভারি চার্জ নির্ধারণে ব্যবহৃত হবে (গ্রাহককে ইনপুট দিতে হবে না)।
                    </p>
                  </div>
                </div>

                  {/* DESCRIPTION */}
                <div className="relative z-10">
                  <label htmlFor="merchant-product-desc-input" className="block text-xs font-bold text-slate-800 mb-1 cursor-pointer select-none touch-manipulation">
                    বিবরণ <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="merchant-product-desc-input"
                    name="productDescription"
                    required
                    rows={3}
                    inputMode="text"
                    autoComplete="off"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="পণ্যের বিস্তারিত বিবরণ ও বৈশিষ্ট্য লিখুন..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-950 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:text-slate-950 focus:outline-none transition font-medium resize-none cursor-text touch-manipulation"
                  />
                </div>

                {/* AVAILABILITY TOGGLE */}
                <div className="flex items-center gap-2 pt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200 touch-manipulation">
                  <input
                    type="checkbox"
                    id="isAvailableCheck"
                    checked={isAvailable}
                    onChange={e => setIsAvailable(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer touch-manipulation"
                  />
                  <label htmlFor="isAvailableCheck" className="text-xs font-bold text-slate-800 cursor-pointer select-none touch-manipulation">
                    ☑️ পণ্যটি বিক্রির জন্য উপলব্ধ (In Stock)
                  </label>
                </div>

                {/* Validation Status Hint when incomplete */}
                {!isFormValid && (
                  <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center gap-2 touch-manipulation">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>
                      {!hasValidImage 
                        ? 'অনুগ্রহ করে পণ্যের একটি ছবি নির্বাচন করুন।' 
                        : !hasValidName 
                        ? 'পণ্যের নাম লিখুন।' 
                        : !hasValidPrice 
                        ? 'সঠিক মূল্য (BDT) লিখুন।' 
                        : isUploadingImage 
                        ? 'ছবি আপলোড সম্পন্ন হওয়া পর্যন্ত অপেক্ষা করুন।' 
                        : 'সবগুলো আবশ্যক তথ্য পূরণ করুন।'}
                    </span>
                  </div>
                )}

                {/* MODAL ACTION BUTTONS */}
                <div className="flex gap-2 pt-2 touch-manipulation">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer touch-manipulation active:scale-[0.98]"
                  >
                    বাতিল
                  </button>
                  <button
                    id="merchant-product-submit-btn"
                    type="submit"
                    disabled={!isFormValid}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed touch-manipulation active:scale-[0.98]"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        সংরক্ষণ হচ্ছে...
                      </>
                    ) : isUploadingImage ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ছবি আপলোড হচ্ছে...
                      </>
                    ) : editingProduct ? (
                      'আপডেট করুন'
                    ) : (
                      'যোগ করুন'
                    )}
                  </button>
                </div>
              </form>
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
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <X className="w-4 h-4 text-rose-600" />
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

