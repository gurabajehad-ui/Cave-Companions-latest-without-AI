import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Phone,
  Mail,
  Lock,
  Store,
  MapPin,
  Building,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Shield,
  Percent,
  CheckSquare,
  Square,
  Camera,
  Image as ImageIcon,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Eye,
  Check,
  Compass,
  Navigation,
  Search,
  Crosshair,
  Loader2
} from 'lucide-react';
import { GoogleMapLocationPicker } from './GoogleMapLocationPicker';
import { optimizeImageForUpload } from '../utils/imageOptimizer';
import { api } from '../services/api';
import { PartnerShop } from '../types';
import { CommissionPolicy } from '../types';
import { toBnNumber } from '../data/prayerConfig';
import { BANGLADESH_DISTRICTS, getDistrictUpazilaItems } from '../data/bangladeshGeo';
import { DISTRICT_COORDINATES } from '../services/prayerTimeService';
import { searchBDLocations, LocationSearchResult } from '../utils/bdLocationSearch';

// Helper to look up coordinates for any Bangladesh district
const getCoordinatesForDistrict = (districtStr: string): { lat: number; lng: number } => {
  if (!districtStr) return { lat: 23.8103, lng: 90.4125 };

  const clean = districtStr.replace(/\(.*?\)/g, '').trim();
  const engMatch = districtStr.match(/\((.*?)\)/);
  const eng = engMatch ? engMatch[1].trim() : '';

  for (const [key, val] of Object.entries(DISTRICT_COORDINATES)) {
    if (
      key.toLowerCase() === eng.toLowerCase() ||
      key.toLowerCase() === clean.toLowerCase() ||
      val.nameBn === clean ||
      val.nameBn.includes(clean) ||
      clean.includes(val.nameBn)
    ) {
      return { lat: val.lat, lng: val.lng };
    }
  }

  const matched = BANGLADESH_DISTRICTS.find(
    (d) =>
      d.district.toLowerCase() === eng.toLowerCase() ||
      d.district.toLowerCase() === clean.toLowerCase() ||
      d.districtBn === clean ||
      d.aliases?.some((a) => a.toLowerCase() === eng.toLowerCase() || a === clean)
  );

  if (matched) {
    for (const [key, val] of Object.entries(DISTRICT_COORDINATES)) {
      if (
        key.toLowerCase() === matched.district.toLowerCase() ||
        val.nameBn === matched.districtBn
      ) {
        return { lat: val.lat, lng: val.lng };
      }
    }
  }

  return { lat: 23.8103, lng: 90.4125 };
};

interface MerchantRegistrationWizardProps {
  onSuccess: (token: string, merchant: any, shop: any, verification: any) => void;
  onCancel: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  initialData?: any;
}

