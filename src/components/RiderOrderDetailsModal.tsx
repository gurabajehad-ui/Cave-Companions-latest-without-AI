import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  MapPin, 
  Phone, 
  ShoppingBag, 
  User, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  Navigation, 
  Scale, 
  Info,
  Map,
  ArrowRight
} from 'lucide-react';
import { toBnNumber } from '../data/prayerConfig';

interface RiderOrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onAccept: (orderId: string) => void;
  onDecline?: (orderId: string) => void;
  isAccepting?: boolean;
  currentCoords?: { lat: number; lng: number } | null;
}

export const RiderOrderDetailsModal: React.FC<RiderOrderDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
  onAccept,
  onDecline,
  isAccepting = false,
  currentCoords
}) => {
  if (!isOpen || !order) return null;

  // Group items by shop for multi-shop separation
  const shopGroupMap: { [key: string]: any } = {};
  const itemsList = order.items || [];

  itemsList.forEach((item: any) => {
    const shopId = item.shopId || 'unknown_shop';
    if (!shopGroupMap[shopId]) {
      shopGroupMap[shopId] = {
        shopId: shopId,
        shopName: item.shopNameBn || item.shopName || 'মার্চেন্ট শপ',
        shopAddress: item.shopAddress || 'ঠিকানা পাওয়া যায়নি',
        shopPhone: item.shopPhone || '',
        shopArea: item.shopArea || '',
        shopDistrict: item.shopDistrict || '',
        shopLatitude: Number(item.shopLatitude) || 0,
        shopLongitude: Number(item.shopLongitude) || 0,
        items: []
      };
    }
    shopGroupMap[shopId].items.push(item);
  });

  const shopGroups = Object.values(shopGroupMap);

  // Calculate total order weight in kg
  const totalWeight = itemsList.reduce((acc: number, item: any) => {
    const weight = Number(item.weightKg) || 0.5; // default 500g
    const qty = Number(item.quantity) || 1;
    return acc + (weight * qty);
  }, 0);

  // Format weight to fixed decimal
  const formattedWeight = totalWeight.toFixed(2);

  // Check if destination address is potentially incomplete or test data
  const isAddressSuspicious = (addr: string) => {
    if (!addr) return true;
    const clean = addr.trim().toLowerCase();
    return (
      clean.length < 8 || 
      clean === 'hjv' || 
      clean === 'test' || 
      clean === 'abc' || 
      clean.includes('demo') ||
      clean === 'dhk'
    );
  };

  const addressWarning = isAddressSuspicious(order.deliveryAddress);

  // Google Maps Direction links
  const getShopMapLink = (shop: any) => {
    if (shop.shopLatitude && shop.shopLongitude) {
      if (currentCoords) {
        return `https://www.google.com/maps/dir/?api=1&origin=${currentCoords.lat},${currentCoords.lng}&destination=${shop.shopLatitude},${shop.shopLongitude}&travelmode=driving`;
      }
      return `https://www.google.com/maps/search/?api=1&query=${shop.shopLatitude},${shop.shopLongitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.shopName + ' ' + shop.shopAddress)}`;
  };

  const getCustomerMapLink = () => {
    if (order.latitude && order.longitude) {
      if (currentCoords) {
        return `https://www.google.com/maps/dir/?api=1&origin=${currentCoords.lat},${currentCoords.lng}&destination=${order.latitude},${order.longitude}&travelmode=driving`;
      }
      return `https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-h-[92vh] sm:max-h-[85vh] sm:max-w-xl bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0 bg-slate-900/90 z-10 sticky top-0 backdrop-blur">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-base font-black text-white">অর্ডারের সম্পূর্ণ বিবরণ</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
            
            {/* Earning & Distance Overview Card */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-950 border border-emerald-500/25">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">আপনার রাইডার ফি</span>
                <p className="text-2xl font-black text-emerald-300">৳ {toBnNumber(order.riderFee || 40)}</p>
                <span className="text-[9px] text-slate-500 font-medium">নিট ওয়ালেট জমা</span>
              </div>
              <div className="border-l border-slate-800 pl-4 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">মোট ডেলিভারি দূরত্ব</span>
                <p className="text-xl font-black text-white">{toBnNumber(order.totalDeliveryDistanceKm || 2.5)} কি.মি.</p>
                {order.pickupDistanceKm !== undefined && order.pickupDistanceKm > 0 && (
                  <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                    <Navigation className="w-2.5 h-2.5 rotate-45" />
                    পিকআপ দূরত্ব: {toBnNumber(order.pickupDistanceKm)} কি.মি.
                  </span>
                )}
              </div>
            </div>

            {/* Suspicious Destination Address Alert Guard */}
            {addressWarning && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold">⚠️ সতর্কতামূলক নোটিশ:</span>
                  <p className="text-slate-300 leading-relaxed">
                    এই অর্ডারের গন্তব্য ঠিকানাটি অত্যন্ত অসম্পূর্ণ (যেমন: <strong className="text-amber-300">"{order.deliveryAddress}"</strong>)। অনুগ্রহ করে অর্ডারটি গ্রহণ করার পূর্বে ম্যাপ ডিরেকশন দেখে নিন অথবা গ্রাহকের সাথে যোগাযোগ করে সঠিক লোকেশন নিশ্চিত হোন।
                  </p>
                </div>
              </div>
            )}

            {/* Customer Information Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                <h4 className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  গ্রাহকের তথ্য
                </h4>
                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                  গন্তব্যস্থল
                </span>
              </div>

              <div className="text-xs space-y-3">
                <div className="space-y-1">
                  <p className="font-bold text-white text-sm">{order.customerName || 'গ্রাহক'}</p>
                  <p className="text-slate-300 flex items-start gap-1.5 leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{order.fullAddress || order.deliveryAddress}</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-800/40">
                  {order.customerPhone && (
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 font-bold transition text-[11px]"
                    >
                      <Phone className="w-3 h-3" />
                      কল করুন ({order.customerPhone})
                    </a>
                  )}
                  <a
                    href={getCustomerMapLink()}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-bold transition text-[11px]"
                  >
                    <Map className="w-3 h-3" />
                    ম্যাপে গন্তব্য দেখুন
                  </a>
                </div>
              </div>
            </div>

            {/* Multi-Shop Separated List of Merchants & Items */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold text-slate-400 px-1 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                মার্চেন্ট শপ ও পণ্যসমূহ ({toBnNumber(shopGroups.length)}টি শপ)
              </h4>

              {shopGroups.map((shop: any, sIdx: number) => (
                <div 
                  key={`${shop.shopId || 'shop'}-${sIdx}`} 
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3"
                >
                  {/* Shop Details Header */}
                  <div className="flex items-start justify-between border-b border-slate-800/60 pb-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        শপ #{sIdx + 1}
                      </span>
                      <h5 className="font-bold text-white text-sm mt-1">{shop.shopName}</h5>
                      <p className="text-[11px] text-slate-400 flex items-start gap-1 leading-relaxed mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{shop.shopAddress}</span>
                      </p>
                    </div>
                  </div>

                  {/* Itemized List for this Shop */}
                  <div className="space-y-2 pt-1">
                    {shop.items.map((item: any, iIdx: number) => (
                      <div 
                        key={`rodm-item-${item.id || 'itm'}-${iIdx}`} 
                        className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/40 last:border-0"
                      >
                        <div className="space-y-0.5 pr-2">
                          <p className="font-semibold text-slate-200">{item.productName}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span>পরিমাণ: {toBnNumber(item.quantity)} টি</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-slate-400">
                              <Scale className="w-3 h-3 text-slate-500" />
                              ওজন: {toBnNumber(item.weightKg || 0.5)} কেজি
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-slate-300">৳ {toBnNumber(item.customerProductPayable)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Shop Maps/Directions & Phone Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/40 text-[11px]">
                    {shop.shopPhone && (
                      <a
                        href={`tel:${shop.shopPhone}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                      >
                        <Phone className="w-3 h-3 text-emerald-400" />
                        শপে কল দিন
                      </a>
                    )}
                    <a
                      href={getShopMapLink(shop)}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 font-bold transition"
                    >
                      <Navigation className="w-3 h-3 rotate-45 text-emerald-400" />
                      শপের লোকেশন ম্যাপ
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Aggregate Weight & Product Metrics Overview */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800/40 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-500" />
                মোট আনুমানিক পার্সেল ওজন:
              </span>
              <span className="font-extrabold text-white text-sm">{toBnNumber(formattedWeight)} কেজি</span>
            </div>

            {/* Bill Payment / Cash Collection Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3.5">
              <h4 className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                বিল ও ক্যাশ কালেকশন
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>পণ্য উপমোট:</span>
                  <span>৳ {toBnNumber(order.productTotalPayable || order.totalCodAmount - (order.deliveryCharge || 40))}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ডেলিভারি চার্জ:</span>
                  <span>৳ {toBnNumber(order.deliveryCharge || 40)}</span>
                </div>
                {order.couponDiscountAmount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>কুপন ডিসকাউন্ট:</span>
                    <span>- ৳ {toBnNumber(order.couponDiscountAmount)}</span>
                  </div>
                )}
                
                <div className="h-px bg-slate-800/60 my-2" />

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <div className="space-y-0.5">
                    <span className="font-black text-white text-xs">গ্রাহকের কাছ থেকে আদায়যোগ্য (COD):</span>
                    <p className="text-[10px] text-slate-400">পণ্য হাতে দিয়ে এই মূল্য ক্যাশে বুঝে নেবেন।</p>
                  </div>
                  <span className="text-xl font-black text-emerald-400 shrink-0">
                    ৳ {toBnNumber(order.totalCodAmount || 0)}
                  </span>
                </div>

                <div className="pt-1 text-[10px] text-slate-500 flex items-center gap-1 justify-center">
                  <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>রাইডার ফি সরাসরি আপনার ওয়ালেট ব্যালেন্সে ইনস্ট্যান্ট জমা হবে।</span>
                </div>
              </div>
            </div>

          </div>

          {/* Sticky Modal Footer Actions */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0 flex gap-3">
            {onDecline && (
              <button
                onClick={() => {
                  onDecline(order.id);
                  onClose();
                }}
                className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 font-bold text-xs transition"
              >
                বাতিল করুন
              </button>
            )}
            <button
              onClick={() => {
                onAccept(order.id);
                onClose();
              }}
              disabled={isAccepting}
              className="flex-[2] py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950 disabled:opacity-50"
            >
              {isAccepting ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>ডেলিভারি গ্রহণ করুন</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
