import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Store,
  Search,
  MapPin,
  Clock,
  Phone,
  Tag,
  Percent,
  Sparkles,
  Navigation,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Receipt,
  Filter,
  ArrowUpRight,
  UserCheck,
  Building2,
  Layers,
  ShoppingBag,
  ShoppingCart,
  AlertCircle,
  X,
  RotateCw,
  Compass,
  Info,
  HelpCircle,
  Star,
  MessageSquare
} from 'lucide-react';
import { api } from '../services/api';
import { PartnerShop, UserToken, UserRedemptionRecord, User } from '../types';
import { toBnNumber } from '../data/prayerConfig';
import { ShopRedemptionModal } from './ShopRedemptionModal';
import { RedemptionHistoryModal } from './RedemptionHistoryModal';
import { ShopLocationModal } from './ShopLocationModal';
import { ShopProductsView } from './ShopProductsView';
import { CartModal } from './CartModal';
import { MyOrdersModal } from './MyOrdersModal';
import { ShopReviewsModal } from './ShopReviewsModal';
import { normalizeSearchText } from '../utils/marketSearch';
import { useLanguage } from '../context/LanguageContext';

interface ShopsViewProps {
  user?: User | null;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  onNavigateToTokens?: () => void;
  onNavigateToMerchant?: () => void;
}

const CATEGORIES = [
  { id: 'all', labelBn: 'সকল দোকান', labelEn: 'All Shops', icon: '🏪' },
  { id: 'books', labelBn: 'বই ও ইসলামিক সামগ্রী', labelEn: 'Books & Islamic', icon: '📚' },
  { id: 'food', labelBn: 'খাবার ও রেস্তোরাঁ', labelEn: 'Food & Restaurants', icon: '🍲' },
  { id: 'grocery', labelBn: 'সুপারশপ ও গ্রোসারি', labelEn: 'Grocery & Supermarket', icon: '🛒' },
  { id: 'fashion', labelBn: 'পোশাক ও ফ্যাশন', labelEn: 'Clothing & Fashion', icon: '👕' },
  { id: 'health', labelBn: 'ফার্মেসি ও হেলথ', labelEn: 'Pharmacy & Health', icon: '💊' },
  { id: 'electronics', labelBn: 'ইলেকট্রনিক্স', labelEn: 'Electronics', icon: '📱' },
  { id: 'beauty', labelBn: 'বিউটি ও সেলুন', labelEn: 'Beauty & Salon', icon: '💇' },
  { id: 'service', labelBn: 'সেবা খাত', labelEn: 'Services', icon: '🔧' }
];

const RADIUS_OPTIONS: Array<{ id: number | 'all'; labelBn: string; labelEn: string }> = [
  { id: 5, labelBn: '৫ কিমি', labelEn: '5 km' },
  { id: 10, labelBn: '১০ কিমি', labelEn: '10 km' },
  { id: 20, labelBn: '২০ কিমি', labelEn: '20 km' },
  { id: 50, labelBn: '৫০ কিমি', labelEn: '50 km' },
  { id: 'all', labelBn: 'সকল দূরত্ব', labelEn: 'All Distances' }
];

