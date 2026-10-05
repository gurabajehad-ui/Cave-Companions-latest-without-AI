import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star,
  X,
  MessageSquare,
  Send,
  Trash2,
  Store,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  MapPin,
  Sparkles,
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { PartnerShop, ShopReview, User } from '../types';
import { toBnNumber } from '../data/prayerConfig';
import { useLanguage } from '../context/LanguageContext';

interface ShopReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: PartnerShop | null;
  currentUser?: User | null;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  onReviewUpdated?: () => void;
}

export const ShopReviewsModal: React.FC<ShopReviewsModalProps> = ({
  isOpen,
  onClose,
  shop,
  currentUser,
  onShowToast,
  onReviewUpdated
}) => {
  const { language } = useLanguage();
  const formatNum = (val: number | string) => language === 'bn' ? toBnNumber(val) : String(val);

  const [reviews, setReviews] = useState<ShopReview[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Review Form State
  const [userRating, setUserRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  const isMerchant = currentUser && 
    (currentUser as any).shopId && 
    String((currentUser as any).shopId) === String(shop?.id);

  const handleReplyReview = async (reviewId: string) => {
    const text = replyTexts[reviewId];
    if (!text || !text.trim()) return;
    if (!shop?.id) return;

    try {
      setReplyingReviewId(reviewId);
      const res = await api.replyToShopReview(shop.id, reviewId, text.trim());
      if (res.success) {
        onShowToast('success', language === 'bn' ? 'সফল' : 'Success', language === 'bn' ? 'রিপ্লাই দেওয়া হয়েছে।' : 'Reply submitted successfully.');
        setReplyTexts(prev => ({ ...prev, [reviewId]: '' }));
        await loadReviews();
      }
    } catch (err: any) {
      onShowToast('error', language === 'bn' ? 'ব্যর্থ' : 'Failed', err.message || (language === 'bn' ? 'রিপ্লাই দিতে সমস্যা হয়েছে।' : 'Failed to submit reply.'));
    } finally {
      setReplyingReviewId(null);
    }
  };

  useEffect(() => {
    if (isOpen && shop?.id) {
      loadReviews();
    }
  }, [isOpen, shop?.id]);

  const loadReviews = async () => {
    if (!shop?.id) return;
    try {
      setIsLoading(true);
      const res = await api.getShopReviews(shop.id);
      if (res.success) {
        setReviews(res.reviews || []);
        setAverageRating(res.averageRating || 0);
        setTotalReviews(res.totalReviews || 0);

        // If current user already reviewed, populate the form
        if (currentUser) {
          const myReview = res.reviews.find(r => r.userId === currentUser.id);
          if (myReview) {
            setUserRating(myReview.rating);
            setComment(myReview.comment);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load shop reviews:', err);
      onShowToast('error', language === 'bn' ? 'ত্রুটি' : 'Error', language === 'bn' ? 'দোকানের রিভিউসমূহ লোড করা যায়নি।' : 'Failed to load shop reviews.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !shop) return null;

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasToken = localStorage.getItem('cave_companions_auth_token');
    if (!currentUser && !hasToken) {
      onShowToast('error', language === 'bn' ? 'লগইন প্রয়োজন' : 'Login Required', language === 'bn' ? 'রিভিউ দিতে অনুগ্রহ করে আগে লগইন করুন।' : 'Please log in first to submit a review.');
      return;
    }

    if (!comment.trim()) {
      onShowToast('error', language === 'bn' ? 'মতামত লিখুন' : 'Write Feedback', language === 'bn' ? 'দয়া করে আপনার বাস্তব অভিজ্ঞতা বা মন্তব্য লিখুন।' : 'Please enter your actual experience or feedback.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.submitShopReview(shop.id, userRating, comment.trim());
      if (res.success) {
        onShowToast('success', language === 'bn' ? 'সফল' : 'Success', res.message || (language === 'bn' ? 'আপনার রিভিউ সফলভাবে গ্রহণ করা হয়েছে।' : 'Your review has been submitted successfully.'));
        await loadReviews();
        if (onReviewUpdated) {
          onReviewUpdated();
        }
      }
    } catch (err: any) {
      console.error('Error submitting review:', err);
      onShowToast('error', language === 'bn' ? 'ব্যর্থ' : 'Failed', err.message || (language === 'bn' ? 'রিভিউ সংরক্ষণ করতে সমস্যা হয়েছে।' : 'Failed to save review.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm(language === 'bn' ? 'আপনি কি নিশ্চিত যে এই রিভিউটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this review?')) return;

    try {
      setDeletingReviewId(reviewId);
      const res = await api.deleteShopReview(shop.id, reviewId);
      if (res.success) {
        onShowToast('success', language === 'bn' ? 'মুছে ফেলা হয়েছে' : 'Deleted', res.message || (language === 'bn' ? 'রিভিউ মুছে ফেলা হয়েছে।' : 'Review deleted.'));
        setReviews(prev => prev.filter(r => r.id !== reviewId));
        setTotalReviews(prev => Math.max(0, prev - 1));
        await loadReviews();
        if (onReviewUpdated) {
          onReviewUpdated();
        }
      }
    } catch (err: any) {
      console.error('Error deleting review:', err);
      onShowToast('error', language === 'bn' ? 'ব্যর্থ' : 'Failed', err.message || (language === 'bn' ? 'রিভিউ মুছতে সমস্যা হয়েছে।' : 'Failed to delete review.'));
    } finally {
      setDeletingReviewId(null);
    }
  };

  const getRatingFeedbackLabel = (stars: number) => {
    if (language === 'bn') {
      switch (stars) {
        case 5: return '🌟 অসাধারণ ও চমৎকার সার্ভিস!';
        case 4: return '⭐ খুব ভালো সার্ভিস';
        case 3: return '⭐ মোটামুটি সন্তোষজনক';
        case 2: return '⭐ আশানুরূপ ছিল না';
        case 1: return '⭐ সন্তুষ্ট নই';
        default: return 'রেটিং নির্বাচন করুন';
      }
    } else {
      switch (stars) {
        case 5: return '🌟 Outstanding & Excellent Service!';
        case 4: return '⭐ Very Good Service';
        case 3: return '⭐ Moderately Satisfactory';
        case 2: return '⭐ Below Expectations';
        case 1: return '⭐ Not Satisfied';
        default: return 'Select a rating';
      }
    }
  };

  // Calculate rating breakdown (counts of 5, 4, 3, 2, 1)
  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    const star = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    ratingCounts[star] = (ratingCounts[star] || 0) + 1;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-xl bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                {language === 'bn' ? (shop.nameBn || shop.name) : (shop.name || shop.nameBn)}
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                <span>{shop.address || shop.area || shop.district}</span>
              </p>
            </div>
          </div>

          <button
            id="close-shop-reviews-btn"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1">
          {/* Rating Summary Card */}
          <div className="bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row items-center gap-5">
            {/* Left Big Score */}
            <div className="text-center sm:border-r sm:border-slate-800 sm:pr-6 shrink-0 w-full sm:w-auto">
              <div className="text-4xl sm:text-5xl font-black text-amber-400 tracking-tight">
                {averageRating > 0 ? formatNum(averageRating.toFixed(1)) : formatNum('0.0')}
              </div>
              <div className="flex items-center justify-center gap-1 my-1.5 text-amber-400">
                {[1, 2, 3, 4, 5].map((star, idx) => (
                  <Star
                    key={`sr-avg-${star}-${idx}`}
                    className={`w-4 h-4 ${
                      star <= Math.round(averageRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-600'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[11px] font-semibold text-slate-400">
                {formatNum(totalReviews)} {language === 'bn' ? 'টি গ্রাহক রিভিউ' : 'customer reviews'}
              </p>
            </div>

            {/* Right Breakdown Bars */}
            <div className="flex-1 w-full space-y-1.5 text-xs">
              {[5, 4, 3, 2, 1].map((stars, idx) => {
                const count = ratingCounts[stars as keyof typeof ratingCounts] || 0;
                const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <div key={`sr-dist-${stars}-${idx}`} className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-300 w-6 flex items-center justify-end gap-0.5">
                      {formatNum(stars)} <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 inline" />
                    </span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono w-7 text-right">
                      {formatNum(count)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Review Submission Form */}
          <form
            onSubmit={handleSubmitReview}
            className="bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-700/60 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-2.5">
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                {language === 'bn' ? 'আপনার রিভিউ ও রেটিং দিন' : 'Leave your Review & Rating'}
              </h4>
              <span className="text-[11px] text-amber-400 font-medium hidden sm:inline">
                {getRatingFeedbackLabel(hoverRating || userRating)}
              </span>
            </div>

            {/* Interactive Stars */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star, idx) => (
                  <button
                    key={`sr-btn-${star}-${idx}`}
                    type="button"
                    onClick={() => setUserRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-slate-600 hover:scale-115 transition-transform cursor-pointer focus:outline-none"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= (hoverRating || userRating)
                          ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                          : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-amber-400 font-medium sm:hidden">
                {getRatingFeedbackLabel(hoverRating || userRating)}
              </span>
            </div>

            {/* Comment Textarea */}
            <div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={language === 'bn' ? 'দোকানের পণ্যের মান, মূল্য ছাড় ও ব্যবহার কেমন লেগেছে? আপনার সৎ মতামত লিখুন...' : 'How was the product quality, discount, and behavior? Write your honest review...'}
                rows={3}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
              />
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400 inline" />
                {language === 'bn' ? 'আপনার সত্য মতামত অন্য মুসলিম ভাইদের সাশ্রয়ী ও হালাল কেনাকাটায় সাহায্য করবে।' : 'Your honest feedback helps fellow Muslims in affordable and halal shopping.'}
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !comment.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-950/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    {language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    {language === 'bn' ? 'রিভিউ পোস্ট করুন' : 'Post Review'}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Reviews List */}
          <div className="space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-slate-300 flex items-center justify-between">
              <span>{language === 'bn' ? `সকল গ্রাহক রিভিউ (${formatNum(reviews.length)})` : `All Customer Reviews (${formatNum(reviews.length)})`}</span>
            </h4>

            {isLoading ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400">{language === 'bn' ? 'রিভিউসমূহ লোড হচ্ছে...' : 'Loading reviews...'}</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                  <Star className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-slate-300">
                  {language === 'bn' ? 'এখনও কোনো রিভিউ দেওয়া হয়নি' : 'No reviews given yet'}
                </p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {language === 'bn' ? 'এই পার্টনার শপ থেকে কেনাকাটা করে প্রথম রিভিউ এবং রেটিং দিয়ে সাহায্য করুন!' : 'Shop at this partner shop and help by leaving the first review and rating!'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev, revIdx) => {
                  const isMyReview = currentUser && rev.userId === currentUser.id;
                  const isAdmin = currentUser && ((currentUser as any).role === 'ADMIN' || (currentUser as any).role === 'SUPER_ADMIN');
                  const canDelete = isMyReview || isAdmin;

                  return (
                    <div
                      key={`${rev.id || 'sr-rev'}-${revIdx}`}
                      className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 space-y-2.5 transition-all hover:border-slate-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center border border-amber-500/30">
                            {rev.userName ? rev.userName[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs sm:text-sm font-bold text-slate-200">
                                {rev.userName || (language === 'bn' ? 'গ্রাহক' : 'Customer')}
                              </p>
                              {isMyReview && (
                                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-md border border-emerald-500/30">
                                  {language === 'bn' ? 'আমার রিভিউ' : 'My Review'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                              <span>
                                {rev.createdAt
                                  ? new Date(rev.createdAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })
                                  : ''}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{formatNum(rev.rating)}</span>
                          </div>

                          {canDelete && (
                            <button
                              onClick={() => handleDeleteReview(rev.id)}
                              disabled={deletingReviewId === rev.id}
                              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                              title={language === 'bn' ? 'রিভিউ ডিলিট করুন' : 'Delete review'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/50">
                        {rev.comment}
                      </p>

                      {rev.reply && (
                        <div className="ml-4 pl-3 border-l-2 border-emerald-500/50">
                          <p className="text-[11px] text-emerald-400 font-bold">{language === 'bn' ? 'দোকানদারের রিপ্লাই:' : 'Merchant Reply:'}</p>
                          <p className="text-xs text-emerald-100 bg-emerald-950/30 p-2 rounded-lg">{rev.reply}</p>
                        </div>
                      )}

                      {isMerchant && !rev.reply && (
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            value={replyTexts[rev.id] || ''}
                            onChange={(e) => setReplyTexts(prev => ({ ...prev, [rev.id]: e.target.value }))}
                            placeholder={language === 'bn' ? 'রিপ্লাই লিখুন...' : 'Write a reply...'}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                          />
                          <button
                            onClick={() => handleReplyReview(rev.id)}
                            disabled={replyingReviewId === rev.id || !(replyTexts[rev.id] || '').trim()}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {replyingReviewId === rev.id ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            <span>{language === 'bn' ? 'পাঠান' : 'Send'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Close */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
