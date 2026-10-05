import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ShoppingBag, Award, Phone, MapPin, Search, AlertCircle, ShoppingCart, Star, MessageSquare, X, RotateCcw } from 'lucide-react';
import { Product, User } from '../types';
import { api } from '../services/api';
import { ProductBuyModal } from './ProductBuyModal';
import { ProductDetailsModal } from './ProductDetailsModal';
import { ShopReviewsModal } from './ShopReviewsModal';
import { toBnNumber } from '../data/prayerConfig';
import { calculateProductRelevance, normalizeSearchText } from '../utils/marketSearch';

interface ShopProductsViewProps {
  shopId: string;
  onBack: () => void;
  onOpenCart?: () => void;
  cartCount?: number;
  currentUser?: User | null;
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const ShopProductsView: React.FC<ShopProductsViewProps> = ({
  shopId,
  onBack,
  onOpenCart,
  cartCount = 0,
  currentUser,
  onShowToast
}) => {
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  useEffect(() => {
    if (shopId) {
      fetchProducts();
    }
  }, [shopId]);

  const fetchProducts = async () => {
    if (!shopId || shopId === 'undefined' || shopId === 'null') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.getShopProducts(shopId);
      if (res && res.success) {
        setShop(res.shop || null);
        setProducts(res.products || []);
      } else {
        setError((res as any)?.message || 'দোকানের পণ্য লোড করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      console.warn('Could not fetch shop products:', err?.message || err);
      setError(err?.message || 'দোকানের পণ্য লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  // Smart search with partial matching and relevance ranking
  const { filteredProducts, matchedCount } = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) {
      return {
        filteredProducts: products,
        matchedCount: products.length
      };
    }

    const shopCtx = shop ? {
      name: shop.name,
      nameBn: shop.nameBn,
      category: shop.category,
      businessType: shop.businessType,
      district: shop.district,
      upazila: shop.upazila,
      area: shop.area
    } : undefined;

    const scored: { product: Product; score: number }[] = [];

    for (const product of products) {
      const { matches, score } = calculateProductRelevance(product, q, shopCtx);
      if (matches) {
        scored.push({ product, score });
      }
    }

    // Sort by relevance score descending
    scored.sort((a, b) => b.score - a.score);

    return {
      filteredProducts: scored.map((s, idx) => s.product),
      matchedCount: scored.length
    };
  }, [products, searchQuery, shop]);

  const handleBuyClick = (product: Product) => {
    setSelectedProduct(product);
    setBuyModalOpen(true);
  };

  const handleProductClick = (product: Product) => {
    setDetailsProduct(product);
    setDetailsModalOpen(true);
  };

  // Get unique categories available in this shop's products
  const shopCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim()) cats.add(p.category.trim());
    });
    return Array.from(cats);
  }, [products]);

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-16">
      {/* Top Navigation & Shop Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
            দোকান তালিকায় ফিরুন
          </button>

          {onOpenCart && (
            <button
              onClick={onOpenCart}
              className="relative flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg transition"
            >
              <ShoppingCart className="w-4 h-4" />
              কার্ট দেখুন
              {cartCount > 0 && (
                <span className="w-5 h-5 bg-emerald-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
          )}
        </div>

        {shop && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div>
              <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-extrabold rounded mb-1">
                পার্টনার শপ
              </span>
              <h2 className="text-xl font-extrabold text-slate-900">{shop.nameBn || shop.name}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {shop.address || `${shop.area}, ${shop.district}`}
                </span>
                {shop.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {shop.phone}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowReviewsModal(true)}
                  className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                  <span>
                    {shop.averageRating && shop.averageRating > 0
                      ? toBnNumber(shop.averageRating.toFixed(1))
                      : toBnNumber('৫.০')}
                  </span>
                  <span className="text-slate-500 font-normal">
                    ({toBnNumber(shop.totalReviews || 0)} রিভিউ)
                  </span>
                  <MessageSquare className="w-3 h-3 text-amber-600 ml-0.5" />
                </button>
              </div>
            </div>

            {/* Token Discount Pills */}
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1.5 bg-amber-50 border border-amber-200/80 rounded-xl text-center">
                <span className="text-[10px] text-amber-700 font-bold block">গোল্ড</span>
                <span className="text-xs font-extrabold text-amber-800">{shop.goldDiscount}% ছাড়</span>
              </div>
              <div className="px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded-xl text-center">
                <span className="text-[10px] text-slate-600 font-bold block">সিলভার</span>
                <span className="text-xs font-extrabold text-slate-800">{shop.silverDiscount}% ছাড়</span>
              </div>
              <div className="px-2.5 py-1.5 bg-orange-50 border border-orange-200/80 rounded-xl text-center">
                <span className="text-[10px] text-orange-700 font-bold block">ব্রোঞ্জ</span>
                <span className="text-xs font-extrabold text-orange-800">{shop.bronzeDiscount}% ছাড়</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Bar with live clear button and result indicator */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="পণ্য বা ব্র্যান্ডের আংশিক নাম লিখুন (যেমন: মধু, পাঞ্জাবি, আতর)..."
            className="w-full pl-10 pr-10 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-xs transition"
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

        {/* Quick search tags or status */}
        <div className="flex items-center justify-between gap-2 px-1 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            {shopCategories.length > 0 && shopCategories.map((cat, idx) => (
              <button
                key={`${cat}-${idx}`}
                type="button"
                onClick={() => setSearchQuery(cat === searchQuery ? '' : cat)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition ${
                  searchQuery.toLowerCase() === cat.toLowerCase()
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {searchQuery.trim() && (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
              {toBnNumber(matchedCount)}টি পণ্য মিলেছে
            </span>
          )}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={`spv-skeleton-${i}`} className="bg-white rounded-xl p-3 border border-slate-100 animate-pulse space-y-2.5">
              <div className="w-full aspect-square bg-slate-100 rounded-lg"></div>
              <div className="h-3 bg-slate-100 rounded w-3/4"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
              <div className="h-8 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 bg-white rounded-2xl border border-rose-100 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">পণ্য লোড করতে ব্যর্থ হয়েছে</h3>
            <p className="text-xs text-rose-600 mt-1">{error}</p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              দোকান তালিকায় ফিরুন
            </button>
            <button
              onClick={fetchProducts}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              আবার চেষ্টা করুন
            </button>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="p-8 bg-white rounded-2xl border border-slate-100 text-center space-y-2">
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">কোনো পণ্য পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-400">এই মুহূর্তে এই দোকানে কোনো পণ্য তালিকাভুক্ত নেই।</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-8 bg-white rounded-2xl border border-slate-100 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              "{searchQuery}" এর সাথে মিলে এমন কোনো পণ্য পাওয়া যায়নি
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              বানান পরিবর্তন করে বা আংশিক শব্দ লিখে আবার চেষ্টা করুন।
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            সকল পণ্য দেখুন ({toBnNumber(products.length)}টি)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredProducts.map((product, idx) => {
            const isAvailable = product.isAvailable;
            return (
              <motion.div
                key={`spv-prod-${product.id || 'p'}-${idx}`}
                layout
                className="bg-white rounded-xl border border-slate-100 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col justify-between"
              >
                <div onClick={() => handleProductClick(product)} className="cursor-pointer group">
                  {/* Product Image Container */}
                  <div className="relative w-full aspect-square bg-slate-50 border-b border-slate-100 flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                    )}
                    {/* Status Badge */}
                    <div className="absolute top-2 right-2">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-extrabold rounded-md shadow-xs ${
                          isAvailable
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-700 text-slate-200'
                        }`}
                      >
                        {isAvailable ? 'উপলব্ধ' : 'অনুপলব্ধ'}
                      </span>
                    </div>
                  </div>

                  {/* Product Meta */}
                  <div className="p-3">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 leading-snug group-hover:text-emerald-600 transition-colors">
                      {product.name}
                    </h3>
                    
                    {/* Discount Tag */}
                    {(() => {
                      const maxDiscount = Math.max(shop?.goldDiscount || 0, shop?.silverDiscount || 0, shop?.bronzeDiscount || 0);
                      return maxDiscount > 0 ? (
                        <div className="mt-1 flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md animate-pulse w-fit">
                          <Award className="w-2.5 h-2.5 text-amber-500" />
                          <span className="text-[8px] font-black text-amber-600">
                            সর্বোচ্চ {toBnNumber(maxDiscount)}% টোকেন ছাড় প্রযোজ্য
                          </span>
                        </div>
                      ) : null;
                    })()}

                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xs font-medium text-slate-500">মূল্য:</span>
                      <span className="text-sm sm:text-base font-extrabold text-slate-900">
                        ৳{Number(product.originalPrice || 0).toLocaleString('bn-BD')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Buy Button */}
                <div className="p-3 pt-0">
                  <button
                    disabled={!isAvailable}
                    onClick={() => handleBuyClick(product)}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {isAvailable ? 'কিনুন' : 'অনুপলব্ধ'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Buy & Token Modal */}
      <ProductBuyModal
        isOpen={buyModalOpen}
        product={selectedProduct}
        shop={shop}
        onClose={() => setBuyModalOpen(false)}
        onOpenCart={onOpenCart}
      />

      {/* Product Details Modal */}
      <ProductDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        product={detailsProduct ? {
          ...detailsProduct,
          goldDiscount: shop?.goldDiscount || 0,
          silverDiscount: shop?.silverDiscount || 0,
          bronzeDiscount: shop?.bronzeDiscount || 0,
          shopName: shop?.nameBn || shop?.name || 'পার্টনার শপ'
        } : null}
        currentUser={currentUser}
        onShowToast={onShowToast || (() => {})}
        onBuyClick={handleBuyClick}
      />

      {/* Shop Reviews Modal */}
      {showReviewsModal && shop && (
        <ShopReviewsModal
          isOpen={showReviewsModal}
          onClose={() => setShowReviewsModal(false)}
          shop={shop}
          currentUser={currentUser}
          onShowToast={onShowToast || (() => {})}
          onReviewUpdated={fetchProducts}
        />
      )}
    </div>
  );
};