export const ShopsView: React.FC<ShopsViewProps> = ({
  user,
  onShowToast,
  onNavigateToTokens,
  onNavigateToMerchant
}) => {
  const { t, language } = useLanguage();
  const [shops, setShops] = useState<PartnerShop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Location / Nearby state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isNearbyActive, setIsNearbyActive] = useState(false);
  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number | 'all'>(10);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationError, setLocationError] = useState<{
    title: string;
    message: string;
    resolution?: string;
    code?: number;
  } | null>(null);
  const [hasPermissionDenied, setHasPermissionDenied] = useState(false);

  // User Tokens for redemption
  const [availableTokens, setAvailableTokens] = useState<UserToken[]>([]);
  const [canRedeemToday, setCanRedeemToday] = useState(true);
  const [dailyWarning, setDailyWarning] = useState<string | null>(null);

  // Marketplace & Shopping Modals
  const [selectedShopForProducts, setSelectedShopForProducts] = useState<string | null>(null);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);

  // Modals
  const [selectedShopForRedeem, setSelectedShopForRedeem] = useState<PartnerShop | null>(null);
  const [selectedShopForMap, setSelectedShopForMap] = useState<PartnerShop | null>(null);
  const [selectedShopForReviews, setSelectedShopForReviews] = useState<PartnerShop | null>(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const fetchCartCount = useCallback(async () => {
    try {
      const res = await api.getCart();
      if (res.success && res.cart) {
        setCartItemCount(res.cart.totalQuantity || (res.cart.items ? res.cart.items.length : 0));
      }
    } catch {
      // ignore non-logged in or offline error
    }
  }, []);

  useEffect(() => {
    fetchCartCount();
  }, [fetchCartCount]);

  // Haversine distance formula (in km)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Format distance helper
  const formatDistance = (distKm: number | undefined): string => {
    if (distKm === undefined || isNaN(distKm)) return '';
    if (distKm < 1) {
      const meters = Math.max(10, Math.round(distKm * 1000));
      return language === 'bn' ? `${toBnNumber(meters)} মিটার দূরে` : `${meters}m away`;
    }
    return language === 'bn' ? `${toBnNumber(distKm.toFixed(1))} কিমি দূরে` : `${distKm.toFixed(1)} km away`;
  };

  // Request browser geolocation with proper error & permission handling
  const requestUserLocation = useCallback((silent = false) => {
    if (!navigator.geolocation) {
      const err = {
        title: language === 'bn' ? 'লোকেশন অসমর্থিত' : 'Location Unsupported',
        message: language === 'bn' ? 'আপনার ডিভাইস বা ব্রাউজার লোকেশন সেবা সমর্থন করে না।' : 'Your device or browser does not support location services.'
      };
      setLocationError(err);
      if (!silent) onShowToast?.('error', err.title, err.message);
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        if (
          typeof latitude !== 'number' ||
          isNaN(latitude) ||
          typeof longitude !== 'number' ||
          isNaN(longitude) ||
          (latitude === 0 && longitude === 0)
        ) {
          setIsLocating(false);
          setLocationError({
            title: language === 'bn' ? 'ভুল অবস্থান' : 'Invalid Location',
            message: language === 'bn' ? 'ডিভাইস থেকে সঠিক জিপিএস স্থানাঙ্ক পাওয়া যায়নি।' : 'Accurate GPS coordinates could not be retrieved from the device.'
          });
          return;
        }

        const coords = { lat: latitude, lng: longitude, accuracy };
        setUserLocation(coords);
        setIsNearbyActive(true);
        setIsLocating(false);
        setLocationError(null);
        setHasPermissionDenied(false);
        setShowLocationModal(false);

        if (!silent) {
          onShowToast?.(
            'success',
            language === 'bn' ? 'লোকেশন প্রাপ্ত' : 'Location Acquired',
            language === 'bn' ? 'আপনার কাছাকাছি পার্টনার শপ তালিকা সাজানো হয়েছে।' : 'Nearby partner shops have been listed.'
          );
        }
      },
      (err) => {
        console.warn('[ShopsView:GeolocationError]', err);
        setIsLocating(false);

        let errObj = {
          title: language === 'bn' ? 'লোকেশন ত্রুটি' : 'Location Error',
          message: language === 'bn' ? 'আপনার অবস্থান নির্ধারণ করা সম্ভব হয়নি।' : 'Unable to determine your location.',
          resolution: language === 'bn' ? 'অনুগ্রহ করে আবার চেষ্টা করুন।' : 'Please try again.',
          code: err.code
        };

        if (err.code === 1) {
          // PERMISSION_DENIED
          setHasPermissionDenied(true);
          errObj = {
            title: language === 'bn' ? 'লোকেশন অনুমতি ব্লক করা আছে' : 'Location Permission Denied',
            message: language === 'bn' ? 'লোকেশন অনুমতি না দিলে আপনার কাছাকাছি দোকান দেখানো সম্ভব নয়।' : 'Without location permission, nearby shops cannot be displayed.',
            resolution: language === 'bn' ? 'আপনার ব্রাউজারের অ্যাড্রেস বারের বাম পাশে তালা 🔒 আইকনে ট্যাপ করে "Permissions" বা "Location" থেকে "Allow" করুন এবং পুনরায় চেষ্টা করুন।' : 'Tap the lock 🔒 icon in the browser address bar, set Location to "Allow", and try again.',
            code: 1
          };
        } else if (err.code === 2) {
          // POSITION_UNAVAILABLE
          errObj = {
            title: language === 'bn' ? 'জিপিএস / লোকেশন পাওয়া যায়নি' : 'GPS / Location Unavailable',
            message: language === 'bn' ? 'আপনার ডিভাইসের লোকেশন সার্ভিস (GPS) বন্ধ থাকতে পারে।' : 'Location service (GPS) on your device may be disabled.',
            resolution: language === 'bn' ? 'অনুগ্রহ করে ফোনের Quick Settings বা Settings থেকে Location / GPS চালু করুন এবং আবার চেষ্টা করুন।' : 'Please enable Location / GPS in your device Quick Settings and try again.',
            code: 2
          };
        } else if (err.code === 3) {
          // TIMEOUT
          errObj = {
            title: language === 'bn' ? 'লোকেশন টাইমআউট' : 'Location Timeout',
            message: language === 'bn' ? 'লোকেশন সিগন্যাল পেতে সময় বেশি লেগেছে।' : 'Timed out while acquiring location signal.',
            resolution: language === 'bn' ? 'দুর্বল জিপিএস সিগন্যাল বা নেটওয়ার্ক সমস্যা হতে পারে। অনুগ্রহ করে আবার চেষ্টা করুন।' : 'Weak GPS or network signal. Please try again.',
            code: 3
          };
        }

        setLocationError(errObj);
        if (!silent) {
          onShowToast?.('error', errObj.title, errObj.message);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      }
    );
  }, [onShowToast, language]);

  // Handle click on "আমার আশে পাশের দোকান"
  const handleToggleNearby = () => {
    if (isNearbyActive) {
      // Toggle off
      setIsNearbyActive(false);
      return;
    }

    if (userLocation) {
      // Already have location, just activate
      setIsNearbyActive(true);
      setLocationError(null);
      return;
    }

    // Check if permission is already known to be denied
    if (hasPermissionDenied) {
      requestUserLocation(false);
      return;
    }

    // Show friendly explanation modal
    setShowLocationModal(true);
  };

  // Fetch tokens to know if user can redeem & what tokens they have
  const fetchUserTokens = useCallback(async () => {
    try {
      const data = await api.getMyTokens();
      if (data.success) {
        setAvailableTokens(data.availableTokens || []);
        setCanRedeemToday(data.canRedeemToday);
        setDailyWarning(data.dailyRedeemWarning || null);
      }
    } catch (err) {
      console.error('Error fetching user tokens in ShopsView:', err);
    }
  }, []);

  // Fetch shops from backend
  const fetchShops = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getShops({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchQuery.trim() || undefined,
        lat: userLocation?.lat,
        lng: userLocation?.lng
      });
      
      if (data.success) {
        setShops(data.shops || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch shops:', err);
      if (onShowToast) {
        onShowToast('error', 'ত্রুটি', err.message || 'দোকান তালিকা লোড করা যায়নি।');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, searchQuery, userLocation, onShowToast]);

  useEffect(() => {
    fetchUserTokens();
  }, [fetchUserTokens]);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  useEffect(() => {
    const handleHashShop = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#shop-')) {
        const shopId = hash.replace('#shop-', '').trim();
        if (shopId && shopId !== 'undefined' && shopId !== 'null') {
          setSelectedShopForProducts(shopId);
        }
      }
    };
    
    window.addEventListener('hashchange', handleHashShop);
    handleHashShop();
    
    return () => {
      window.removeEventListener('hashchange', handleHashShop);
    };
  }, []);

  // Compute derived sorted and distance-annotated shops
  const processedShops = useMemo(() => {
    if (!shops) return [];

    // 1. Calculate live distances if userLocation is available
    const shopsWithDist = shops.map((shop, idx) => {
      let calcDist = shop.distanceKm;
      if (userLocation && shop.latitude && shop.longitude && (shop.latitude !== 0 || shop.longitude !== 0)) {
        const d = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          shop.latitude,
          shop.longitude
        );
        calcDist = Math.round(d * 10) / 10;
      }
      return { ...shop, distanceKm: calcDist };
    });

    // 2. Sort by distance if nearby mode or user location is available
    if (userLocation || isNearbyActive) {
      shopsWithDist.sort((a, b) => {
        if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
          return a.distanceKm - b.distanceKm;
        }
        if (a.distanceKm !== undefined) return -1;
        if (b.distanceKm !== undefined) return 1;
        return (a.nameBn || a.name).localeCompare(b.nameBn || b.name);
      });
    }

    return shopsWithDist;
  }, [shops, userLocation, isNearbyActive]);

  // Apply search, category, and radius filters
  const filteredShops = useMemo(() => {
    let list = processedShops;

    // Radius filter (when Nearby mode is active)
    if (isNearbyActive && selectedRadiusKm !== 'all') {
      list = list.filter(
        (shop) => shop.distanceKm !== undefined && shop.distanceKm <= selectedRadiusKm
      );
    }

    // Search query filter with forgiving Bangla normalization
    if (searchQuery.trim()) {
      const terms = normalizeSearchText(searchQuery).split(' ').filter(Boolean);

      list = list.filter((shop) => {
        const combined = normalizeSearchText(
          [
            shop.name,
            shop.nameBn,
            shop.category,
            shop.businessType,
            shop.district,
            shop.upazilaThana,
            shop.upazila,
            shop.area,
            shop.address,
            shop.locationAddress,
            shop.description
          ]
            .filter(Boolean)
            .join(' ')
        );
        return terms.every((term) => combined.includes(term));
      });
    }

    return list;
  }, [processedShops, isNearbyActive, selectedRadiusKm, searchQuery]);

  const handleOpenRedeemModal = (shop: PartnerShop) => {
    if (availableTokens.length === 0) {
      if (onShowToast) {
        onShowToast(
          'info',
          language === 'bn' ? 'টোকেন প্রয়োজন' : 'Token Required',
          language === 'bn' ? 'আপনার কোনো ব্যবহারযোগ্য টোকেন নেই। নামাজ সম্পন্ন করে টোকেন অর্জন করুন।' : 'You do not have any usable tokens. Perform prayers to earn tokens.'
        );
      }
      return;
    }

    setSelectedShopForRedeem(shop);
    setShowRedeemModal(true);
  };

  const handleRedemptionSuccess = (redemption: UserRedemptionRecord) => {
    fetchUserTokens();
  };

  if (selectedShopForProducts) {
    return (
      <div className="space-y-4 pb-12">
        <ShopProductsView
          shopId={selectedShopForProducts}
          onBack={() => {
            setSelectedShopForProducts(null);
            if (window.location.hash.startsWith('#shop-')) {
              try {
                window.history.replaceState(null, '', window.location.pathname + '#shops');
              } catch (_) {}
            }
          }}
          onOpenCart={() => setShowCartModal(true)}
          cartCount={cartItemCount}
          currentUser={user}
          onShowToast={onShowToast}
        />
        <CartModal
          isOpen={showCartModal}
          onClose={() => {
            setShowCartModal(false);
            fetchCartCount();
          }}
          user={user || null}
          onOrderSuccess={() => {
            fetchCartCount();
            fetchUserTokens();
          }}
          onNavigateToOrders={() => {
            setShowCartModal(false);
            setShowOrdersModal(true);
          }}
        />
        <MyOrdersModal
          isOpen={showOrdersModal}
          onClose={() => setShowOrdersModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-12">
      {/* Top Banner & Quick Controls */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {language === 'bn' ? 'পার্টনার শপ ও অনলাইন মার্কেটপ্লেস' : 'Partner Shops & Online Marketplace'}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
                {language === 'bn' ? 'তাকওয়া • সততা • সত্যবাদিতা' : 'Taqwa • Honesty • Truthfulness'}
              </p>
            </div>

            {/* Quick Action Badges */}
            <div className="flex flex-nowrap items-center gap-2 shrink-0 overflow-x-auto pb-1 no-scrollbar">
              <button
                id="my-cart-shortcut-btn"
                type="button"
                onClick={() => setShowCartModal(true)}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'আমার কার্ট' : 'My Cart'}</span>
                {cartItemCount > 0 && (
                  <span className="w-4 h-4 bg-white text-emerald-700 rounded-full text-[9px] flex items-center justify-center font-extrabold shadow-xs">
                    {cartItemCount}
                  </span>
                )}
              </button>

              <button
                id="my-orders-shortcut-btn"
                type="button"
                onClick={() => setShowOrdersModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'bn' ? 'আমার অর্ডার' : 'My Orders'}</span>
              </button>

              <button
                id="my-redemption-history-btn"
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'bn' ? 'আমার রিডেম্পশন' : 'My Redemptions'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Location Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="shop-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'bn' ? 'দোকানের নাম, এলাকা বা ক্যাটাগরি অনুসন্ধান করুন...' : 'Search by shop name, area, or category...'}
            className="w-full pl-9 pr-4 py-2 rounded-xl sm:rounded-2xl bg-slate-900/90 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              {language === 'bn' ? 'মুছুন' : 'Clear'}
            </button>
          )}
        </div>

        {/* Nearby / Location Toggle Button */}
        <button
          id="nearby-shops-btn"
          type="button"
          onClick={handleToggleNearby}
          disabled={isLocating}
          className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl sm:rounded-2xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
            isNearbyActive && userLocation
              ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/60 shadow-lg shadow-emerald-950/40'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-emerald-500/40'
          }`}
          title={language === 'bn' ? 'আপনার কাছাকাছি পার্টনার শপ খুঁজে পেতে ক্লিক করুন' : 'Click to find partner shops near you'}
        >
          <Navigation
            className={`w-3.5 h-3.5 ${
              isLocating ? 'animate-spin text-emerald-400' : isNearbyActive ? 'text-emerald-300 fill-emerald-400/20' : 'text-emerald-400'
            }`}
          />
          <span>
            {isLocating
              ? (language === 'bn' ? 'লোকেশন খোঁজা হচ্ছে...' : 'Finding location...')
              : isNearbyActive && userLocation
              ? (language === 'bn'
                  ? `নিকটবর্তী (${toBnNumber(selectedRadiusKm === 'all' ? 'সব' : selectedRadiusKm)} কিমি)`
                  : `Nearby (${selectedRadiusKm === 'all' ? 'All' : selectedRadiusKm} km)`)
              : (language === 'bn' ? 'আমার আশেপাশের দোকান' : 'Nearby Shops')}
          </span>
        </button>
      </div>

      {/* Active Nearby Mode Dashboard Bar */}
      {isNearbyActive && userLocation && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 shadow-inner flex flex-col md:flex-row md:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 text-xs text-emerald-300">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="font-extrabold text-white">
                {language === 'bn' ? 'আমার আশেপাশের দোকান সক্রিয়' : 'Nearby Shops Active'}
              </span>
              <p className="text-[11px] text-emerald-400/80">
                {language === 'bn' ? 'আপনার নিকটবর্তী দূরত্ব অনুসারে দোকানসমূহ তালিকাভুক্ত করা হয়েছে।' : 'Shops listed according to distance from your location.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 shrink-0">
              {language === 'bn' ? 'দূরত্ব ফিল্টার:' : 'Radius Filter:'}
            </span>
            <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-emerald-900/50">
              {RADIUS_OPTIONS.map((opt, idx) => {
                const isSelected = selectedRadiusKm === opt.id;
                return (
                  <button
                    key={`radius-opt-${opt.id}-${idx}`}
                    type="button"
                    onClick={() => setSelectedRadiusKm(opt.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {language === 'bn' ? opt.labelBn : opt.labelEn}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => requestUserLocation(false)}
              disabled={isLocating}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors flex items-center justify-center cursor-pointer active:scale-95"
              title={language === 'bn' ? 'বর্তমান লোকেশন রিফ্রেশ করুন' : 'Refresh current location'}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setIsNearbyActive(false)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs transition-colors flex items-center justify-center cursor-pointer active:scale-95"
              title={language === 'bn' ? 'নিকটবর্তী ফিল্টার বন্ধ করুন' : 'Close nearby filter'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Location Error Message */}
      {locationError && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs sm:text-sm space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-extrabold text-amber-200 text-sm">
                  {locationError.title}
                </h4>
                <p className="text-xs text-amber-300/90 leading-relaxed">
                  {locationError.message}
                </p>
                {locationError.resolution && (
                  <p className="text-[11px] text-amber-400/80 bg-amber-950/60 p-2 rounded-xl border border-amber-700/40 mt-1.5">
                    💡 <b>{language === 'bn' ? 'পরামর্শ:' : 'Tip:'}</b> {locationError.resolution}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => requestUserLocation(false)}
                disabled={isLocating}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-colors whitespace-nowrap cursor-pointer active:scale-95"
              >
                {isLocating ? (language === 'bn' ? 'খোঁজা হচ্ছে...' : 'Locating...') : (language === 'bn' ? 'আবার চেষ্টা করুন' : 'Try Again')}
              </button>
              <button
                type="button"
                onClick={() => setLocationError(null)}
                className="p-1.5 text-amber-400/70 hover:text-amber-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Pills & Quick Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat, idx) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={`shop-cat-${cat.id}-${idx}`}
              id={`cat-filter-${cat.id}`}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800/80'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{language === 'bn' ? cat.labelBn : cat.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Shops List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-400">
              {language === 'bn' ? 'দোকান তালিকা লোড হচ্ছে...' : 'Loading shops...'}
            </p>
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto text-2xl">
              {isNearbyActive ? '📍' : '🔍'}
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-bold text-white">
                {isNearbyActive && selectedRadiusKm !== 'all'
                  ? (language === 'bn'
                      ? `আপনার ${toBnNumber(selectedRadiusKm)} কিমি দূরত্বের মধ্যে কোনো পার্টনার শপ পাওয়া যায়নি`
                      : `No partner shops found within ${selectedRadiusKm} km`)
                  : (language === 'bn' ? 'কোনো পার্টনার শপ পাওয়া যায়নি' : 'No partner shops found')}
              </h3>
              <p className="text-xs text-slate-400">
                {isNearbyActive && selectedRadiusKm !== 'all'
                  ? (language === 'bn'
                      ? 'ব্যাসার্ধ বাড়িয়ে সকল দূরত্বের পার্টনার শপ দেখতে পারেন অথবা অন্য ক্যাটাগরি নির্বাচন করুন।'
                      : 'Increase the radius to see all shops or choose another category.')
                  : (language === 'bn'
                      ? 'অনুগ্রহ করে অন্য নাম দিয়ে অনুসন্ধান করুন অথবা ক্যাটাগরি ফিল্টার পরিবর্তন করুন।'
                      : 'Please search with a different keyword or change category filters.')}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
              {isNearbyActive && selectedRadiusKm !== 'all' && (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedRadiusKm(50)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {language === 'bn' ? '৫০ কিমি ব্যাসার্ধ দেখুন' : 'View 50 km Radius'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRadiusKm('all')}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {language === 'bn' ? 'সকল দূরত্বের দোকান দেখুন' : 'View All Distances'}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setIsNearbyActive(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
              >
                {language === 'bn' ? 'ফিল্টার রিসেট করুন' : 'Reset Filters'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {filteredShops.map((shop, idx) => (
              <motion.div
                key={`shop-${shop.id || 'sh'}-${idx}`}
                id={`shop-card-${shop.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-emerald-500/40 transition-all shadow-md flex flex-col justify-between gap-2 relative overflow-hidden group hover:bg-slate-900"
              >
                {/* Top Section: Header & Badges */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {(() => {
                            const catObj = CATEGORIES.find((c) => c.id === shop.category?.toLowerCase());
                            return language === 'bn' ? (catObj?.labelBn || shop.category.toUpperCase()) : (catObj?.labelEn || shop.category.toUpperCase());
                          })()}
                        </span>
                        {shop.distanceKm !== undefined && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 flex items-center gap-0.5 shadow-xs">
                            <Navigation className="w-2.5 h-2.5 text-emerald-400" />
                            <span>{formatDistance(shop.distanceKm)}</span>
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/50 flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          <span>{language === 'bn' ? 'ভেরিফাইড পার্টনার' : 'Verified Partner'}</span>
                        </span>

                        {/* Rating Badge */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedShopForReviews(shop);
                          }}
                          className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 transition-colors cursor-pointer ml-auto"
                          title={language === 'bn' ? 'গ্রাহক রিভিউ ও রেটিং দেখুন' : 'View customer reviews & rating'}
                        >
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          <span>
                            {shop.averageRating && shop.averageRating > 0
                              ? (language === 'bn' ? toBnNumber(shop.averageRating.toFixed(1)) : shop.averageRating.toFixed(1))
                              : (language === 'bn' ? toBnNumber('৫.০') : '5.0')}
                          </span>
                          <span className="text-[8px] text-slate-400">
                            ({language === 'bn' ? toBnNumber(shop.totalReviews || 0) : (shop.totalReviews || 0)})
                          </span>
                        </button>
                      </div>

                      <h3 className="text-sm sm:text-base font-extrabold text-white group-hover:text-emerald-300 transition-colors leading-tight truncate">
                        {language === 'bn' ? (shop.nameBn || shop.name) : (shop.name || shop.nameBn)}
                      </h3>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">
                          {[shop.address, shop.upazilaThana || shop.upazila || shop.area, shop.district]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </p>
                    </div>

                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-base shadow-inner">
                      🏪
                    </div>
                  </div>

                  {shop.description && (
                    <p className="text-[10px] text-slate-300/90 leading-tight line-clamp-1">
                      {shop.description}
                    </p>
                  )}

                  {/* Space-Efficient Grouped Tokens Container */}
                  <div className="p-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 shrink-0">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>{language === 'bn' ? 'টোকেন ছাড়:' : 'Token Discounts:'}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap ml-auto">
                      <div className="px-1.5 py-0.5 rounded-md bg-amber-950/60 border border-amber-500/40 text-[10px] font-extrabold text-amber-300 flex items-center gap-0.5 shadow-xs">
                        <span>🥇</span>
                        <span className="text-[9px] text-amber-400/80 font-normal">{language === 'bn' ? 'গোল্ড' : 'Gold'}</span>
                        <span>{language === 'bn' ? toBnNumber(shop.goldDiscount) : shop.goldDiscount}%</span>
                      </div>
                      <div className="px-1.5 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-[10px] font-extrabold text-slate-200 flex items-center gap-0.5 shadow-xs">
                        <span>🥈</span>
                        <span className="text-[9px] text-slate-400 font-normal">{language === 'bn' ? 'সিলভার' : 'Silver'}</span>
                        <span>{language === 'bn' ? toBnNumber(shop.silverDiscount) : shop.silverDiscount}%</span>
                      </div>
                      <div className="px-1.5 py-0.5 rounded-md bg-amber-900/40 border border-amber-700/50 text-[10px] font-extrabold text-orange-300 flex items-center gap-0.5 shadow-xs">
                        <span>🥉</span>
                        <span className="text-[9px] text-orange-400/80 font-normal">{language === 'bn' ? 'ব্রোঞ্জ' : 'Bronze'}</span>
                        <span>{language === 'bn' ? toBnNumber(shop.bronzeDiscount) : shop.bronzeDiscount}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Info Meta & Compact Action Bar */}
                <div className="space-y-2 pt-1.5 border-t border-slate-800/70">
                  <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 truncate">
                      <Clock className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                      <span className="truncate">{shop.openingHours}</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[9px] text-slate-500 shrink-0">
                      <Phone className="w-2.5 h-2.5 text-slate-600" />
                      <span>{shop.phone}</span>
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {/* Primary Button: আমাদের পণ্য */}
                    <button
                      id={`view-products-btn-${shop.id}`}
                      type="button"
                      onClick={() => setSelectedShopForProducts(shop.id)}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-black shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title={language === 'bn' ? 'এই দোকানের পণ্যসমূহ দেখুন ও অনলাইন অর্ডার করুন' : 'View products and order online'}
                    >
                      <ShoppingBag className="w-3 h-3 text-white" />
                      <span>{language === 'bn' ? 'আমাদের পণ্য' : 'Our Products'}</span>
                    </button>

                    {/* Secondary Button: টোকেন ছাড় (In-Store QR) */}
                    <button
                      id={`use-token-btn-${shop.id}`}
                      type="button"
                      onClick={() => handleOpenRedeemModal(shop)}
                      className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                      title={language === 'bn' ? 'দোকানে সরাসরি টোকেন স্ক্যান করে ডিসকাউন্ট নিন' : 'Scan token in-store for discount'}
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>{language === 'bn' ? 'টোকেন ছাড়' : 'Token Discount'}</span>
                    </button>

                    {/* Map Button */}
                    <button
                      id={`view-map-btn-${shop.id}`}
                      type="button"
                      onClick={() => setSelectedShopForMap(shop)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs transition-all flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
                      title={language === 'bn' ? 'ম্যাপে দোকানের অবস্থান ও রুট দেখুন' : 'View shop location & route on map'}
                    >
                      <MapPin className="w-3 h-3 text-emerald-400" />
                    </button>

                    {/* Reviews Button */}
                    <button
                      id={`view-reviews-btn-${shop.id}`}
                      type="button"
                      onClick={() => setSelectedShopForReviews(shop)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700/80 text-xs transition-all flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
                      title={language === 'bn' ? 'গ্রাহকদের মতামত ও রিভিউ দেখুন' : 'View customer reviews & ratings'}
                    >
                      <MessageSquare className="w-3 h-3 text-amber-400" />
                    </button>

                    {/* Directions Button */}
                    <button
                      id={`get-directions-btn-${shop.id}`}
                      type="button"
                      onClick={() => {
                        if (shop.latitude && shop.longitude && (shop.latitude !== 0 || shop.longitude !== 0)) {
                          window.open(
                            `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}&travelmode=driving`,
                            '_blank',
                            'noopener,noreferrer'
                          );
                        } else {
                          const q = encodeURIComponent(`${shop.name} ${shop.address} ${shop.area} Bangladesh`);
                          window.open(
                            `https://www.google.com/maps/search/?api=1&query=${q}`,
                            '_blank',
                            'noopener,noreferrer'
                          );
                        }
                      }}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs transition-all flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
                      title={language === 'bn' ? 'গুগল ম্যাপে দিকনির্দেশনা নিন' : 'Get directions on Google Maps'}
                    >
                      <Navigation className="w-3 h-3 text-sky-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Location Permission Explanation & Prompt Modal */}
      <AnimatePresence>
        {showLocationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl text-emerald-400">
                  📍
                </div>
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-white">
                  {language === 'bn' ? 'আপনার কাছাকাছি দোকান খুঁজুন' : 'Find Shops Near You'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {language === 'bn'
                    ? 'আপনার বর্তমান অবস্থান ব্যবহার করে সবচেয়ে নিকটস্থ অনুমোদিত পার্টনার শপ, টোকেন ছাড় ও আনুমানিক দূরত্ব ক্রমানুসারে প্রদর্শন করা হবে।'
                    : 'Using your current location, partner shops, token discounts, and estimated distances will be displayed nearest to furthest.'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  {language === 'bn'
                    ? 'আপনার লোকেশন শুধুমাত্র দূরত্ব হিসেবের জন্য ব্রাউজারে সাময়িকভাবে ব্যবহৃত হবে। কোনো তথ্য স্থায়ীভাবে সংরক্ষণ করা হয় না।'
                    : 'Your location is used temporarily in your browser only to calculate distances. No data is stored permanently.'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => requestUserLocation(false)}
                  disabled={isLocating}
                  className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>
                    {isLocating
                      ? (language === 'bn' ? 'অনুমতি নেওয়া হচ্ছে...' : 'Requesting permission...')
                      : (language === 'bn' ? 'লোকেশন অনুমতি দিন ও দোকান দেখুন' : 'Allow Location & View Shops')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  {language === 'bn' ? 'পরে করব' : 'Maybe Later'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Shop Location Modal */}
      <AnimatePresence>
        {selectedShopForMap && (
          <ShopLocationModal
            shop={selectedShopForMap}
            userCoords={userLocation}
            onClose={() => setSelectedShopForMap(null)}
            onShowToast={onShowToast || (() => {})}
          />
        )}
      </AnimatePresence>

      {/* Shop Reviews & Rating Modal */}
      {selectedShopForReviews && (
        <ShopReviewsModal
          isOpen={!!selectedShopForReviews}
          onClose={() => setSelectedShopForReviews(null)}
          shop={selectedShopForReviews}
          currentUser={user}
          onShowToast={onShowToast || (() => {})}
          onReviewUpdated={fetchShops}
        />
      )}

      {/* Redemption Workflow Modal */}
      <AnimatePresence>
        {showRedeemModal && (
          <ShopRedemptionModal
            shop={selectedShopForRedeem}
            availableTokens={availableTokens}
            onClose={() => {
              setShowRedeemModal(false);
              setSelectedShopForRedeem(null);
            }}
            onSuccess={handleRedemptionSuccess}
            onShowToast={onShowToast || (() => {})}
          />
        )}
      </AnimatePresence>

      {/* User Redemption History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <RedemptionHistoryModal
            onClose={() => setShowHistoryModal(false)}
            onShowToast={onShowToast || (() => {})}
          />
        )}
      </AnimatePresence>

      {/* Cart Modal */}
      <CartModal
        isOpen={showCartModal}
        onClose={() => {
          setShowCartModal(false);
          fetchCartCount();
        }}
        user={user || null}
        onOrderSuccess={() => {
          fetchCartCount();
          fetchUserTokens();
        }}
        onNavigateToOrders={() => {
          setShowCartModal(false);
          setShowOrdersModal(true);
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

