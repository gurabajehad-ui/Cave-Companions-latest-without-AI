import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import {
  Store,
  QrCode,
  TrendingUp,
  Receipt,
  Settings,
  ShieldCheck,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Percent,
  Calendar,
  Eye,
  Building2,
  Printer,
  Sparkles,
  ArrowRight,
  UserCheck,
  ChevronRight,
  Key,
  Download,
  Filter,
  Loader2,
  Activity,
  MapPin,
  Compass,
  Navigation,
  Map as MapIcon,
  Save,
  ShoppingBag,
  Heart,
  FileText,
  Star,
  MessageSquare,
  Send,
  XCircle,
  Clock3,
  Copy,
  Check,
  FileImage,
  Lock,
  Trash2,
  AlertCircle,
  Bike
} from 'lucide-react';
import {
  api,
  getStoredMerchantToken,
  setStoredMerchantToken,
  removeStoredMerchantToken
} from '../services/api';
import {
  MerchantUser,
  PartnerShop,
  MerchantDashboardStats,
  MerchantTransactionRecord,
  ShopReview,
  TokenRedemptionRequest
} from '../types';
import { toBnNumber } from '../data/prayerConfig';
import { MerchantRegistrationWizard } from './MerchantRegistrationWizard';
import { DigitalCashMemoModal } from './DigitalCashMemoModal';

