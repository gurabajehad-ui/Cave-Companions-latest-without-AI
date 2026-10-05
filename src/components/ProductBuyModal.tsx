import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, X, Check, Award, AlertCircle, ShoppingCart, ArrowRight } from 'lucide-react';
import { Product, UserToken } from '../types';
import { api } from '../services/api';
import { toBnNumber } from '../data/prayerConfig';
import { useLanguage } from '../context/LanguageContext';

interface ProductBuyModalProps {
  product: Product | null;
  shop: {
    id: string;
    name: string;
    nameBn?: string;
    goldDiscount?: number;
    silverDiscount?: number;
    bronzeDiscount?: number;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCartSuccess?: () => void;
  onOpenCart?: () => void;
}

export const ProductBuyModal: React.FC<ProductBuyModalProps> = ({
  product,
  shop,
  isOpen,
  onClose,
  onAddToCartSuccess,
  onOpenCart
}) => {
  const { language } = useLanguage();
  const formatNum = (val: number | string) => language === 'bn' ? toBnNumber(val) : String(val);

  const [tokens, setTokens] = useState<UserToken[]>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedSuccess, setAddedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setAddedSuccess(false);
      setQuantity(1);
      setSelectedTokenId(null);
      fetchAvailableTokens();
    }
  }, [isOpen, product]);

  const fetchAvailableTokens = async () => {
    setLoading(true);
    try {
      const res = await api.getMyTokens();
      if (res && res.availableTokens) {
        setTokens(res.availableTokens);
      }
    } catch (err) {
      console.error('Failed to load user tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product || !shop) return null;

  const originalPrice = product.originalPrice || 0;
  const goldDiscount = Number(shop.goldDiscount) || 0;
  const silverDiscount = Number(shop.silverDiscount) || 0;
  const bronzeDiscount = Number(shop.bronzeDiscount) || 0;

  const selectedToken = tokens.find(t => t.id === selectedTokenId);
  const isSelectedTokenDonated = selectedToken?.isDonated === true;
  let discountRate = 0;
  if (selectedToken && !isSelectedTokenDonated) {
    if (selectedToken.tokenType === 'GOLD') discountRate = goldDiscount;
    else if (selectedToken.tokenType === 'SILVER') discountRate = silverDiscount;
    else if (selectedToken.tokenType === 'BRONZE') discountRate = bronzeDiscount;
  }

  // Calculate normal discount for donation preview
  let normalDiscountRate = 0;
  if (selectedToken) {
    if (selectedToken.tokenType === 'GOLD') normalDiscountRate = goldDiscount;
    else if (selectedToken.tokenType === 'SILVER') normalDiscountRate = silverDiscount;
    else if (selectedToken.tokenType === 'BRONZE') normalDiscountRate = bronzeDiscount;
  }

  const unitDiscount = (originalPrice * discountRate) / 100;
  const finalUnitPrice = originalPrice - unitDiscount;
  const totalOriginal = originalPrice * quantity;
  const totalDiscount = unitDiscount * quantity;
  const totalPayable = finalUnitPrice * quantity;

  const totalDonationAmount = isSelectedTokenDonated ? ((originalPrice * normalDiscountRate) / 100) * quantity : 0;

  const handleAddToCart = async () => {
    setAddingToCart(true);
    setError(null);
    try {
      await api.addToCart({
        productId: product.id,
        quantity,
        tokenId: selectedTokenId || undefined
      });
      setAddedSuccess(true);
      if (onAddToCartSuccess) onAddToCartSuccess();
    } catch (err: any) {
      setError(err.message || (language === 'bn' ? 'কার্টে পণ্য যোগ করতে ব্যর্থ হয়েছে।' : 'Failed to add product to cart.'));
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {language === 'bn' ? 'পণ্য নির্বাচন ও টোকেন ডিসকাউন্ট' : 'Product Selection & Token Discount'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {language === 'bn' ? (shop.nameBn || shop.name) : (shop.name || shop.nameBn)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-5">
            {addedSuccess ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">
                    {language === 'bn' ? 'পণ্যটি কার্টে সফলভাবে যুক্ত হয়েছে!' : 'Product successfully added to cart!'}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                    {language === 'bn' 
                      ? 'আপনি চাইলে আরও পণ্য কার্টে যোগ করতে পারেন অথবা এখনই চেকআউট করতে পারেন।' 
                      : 'You can continue shopping to add more items or checkout right away.'}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-3 justify-center">
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition cursor-pointer"
                  >
                    {language === 'bn' ? 'আরো কেনাকাটা করুন' : 'Continue Shopping'}
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenCart) onOpenCart();
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {language === 'bn' ? 'কার্ট দেখুন ও অর্ডার করুন' : 'View Cart & Checkout'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Product Summary Card */}
                <div className="flex gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 items-center">
                  <div className="w-20 h-20 bg-white rounded-lg border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <ShoppingBag className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded mb-1">
                      {product.isAvailable 
                        ? (language === 'bn' ? 'স্টকে আছে' : 'In Stock') 
                        : (language === 'bn' ? 'স্টক শেষ' : 'Out of Stock')}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 truncate">{product.name}</h4>
                    {product.description && (
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{product.description}</p>
                    )}
                    <div className="text-sm font-extrabold text-slate-900 mt-1">
                      {language === 'bn' ? 'মূল্য:' : 'Price:'} ৳{formatNum(Number(originalPrice || 0).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US'))}
                    </div>
                  </div>
                </div>

                {/* Token Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {language === 'bn' ? 'টোকেন ডিসকাউন্ট প্রয়োগ করুন (ঐচ্ছিক)' : 'Apply Token Discount (Optional)'}
                  </label>

                  {loading ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      {language === 'bn' ? 'টোকেন চেক করা হচ্ছে...' : 'Checking tokens...'}
                    </div>
                  ) : tokens.length === 0 ? (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-xs text-amber-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        {language === 'bn' 
                          ? 'আপনার কাছে বর্তমানে কোনো অব্যবহৃত রিওয়ার্ড টোকেন নেই। রেগুলার মূল্যে অর্ডার করতে পারেন।' 
                          : 'You currently have no available reward tokens. You can still order at regular price.'}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* No token option */}
                      <button
                        type="button"
                        onClick={() => setSelectedTokenId(null)}
                        className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                          selectedTokenId === null
                            ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedTokenId === null ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'}`}>
                            {selectedTokenId === null && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {language === 'bn' ? 'কোনো টোকেন ব্যবহার করব না' : 'Do not use any token'}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {language === 'bn' ? 'রেগুলার মূল্য প্রযোজ্য হবে' : 'Regular price will apply'}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-700">৳{formatNum(originalPrice)}</span>
                      </button>

                      {/* Available Tokens */}
                      {tokens.map((token, idx) => {
                        let tokenRate = 0;
                        let tokenColor = 'amber';
                        let tokenLabel = language === 'bn' ? 'গোল্ড টোকেন' : 'Gold Token';

                        if (token.tokenType === 'GOLD') {
                          tokenRate = goldDiscount;
                          tokenColor = 'amber';
                          tokenLabel = language === 'bn' ? 'গোল্ড টোকেন' : 'Gold Token';
                        } else if (token.tokenType === 'SILVER') {
                          tokenRate = silverDiscount;
                          tokenColor = 'slate';
                          tokenLabel = language === 'bn' ? 'সিলভার টোকেন' : 'Silver Token';
                        } else if (token.tokenType === 'BRONZE') {
                          tokenRate = bronzeDiscount;
                          tokenColor = 'orange';
                          tokenLabel = language === 'bn' ? 'ব্রোঞ্জ টোকেন' : 'Bronze Token';
                        }

                        const userDiscountRate = token.isDonated ? 0 : tokenRate;
                        const calcUnitDiscount = (originalPrice * userDiscountRate) / 100;
                        const calcFinalPrice = originalPrice - calcUnitDiscount;
                        const isSelected = selectedTokenId === token.id;

                        return (
                          <button
                            key={`pbm-tok-${token.id || 'tok'}-${idx}`}
                            type="button"
                            onClick={() => setSelectedTokenId(token.id)}
                            className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-2 cursor-pointer ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="w-full flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'}`}>
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <Award className={`w-5 h-5 ${tokenColor === 'amber' ? 'text-amber-500' : tokenColor === 'orange' ? 'text-orange-500' : 'text-slate-400'}`} />
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-slate-900">{tokenLabel}</span>
                                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded">
                                      {formatNum(tokenRate)}% {language === 'bn' ? 'ছাড়' : 'Discount'}
                                    </span>
                                    {token.isDonated && (
                                      <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 text-[9px] font-black rounded border border-rose-200 animate-pulse">
                                        {language === 'bn' ? 'দান করার জন্য বাছাইকৃত' : 'Selected for Donation'}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-emerald-700 font-medium">
                                    {token.isDonated 
                                      ? (language === 'bn' ? 'এই টোকেনের ডিসকাউন্টটি সরাসরি কল্যাণ তহবিলে দান হবে' : 'Discount will be donated to Welfare Fund') 
                                      : (language === 'bn' ? `ছাড়: ৳${formatNum(calcUnitDiscount.toFixed(0))} / ইউনিট` : `Discount: ৳${formatNum(calcUnitDiscount.toFixed(0))} / unit`)
                                    }
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-extrabold text-emerald-700">৳{formatNum(calcFinalPrice.toFixed(0))}</span>
                                <span className="text-[10px] text-slate-400 line-through block">৳{formatNum(originalPrice)}</span>
                              </div>
                            </div>
                            {token.isDonated && (
                              <div className="text-[10px] text-rose-600 font-bold pl-7 flex items-center gap-1 bg-rose-50/60 p-1.5 rounded-lg border border-rose-100/50">
                                {language === 'bn' 
                                  ? '❤️ এই টোকেনটি ব্যবহার করলে ডিসকাউন্ট সরাসরি কল্যাণ তহবিলে চলে যাবে (আপনি রেগুলার মূল্যে কিনবেন)।' 
                                  : '❤️ Using this token will donate the discount directly to the Welfare Fund (you pay regular price).'}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quantity Selector */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">{language === 'bn' ? 'পরিমাণ:' : 'Quantity:'}</span>
                  <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-2 py-1">
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-slate-900">{formatNum(quantity)}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Summary calculation */}
                <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>{language === 'bn' ? 'পণ্যের রেগুলার মূল্য:' : 'Product Regular Price:'}</span>
                    <span>৳{formatNum(Number(totalOriginal || 0).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US'))}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>{language === 'bn' ? `টোকেন ডিসকাউন্ট (${formatNum(discountRate)}%):` : `Token Discount (${formatNum(discountRate)}%):`}</span>
                      <span>- ৳{formatNum(Number(totalDiscount || 0).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US'))}</span>
                    </div>
                  )}
                  {totalDonationAmount > 0 && (
                    <div className="flex justify-between text-rose-400 font-semibold">
                      <span>{language === 'bn' ? `কল্যাণ তহবিলে দানকৃত (${formatNum(normalDiscountRate)}%):` : `Donated to Welfare Fund (${formatNum(normalDiscountRate)}%):`}</span>
                      <span>৳{formatNum(Number(totalDonationAmount || 0).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US'))} ❤️</span>
                    </div>
                  )}
                  <div className="border-t border-slate-800 pt-1.5 flex justify-between text-sm font-bold text-white">
                    <span>{language === 'bn' ? 'প্রদেয় পণ্যের মূল্য:' : 'Payable Product Price:'}</span>
                    <span className="text-emerald-400 font-extrabold">৳{formatNum(Number(totalPayable || 0).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US'))}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 pt-1">
                    {language === 'bn' 
                      ? `* চেকআউট করার সময় স্ট্যান্ডার্ড ডেলিভারি চার্জ (৳${formatNum(60)}) যোগ হবে।` 
                      : `* Standard delivery fee (৳${formatNum(60)}) will be added during checkout.`}
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Add to Cart CTA */}
                <button
                  type="button"
                  disabled={addingToCart || !product.isAvailable}
                  onClick={handleAddToCart}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {addingToCart ? (
                    <span className="animate-pulse">{language === 'bn' ? 'কার্টে যোগ হচ্ছে...' : 'Adding to cart...'}</span>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      {language === 'bn' ? 'কার্টে যোগ করুন' : 'Add to Cart'}
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
