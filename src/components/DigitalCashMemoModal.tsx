import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Receipt,
  X,
  Printer,
  Copy,
  Check,
  Store,
  User as UserIcon,
  CheckCircle2,
  Sparkles,
  HeartHandshake,
  Building2,
  Calendar,
  Phone,
  MapPin,
  ShoppingBag,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import { AppLogo } from './AppLogo';
import { UserRedemptionRecord, Order, TokenType } from '../types';
import { toBnNumber } from '../data/prayerConfig';
import { useLanguage } from '../context/LanguageContext';

interface DigitalCashMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  redemption?: UserRedemptionRecord | any;
  order?: Order | any;
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const DigitalCashMemoModal: React.FC<DigitalCashMemoModalProps> = ({
  isOpen,
  onClose,
  redemption,
  order,
  onShowToast
}) => {
  const { language } = useLanguage();
  const formatNum = (val: number | string) => language === 'bn' ? toBnNumber(val) : String(val);

  const [copied, setCopied] = useState(false);
  const memoRef = useRef<HTMLDivElement>(null);

  if (!isOpen || (!redemption && !order)) return null;

  const isRedemption = !!redemption;

  // Format date helper
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return language === 'bn' ? 'তারিখ পাওয়া যায়নি' : 'Date not found';
    try {
      const d = new Date(dateStr);
      if (language === 'en') {
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      const months = [
        'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
      ];
      const day = toBnNumber(d.getDate());
      const month = months[d.getMonth()];
      const year = toBnNumber(d.getFullYear());
      
      let hours = d.getHours();
      const minutes = toBnNumber(d.getMinutes().toString().padStart(2, '0'));
      const period = hours >= 12 ? 'বিকাল/রাত' : 'সকাল';
      if (hours > 12) hours -= 12;
      if (hours === 0) hours = 12;
      const hoursBn = toBnNumber(hours);

      return `${day} ${month}, ${year} • ${period} ${hoursBn}:${minutes}`;
    } catch {
      return dateStr;
    }
  };

  // Calculations for Redemption
  const purchaseAmount = Number(redemption?.purchaseAmount || redemption?.billAmount || 0);
  const discountPercent = Number(redemption?.discountPercentage || redemption?.discountPercent || 0);
  const discountAmount = Number(redemption?.discountAmount || (purchaseAmount * discountPercent) / 100);
  const isDonated = !!redemption?.isDonated;
  const donatedAmount = isDonated ? Number(redemption?.donatedAmount || discountAmount) : 0;
  const finalPayable = isDonated ? purchaseAmount : Math.max(0, purchaseAmount - discountAmount);
  const tokenType: TokenType = redemption?.tokenType || 'GOLD';

  // Calculations for Order
  const orderSubtotal = Number(order?.productTotalOriginal || order?.totalOriginalPrice || order?.totalAmount || 0);
  const deliveryCharge = Number(order?.deliveryCharge || 0);
  const grandTotal = Number(order?.totalPayable || order?.totalCodAmount || order?.grandTotal || 0);
  const orderDiscount = Number(order?.productTotalDiscount || order?.totalTokenDiscount || order?.totalDiscount || 0);
  const couponDiscountAmount = Number(order?.couponDiscountAmount || 0);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    let summary = '';
    if (isRedemption) {
      summary = language === 'bn' ? (
        `🧾 [Cave Companions ডিজিটাল ক্যাশ মেমো]\n` +
        `মেমো নং: MEMO-${redemption.id || 'N/A'}\n` +
        `তারিখ: ${formatDateTime(redemption.redeemedAt || redemption.createdAt)}\n` +
        `দোকান: ${redemption.shopName || 'পার্টনার শপ'}\n` +
        `গ্রাহক: ${redemption.userName || 'সম্মানিত গ্রাহক'}\n` +
        `মোট বিল: ৳${toBnNumber(purchaseAmount)}\n` +
        `সালাত ডিসকাউন্ট (${toBnNumber(discountPercent)}%): -৳${toBnNumber(discountAmount)}\n` +
        (isDonated ? `মসজিদ ফান্ডে দান: ৳${toBnNumber(donatedAmount)}\n` : '') +
        `পরিশোধযোগ্য বিল: ৳${toBnNumber(finalPayable)}\n` +
        `-- সালাত কায়েম করুন, হালাল বরকত অর্জন করুন --`
      ) : (
        `🧾 [Cave Companions Digital Cash Memo]\n` +
        `Memo No: MEMO-${redemption.id || 'N/A'}\n` +
        `Date: ${formatDateTime(redemption.redeemedAt || redemption.createdAt)}\n` +
        `Shop: ${redemption.shopName || 'Partner Shop'}\n` +
        `Customer: ${redemption.userName || 'Valued Customer'}\n` +
        `Total Bill: ৳${purchaseAmount}\n` +
        `Salat Discount (${discountPercent}%): -৳${discountAmount}\n` +
        (isDonated ? `Mosque Fund Donation: ৳${donatedAmount}\n` : '') +
        `Payable Bill: ৳${finalPayable}\n` +
        `-- Establish prayer, attain halal barakah --`
      );
    } else {
      summary = language === 'bn' ? (
        `🧾 [Cave Companions অনলাইন অর্ডার ইনভয়েস]\n` +
        `ইনভয়েস নং: INV-${order.id || 'N/A'}\n` +
        `তারিখ: ${formatDateTime(order.createdAt)}\n` +
        `গ্রাহক: ${order.customerName} (${order.customerPhone})\n` +
        `ঠিকানা: ${order.deliveryAddress}, ${order.upazila || ''}, ${order.district || ''}\n` +
        `আইটেম সংখ্যা: ${order.items?.length || 1}টি\n` +
        `পণ্যের মূল্য: ৳${toBnNumber(orderSubtotal)}\n` +
        `ডেলিভারি চার্জ: ৳${toBnNumber(deliveryCharge)}\n` +
        `সর্বমোট প্রদেয় (COD): ৳${toBnNumber(grandTotal)}\n` +
        `-- Cave Companions হালাল মার্কেটপ্লেস --`
      ) : (
        `🧾 [Cave Companions Online Order Invoice]\n` +
        `Invoice No: INV-${order.id || 'N/A'}\n` +
        `Date: ${formatDateTime(order.createdAt)}\n` +
        `Customer: ${order.customerName} (${order.customerPhone})\n` +
        `Address: ${order.deliveryAddress}, ${order.upazila || ''}, ${order.district || ''}\n` +
        `Items: ${order.items?.length || 1}\n` +
        `Subtotal: ৳${orderSubtotal}\n` +
        `Delivery Charge: ৳${deliveryCharge}\n` +
        `Total Payable (COD): ৳${grandTotal}\n` +
        `-- Cave Companions Halal Marketplace --`
      );
    }

    navigator.clipboard.writeText(summary);
    setCopied(true);
    if (onShowToast) {
      onShowToast('success', language === 'bn' ? 'কপি সম্পন্ন' : 'Copied', language === 'bn' ? 'ক্যাশ মেমোর বিবরণ সফলভাবে কপি হয়েছে।' : 'Cash memo details copied successfully.');
    }
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-memo, #printable-memo * {
            visibility: visible;
          }
          #printable-memo {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-xl bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Modal Top Bar (Screen Only) */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {isRedemption 
                  ? (language === 'bn' ? 'ডিজিটাল ক্যাশ মেমো' : 'Digital Cash Memo') 
                  : (language === 'bn' ? 'অনলাইন ক্যাশ ইনভয়েস' : 'Online Cash Invoice')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isRedemption 
                  ? (language === 'bn' ? 'অফলাইন পার্টনার শপ লেনদেনের অফিসিয়াল রসিদ' : 'Official partner shop transaction receipt') 
                  : (language === 'bn' ? 'ক্যাশ অন ডেলিভারি (COD) ভেরিফাইড রসিদ' : 'Cash On Delivery (COD) verified receipt')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="memo-print-btn"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              title={language === 'bn' ? 'প্রিন্ট বা PDF সেভ করুন' : 'Print or save as PDF'}
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{language === 'bn' ? 'প্রিন্ট / PDF' : 'Print / PDF'}</span>
            </button>

            <button
              id="memo-copy-btn"
              onClick={handleCopyText}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title={language === 'bn' ? 'মেমোর টেক্সট কপি করুন' : 'Copy memo text'}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              id="close-memo-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Memo Container */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5">
          <div
            id="printable-memo"
            ref={memoRef}
            className="bg-white text-slate-900 p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-sm space-y-5"
          >
            {/* Header / Brand */}
            <div className="flex items-start justify-between border-b-2 border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <AppLogo className="w-12 h-12 rounded-xl border border-amber-500/30 shrink-0 bg-slate-950 flex items-center justify-center p-0.5" />
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                    Cave Companions
                    <ShieldCheck className="w-4 h-4 text-emerald-600 inline shrink-0" />
                  </h1>
                  <p className="text-[11px] font-bold text-amber-600">
                    {isRedemption 
                      ? (language === 'bn' ? 'অফলাইন পার্টনার শপ ডিজিটাল ক্যাশ মেমো' : 'Offline Partner Shop Digital Cash Memo')
                      : (language === 'bn' ? 'অনলাইন ক্যাশ অন ডেলিভারি (COD) ইনভয়েস' : 'Online Cash on Delivery (COD) Invoice')}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {language === 'bn' ? 'হালাল জীবন ও বরকতময় কেনাকাটার প্ল্যাটফর্ম' : 'Platform for Halal Living & Blessed Shopping'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-extrabold rounded-md uppercase tracking-wider mb-1 border border-emerald-200">
                  {language === 'bn' ? 'ভেরিফাইড রসিদ' : 'Verified Receipt'}
                </span>
                <p className="text-[11px] font-bold text-slate-700">
                  {language === 'bn' ? 'রসিদ নং:' : 'Receipt No:'} #{formatNum(isRedemption ? (redemption.id?.slice(0, 10) || 'N/A') : (order.id?.slice(0, 10) || 'N/A'))}
                </p>
              </div>
            </div>

            {/* Date & Meta Info Row */}
            <div className="grid grid-cols-2 gap-3 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <p className="text-slate-500 font-medium">
                  {language === 'bn' ? 'ইস্যু তারিখ ও সময়:' : 'Issue Date & Time:'}
                </p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {formatDateTime(isRedemption ? (redemption.redeemedAt || redemption.createdAt) : order.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 font-medium">
                  {language === 'bn' ? 'পেমেন্ট মেথড:' : 'Payment Method:'}
                </p>
                <p className="font-bold text-emerald-700 mt-0.5">
                  {isRedemption 
                    ? (language === 'bn' ? 'দোকানে সরাসরি নগদ (Cash at Shop)' : 'Cash at Shop') 
                    : (language === 'bn' ? 'ক্যাশ অন ডেলিভারি (COD)' : 'Cash On Delivery (COD)')}
                </p>
              </div>
            </div>

            {/* Customer & Merchant/Delivery Details Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Customer Info */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-1 pb-1 border-b border-slate-200">
                  <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>{language === 'bn' ? 'সম্মানিত গ্রাহকের বিবরণ' : 'Customer Details'}</span>
                </div>
                <p className="font-bold text-slate-900 text-sm">
                  {isRedemption 
                    ? (redemption.userName || (language === 'bn' ? 'সম্মানিত গ্রাহক' : 'Valued Customer')) 
                    : (order.customerName || (language === 'bn' ? 'সম্মানিত গ্রাহক' : 'Valued Customer'))}
                </p>
                <p className="text-slate-600 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {isRedemption ? formatNum(redemption.userPhone || 'N/A') : formatNum(order.customerPhone || 'N/A')}
                </p>
                {!isRedemption && order.deliveryAddress && (
                  <p className="text-slate-600 flex items-start gap-1 text-[11px] mt-1 leading-snug">
                    <MapPin className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                    <span>{order.deliveryAddress}, {order.upazila ? `${order.upazila}, ` : ''}{order.district || ''}</span>
                  </p>
                )}
              </div>

              {/* Shop / Partner Info */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-1 pb-1 border-b border-slate-200">
                  <Store className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isRedemption ? (language === 'bn' ? 'পার্টনার শপ বিবরণ' : 'Partner Shop Details') : (language === 'bn' ? 'মার্কেটপ্লেস অর্ডার তথ্য' : 'Marketplace Order Info')}</span>
                </div>
                {isRedemption ? (
                  <>
                    <p className="font-bold text-slate-900 text-sm">
                      {redemption.shopName || (language === 'bn' ? 'পার্টনার শপ' : 'Partner Shop')}
                    </p>
                    {redemption.shopAddress && (
                      <p className="text-slate-600 text-[11px] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {redemption.shopAddress}
                      </p>
                    )}
                    {redemption.earnedMosqueName && (
                      <p className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1 pt-0.5">
                        <Building2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        {language === 'bn' ? 'মসজিদ:' : 'Mosque:'} {redemption.earnedMosqueName}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-bold text-slate-900 text-sm">Cave Companions Marketplace</p>
                    <p className="text-slate-600 text-[11px]">
                      {language === 'bn' ? 'অর্ডার স্ট্যাটাস:' : 'Order Status:'}{' '}
                      <span className="font-bold text-emerald-700">
                        {order.status === 'PENDING' 
                          ? (language === 'bn' ? 'অপেক্ষমান' : 'Pending') 
                          : order.status === 'DELIVERED' 
                          ? (language === 'bn' ? 'ডেলিভারি সম্পন্ন' : 'Delivered') 
                          : order.status}
                      </span>
                    </p>
                    <p className="text-slate-600 text-[11px]">
                      {language === 'bn' ? `মোট আইটেম: ${formatNum(order.items?.length || 1)}টি` : `Total Items: ${formatNum(order.items?.length || 1)}`}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Rider Verification Codes for Marketplace Orders */}
            {!isRedemption && order && order.deliveryOtp && (
              <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>{language === 'bn' ? 'ডেলিভারি যাচাইকরণ কোড (Delivery Verification Code)' : 'Delivery Verification Code'}</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  {language === 'bn' 
                    ? 'পণ্য গ্রহণের সময় রাইডারকে নিচের ডেলিভারি কোডটি প্রদান করুন:' 
                    : 'Provide the following delivery code to the rider upon receiving your parcel:'}
                </p>
                <div className="pt-1">
                  <div className="p-2.5 bg-white rounded-lg border border-emerald-200 shadow-xs flex flex-col items-center text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      {language === 'bn' ? 'ডেলিভারি কোড (Delivery Code)' : 'Delivery Code'}
                    </span>
                    <span className="font-mono font-black text-emerald-700 text-base sm:text-lg tracking-widest mt-0.5">
                      {formatNum(order.deliveryOtp)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Rejection Code Box if requested */}
            {!isRedemption && order && order.rejectionCode && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
                  <XCircle className="w-4 h-4 text-rose-700" />
                  <span>{language === 'bn' ? 'পার্সেল রিজেক্ট কোড (Parcel Rejection Code)' : 'Parcel Rejection Code'}</span>
                </div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  {language === 'bn' 
                    ? 'আপনি পণ্য নিতে অস্বীকার করায় রাইডার রিজেক্ট কোড অনুরোধ করেছেন। অর্ডার বাতিল করতে রাইডারকে এই কোডটি দিন:' 
                    : 'The rider requested a rejection code since you refused the product. Provide this code to the rider to cancel the order:'}
                </p>
                <div className="p-3 bg-white rounded-lg border border-rose-200 shadow-xs flex flex-col items-center text-center">
                  <span className="font-mono font-black text-rose-600 text-xl tracking-widest mt-0.5">
                    {formatNum(order.rejectionCode)}
                  </span>
                </div>
              </div>
            )}

            {/* Items / Breakdown Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">{language === 'bn' ? 'বিবরণ / আইটেম' : 'Description / Item'}</th>
                    <th className="p-2.5 text-center">{language === 'bn' ? 'পরিমাণ' : 'Qty'}</th>
                    <th className="p-2.5 text-right">{language === 'bn' ? 'মূল্য (৳)' : 'Price (৳)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {isRedemption ? (
                    <>
                      <tr>
                        <td className="p-2.5">
                          <p className="font-bold text-slate-900">
                            {language === 'bn' ? 'দোকান থেকে কেনাকাটা (Offline Purchase)' : 'Store Purchase (Offline)'}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {language === 'bn' 
                              ? `ব্যবহৃত সালাত টোকেন: ${tokenType === 'GOLD' ? '🥇 গোল্ড (১৫% ছাড়)' : tokenType === 'SILVER' ? '🥈 সিলভার (১০% ছাড়)' : '🥉 ব্রোঞ্জ (৭% ছাড়)'}`
                              : `Redeemed Prayer Token: ${tokenType === 'GOLD' ? '🥇 Gold (15% off)' : tokenType === 'SILVER' ? '🥈 Silver (10% off)' : '🥉 Bronze (7% off)'}`}
                          </p>
                        </td>
                        <td className="p-2.5 text-center">{language === 'bn' ? '১টি বিল' : '1 Bill'}</td>
                        <td className="p-2.5 text-right font-bold">৳{formatNum(purchaseAmount)}</td>
                      </tr>
                    </>
                  ) : (
                    order.items?.map((item: any, idx: number) => (
                      <tr key={`memo-row-${item.id || item.productId || 'itm'}-${idx}`}>
                        <td className="p-2.5">
                          <p className="font-bold text-slate-900">{item.productName || item.name || (language === 'bn' ? 'পণ্য' : 'Product')}</p>
                          {item.shopName && (
                            <p className="text-[10px] text-slate-500">{language === 'bn' ? 'বিক্রেতা:' : 'Seller:'} {item.shopName}</p>
                          )}
                        </td>
                        <td className="p-2.5 text-center">{formatNum(item.quantity || 1)}</td>
                        <td className="p-2.5 text-right font-semibold">
                          ৳{formatNum((item.unitPrice || item.price || 0) * (item.quantity || 1))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Summary Box */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
              {isRedemption ? (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>{language === 'bn' ? 'মূল বিলের পরিমাণ:' : 'Original Bill:'}</span>
                    <span className="font-bold text-slate-800">৳{formatNum(purchaseAmount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      {language === 'bn' ? `সালাত রিওয়ার্ড ডিসকাউন্ট (${formatNum(discountPercent)}%):` : `Prayer Reward Discount (${formatNum(discountPercent)}%):`}
                    </span>
                    <span>- ৳{formatNum(discountAmount)}</span>
                  </div>

                  {isDonated && (
                    <div className="flex justify-between text-amber-700 font-semibold bg-amber-50/80 p-2 rounded-lg border border-amber-200/60">
                      <span className="flex items-center gap-1">
                        <HeartHandshake className="w-3.5 h-3.5" />
                        {language === 'bn' ? 'মসজিদ ফান্ডে অনুদান (Donated):' : 'Donated to Mosque Welfare Fund:'}
                      </span>
                      <span>+ ৳{formatNum(donatedAmount)}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-300 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
                    <span>{language === 'bn' ? 'দোকানে নগদ প্রদেয় সর্বমোট:' : 'Total Payable in Cash at Store:'}</span>
                    <span className="text-base text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-300">
                      ৳{formatNum(finalPayable)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>{language === 'bn' ? 'পণ্যের সাবটোটাল:' : 'Product Subtotal:'}</span>
                    <span className="font-bold text-slate-800">৳{formatNum(orderSubtotal)}</span>
                  </div>
                  {orderDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>{language === 'bn' ? 'টোকেন ডিসকাউন্ট ছাড়:' : 'Token Discount:'}</span>
                      <span>- ৳{formatNum(orderDiscount)}</span>
                    </div>
                  )}
                  {couponDiscountAmount > 0 && (
                    <div className="flex justify-between text-rose-600 font-semibold">
                      <span>{language === 'bn' ? `কুপন ডিসকাউন্ট ছাড় (${order?.couponCode || 'কুপন'}):` : `Coupon Discount (${order?.couponCode || 'Coupon'}):`}</span>
                      <span>- ৳{formatNum(couponDiscountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>{language === 'bn' ? 'হোম ডেলিভারি চার্জ:' : 'Home Delivery Charge:'}</span>
                    <span className="font-bold text-slate-800">৳{formatNum(deliveryCharge)}</span>
                  </div>
                  <div className="border-t border-slate-300 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
                    <span>{language === 'bn' ? 'ক্যাশ অন ডেলিভারি (COD) মোট প্রদেয়:' : 'Cash On Delivery (COD) Total Payable:'}</span>
                    <span className="text-base text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-300">
                      ৳{formatNum(grandTotal)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Official Footer / Seal */}
            <div className="border-t-2 border-dashed border-slate-200 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-[11px] text-slate-500">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-700">
                  {language === 'bn' 
                    ? 'ডিজিটাল সিস্টেম জেনারেটেড মেমো • কোনো স্বাক্ষরের প্রয়োজন নেই' 
                    : 'Digital system-generated memo • No physical signature required'}
                </p>
                <p className="text-[10px]">
                  {language === 'bn'
                    ? 'সালাত আদায় করুন, সাশ্রয়ী কেনাকাটায় হালাল বরকত উপভোগ করুন।'
                    : 'Establish prayer and enjoy halal barakah in your savings.'}
                </p>
              </div>

              <div className="p-2 bg-slate-100 rounded-lg border border-slate-200 text-center shrink-0">
                <div className="font-mono text-[9px] tracking-widest text-slate-600 uppercase">
                  VERIFIED • {isRedemption ? 'REDEEMED' : 'COD_ORDER'}
                </div>
                <div className="text-[9px] font-bold text-emerald-700 flex items-center justify-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Cave Companions
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (Screen Only) */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0 no-print">
          <p className="text-xs text-slate-400 hidden sm:block">
            {language === 'bn' 
              ? 'প্রিন্ট বাটনে ক্লিক করে রসিদটি প্রিন্ট বা PDF আকারে সেভ করুন' 
              : 'Click Print to print or save memo as PDF'}
          </p>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              {language === 'bn' ? 'প্রিন্ট / PDF মেমো' : 'Print / PDF Memo'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