// Helper to mask phone numbers to protect customer privacy
const maskPhone = (phone: string | null | undefined): string => {
  if (!phone) return 'N/A';
  const clean = phone.trim();
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}*******${clean.slice(8)}`;
  }
  if (clean.length > 11) {
    const cleanNoCountry = clean.startsWith('+88') ? clean.slice(3) : clean;
    if (cleanNoCountry.length === 11) {
      return `+88${cleanNoCountry.slice(0, 3)}*******${cleanNoCountry.slice(8)}`;
    }
    return `${clean.slice(0, 3)}*******${clean.slice(-3)}`;
  }
  if (clean.length >= 6) {
    return `${clean.slice(0, 2)}*******${clean.slice(-2)}`;
  }
  return clean;
};
import { MerchantPendingScreen } from './MerchantPendingScreen';
import { MerchantCorrectionScreen } from './MerchantCorrectionScreen';
import { MerchantRejectedScreen } from './MerchantRejectedScreen';
import { MerchantSuspendedScreen } from './MerchantSuspendedScreen';
import { MerchantProgressTracker } from './MerchantProgressTracker';
import { MerchantLocationPickerModal } from './MerchantLocationPickerModal';
import { ShopLocationModal } from './ShopLocationModal';
import { MerchantProductsTab } from './MerchantProductsTab';

interface MerchantPortalViewProps {
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  onExitMerchant?: () => void;
}

export const MerchantPortalView: React.FC<MerchantPortalViewProps> = ({
  onShowToast,
  onExitMerchant
}) => {
  const [merchantToken, setMerchantToken] = useState<string | null>(getStoredMerchantToken());
  const [merchant, setMerchant] = useState<MerchantUser | null>(null);
  const [shop, setShop] = useState<PartnerShop | null>(null);
  const [verification, setVerification] = useState<any | null>(null);
  const [dashboardStats, setDashboardStats] = useState<MerchantDashboardStats | null>(null);
  const [transactions, setTransactions] = useState<MerchantTransactionRecord[]>([]);

  // Navigation tab inside Merchant App
  const [activeMerchantTab, setActiveMerchantTab] = useState<'verification' | 'products' | 'qr' | 'approval' | 'transactions' | 'orders' | 'reviews' | 'settings'>('approval');

  // Pending Token Redemption Requests (Merchant Approval Gate)
  const [redemptionRequests, setRedemptionRequests] = useState<TokenRedemptionRequest[]>([]);
  const [loadingRedemptionRequests, setLoadingRedemptionRequests] = useState(false);
  const [isAutoRefreshApproval, setIsAutoRefreshApproval] = useState(false);
  const [lastApprovalCheckedAt, setLastApprovalCheckedAt] = useState<Date>(new Date());
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [rejectModalRequest, setRejectModalRequest] = useState<TokenRedemptionRequest | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  // Merchant Orders & Rider Delivery State
  const [merchantOrders, setMerchantOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderActionLoadingId, setOrderActionLoadingId] = useState<string | null>(null);

  // Selected Transaction for Digital Cash Memo
  const [selectedMemoTx, setSelectedMemoTx] = useState<MerchantTransactionRecord | null>(null);

  // Shop Reviews state
  const [shopReviews, setShopReviews] = useState<ShopReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [replyingToReviewId, setReplyingToReviewId] = useState<string | null>(null);
  const [merchantReplyText, setMerchantReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [reviewsSummary, setReviewsSummary] = useState<{ averageRating: number; totalReviews: number; ratingDistribution: Record<number, number> }>({
    averageRating: 5.0,
    totalReviews: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });

  // Auth flow states
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  
  // Login form states
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<{ title: string; message: string } | null>(null);

  // Merchant Password Recovery States
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPin, setForgotNewPin] = useState('');
  const [forgotConfirmPin, setForgotConfirmPin] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotDevOtp, setForgotDevOtp] = useState<string | null>(null);

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPhone.trim()) {
      setForgotError('আপনার মার্চেন্ট মোবাইল নম্বর প্রদান করুন।');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);
    try {
      const res = await api.merchantForgotPasswordRequest(forgotPhone.trim());
      if (res.success) {
        setForgotSuccess(res.message);
        if (res.devOtpCode) setForgotDevOtp(res.devOtpCode);
        setForgotStep(2);
      } else {
        setForgotError(res.message || 'ওটিপি পাঠাতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      setForgotError(err.message || 'ওটিপি অনুরোধ প্রক্রিয়াজাত করতে ব্যর্থ হয়েছে।');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim()) {
      setForgotError('৬ ডিজিটের ওটিপি কোড প্রদান করুন।');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);
    try {
      const res = await api.merchantForgotPasswordVerify(forgotPhone.trim(), forgotOtp.trim());
      if (res.success) {
        setForgotSuccess(res.message);
        setForgotStep(3);
      } else {
        setForgotError(res.message || 'ভেরিফিকেশন কোডটি সঠিক নয়।');
      }
    } catch (err: any) {
      setForgotError(err.message || 'ওটিপি যাচাই করতে ব্যর্থ হয়েছে।');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotNewPin.trim() || forgotNewPin.trim().length < 4) {
      setForgotError('নতুন পিন/পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।');
      return;
    }
    if (forgotConfirmPin && forgotNewPin.trim() !== forgotConfirmPin.trim()) {
      setForgotError('নতুন পিন এবং কনফার্ম পিন মিলছে না।');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);
    try {
      const res = await api.merchantForgotPasswordReset({
        identifier: forgotPhone.trim(),
        code: forgotOtp.trim(),
        newPin: forgotNewPin.trim(),
        confirmPin: forgotConfirmPin.trim()
      });
      if (res.success) {
        setForgotSuccess(res.message);
        if (onShowToast) onShowToast('success', 'পাসওয়ার্ড পরিবর্তিত', res.message);
        setTimeout(() => {
          setAuthMode('login');
          setLoginPhone(forgotPhone.trim());
          setForgotStep(1);
          setForgotPhone('');
          setForgotOtp('');
          setForgotNewPin('');
          setForgotConfirmPin('');
          setForgotError(null);
          setForgotSuccess(null);
        }, 1500);
      } else {
        setForgotError(res.message || 'পাসওয়ার্ড পরিবর্তন করতে ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setForgotError(err.message || 'পাসওয়ার্ড রিসেট করতে ব্যর্থ হয়েছে।');
    } finally {
      setForgotLoading(false);
    }
  };

  // Settings form states
  const [editPhone, setEditPhone] = useState('');
  const [editHours, setEditHours] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editGoldDiscount, setEditGoldDiscount] = useState<number>(15);
  const [editSilverDiscount, setEditSilverDiscount] = useState<number>(10);
  const [editBronzeDiscount, setEditBronzeDiscount] = useState<number>(5);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [requestedCommission, setRequestedCommission] = useState<number | string>(3.0);
  const [pendingCommissionRequest, setPendingCommissionRequest] = useState<any | null>(null);
  const [commissionRequests, setCommissionRequests] = useState<any[]>([]);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [commissionReason, setCommissionReason] = useState('');
  const [isSubmittingCommissionReq, setIsSubmittingCommissionReq] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(!!getStoredMerchantToken());
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isDownloadingQrPoster, setIsDownloadingQrPoster] = useState(false);
  const [isCopiedQrId, setIsCopiedQrId] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [showLocationPreviewModal, setShowLocationPreviewModal] = useState<boolean>(false);

  // Transactions tab filters & download state
  const [txDateFilter, setTxDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'>('ALL');
  const [txTokenFilter, setTxTokenFilter] = useState<'ALL' | 'GOLD' | 'SILVER' | 'BRONZE'>('ALL');
  const [txCustomFrom, setTxCustomFrom] = useState('');
  const [txCustomTo, setTxCustomTo] = useState('');
  const [txSummary, setTxSummary] = useState<{ totalAmount: number; totalCommission: number; totalCount: number } | null>(null);
  const [loadingTx, setLoadingTx] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<'pdf' | 'xlsx' | 'csv' | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Centralized helper to handle authentication/authorization failures across merchant API calls
  const handleAuthFailure = useCallback((err: any) => {
    const status = err?.status || err?.response?.status;
    const isAuthError = status === 401 || status === 403 || 
      err?.message?.includes('401') || err?.message?.includes('403') ||
      err?.message?.includes('UNAUTHORIZED') || err?.message?.includes('EXPIRED') ||
      err?.message?.includes('SUSPENDED') || err?.message?.includes('DELETED') ||
      err?.message?.includes('প্রবেশাধিকার সংরক্ষিত বা অননুমোদিত সেশন') ||
      err?.message?.includes('মার্চেন্ট পোর্টালে প্রবেশের জন্য');

    if (isAuthError) {
      removeStoredMerchantToken();
      setMerchantToken(null);
      setMerchant(null);
      setShop(null);
      setVerification(null);
      setDashboardStats(null);
      setTransactions([]);
      setMerchantOrders([]);
      setShopReviews([]);
      setRedemptionRequests([]);
      setIsLoggingIn(false);
      if (onShowToast) {
        onShowToast('info', 'মার্চেন্ট সেশন', err?.message || 'মার্চেন্ট সেশনের মেয়াদ শেষ হয়েছে বা অ্যাক্সেস বাতিল করা হয়েছে।');
      }
      return true;
    }
    return false;
  }, [onShowToast]);

  const getTxFilterParams = useCallback(() => {
    const filters: { dateFrom?: string; dateTo?: string; tokenType?: string } = {};
    if (txTokenFilter !== 'ALL') filters.tokenType = txTokenFilter;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (txDateFilter === 'TODAY') {
      filters.dateFrom = today.toISOString();
    } else if (txDateFilter === 'YESTERDAY') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      filters.dateFrom = yesterday.toISOString();
      filters.dateTo = today.toISOString();
    } else if (txDateFilter === 'LAST_7_DAYS') {
      const last7 = new Date(today);
      last7.setDate(last7.getDate() - 7);
      filters.dateFrom = last7.toISOString();
    } else if (txDateFilter === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      filters.dateFrom = firstDay.toISOString();
    } else if (txDateFilter === 'LAST_MONTH') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      filters.dateFrom = firstDayLastMonth.toISOString();
      filters.dateTo = lastDayLastMonth.toISOString();
    } else if (txDateFilter === 'CUSTOM') {
      if (txCustomFrom) filters.dateFrom = new Date(txCustomFrom).toISOString();
      if (txCustomTo) filters.dateTo = new Date(txCustomTo).toISOString();
    }

    return filters;
  }, [txDateFilter, txTokenFilter, txCustomFrom, txCustomTo]);

  const loadTransactionsData = useCallback(async () => {
    if (!merchantToken) return;
    setLoadingTx(true);
    try {
      const filters = getTxFilterParams();
      const [txRes, sumRes] = await Promise.all([
        api.getMerchantTransactions(filters).catch(() => null),
        api.getMerchantTransactionsSummary(filters).catch(() => null)
      ]);
      if (txRes?.success) setTransactions(txRes.transactions);
      if (sumRes?.success) setTxSummary(sumRes.summary);
    } catch (err) {
      console.error('Failed to load merchant transactions:', err);
    } finally {
      setLoadingTx(false);
    }
  }, [merchantToken, getTxFilterParams]);

  const handleDeleteMerchantTx = async (redemptionId: string) => {
    try {
      const res = await api.deleteMerchantTransaction(redemptionId);
      if (res.success) {
        if (onShowToast) {
          onShowToast('success', 'সফল', 'লেনদেনটি সফলভাবে আপনার তালিকা থেকে মুছে ফেলা হয়েছে।');
        }
        setTransactions(prev => prev.filter(tx => tx.id !== redemptionId));
        loadTransactionsData();
      } else {
        if (onShowToast) {
          onShowToast('error', 'ব্যর্থ', res.message || 'লেনদেনটি মুছা সম্ভব হয়নি।');
        }
      }
    } catch (err: any) {
      console.error(err);
      if (onShowToast) {
        onShowToast('error', 'ত্রুটি', 'সার্ভার সাইড সমস্যা হয়েছে।');
      }
    }
  };

  const handleDownloadMerchantReport = async (format: 'pdf' | 'xlsx' | 'csv') => {
    if (downloadingFormat) return;
    setDownloadingFormat(format);
    setShowDownloadMenu(false);
    try {
      const filters = getTxFilterParams();
      await api.downloadMerchantFinancialReport({ format, ...filters });
      if (onShowToast) {
        onShowToast('success', 'সফল', `${format.toUpperCase()} ফরম্যাটে হিসাব রিপোর্ট ডাউনলোড সম্পন্ন হয়েছে।`);
      }
    } catch (err: any) {
      console.error('Merchant download report error:', err);
      if (onShowToast) {
        onShowToast('error', 'ত্রুটি', err.message || 'রিপোর্ট ডাউনলোড করতে ব্যর্থ হয়েছে।');
      }
    } finally {
      setDownloadingFormat(null);
    }
  };

  // Fetch Merchant info and dashboard
  const loadMerchantDashboard = useCallback(async () => {
    try {
      setIsLoadingData(true);
      const meRes = await api.getMerchantMe();

      if (meRes.success) {
        setMerchant(meRes.merchant);
        setShop(meRes.shop);
        setVerification(meRes.verification || null);

        setEditPhone(meRes.shop?.phone || '');
        setEditHours(meRes.shop?.openingHours || '');
        setEditDesc(meRes.shop?.description || '');
        setEditAddress(meRes.shop?.address || '');
        setEditGoldDiscount(meRes.shop?.goldDiscount || 15);
        setEditSilverDiscount(meRes.shop?.silverDiscount || 10);
        setEditBronzeDiscount(meRes.shop?.bronzeDiscount || 5);

        const [dashRes, txRes, offersRes, statusRes] = await Promise.all([
          api.getMerchantDashboard().catch((e) => { handleAuthFailure(e); return null; }),
          api.getMerchantTransactions().catch((e) => { handleAuthFailure(e); return null; }),
          api.getMerchantOffers().catch((e) => { handleAuthFailure(e); return null; }),
          api.getMerchantRegistrationStatus().catch((e) => { handleAuthFailure(e); return null; })
        ]);
        if (dashRes?.success) setDashboardStats(dashRes.stats);
        if (txRes?.success) setTransactions(txRes.transactions);
        if (offersRes?.success) {
          setPendingCommissionRequest(offersRes.pendingCommissionRequest);
          setCommissionRequests((offersRes as any).requests || []);
          if (offersRes.shop) setShop(offersRes.shop as any);
        }
        if (statusRes?.success) {
          setVerification(statusRes.verification);
          if (statusRes.shop) setShop(statusRes.shop);
        }
      }
    } catch (err: any) {
      console.warn('[MerchantPortal] Failed to load merchant data:', err?.message || err);
      const isAuthHandled = handleAuthFailure(err);
      if (!isAuthHandled) {
        // Transient error (e.g. 429 rate limit, 500 server error, network drop): Keep token, show warning
        if (onShowToast) {
          onShowToast('error', 'সার্ভার সমস্যা', 'ডাটা লোড করতে সমস্যা হচ্ছে। অনুগ্রহ করে একটু পর আবার চেষ্টা করুন।');
        }
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [handleAuthFailure, onShowToast]);

  useEffect(() => {
    if (merchantToken) {
      loadMerchantDashboard();
    } else {
      setIsLoggingIn(false);
    }
  }, [merchantToken, loadMerchantDashboard]);

  const loadRedemptionRequests = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoadingRedemptionRequests(true);
      }
      const res = await api.getMerchantRedemptionRequests('PENDING');
      if (res.success && res.requests) {
        setRedemptionRequests((prev) => {
          const prevKey = prev.map((r, idx) => `${r.id}_${r.status}_${r.purchaseAmount}`).join('|');
          const newKey = (res.requests || []).map((r, idx) => `${r.id}_${r.status}_${r.purchaseAmount}`).join('|');
          if (prevKey === newKey) return prev;
          return res.requests || [];
        });
      }
      setLastApprovalCheckedAt(new Date());
    } catch (err: any) {
      console.error('Load merchant redemption requests error:', err);
      handleAuthFailure(err);
    } finally {
      if (!silent) {
        setLoadingRedemptionRequests(false);
      }
    }
  }, [handleAuthFailure]);

  // Initial load when merchant is authenticated
  useEffect(() => {
    if (!merchantToken) return;
    loadRedemptionRequests(false);
  }, [merchantToken, loadRedemptionRequests]);

  // Optional silent auto-refresh only if explicitly enabled by merchant
  useEffect(() => {
    if (!merchantToken || !isAutoRefreshApproval) return;
    const interval = setInterval(() => {
      loadRedemptionRequests(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [merchantToken, isAutoRefreshApproval, loadRedemptionRequests]);

  const handleApproveRedemption = async (requestId: string) => {
    try {
      setProcessingRequestId(requestId);
      const res = await api.approveMerchantRedemptionRequest(requestId);
      if (res.success) {
        if (onShowToast) {
          onShowToast('success', 'টোকেন অফার অনুমোদিত!', 'টোকেন ডিসকাউন্ট সফলভাবে নিশ্চিত করা হয়েছে এবং ক্যাশ মেমো তৈরি হয়েছে।');
        }
        await loadRedemptionRequests();
        await loadMerchantDashboard();
      } else {
        throw new Error(res.message || 'অনুমোদন ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('error', 'অনুমোদন ব্যর্থ', err.message || 'অনুমোদন প্রক্রিয়া সম্পন্ন করা যায়নি।');
      }
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRedemption = async () => {
    if (!rejectModalRequest) return;
    try {
      setProcessingRequestId(rejectModalRequest.id);
      const res = await api.rejectMerchantRedemptionRequest(
        rejectModalRequest.id,
        rejectReasonInput.trim() || undefined
      );
      if (res.success) {
        if (onShowToast) {
          onShowToast('info', 'অনুরোধ প্রত্যাখ্যাত', 'অনুরোধটি প্রত্যাখ্যান করা হয়েছে। গ্রাহকের টোকেন অক্ষত রয়েছে।');
        }
        setRejectModalRequest(null);
        setRejectReasonInput('');
        await loadRedemptionRequests();
      } else {
        throw new Error(res.message || 'প্রত্যাখ্যান ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('error', 'প্রত্যাখ্যান ব্যর্থ', err.message || 'অনুরোধ প্রত্যাখ্যান করা যায়নি।');
      }
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Load transactions data whenever transactions tab is activated or filters change
  useEffect(() => {
    if (merchantToken && activeMerchantTab === 'transactions') {
      loadTransactionsData();
    }
  }, [merchantToken, activeMerchantTab, loadTransactionsData]);

  // Load Merchant Orders & Rider Delivery status
  const loadMerchantOrders = useCallback(async () => {
    if (!merchantToken) return;
    setLoadingOrders(true);
    try {
      const res = await api.getMerchantOrders();
      if (res.success) {
        // Enforce LOCAL market orders filtering on client side as defensive measure
        const localOrders = (res.orders || []).filter((ord: any) => 
          ord.orderType === 'LOCAL' || 
          ord.market_type === 'LOCAL' || 
          ord.deliveryOption === 'local_rider' || 
          !ord.orderType // default local fallback if undefined
        );
        setMerchantOrders(localOrders);
      }
    } catch (err: any) {
      console.error('Failed to load merchant orders:', err);
      handleAuthFailure(err);
    } finally {
      setLoadingOrders(false);
    }
  }, [merchantToken, handleAuthFailure]);

  useEffect(() => {
    if (merchantToken && activeMerchantTab === 'orders') {
      loadMerchantOrders();
    }
  }, [merchantToken, activeMerchantTab, loadMerchantOrders]);

  const handleDoneOrder = async (orderId: string) => {
    try {
      setOrderActionLoadingId(orderId);
      const res = await api.merchantDoneOrder(orderId);
      if (res.success) {
        if (onShowToast) {
          onShowToast('success', 'অর্ডার সম্পন্ন ও নিষ্পত্তি!', 'অর্ডারটি সফলভাবে নিষ্পত্তি করা হয়েছে এবং রাইডারের প্রাপ্য ওয়ালেটে জমা হয়েছে।');
        }
        loadMerchantOrders();
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('error', 'ব্যর্থ', err.message || 'অর্ডার নিষ্পত্তি করা যায়নি।');
      }
    } finally {
      setOrderActionLoadingId(null);
    }
  };

  const handleGenerateCode = async (orderId: string, codeType: 'pickup' | 'delivery') => {
    try {
      setOrderActionLoadingId(orderId);
      const res = await api.merchantGenerateCode(orderId, codeType);
      if (res.success) {
        if (onShowToast) {
          onShowToast('success', codeType === 'pickup' ? 'পিকআপ কোড তৈরি!' : 'নিষ্পত্তি কোড তৈরি!', res.message || 'কোড সফলভাবে তৈরি হয়েছে।');
        }
        loadMerchantOrders();
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('error', 'ত্রুটি', err.message || 'কোড তৈরি করতে সমস্যা হয়েছে।');
      }
    } finally {
      setOrderActionLoadingId(null);
    }
  };

  const handleProductBackOrder = async (orderId: string) => {
    const reason = prompt('পণ্য ফেরত নেওয়ার কারণ বা মন্তব্য লিখুন:') || 'পণ্য ফেরত এসেছে';
    try {
      setOrderActionLoadingId(orderId);
      const res = await api.merchantProductBackOrder(orderId, reason);
      if (res.success) {
        if (onShowToast) {
          onShowToast('info', 'পণ্য ফেরত রেকর্ড করা হয়েছে', 'অর্ডারটি PRODUCT_BACK হিসেবে চিহ্নিত হয়েছে।');
        }
        loadMerchantOrders();
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('error', 'ব্যর্থ', err.message || 'ব্যর্থ হয়েছে।');
      }
    } finally {
      setOrderActionLoadingId(null);
    }
  };

  const handleDeleteMerchantOrder = async (orderId: string) => {
    if (!window.confirm('আপনি কি এই অর্ডারটি হিস্ট্রি থেকে মুছে ফেলতে চান?')) return;
    try {
      setOrderActionLoadingId(orderId);
      const res = await api.merchantDeleteOrder(orderId);
      if (res.success) {
        if (onShowToast) {
          onShowToast('success', 'মুছে ফেলা হয়েছে', 'অর্ডারটি হিস্ট্রি থেকে সফলভাবে মুছে ফেলা হয়েছে।');
        }
        loadMerchantOrders();
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('error', 'ব্যর্থ', err.message || 'অর্ডার মুছতে সমস্যা হয়েছে।');
      }
    } finally {
      setOrderActionLoadingId(null);
    }
  };

  const handleClearCompletedOrders = async () => {
    if (!window.confirm('সকল সম্পন্ন (DONE / SETTLED / ফেরত) অর্ডার কি হিস্ট্রি থেকে মুছে ফেলতে চান?')) return;
    try {
      setLoadingOrders(true);
      const res = await api.merchantClearCompletedOrders();
      if (res.success) {
        if (onShowToast) {
          onShowToast('success', 'হিস্ট্রি ক্লিয়ার', res.message || 'সম্পন্ন অর্ডার হিস্ট্রি মুছে ফেলা হয়েছে।');
        }
        loadMerchantOrders();
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('error', 'ব্যর্থ', err.message || 'হিস্ট্রি মুছতে সমস্যা হয়েছে।');
      }
    } finally {
      setLoadingOrders(false);
    }
  };


  const loadShopReviews = useCallback(async () => {
    if (!shop?.id) return;
    setLoadingReviews(true);
    try {
      const res = await api.getShopReviews(shop.id);
      if (res.success) {
        setShopReviews(res.reviews || []);
        setReviewsSummary({
          averageRating: res.averageRating || 5.0,
          totalReviews: res.totalReviews || 0,
          ratingDistribution: res.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        });
      }
    } catch (err: any) {
      console.error('Failed to load shop reviews for merchant:', err);
      handleAuthFailure(err);
    } finally {
      setLoadingReviews(false);
    }
  }, [shop?.id, handleAuthFailure]);

  useEffect(() => {
    if (shop?.id && (activeMerchantTab === 'reviews' || activeMerchantTab === 'transactions')) {
      loadShopReviews();
    }
  }, [shop?.id, activeMerchantTab, loadShopReviews]);

  // Generate QR Code data URL when shop info is available
  useEffect(() => {
    if (shop?.qrIdentifier) {
      QRCode.toDataURL(shop.qrIdentifier, {
        width: 600,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
        .then((url: string) => setQrDataUrl(url))
        .catch((err: any) => console.error('QR code generation error:', err));
    } else {
      setQrDataUrl('');
    }
  }, [shop?.qrIdentifier]);

  // Direct QR Code Image Download (.png)
  const handleDownloadQrOnly = () => {
    if (!qrDataUrl || !shop) return;
    try {
      const link = document.createElement('a');
      const safeName = (shop.nameBn || shop.name || 'Merchant').replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, '_');
      link.download = `${safeName}_QR_Code.png`;
      link.href = qrDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (onShowToast) {
        onShowToast('success', 'ডাউনলোড সফল!', 'দোকানের QR কোড সফলভাবে ডিভাইসে সংরক্ষণ করা হয়েছে।');
      }
    } catch (err) {
      console.error('Download QR only error:', err);
      if (onShowToast) onShowToast('error', 'ত্রুটি', 'QR কোড ডাউনলোড করা সম্ভব হয়নি।');
    }
  };

  // High-Resolution Counter Standee / Poster Download (.png)
  const handleDownloadQrPoster = async () => {
    if (!qrDataUrl || !shop) return;
    try {
      setIsDownloadingQrPoster(true);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // High-res canvas: 1080 x 1440
      canvas.width = 1080;
      canvas.height = 1440;

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 1440);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#090d16');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1440);

      // Card border
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 6;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(40, 40, 1000, 1360, 48);
        ctx.stroke();
      } else {
        ctx.strokeRect(40, 40, 1000, 1360);
      }

      // Top Header Badge
      ctx.fillStyle = '#065f46';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(300, 90, 480, 64, 32);
      } else {
        ctx.fillRect(300, 90, 480, 64);
      }
      ctx.fill();

      ctx.fillStyle = '#6ee7b7';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🕌 CAVE COMPANIONS PARTNER', 540, 132);

      // Shop Name Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 54px sans-serif';
      const shopTitle = shop.nameBn || shop.name || 'পার্টনার শপ';
      ctx.fillText(shopTitle, 540, 225);

      // Subtitle
      ctx.fillStyle = '#94a3b8';
      ctx.font = '28px sans-serif';
      ctx.fillText('টোকেন স্ক্যান করে তাৎক্ষণিক ছাড় গ্রহণ করুন', 540, 280);

      // White QR Container Card
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 15;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(200, 340, 680, 680, 40);
      } else {
        ctx.fillRect(200, 340, 680, 680);
      }
      ctx.fill();
      ctx.shadowColor = 'transparent';

      // Load and draw QR code image inside
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = reject;
        qrImg.src = qrDataUrl;
      });

      ctx.drawImage(qrImg, 240, 380, 600, 600);

      // QR Identifier Box
      if (shop.qrIdentifier) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(300, 1045, 480, 56, 28);
        } else {
          ctx.fillRect(300, 1045, 480, 56);
        }
        ctx.fill();

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 24px monospace';
        ctx.fillText(`ID: ${shop.qrIdentifier}`, 540, 1081);
      }

      // Step-by-step guidance box
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(140, 1130, 800, 150, 28);
      } else {
        ctx.fillRect(140, 1130, 800, 150);
      }
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('📋 ছাড় পাওয়ার নিয়মাবলী:', 170, 1175);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '22px sans-serif';
      ctx.fillText('১. Cave Companions অ্যাপে স্ক্যান করুন   ২. গোল্ড/সিলভার টোকেন সিলেক্ট করুন', 170, 1220);
      ctx.fillText('৩. ক্যাশ কাউন্টারে তাৎক্ষণিক নগদ ছাড় ও ডিজিটাল মেমো নিশ্চিত করুন', 170, 1255);

      // Footer
      ctx.fillStyle = '#64748b';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🛡️ ভেরিফাইড অফলাইন পার্টনার আউটলেট • নিরাপদ ও অথেনটিক রিডেম্পশন', 540, 1340);

      // Trigger download
      const safeName = (shop.nameBn || shop.name || 'Merchant').replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, '_');
      const posterDataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${safeName}_Merchant_Standee_Poster.png`;
      link.href = posterDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (onShowToast) {
        onShowToast('success', 'পোস্টার ডাউনলোড সফল!', 'কাউন্টার প্রদর্শনের জন্য প্রিন্ট-রেডি স্ট্যান্ডি পোস্টার ডাউনলোড হয়েছে।');
      }
    } catch (err: any) {
      console.error('Download QR poster error:', err);
      if (onShowToast) onShowToast('error', 'ত্রুটি', 'পোস্টার তৈরি বা ডাউনলোড করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsDownloadingQrPoster(false);
    }
  };

  // Open formatted print dialog for counter standee
  const handlePrintQrPoster = () => {
    if (!shop || !qrDataUrl) return;
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        window.print();
        return;
      }
      const shopTitle = shop.nameBn || shop.name || 'পার্টনার শপ';
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Merchant QR Standee - ${shopTitle}</title>
            <style>
              @page { size: A4 portrait; margin: 15mm; }
              body { font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #0f172a; margin: 0; padding: 20px; display: flex; justify-content: center; }
              .standee-card { width: 100%; max-width: 480px; border: 3px solid #0f172a; border-radius: 24px; padding: 32px 24px; text-align: center; box-sizing: border-box; }
              .header-tag { display: inline-block; background: #047857; color: white; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: bold; letter-spacing: 0.5px; }
              .shop-title { font-size: 26px; font-weight: 900; margin: 16px 0 4px 0; color: #0f172a; }
              .shop-sub { font-size: 14px; color: #475569; margin-bottom: 20px; }
              .qr-box { background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 20px; padding: 16px; width: 260px; height: 260px; margin: 0 auto; box-sizing: border-box; }
              .qr-img { width: 100%; height: 100%; object-fit: contain; }
              .qr-id { font-family: monospace; font-size: 13px; font-weight: bold; color: #334155; margin-top: 10px; letter-spacing: 1px; }
              .instructions { margin-top: 24px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 16px; padding: 14px; text-align: left; font-size: 12px; color: #065f46; line-height: 1.6; }
              .footer { margin-top: 20px; font-size: 11px; color: #64748b; font-weight: 500; }
            </style>
          </head>
          <body>
            <div class="standee-card">
              <div class="header-tag">🕌 CAVE COMPANIONS PARTNER OUTLET</div>
              <div class="shop-title">${shopTitle}</div>
              <div class="shop-sub">টোকেন স্ক্যান করে তাৎক্ষণিক নগদ ছাড় গ্রহণ করুন</div>
              <div class="qr-box">
                <img class="qr-img" src="${qrDataUrl}" alt="QR" />
              </div>
              <div class="qr-id">ID: ${shop.qrIdentifier || ''}</div>
              <div class="instructions">
                <strong>📋 ছাড় পাওয়ার নিয়মাবলী:</strong><br/>
                ১. গ্রাহক Cave Companions অ্যাপে লগইন করুন<br/>
                ২. রিডিম অপশনে গিয়ে এই QR কোডটি স্ক্যান করুন<br/>
                ৩. আপনার গোল্ড/সিলভার/ব্রোঞ্জ টোকেনে ছাড় নিশ্চিত করুন
              </div>
              <div class="footer">
                🛡️ ভেরিফাইড পার্টনার আউটলেট • নিরাপদ ও অথেনটিক রিডেম্পশন
              </div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 400);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Print QR poster error:', err);
      window.print();
    }
  };

  const handleCopyQrIdentifier = () => {
    if (!shop?.qrIdentifier) return;
    navigator.clipboard.writeText(shop.qrIdentifier);
    setIsCopiedQrId(true);
    setTimeout(() => setIsCopiedQrId(false), 2000);
    if (onShowToast) {
      onShowToast('success', 'কপি হয়েছে', 'QR আইডেন্টিফায়ার ক্লিপবোর্ডে কপি করা হয়েছে।');
    }
  };

  const handleMerchantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;

    // Validation
    const phone = loginPhone.trim();
    const pin = loginPin.trim();

    if (!phone) {
      if (onShowToast) onShowToast('error', 'ত্রুটি', 'মোবাইল নম্বর লিখুন।');
      return;
    }
    
    // Simple validation for phone format (starts with 01 and 11 digits)
    if (!/^01[3-9]\d{8}$/.test(phone)) {
      const err = { title: 'ভুল মোবাইল নম্বর', message: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর লিখুন (যেমন: 017XXXXXXXX)।' };
      setLoginError(err);
      if (onShowToast) onShowToast('error', err.title, err.message);
      return;
    }

    if (!pin) {
      const err = { title: 'পিন প্রয়োজন', message: 'আপনার মার্চেন্ট সিক্রেট পিন বা পাসওয়ার্ড লিখুন।' };
      setLoginError(err);
      if (onShowToast) onShowToast('error', err.title, err.message);
      return;
    }

    setLoginError(null);
    setIsLoggingIn(true);

    // Backend error message mapping
    const getLoginErrorMessage = (code?: string, defaultMsg?: string): { title: string; message: string } => {
      const codeStr = (code || '').toUpperCase();
      const rawText = defaultMsg || code || '';

      if (
        codeStr === 'PHONE_NOT_FOUND' || 
        codeStr === 'MERCHANT_NOT_FOUND' || 
        codeStr === 'USER_NOT_FOUND' ||
        rawText.includes('বিদ্যমান নেই') ||
        rawText.includes('পাওয়া যায়নি') ||
        rawText.includes('পাওয়া যায়নি') ||
        rawText.includes('কোনো মার্চেন্ট অ্যাকাউন্ট')
      ) {
        return { title: 'অ্যাকাউন্ট নেই', message: 'এই নম্বরে কোনো অ্যাকাউন্ট বিদ্যমান নেই।' };
      }

      if (codeStr === 'INVALID_PIN' || codeStr === 'INVALID_PASSWORD' || rawText.includes('PIN সঠিক নয়') || rawText.includes('পিন সঠিক নয়') || rawText.includes('সঠিক নয়')) {
        return { title: 'ভুল পিন বা পাসওয়ার্ড', message: 'আপনার মার্চেন্ট PIN সঠিক নয়। অনুগ্রহ করে পুনরায় সঠিক PIN দিয়ে চেষ্টা করুন।' };
      }

      if (codeStr === 'ACCOUNT_PENDING' || codeStr === 'PENDING_APPROVAL' || rawText.includes('পর্যালোচনায়') || rawText.includes('অনুমোদনের অপেক্ষায়')) {
        return { title: 'অনুমোদনের অপেক্ষায়', message: 'আপনার মার্চেন্ট অ্যাকাউন্ট এখনো পর্যালোচনায় রয়েছে। অ্যাডমিন অনুমোদনের পর সক্রিয় হবে।' };
      }

      if (codeStr === 'ACCOUNT_REJECTED' || rawText.includes('আবেদন বাতিল')) {
        return { title: 'আবেদন বাতিল', message: 'আপনার মার্চেন্ট আত্ম-নিবন্ধন আবেদনটি বাতিল করা হয়েছে।' };
      }

      if (codeStr === 'ACCOUNT_DELETED' || codeStr === 'SHOP_NOT_FOUND' || rawText.includes('মুছে ফেলা')) {
        return { title: 'অ্যাকাউন্ট নেই', message: 'এই মার্চেন্ট অ্যাকাউন্টটি মুছে ফেলা হয়েছে বা নিষ্ক্রিয় করা হয়েছে।' };
      }

      if (codeStr === 'ACCOUNT_SUSPENDED' || codeStr === 'SHOP_SUSPENDED' || ((rawText.includes('স্থগিত') || rawText.includes('সাসপেন্ড')) && !rawText.includes('বিদ্যমান নেই'))) {
        return { title: 'অ্যাকাউন্ট স্থগিত', message: 'আপনার মার্চেন্ট অ্যাকাউন্ট সাময়িকভাবে স্থগিত করা হয়েছে। বিস্তারিত জানতে অ্যাডমিনের সাথে যোগাযোগ করুন।' };
      }

      if (codeStr === 'ACCOUNT_INACTIVE' || codeStr === 'SHOP_INACTIVE') {
        return { title: 'অ্যাকাউন্ট নিষ্ক্রিয়', message: 'আপনার মার্চেন্ট অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় রয়েছে।' };
      }

      return { title: 'লগইন ব্যর্থ', message: rawText || 'এই নম্বরে কোনো অ্যাকাউন্ট বিদ্যমান নেই।' };
    };

    try {
      const res = await api.merchantLogin(phone, pin);
      if (res.success) {
        setStoredMerchantToken(res.token);
        setMerchantToken(res.token);
        setMerchant(res.merchant);
        setShop(res.shop);
        setVerification(res.verification || null);
        setLoginPin('');
        setLoginError(null);
        setIsLoggingIn(false);
        if (onShowToast) {
          onShowToast('success', 'স্বাগতম!', `${res.shop?.nameBn || res.shop?.name || 'দোকান'}-এর মার্চেন্ট পোর্টালে স্বাগতম।`);
        }
      } else {
        // Handle backend specific error messages
        const errorDetail = getLoginErrorMessage((res as any)?.code || res.message, res.message);
        setLoginError(errorDetail);
        if (onShowToast) onShowToast('error', errorDetail.title, errorDetail.message);
        setIsLoggingIn(false);
      }
    } catch (err: any) {
      console.warn('Merchant login auth message:', err?.message || err);
      const rawCode = err?.code || err?.data?.code || '';
      const errMsg = err?.data?.message || err?.message || err?.error || '';
      let errorDetail = getLoginErrorMessage(rawCode, errMsg);
      
      setLoginError(errorDetail);
      if (onShowToast) {
        onShowToast('error', errorDetail.title, errorDetail.message);
      }
      setIsLoggingIn(false);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    removeStoredMerchantToken();
    setMerchantToken(null);
    setMerchant(null);
    setShop(null);
    setVerification(null);
    setDashboardStats(null);
    setTransactions([]);
    setMerchantOrders([]);
    setShopReviews([]);
    setRedemptionRequests([]);
    setLoginPin('');
    setIsLoggingIn(false);
    setActiveMerchantTab('approval');
    if (onShowToast) {
      onShowToast('info', 'লগআউট', 'মার্চেন্ট অ্যাকাউন্ট থেকে লগআউট করা হয়েছে।');
    }
  };

  // Handle Commission Change Request
  const handleSubmitCommissionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingCommissionReq) return;
    const parsed = Number(requestedCommission);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      if (onShowToast) onShowToast('error', 'ত্রুটি', 'সঠিক কমিশন সংখ্যা দিন (০ থেকে ১০০ এর মধ্যে)।');
      return;
    }
    setIsSubmittingCommissionReq(true);
    try {
      const res = await api.submitMerchantCommissionRequest(parsed, commissionReason);
      if (res.success) {
        if (onShowToast) onShowToast('success', 'সফল', 'আপনার কমিশন পরিবর্তনের আবেদন জমা হয়েছে।');
        setShowCommissionModal(false);
        setCommissionReason('');
        const offersRes = await api.getMerchantOffers().catch(() => null);
        if (offersRes?.success) {
          setPendingCommissionRequest(offersRes.pendingCommissionRequest);
          setCommissionRequests((offersRes as any).requests || []);
          if (offersRes.shop) setShop(offersRes.shop as any);
        }
      }
    } catch (err: any) {
      if (onShowToast) onShowToast('error', 'ত্রুটি', err.message || 'কমিশন অনুরোধ পাঠাতে ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmittingCommissionReq(false);
    }
  };

  // Handle Settings Update
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSettings(true);
      const res = await api.updateMerchantSettings({
        phone: editPhone,
        openingHours: editHours,
        description: editDesc,
        address: editAddress
      });

      if (res.success) {
        setShop(res.shop);
        if (onShowToast) {
          onShowToast('success', 'সংরক্ষিত', 'দোকানের সেটিংস সফলভাবে আপডেট হয়েছে।');
        }
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('error', 'ত্রুটি', err.message || 'সেটিংস আপডেট ব্যর্থ হয়েছে।');
      }
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleReplyReview = async (reviewId: string) => {
    if (!merchantReplyText.trim() || !shop?.id) return;
    setIsSubmittingReply(true);
    try {
      const res = await api.replyToShopReview(shop.id, reviewId, merchantReplyText.trim());
      if (res.success) {
        if (onShowToast) onShowToast('success', 'সফল', 'রিভিউয়ের উত্তর সফলভাবে দেওয়া হয়েছে।');
        setMerchantReplyText('');
        setReplyingToReviewId(null);
        loadShopReviews();
      }
    } catch (err: any) {
      if (onShowToast) onShowToast('error', 'ত্রুটি', err.message || 'উত্তর দিতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // If we have a token but merchant profile is still loading, show a beautiful loader instead of login flicker
  if (merchantToken && !merchant && isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] py-12 text-center space-y-4 max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto" />
        <h3 className="text-lg font-bold text-white mt-4">মার্চেন্ট সেশন যাচাই করা হচ্ছে</h3>
        <p className="text-xs text-slate-400">দয়া করে অপেক্ষা করুন, আপনার মার্চেন্ট তথ্য সুরক্ষিতভাবে লোড করা হচ্ছে...</p>
      </div>
    );
  }

  // ============================================================
  // UN-AUTHENTICATED: MERCHANT LOGIN VIEW
  // ============================================================
  if (!merchantToken || !merchant) {
    // When registering a new merchant, render the wizard directly in a spacious, responsive container
    if (authMode === 'register') {
      return (
        <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 pb-28">
          <MerchantRegistrationWizard
            onSuccess={(token, newMerchant, newShop, newVerification) => {
              setStoredMerchantToken(token);
              setMerchantToken(token);
              setMerchant(newMerchant);
              setShop(newShop);
              setVerification(newVerification);
              setAuthMode('login');
            }}
            onCancel={() => setAuthMode('login')}
            onShowToast={onShowToast}
          />
          {onExitMerchant && (
            <div className="mt-4 text-center">
              <button
                id="back-to-user-app-btn"
                type="button"
                onClick={onExitMerchant}
                className="py-2.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer border border-slate-800 shadow-md"
              >
                ← ইউজার লগইনে ফিরে যান (Back to User Login)
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6 pb-12 max-w-lg mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center mx-auto text-3xl shadow-lg">
              🏪
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
              Phase 7 Merchant Portal
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              পার্টনার শপ মার্চেন্ট পোর্টাল
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              দোকানের QR কোড পরিচালনা, ডিসকাউন্ট সেটিংস ও রিডেম্পশন হিসাব দেখতে লগইন করুন।
            </p>
          </div>

          {/* Auth Flow */}
          {authMode === 'login' ? (
            <>
              <form onSubmit={handleMerchantLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    মার্চেন্ট মোবাইল নম্বর (Merchant Phone)
                  </label>
                  <input
                    id="merchant-login-phone"
                    type="tel"
                    value={loginPhone}
                    onChange={(e) => {
                      setLoginPhone(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="017XXXXXXXX"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white font-bold placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    পাসওয়ার্ড / মার্চেন্ট সিক্রেট পিন
                  </label>
                  <input
                    id="merchant-login-pin"
                    type="password"
                    value={loginPin}
                    onChange={(e) => {
                      setLoginPin(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="******"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white font-bold tracking-widest placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                {loginError && (
                  <div
                    id="merchant-login-error-banner"
                    className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-200 animate-in fade-in"
                  >
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5 text-left">
                      <div className="font-bold text-rose-300">{loginError.title}</div>
                      <div className="text-rose-200/90 leading-relaxed">{loginError.message}</div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot_password');
                      setForgotPhone(loginPhone);
                      setForgotError(null);
                      setForgotSuccess(null);
                      setForgotStep(1);
                    }}
                    className="text-amber-400 hover:text-amber-300 font-medium"
                  >
                    পাসওয়ার্ড ভুলে গেছেন?
                  </button>
                </div>

                <button
                  id="merchant-login-submit-btn"
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <>
                      <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                      <span>লগইন করা হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>মার্চেন্ট হিসেবে লগইন করুন</span>
                    </>
                  )}
                </button>
              </form>
              <div className="mt-4 pt-4 border-t border-slate-800 text-center">
                <button
                  id="merchant-create-account-btn"
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className="w-full py-3 px-4 rounded-2xl border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  <Store className="w-4 h-4 text-amber-400" />
                  <span>মার্চেন্ট একাউন্ট তৈরি করুন (Create Merchant Account)</span>
                </button>
              </div>
            </>
          ) : authMode === 'forgot_password' ? (
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-300 flex items-center justify-between">
                <span>মার্চেন্ট পিন/পাসওয়ার্ড রিসেট</span>
                <span className="font-bold bg-amber-500/20 px-2 py-0.5 rounded-full text-[10px]">
                  ধাপ {forgotStep}/৩
                </span>
              </div>

              {forgotError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                  {forgotError}
                </div>
              )}

              {forgotSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
                  {forgotSuccess}
                </div>
              )}

              {forgotStep === 1 && (
                <form onSubmit={handleForgotRequest} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      মার্চেন্ট মোবাইল নম্বর
                    </label>
                    <input
                      type="tel"
                      value={forgotPhone}
                      onChange={(e) => setForgotPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white font-bold placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'ওটিপি কোড পাঠান'
                    )}
                  </button>
                </form>
              )}

              {forgotStep === 2 && (
                <form onSubmit={handleForgotVerify} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      ৬ ডিজিটের ওটিপি কোড
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      placeholder="XXXXXX"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white font-bold text-center tracking-widest placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      required
                    />
                    {forgotDevOtp && (
                      <p className="text-[11px] text-amber-400/80 mt-1.5 text-center">
                        [Dev Test Code: <span className="font-mono font-bold">{forgotDevOtp}</span>]
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'ওটিপি ভেরিফাই করুন'
                    )}
                  </button>
                </form>
              )}

              {forgotStep === 3 && (
                <form onSubmit={handleForgotReset} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      নতুন পিন / পাসওয়ার্ড
                    </label>
                    <input
                      type="password"
                      value={forgotNewPin}
                      onChange={(e) => setForgotNewPin(e.target.value)}
                      placeholder="কমপক্ষে ৪-৬ ডিজিট"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white font-bold tracking-widest placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      নতুন পিন নিশ্চিত করুন
                    </label>
                    <input
                      type="password"
                      value={forgotConfirmPin}
                      onChange={(e) => setForgotConfirmPin(e.target.value)}
                      placeholder="পুনরায় টাইপ করুন"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white font-bold tracking-widest placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'পাসওয়ার্ড সংরক্ষণ ও পরিবর্তন করুন'
                    )}
                  </button>
                </form>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setForgotError(null);
                    setForgotSuccess(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ← লগইন পাতায় ফিরে যান
                </button>
              </div>
            </div>
          ) : null}

          {/* Back button */}
          {onExitMerchant && (
            <button
              id="back-to-user-app-btn"
              type="button"
              onClick={onExitMerchant}
              className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all text-center cursor-pointer"
            >
              ← ইউজার লগইনে ফিরে যান (Back to User Login)
            </button>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // AUTHENTICATED: MERCHANT DASHBOARD & STATUS ROUTING
  // ============================================================
  const currentStatus = (verification?.verificationStatus || shop?.status || 'ACTIVE').toUpperCase();

  if (currentStatus === 'PENDING' || currentStatus === 'PENDING_VERIFICATION') {
    return (
      <MerchantPendingScreen
        shop={shop}
        verification={verification}
        onRefresh={loadMerchantDashboard}
        onLogout={handleLogout}
      />
    );
  }

  if (currentStatus === 'CORRECTION_REQUIRED' || currentStatus === 'CORRECTION') {
    return (
      <MerchantCorrectionScreen
        shop={shop}
        verification={verification}
        onResubmitted={loadMerchantDashboard}
        onLogout={handleLogout}
        onShowToast={onShowToast}
      />
    );
  }

  if (currentStatus === 'REJECTED') {
    return (
      <MerchantRejectedScreen
        shop={shop}
        verification={verification}
        onLogout={handleLogout}
      />
    );
  }

  if (currentStatus === 'SUSPENDED') {
    return (
      <MerchantSuspendedScreen
        shop={shop}
        verification={verification}
        merchant={merchant}
        onRefresh={loadMerchantDashboard}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Merchant Header Bar */}
      <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-2xl shrink-0 shadow-inner">
              🏪
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                  MERCHANT PORTAL
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {shop?.status || 'ACTIVE'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {shop?.nameBn || shop?.name}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                ম্যানেজার: <strong className="text-amber-300">{merchant.name}</strong> • {shop?.area}, {shop?.district}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>ভেরিফাইড পার্টনার শপ</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end justify-between gap-3">
            {/* Hadith Quote Box */}
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl px-3.5 py-2 max-w-xs sm:max-w-sm">
              <p className="text-[11px] sm:text-xs text-amber-200/90 leading-relaxed font-medium text-left sm:text-right">
                “সত্যবাদী ও বিশ্বস্ত ব্যবসায়ী কিয়ামতের দিন নবীগণ, সিদ্দিকীন এবং শহীদদের সাথে থাকবেন”
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="refresh-merchant-dash-btn"
                onClick={loadMerchantDashboard}
                disabled={isLoadingData}
                className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
                title="রিফ্রেশ করুন"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin text-amber-400' : ''}`} />
              </button>

              <button
                id="merchant-logout-btn"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>লগআউট</span>
              </button>

              {onExitMerchant && (
                <button
                  onClick={onExitMerchant}
                  className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
                >
                  ইউজার মোড
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Merchant Nav Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          id="merchant-tab-verification"
          onClick={() => setActiveMerchantTab('verification')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeMerchantTab === 'verification'
              ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
              : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>ভেরিফিকেশন স্ট্যাটাস ও নথি</span>
        </button>

        <button
          id="merchant-tab-products"
          onClick={() => setActiveMerchantTab('products')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeMerchantTab === 'products'
              ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
              : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>পণ্য ব্যবস্থাপনা (Products)</span>
        </button>

        <button
          id="merchant-tab-qr"
          onClick={() => setActiveMerchantTab('qr')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeMerchantTab === 'qr'
              ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
              : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>দোকান QR কোড (Shop QR)</span>
        </button>

        <button
          id="merchant-tab-approval"
          onClick={() => setActiveMerchantTab('approval')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer relative ${
            activeMerchantTab === 'approval'
              ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
              : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4 text-emerald-400" />
          <span>টোকেন অফার অনুমোদন</span>
          {redemptionRequests.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
              {toBnNumber(redemptionRequests.length)}
            </span>
          )}
        </button>

        <button
          id="merchant-tab-transactions"
          onClick={() => setActiveMerchantTab('transactions')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeMerchantTab === 'transactions'
              ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
              : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>লেনদেন তালিকা ({toBnNumber(transactions.length)})</span>
        </button>

        <button
          id="merchant-tab-orders"
          onClick={() => setActiveMerchantTab('orders')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeMerchantTab === 'orders'
              ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
              : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-cyan-400" />
          <span>অর্ডার ও রাইডার ({toBnNumber(merchantOrders.length)})</span>
        </button>

        <button
          id="merchant-tab-reviews"
          onClick={() => setActiveMerchantTab('reviews')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeMerchantTab === 'reviews'
              ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
              : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Star className="w-4 h-4 text-amber-400" />
          <span>গ্রাহক রিভিউ ({toBnNumber(shopReviews.length)})</span>
        </button>

        <button
          id="merchant-tab-settings"
          onClick={() => setActiveMerchantTab('settings')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeMerchantTab === 'settings'
              ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
              : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>সেটিংস ও ডিসকাউন্ট</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB: VERIFICATION STATUS & PROGRESS TRACKER               */}
      {/* ========================================================= */}
      {activeMerchantTab === 'verification' && (
        <div className="space-y-6">
          <MerchantProgressTracker
            verification={verification}
            shop={shop}
            status={currentStatus}
            commissionRequests={commissionRequests}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: PRODUCTS MANAGEMENT                                  */}
      {/* ========================================================= */}
      {activeMerchantTab === 'products' && (
        <div className="space-y-6">
          <MerchantProductsTab />
        </div>
      )}



      {/* ========================================================= */}
      {/* TAB 2: SHOP QR CODE MANAGEMENT                           */}
      {/* ========================================================= */}
      {activeMerchantTab === 'qr' && (
        <div className="space-y-6 max-w-lg mx-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-5">
            <div className="space-y-1">
              <span className="px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                Official Merchant QR
              </span>
              <h3 className="text-lg font-black text-white pt-1">
                {shop?.nameBn || shop?.name}
              </h3>
              <p className="text-xs text-slate-400">
                এই QR কোডটি আপনার দোকানের ক্যাশ কাউন্টারে প্রদর্শন করুন
              </p>
            </div>

            {/* Visual Printed-Ready QR Card */}
            <div className="p-6 rounded-3xl bg-white text-slate-950 space-y-4 shadow-2xl max-w-xs mx-auto">
              <div className="flex items-center justify-center gap-1 text-emerald-800 font-black text-xs">
                <span>🕌 CAVE COMPANIONS PARTNER</span>
              </div>

              {/* QR Pattern visual box */}
              <div className="w-56 h-56 mx-auto bg-slate-950 rounded-2xl p-3 flex flex-col items-center justify-center text-white relative shadow-inner">
                {qrDataUrl ? (
                  <div className="w-full h-full bg-white rounded-xl overflow-hidden p-1">
                    <img src={qrDataUrl} alt="Shop QR Code" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-full h-full border-4 border-amber-400 rounded-xl flex flex-col items-center justify-center p-2 text-center">
                    <QrCode className="w-24 h-24 text-amber-400 animate-pulse" />
                    <span className="text-[9px] font-mono text-slate-300 mt-1 tracking-wider">
                      GENERATING...
                    </span>
                  </div>
                )}
                {shop?.qrIdentifier && (
                  <span className="text-[10px] font-mono text-slate-400 mt-2 tracking-tighter bg-slate-950 px-2">
                    {shop.qrIdentifier}
                  </span>
                )}
              </div>

              <div className="space-y-1 text-center font-sans">
                <p className="font-extrabold text-sm text-slate-900">{shop?.nameBn || shop?.name}</p>
                <p className="text-[11px] text-slate-600">টোকেন স্ক্যান করে তাৎক্ষণিক ছাড় গ্রহণ করুন</p>
              </div>
            </div>

            {/* QR Details */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">QR আইডেন্টিফায়ার:</span>
                <span className="text-amber-400 font-bold">{shop?.qrIdentifier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">স্ট্যাটাস:</span>
                <span className="text-emerald-400 font-bold">ACTIVE & SECURED</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">সর্বশেষ আপডেট:</span>
                <span className="text-slate-300">{shop?.updatedAt ? new Date(shop.updatedAt).toLocaleString('bn-BD') : 'N/A'}</span>
              </div>
            </div>

            {/* Download, Save & Print Action Buttons */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Download Standard QR PNG */}
                <button
                  type="button"
                  id="merchant-download-qr-btn"
                  onClick={handleDownloadQrOnly}
                  disabled={!qrDataUrl}
                  className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  title="শুধুমাত্র QR কোড ছবি ডাউনলোড করুন"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>QR কোড ডাউনলোড (PNG)</span>
                </button>

                {/* 2. Download Printable Standee Poster */}
                <button
                  type="button"
                  id="merchant-download-poster-btn"
                  onClick={handleDownloadQrPoster}
                  disabled={!qrDataUrl || isDownloadingQrPoster}
                  className="py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  title="দোকানের ক্যাশ কাউন্টারে প্রদর্শনের জন্য প্রস্তুত স্ট্যান্ডি পোস্টার ডাউনলোড করুন"
                >
                  {isDownloadingQrPoster ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>পোস্টার তৈরি হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <FileImage className="w-4 h-4 text-slate-950" />
                      <span>স্ট্যান্ডি পোস্টার ডাউনলোড</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 3. Direct Print */}
                <button
                  type="button"
                  id="merchant-print-qr-btn"
                  onClick={handlePrintQrPoster}
                  disabled={!qrDataUrl}
                  className="py-2.5 px-4 rounded-2xl bg-slate-950 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Printer className="w-4 h-4 text-sky-400" />
                  <span>সরাসরি প্রিন্ট করুন</span>
                </button>

                {/* 4. Copy Identifier */}
                <button
                  type="button"
                  id="merchant-copy-qrid-btn"
                  onClick={handleCopyQrIdentifier}
                  disabled={!shop?.qrIdentifier}
                  className="py-2.5 px-4 rounded-2xl bg-slate-950 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isCopiedQrId ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300 font-bold">কপি সম্পন্ন!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-400" />
                      <span>QR আইডি কপি করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action: Regenerate QR removed as per Admin-only policy */}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: TOKEN OFFER APPROVAL GATE                           */}
      {/* ========================================================= */}
      {activeMerchantTab === 'approval' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Header & Live Polling Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-black text-white">
                  টোকেন অফার অনুমোদন (Merchant Approval Gate)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                গ্রাহক QR কোড স্ক্যান করে ডিসকাউন্ট অনুরোধ পাঠালে এখানে তাৎক্ষণিকভাবে প্রদর্শিত হবে।
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAutoRefreshApproval((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isAutoRefreshApproval
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isAutoRefreshApproval ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                <span>{isAutoRefreshApproval ? 'অটো-রিফ্রেশ চালু' : 'অটো-রিফ্রেশ বন্ধ'}</span>
              </button>

              <button
                type="button"
                onClick={() => loadRedemptionRequests(false)}
                disabled={loadingRedemptionRequests}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold disabled:opacity-50"
                title="ম্যানুয়াল রিফ্রেশ করুন"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRedemptionRequests ? 'animate-spin text-amber-400' : ''}`} />
                <span>{loadingRedemptionRequests ? 'রিফ্রেশ হচ্ছে...' : 'রিফ্রেশ'}</span>
              </button>
            </div>
          </div>

          {/* Pending List */}
          {redemptionRequests.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 flex items-center justify-center mx-auto text-2xl">
                🛡️
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="text-base font-bold text-white">বর্তমানে কোনো অপেক্ষমাণ অফার অনুরোধ নেই</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  গ্রাহক দোকানে এসে আপনার QR কোড স্ক্যান করে অফার ক্লেইম করলে সাথে সাথে এখানে অনুমোদনের জন্য ভেসে উঠবে।
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                <ShieldCheck className="w-4 h-4" />
                <span>মার্চেন্ট অনুমোদন ছাড়া কোনো টোকেন বা ডিসকাউন্ট কার্যকর হবে না।</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                  অপেক্ষমাণ অনুরোধ ({toBnNumber(redemptionRequests.length)} টি)
                </span>
                <span className="text-[11px] text-slate-400">
                  বিল পরিমাণ যাচাই করে অনুমোদন বা প্রত্যাখ্যান করুন
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {redemptionRequests.map((req, rIdx) => (
                  <motion.div
                    key={`mp-req-${req.id || 'req'}-${rIdx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 border border-amber-500/40 hover:border-amber-500/70 rounded-3xl p-5 shadow-2xl space-y-4 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-sm">
                          {req.tokenType === 'GOLD' ? '🥇' : req.tokenType === 'SILVER' ? '🥈' : '🥉'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {req.userName || 'সম্মানিত গ্রাহক'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {req.tokenType} TOKEN
                            </span>
                            {req.isDonated && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                দানকৃত ❤️
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block font-mono">
                            {maskPhone(req.userPhone)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-right">
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                          <Clock3 className="w-3.5 h-3.5 text-amber-400" />
                          <span>
                            {new Date(req.createdAt).toLocaleTimeString('bn-BD', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Financial Summary Calculation */}
                    <div className="bg-slate-950/90 border border-slate-800/80 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">মোট ক্রয়ের পরিমাণ</span>
                        <span className="text-sm font-bold text-white font-mono">
                          ৳ {toBnNumber(req.purchaseAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">টোকেন ডিসকাউন্ট</span>
                        <span className="text-sm font-bold text-emerald-400 font-mono">
                          - ৳ {toBnNumber(req.discountAmount)} ({toBnNumber(req.discountPercentage)}%)
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">পরিশোধযোগ্য বিল</span>
                        <span className="text-base font-black text-amber-400 font-mono">
                          ৳ {toBnNumber(req.finalPayableAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => handleApproveRedemption(req.id)}
                        disabled={processingRequestId === req.id}
                        className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {processingRequestId === req.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>অনুমোদন হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                            <span>অনুমোদন করুন (Approve)</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRejectModalRequest(req);
                          setRejectReasonInput('');
                        }}
                        disabled={processingRequestId === req.id}
                        className="py-3 px-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>প্রত্যাখ্যান (Reject)</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Rejection Modal */}
          {rejectModalRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100">
                <div className="flex items-center gap-2.5 text-rose-400">
                  <AlertTriangle className="w-6 h-6 shrink-0" />
                  <h3 className="text-base font-bold text-white">অনুরোধ প্রত্যাখ্যান নিশ্চিত করুন</h3>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  আপনি <strong className="text-white">{rejectModalRequest.userName || 'গ্রাহকের'}</strong> ৳ {toBnNumber(rejectModalRequest.purchaseAmount)} টাকার অফার অনুরোধটি প্রত্যাখ্যান করতে যাচ্ছেন। প্রত্যাখ্যান করলে গ্রাহকের টোকেন সম্পূর্ণ অক্ষত থাকবে।
                </p>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    প্রত্যাখ্যানের কারণ (ঐচ্ছিক):
                  </label>
                  <input
                    type="text"
                    value={rejectReasonInput}
                    onChange={(e) => setRejectReasonInput(e.target.value)}
                    placeholder="যেমন: বিল পরিমাণ অমিল / অন্য কোনো কারণ"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleRejectRedemption}
                    disabled={processingRequestId === rejectModalRequest.id}
                    className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    {processingRequestId === rejectModalRequest.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span>হ্যাঁ, প্রত্যাখ্যান করুন</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRejectModalRequest(null);
                      setRejectReasonInput('');
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
                  >
                    বাতিল
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: TRANSACTIONS LOG & FINANCIAL DOWNLOAD             */}
      {/* ========================================================= */}
      {activeMerchantTab === 'transactions' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Header & Download Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-500" />
                <span>লেনদেন তালিকা ও হিসাব বিবরণী</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                আপনার দোকানের রিয়েল-টাইম রিডেম্পশন ও কমিশন হিসাব ডাউনলোড করুন।
              </p>
            </div>

            {/* Download Button with Dropdown */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowDownloadMenu(prev => !prev)}
                disabled={downloadingFormat !== null}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
                id="merchant-download-report-btn"
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
                  className="absolute right-0 mt-2 w-52 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95"
                  id="merchant-download-menu"
                >
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    ফরম্যাট নির্বাচন করুন
                  </div>
                  <button
                    onClick={() => handleDownloadMerchantReport('pdf')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors text-left cursor-pointer"
                  >
                    <span>PDF রিপোর্ট (.pdf)</span>
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-black">PDF</span>
                  </button>
                  <button
                    onClick={() => handleDownloadMerchantReport('xlsx')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors text-left cursor-pointer"
                  >
                    <span>Excel শিট (.xlsx)</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black">XLSX</span>
                  </button>
                  <button
                    onClick={() => handleDownloadMerchantReport('csv')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors text-left cursor-pointer"
                  >
                    <span>CSV ফাইল (.csv)</span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-black">CSV</span>
                  </button>
                </div>
              )}
            </div>
          </div>



          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center gap-3 shadow-md">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <select
                value={txDateFilter}
                onChange={(e) => setTxDateFilter(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">সব সময় (All Time)</option>
                <option value="TODAY" className="bg-slate-900">আজ (Today)</option>
                <option value="YESTERDAY" className="bg-slate-900">গতকাল (Yesterday)</option>
                <option value="LAST_7_DAYS" className="bg-slate-900">বিগত ৭ দিন (Last 7 Days)</option>
                <option value="THIS_MONTH" className="bg-slate-900">চলতি মাস (This Month)</option>
                <option value="LAST_MONTH" className="bg-slate-900">গত মাস (Last Month)</option>
                <option value="CUSTOM" className="bg-slate-900">নির্দিষ্ট তারিখ (Custom Range)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl">
              <Filter className="w-3.5 h-3.5 text-amber-500" />
              <select
                value={txTokenFilter}
                onChange={(e) => setTxTokenFilter(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">সকল টোকেন</option>
                <option value="GOLD" className="bg-slate-900">গোল্ড (Gold)</option>
                <option value="SILVER" className="bg-slate-900">সিলভার (Silver)</option>
                <option value="BRONZE" className="bg-slate-900">ব্রোঞ্জ (Bronze)</option>
              </select>
            </div>

            {txDateFilter === 'CUSTOM' && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                <input
                  type="date"
                  value={txCustomFrom}
                  onChange={(e) => setTxCustomFrom(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                />
                <span className="text-slate-500 font-bold text-xs">থেকে</span>
                <input
                  type="date"
                  value={txCustomTo}
                  onChange={(e) => setTxCustomTo(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                />
              </div>
            )}

            <div className="ml-auto">
              <button
                onClick={loadTransactionsData}
                disabled={loadingTx}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="রিফ্রেশ করুন"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingTx ? 'animate-spin text-amber-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          {transactions.length === 0 ? (
            <div className="p-10 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <Receipt className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-white">কোনো লেনদেন রেকর্ড পাওয়া যায়নি</p>
              <p className="text-xs text-slate-400">নির্বাচিত তারিখ বা ফিল্টারে আপনার দোকানের কোনো রিডেম্পশন রেকর্ড নেই।</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800">
                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Date</th>
                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">User</th>
                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">মূল বিল</th>
                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">কমিশন পুল</th>
                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">ডিসকাউন্ট</th>
                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">দানকৃত অর্থ</th>
                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">কমিশন স্ট্যাটাস / Status</th>
                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">গ্রাহক দিয়েছে</th>
                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">CC পাবে</th>
                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">অ্যাকশন / Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {transactions.map((tx, tIdx) => {
                      const grossComm = tx.grossCommissionAmount !== undefined && tx.grossCommissionAmount !== null
                        ? tx.grossCommissionAmount
                        : Math.round((tx.purchaseAmount * (tx.commissionRate || 0)) / 100);
                      const custDiscount = tx.isDonated ? 0 : (tx.discountAmount || 0);
                      const ccPabe = tx.caveCompanionsNetIncome !== undefined && tx.caveCompanionsNetIncome !== null
                        ? tx.caveCompanionsNetIncome
                        : (grossComm - custDiscount);

                      return (
                        <tr key={`mp-tx-${tx.id || 'tx'}-${tIdx}`} className="hover:bg-slate-800/30 transition-colors group">
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="text-[11px] font-medium text-slate-300">
                              {new Date(tx.createdAt).toLocaleDateString('bn-BD', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="text-[11px] font-bold text-white">{tx.userName || 'সম্মানিত গ্রাহক'}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                                tx.tokenType === 'GOLD' ? 'bg-amber-500/10 text-amber-500' :
                                tx.tokenType === 'SILVER' ? 'bg-slate-400/10 text-slate-300' :
                                'bg-orange-900/20 text-orange-400'
                              }`}>
                                {tx.tokenType}
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono">{maskPhone(tx.userPhone)}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-center">
                            <span className="text-[11px] font-bold text-white font-mono">৳ {toBnNumber(tx.purchaseAmount)}</span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-center">
                            <span className="text-[11px] font-bold text-amber-500/80 font-mono">৳ {toBnNumber(grossComm)}</span>
                            <div className="text-[8px] text-slate-600">({toBnNumber(tx.commissionRate || 0)}%)</div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-center">
                            <span className="text-[11px] font-bold text-rose-400 font-mono">৳ {toBnNumber(tx.discountAmount)}</span>
                            <div className="text-[8px] text-slate-600">({toBnNumber(tx.discountPercentage || 0)}%)</div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-center">
                            {tx.isDonated ? (
                              <div className="flex flex-col items-center justify-center">
                                <span className="text-[11px] font-black text-emerald-400 font-mono flex items-center justify-center gap-0.5">
                                  <Heart className="w-2.5 h-2.5 fill-current text-emerald-400 animate-pulse" />
                                  ৳ {toBnNumber(tx.donatedAmount || 0)}
                                </span>
                                <span className="text-[8px] text-emerald-300 font-bold">দান সম্পন্ন</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-bold">-</span>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-center">
                            {tx.commissionPaymentStatus === 'paid' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                🟢 পরিশোধিত / Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                🟠 অপরিশোধিত / Unpaid
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-center">
                            <span className="text-[11px] font-black text-emerald-400 font-mono">৳ {toBnNumber(tx.finalPayableAmount)}</span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-center">
                            <span className="text-[11px] font-black text-blue-400 font-mono">৳ {toBnNumber(ccPabe)}</span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedMemoTx(tx)}
                                className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="ক্যাশ মেমো দেখুন ও প্রিন্ট করুন"
                              >
                                <FileText className="w-3 h-3" />
                                <span>মেমো</span>
                              </button>
                              {tx.commissionPaymentStatus === 'paid' ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMerchantTx(tx.id)}
                                  className="p-1 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="ইতিহাস থেকে মুছে ফেলুন / Delete from History"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="p-1 text-slate-800 cursor-not-allowed opacity-30"
                                  title="অপরিশোধিত লেনদেন মোছা যাবে না / Unpaid cannot be deleted"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: CUSTOMER ORDERS & RIDER DELIVERY                     */}
      {/* ========================================================= */}
      {activeMerchantTab === 'orders' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-cyan-400" />
                <span>গ্রাহক অর্ডার ও রাইডার ডেলিভারি</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                শুধুমাত্র লোকাল মার্কেট (CC রাইডার) অর্ডারের পিকআপ ওটিপি, রাইডার ডেলিভারি এবং ক্যাশ নিষ্পত্তি।
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {merchantOrders.some(o => o.settlementStatus === 'SETTLED' || o.status === 'DONE' || o.status === 'PRODUCT_BACK') && (
                <button
                  type="button"
                  onClick={handleClearCompletedOrders}
                  disabled={loadingOrders}
                  className="inline-flex items-center space-x-1 px-3 py-2 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-700/50 rounded-2xl text-xs font-semibold transition-colors cursor-pointer"
                  title="সম্পন্ন হওয়া অর্ডার হিস্ট্রি মুছে ফেলুন"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">সম্পন্ন হিস্ট্রি ক্লিয়ার</span>
                </button>
              )}

              <button
                type="button"
                onClick={loadMerchantOrders}
                disabled={loadingOrders}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-semibold transition-colors shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? 'animate-spin' : ''}`} />
                <span>অর্ডার রিফ্রেশ</span>
              </button>
            </div>
          </div>

          {/* Orders List */}
          {loadingOrders ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
              <span>অর্ডার লোড হচ্ছে...</span>
            </div>
          ) : merchantOrders.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">এখনও কোনো লোকাল অর্ডার পাওয়া যায়নি</p>
              <p className="text-xs text-slate-500">গ্রাহকরা লোকাল মার্কেট থেকে পণ্য অর্ডার করলে তা তাৎক্ষণিক রাইডার ডেলিভারির জন্য এখানে প্রদর্শিত হবে।</p>
            </div>
          ) : (
            <div className="space-y-4">
              {merchantOrders.map((order, oIdx) => {
                const isLocal = (order.orderType || order.marketType || 'LOCAL') === 'LOCAL';
                const isSettled = order.merchantShopDone || order.settlementStatus === 'SETTLED' || order.status === 'DONE';
                const isProductBack = order.merchantShopReturned || order.status === 'PRODUCT_BACK';
                const isDelivered = (order.items && order.items.length > 0)
                  ? order.items.every((it: any) => it.shopDelivered)
                  : (order.riderStatus === 'DELIVERED' || order.status === 'DELIVERED');
                const isPickedUp = (order.items && order.items.length > 0)
                  ? order.items.every((it: any) => it.shopPickedUp)
                  : (order.riderStatus === 'PICKED_UP' || order.riderStatus === 'DELIVERED');
                const isActionLoading = orderActionLoadingId === order.id;

                return (
                  <div
                    key={`mp-ord-${order.id || 'ord'}-${oIdx}`}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-md hover:border-slate-700 transition-all text-xs"
                  >
                    {/* Top Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="font-bold text-white text-xs">
                          অর্ডার #{order.orderNumber || order.id.slice(0, 8)}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isLocal
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}>
                          {isLocal ? 'লোকাল মার্কেট (CC রাইডার)' : 'জাতীয় মার্কেট (কুরিয়ার)'}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isSettled
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : isProductBack
                            ? 'bg-rose-500/20 text-rose-300'
                            : isDelivered
                            ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isSettled ? 'DONE (সম্পন্ন)' : isProductBack ? 'পণ্য ফেরত' : isDelivered ? 'ডেলিভার্ড (নিষ্পত্তি বাকি)' : order.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString('bn-BD', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>

                        {/* Delete single order from history */}
                        <button
                          type="button"
                          onClick={() => handleDeleteMerchantOrder(order.id)}
                          disabled={isActionLoading}
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition cursor-pointer"
                          title="অর্ডারটি মুছে ফেলুন"
                        >
                          <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-400" />
                        </button>
                      </div>
                    </div>

                    {/* Customer & Delivery Address */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">গ্রাহক তথ্য</span>
                        <p className="font-bold text-white text-xs">{order.customerName}</p>
                        <p className="text-slate-400 text-[11px]">{order.customerPhone}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">ডেলিভারি ঠিকানা</span>
                        <p className="text-slate-300 text-[11px] leading-snug">{order.deliveryAddress}</p>
                      </div>
                    </div>

                    {/* Merchant's Shop Products list */}
                    {order.items && order.items.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                        <span className="text-[10px] text-slate-500 block font-semibold">আপনার শপের পণ্য ও মূল্য</span>
                        <div className="space-y-1.5">
                          {order.items.map((item: any, itIdx: number) => (
                            <div key={`m-item-${item.id || itIdx}`} className="flex items-center justify-between text-xs text-slate-200">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-slate-400">•</span>
                                <span className="font-bold text-white">{item.productName}</span>
                                <span className="text-slate-500 font-semibold">x{toBnNumber(item.quantity)}</span>
                              </div>
                              <span className="font-bold text-amber-400">
                                ৳ {toBnNumber(Number(item.customerProductPayable || item.originalPrice * item.quantity))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Order Financials */}
                    {!order.isMultiShop && (
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">পণ্যের মূল্য:</span>
                          <strong className="text-white font-bold">৳ {toBnNumber(order.productTotalPayable ?? order.productTotalOriginal ?? order.subtotal ?? 0)}</strong>
                          <span className="text-slate-700">|</span>
                          <span className="text-slate-500">ডেলিভারি চার্জ:</span>
                          <strong className={order.deliveryWaived ? 'text-emerald-400 line-through' : 'text-white'}>
                            ৳ {toBnNumber(order.deliveryCharge ?? order.deliveryFee ?? 0)}
                          </strong>
                          {order.deliveryWaived && (
                            <span className="text-[10px] font-bold text-emerald-400">(মওকুফ)</span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 text-xs">মোট বিল: </span>
                          <strong className="text-sm text-amber-400 font-extrabold">
                            ৳ {toBnNumber(order.totalCodAmount ?? order.totalPayable ?? order.totalAmount ?? 0)}
                          </strong>
                          <span className="text-[10px] text-slate-500 inline-block ml-1">(ক্যাশ অন ডেলিভারি)</span>
                        </div>
                      </div>
                    )}

                    {/* LOCAL RIDER SECTION & CODE SYSTEM */}
                    {isLocal && (
                      <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex items-center space-x-1.5">
                            <Bike className="w-4 h-4 text-emerald-400" />
                            <span className="font-bold text-white text-xs">CC রাইডার তথ্য ও কোড সিস্টেম</span>
                          </div>
                        </div>

                        {/* Codes for Pickup & Settlement/Delivery */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {/* Pickup Code Box */}
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-semibold">পিকআপ কোড (Pickup Code)</span>
                              <span className="font-mono text-sm font-black text-amber-400 tracking-wider">
                                {order.pickupOtp || 'নেই'}
                              </span>
                            </div>
                            {!isPickedUp && !isDelivered && !isSettled && (
                              <button
                                onClick={() => handleGenerateCode(order.id, 'pickup')}
                                disabled={orderActionLoadingId === order.id}
                                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold transition-all"
                              >
                                {order.pickupOtp ? 'নতুন কোড তৈরি' : 'কোড তৈরি করুন'}
                              </button>
                            )}
                          </div>

                          {/* Settlement / Delivery Code Box */}
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-semibold">নিষ্পত্তি কোড (Delivery Code)</span>
                              <span className="font-mono text-sm font-black text-emerald-400 tracking-wider">
                                {order.deliveryOtp || 'নেই'}
                              </span>
                            </div>
                            {!isDelivered && !isSettled && (
                              <button
                                onClick={() => handleGenerateCode(order.id, 'delivery')}
                                disabled={orderActionLoadingId === order.id}
                                className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold transition-all"
                              >
                                {order.deliveryOtp ? 'নতুন কোড তৈরি' : 'কোড তৈরি করুন'}
                              </button>
                            )}
                          </div>
                        </div>

                        {order.riderName ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-800">
                            <div>
                              <span className="text-[10px] text-slate-500">রাইডার নাম</span>
                              <p className="font-semibold text-white">{order.riderName}</p>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500">ফোন নম্বর</span>
                              <p className="text-emerald-400 font-mono">
                                <a href={`tel:${order.riderPhone}`}>{order.riderPhone}</a>
                              </p>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500">রাইডার স্ট্যাটাস</span>
                              <p className="font-bold text-amber-400">{order.riderStatus}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-400 text-xs italic pt-1">
                            নিকটবর্তী রাইডারদের কাছে রিকোয়েস্ট ব্রডকাস্ট করা হয়েছে। কোনো রাইডার গ্রহণ করলে তার বিবরণ দেখতে পাবেন।
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {activeMerchantTab === 'reviews' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>গ্রাহকদের রিভিউ ও রেটিং বিশ্লেষণ</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  আপনার দোকান থেকে টোকেন ছাড় ও কেনাকাটা করা সম্মানিত গ্রাহকদের রিভিউ ও রেটিং।
                </p>
              </div>
              <button
                type="button"
                onClick={loadShopReviews}
                disabled={loadingReviews}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingReviews ? 'animate-spin text-amber-400' : ''}`} />
                <span>রিভিউ রিফ্রেশ</span>
              </button>
            </div>

            {/* Score & Rating Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-800">
              {/* Average Score Box */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight">
                  {toBnNumber(reviewsSummary.averageRating.toFixed(1))}
                </span>
                <div className="flex items-center gap-1 my-1.5">
                  {[1, 2, 3, 4, 5].map((star, sIdx) => (
                    <Star
                      key={`mp-avg-star-${star}-${sIdx}`}
                      className={`w-4 h-4 ${
                        star <= Math.round(reviewsSummary.averageRating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-400">
                  সর্বমোট {toBnNumber(reviewsSummary.totalReviews)} টি গ্রাহক রিভিউ
                </span>
              </div>

              {/* Breakdown Bars */}
              <div className="md:col-span-2 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                {[5, 4, 3, 2, 1].map((rating, rIdx) => {
                  const count = reviewsSummary.ratingDistribution[rating] || 0;
                  const percent = reviewsSummary.totalReviews > 0
                    ? Math.round((count / reviewsSummary.totalReviews) * 100)
                    : 0;

                  return (
                    <div key={`mp-rating-${rating}-${rIdx}`} className="flex items-center gap-2 text-xs">
                      <span className="w-12 flex items-center gap-1 font-bold text-slate-300">
                        <span>{toBnNumber(rating)}</span>
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      </span>
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-16 text-right font-mono text-[11px] text-slate-400">
                        {toBnNumber(count)} ({toBnNumber(percent)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Individual Reviews List */}
          {loadingReviews ? (
            <div className="p-10 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-400">রিভিউ তালিকা লোড হচ্ছে...</p>
            </div>
          ) : shopReviews.length === 0 ? (
            <div className="p-10 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-amber-400 flex items-center justify-center mx-auto text-xl">
                ⭐
              </div>
              <h4 className="text-sm font-bold text-white">এখনো কোনো গ্রাহক রিভিউ জমা দেননি</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                গ্রাহকরা আপনার দোকানে টোকেন ব্যবহার করার পর অথবা অ্যাপে আপনার দোকান পরিদর্শন করে তাদের মূল্যবান মতামত প্রদান করবেন।
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {shopReviews.map((rev, revIdx) => (
                <div
                  key={`${rev.id || 'mp-rev'}-${revIdx}`}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 font-bold flex items-center justify-center text-sm shadow-xs">
                        {rev.userName ? rev.userName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{rev.userName || 'সম্মানিত গ্রাহক'}</span>
                          {rev.isVerifiedPurchase && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              ভেরিফাইড ক্রেতা
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(rev.createdAt).toLocaleDateString('bn-BD', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Star Display */}
                    <div className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800">
                      {[1, 2, 3, 4, 5].map((star, idx) => (
                        <Star
                          key={`mp-rev-star-${rev.id || revIdx}-${star}`}
                          className={`w-3 h-3 ${
                            star <= rev.rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {rev.comment && (
                    <p className="text-xs text-slate-300 leading-relaxed pt-1 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">
                      "{rev.comment}"
                    </p>
                  )}

                  {/* Merchant Reply Section */}
                  <div className="mt-2.5 pt-2.5 border-t border-slate-800/50">
                    {rev.reply ? (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400">
                          <MessageSquare className="w-3 h-3" />
                          <span>আপনার উত্তর:</span>
                          <span className="text-slate-500 ml-auto font-mono">
                            {rev.repliedAt ? new Date(rev.repliedAt).toLocaleDateString('bn-BD') : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed italic">
                          "{rev.reply}"
                        </p>
                        <button
                          onClick={() => {
                            setReplyingToReviewId(rev.id);
                            setMerchantReplyText(rev.reply || '');
                          }}
                          className="text-[10px] text-amber-500/70 hover:text-amber-500 underline font-bold cursor-pointer"
                        >
                          এডিট করুন
                        </button>
                      </div>
                    ) : replyingToReviewId === rev.id ? (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <textarea
                          autoFocus
                          value={merchantReplyText}
                          onChange={(e) => setMerchantReplyText(e.target.value)}
                          placeholder="গ্রাহককে ধন্যবাদ জানান অথবা তার প্রশ্নের উত্তর লিখুন..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 resize-none"
                          rows={2}
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setReplyingToReviewId(null);
                              setMerchantReplyText('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-[10px] font-bold hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            বাতিল
                          </button>
                          <button
                            onClick={() => handleReplyReview(rev.id)}
                            disabled={isSubmittingReply || !merchantReplyText.trim()}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-black hover:bg-amber-400 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {isSubmittingReply ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            <span>উত্তর দিন</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReplyingToReviewId(rev.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-amber-400/80 hover:text-amber-400 text-[10px] font-bold transition-all border border-slate-800 cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>রিভিউয়ের উত্তর দিন</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: SHOP SETTINGS & DISCOUNT CONFIGURATION            */}
      {/* ========================================================= */}
      {activeMerchantTab === 'settings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 max-w-xl mx-auto">
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-white">
              দোকানের তথ্য ও ডিসকাউন্ট সেটিংস
            </h3>
            <p className="text-xs text-slate-400">
              আপনার দোকানের ঠিকানা, যোগাযোগের নম্বর এবং টোকেন ডিসকাউন্ট রেট আপডেট করুন।
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                দোকানের ফোন নম্বর
              </label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                খোলার সময় (Opening Hours)
              </label>
              <input
                type="text"
                value={editHours}
                onChange={(e) => setEditHours(e.target.value)}
                placeholder="সকাল ১০:০০ - রাত ১০:০০"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                দোকানের পূর্ণ ঠিকানা
              </label>
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                সংক্ষিপ্ত বিবরণ (Description)
              </label>
              <textarea
                rows={2}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Shop Map Location Configuration */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white">
                    দোকানের ম্যাপ লোকেশন (GPS Coordinates)
                  </h4>
                </div>
                {shop?.latitude && shop?.longitude && (shop.latitude !== 0 || shop.longitude !== 0) ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    সেট করা হয়েছে
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    সেট করা হয়নি
                  </span>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <p className="text-[11px] text-slate-300">
                  {shop?.latitude && shop?.longitude && (shop.latitude !== 0 || shop.longitude !== 0)
                    ? (shop.locationAddress || `${shop.address}, ${shop.area}`)
                    : 'ম্যাপে দোকানের সঠিক পিন লোকেশন সেট করুন যেন গ্রাহকরা ম্যাপে দেখতে ও দিকনির্দেশনা নিতে পারে।'}
                </p>
                {shop?.latitude && shop?.longitude && (shop.latitude !== 0 || shop.longitude !== 0) && (
                  <div className="flex items-center gap-2 font-mono text-[10px] text-emerald-400">
                    <span>Lat: {shop.latitude.toFixed(5)}</span>
                    <span>•</span>
                    <span>Lng: {shop.longitude.toFixed(5)}</span>
                    {shop.locationUpdatedAt && (
                      <span className="text-slate-500 font-sans ml-auto">
                        আপডেট: {new Date(shop.locationUpdatedAt).toLocaleDateString('bn-BD')}
                      </span>
                    )}
                  </div>
                )}
                
                <div className="flex items-center gap-2 pt-1">
                  {shop?.latitude && shop?.longitude && (shop.latitude !== 0 || shop.longitude !== 0) && (
                    <button
                      type="button"
                      onClick={() => setShowLocationPreviewModal(true)}
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ম্যাপে প্রিভিউ</span>
                    </button>
                  )}
                  <button
                    id="merchant-settings-location-btn"
                    type="button"
                    onClick={() => setShowLocationModal(true)}
                    className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{shop?.latitude && shop?.longitude && (shop.latitude !== 0 || shop.longitude !== 0) ? 'লোকেশন পরিবর্তন / আপডেট করুন' : 'দোকানের লোকেশন সেট করুন'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* View-Only Token Discounts */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>বর্তমান সক্রিয় টোকেন ডিসকাউন্ট (Current Token Offers)</span>
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[9px] font-bold">
                    View-Only (অপরিবর্তনযোগ্য)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  নিচের ডিসকাউন্ট হারগুলো অ্যাডমিন কতৃপক্ষ কর্তৃক নির্ধারিত এবং মার্চেন্ট প্যানেল থেকে পরিবর্তনযোগ্য নয়।
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <span className="text-[10px] text-amber-400 font-bold block">🥇 Gold Token</span>
                    <span className="text-base font-black text-white mt-1 block">{toBnNumber(shop?.goldDiscount || 15)}%</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-300/10 border border-slate-300/20 text-center">
                    <span className="text-[10px] text-slate-300 font-bold block">🥈 Silver Token</span>
                    <span className="text-base font-black text-white mt-1 block">{toBnNumber(shop?.silverDiscount || 10)}%</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-700/10 border border-amber-700/20 text-center">
                    <span className="text-[10px] text-orange-400 font-bold block">🥉 Bronze Token</span>
                    <span className="text-base font-black text-white mt-1 block">{toBnNumber(shop?.bronzeDiscount || 5)}%</span>
                  </div>
                </div>
              </div>
            </div>


            {/* Commission Change Request Section */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>কমিশন পরিবর্তনের আবেদন (Commission Change Request)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    আপনার দোকানের কমিশন হার পরিবর্তনের জন্য অ্যাডমিনের নিকট আবেদন করুন।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await api.getMerchantOffers();
                      if (res.success && res.shop) {
                        setShop(res.shop as any);
                      }
                    } catch (err) {}
                    setShowCommissionModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-extrabold text-xs shadow-md transition-all cursor-pointer shrink-0"
                >
                  কমিশন পরিবর্তনের আবেদন
                </button>
              </div>
            </div>


            {/* Save Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-amber-950 font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isSavingSettings ? (
                  <>
                    <div className="w-4 h-4 border-2 border-amber-950/30 border-t-amber-950 rounded-full animate-spin"></div>
                    <span>সেভ হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>সেটিংস সেভ করুন</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Commission Change Request Modal */}
      {showCommissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>কমিশন পরিবর্তনের আবেদন</span>
              </h3>
              <button
                onClick={() => setShowCommissionModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCommissionRequest} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  বর্তমান কমিশন:
                </label>
                <div className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-black text-amber-400">
                  {toBnNumber(shop?.commissionRate !== undefined && shop?.commissionRate !== null ? shop.commissionRate : 3)}%
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  নতুন কমিশন প্রস্তাব করুন: <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={requestedCommission}
                    onChange={(e) => setRequestedCommission(e.target.value)}
                    placeholder="যেমন: ৩.৫"
                    className="w-full px-3.5 py-2.5 pr-8 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  আবেদনের কারণ (ঐচ্ছিক):
                </label>
                <textarea
                  rows={3}
                  value={commissionReason}
                  onChange={(e) => setCommissionReason(e.target.value)}
                  placeholder="কেন কমিশন পরিবর্তন করতে চান তার কারণ লিখুন..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCommissionModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCommissionReq}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingCommissionReq ? 'জমা দেওয়া হচ্ছে...' : 'আবেদন জমা দিন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merchant Location Picker Modal */}
      {showLocationModal && shop && (
        <MerchantLocationPickerModal
          shop={shop}
          onClose={() => setShowLocationModal(false)}
          onSuccess={(updatedShop) => {
            setShop(updatedShop);
            if (onShowToast) {
              onShowToast('success', 'লোকেশন সংরক্ষিত', 'দোকানের লোকেশন সফলভাবে সেট করা হয়েছে');
            }
          }}
          onShowToast={(type, title, msg) => {
            if (onShowToast) {
              onShowToast(type === 'warning' ? 'info' : type, title, msg);
            }
          }}
        />
      )}

      {/* Shop Location Preview Modal */}
      {showLocationPreviewModal && shop && (
        <ShopLocationModal
          shop={shop}
          onClose={() => setShowLocationPreviewModal(false)}
          onShowToast={(type, title, msg) => {
            if (onShowToast) {
              onShowToast(type === 'warning' ? 'info' : type, title, msg);
            }
          }}
        />
      )}

      {/* Digital Cash Memo Modal for Merchant */}
      {selectedMemoTx && (
        <DigitalCashMemoModal
          isOpen={!!selectedMemoTx}
          onClose={() => setSelectedMemoTx(null)}
          redemption={{
            ...selectedMemoTx,
            shopName: shop?.nameBn || shop?.name || selectedMemoTx.shopName,
            shopAddress: shop?.address || `${shop?.area || ''}, ${shop?.district || ''}`
          }}
          onShowToast={onShowToast}
        />
      )}

    </div>
  );
};
