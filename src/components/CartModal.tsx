import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, X, Trash2, Plus, Minus, CheckCircle, Truck, AlertCircle, ShoppingBag, ArrowRight, Heart, MapPin } from 'lucide-react';
import { CartSummary, Order, User } from '../types';
import { api } from '../services/api';
import { BANGLADESH_DISTRICTS } from '../data/bangladeshGeo';
import { useLanguage } from '../context/LanguageContext';
import { LocationSelectorModal } from './LocationSelectorModal';
import { LocalOrderTracking } from './LocalOrderTracking';

function calcDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const p = 0.017453292519943295; // Math.PI / 180
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + 
          c(lat1 * p) * c(lat2 * p) * 
          (1 - c((lon2 - lon1) * p))/2;
  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

function isShopInDhaka(districtStr?: string): boolean {
  if (!districtStr) return false;
  const s = districtStr.toLowerCase().trim();
  return s.includes('dhaka') || s.includes('ঢাকা');
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onOrderSuccess?: (order: Order) => void;
  onNavigateToOrders?: () => void;
  defaultOrderType?: 'NATIONWIDE' | 'LOCAL';
}

export const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  onClose,
  user,
  onOrderSuccess,
  onNavigateToOrders,
  defaultOrderType
}) => {
  const { language } = useLanguage();
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  // Delivery Charges config from backend
  const [districtCharges, setDistrictCharges] = useState<Record<string, number>>({});

  // Districts and Upazilas state from API
  const [districtsList, setDistrictsList] = useState<import('../data/bangladeshGeo').DistrictData[]>(BANGLADESH_DISTRICTS);

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [upazila, setUpazila] = useState('Dhaka Sadar');
  const [districtSearch, setDistrictSearch] = useState('Dhaka');
  const [upazilaSearch, setUpazilaSearch] = useState('Dhaka Sadar');
  const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = useState(false);
  const [isUpazilaDropdownOpen, setIsUpazilaDropdownOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Local Market states
  const [orderType, setOrderType] = useState<'NATIONWIDE' | 'LOCAL'>('NATIONWIDE');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [showMapModal, setShowMapModal] = useState(false);
  const [localDeliveryFee, setLocalDeliveryFee] = useState<number | null>(null);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);

  // Coupon fields
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountType: 'percentage' | 'amount'; discountValue: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Available upazilas for selected district
  const selectedDistrictObj = districtsList.find(d => d.district === district) || districtsList[0] || BANGLADESH_DISTRICTS[0];
  const availableUpazilas = selectedDistrictObj?.upazilas || [];

  const filteredDistricts = districtsList.filter(d => 
    d.district.toLowerCase().includes(districtSearch.toLowerCase()) ||
    d.districtBn.includes(districtSearch)
  );

  const filteredUpazilas = availableUpazilas.filter(u =>
    u.toLowerCase().includes(upazilaSearch.toLowerCase())
  );

  const [shopBreakdowns, setShopBreakdowns] = useState<Array<{
    shopId: string;
    shopName: string;
    distanceKm: number;
    weightKg: number;
    ratePerKm?: number;
    charge?: number;
    isFarthest?: boolean;
  }> | null>(null);
  const [farthestShopInfo, setFarthestShopInfo] = useState<{ name: string; distanceKm: number } | null>(null);
  const [weightBlockedMsg, setWeightBlockedMsg] = useState<string | null>(null);
  const [rangeBlockedMsg, setRangeBlockedMsg] = useState<string | null>(null);
  const [nearbyRiderAvailable, setNearbyRiderAvailable] = useState<boolean | null>(null);
  const [activeRidersCount, setActiveRidersCount] = useState<number>(0);
  const [riderBusyMessage, setRiderBusyMessage] = useState<string | null>(null);

  // 1. Check Courier eligibility (shops must be in Dhaka district):
  // "কুরিয়ার সিস্টেম কাজ করবে যদি শপগুলো ঢাকা জেলার অন্তর্ভুক্ত হয়"
  const nonDhakaShops = useMemo(() => {
    if (!cart?.items || cart.items.length === 0) return [];
    const map = new Map<string, string>();
    for (const item of cart.items) {
      if (item.shopDistrict && !isShopInDhaka(item.shopDistrict)) {
        map.set(item.shopId, `${item.shopName} (${item.shopDistrict})`);
      }
    }
    return Array.from(map.values());
  }, [cart?.items]);

  const isCourierAllowed = nonDhakaShops.length === 0;

  // If Courier is not allowed (shops outside Dhaka), ensure orderType is LOCAL
  useEffect(() => {
    if (!isCourierAllowed && orderType === 'NATIONWIDE') {
      setOrderType('LOCAL');
    }
  }, [isCourierAllowed, orderType]);

  // 2. Check Local Rider eligibility (shops must be within 20km of user location):
  // "আর লোকাল রাইডার সিস্টেম কাজ করবে যদি শপ গুলো ইউজার এর 20 km আশেপাশে হয়"
  const tooFarShops = useMemo(() => {
    if (latitude === undefined || longitude === undefined || !cart?.items) return [];
    const map = new Map<string, string>();
    for (const item of cart.items) {
      if (item.shopLatitude && item.shopLongitude) {
        const straight = calcDistanceKm(latitude, longitude, item.shopLatitude, item.shopLongitude);
        if (straight > 20.0) {
          map.set(item.shopId, `${item.shopName} (${straight.toFixed(1)} কিমি)`);
        }
      }
    }
    return Array.from(map.values());
  }, [latitude, longitude, cart?.items]);

  const isWithin20Km = tooFarShops.length === 0 && !rangeBlockedMsg;

  useEffect(() => {
    let isCancelled = false;
    if (orderType === 'LOCAL' && latitude !== undefined && longitude !== undefined && cart && cart.items && cart.items.length > 0) {
      const fetchFee = async () => {
        setIsCalculatingFee(true);
        setWeightBlockedMsg(null);
        setRangeBlockedMsg(null);
        try {
          const res = await api.calculateLocalDeliveryFee(latitude, longitude);
          if (isCancelled) return;
          if (res.success) {
            setLocalDeliveryFee(res.fee);
            setNearbyRiderAvailable(res.nearbyRiderAvailable ?? true);
            setActiveRidersCount(res.activeRidersCount || 0);
            if (res.nearbyRiderAvailable === false) {
              setRiderBusyMessage('দুঃখিত আমাদের সকল rider ব্যস্ত আছে');
            } else {
              setRiderBusyMessage(null);
            }
            if (res.shopBreakdowns) {
              setShopBreakdowns(res.shopBreakdowns);
            }
            if (res.farthestShopName && res.farthestShopDistanceKm !== undefined) {
              setFarthestShopInfo({
                name: res.farthestShopName,
                distanceKm: res.farthestShopDistanceKm
              });
            } else {
              setFarthestShopInfo(null);
            }
          }
        } catch (err: any) {
          if (isCancelled) return;
          console.error("Failed to calculate local fee:", err);
          const errMsg = err.message || '';
          setFarthestShopInfo(null);
          if (errMsg.includes('empty') || errMsg.includes('no valid items') || errMsg.includes('Cart is empty')) {
            setLocalDeliveryFee(null);
            setShopBreakdowns(null);
          } else if (errMsg.includes('BLOCKED') || errMsg.includes('১০ কেজি') || errMsg.includes('10 kg')) {
            setWeightBlockedMsg(errMsg);
            setLocalDeliveryFee(null);
            setShopBreakdowns(null);
          } else if (errMsg.includes('২০ কিমি') || errMsg.includes('20 km') || errMsg.includes('আশেপাশে')) {
            setRangeBlockedMsg(errMsg);
            setLocalDeliveryFee(null);
            setShopBreakdowns(null);
          } else {
            setLocalDeliveryFee(null);
          }
        } finally {
          if (!isCancelled) {
            setIsCalculatingFee(false);
          }
        }
      };
      fetchFee();
    } else {
      setLocalDeliveryFee(null);
      setShopBreakdowns(null);
      setWeightBlockedMsg(null);
      setRangeBlockedMsg(null);
    }
    return () => {
      isCancelled = true;
    };
  }, [orderType, latitude, longitude, cart]);

  useEffect(() => {
    let isCancelled = false;
    if (isOpen) {
      if (defaultOrderType) {
        setOrderType(defaultOrderType);
      }
      setError(null);
      setPlacedOrder(null);
      setCouponCodeInput('');
      setAppliedCoupon(null);
      setCouponError(null);
      setCouponSuccess(null);
      
      const loadInitialData = async () => {
        setLoading(true);
        try {
          const [cartRes, chargesRes, distRes] = await Promise.allSettled([
            api.getCart(),
            api.getDeliveryChargesConfig(),
            api.getBangladeshDistricts()
          ]);

          if (isCancelled) return;

          if (cartRes.status === 'fulfilled' && cartRes.value?.success && cartRes.value.cart) {
            setCart(cartRes.value.cart);
          } else {
            setCart({
              items: [],
              totalQuantity: 0,
              productOriginalTotal: 0,
              tokenDiscountTotal: 0,
              tokenDonationTotal: 0,
              productPayableTotal: 0,
              deliveryCharge: 0,
              totalCodAmount: 0
            });
          }

          if (chargesRes.status === 'fulfilled' && chargesRes.value?.success && chargesRes.value.charges) {
            setDistrictCharges(chargesRes.value.charges);
          }

          if (distRes.status === 'fulfilled' && distRes.value?.success && distRes.value.districts && distRes.value.districts.length > 0) {
            setDistrictsList(distRes.value.districts);
          }
        } catch (err: any) {
          if (isCancelled) return;
          console.error('Error loading cart modal data:', err);
        } finally {
          if (!isCancelled) {
            setLoading(false);
          }
        }
      };

      loadInitialData();

      if (user) {
        if (!customerName) setCustomerName(user.fullName || '');
        if (!customerPhone) setCustomerPhone(user.phone || '');
      }
    }
    return () => {
      isCancelled = true;
    };
  }, [isOpen, defaultOrderType]);

  const handleApplyCoupon = async () => {
    setCouponError(null);
    setCouponSuccess(null);
    if (!couponCodeInput.trim()) {
      setCouponError(language === 'bn' ? 'কুপন কোড লিখুন।' : 'Please enter coupon code.');
      return;
    }
    setValidatingCoupon(true);
    try {
      const res = await api.validateCoupon(couponCodeInput.trim().toUpperCase());
      if (res.success && res.coupon) {
        setAppliedCoupon(res.coupon);
        setCouponSuccess(
          language === 'bn' 
            ? `"${res.coupon.code}" কুপনটি সফলভাবে প্রয়োগ করা হয়েছে!` 
            : `Coupon "${res.coupon.code}" applied successfully!`
        );
      } else {
        setCouponError(language === 'bn' ? 'কুপনটি সঠিক নয়।' : 'Invalid coupon code.');
      }
    } catch (err: any) {
      console.error('Error validating coupon:', err);
      setCouponError(err.message || (language === 'bn' ? 'কুপনটি সঠিক নয় বা এর ব্যবহারের সীমা শেষ।' : 'Invalid coupon or usage limit reached.'));
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponSuccess(null);
    setCouponError(null);
  };

  const fetchDeliveryConfig = async () => {
    try {
      const res = await api.getDeliveryChargesConfig();
      if (res.success) {
        setDistrictCharges(res.charges || {});
      }
    } catch (err) {
      console.error('Error fetching delivery config:', err);
    }
  };

  const fetchDistricts = async () => {
    try {
      const res = await api.getBangladeshDistricts();
      if (res.success && res.districts && res.districts.length > 0) {
        setDistrictsList(res.districts);
      }
    } catch (err) {
      console.error('Error fetching districts:', err);
    }
  };

  const fetchCart = async () => {
    setLoading(true);
    try {
      const res = await api.getCart();
      if (res.success) {
        setCart(res.cart);
      }
    } catch (err: any) {
      console.error('Error fetching cart:', err);
      setError(err.message || (language === 'bn' ? 'কার্টের তথ্য লোড করা যায়নি।' : 'Could not load cart info.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    setDistrictSearch(newDistrict);
    setIsDistrictDropdownOpen(false);
    // Clear upazila when district changes, requiring user to select a new one
    setUpazila('');
    setUpazilaSearch('');
  };

  const handleUpdateQuantity = async (itemId: string, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty < 1) return;
    setUpdatingItemId(itemId);
    try {
      const res = await api.updateCartItemQuantity(itemId, newQty);
      if (res.success) {
        setCart(res.cart);
      }
    } catch (err: any) {
      setError(err.message || (language === 'bn' ? 'পরিমাণ পরিবর্তন করা যায়নি।' : 'Could not update quantity.'));
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleUpdateWeight = async (itemId: string, newWeight: number) => {
    if (isNaN(newWeight) || newWeight <= 0) return;
    setUpdatingItemId(itemId);
    try {
      const res = await api.updateCartItemWeight(itemId, newWeight);
      if (res.success) {
        setCart(res.cart);
      }
    } catch (err: any) {
      setError(err.message || (language === 'bn' ? 'ওজন পরিবর্তন করা যায়নি।' : 'Could not update weight.'));
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (itemId: string, productId?: string) => {
    const targetId = itemId || productId;
    if (!targetId) return;
    setUpdatingItemId(targetId);
    try {
      const res = await api.removeCartItem(targetId);
      if (res.success) {
        setCart(res.cart);
        setError(null);
      } else {
        setError(res.message || (language === 'bn' ? 'পণ্যটি কার্ট থেকে মুছে ফেলা যায়নি।' : 'Could not remove item.'));
      }
    } catch (err: any) {
      setError(err.message || (language === 'bn' ? 'পণ্য মোছা যায়নি।' : 'Could not remove item.'));
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleClearCart = async () => {
    if (!confirm(language === 'bn' ? 'আপনি কি নিশ্চিত যে কার্টের সব পণ্য মুছে ফেলতে চান?' : 'Are you sure you want to clear your cart?')) return;
    setLoading(true);
    try {
      const res = await api.clearCart();
      if (res.success) {
        setCart(res.cart);
      }
    } catch (err: any) {
      setError(err.message || (language === 'bn' ? 'কার্ট খালি করা যায়নি।' : 'Could not clear cart.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (orderType === 'NATIONWIDE') {
      if (!isCourierAllowed) {
        setError(
          language === 'bn' 
            ? `কুরিয়ার ডেলিভারি শুধুমাত্র ঢাকা জেলার শপগুলোর জন্য প্রযোজ্য। আপনার কার্টের শপ (${nonDhakaShops.join(', ')}) ঢাকা জেলার বাইরে অবস্থিত।` 
            : `Courier delivery is only available for shops in Dhaka district.`
        );
        return;
      }
      if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim() || !district || !upazila) {
        setError(
          language === 'bn' 
            ? 'অনুগ্রহ করে নাম, মোবাইল নম্বর, জেলা, থানা/উপজেলা এবং সম্পূর্ণ ডেলিভারি ঠিকানা প্রদান করুন।' 
            : 'Please provide name, mobile number, district, upazila, and full delivery address.'
        );
        return;
      }
    } else {
      if (latitude === undefined || longitude === undefined) {
        setError(
          language === 'bn' 
            ? 'অনুগ্রহ করে ম্যাপ থেকে আপনার ডেলিভারি লোকেশন নির্বাচন করুন।' 
            : 'Please select your delivery location on the map.'
        );
        return;
      }
      if (tooFarShops.length > 0 || rangeBlockedMsg) {
        setError(
          rangeBlockedMsg || (
            language === 'bn' 
              ? `লোকাল রাইডার ডেলিভারি শুধুমাত্র আপনার ২০ কিমি আশেপাশের শপগুলোর জন্য প্রযোজ্য। কার্টের শপ (${tooFarShops.join(', ')}) আপনার লোকেশন থেকে ২০ কিমির বেশি দূরে।`
              : `Local rider delivery is only available for shops within 20km of your location.`
          )
        );
        return;
      }
      if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
        setError(
          language === 'bn' 
            ? 'অনুগ্রহ করে নাম, মোবাইল নম্বর, এবং সম্পূর্ণ ঠিকানা প্রদান করুন।' 
            : 'Please provide name, mobile number, and full address.'
        );
        return;
      }
    }

    setCheckingOut(true);
    setError(null);
    try {
      const formattedAddress = orderType === 'LOCAL' 
        ? deliveryAddress // Raw address details + map coords
        : (language === 'bn'
          ? `${deliveryAddress}, থানা: ${upazila}, জেলা: ${district}`
          : `${deliveryAddress}, Upazila: ${upazila}, District: ${district}`);

      const res = await api.checkoutOrder({
        customerName,
        customerPhone,
        deliveryAddress: formattedAddress,
        district: orderType === 'NATIONWIDE' ? district : 'Local Area',
        upazila: orderType === 'NATIONWIDE' ? upazila : 'Local Thana',
        deliveryNotes,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        orderType,
        latitude,
        longitude
      });

      if (res.success) {
        setPlacedOrder(res.order);
        if (onOrderSuccess) {
          onOrderSuccess(res.order);
        }
      }
    } catch (err: any) {
      setError(err.message || (language === 'bn' ? 'অর্ডার সম্পন্ন করতে সমস্যা হয়েছে।' : 'Could not complete order.'));
    } finally {
      setCheckingOut(false);
    }
  };

  if (!isOpen && !placedOrder) return null;

  if (placedOrder && placedOrder.orderType === 'LOCAL') {
    return (
      <LocalOrderTracking
        order={placedOrder}
        onClose={() => {
          setPlacedOrder(null);
          onClose();
        }}
      />
    );
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          key="cart-modal-container"
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {language === 'bn' ? 'আমার শপিং কার্ট' : 'My Shopping Cart'}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {cart && cart.totalQuantity > 0 
                    ? (language === 'bn' ? `${cart.totalQuantity} টি পণ্য নির্বাচিত` : `${cart.totalQuantity} items selected`) 
                    : (language === 'bn' ? 'কার্ট খালি' : 'Cart is empty')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
            {placedOrder ? (
              /* Order Success View */
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle className="w-9 h-9" />
                </div>
                <div>
                  <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full mb-2">
                    {language === 'bn' ? 'ক্যাশ অন ডেলিভারি (COD)' : 'Cash on Delivery (COD)'}
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {language === 'bn' ? 'অর্ডার সফলভাবে গ্রহণ করা হয়েছে!' : 'Order Placed Successfully!'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                    {language === 'bn' ? 'আপনার অর্ডার নম্বর: ' : 'Your Order Number: '}
                    <span className="font-extrabold text-slate-900">#{placedOrder.orderNumber}</span>
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left max-w-md mx-auto space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>{language === 'bn' ? 'ডেলিভারি ঠিকানা:' : 'Delivery Address:'}</span>
                    <span className="font-semibold text-slate-900 text-right">{placedOrder.deliveryAddress}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{language === 'bn' ? 'মোবাইল নম্বর:' : 'Mobile Number:'}</span>
                    <span className="font-semibold text-slate-900">{placedOrder.customerPhone}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{language === 'bn' ? 'পণ্যের প্রদেয় মূল্য:' : 'Product Payable Amount:'}</span>
                    <span className="font-bold text-slate-900">৳{placedOrder.productTotalPayable ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{language === 'bn' ? 'ডেলিভারি চার্জ:' : 'Delivery Charge:'}</span>
                    <span className="font-bold text-slate-900">৳{placedOrder.deliveryCharge ?? 0}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-extrabold text-slate-900">
                    <span>{language === 'bn' ? 'সর্বমোট প্রদেয় (COD):' : 'Total Payable (COD):'}</span>
                    <span className="text-emerald-600">৳{placedOrder.totalCodAmount ?? 0}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-3 justify-center">
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition"
                  >
                    {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
                  </button>
                  {onNavigateToOrders && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToOrders();
                      }}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      {language === 'bn' ? 'আমার সব অর্ডার দেখুন' : 'View All My Orders'}
                    </button>
                  )}
                </div>
              </div>
            ) : loading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 animate-bounce text-emerald-500 opacity-60" />
                {language === 'bn' ? 'কার্টের তথ্য লোড হচ্ছে...' : 'Loading cart information...'}
              </div>
            ) : !cart || cart.items.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-base font-bold text-slate-800">
                  {language === 'bn' ? 'আপনার কার্ট বর্তমানে খালি' : 'Your Cart is Currently Empty'}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {language === 'bn' 
                    ? 'পার্টনার শপগুলোর পণ্য তালিকা থেকে পছন্দের পণ্য কার্টে যোগ করুন।' 
                    : 'Add products to your cart from the partner shops list.'}
                </p>
                <button
                  onClick={onClose}
                  className="mt-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  {language === 'bn' ? 'পণ্য ব্রাউজ করুন' : 'Browse Products'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Cart Items List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {language === 'bn' 
                        ? `কার্টের পণ্যসমূহ (${cart.items.length})` 
                        : `Cart Items (${cart.items.length})`}
                    </span>
                    <button
                      onClick={handleClearCart}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {language === 'bn' ? 'সব মুছুন' : 'Clear All'}
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {cart.items.map((item, idx) => {
                      const isUpdating = updatingItemId === item.id;
                      return (
                        <div
                          key={`${item.id || item.productId || 'item'}-${idx}`}
                          className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 items-center justify-between"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-14 h-14 bg-white rounded-lg border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                              {item.productImage ? (
                                <img
                                  src={item.productImage}
                                  alt={item.productName}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <ShoppingBag className="w-6 h-6 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] text-slate-500 font-medium block truncate">
                                {item.shopName}
                              </span>
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {item.productName}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {item.tokenType ? (
                                  item.isDonated ? (
                                    <div className="flex items-center gap-1">
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-500/10 text-rose-600 text-[10px] font-extrabold rounded border border-rose-500/20">
                                        <Heart className="w-3 h-3 fill-current text-rose-500 animate-pulse" />
                                        {language === 'bn' 
                                          ? `মসজিদে দান (${item.normalDiscountPercent}% সমপরিমাণ)` 
                                          : `Mosque Donation (${item.normalDiscountPercent}%)`}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                                        {language === 'bn' 
                                          ? `${item.tokenType === 'GOLD' ? 'গোল্ড' : item.tokenType === 'SILVER' ? 'সিলভার' : 'ব্রোঞ্জ'} টোকেন (${item.tokenDiscountPercent}% ছাড়)`
                                          : `${item.tokenType} Token (${item.tokenDiscountPercent}% Off)`}
                                      </span>
                                    </div>
                                  )
                                ) : (
                                  <span className="text-[10px] text-slate-400">
                                    {language === 'bn' ? 'রেগুলার মূল্য' : 'Regular Price'}
                                  </span>
                                )}

                                {/* Product Weight (Pre-set by Merchant) */}
                                <div className="inline-flex items-center gap-1 bg-amber-50/90 border border-amber-200/90 rounded px-2 py-0.5 text-[10px] text-amber-900 font-bold">
                                  <span>⚖️ {language === 'bn' ? 'ওজন:' : 'Weight:'}</span>
                                  <span>
                                    {(Number(item.weightKg || 1) * Number(item.quantity || 1)).toFixed(1)} {language === 'bn' ? 'কেজি' : 'kg'}
                                  </span>
                                  {Number(item.quantity || 1) > 1 && (
                                    <span className="text-[9px] text-amber-700/80 font-normal">
                                      (@ {Number(item.weightKg || 1).toFixed(1)} {language === 'bn' ? 'কেজি' : 'kg'})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {/* Price */}
                            <div className="text-right">
                              <span className="text-xs sm:text-sm font-extrabold text-slate-900 block">
                                ৳{(Number(item.subtotalPayable || (item.finalPricePerUnit * item.quantity) || (item.productPrice * item.quantity) || 0)).toFixed(0)}
                              </span>
                              {item.isDonated ? (
                                <span className="text-[9px] text-rose-600 font-bold block">
                                  ৳{(item.donatedAmount || 0).toFixed(0)} {language === 'bn' ? 'দান হবে ❤️' : 'Donated ❤️'}
                                </span>
                              ) : (
                                (item.tokenDiscountAmount || 0) > 0 && (
                                  <span className="text-[10px] text-slate-400 line-through block">
                                    ৳{(Number(item.productPrice || 0) * Number(item.quantity || 1)).toFixed(0)}
                                  </span>
                                )
                              )}
                            </div>

                            {/* Qty +/- */}
                            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                              <button
                                disabled={isUpdating || item.quantity <= 1}
                                onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                                className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center text-xs font-bold text-slate-800">{item.quantity}</span>
                              <button
                                disabled={isUpdating}
                                onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                                className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Remove item */}
                            <button
                              disabled={isUpdating}
                              onClick={() => handleRemoveItem(item.id, item.productId)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title={language === 'bn' ? 'মুছে ফেলুন' : 'Remove item'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Coupon Code Input Panel */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    {language === 'bn' ? 'কুপন কোড ব্যবহার করুন (Coupon Code)' : 'Apply Coupon Code'}
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={language === 'bn' ? 'যেমন: SAVE10' : 'e.g. SAVE10'}
                      className="flex-1 px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs font-bold uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value)}
                      disabled={validatingCoupon || !!appliedCoupon}
                    />
                    {appliedCoupon ? (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                      >
                        {language === 'bn' ? 'মুছে ফেলুন' : 'Remove'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={validatingCoupon || !couponCodeInput.trim()}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-lg transition flex items-center justify-center cursor-pointer"
                      >
                        {validatingCoupon 
                          ? (language === 'bn' ? 'যাচাই হচ্ছে...' : 'Validating...') 
                          : (language === 'bn' ? 'প্রয়োগ করুন' : 'Apply')}
                      </button>
                    )}
                  </div>
                  {couponError && (
                    <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{couponError}</span>
                    </p>
                  )}
                  {couponSuccess && (
                    <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{couponSuccess}</span>
                    </p>
                  )}
                </div>

                {/* Checkout Form */}
                <form onSubmit={handleCheckout} className="relative z-50 pointer-events-auto space-y-3 pt-2">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {language === 'bn' ? 'ডেলিভারি তথ্য ও ঠিকানা' : 'Delivery Information & Address'}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative z-50 pointer-events-auto">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {language === 'bn' ? 'গ্রাহকের নাম *' : 'Customer Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder={language === 'bn' ? 'আপনার পূর্ণ নাম' : 'Your full name'}
                        className="w-full px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white focus:text-slate-900 focus:outline-none touch-manipulation relative z-50 pointer-events-auto"
                      />
                    </div>
                    <div className="relative z-50 pointer-events-auto">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {language === 'bn' ? 'মোবাইল নম্বর *' : 'Mobile Number *'}
                      </label>
                      <input
                        type="tel"
                        required
                        inputMode="numeric"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white focus:text-slate-900 focus:outline-none touch-manipulation relative z-50 pointer-events-auto"
                      />
                    </div>
                  </div>

                  <div className="relative z-50 pointer-events-auto bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                        {language === 'bn' ? 'ডেলিভারি ধরন নির্বাচন করুন' : 'Select Delivery Method'}
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {language === 'bn' ? 'শপের লোকেশন অনুযায়ী প্রযোজ্য' : 'Based on shop location'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Courier (Nationwide) - Only if shops are in Dhaka */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!isCourierAllowed) {
                            setError(
                              language === 'bn'
                                ? `কুরিয়ার সিস্টেম শুধুমাত্র ঢাকা জেলার শপগুলোর জন্য প্রযোজ্য। আপনার কার্টের শপ (${nonDhakaShops.join(', ')}) ঢাকা জেলার বাইরে অবস্থিত।`
                                : `Courier delivery is only available for shops in Dhaka district.`
                            );
                            return;
                          }
                          setError(null);
                          setOrderType('NATIONWIDE');
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          orderType === 'NATIONWIDE'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs'
                            : !isCourierAllowed
                              ? 'border-slate-200 bg-slate-100 text-slate-400 opacity-60'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-4 h-4" />
                          <span>{language === 'bn' ? 'কুরিয়ার (সারাদেশ)' : 'Courier (Nationwide)'}</span>
                        </div>
                        <span className={`text-[10px] font-semibold ${orderType === 'NATIONWIDE' ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {language === 'bn' ? 'ঢাকা জেলার শপের জন্য' : 'Dhaka shops only'}
                        </span>
                        {!isCourierAllowed && (
                          <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded mt-0.5">
                            {language === 'bn' ? 'অনুপলব্ধ (শপ ঢাকার বাইরে)' : 'Unavailable (Outside Dhaka)'}
                          </span>
                        )}
                      </button>

                      {/* Local Rider - For shops within 20km */}
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setOrderType('LOCAL');
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          orderType === 'LOCAL'
                            ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          <span>{language === 'bn' ? 'লোকাল রাইডার' : 'Local Rider'}</span>
                        </div>
                        <span className={`text-[10px] font-semibold ${orderType === 'LOCAL' ? 'text-amber-700' : 'text-slate-400'}`}>
                          {language === 'bn' ? '২০ কিমি আশেপাশের জন্য' : 'Within 20km vicinity'}
                        </span>
                        {latitude !== undefined && longitude !== undefined && (tooFarShops.length > 0 || rangeBlockedMsg) && (
                          <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded mt-0.5">
                            {language === 'bn' ? '২০ কিমির বাইরে' : '>20km away'}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Notice box about Courier rule */}
                    {!isCourierAllowed && (
                      <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-800 text-[11px] leading-relaxed flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-900">
                            {language === 'bn' ? 'কুরিয়ার সিস্টেম শুধুমাত্র ঢাকা জেলার শপগুলোর জন্য প্রযোজ্য' : 'Courier delivery is only for shops in Dhaka district'}
                          </p>
                          <p className="text-amber-700 mt-0.5">
                            {language === 'bn'
                              ? `কার্টের শপ (${nonDhakaShops.join(', ')}) ঢাকা জেলার বাইরে অবস্থিত হওয়ায় লোকাল রাইডার সক্রিয় রাখা হয়েছে।`
                              : `Shops outside Dhaka must use Local Rider delivery.`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {orderType === 'NATIONWIDE' ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative pointer-events-auto">
                        {/* District Searchable Dropdown */}
                    <div className={`relative pointer-events-auto ${isDistrictDropdownOpen ? 'z-[100]' : 'z-20'}`}>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        {language === 'bn' ? 'জেলা (District) *' : 'District *'}
                      </label>
                      <input
                        type="text"
                        value={districtSearch}
                        onFocus={() => {
                          setDistrictSearch(''); // clear to show all
                          setIsDistrictDropdownOpen(true);
                          setIsUpazilaDropdownOpen(false);
                        }}
                        onBlur={() => setTimeout(() => setIsDistrictDropdownOpen(false), 200)}
                        onChange={e => {
                          setDistrictSearch(e.target.value);
                          setIsDistrictDropdownOpen(true);
                          setIsUpazilaDropdownOpen(false);
                        }}
                        placeholder={district 
                          ? `${language === 'bn' ? (districtsList.find(d => d.district === district)?.districtBn || district) : district} (${language === 'bn' ? 'নির্বাচিত' : 'Selected'})` 
                          : (language === 'bn' ? 'জেলা খুঁজুন (যেমন: Dhaka, চট্টগ্রাম)...' : 'Search district (e.g. Dhaka)...')}
                        className="w-full px-3 py-2.5 bg-white text-slate-900 placeholder:text-slate-500 border-2 border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white focus:text-slate-900 focus:outline-none touch-manipulation shadow-xs"
                      />
                      {isDistrictDropdownOpen && (
                        <div className="absolute z-[110] left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto bg-slate-900 border-2 border-emerald-500 rounded-xl shadow-2xl text-xs divide-y divide-slate-800 ring-1 ring-black/20">
                          {filteredDistricts.length > 0 ? (
                            filteredDistricts.map((d, idx) => {
                              const isSelected = district === d.district;
                              return (
                                <div
                                  key={`${d.district}-${idx}`}
                                  onMouseDown={(e) => e.preventDefault()} // prevent blur
                                  onClick={() => {
                                    handleDistrictChange(d.district);
                                  }}
                                  className={`px-4 py-3 cursor-pointer transition-colors flex items-center justify-between text-xs ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white font-bold'
                                      : 'bg-slate-900 text-slate-100 hover:bg-emerald-800 hover:text-white font-semibold'
                                  }`}
                                >
                                  <span>{language === 'bn' ? `${d.districtBn} (${d.district})` : `${d.district} (${d.districtBn})`}</span>
                                  {isSelected && <span className="text-amber-300 font-extrabold text-sm">✓</span>}
                                </div>
                              );
                            })
                          ) : (
                            <div className="px-4 py-3 text-slate-400 text-center bg-slate-900">
                              {language === 'bn' ? 'কোনো জেলা পাওয়া যায়নি' : 'No district found'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Upazila Searchable Dropdown */}
                    <div className={`relative pointer-events-auto ${isUpazilaDropdownOpen ? 'z-[100]' : 'z-10'}`}>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        {language === 'bn' ? 'থানা / উপজেলা (Upazila) *' : 'Upazila / Thana *'}
                      </label>
                      <input
                        type="text"
                        value={upazilaSearch}
                        onFocus={() => {
                          setUpazilaSearch(''); // clear to show all
                          setIsUpazilaDropdownOpen(true);
                          setIsDistrictDropdownOpen(false);
                        }}
                        onBlur={() => setTimeout(() => setIsUpazilaDropdownOpen(false), 200)}
                        onChange={e => {
                          setUpazilaSearch(e.target.value);
                          setIsUpazilaDropdownOpen(true);
                          setIsDistrictDropdownOpen(false);
                        }}
                        placeholder={upazila ? `${upazila} (${language === 'bn' ? 'নির্বাচিত' : 'Selected'})` : (language === 'bn' ? 'থানা খুঁজুন...' : 'Search upazila...')}
                        className="w-full px-3 py-2.5 bg-white text-slate-900 placeholder:text-slate-500 border-2 border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white focus:text-slate-900 focus:outline-none touch-manipulation shadow-xs"
                      />
                      {isUpazilaDropdownOpen && (
                        <div className="absolute z-[110] left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto bg-slate-900 border-2 border-emerald-500 rounded-xl shadow-2xl text-xs divide-y divide-slate-800 ring-1 ring-black/20">
                          {filteredUpazilas.length > 0 ? (
                            filteredUpazilas.map((u, idx) => {
                              const isSelected = upazila === u;
                              return (
                                <div
                                  key={`${u}-${idx}`}
                                  onMouseDown={(e) => e.preventDefault()} // prevent blur
                                  onClick={() => {
                                    setUpazila(u);
                                    setUpazilaSearch(u);
                                    setIsUpazilaDropdownOpen(false);
                                  }}
                                  className={`px-4 py-3 cursor-pointer transition-colors flex items-center justify-between text-xs ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white font-bold'
                                      : 'bg-slate-900 text-slate-100 hover:bg-emerald-800 hover:text-white font-semibold'
                                  }`}
                                >
                                  <span>{u}</span>
                                  {isSelected && <span className="text-amber-300 font-extrabold text-sm">✓</span>}
                                </div>
                              );
                            })
                          ) : (
                            <div className="px-4 py-3 text-slate-400 text-center bg-slate-900">
                              {language === 'bn' ? 'কোনো থানা পাওয়া যায়নি' : 'No upazila found'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  </>
                  ) : (
                    <div className="relative z-0 pointer-events-auto bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center gap-3">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-1">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">
                          {language === 'bn' ? 'ডেলিভারি লোকেশন' : 'Delivery Location'}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto line-clamp-2">
                          {latitude && longitude 
                            ? (deliveryAddress || (language === 'bn' ? 'লোকেশন নির্বাচন করা হয়েছে' : 'Location Selected'))
                            : (language === 'bn' ? 'ম্যাপ থেকে আপনার লোকেশন নির্বাচন করুন' : 'Select your location from the map')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowMapModal(true)}
                        className="mt-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-full shadow-sm transition-colors"
                      >
                        {latitude && longitude 
                          ? (language === 'bn' ? 'পরিবর্তন করুন' : 'Change Location')
                          : (language === 'bn' ? 'ম্যাপ ওপেন করুন' : 'Open Map')}
                      </button>

                      {/* Rider Availability & Weight Calculation Details */}
                      {latitude && longitude && (
                        <div className="w-full mt-2 text-left space-y-2">
                          {riderBusyMessage || nearbyRiderAvailable === false ? (
                            <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-900 flex items-start gap-2.5 shadow-2xs">
                              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <h5 className="font-extrabold text-xs text-amber-900">
                                  {language === 'bn' ? 'দুঃখিত আমাদের সকল rider ব্যস্ত আছে' : 'Sorry, all our riders are busy right now'}
                                </h5>
                                <p className="text-[11px] text-amber-700 mt-0.5 font-medium leading-relaxed">
                                  {language === 'bn' 
                                    ? 'আপনার ২০ কিমি দূরত্বের মধ্যে কোনো রাইডার এই মুহূর্তে সক্রিয় নেই। আপনি কুরিয়ার (সারাদেশ) বেছে নিতে পারেন অথবা কিছুক্ষণ পর চেষ্টা করুন।' 
                                    : 'No active riders within 20km. You can select Courier delivery or try again shortly.'}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center justify-between">
                              <span className="font-bold flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                {language === 'bn' ? `২০ কিমি মধ্যে ${activeRidersCount} জন রাইডার সক্রিয় আছেন` : `${activeRidersCount} active rider(s) nearby within 20km`}
                              </span>
                              <span className="text-[11px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                                {language === 'bn' ? 'রাইডার প্রস্তুত' : 'Ready'}
                              </span>
                            </div>
                          )}

                          {/* Weight & Rate Summary */}
                          {cart && (
                            <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                              <div className="flex justify-between items-center text-slate-600">
                                <span>{language === 'bn' ? 'কার্টের মোট ওজন:' : 'Total Cart Weight:'}</span>
                                <span className="font-black text-slate-800">
                                  {cart.items.reduce((acc, it) => acc + (Number(it.weightKg || 1) * Number(it.quantity || 1)), 0).toFixed(1)} {language === 'bn' ? 'কেজি' : 'kg'}
                                </span>
                              </div>
                              {localDeliveryFee !== null && (
                                <div className="flex justify-between items-center text-slate-600">
                                  <span>{language === 'bn' ? 'ওজন ও দূরত্বভিত্তিক ডেলিভারি ফি:' : 'Weight & Distance Delivery Fee:'}</span>
                                  <span className="font-extrabold text-emerald-700">৳{localDeliveryFee}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {weightBlockedMsg && (
                            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-bold flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>{weightBlockedMsg}</span>
                            </div>
                          )}

                          {(tooFarShops.length > 0 || rangeBlockedMsg) && (
                            <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-800 text-xs flex items-start gap-2.5 shadow-2xs">
                              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                              <div>
                                <h5 className="font-extrabold text-rose-900">
                                  {language === 'bn' ? 'লোকাল রাইডার ডেলিভারি অনুপলব্ধ (২০ কিমি অতিক্রম)' : 'Local Rider Unavailable (>20km away)'}
                                </h5>
                                <p className="text-[11px] text-rose-700 mt-1 leading-relaxed">
                                  {rangeBlockedMsg || (
                                    language === 'bn'
                                      ? `লোকাল রাইডার সিস্টেম কাজ করবে যদি শপগুলো আপনার ২০ কিমি আশেপাশে হয়। কার্টের শপ (${tooFarShops.join(', ')}) আপনার বর্তমান লোকেশন থেকে ২০ কিমির বাইরে অবস্থিত।`
                                      : `Local rider delivery is only available within 20km. Some shops (${tooFarShops.join(', ')}) exceed this limit.`
                                  )}
                                </p>
                              </div>
                            </div>
                          )}

                          {!rangeBlockedMsg && tooFarShops.length === 0 && !weightBlockedMsg && (
                            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>
                                {language === 'bn' ? 'সকল শপ আপনার ২০ কিমি এলাকার মধ্যে অন্তর্ভুক্ত।' : 'All shops are within your 20km local range.'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`relative z-0 pointer-events-auto ${orderType === 'LOCAL' && latitude ? 'block' : (orderType === 'LOCAL' ? 'hidden' : 'block')}`}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {orderType === 'NATIONWIDE' 
                        ? (language === 'bn' ? 'বিস্তারিত ঠিকানা (রোড/বাসা/এলাকা) *' : 'Detailed Address (House/Road/Area) *')
                        : (language === 'bn' ? 'বিস্তারিত ঠিকানা' : 'Detailed Address')}
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={deliveryAddress}
                      onChange={e => setDeliveryAddress(e.target.value)}
                      placeholder={language === 'bn' ? 'যেমন: বাসা নং ১২, রোড নং ৫, ব্লক সি' : 'e.g. House 12, Road 5, Block C'}
                      className="w-full px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white focus:text-slate-900 focus:outline-none resize-none touch-manipulation"
                    />
                  </div>

                  <div className="relative z-0 pointer-events-auto">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {language === 'bn' ? 'বিশেষ নির্দেশাবলী (ঐচ্ছিক)' : 'Special Delivery Instructions (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={deliveryNotes}
                      onChange={e => setDeliveryNotes(e.target.value)}
                      placeholder={language === 'bn' ? 'যেমন: বিকেলে ডেলিভারি করবেন...' : 'e.g. Deliver in the afternoon...'}
                      className="w-full px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white focus:text-slate-900 focus:outline-none touch-manipulation"
                    />
                  </div>

                  {/* Coupon Notice if applicable */}
                  {appliedCoupon && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs flex items-center justify-between text-amber-800">
                      <span>{language === 'bn' ? `প্রযোজ্য কুপন: ${appliedCoupon.code}` : `Applied Coupon: ${appliedCoupon.code}`}</span>
                      <span className="font-bold text-emerald-700">✓ {language === 'bn' ? 'যুক্ত হয়েছে' : 'Active'}</span>
                    </div>
                  )}

                  {/* Summary Box with Delivery Charge & Total Calculation */}
                  {(() => {
                    const originalTotal = Number(cart?.productOriginalTotal ?? cart?.subtotalOriginal ?? 0);
                    const tokenDiscount = Number(cart?.tokenDiscountTotal ?? cart?.totalTokenDiscount ?? 0);
                    const tokenDonation = Number(cart?.tokenDonationTotal ?? 0);
                    const payableTotalBeforeCoupon = Number(cart?.productPayableTotal ?? cart?.subtotalPayable ?? 0);
                    
                    let couponDiscountAmount = 0;
                    if (appliedCoupon) {
                      const discountVal = Number(appliedCoupon.discountValue) || 0;
                      if (appliedCoupon.discountType === 'percentage') {
                        couponDiscountAmount = (payableTotalBeforeCoupon * discountVal) / 100;
                      } else {
                        couponDiscountAmount = discountVal;
                      }
                    }

                    // Cap coupon discount so it doesn't exceed the remaining payable amount
                    const actualCouponDiscount = Math.min(couponDiscountAmount, payableTotalBeforeCoupon);
                    const payableTotal = Math.max(0, payableTotalBeforeCoupon - actualCouponDiscount);

                    let delivery = 60; // Default fallback
                    if (orderType === 'LOCAL') {
                      delivery = localDeliveryFee !== null ? localDeliveryFee : 60;
                    } else {
                      delivery = district.toLowerCase().includes('dhaka') ? 60 : 120;
                      if (districtCharges[district] !== undefined) {
                        delivery = districtCharges[district];
                      } else if (districtCharges['dhaka'] !== undefined && district.toLowerCase().includes('dhaka')) {
                        delivery = districtCharges['dhaka'];
                      } else if (districtCharges['outside_dhaka'] !== undefined) {
                        delivery = districtCharges['outside_dhaka'];
                      }
                    }

                    const codTotal = payableTotal + delivery;

                    return (
                      <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 text-xs shadow-md">
                        <div className="flex justify-between text-slate-300">
                          <span>{language === 'bn' ? 'পণ্যের মূল মূল্য (মোট):' : 'Product Price (Original Total):'}</span>
                          <span>৳{language === 'bn' ? originalTotal.toLocaleString('bn-BD') : originalTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>{language === 'bn' ? 'কার্টের মোট ওজন (স্বয়ংক্রিয়):' : 'Total Cart Weight (Auto):'}</span>
                          <span className="font-semibold text-amber-300">
                            ⚖️ {((cart?.items || []).reduce((sum, it) => sum + (Number(it.weightKg || 1) * Number(it.quantity || 1)), 0)).toFixed(1)} {language === 'bn' ? 'কেজি' : 'kg'}
                          </span>
                        </div>
                        {tokenDiscount > 0 && (
                          <div className="flex justify-between text-emerald-400 font-semibold">
                            <span>{language === 'bn' ? 'টোকেন ডিসকাউন্ট সুবিধা:' : 'Token Discount Benefit:'}</span>
                            <span>- ৳{language === 'bn' ? tokenDiscount.toLocaleString('bn-BD') : tokenDiscount.toLocaleString()}</span>
                          </div>
                        )}
                        {tokenDonation > 0 && (
                          <div className="flex justify-between text-rose-400 font-semibold">
                            <span>{language === 'bn' ? 'কল্যাণ তহবিলে দানকৃত (মসজিদ):' : 'Donated to Mosque Fund:'}</span>
                            <span>৳{language === 'bn' ? tokenDonation.toLocaleString('bn-BD') : tokenDonation.toLocaleString()} ❤️</span>
                          </div>
                        )}
                        {appliedCoupon && actualCouponDiscount > 0 && (
                          <div className="flex justify-between text-amber-400 font-semibold">
                            <span>{language === 'bn' ? `কুপন ডিসকাউন্ট সুবিধা (${appliedCoupon.code}):` : `Coupon Discount (${appliedCoupon.code}):`}</span>
                            <span>- ৳{language === 'bn' ? actualCouponDiscount.toLocaleString('bn-BD') : actualCouponDiscount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-1.5">
                          <span>{language === 'bn' ? 'পণ্যের প্রদেয় মূল্য (ক্যাশ অন ডেলিভারি):' : 'Payable Product Price (COD):'}</span>
                          <span className="font-bold text-white text-sm">
                            ৳{language === 'bn' ? payableTotal.toLocaleString('bn-BD') : payableTotal.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-amber-300 border-t border-slate-800 pt-2">
                          <span className="flex items-center gap-1 font-bold">
                            <Truck className="w-3.5 h-3.5" />
                            {language === 'bn' 
                              ? `ডেলিভারি চার্জ (${orderType === 'LOCAL' ? 'লোকাল রাইডার (ওজন ও দূরত্ব অনুযায়ী)' : district}):` 
                              : `Delivery Charge (${orderType === 'LOCAL' ? 'Local Rider (Weight & Distance)' : district}):`}
                          </span>
                          <span className="font-bold">
                            {isCalculatingFee 
                              ? <span className="animate-pulse">...</span> 
                              : weightBlockedMsg
                              ? <span className="text-rose-400 font-bold">ব্লকড (Weight &gt; 10kg)</span>
                              : `৳${language === 'bn' ? delivery.toLocaleString('bn-BD') : delivery.toLocaleString()}`}
                          </span>
                        </div>

                        {/* Multi-Shop Weight & Distance Breakdown */}
                        {orderType === 'LOCAL' && shopBreakdowns && shopBreakdowns.length > 0 && (
                          <div className="mt-2.5 p-2.5 bg-slate-800/95 rounded-lg space-y-2 border border-slate-700">
                            <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                              <span className="font-bold text-[11px] text-emerald-400 flex items-center gap-1.5">
                                <span>🛍️</span>
                                {language === 'bn' 
                                  ? `দোকান ও দূরত্ব বিবরণী (${shopBreakdowns.length} টি শপ):` 
                                  : `Shop & Distance Breakdown (${shopBreakdowns.length} shops):`}
                              </span>
                              {shopBreakdowns.length > 1 && (
                                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 font-semibold">
                                  {language === 'bn' ? 'সর্বোচ্চ দূরত্বের দোকান কাউন্ট' : 'Farthest shop counted'}
                                </span>
                              )}
                            </div>

                            {shopBreakdowns.length > 1 && farthestShopInfo && (
                              <div className="text-[11px] text-amber-200/90 bg-amber-950/40 p-2 rounded border border-amber-900/50 leading-relaxed flex items-start gap-1.5">
                                <span className="shrink-0 mt-0.5">ℹ️</span>
                                <span>
                                  {language === 'bn' ? (
                                    <>
                                      একাধিক দোকান থেকে অর্ডারের কারণে সবচেয়ে দূরবর্তী দোকান <strong>{farthestShopInfo.name}</strong> ({farthestShopInfo.distanceKm} কিমি) থেকে ডেলিভারির দূরত্ব কাউন্ট করা হয়েছে।
                                    </>
                                  ) : (
                                    <>
                                      For multi-shop orders, delivery distance is counted from the farthest shop <strong>{farthestShopInfo.name}</strong> ({farthestShopInfo.distanceKm} km).
                                    </>
                                  )}
                                </span>
                              </div>
                            )}

                            <div className="space-y-1.5">
                              {shopBreakdowns.map((sb, i) => (
                                <div
                                  key={`sb-${sb.shopId || 'sb'}-${i}`}
                                  className={`flex items-center justify-between text-[11px] px-2 py-1.5 rounded transition-colors ${
                                    sb.isFarthest
                                      ? 'bg-emerald-950/50 text-emerald-300 font-bold border border-emerald-700/50'
                                      : 'text-slate-300 bg-slate-900/40'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5">
                                    {sb.isFarthest && (
                                      <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500 text-slate-950 rounded font-black tracking-wider uppercase">
                                        {language === 'bn' ? 'সর্বোচ্চ দূরত্ব' : 'Farthest'}
                                      </span>
                                    )}
                                    <span>{sb.shopName}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-400 text-[10px]">({sb.weightKg} kg)</span>
                                    <span className="font-extrabold text-slate-100">{sb.distanceKm} km</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {weightBlockedMsg && (
                          <div className="p-2.5 bg-rose-950/80 border border-rose-600 rounded-lg text-rose-200 text-xs font-bold space-y-1">
                            <p className="flex items-center gap-1.5 text-rose-400">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              🛑 {weightBlockedMsg}
                            </p>
                            <p className="text-[11px] font-normal text-rose-300 leading-tight">
                              কার্টের মোট ওজন ১০ কেজির বেশি হওয়ায় অর্ডারের অটোমেটিক ডেলিভারি সম্ভব নয়। অনুগ্রহ করে কার্ট থেকে ওজনের পরিমাণ কমান।
                            </p>
                          </div>
                        )}

                        <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-extrabold text-white">
                          <span>{language === 'bn' ? 'সর্বমোট প্রদেয় ক্যাশ অন ডেলিভারি (COD):' : 'Total Payable (Cash on Delivery):'}</span>
                          <span className="text-emerald-400 font-black text-base">
                            {weightBlockedMsg ? 'N/A' : `৳${language === 'bn' ? codTotal.toLocaleString('bn-BD') : codTotal.toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="pt-2">
                    {(() => {
                      let delivery = 60; // Default fallback
                      if (orderType === 'LOCAL') {
                        delivery = localDeliveryFee !== null ? localDeliveryFee : 60;
                      } else {
                        delivery = district.toLowerCase().includes('dhaka') ? 60 : 120;
                        if (districtCharges[district] !== undefined) {
                          delivery = districtCharges[district];
                        } else if (districtCharges['dhaka'] !== undefined && district.toLowerCase().includes('dhaka')) {
                          delivery = districtCharges['dhaka'];
                        } else if (districtCharges['outside_dhaka'] !== undefined) {
                          delivery = districtCharges['outside_dhaka'];
                        }
                      }

                      const payableTotalBeforeCoupon = Number(cart?.productPayableTotal ?? cart?.subtotalPayable ?? 0);
                      let couponDiscountAmount = 0;
                      if (appliedCoupon) {
                        if (appliedCoupon.discountType === 'percentage') {
                          couponDiscountAmount = (payableTotalBeforeCoupon * appliedCoupon.discountValue) / 100;
                        } else {
                          couponDiscountAmount = appliedCoupon.discountValue;
                        }
                      }
                      const payableTotal = Math.max(0, payableTotalBeforeCoupon - couponDiscountAmount);
                      const finalCod = payableTotal + delivery;
                      const formattedCod = language === 'bn' ? finalCod.toLocaleString('bn-BD') : finalCod.toLocaleString();
                      return (
                        <>
                          {(() => {
                            const isCourierBlocked = orderType === 'NATIONWIDE' && !isCourierAllowed;
                            const isLocalBlocked = orderType === 'LOCAL' && (latitude === undefined || longitude === undefined || !isWithin20Km || Boolean(rangeBlockedMsg));
                            const isBlocked = checkingOut || Boolean(weightBlockedMsg) || isCourierBlocked || (orderType === 'LOCAL' && (latitude !== undefined && (!isWithin20Km || Boolean(rangeBlockedMsg))));

                            return (
                              <button
                                type="submit"
                                disabled={isBlocked}
                                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                              >
                                {checkingOut ? (
                                  <span className="animate-pulse">
                                    {language === 'bn' ? 'অর্ডার প্রসেস হচ্ছে...' : 'Processing order...'}
                                  </span>
                                ) : weightBlockedMsg ? (
                                  <span>
                                    {language === 'bn' ? 'অর্ডার ব্লকড (ওজন ১০ কেজির বেশি)' : 'Order Blocked (Weight > 10kg)'}
                                  </span>
                                ) : isCourierBlocked ? (
                                  <span>
                                    {language === 'bn' ? 'কুরিয়ার অনুপলব্ধ (শপ ঢাকার বাইরে)' : 'Courier Unavailable (Shops outside Dhaka)'}
                                  </span>
                                ) : orderType === 'LOCAL' && (latitude === undefined || longitude === undefined) ? (
                                  <>
                                    <MapPin className="w-4 h-4" />
                                    {language === 'bn' ? 'ম্যাপ থেকে লোকেশন নির্বাচন করুন' : 'Select location on map first'}
                                  </>
                                ) : orderType === 'LOCAL' && (!isWithin20Km || Boolean(rangeBlockedMsg)) ? (
                                  <span>
                                    {language === 'bn' ? 'লোকাল রাইডার অনুপলব্ধ (২০ কিমির বেশি দূর)' : 'Local Rider Unavailable (>20km)'}
                                  </span>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    {language === 'bn' 
                                      ? `অর্ডার কনফার্ম করুন (ক্যাশ অন ডেলিভারি - ৳${formattedCod})` 
                                      : `Confirm Order (Cash on Delivery - ৳${formattedCod})`}
                                  </>
                                )}
                              </button>
                            );
                          })()}
                          <p className="text-[11px] text-center text-slate-500 mt-2">
                            {language === 'bn' 
                              ? `* পণ্য হাতে পেয়ে সম্পূর্ণ মূল্য (৳${formattedCod}) ডেলিভারি ম্যানের কাছে পরিশোধ করবেন।` 
                              : `* Please pay full amount (৳${formattedCod}) in cash to the delivery courier upon arrival.`}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </form>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <LocationSelectorModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        initialLat={latitude}
        initialLng={longitude}
        onConfirm={(lat, lng, address) => {
          setLatitude(lat);
          setLongitude(lng);
          if (address) setDeliveryAddress(address);
          setShowMapModal(false);
        }}
      />
    </AnimatePresence>
  );
};