export const MerchantRegistrationWizard: React.FC<MerchantRegistrationWizardProps> = ({
  onSuccess,
  onCancel,
  onShowToast,
  initialData
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Credentials
  const [ownerName, setOwnerName] = useState(initialData?.ownerName || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: Shop Info
  const [shopName, setShopName] = useState(initialData?.shopName || '');
  const [businessType, setBusinessType] = useState(initialData?.businessType || 'food');
  const [shopAddress, setShopAddress] = useState(initialData?.shopAddress || '');
  const [district, setDistrict] = useState(initialData?.district || 'ঢাকা (Dhaka)');
  const [upazilaThana, setUpazilaThana] = useState(initialData?.upazilaThana || '');
  const [latitude, setLatitude] = useState<number>(initialData?.latitude || 23.8103);
  const [longitude, setLongitude] = useState<number>(initialData?.longitude || 90.4125);
  const [shopPhotoUrl, setShopPhotoUrl] = useState(initialData?.shopPhotoUrl || '');
  const [businessDescription, setBusinessDescription] = useState(initialData?.businessDescription || '');

  // Step 3: Owner Verification
  const [nidNumber, setNidNumber] = useState(initialData?.nidNumber || '');
  const [nidFrontUrl, setNidFrontUrl] = useState(initialData?.nidFrontUrl || '');
  const [nidBackUrl, setNidBackUrl] = useState(initialData?.nidBackUrl || '');
  const [ownerSelfieUrl, setOwnerSelfieUrl] = useState(initialData?.ownerSelfieUrl || '');

  // Step 4: Business Verification
  const [tradeLicenseNumber, setTradeLicenseNumber] = useState(initialData?.tradeLicenseNumber || '');
  const [tradeLicenseUrl, setTradeLicenseUrl] = useState(initialData?.tradeLicenseUrl || '');
  const [tinNumber, setTinNumber] = useState(initialData?.tinNumber || '');
  const [binVatNumber, setBinVatNumber] = useState(initialData?.binVatNumber || '');

  // Step 5: Merchant Defined Commission Inputs & Agreements
  const [totalCommissionInput, setTotalCommissionInput] = useState<string>(
    initialData?.acceptedTotalCommission !== undefined ? String(initialData.acceptedTotalCommission) : '10'
  );

  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);
  const [agree3, setAgree3] = useState(false);
  const [agree4, setAgree4] = useState(false);

  // Calculations for Cave Companions Commission & Token Benefits
  const totalCommNum = parseFloat(totalCommissionInput) || 0;
  const goldUserNum = Math.round(totalCommNum * 0.5 * 100) / 100;
  const silverUserNum = Math.round(totalCommNum * 0.4 * 100) / 100;
  const bronzeUserNum = Math.round(totalCommNum * 0.3 * 100) / 100;

  const goldCCNum = Math.max(0, Math.round((totalCommNum - goldUserNum) * 100) / 100);
  const silverCCNum = Math.max(0, Math.round((totalCommNum - silverUserNum) * 100) / 100);
  const bronzeCCNum = Math.max(0, Math.round((totalCommNum - bronzeUserNum) * 100) / 100);

  // Uploading state
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Districts options (all 64 districts of Bangladesh)
  const districts = useMemo(() => {
    return BANGLADESH_DISTRICTS.map((d) => `${d.districtBn} (${d.district})`);
  }, []);

  // Upazila items for selected district
  const [isCustomUpazila, setIsCustomUpazila] = useState(false);
  const upazilaItems = useMemo(() => {
    return getDistrictUpazilaItems(district);
  }, [district]);

  // Currently selected district data for backward compatibility
  const selectedDistrictData = useMemo(() => {
    return BANGLADESH_DISTRICTS.find((d) => {
      const target = district.toLowerCase();
      return (
        target.includes(d.district.toLowerCase()) ||
        target.includes(d.districtBn) ||
        d.districtBn === district ||
        d.district.toLowerCase() === district.toLowerCase() ||
        d.aliases?.some((a) => target.includes(a.toLowerCase()))
      );
    });
  }, [district]);

  // Location search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  // Business Types options
  const businessTypes = [
    { value: 'books', label: 'বই ও ইসলামিক সামগ্রী (Books & Islamic Library)' },
    { value: 'food', label: 'খাবার ও রেস্তোরাঁ (Food & Restaurant)' },
    { value: 'grocery', label: 'মুদি ও সুপারশপ (Grocery & Superstore)' },
    { value: 'fashion', label: 'ফ্যাশন ও পোশাক (Fashion & Clothing)' },
    { value: 'electronics', label: 'ইলেকট্রনিক্স ও গ্যাজেট (Electronics & Gadgets)' },
    { value: 'health', label: 'স্বাস্থ্য ও ফার্মেসি (Health & Pharmacy)' },
    { value: 'beauty', label: 'বিউটি ও সেলুন (Beauty & Salon)' },
    { value: 'service', label: 'সেবা খাত (Services & Repairs)' },
    { value: 'others', label: 'অন্যান্য (Others)' }
  ];

  // Handle File Upload with Automatic High-Quality Mobile Image Compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so re-selecting same file triggers onChange
    e.target.value = '';

    setUploadingField(fieldName);
    try {
      // Automatically optimize image (downscales huge camera photos to crisp ~300KB)
      const optimized = await optimizeImageForUpload(file, 1600, 0.85);

      const res = await api.uploadMerchantDocument(optimized.base64, optimized.fileName, fieldName);
      if (res.success && res.url) {
        if (fieldName === 'shopPhoto') setShopPhotoUrl(res.url);
        if (fieldName === 'nidFront') setNidFrontUrl(res.url);
        if (fieldName === 'nidBack') setNidBackUrl(res.url);
        if (fieldName === 'ownerSelfie') setOwnerSelfieUrl(res.url);
        if (fieldName === 'tradeLicense') setTradeLicenseUrl(res.url);
        onShowToast?.('success', 'আপলোড সফল', 'ফাইল সফলভাবে আপলোড হয়েছে।');
      } else {
        onShowToast?.('error', 'আপলোড ব্যর্থ', res.message || 'ফাইল আপলোড করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      console.error(`Upload failed for ${fieldName}:`, err);
      onShowToast?.('error', 'ত্রুটি', err.message || 'ফাইল প্রসেস বা আপলোড করতে সমস্যা হয়েছে।');
    } finally {
      setUploadingField(null);
    }
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (!ownerName.trim()) {
      onShowToast?.('error', 'ইনপুট ত্রুটি', 'মালিকের পূর্ণ নাম লিখুন।');
      return false;
    }
    const cleanPhone = phone.trim().replace(/[\s-]/g, '');
    if (!cleanPhone) {
      onShowToast?.('error', 'ইনপুট ত্রুটি', 'মোবাইল নম্বর লিখুন।');
      return false;
    }
    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      onShowToast?.('error', 'ইনপুট ত্রুটি', 'সঠিক ১০/১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর প্রদান করুন।');
      return false;
    }
    if (!password || password.length < 6) {
      onShowToast?.('error', 'পাসওয়ার্ড ত্রুটি', 'ন্যূনতম ৬ অক্ষরের পাসওয়ার্ড দিন।');
      return false;
    }
    if (password !== confirmPassword) {
      onShowToast?.('error', 'পাসওয়ার্ড অমিল', 'পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড মিলছে না।');
      return false;
    }
    return true;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    if (!shopName.trim()) {
      onShowToast?.('error', 'ইনপুট ত্রুটি', 'দোকান/ব্যবস্থানের নাম লিখুন।');
      return false;
    }
    if (!shopAddress.trim()) {
      onShowToast?.('error', 'ইনপুট ত্রুটি', 'দোকানের ঠিকানা লিখুন।');
      return false;
    }
    if (!district.trim()) {
      onShowToast?.('error', 'ইনপুট ত্রুটি', 'জেলা নির্বাচন করুন।');
      return false;
    }
    if (!upazilaThana.trim()) {
      onShowToast?.('error', 'ইনপুট ত্রুটি', 'উপজেলা/থানা লিখুন।');
      return false;
    }
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      const coords = getCoordinatesForDistrict(district);
      setLatitude(coords.lat);
      setLongitude(coords.lng);
    }
    return true;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    if (!nidNumber.trim()) {
      onShowToast?.('error', 'ইনপুট ত্রুটি', 'জাতীয় পরিচয়পত্র (NID) নম্বর দিন।');
      return false;
    }
    if (!nidFrontUrl) {
      onShowToast?.('error', 'ফাইল আবশ্যক', 'এনআইডি সামনের অংশের ছবি আপলোড করুন।');
      return false;
    }
    if (!nidBackUrl) {
      onShowToast?.('error', 'ফাইল আবশ্যক', 'এনআইডি পেছনের অংশের ছবি আপলোড করুন।');
      return false;
    }
    if (!ownerSelfieUrl) {
      onShowToast?.('error', 'ফাইল আবশ্যক', 'মালিকের নিজের ছবি/সেলফি আপলোড করুন।');
      return false;
    }
    return true;
  };

  // Step 4 Validation
  const validateStep4 = () => {
    if (!tradeLicenseNumber.trim()) {
      onShowToast?.('error', 'ইনপুট ত্রুটি', 'ট্রেড লাইসেন্স নম্বর দিন।');
      return false;
    }
    if (!tradeLicenseUrl) {
      onShowToast?.('error', 'ফাইল আবশ্যক', 'ট্রেড লাইসেন্সের ছবি আপলোড করুন।');
      return false;
    }
    return true;
  };

  // Step 5 Validation
  const validateStep5 = () => {
    if (isNaN(totalCommNum) || totalCommNum <= 0) {
      onShowToast?.('error', 'কমিশন ইনপুট ত্রুটি', 'মোট প্রস্তাবিত কমিশন ০% এর বেশি হতে হবে (Total Commission must be > 0%).');
      return false;
    }

    if (!agree1 || !agree2 || !agree3 || !agree4) {
      onShowToast?.('error', 'শর্তাবলি গ্রহণযোগ্য নয়', 'মার্চেন্ট নিবন্ধনের সকল ৪টি চুক্তিতে টিক দিয়ে সম্মতি দিন।');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;
    if (currentStep === 4 && !validateStep4()) return;
    if (currentStep === 5 && !validateStep5()) return;

    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Final Submit
  const handleSubmitRegistration = async () => {
    try {
      setIsSubmitting(true);

      const payload = {
        ownerName,
        phone,
        email,
        password,
        shopName,
        businessType,
        shopAddress,
        district,
        upazilaThana,
        latitude,
        longitude,
        shopPhotoUrl,
        businessDescription,
        nidNumber,
        nidFrontUrl,
        nidBackUrl,
        ownerSelfieUrl,
        tradeLicenseNumber,
        tradeLicenseUrl,
        tinNumber,
        binVatNumber,
        agreementAccepted: true,
        agreementVersion: 'v1.0',
        acceptedTotalCommission: totalCommNum,
        acceptedGoldUserBenefit: goldUserNum,
        acceptedGoldPlatformCommission: goldCCNum,
        acceptedSilverUserBenefit: silverUserNum,
        acceptedSilverPlatformCommission: silverCCNum,
        acceptedBronzeUserBenefit: bronzeUserNum,
        acceptedBronzePlatformCommission: bronzeCCNum
      };

      const res = await api.submitMerchantRegistration(payload);
      if (res.success) {
        onShowToast?.('success', 'রেজিস্ট্রেশন জমা হয়েছে', res.message);
        onSuccess(res.token, res.merchant, res.shop, res.verification);
      } else {
        onShowToast?.('error', 'জমা দিতে ব্যর্থ', res.message);
      }
    } catch (err: any) {
      onShowToast?.('error', 'ত্রুটি', err.message || 'আবেদন জমা দিতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, title: 'একাউন্ট ডাটা' },
    { num: 2, title: 'দোকান তথ্য' },
    { num: 3, title: 'মালিক ভেরিফিকেশন' },
    { num: 4, title: 'ব্যবসা ভেরিফিকেশন' },
    { num: 5, title: 'কমিশন চুক্তি' },
    { num: 6, title: 'পর্যালোচনা ও জমা' }
  ];

  return (
    <div className="bg-[#021811]/90 backdrop-blur-md rounded-2xl border border-emerald-800/50 p-3.5 sm:p-6 text-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-emerald-800/40">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Sparkles className="w-3 h-3 text-amber-400" /> মার্চেন্ট আত্ম-নিবন্ধন সিস্টেম
          </span>
          <h2 className="text-lg sm:text-2xl font-bold mt-1 text-emerald-100">
            নতুন পার্টনার শপ নিবন্ধন (Merchant Portal)
          </h2>
        </div>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 text-xs font-semibold transition-colors border border-emerald-700/50 cursor-pointer"
        >
          বাতিল করুন
        </button>
      </div>

      {/* Responsive Stepper Indicator */}
      {/* Mobile Stepper (Fits 100% on all mobile screens without cutting off) */}
      <div className="md:hidden space-y-2 mb-6 bg-emerald-950/60 p-3 rounded-xl border border-emerald-800/50">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-amber-300 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-amber-400 text-amber-950 font-black text-[11px] flex items-center justify-center">
              {toBnNumber(currentStep)}
            </span>
            <span>ধাপ {toBnNumber(currentStep)}/৬: {stepsList[currentStep - 1]?.title}</span>
          </span>
          <span className="text-[11px] font-bold text-emerald-400 font-mono">
            {toBnNumber(Math.round((currentStep / 6) * 100))}%
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-emerald-900/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-amber-400 transition-all duration-300 rounded-full"
            style={{ width: `${(currentStep / 6) * 100}%` }}
          />
        </div>

        {/* 6 numbered step pills */}
        <div className="grid grid-cols-6 gap-1 pt-1">
          {stepsList.map((step) => {
            const isCompleted = currentStep > step.num;
            const isCurrent = currentStep === step.num;
            return (
              <button
                key={`mobile-step-pill-${step.num}`}
                type="button"
                onClick={() => {
                  if (step.num < currentStep) setCurrentStep(step.num);
                }}
                disabled={step.num > currentStep}
                className={`py-1 rounded-md text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : isCurrent
                    ? 'bg-amber-400 text-amber-950 shadow-sm ring-2 ring-amber-400/40'
                    : 'bg-emerald-950/40 text-emerald-600/70 border border-emerald-900/40'
                }`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : toBnNumber(step.num)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Stepper */}
      <div className="hidden md:block mb-8">
        <div className="flex items-center justify-between">
          {stepsList.map((step, sIdx) => {
            const isCompleted = currentStep > step.num;
            const isCurrent = currentStep === step.num;
            return (
              <div key={`mrw-step-${step.num}-${sIdx}`} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                      isCompleted
                        ? 'bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-500/20'
                        : isCurrent
                        ? 'bg-amber-400 text-amber-950 ring-4 ring-amber-400/20 scale-105'
                        : 'bg-emerald-900/50 text-emerald-400 border border-emerald-800'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5 stroke-[3]" /> : toBnNumber(step.num)}
                  </div>
                  <span
                    className={`text-[11px] font-medium mt-1.5 text-center transition-colors ${
                      isCurrent ? 'text-amber-300 font-semibold' : isCompleted ? 'text-emerald-300' : 'text-emerald-500/70'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {step.num < 6 && (
                  <div
                    className={`h-0.5 flex-1 mx-1 rounded transition-colors ${
                      isCompleted ? 'bg-emerald-500' : 'bg-emerald-800/40'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP CONTENT */}
      <div className="min-h-[350px] pb-6">
        {/* STEP 1: Account Credentials & OTP */}
        {currentStep === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h3 className="text-lg font-semibold text-emerald-200 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-400" /> ধাপ ১: একাউন্ট ও মালিকের তথ্য
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-emerald-300 mb-1">
                  দোকানের মালিকের পূর্ণ নাম <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-emerald-500" />
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="যেমন: মুহাম্মদ আব্দুর রহমান"
                    className="w-full bg-emerald-900/40 border border-emerald-700/50 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-emerald-600 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-emerald-300 mb-1">
                  মোবাইল নম্বর <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-emerald-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full bg-emerald-900/40 border border-emerald-700/50 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-emerald-600 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-emerald-300 mb-1">
                ইমেইল এড্রেস (ঐচ্ছিক)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-emerald-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@example.com"
                  className="w-full bg-emerald-900/40 border border-emerald-700/50 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-emerald-600 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-emerald-300 mb-1">
                  পাসওয়ার্ড <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-emerald-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ন্যূনতম ৬টি অক্ষর"
                    className="w-full bg-emerald-900/40 border border-emerald-700/50 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-emerald-600 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-emerald-300 mb-1">
                  কনফার্ম পাসওয়ার্ড <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-emerald-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড পুনরায় লিখুন"
                    className="w-full bg-emerald-900/40 border border-emerald-700/50 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-emerald-600 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: Shop Information */}
        {currentStep === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h3 className="text-lg font-semibold text-emerald-200 flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-400" /> ধাপ ২: শপ ও ব্যবসার বিবরণ
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-emerald-300 mb-1">
                  দোকান / ব্যবসার নাম <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="যেমন: মদিনা ফ্যাশন এন্ড জেনারেল স্টোর"
                  className="w-full bg-emerald-900/40 border border-emerald-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-emerald-600 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-emerald-300 mb-1">
                  ব্যবসার ধরন / ক্যাটাগরি <span className="text-rose-400">*</span>
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full bg-emerald-900/80 border border-emerald-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
                >
                  {businessTypes.map((bt, idx) => (
                    <option key={`${bt.value || 'bt'}-${idx}`} value={bt.value ?? ''} className="bg-emerald-950 text-white">
                      {bt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-emerald-300 mb-1">
                সম্পূর্ণ ঠিকানা (রোড, হাউস/দোকান নং) <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={2}
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                placeholder="গুগল ম্যাপে পিন করলে ঠিকানা স্বয়ংক্রিয়ভাবে বসবে, অথবা প্রয়োজনে নিজে লিখুন..."
                className="w-full bg-emerald-900/40 border border-emerald-700/50 rounded-xl p-3 text-sm text-white placeholder-emerald-600 focus:outline-none focus:border-emerald-400"
              />
              <p className="text-[11px] text-emerald-400/90 mt-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" /> নিচের গুগল ম্যাপে অবস্থান চিহ্নিত করলে এই সম্পূর্ণ ঠিকানা স্বয়ংক্রিয়ভাবে সেভ হবে।
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-emerald-300 mb-1">
                  জেলা <span className="text-rose-400">*</span>
                </label>
                <select
                  value={district}
                  onChange={(e) => {
                    const newDist = e.target.value;
                    setDistrict(newDist);
                    const coords = getCoordinatesForDistrict(newDist);
                    setLatitude(coords.lat);
                    setLongitude(coords.lng);
                  }}
                  className="w-full bg-emerald-900/80 border border-emerald-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
                >
                  {districts.map((d, idx) => (
                    <option key={`${d}-${idx}`} value={d} className="bg-emerald-950 text-white">
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-emerald-300">
                    উপজেলা / থানা <span className="text-rose-400">*</span>
                  </label>
                  {isCustomUpazila ? (
                    <button
                      type="button"
                      onClick={() => setIsCustomUpazila(false)}
                      className="text-[11px] text-amber-300 hover:text-amber-200 underline cursor-pointer"
                    >
                      তালিকা থেকে নির্বাচন করুন
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCustomUpazila(true)}
                      className="text-[11px] text-emerald-300 hover:text-emerald-200 underline cursor-pointer"
                    >
                      + নিজে কাস্টম লিখুন
                    </button>
                  )}
                </div>

                {!isCustomUpazila && upazilaItems.length > 0 ? (
                  <select
                    value={upazilaThana}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomUpazila(true);
                        setUpazilaThana('');
                      } else {
                        setUpazilaThana(e.target.value);
                      }
                    }}
                    className="w-full bg-emerald-900/80 border border-emerald-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="" className="bg-emerald-950 text-white/50">
                      -- উপজেলা / থানা বেছে নিন ({upazilaItems.length}টি) --
                    </option>
                    {upazilaItems.map((u, idx) => (
                      <option key={`${u.nameEn}-${idx}`} value={u.nameBn} className="bg-emerald-950 text-white">
                        {u.label}
                      </option>
                    ))}
                    <option value="__custom__" className="bg-emerald-950 text-amber-300">
                      + অন্যান্য / কাস্টম থানা লিখুন...
                    </option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={upazilaThana}
                    onChange={(e) => setUpazilaThana(e.target.value)}
                    placeholder="যেমন: সদর, গুলশান, বা আপনার উপজেলা..."
                    className="w-full bg-emerald-900/40 border border-emerald-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-emerald-600 focus:outline-none focus:border-emerald-400"
                  />
                )}
              </div>
            </div>

            {/* Shop Map coordinates & interactive picker */}
            <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-3.5 space-y-3 shadow-lg">
              <div>
                <label className="block text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-400" /> দোকানের ম্যাপ লোকেশন ও স্বয়ংক্রিয় ঠিকানা
                </label>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  ম্যাপে পিন ড্র্যাগ করুন, ক্লিক করুন বা এলাকা সার্চ করুন — সম্পূর্ণ ঠিকানা, থানা ও জেলা স্বয়ংক্রিয়ভাবে ইনপুট হবে।
                </p>
              </div>

              <GoogleMapLocationPicker
                initialLat={latitude || 23.8103}
                initialLng={longitude || 90.4125}
                initialAddress={shopAddress}
                initialDistrict={district}
                initialUpazila={upazilaThana}
                onLocationSelect={(data) => {
                  setLatitude(data.lat);
                  setLongitude(data.lng);
                  if (data.address) {
                    setShopAddress(data.address);
                  }
                  if (data.district) {
                    setDistrict(data.district);
                  }
                  if (data.upazilaThana) {
                    setUpazilaThana(data.upazilaThana);
                  }
                }}
                onShowToast={onShowToast}
                height="280px"
              />
            </div>

            {/* Shop Photo Upload */}
            <div>
              <label className="block text-xs font-medium text-emerald-300 mb-1">
                দোকানের সামনের ছবি (Shop Banner/Front View Photo)
              </label>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="file-upload-shopPhoto"
                  className="cursor-pointer bg-emerald-800/80 hover:bg-emerald-700 active:scale-95 border border-emerald-600/60 rounded-xl px-4 py-2.5 text-xs font-semibold text-emerald-100 flex items-center gap-2 transition-all shadow-sm"
                >
                  {uploadingField === 'shopPhoto' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                      <span>আপলোড হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>ছবি নির্বাচন করুন</span>
                    </>
                  )}
                  <input
                    id="file-upload-shopPhoto"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'shopPhoto')}
                    className="hidden"
                  />
                </label>
                {shopPhotoUrl && (
                  <div className="flex items-center gap-2 bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-700/50">
                    <img src={shopPhotoUrl} alt="Shop Front" className="w-10 h-10 object-cover rounded-lg border border-emerald-500" />
                    <span className="text-xs text-emerald-400 font-medium">✓ আপলোড সম্পন্ন</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-emerald-300 mb-1">
                ব্যবসার বিবরণ (Business Description)
              </label>
              <input
                type="text"
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                placeholder="যেমন: সকল প্রকার রেডিমেড পোশাক পাইকারি ও খুচরা বিক্রেতা।"
                className="w-full bg-emerald-900/40 border border-emerald-700/50 rounded-xl px-3 py-2 text-sm text-white placeholder-emerald-600 focus:outline-none"
              />
            </div>
          </motion.div>
        )}

        {/* STEP 3: Owner Verification */}
        {currentStep === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h3 className="text-lg font-semibold text-emerald-200 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" /> ধাপ ৩: মালিকের পরিচিতি ও পরিচয়পত্র
            </h3>

            <div>
              <label className="block text-xs font-medium text-emerald-300 mb-1">
                জাতীয় পরিচয়পত্র (NID) নম্বর <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={nidNumber}
                onChange={(e) => setNidNumber(e.target.value)}
                placeholder="যেমন: 1990123456789"
                className="w-full bg-emerald-900/40 border border-emerald-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-emerald-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* NID Front */}
              <div className="bg-emerald-900/30 border border-emerald-700/40 rounded-xl p-3">
                <span className="text-xs font-medium text-emerald-300 block mb-2">
                  এনআইডি সামনের অংশ (Front View) <span className="text-rose-400">*</span>
                </span>
                {nidFrontUrl ? (
                  <div className="relative group">
                    <img src={nidFrontUrl} alt="NID Front" className="w-full h-36 object-cover rounded-lg border border-emerald-500" />
                    <label
                      htmlFor="file-upload-nidFront"
                      className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg text-xs font-medium text-white"
                    >
                      ছবি পরিবর্তন করুন
                      <input id="file-upload-nidFront" type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'nidFront')} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <label
                    htmlFor="file-upload-nidFront"
                    className="border-2 border-dashed border-emerald-700/70 hover:border-emerald-400 active:bg-emerald-900/50 rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer text-center bg-emerald-950/40 transition-all"
                  >
                    {uploadingField === 'nidFront' ? (
                      <>
                        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
                        <span className="text-xs text-emerald-300 font-medium">আপলোড হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-emerald-500 mb-1" />
                        <span className="text-xs text-emerald-300 font-medium">
                          এনআইডি সামনের অংশ আপলোড করুন
                        </span>
                        <span className="text-[10px] text-emerald-500 mt-0.5">ক্লিক বা ট্যাপ করে ছবি নির্বাচন করুন</span>
                      </>
                    )}
                    <input id="file-upload-nidFront" type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'nidFront')} className="hidden" />
                  </label>
                )}
              </div>

              {/* NID Back */}
              <div className="bg-emerald-900/30 border border-emerald-700/40 rounded-xl p-3">
                <span className="text-xs font-medium text-emerald-300 block mb-2">
                  এনআইডি পেছনের অংশ (Back View) <span className="text-rose-400">*</span>
                </span>
                {nidBackUrl ? (
                  <div className="relative group">
                    <img src={nidBackUrl} alt="NID Back" className="w-full h-36 object-cover rounded-lg border border-emerald-500" />
                    <label
                      htmlFor="file-upload-nidBack"
                      className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg text-xs font-medium text-white"
                    >
                      ছবি পরিবর্তন করুন
                      <input id="file-upload-nidBack" type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'nidBack')} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <label
                    htmlFor="file-upload-nidBack"
                    className="border-2 border-dashed border-emerald-700/70 hover:border-emerald-400 active:bg-emerald-900/50 rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer text-center bg-emerald-950/40 transition-all"
                  >
                    {uploadingField === 'nidBack' ? (
                      <>
                        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
                        <span className="text-xs text-emerald-300 font-medium">আপলোড হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-emerald-500 mb-1" />
                        <span className="text-xs text-emerald-300 font-medium">
                          এনআইডি পেছনের অংশ আপলোড করুন
                        </span>
                        <span className="text-[10px] text-emerald-500 mt-0.5">ক্লিক বা ট্যাপ করে ছবি নির্বাচন করুন</span>
                      </>
                    )}
                    <input id="file-upload-nidBack" type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'nidBack')} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Owner Selfie */}
            <div className="bg-emerald-900/30 border border-emerald-700/40 rounded-xl p-4">
              <span className="text-xs font-medium text-emerald-300 block mb-2">
                মালিকের নিজের ছবি / সেলফি (Owner Photo) <span className="text-rose-400">*</span>
              </span>
              <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                {ownerSelfieUrl ? (
                  <div className="relative">
                    <img src={ownerSelfieUrl} alt="Owner Selfie" className="w-20 h-20 object-cover rounded-full border-2 border-emerald-400 shadow-md" />
                    <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-1 text-[10px] shadow">✓</span>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-emerald-950 border-2 border-dashed border-emerald-700 flex items-center justify-center shrink-0">
                    <Camera className="w-8 h-8 text-emerald-500" />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="file-upload-ownerSelfie"
                    className="cursor-pointer bg-emerald-800/90 hover:bg-emerald-700 active:scale-95 border border-emerald-600 rounded-xl px-4 py-2.5 text-xs font-semibold text-emerald-100 flex items-center gap-2 transition-all shadow-sm w-fit"
                  >
                    {uploadingField === 'ownerSelfie' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                        <span>আপলোড হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span>{ownerSelfieUrl ? 'ছবি পরিবর্তন করুন' : 'ছবি তুলুন / আপলোড করুন'}</span>
                      </>
                    )}
                    <input id="file-upload-ownerSelfie" type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'ownerSelfie')} className="hidden" />
                  </label>
                  <span className="text-[11px] text-emerald-400/80">পরিষ্কার আলোর মধ্যে স্পষ্ট ছবি আপলোড করুন</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 4: Business Verification */}
        {currentStep === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h3 className="text-lg font-semibold text-emerald-200 flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-400" /> ধাপ ৪: ব্যবসায়িক কাগজপত্র
            </h3>

            <div>
              <label className="block text-xs font-medium text-emerald-300 mb-1">
                ট্রেড লাইসেন্স নম্বর <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={tradeLicenseNumber}
                onChange={(e) => setTradeLicenseNumber(e.target.value)}
                placeholder="যেমন: TRD-2025-987654"
                className="w-full bg-emerald-900/40 border border-emerald-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-emerald-600 focus:outline-none"
              />
            </div>

            {/* Trade License Photo */}
            <div className="bg-emerald-900/30 border border-emerald-700/40 rounded-xl p-3">
              <span className="text-xs font-medium text-emerald-300 block mb-2">
                ট্রেড লাইসেন্স কপি/ছবি <span className="text-rose-400">*</span>
              </span>
              {tradeLicenseUrl ? (
                <div className="relative group">
                  <img src={tradeLicenseUrl} alt="Trade License" className="w-full h-40 object-cover rounded-lg border border-emerald-500" />
                  <label
                    htmlFor="file-upload-tradeLicense"
                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg text-xs font-medium text-white"
                  >
                    ছবি পরিবর্তন করুন
                    <input id="file-upload-tradeLicense" type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'tradeLicense')} className="hidden" />
                  </label>
                </div>
              ) : (
                <label
                  htmlFor="file-upload-tradeLicense"
                  className="border-2 border-dashed border-emerald-700/70 hover:border-emerald-400 active:bg-emerald-900/50 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer text-center bg-emerald-950/40 transition-all"
                >
                  {uploadingField === 'tradeLicense' ? (
                    <>
                      <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-2" />
                      <span className="text-xs text-emerald-300 font-medium">আপলোড হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-10 h-10 text-emerald-500 mb-2" />
                      <span className="text-xs text-emerald-300 font-medium">
                        ট্রেড লাইসেন্স কপির ছবি আপলোড করুন
                      </span>
                      <span className="text-[10px] text-emerald-500 mt-0.5">JPG, PNG অথবা PDF ফাইল নির্বাচন করুন</span>
                    </>
                  )}
                  <input id="file-upload-tradeLicense" type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'tradeLicense')} className="hidden" />
                </label>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-emerald-300 mb-1">
                  ই-টিআইএন (TIN) নম্বর (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={tinNumber}
                  onChange={(e) => setTinNumber(e.target.value)}
                  placeholder="12-digit TIN number"
                  className="w-full bg-emerald-900/40 border border-emerald-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-emerald-300 mb-1">
                  বিআইএন / ভ্যাট নম্বর (BIN/VAT) (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={binVatNumber}
                  onChange={(e) => setBinVatNumber(e.target.value)}
                  placeholder="VAT/BIN Registration number"
                  className="w-full bg-emerald-900/40 border border-emerald-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 5: Merchant-Defined Commission System & Agreement */}
        {currentStep === 5 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <h3 className="text-lg font-semibold text-emerald-200 flex items-center gap-2">
              <Percent className="w-5 h-5 text-amber-400" /> ধাপ ৫: মার্চেন্ট নির্ধারিত কমিশন ও চুক্তি (Merchant Commission Agreement)
            </h3>

            {/* Editable Commission Input Form */}
            <div className="bg-emerald-900/40 border border-amber-500/40 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-800 pb-2">
                <span className="font-bold text-amber-300 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" /> কমিশন ইনপুট সিস্টেম (Required Commission Inputs)
                </span>
                <span className="text-xs bg-amber-400/20 text-amber-300 font-semibold px-2.5 py-0.5 rounded-full">
                  মোট কমিশন: {totalCommNum}%
                </span>
              </div>

              {/* 1. Total Commission Offered */}
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  ১. মার্চেন্ট কর্তৃক প্রস্তাবিত মোট কমিশন (Total Commission Offered) <span className="text-rose-400">*</span>
                </label>
                <div className="relative max-w-xs">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="100"
                    value={totalCommissionInput}
                    onChange={(e) => setTotalCommissionInput(e.target.value)}
                    placeholder="যেমন: 10"
                    className="w-full bg-emerald-950 border border-amber-500/60 rounded-xl pl-3 pr-8 py-2.5 text-base font-extrabold text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3 top-3 text-sm font-bold text-amber-400">%</span>
                </div>
                <p className="text-[11px] text-emerald-300/80 mt-1">
                  উদাহরণস্বরূপ: ১০%। এটি মার্চেন্ট নিজ পছন্দানুযায়ী নির্ধারণ করবেন (কোনো স্থায়ী ডিফল্ট হার নেই)।
                </p>
              </div>

              {/* Real-time Commission Summary Table */}
              <div className="space-y-2 pt-2">
                <span className="font-bold text-emerald-200 text-xs block">
                  রিয়েল-টাইম কমিশন সামারি টেবিল (Real-Time Commission Summary Table)
                </span>
                <div className="overflow-x-auto rounded-xl border border-emerald-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-emerald-800 text-emerald-300 bg-emerald-950/80">
                        <th className="p-2.5 font-semibold">টোকেন ক্যাটাগরি (Token Tier)</th>
                        <th className="p-2.5 font-semibold text-amber-300">ইউজার সুবিধা (User Benefit %)</th>
                        <th className="p-2.5 font-semibold text-emerald-300">Cave Companions কমিশন (%)</th>
                        <th className="p-2.5 font-semibold text-white">মোট প্রস্তাবিত কমিশন (Total %)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-800/40 text-emerald-100 bg-emerald-950/40">
                      <tr>
                        <td className="p-2.5 font-bold text-amber-400">🥇 গোল্ড (Gold Token)</td>
                        <td className="p-2.5 font-bold text-amber-300">{goldUserNum}%</td>
                        <td className="p-2.5 font-bold text-emerald-300">{goldCCNum}%</td>
                        <td className="p-2.5 font-bold text-white">{totalCommNum}%</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-slate-300">🥈 সিলভার (Silver Token)</td>
                        <td className="p-2.5 font-bold text-slate-200">{silverUserNum}%</td>
                        <td className="p-2.5 font-bold text-emerald-300">{silverCCNum}%</td>
                        <td className="p-2.5 font-bold text-white">{totalCommNum}%</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-amber-600">🥉 ব্রোঞ্জ (Bronze Token)</td>
                        <td className="p-2.5 font-bold text-amber-500">{bronzeUserNum}%</td>
                        <td className="p-2.5 font-bold text-emerald-300">{bronzeCCNum}%</td>
                        <td className="p-2.5 font-bold text-white">{totalCommNum}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-emerald-950 p-2.5 rounded-xl border border-emerald-800/60 text-[11px] text-emerald-300 font-mono text-center">
                  গাণিতিক সূত্র: <b>Cave Companions Commission = Merchant Total Commission ({totalCommNum}%) - User Benefit</b>
                </div>
              </div>
            </div>

            {/* Mandatory Agreement Checkboxes */}
            <div className="space-y-3 bg-emerald-900/30 p-4 rounded-xl border border-emerald-800/60">
              <span className="text-xs font-bold text-amber-300 block mb-1">
                নিবন্ধন সম্পন্ন করতে নিচের সকল ৪টি কমিশন চুক্তিতে টিক দিয়ে সম্মতি দিন: <span className="text-rose-400">*</span>
              </span>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-emerald-100 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={agree1}
                  onChange={(e) => setAgree1(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-amber-400 rounded cursor-pointer shrink-0"
                />
                <span>
                  ১. I confirm that I am offering <b>{totalCommNum}%</b> total commission on all transactions completed by Cave Companions token holders.
                  <span className="block text-[11px] text-emerald-300/80">(আমি নিশ্চিত করছি যে আমি কেভ কমপ্যানিয়ন্স টোকেন হোল্ডারদের মাধ্যমে সম্পন্ন হওয়া সকল লেনদেনে {totalCommNum}% মোট কমিশন অফার করছি।)</span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-emerald-100 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={agree2}
                  onChange={(e) => setAgree2(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-amber-400 rounded cursor-pointer shrink-0"
                />
                <span>
                  ২. I agree that the commission split between user benefit and Cave Companions platform commission is correctly calculated as shown in the table above.
                  <span className="block text-[11px] text-emerald-300/80">(আমি সম্মত যে ইউজার বেনিফিট এবং কেভ কমপ্যানিয়ন্স প্ল্যাটফর্ম কমিশনের বিভাগটি সারণীতে যেভাবে দেখানো হয়েছে সেভাবে সঠিকভাবে হিসাব করা হয়েছে।)</span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-emerald-100 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={agree3}
                  onChange={(e) => setAgree3(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-amber-400 rounded cursor-pointer shrink-0"
                />
                <span>
                  ৩. I understand that these commission rates will be locked for my merchant account upon registration and cannot be modified without platform review.
                  <span className="block text-[11px] text-emerald-300/80">(আমি বুঝতে পেরেছি যে এই কমিশন হার নিবন্ধনের পর আমার মার্চেন্ট অ্যাকাউন্টের জন্য লক হয়ে যাবে এবং প্ল্যাটফর্ম পর্যালোচনা ছাড়া পরিবর্তন করা যাবে না।)</span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-emerald-100 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={agree4}
                  onChange={(e) => setAgree4(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-amber-400 rounded cursor-pointer shrink-0"
                />
                <span>
                  ৪. I confirm that all entered commission rates and shop parameters are accurate and binding.
                  <span className="block text-[11px] text-emerald-300/80">(আমি নিশ্চিত করছি যে প্রদত্ত সমস্ত কমিশন হার এবং শপের তথ্য সঠিক ও নীতিগতভাবে বাধ্যতামূলক।)</span>
                </span>
              </label>
            </div>
          </motion.div>
        )}

        {/* STEP 6: Review & Submit */}
        {currentStep === 6 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h3 className="text-lg font-semibold text-amber-300 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-amber-400" /> ধাপ ৬: আবেদন পর্যালোচনা ও জমা দান
            </h3>

            <p className="text-xs text-emerald-200">
              আবেদন জমা দেওয়ার পূর্বে আপনার প্রদানকৃত তথ্যসমূহ শেষবারের মতো সঠিকতা নিশ্চিত করুন:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Card 1 */}
              <div className="bg-emerald-900/40 p-3 rounded-xl border border-emerald-800">
                <div className="flex items-center justify-between border-b border-emerald-800/60 pb-1.5 mb-2">
                  <span className="font-bold text-emerald-300 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> মালিক ও একাউন্ট
                  </span>
                  <button type="button" onClick={() => setCurrentStep(1)} className="text-amber-400 hover:underline">সম্পাদনা</button>
                </div>
                <p><b>নাম:</b> {ownerName}</p>
                <p><b>ফোন:</b> {phone} (ওটিপি যাচাইকৃত)</p>
                {email && <p><b>ইমেইল:</b> {email}</p>}
              </div>

              {/* Card 2 */}
              <div className="bg-emerald-900/40 p-3 rounded-xl border border-emerald-800">
                <div className="flex items-center justify-between border-b border-emerald-800/60 pb-1.5 mb-2">
                  <span className="font-bold text-emerald-300 flex items-center gap-1">
                    <Store className="w-3.5 h-3.5" /> দোকান তথ্য
                  </span>
                  <button type="button" onClick={() => setCurrentStep(2)} className="text-amber-400 hover:underline">সম্পাদনা</button>
                </div>
                <p><b>দোকানের নাম:</b> {shopName}</p>
                <p><b>ধরন:</b> {businessType}</p>
                <p><b>ঠিকানা:</b> {shopAddress}, {upazilaThana}, {district}</p>
              </div>

              {/* Card 3 */}
              <div className="bg-emerald-900/40 p-3 rounded-xl border border-emerald-800">
                <div className="flex items-center justify-between border-b border-emerald-800/60 pb-1.5 mb-2">
                  <span className="font-bold text-emerald-300 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> পরিচয়পত্র
                  </span>
                  <button type="button" onClick={() => setCurrentStep(3)} className="text-amber-400 hover:underline">সম্পাদনা</button>
                </div>
                <p><b>এনআইডি নম্বর:</b> {nidNumber}</p>
                <p><b>ছবি আপলোড:</b> এনআইডি (সামনে ও পেছনে), সেলফি সংযুক্ত।</p>
              </div>

              {/* Card 4 */}
              <div className="bg-emerald-900/40 p-3 rounded-xl border border-emerald-800">
                <div className="flex items-center justify-between border-b border-emerald-800/60 pb-1.5 mb-2">
                  <span className="font-bold text-emerald-300 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5" /> ট্রেড লাইসেন্স
                  </span>
                  <button type="button" onClick={() => setCurrentStep(4)} className="text-amber-400 hover:underline">সম্পাদনা</button>
                </div>
                <p><b>লাইসেন্স নং:</b> {tradeLicenseNumber}</p>
                {tinNumber && <p><b>TIN:</b> {tinNumber}</p>}
                {binVatNumber && <p><b>VAT:</b> {binVatNumber}</p>}
              </div>
            </div>

            {/* Agreement snapshot summary */}
            <div className="bg-amber-950/40 border border-amber-500/50 p-4 rounded-xl text-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-amber-500/30 pb-1.5">
                <span className="font-bold text-amber-300 text-sm flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-amber-400" />
                  গৃহীত কমিশন চুক্তি ও কেভ কম্প্যানিয়ন শেয়ার (Commission Agreement Snapshot)
                </span>
                <button type="button" onClick={() => setCurrentStep(5)} className="text-amber-400 hover:underline text-xs">সম্পাদনা</button>
              </div>

              <div className="bg-emerald-950/80 p-3 rounded-lg border border-emerald-800 space-y-1">
                <div className="flex justify-between items-center text-emerald-100">
                  <span className="font-medium">মার্চেন্ট কর্তৃক অফারকৃত মোট কমিশন:</span>
                  <span className="font-black text-amber-300 text-sm">{totalCommNum}%</span>
                </div>
                <p className="text-[11px] text-emerald-300/80">
                  নিবন্ধনের সময় আপনি কেভ কম্প্যানিয়ন প্ল্যাটফর্ম ও ইউজারদের জন্য এই কমিশন হার নির্ধারণ করেছেন।
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                <div className="bg-emerald-950/90 p-2.5 rounded-lg border border-amber-500/30 space-y-1">
                  <span className="font-bold text-amber-400 block text-xs">🥇 গোল্ড টোকেন</span>
                  <div className="flex justify-between text-slate-300">
                    <span>ইউজার ডিসকাউন্ট:</span>
                    <span className="font-bold text-amber-300">{goldUserNum}%</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>কেভ কম্প্যানিয়ন কমিশন:</span>
                    <span className="font-bold text-emerald-400">{goldCCNum}%</span>
                  </div>
                </div>

                <div className="bg-emerald-950/90 p-2.5 rounded-lg border border-slate-400/30 space-y-1">
                  <span className="font-bold text-slate-300 block text-xs">🥈 সিলভার টোকেন</span>
                  <div className="flex justify-between text-slate-300">
                    <span>ইউজার ডিসকাউন্ট:</span>
                    <span className="font-bold text-slate-200">{silverUserNum}%</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>কেভ কম্প্যানিয়ন কমিশন:</span>
                    <span className="font-bold text-emerald-400">{silverCCNum}%</span>
                  </div>
                </div>

                <div className="bg-emerald-950/90 p-2.5 rounded-lg border border-amber-700/30 space-y-1">
                  <span className="font-bold text-amber-600 block text-xs">🥉 ব্রোঞ্জ টোকেন</span>
                  <div className="flex justify-between text-slate-300">
                    <span>ইউজার ডিসকাউন্ট:</span>
                    <span className="font-bold text-amber-500">{bronzeUserNum}%</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>কেভ কম্প্যানিয়ন কমিশন:</span>
                    <span className="font-bold text-emerald-400">{bronzeCCNum}%</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Navigation Footer - Sticky Bottom so it is ALWAYS visible and never cut off on mobile */}
      <div className="sticky bottom-0 z-30 -mx-3.5 -mb-3.5 sm:-mx-6 sm:-mb-6 mt-6 p-3 sm:p-4 bg-[#021811]/95 backdrop-blur-md border-t border-emerald-700/60 shadow-[0_-8px_24px_rgba(0,0,0,0.7)] flex items-center justify-between rounded-b-2xl">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 1 || isSubmitting}
          className="min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed border border-emerald-700/40"
        >
          <ArrowLeft className="w-4 h-4" /> <span>পূর্ববর্তী</span>
        </button>

        <div className="text-[11px] sm:text-xs text-emerald-300/80 font-medium">
          ধাপ {toBnNumber(currentStep)} / {toBnNumber(6)}
        </div>

        {currentStep < 6 ? (
          <button
            type="button"
            onClick={handleNext}
            className="min-h-[44px] px-4 sm:px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
          >
            <span>পরবর্তী ধাপ</span> <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmitRegistration}
            disabled={isSubmitting}
            className="min-h-[44px] px-5 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 text-xs sm:text-sm font-black flex items-center gap-2 shadow-xl shadow-amber-500/30 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> <span>জমা হচ্ছে...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> <span>আবেদন জমা দিন</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
