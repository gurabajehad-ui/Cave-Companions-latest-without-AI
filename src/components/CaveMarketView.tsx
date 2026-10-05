import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  Search,
  AlertCircle,
  ShoppingCart,
  Store,
  Award,
  ArrowUpDown,
  Filter,
  Check,
  X,
  Sparkles,
  Layers,
  ChevronDown,
  Tag
} from 'lucide-react';
import { Product } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ProductBuyModal } from './ProductBuyModal';
import { ProductDetailsModal } from './ProductDetailsModal';
import { CartModal } from './CartModal';
import { MyOrdersModal } from './MyOrdersModal';
import AdBanner from './AdBanner';
import { toBnNumber } from '../data/prayerConfig';
import { calculateProductRelevance, normalizeSearchText } from '../utils/marketSearch';
import { useLanguage } from '../context/LanguageContext';

export interface MarketCategoryOption {
  id: string;
  labelBn: string;
  labelEn: string;
  icon: string;
  keywords: string[];
}

export const POPULAR_SEARCH_TAGS = [
  { labelBn: 'বই', labelEn: 'Books', icon: '📚' },
  { labelBn: 'কুরআন ও হাদিস', labelEn: 'Quran & Hadith', icon: '📖' },
  { labelBn: 'মধু', labelEn: 'Honey', icon: '🍯' },
  { labelBn: 'পাঞ্জাবি', labelEn: 'Panjabi', icon: '👕' },
  { labelBn: 'আতর', labelEn: 'Attar', icon: '🕋' },
  { labelBn: 'খেজুর', labelEn: 'Dates', icon: '🌴' },
  { labelBn: 'ঘি ও তেল', labelEn: 'Ghee & Oil', icon: '🧈' },
  { labelBn: 'টুপি', labelEn: 'Prayer Cap', icon: '🧢' },
  { labelBn: 'বোরকা ও হিজাব', labelEn: 'Burqa & Hijab', icon: '🧕' }
];

export const MARKET_CATEGORIES: MarketCategoryOption[] = [
  { id: 'all', labelBn: 'সকল পণ্য', labelEn: 'All Products', icon: '🏪', keywords: [] },
  {
    id: 'books',
    labelBn: 'বই ও ইসলামিক সামগ্রী',
    labelEn: 'Books & Islamic',
    icon: '📚',
    keywords: ['বই', 'book', 'books', 'কুরআন', 'হাদিস', 'ইসলামিক', 'library', 'বুক', 'তাফসির', 'কিতাব', 'মাসনুন', 'দোয়া', 'সিরাত']
  },
  {
    id: 'food',
    labelBn: 'খাবার ও রেস্তোরাঁ',
    labelEn: 'Food & Restaurant',
    icon: '🍲',
    keywords: ['খাবার', 'food', 'রেস্তোরাঁ', 'restaurant', 'ক্যাফে', 'হানি', 'মিষ্টি', 'বিরিয়ানি', 'জুস', 'স্ন্যাকস', 'বিরিয়ানি', 'চা', 'কফি']
  },
  {
    id: 'grocery',
    labelBn: 'মুদি ও গ্রোসারি',
    labelEn: 'Grocery & Market',
    icon: '🛒',
    keywords: ['মুদি', 'grocery', 'সুপারশপ', 'চাল', 'ডাল', 'তেল', 'মসলা', 'খেজুর', 'মধু', 'ঘি', 'সরিষার তেল', 'বাদাম']
  },
  {
    id: 'fashion',
    labelBn: 'পোশাক ও ফ্যাশন',
    labelEn: 'Clothing & Fashion',
    icon: '👕',
    keywords: ['পোশাক', 'fashion', 'clothing', 'জুব্বা', 'পাঞ্জাবি', 'টুপি', 'বোরকা', 'হিজাব', 'আতর', 'তসবিহ', 'কাপড়', 'সালোয়ার']
  },
  {
    id: 'health',
    labelBn: 'ফার্মেসি ও ঔষধ',
    labelEn: 'Pharmacy & Health',
    icon: '💊',
    keywords: ['ফার্মেসি', 'health', 'pharmacy', 'মেডিসিন', 'ঔষধ', 'অর্গানিক', 'সুরক্ষা', 'ক্যাপসুল', 'সিরাপ', 'সাপ্লিমেন্ট']
  },
  {
    id: 'electronics',
    labelBn: 'ইলেকট্রনিক্স ও গ্যাজেট',
    labelEn: 'Electronics & Gadgets',
    icon: '📱',
    keywords: ['ইলেকট্রনিক্স', 'electronics', 'গ্যাজেট', 'মোবাইল', 'চার্জার', 'ঘড়ি', 'হেডফোন', 'পাওয়ার ব্যাংক', 'কেবল']
  },
  {
    id: 'beauty',
    labelBn: 'বিউটি ও প্রসাধন',
    labelEn: 'Beauty & Cosmetics',
    icon: '💇',
    keywords: ['বিউটি', 'beauty', 'স্কিনকেয়ার', 'সাবান', 'শ্যাম্পু', 'তেল', 'ক্রিম', 'লোশন', 'পারফিউম', 'মেকআপ']
  },
  {
    id: 'service',
    labelBn: 'সেবা ও অন্যান্য',
    labelEn: 'Services & Others',
    icon: '🔧',
    keywords: ['সার্ভিস', 'service', 'রিপায়ার', 'জেনারেল', 'other', 'others', 'মেরামত']
  }
];

