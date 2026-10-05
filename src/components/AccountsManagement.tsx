import React, { useState, useEffect, useMemo } from 'react';
import { 
  Store, 
  ChevronRight, 
  ChevronLeft, 
  Receipt, 
  Filter, 
  Calendar, 
  Trash2, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  Download,
  Activity,
  Heart,
  User,
  Landmark,
  Search,
  MapPin,
  ArrowUpDown,
  X,
  Building2,
  DollarSign,
  ShoppingBag,
  Coins,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  Phone,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { UserRedemptionRecord, TokenType } from '../types';
import { BANGLADESH_DISTRICTS, findDistrictData, isLocationMatchingDistrict, isLocationMatchingUpazila } from '../data/bangladeshGeo';
import { motion, AnimatePresence } from 'motion/react';
import { UserDetailModal } from './UserDetailModal';
import { MosqueDetailModal } from './MosqueDetailModal';

interface ShopItem {
  id: string;
  shopName: string;
  shopNameBn?: string;
  district?: string;
  upazila?: string;
  area?: string;
  address?: string;
  phone?: string;
  category?: string;
  totalRedemptions?: number;
  totalRevenue?: number;
  createdAt?: string;
}

interface FinancialSummary {
  totalAmount: number;
  totalGrossCommission: number;
  totalTokenBenefits: number;
  totalNetIncome: number;
  totalMerchantPayout: number;
  totalDonatedAmount?: number;
  totalCount: number;
}

interface AccountsManagementProps {
  onShowToast: (type: 'success' | 'error' | 'info', title: string, msg: string) => void;
}

export function AccountsManagement({ onShowToast }: AccountsManagementProps) {
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [selectedShop, setSelectedShop] = useState<ShopItem | null>(null);
  const [loadingShops, setLoadingShops] = useState(true);
  
  // Search, District/Upazila Filter & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedUpazila, setSelectedUpazila] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'district-asc' | 'redemptions-desc' | 'revenue-desc' | 'newest'>('name-asc');
  
  // Shop details & Redemptions states
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [redemptions, setRedemptions] = useState<UserRedemptionRecord[]>([]);
  const [redemptionSearchQuery, setRedemptionSearchQuery] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Detail Modals State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedMosqueInfo, setSelectedMosqueInfo] = useState<{ id?: string | null; name?: string | null } | null>(null);

  // Filters for selected shop
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'>('ALL');
  const [tokenFilter, setTokenFilter] = useState<'ALL' | 'GOLD' | 'SILVER' | 'BRONZE'>('ALL');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [downloadingFormat, setDownloadingFormat] = useState<'pdf' | 'xlsx' | 'csv' | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    if (selectedShop) {
      fetchShopData();
    }
  }, [selectedShop, dateFilter, tokenFilter, customDateFrom, customDateTo]);

  const fetchShops = async () => {
    setLoadingShops(true);
    try {
      const res = await api.getAdminAccountsShops();
      if (res.success) {
        setShops(res.shops || []);
      }
    } catch (err) {
      console.error(err);
      onShowToast('error', 'ত্রুটি', 'শপ লিস্ট লোড করা সম্ভব হয়নি।');
    } finally {
      setLoadingShops(false);
    }
  };

  // Available Upazilas based on chosen District
  const availableUpazilas = useMemo(() => {
    if (!selectedDistrict) return [];
    const found = BANGLADESH_DISTRICTS.find(
      d => d.district.toLowerCase() === selectedDistrict.toLowerCase() || 
           d.districtBn === selectedDistrict
    );
    return found ? found.upazilas : [];
  }, [selectedDistrict]);

  // Handle District change
  const handleDistrictChange = (dist: string) => {
    setSelectedDistrict(dist);
    setSelectedUpazila(''); // reset upazila when district changes
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDistrict('');
    setSelectedUpazila('');
    setSelectedCategory('');
    setSortBy('name-asc');
  };

  const isFilterActive = searchQuery || selectedDistrict || selectedUpazila || selectedCategory || sortBy !== 'name-asc';

  // Unique categories list
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    shops.forEach(s => {
      if (s.category) cats.add(s.category);
    });
    return Array.from(cats).sort();
  }, [shops]);

  // Filtered & Sorted Shops
  const filteredAndSortedShops = useMemo(() => {
    let list = [...shops];

    // 1. Search Query (Shop Name in EN/BN, District, Upazila, Area, Address, Phone, Category)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(shop => {
        const name = (shop.shopName || '').toLowerCase();
        const nameBn = (shop.shopNameBn || '').toLowerCase();
        const district = (shop.district || '').toLowerCase();
        const upazila = (shop.upazila || '').toLowerCase();
        const area = (shop.area || '').toLowerCase();
        const address = (shop.address || '').toLowerCase();
        const phone = (shop.phone || '').toLowerCase();
        const category = (shop.category || '').toLowerCase();

        // Check if query matches district bangla or english name
        const geoDist = BANGLADESH_DISTRICTS.find(
          d => d.district.toLowerCase() === district || d.districtBn === shop.district
        );
        const distBn = geoDist ? geoDist.districtBn.toLowerCase() : '';
        const distEn = geoDist ? geoDist.district.toLowerCase() : '';

        return (
          name.includes(q) ||
          nameBn.includes(q) ||
          district.includes(q) ||
          distBn.includes(q) ||
          distEn.includes(q) ||
          upazila.includes(q) ||
          area.includes(q) ||
          address.includes(q) ||
          phone.includes(q) ||
          category.includes(q)
        );
      });
    }

    // 2. District Filter
    if (selectedDistrict) {
      list = list.filter(shop => isLocationMatchingDistrict(shop, selectedDistrict));
    }

    // 3. Upazila Filter
    if (selectedUpazila) {
      list = list.filter(shop => isLocationMatchingUpazila(shop, selectedUpazila));
    }

    // 4. Category Filter
    if (selectedCategory) {
      list = list.filter(shop => (shop.category || '').toLowerCase() === selectedCategory.toLowerCase());
    }

    // 5. Sorting
    list.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': {
          const nameA = a.shopNameBn || a.shopName || '';
          const nameB = b.shopNameBn || b.shopName || '';
          return nameA.localeCompare(nameB, 'bn');
        }
        case 'name-desc': {
          const nameA = a.shopNameBn || a.shopName || '';
          const nameB = b.shopNameBn || b.shopName || '';
          return nameB.localeCompare(nameA, 'bn');
        }
        case 'district-asc': {
          const distA = a.district || '';
          const distB = b.district || '';
          if (distA !== distB) return distA.localeCompare(distB, 'bn');
          const upA = a.upazila || a.area || '';
          const upB = b.upazila || b.area || '';
          return upA.localeCompare(upB, 'bn');
        }
        case 'redemptions-desc':
          return (b.totalRedemptions || 0) - (a.totalRedemptions || 0);
        case 'revenue-desc':
          return (b.totalRevenue || 0) - (a.totalRevenue || 0);
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default:
          return 0;
      }
    });

    return list;
  }, [shops, searchQuery, selectedDistrict, selectedUpazila, selectedCategory, sortBy]);

  // Filter params for selected shop
  const getFilterParams = () => {
    const filters: { dateFrom?: string; dateTo?: string; tokenType?: string } = {};
    if (tokenFilter !== 'ALL') filters.tokenType = tokenFilter;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateFilter === 'TODAY') {
      filters.dateFrom = today.toISOString();
    } else if (dateFilter === 'YESTERDAY') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      filters.dateFrom = yesterday.toISOString();
      filters.dateTo = today.toISOString();
    } else if (dateFilter === 'LAST_7_DAYS') {
      const last7 = new Date(today);
      last7.setDate(last7.getDate() - 7);
      filters.dateFrom = last7.toISOString();
    } else if (dateFilter === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      filters.dateFrom = firstDay.toISOString();
    } else if (dateFilter === 'LAST_MONTH') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      filters.dateFrom = firstDayLastMonth.toISOString();
      filters.dateTo = lastDayLastMonth.toISOString();
    } else if (dateFilter === 'CUSTOM') {
      if (customDateFrom) filters.dateFrom = new Date(customDateFrom).toISOString();
      if (customDateTo) filters.dateTo = new Date(customDateTo).toISOString();
    }

    return filters;
  };

  const fetchShopData = async () => {
    if (!selectedShop) return;
    setLoadingData(true);
    try {
      const filters = getFilterParams();
      const [sumRes, redRes] = await Promise.all([
        api.getAdminAccountsShopSummary(selectedShop.id, filters),
        api.getAdminAccountsShopRedemptions(selectedShop.id, filters)
      ]);

      if (sumRes.success) {
        const rawSummary = (sumRes.summary || {}) as any;
        setSummary({
          totalAmount: rawSummary.totalAmount || 0,
          totalGrossCommission: rawSummary.totalGrossCommission || rawSummary.totalCommission || 0,
          totalTokenBenefits: rawSummary.totalTokenBenefits || 0,
          totalNetIncome: rawSummary.totalNetIncome || 0,
          totalMerchantPayout: rawSummary.totalMerchantPayout || 0,
          totalDonatedAmount: rawSummary.totalDonatedAmount || 0,
          totalCount: rawSummary.totalCount || 0
        });
      }
      if (redRes.success) setRedemptions(redRes.redemptions || []);
    } catch (err) {
      console.error(err);
      onShowToast('error', 'ত্রুটি', 'হিসাব তথ্য লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoadingData(false);
    }
  };

  // Filtered Redemptions for the selected shop
  const filteredRedemptions = useMemo(() => {
    if (!redemptionSearchQuery.trim()) return redemptions;
    const q = redemptionSearchQuery.toLowerCase().trim();
    return redemptions.filter(r => {
      const name = (r.userName || '').toLowerCase();
      const phone = (r.userPhone || '').toLowerCase();
      const mosque = (r.earnedMosqueName || '').toLowerCase();
      const token = (r.tokenType || '').toLowerCase();
      const id = (r.id || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || mosque.includes(q) || token.includes(q) || id.includes(q);
    });
  }, [redemptions, redemptionSearchQuery]);

  const handleDownloadReport = async (format: 'pdf' | 'xlsx' | 'csv') => {
    if (!selectedShop || downloadingFormat) return;
    setDownloadingFormat(format);
    setShowDownloadMenu(false);
    try {
      const filters = getFilterParams();
      await api.downloadAdminShopFinancialReport(selectedShop.id, { format, ...filters });
      onShowToast('success', 'সফল', `${format.toUpperCase()} ফরম্যাটে রিপোর্ট ডাউনলোড সম্পন্ন হয়েছে।`);
    } catch (err: any) {
      console.error('Download report error:', err);
      onShowToast('error', 'ত্রুটি', err.message || 'রিপোর্ট ডাউনলোড করতে ব্যর্থ হয়েছে।');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleDeleteRedemption = async (redemptionId: string) => {
    setDeletingId(redemptionId);
    setConfirmDeleteId(null);
    try {
      const res = await api.deleteAdminRedemptionRecord(redemptionId);
      if (res.success) {
        onShowToast('success', 'সফল', 'রেকর্ডটি সফলভাবে মুছে ফেলা হয়েছে।');
        setRedemptions(prev => prev.filter(r => r.id !== redemptionId));
        fetchShopData();
      } else {
        onShowToast('error', 'ব্যর্থ', res.message || 'রেকর্ডটি মুছা সম্ভব হয়নি।');
      }
    } catch (err: any) {
      console.error(err);
      onShowToast('error', 'ত্রুটি', 'সার্ভার সাইড সমস্যা হয়েছে।');
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkAsPaid = async (redemptionId: string) => {
    setPayingId(redemptionId);
    try {
      const res = await api.markCommissionPaid(redemptionId);
      if (res.success) {
        onShowToast('success', 'সফল', 'কমিশন পেমেন্ট সফলভাবে পরিশোধিত হিসেবে চিহ্নিত করা হয়েছে।');
        setRedemptions(prev => prev.map((r, idx) => r.id === redemptionId ? { ...r, commissionPaymentStatus: 'paid' } : r));
        fetchShopData();
      } else {
        onShowToast('error', 'ব্যর্থ', res.message || 'স্ট্যাটাস আপডেট করা সম্ভব হয়নি।');
      }
    } catch (err: any) {
      console.error(err);
      onShowToast('error', 'ত্রুটি', 'সার্ভার সাইড সমস্যা হয়েছে।');
    } finally {
      setPayingId(null);
    }
  };

  if (loadingShops) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        <p className="text-slate-400 font-bold">শপের হিসাব তালিকা লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {!selectedShop ? (
          <motion.div
            key="shop-list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-5"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    হিসাব সমূহ (Accounts & Financials)
                  </h2>
                  <p className="text-xs text-slate-400">
                    সকল পার্টনার শপের রিডেম্পশন, আর্থিক হিসাব ও কমিশন ব্যবস্থাপনা
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchShops}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="রিফ্রেশ করুন"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>রিফ্রেশ</span>
                </button>
              </div>
            </div>

            {/* ========================================================= */}
            {/* SEARCH ENGINE & ADVANCED DISTRICT/UPAZILA FILTERS BAR     */}
            {/* ========================================================= */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3.5">
              {/* Top Row: Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="শপের নাম, মোবাইল, ঠিকানা, জেলা বা উপজেলা দিয়ে সার্চ করুন..."
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-white text-xs font-medium placeholder-slate-500 outline-none transition shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1"
                    title="ক্লিয়ার করুন"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Bottom Row: Filter dropdowns & Sort options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* 1. জেলা (District) Filter */}
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus-within:border-amber-500 transition">
                  <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">জেলা (District)</label>
                    <select
                      value={selectedDistrict}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer truncate"
                    >
                      <option value="" className="bg-slate-900 text-slate-300">সব জেলা (All Districts)</option>
                      {BANGLADESH_DISTRICTS.slice()
                        .sort((a, b) => a.districtBn.localeCompare(b.districtBn, 'bn'))
                        .map((d, dIdx) => (
                          <option key={`am-dist-${d.district}-${dIdx}`} value={d.district} className="bg-slate-900 text-slate-200">
                            {d.districtBn} ({d.district})
                          </option>
                        ))}
                    </select>
                  </div>
                  {selectedDistrict && (
                    <button
                      onClick={() => handleDistrictChange('')}
                      className="text-slate-500 hover:text-rose-400 p-0.5"
                      title="জেলা ফিল্টার মুছুন"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 2. উপজেলা (Upazila) Filter */}
                <div className={`flex items-center gap-2 px-3 py-2 bg-slate-950 border rounded-xl transition ${
                  selectedDistrict ? 'border-slate-800 focus-within:border-amber-500' : 'border-slate-800/60 opacity-60'
                }`}>
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
                        {selectedDistrict ? 'সব উপজেলা (All Upazilas)' : 'প্রথমে জেলা সিলেক্ট করুন'}
                      </option>
                      {availableUpazilas.map((upazila, uIdx) => (
                        <option key={`am-upa-${upazila}-${uIdx}`} value={upazila} className="bg-slate-900 text-slate-200">
                          {upazila}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedUpazila && (
                    <button
                      onClick={() => setSelectedUpazila('')}
                      className="text-slate-500 hover:text-rose-400 p-0.5"
                      title="উপজেলা ফিল্টার মুছুন"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 3. ক্যাটাগরি (Category) Filter */}
                {uniqueCategories.length > 0 ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus-within:border-amber-500 transition">
                    <SlidersHorizontal className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">ক্যাটাগরি</label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer truncate"
                      >
                        <option value="" className="bg-slate-900 text-slate-300">সব ক্যাটাগরি</option>
                        {uniqueCategories.map((cat, idx) => (
                          <option key={`${cat}-${idx}`} value={cat} className="bg-slate-900 text-slate-200">
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedCategory && (
                      <button
                        onClick={() => setSelectedCategory('')}
                        className="text-slate-500 hover:text-rose-400 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="hidden lg:block" />
                )}

                {/* 4. Sort By Options */}
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus-within:border-amber-500 transition">
                  <ArrowUpDown className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">সর্ট (Sort By)</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full bg-transparent text-xs font-bold text-amber-400 outline-none cursor-pointer truncate"
                    >
                      <option value="name-asc" className="bg-slate-900 text-slate-200">নাম অনুযায়ী (A to Z / ক-হ)</option>
                      <option value="name-desc" className="bg-slate-900 text-slate-200">নাম অনুযায়ী (Z to A / হ-ক)</option>
                      <option value="district-asc" className="bg-slate-900 text-slate-200">জেলা ও উপজেলা অনুযায়ী</option>
                      <option value="redemptions-desc" className="bg-slate-900 text-slate-200">সর্বাধিক লেনদেন (Redemptions)</option>
                      <option value="revenue-desc" className="bg-slate-900 text-slate-200">সর্বোচ্চ বিক্রি হিসাব (Revenue)</option>
                      <option value="newest" className="bg-slate-900 text-slate-200">নতুন শপ আগে (Newest)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Status bar & Active Filter indicators */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                <div className="flex items-center gap-2 text-slate-400">
                  <span>ফলাফল:</span>
                  <span className="font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                    {filteredAndSortedShops.length} টি শপ
                  </span>
                  {shops.length !== filteredAndSortedShops.length && (
                    <span className="text-slate-500 text-[10px]">
                      (মোট {shops.length} টির মধ্যে)
                    </span>
                  )}
                </div>

                {isFilterActive && (
                  <button
                    onClick={handleResetFilters}
                    className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 font-bold transition-colors cursor-pointer text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>সকল ফিল্টার রিসেট করুন</span>
                  </button>
                )}
              </div>
            </div>

            {/* ========================================================= */}
            {/* SHOPS GRID LIST                                           */}
            {/* ========================================================= */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredAndSortedShops.map((shop, sIdx) => {
                // District Bengali Name lookup
                const distInfo = BANGLADESH_DISTRICTS.find(
                  d => d.district.toLowerCase() === (shop.district || '').toLowerCase() || d.districtBn === shop.district
                );
                const displayDistrict = distInfo ? distInfo.districtBn : (shop.district || '');
                const displayUpazila = shop.upazila || shop.area || '';

                return (
                  <button
                    key={`am-shop-${shop.id || 's'}-${sIdx}`}
                    onClick={() => setSelectedShop(shop)}
                    className="bg-slate-900 border border-slate-800 hover:border-amber-500/60 p-4 rounded-2xl flex flex-col justify-between gap-3 group transition-all cursor-pointer shadow-lg hover:shadow-amber-950/20 text-left hover:scale-[1.01]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-amber-400 group-hover:border-amber-500/30 transition-colors shrink-0">
                          <Store className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-black text-sm text-white group-hover:text-amber-400 transition-colors truncate">
                            {shop.shopNameBn || shop.shopName}
                          </h3>
                          {shop.shopNameBn && shop.shopName && shop.shopNameBn !== shop.shopName && (
                            <p className="text-[10px] text-slate-400 font-mono truncate">{shop.shopName}</p>
                          )}
                          {shop.category && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-slate-800/80 border border-slate-700/60 rounded text-[9px] font-bold text-slate-300">
                              {shop.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                    </div>

                    {/* Location & Details */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px]">
                      {(displayDistrict || displayUpazila) && (
                        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                          <span className="truncate">
                            {displayDistrict && <strong className="text-amber-400">{displayDistrict}</strong>}
                            {displayDistrict && displayUpazila && <span className="text-slate-600 mx-1">•</span>}
                            {displayUpazila && <span>{displayUpazila}</span>}
                          </span>
                        </div>
                      )}
                      
                      {shop.phone && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono">
                          <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{shop.phone}</span>
                        </div>
                      )}

                      {/* Financial Snippet if available */}
                      {(shop.totalRedemptions !== undefined && shop.totalRedemptions > 0) && (
                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                          <span>মোট লেনদেন: <strong className="text-white">{shop.totalRedemptions} টি</strong></span>
                          <span>বিক্রি: <strong className="text-emerald-400">৳{(shop.totalRevenue || 0).toLocaleString('bn-BD')}</strong></span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              {filteredAndSortedShops.length === 0 && (
                <div className="col-span-full py-16 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/60 text-slate-500 flex items-center justify-center mx-auto">
                    <Search className="w-6 h-6" />
                  </div>
                  <p className="text-slate-400 font-bold text-sm">
                    {searchQuery || selectedDistrict || selectedUpazila 
                      ? 'আপনার সার্চ বা ফিল্টারের সাথে কোনো শপ মেলেনি।' 
                      : 'কোনো পার্টনার শপ পাওয়া যায়নি।'}
                  </p>
                  {isFilterActive && (
                    <button
                      onClick={handleResetFilters}
                      className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      ফিল্টার রিসেট করুন
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="shop-details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Confirmation Modal */}
            {confirmDeleteId && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4 mx-auto">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-white text-center mb-2">Delete This Financial Record?</h3>
                  <p className="text-xs text-slate-400 text-center mb-6 leading-relaxed">
                    Are you sure you want to remove this redemption record from the financial accounts? This action cannot be undone.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteRedemption(confirmDeleteId)}
                      className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-colors shadow-lg shadow-rose-950/50 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <button
                onClick={() => setSelectedShop(null)}
                className="flex items-center gap-2 text-slate-400 hover:text-amber-500 transition-colors font-bold text-sm cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>ফিরে যান (Back to Shops)</span>
              </button>
              
              <div className="flex flex-col">
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  {selectedShop.shopNameBn || selectedShop.shopName}
                </h2>
                {selectedShop.district && (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    <span>{selectedShop.district}{selectedShop.upazila ? ` • ${selectedShop.upazila}` : (selectedShop.area ? ` • ${selectedShop.area}` : '')}</span>
                  </p>
                )}
              </div>

              {/* Download Report Button with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowDownloadMenu(prev => !prev)}
                  disabled={downloadingFormat !== null}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  id="admin-accounts-download-btn"
                >
                  {downloadingFormat ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <Download className="w-4 h-4 text-slate-950" />
                  )}
                  <span>{downloadingFormat ? `ডাউনলোড হচ্ছে (${downloadingFormat.toUpperCase()})...` : 'Download হিসাব'}</span>
                </button>

                {showDownloadMenu && (
                  <div 
                    className="absolute right-0 mt-2 w-48 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95"
                    id="admin-accounts-download-menu"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      ফরম্যাট নির্বাচন করুন
                    </div>
                    <button
                      onClick={() => handleDownloadReport('pdf')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors text-left cursor-pointer"
                    >
                      <span>PDF ফাইল (.pdf)</span>
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-black">PDF</span>
                    </button>
                    <button
                      onClick={() => handleDownloadReport('xlsx')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors text-left cursor-pointer"
                    >
                      <span>Excel শিট (.xlsx)</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black">XLSX</span>
                    </button>
                    <button
                      onClick={() => handleDownloadReport('csv')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors text-left cursor-pointer"
                    >
                      <span>CSV ফাইল (.csv)</span>
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-black">CSV</span>
                    </button>
                  </div>
                )}
              </div>
            </div>


            {/* Filters Bar & Transaction Search */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-3 shadow-md">
              {/* Transaction Search Box */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={redemptionSearchQuery}
                  onChange={(e) => setRedemptionSearchQuery(e.target.value)}
                  placeholder="গ্রাহকের নাম, মোবাইল বা মসজিদ দিয়ে সার্চ করুন..."
                  className="w-full pl-10 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500 outline-none focus:border-amber-500"
                />
                {redemptionSearchQuery && (
                  <button
                    onClick={() => setRedemptionSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl">
                <Calendar className="w-4 h-4 text-amber-500" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900 text-slate-200">All Time</option>
                  <option value="TODAY" className="bg-slate-900 text-slate-200">Today</option>
                  <option value="YESTERDAY" className="bg-slate-900 text-slate-200">Yesterday</option>
                  <option value="LAST_7_DAYS" className="bg-slate-900 text-slate-200">Last 7 Days</option>
                  <option value="THIS_MONTH" className="bg-slate-900 text-slate-200">This Month</option>
                  <option value="LAST_MONTH" className="bg-slate-900 text-slate-200">Last Month</option>
                  <option value="CUSTOM" className="bg-slate-900 text-slate-200">Custom Range</option>
                </select>
              </div>

              {/* Token Filter */}
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl">
                <Filter className="w-4 h-4 text-amber-500" />
                <select
                  value={tokenFilter}
                  onChange={(e) => setTokenFilter(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900 text-slate-200">All Tokens</option>
                  <option value="GOLD" className="bg-slate-900 text-slate-200">Gold</option>
                  <option value="SILVER" className="bg-slate-900 text-slate-200">Silver</option>
                  <option value="BRONZE" className="bg-slate-900 text-slate-200">Bronze</option>
                </select>
              </div>

              {dateFilter === 'CUSTOM' && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                  />
                  <span className="text-slate-500 font-bold text-xs">to</span>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div className="ml-auto">
                <button
                  onClick={fetchShopData}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="Refresh"
                >
                  <Loader2 className={`w-4 h-4 ${loadingData ? 'animate-spin text-amber-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Redemptions Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Date</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">User</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">মূল বিল</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">কমিশন পুল</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">ডিসকাউন্ট</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">দানকৃত অর্থ</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">স্ট্যাটাস / Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">গ্রাহক দিয়েছে</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">নেট আয়</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {loadingData && filteredRedemptions.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-20 text-center">
                          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-2" />
                          <p className="text-slate-400 font-bold">লোড হচ্ছে...</p>
                        </td>
                      </tr>
                    ) : filteredRedemptions.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-20 text-center">
                          <AlertCircle className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                          <p className="text-slate-500 font-bold italic">এই শপের জন্য কোনো রেকর্ড পাওয়া যায়নি।</p>
                        </td>
                      </tr>
                    ) : (
                      filteredRedemptions.map((record, rIdx) => (
                        <tr key={`am-rec-${record.id || 'r'}-${rIdx}`} className="hover:bg-slate-800/30 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-[11px] font-medium text-slate-300">
                              {new Date(record.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => setSelectedUserId(record.userId || record.userPhone)}
                              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer text-left group-hover:scale-[1.02] transition-transform"
                              title="ইউজারের বিস্তারিত তথ্য দেখুন"
                            >
                              <User className="w-3 h-3 text-amber-400 flex-shrink-0" />
                              <span>{record.userName}</span>
                            </button>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                                record.tokenType === 'GOLD' ? 'bg-amber-500/10 text-amber-500' :
                                record.tokenType === 'SILVER' ? 'bg-slate-400/10 text-slate-300' :
                                'bg-orange-900/20 text-orange-400'
                              }`}>
                                {record.tokenType}
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono">{record.userPhone}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-[11px] font-bold text-white font-mono">৳{(record.purchaseAmount || 0).toLocaleString('bn-BD')}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-[11px] font-bold text-amber-500/80 font-mono">৳{(record.grossCommissionAmount || 0).toLocaleString('bn-BD')}</span>
                            <div className="text-[8px] text-slate-600">({record.commissionRate || 0}%)</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-[11px] font-bold text-rose-400 font-mono">৳{(record.discountAmount || 0).toLocaleString('bn-BD')}</span>
                            <div className="text-[8px] text-slate-600">({record.discountPercentage || 0}%)</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {record.isDonated ? (
                              <div className="flex flex-col items-center justify-center">
                                <span className="text-[11px] font-black text-emerald-400 font-mono flex items-center justify-center gap-0.5">
                                  <Heart className="w-2.5 h-2.5 fill-current text-emerald-400 animate-pulse" />
                                  ৳{(record.donatedAmount || 0).toLocaleString('bn-BD')}
                                </span>
                                <span className="text-[8px] text-emerald-300 font-bold">দান সম্পন্ন</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-bold">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {record.commissionPaymentStatus === 'paid' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                🟢 পরিশোধিত / Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                🟠 অপরিশোধিত / Unpaid
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-[11px] font-black text-emerald-400 font-mono">৳{(record.finalPayableAmount || 0).toLocaleString('bn-BD')}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-[11px] font-black text-blue-400 font-mono">৳{(record.caveCompanionsNetIncome || 0).toLocaleString('bn-BD')}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right flex items-center justify-end gap-1.5">
                            {record.commissionPaymentStatus !== 'paid' && (
                              <button
                                disabled={payingId === record.id}
                                onClick={() => handleMarkAsPaid(record.id)}
                                className="px-2 py-1 text-[9px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                {payingId === record.id ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : null}
                                পরিশোধিত করুন / Mark as Paid
                              </button>
                            )}
                            <button
                              disabled={deletingId === record.id}
                              onClick={() => setConfirmDeleteId(record.id)}
                              className="p-1.5 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed animate-fade-in"
                              title="Delete Record"
                            >
                              {deletingId === record.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
}