export type MarketSortOption = 'newest' | 'discount_desc' | 'price_asc' | 'price_desc' | 'name_asc';

export const SORT_OPTIONS: { id: MarketSortOption; labelBn: string; labelEn: string; icon: string }[] = [
  { id: 'newest', labelBn: 'নতুন যুক্ত', labelEn: 'Newest Arrivals', icon: '⚡' },
  { id: 'discount_desc', labelBn: 'সর্বোচ্চ টোকেন ছাড়', labelEn: 'Highest Token Discount', icon: '🏷️' },
  { id: 'price_asc', labelBn: 'দাম: কম থেকে বেশি', labelEn: 'Price: Low to High', icon: '💰' },
  { id: 'price_desc', labelBn: 'দাম: বেশি থেকে কম', labelEn: 'Price: High to Low', icon: '💎' },
  { id: 'name_asc', labelBn: 'নাম অনুযায়ী (A-Z)', labelEn: 'Name (A-Z)', icon: '🔤' }
];

export const CaveMarketView: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [products, setProducts] = useState<(Product & {
    goldDiscount: number;
    silverDiscount: number;
    bronzeDiscount: number;
  })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<MarketSortOption>('newest');
  const [marketType, setMarketType] = useState<'NATIONWIDE' | 'LOCAL'>('NATIONWIDE');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [showSortDropdown, setShowSortDropdown] = useState<boolean>(false);

  const [selectedProduct, setSelectedProduct] = useState<(Product & {
    goldDiscount: number;
    silverDiscount: number;
    bronzeDiscount: number;
  }) | null>(null);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsProduct, setDetailsProduct] = useState<any>(null);

  const handleProductClick = (product: any) => {
    setDetailsProduct(product);
    setDetailsModalOpen(true);
  };

  useEffect(() => {
    fetchProducts();
  }, [marketType]);

  useEffect(() => {
    fetchCartCount();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAllMarketProducts(marketType);
      if (res.success) {
        setProducts(res.products || []);
      }
    } catch (err: any) {
      console.error('Error fetching all market products:', err);
      setError(err.message || 'মার্কেটপ্লেসের পণ্য লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const fetchCartCount = async () => {
    try {
      const res = await api.getCart();
      if (res.success && res.cart) {
        setCartCount(res.cart.totalQuantity || (res.cart.items ? res.cart.items.length : 0));
      }
    } catch (err) {
      console.error('Error fetching cart:', err);
    }
  };

  // Check if a product matches a category
  const matchesCategory = (p: Product, catId: string): boolean => {
    if (catId === 'all') return true;

    const catConfig = MARKET_CATEGORIES.find(c => c.id === catId);
    const pShopCat = (p.shopCategory || '').toLowerCase();
    const pShopBiz = (p.shopBusinessType || '').toLowerCase();
    const pCat = (p.category || '').toLowerCase();

    // 1. Direct category code match
    if (pShopCat === catId || pShopBiz === catId || pCat === catId) {
      return true;
    }

    // 2. Aliases for common category names
    if (catId === 'books' && (pShopCat.includes('book') || pShopBiz.includes('book') || pCat.includes('book'))) {
      return true;
    }
    if (catId === 'health' && (pShopCat.includes('pharm') || pShopBiz.includes('pharm') || pShopCat.includes('health') || pShopBiz.includes('health'))) {
      return true;
    }
    if (catId === 'fashion' && (pShopCat.includes('cloth') || pShopBiz.includes('cloth') || pShopCat.includes('fashion') || pShopBiz.includes('fashion'))) {
      return true;
    }
    if (catId === 'grocery' && (pShopCat.includes('groc') || pShopBiz.includes('groc') || pShopCat.includes('super') || pShopBiz.includes('super'))) {
      return true;
    }
    if (catId === 'food' && (pShopCat.includes('food') || pShopBiz.includes('food') || pShopCat.includes('rest') || pShopBiz.includes('rest'))) {
      return true;
    }

    // 3. Keyword matching across product title, description, and shop title
    if (catConfig?.keywords && catConfig.keywords.length > 0) {
      const textToSearch = `${p.name} ${p.description || ''} ${p.shopName || ''} ${p.shopCategory || ''} ${p.shopBusinessType || ''}`.toLowerCase();
      return catConfig.keywords.some(kw => textToSearch.includes(kw.toLowerCase()));
    }

    return false;
  };

  // Dynamic Product count per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    MARKET_CATEGORIES.forEach(cat => {
      if (cat.id === 'all') return;
      counts[cat.id] = products.filter(p => matchesCategory(p, cat.id)).length;
    });
    return counts;
  }, [products]);

  // Filter and sort products with partial keyword search & relevance scoring
  const filteredAndSortedProducts = useMemo(() => {
    let list = [...products];

    // 1. Category Filter
    if (selectedCategory !== 'all') {
      list = list.filter(p => matchesCategory(p, selectedCategory));
    }

    // 2. In Stock Only Filter
    if (onlyAvailable) {
      list = list.filter(p => p.isAvailable);
    }

    // 3. Smart Search Query Filter with partial matching & score tracking
    const searchTrimmed = searchQuery.trim();
    let productScores = new Map<string, number>();

    if (searchTrimmed) {
      list = list.filter(p => {
        const { matches, score } = calculateProductRelevance(p, searchTrimmed);
        if (matches) {
          productScores.set(p.id, score);
          return true;
        }
        return false;
      });
    }

    // 4. Sorting with intelligent relevance fallback
    list.sort((a, b) => {
      // If user is searching and is on default 'newest' sort, rank by search relevance score first!
      if (searchTrimmed && sortBy === 'newest') {
        const scoreA = productScores.get(a.id) || 0;
        const scoreB = productScores.get(b.id) || 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
      }

      switch (sortBy) {
        case 'price_asc':
          return (a.originalPrice || 0) - (b.originalPrice || 0);
        case 'price_desc':
          return (b.originalPrice || 0) - (a.originalPrice || 0);
        case 'discount_desc': {
          const maxA = Math.max(a.goldDiscount || 0, a.silverDiscount || 0, a.bronzeDiscount || 0);
          const maxB = Math.max(b.goldDiscount || 0, b.silverDiscount || 0, b.bronzeDiscount || 0);
          return maxB - maxA;
        }
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '', 'bn');
        case 'newest':
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });

    return list;
  }, [products, selectedCategory, onlyAvailable, searchQuery, sortBy]);

  const handleBuyClick = (product: typeof products[0]) => {
    setSelectedProduct(product);
    setBuyModalOpen(true);
  };

  // Construct shop payload for Buy Modal from product metadata
  const shopPayloadForModal = selectedProduct ? {
    id: selectedProduct.shopId,
    name: selectedProduct.shopName || '',
    nameBn: selectedProduct.shopName || '',
    goldDiscount: selectedProduct.goldDiscount || 0,
    silverDiscount: selectedProduct.silverDiscount || 0,
    bronzeDiscount: selectedProduct.bronzeDiscount || 0
  } : null;

  const currentSortLabel = language === 'bn' 
    ? (SORT_OPTIONS.find(s => s.id === sortBy)?.labelBn || 'নতুন যুক্ত')
    : (SORT_OPTIONS.find(s => s.id === sortBy)?.labelEn || 'Newest');
  const selectedCatObj = MARKET_CATEGORIES.find(c => c.id === selectedCategory);

  return (
    <div className="w-full space-y-3.5 pb-24 select-none">
      {/* Ultra Compact Cave Market Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 rounded-xl sm:rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-white border border-emerald-500/30 shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="min-w-0">
            {/* Line 1: Title */}
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight flex items-center gap-1.5">
              <span>{t('market.title')}</span>
            </h2>
            {/* Line 2: Subtitle */}
            <p className="text-[11px] sm:text-xs text-slate-300/90 truncate mt-0.5 font-medium">
              {language === 'bn' ? 'নিষ্ঠা • স্বচ্ছতা • আমানদারিতা' : 'Sincerity • Transparency • Trustworthiness'}
            </p>
          </div>

          {/* Right: Cart Button */}
          <button
            id="market-cart-btn"
            onClick={() => setShowCartModal(true)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-lg transition shadow-md active:scale-95 cursor-pointer shrink-0"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{t('shop.cart')}</span>
            {cartCount > 0 && (
              <span className="w-4 h-4 bg-slate-950 text-amber-300 border border-amber-400/40 rounded-full text-[9px] flex items-center justify-center font-black">
                {language === 'bn' ? toBnNumber(cartCount) : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <AdBanner pageName="CAVE_MARKET" placementSlot="TOP" />

      {/* Market Mode Toggle */}
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 text-sm font-bold shadow-sm">
        <button
          onClick={() => setMarketType('NATIONWIDE')}
          className={`flex-1 py-2 text-center rounded-md transition-colors ${
            marketType === 'NATIONWIDE'
              ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer'
          }`}
        >
          {language === 'bn' ? 'নেশনওয়াইড (সারাদেশ)' : 'Nationwide Delivery'}
        </button>
        <button
          onClick={() => setMarketType('LOCAL')}
          className={`flex-1 py-2 text-center rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            marketType === 'LOCAL'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer'
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
          </span>
          {language === 'bn' ? 'লোকাল ডেলিভারি' : 'Local Delivery'}
        </button>
      </div>

      {/* Search & Sort Row */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Dynamic Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="market-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('market.searchPlaceholder')}
              className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title={language === 'bn' ? 'মুছুন' : 'Clear'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown Selector */}
          <div className="relative shrink-0">
            <button
              id="market-sort-dropdown-trigger"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="w-full sm:w-auto flex items-center justify-between gap-2 px-3 py-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800/80 transition cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-slate-400 font-normal">{language === 'bn' ? 'সর্ট:' : 'Sort:'}</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">{currentSortLabel}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Sort Menu Popup */}
            {showSortDropdown && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowSortDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-40 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    {language === 'bn' ? 'পণ্য সাজান' : 'Sort Products'}
                  </div>
                  {SORT_OPTIONS.map((opt, idx) => {
                    const isSelected = sortBy === opt.id;
                    return (
                      <button
                        key={`cmv-sort-${opt.id}-${idx}`}
                        id={`sort-option-${opt.id}`}
                        onClick={() => {
                          setSortBy(opt.id);
                          setShowSortDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition text-left cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{opt.icon}</span>
                          <span>{language === 'bn' ? opt.labelBn : opt.labelEn}</span>
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick Search Suggestions / Popular Keywords */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
          <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1 pl-1">
            <Tag className="w-3 h-3 text-amber-500" />
            {language === 'bn' ? 'জনপ্রিয় সার্চ:' : 'Popular Searches:'}
          </span>
          {POPULAR_SEARCH_TAGS.map((tag, idx) => {
            const tagLabel = language === 'bn' ? tag.labelBn : tag.labelEn;
            const isCurrent = searchQuery.trim().toLowerCase() === tagLabel.toLowerCase();
            return (
              <button
                key={`pop-search-tag-${tag.labelEn}-${idx}`}
                id={`quick-search-tag-${idx}`}
                onClick={() => {
                  if (isCurrent) {
                    setSearchQuery('');
                  } else {
                    setSearchQuery(tagLabel);
                  }
                }}
                className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold whitespace-nowrap transition cursor-pointer active:scale-95 flex items-center gap-1 ${
                  isCurrent
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/60 hover:border-amber-400/40 hover:text-amber-400'
                }`}
              >
                <span>{tag.icon}</span>
                <span>{tagLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Categories Scrollable Filter Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
            <span className="font-bold flex items-center gap-1">
              <Layers className="w-3 h-3 text-emerald-500" />
              {language === 'bn' ? 'ক্যাটাগরি অনুযায়ী ফিল্টার:' : 'Filter by Category:'}
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] hover:text-emerald-500 transition">
              <input
                type="checkbox"
                id="toggle-in-stock-only"
                checked={onlyAvailable}
                onChange={e => setOnlyAvailable(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 accent-emerald-600 cursor-pointer"
              />
              <span>
                {language === 'bn' 
                  ? `কেবল স্টকে আছে (${toBnNumber(products.filter(p => p.isAvailable).length)})` 
                  : `In Stock Only (${products.filter(p => p.isAvailable).length})`}
              </span>
            </label>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
            {MARKET_CATEGORIES.map((cat, idx) => {
              const isSelected = selectedCategory === cat.id;
              const count = categoryCounts[cat.id] || 0;

              return (
                <button
                  key={`cmv-cat-${cat.id}-${idx}`}
                  id={`market-cat-btn-${cat.id}`}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <span className="text-sm">{cat.icon}</span>
                  <span>{language === 'bn' ? cat.labelBn : cat.labelEn}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                      isSelected
                        ? 'bg-emerald-950/40 text-emerald-200'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {language === 'bn' ? toBnNumber(count) : count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Filter Tags & Quick Reset */}
        {(selectedCategory !== 'all' || searchQuery || onlyAvailable || sortBy !== 'newest') && (
          <div className="flex items-center gap-2 flex-wrap pt-0.5 text-xs">
            <span className="text-[11px] text-slate-400">{language === 'bn' ? 'ফিল্টার:' : 'Filters:'}</span>

            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                <span>{selectedCatObj?.icon} {language === 'bn' ? selectedCatObj?.labelBn : selectedCatObj?.labelEn}</span>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="hover:text-emerald-800 dark:hover:text-emerald-200 ml-0.5"
                  title={language === 'bn' ? 'মুছুন' : 'Clear'}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {onlyAvailable && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                <span>{language === 'bn' ? 'কেবল স্টকে আছে' : 'In Stock Only'}</span>
                <button
                  onClick={() => setOnlyAvailable(false)}
                  className="hover:text-emerald-800 dark:hover:text-emerald-200 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                <span>{language === 'bn' ? `সার্চ: "${searchQuery}"` : `Search: "${searchQuery}"`}</span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="hover:text-amber-800 dark:hover:text-amber-200 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
                setOnlyAvailable(false);
                setSortBy('newest');
              }}
              className="text-[11px] text-slate-400 hover:text-rose-500 underline ml-auto cursor-pointer"
            >
              {language === 'bn' ? 'সব ক্লিয়ার করুন' : 'Clear All'}
            </button>
          </div>
        )}

        {/* Found Results Count Indicator */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 pt-1">
          <span>
            {language === 'bn' ? (
              <>মোট <strong className="text-slate-900 dark:text-white font-bold">{toBnNumber(filteredAndSortedProducts.length)}</strong> টি পণ্য পাওয়া গেছে</>
            ) : (
              <>Total <strong className="text-slate-900 dark:text-white font-bold">{filteredAndSortedProducts.length}</strong> products found</>
            )}
          </span>
          {selectedCategory !== 'all' && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {language === 'bn' ? `${selectedCatObj?.labelBn} ক্যাটাগরি` : `${selectedCatObj?.labelEn} Category`}
            </span>
          )}
        </div>
      </div>

      <AdBanner pageName="CAVE_MARKET" placementSlot="BEFORE_PRODUCTS" />

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={`cm-skeleton-${i}`} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 animate-pulse space-y-2.5">
              <div className="w-full aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4"></div>
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2"></div>
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3"></div>
              <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-rose-100 dark:border-rose-900/40 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <p className="text-xs text-rose-700 dark:text-rose-400">{error}</p>
          <button
            onClick={fetchProducts}
            className="px-4 py-2 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-lg hover:bg-rose-100 transition cursor-pointer"
          >
            {language === 'bn' ? 'আবার চেষ্টা করুন' : 'Try Again'}
          </button>
        </div>
      ) : filteredAndSortedProducts.length === 0 ? (
        <div className="p-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {language === 'bn' ? 'কোনো পণ্য পাওয়া যায়নি' : 'No products found'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {selectedCategory !== 'all'
                ? (language === 'bn' 
                    ? `"${selectedCatObj?.labelBn}" ক্যাটাগরিতে এই মুহূর্তে কোনো পণ্য পাওয়া যায়নি।`
                    : `No products currently available in "${selectedCatObj?.labelEn}".`)
                : (language === 'bn' 
                    ? 'আপনার ফিল্টার বা সার্চ করা কিওয়ার্ডের সাথে কোনো পণ্য মেলেনি।'
                    : 'No products matched your search or filters.')}
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
              setOnlyAvailable(false);
            }}
            className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 transition cursor-pointer"
          >
            {language === 'bn' ? 'সকল পণ্য দেখুন' : 'View All Products'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredAndSortedProducts.map((product, idx) => {
            const isAvailable = product.isAvailable;
            const maxDiscount = Math.max(product.goldDiscount || 0, product.silverDiscount || 0, product.bronzeDiscount || 0);

            return (
              <motion.div
                key={`cmv-prod-${product.id || 'p'}-${idx}`}
                layout
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition duration-200 overflow-hidden flex flex-col justify-between h-[240px]"
              >
                <div onClick={() => handleProductClick(product)} className="cursor-pointer group">
                  {/* Product Image */}
                  <div className="relative w-full h-[120px] bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                    )}

                    {/* Shop Name Label Overlay */}
                    <div className="absolute top-2 left-2 max-w-[70%]">
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-900/85 backdrop-blur-xs text-white text-[9px] font-extrabold rounded-md truncate shadow-sm">
                        <Store className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                        <span className="truncate">{product.shopName || (language === 'bn' ? 'পার্টনার শপ' : 'Partner Shop')}</span>
                      </span>
                    </div>

                    {/* Availability Tag */}
                    <div className="absolute top-2 right-2">
                      <span
                        className={`inline-block px-1.5 py-0.5 text-[9px] font-black rounded-md shadow-xs ${
                          isAvailable
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-700 text-slate-200'
                        }`}
                      >
                        {isAvailable 
                          ? (language === 'bn' ? 'উপলব্ধ' : 'In Stock') 
                          : (language === 'bn' ? 'অনুপলব্ধ' : 'Out of Stock')}
                      </span>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="p-2 space-y-0.5">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1 leading-snug group-hover:text-emerald-600 transition-colors">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400">
                        ৳{language === 'bn' ? Number(product.originalPrice || 0).toLocaleString('bn-BD') : Number(product.originalPrice || 0).toLocaleString()}
                      </span>
                      {maxDiscount > 0 && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 rounded-md animate-pulse">
                          <Award className="w-2.5 h-2.5 text-amber-500" />
                          <span className="text-[8px] font-black text-amber-600 dark:text-amber-400">
                            {language === 'bn' 
                              ? `সর্বোচ্চ ${toBnNumber(maxDiscount)}% টোকেন ছাড় প্রযোজ্য` 
                              : `Up to ${maxDiscount}% Token Discount`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Compact Action Footer */}
                <div className="p-2">
                  <button
                    disabled={!isAvailable}
                    onClick={() => handleBuyClick(product)}
                    className="w-full py-1 px-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 shadow-xs active:scale-95 cursor-pointer"
                  >
                    {isAvailable 
                      ? (language === 'bn' ? 'কিনুন' : 'Buy') 
                      : (language === 'bn' ? 'অনুপলব্ধ' : 'Out of Stock')}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AdBanner pageName="CAVE_MARKET" placementSlot="BOTTOM" />

      {/* Shared Buy & Token Modal */}
      <ProductBuyModal
        isOpen={buyModalOpen}
        product={selectedProduct}
        shop={shopPayloadForModal}
        onClose={() => setBuyModalOpen(false)}
        onAddToCartSuccess={fetchCartCount}
        onOpenCart={() => {
          setBuyModalOpen(false);
          setShowCartModal(true);
        }}
      />

      {/* Cart Modal */}
      <CartModal
        isOpen={showCartModal}
        defaultOrderType={marketType}
        onClose={() => {
          setShowCartModal(false);
          fetchCartCount();
        }}
        user={user || null}
        onOrderSuccess={() => {
          fetchCartCount();
        }}
        onNavigateToOrders={() => {
          setShowCartModal(false);
          setShowOrdersModal(true);
        }}
      />

      {/* Product Details & Reviews Modal */}
      <ProductDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        product={detailsProduct}
        currentUser={user || null}
        onShowToast={(type, title, message) => {
          // Toast handler if needed or propagate up if available
          console.log(`[Toast ${type}] ${title}: ${message}`);
        }}
        onBuyClick={(prod) => {
          setSelectedProduct(prod);
          setBuyModalOpen(true);
        }}
      />

      {/* My Orders Modal */}
      <MyOrdersModal
        isOpen={showOrdersModal}
        onClose={() => setShowOrdersModal(false)}
      />
    </div>
  );
};
