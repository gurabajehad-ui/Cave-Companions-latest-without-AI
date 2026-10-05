import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  ShieldCheck,
  Check,
  X,
  Sparkles,
  HelpCircle,
  ChevronRight,
  Store,
  UploadCloud,
  FileSignature,
  Phone
} from 'lucide-react';
import { api } from '../services/api';

interface MerchantProgressTrackerProps {
  verification?: any;
  shop?: any;
  status?: string;
  compact?: boolean;
  onNavigateToCorrection?: () => void;
  commissionRequests?: any[];
}

export const MerchantProgressTracker: React.FC<MerchantProgressTrackerProps> = ({
  verification,
  shop,
  status,
  compact = false,
  onNavigateToCorrection,
  commissionRequests = []
}) => {
  const [helpline, setHelpline] = useState<{ primaryPhone?: string; isActive?: boolean; supportMessage?: string } | null>(null);

  const toBnNumber = (n: number | string) => {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(n).replace(/\d/g, (d) => bnDigits[Number(d)]);
  };

  useEffect(() => {
    api.getHelpline()
      .then(res => {
        if (res && res.success !== false) {
          setHelpline({
            primaryPhone: res.primaryPhone || '+880 1700-000000',
            isActive: res.isActive !== undefined ? Boolean(res.isActive) : true,
            supportMessage: res.supportMessage
          });
        }
      })
      .catch(() => {});
  }, []);

  const currentStatus = (status || verification?.verificationStatus || shop?.status || 'PENDING').toUpperCase();

  // Normalize status flags
  const isApproved = currentStatus === 'APPROVED' || currentStatus === 'ACTIVE';
  const isPending = currentStatus === 'PENDING' || currentStatus === 'PENDING_VERIFICATION';
  const isCorrection = currentStatus === 'CORRECTION_REQUIRED' || currentStatus === 'CORRECTION';
  const isRejected = currentStatus === 'REJECTED';

  // Extract document fields
  const nidFrontUrl = verification?.nidFrontUrl || shop?.nidFrontUrl;
  const nidBackUrl = verification?.nidBackUrl || shop?.nidBackUrl;
  const ownerSelfieUrl = verification?.ownerSelfieUrl || shop?.ownerSelfieUrl;
  const tradeLicenseUrl = verification?.tradeLicenseUrl || shop?.tradeLicenseUrl;
  const shopPhotoUrl = verification?.shopPhotoUrl || shop?.shopPhotoUrl || shop?.imageUrl;
  const nidNumber = verification?.nidNumber || shop?.nidNumber;
  const tradeLicenseNumber = verification?.tradeLicenseNumber || shop?.tradeLicenseNumber;
  const agreementAccepted = verification?.agreementAccepted !== false; // defaults true if in DB
  const acceptedTotalCommission = shop?.commissionRate ?? verification?.acceptedTotalCommission ?? shop?.acceptedTotalCommission ?? 10;

  // Build Document Check items
  const docItems = [
    {
      id: 'nidFront',
      label: 'এনআইডি সামনের অংশ (NID Front)',
      isUploaded: Boolean(nidFrontUrl && nidFrontUrl.trim().length > 0),
      isRequired: true,
      previewUrl: nidFrontUrl
    },
    {
      id: 'nidBack',
      label: 'এনআইডি পিছনের অংশ (NID Back)',
      isUploaded: Boolean(nidBackUrl && nidBackUrl.trim().length > 0),
      isRequired: true,
      previewUrl: nidBackUrl
    },
    {
      id: 'ownerSelfie',
      label: 'মালিকের সেলফি/ছবি (Selfie)',
      isUploaded: Boolean(ownerSelfieUrl && ownerSelfieUrl.trim().length > 0),
      isRequired: true,
      previewUrl: ownerSelfieUrl
    },
    {
      id: 'tradeLicenseUrl',
      label: 'ট্রেড লাইসেন্স নথিপত্র (Trade License)',
      isUploaded: Boolean(tradeLicenseUrl && tradeLicenseUrl.trim().length > 0),
      isRequired: true,
      previewUrl: tradeLicenseUrl
    },
    {
      id: 'shopPhotoUrl',
      label: 'দোকান/ব্যবসার ফটো (Shop Photo)',
      isUploaded: Boolean(shopPhotoUrl && shopPhotoUrl.trim().length > 0),
      isRequired: false,
      previewUrl: shopPhotoUrl
    },
    {
      id: 'nidNumber',
      label: 'এনআইডি নম্বর (NID No)',
      isUploaded: Boolean(nidNumber && nidNumber.trim().length >= 10),
      isRequired: true,
      value: nidNumber
    },
    {
      id: 'tradeLicenseNumber',
      label: 'ট্রেড লাইসেন্স নম্বর',
      isUploaded: Boolean(tradeLicenseNumber && tradeLicenseNumber.trim().length >= 4),
      isRequired: true,
      value: tradeLicenseNumber
    },
    {
      id: 'agreement',
      label: 'মার্চেন্ট কমিশন চুক্তি (Agreement)',
      isUploaded: Boolean(agreementAccepted),
      isRequired: true,
      value: `${toBnNumber(acceptedTotalCommission)}% কমিশন পলিসি`
    }
  ];

  // Calculate missing documents
  const missingItems = docItems.filter(item => item.isRequired && !item.isUploaded);
  const uploadedCount = docItems.filter(item => item.isUploaded).length;
  const totalCount = docItems.length;
  const progressPercent = Math.round((uploadedCount / totalCount) * 100);

  // Correction specific requested fields
  const requestedCorrectionFields: string[] = verification?.requestedCorrectionFields || verification?.requestedFields || [];

  return (
    <div className="bg-gradient-to-b from-slate-900 to-emerald-950/80 rounded-2xl border border-emerald-800/50 p-5 shadow-2xl text-white space-y-6">
      {/* Header Badge & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-800/60 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-emerald-100">
              মার্চেন্ট একাউন্ট আবেদন অগ্রগতি (Verification Status Tracker)
            </h3>
          </div>
          <p className="text-xs text-emerald-300/80">
            দোকান: <span className="font-semibold text-white">{verification?.shopName || shop?.name || 'মার্চেন্ট শপ'}</span> ({verification?.phone || shop?.phone})
          </p>
        </div>

        {/* Current Status Pill */}
        <div className="shrink-0">
          {isApproved && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              অনুমোদিত ও সক্রিয় (VERIFIED)
            </span>
          )}
          {isPending && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse shadow-sm">
              <Clock className="w-4 h-4 text-amber-400" />
              অপেক্ষমাণ (PENDING REVIEW)
            </span>
          )}
          {isCorrection && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-400 text-amber-950 shadow-sm">
              <AlertTriangle className="w-4 h-4" />
              সংশোধন আবশ্যক (CORRECTION)
            </span>
          )}
          {isRejected && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm">
              <XCircle className="w-4 h-4 text-rose-400" />
              আবেদন বাতিল (REJECTED)
            </span>
          )}
        </div>
      </div>

      {/* Visual Stepper / Timeline */}
      <div className="relative">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {/* Step 1 */}
          <div className={`p-3 rounded-xl border transition-all ${
            true
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-100'
              : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-emerald-950 font-bold flex items-center justify-center text-[10px]">
                ✓
              </div>
              <span className="font-bold text-emerald-300">১. নিবন্ধন</span>
            </div>
            <p className="text-[11px] text-emerald-200/80">একাউন্ট তৈরি সম্পন্ন</p>
          </div>

          {/* Step 2 */}
          <div className={`p-3 rounded-xl border transition-all ${
            missingItems.length === 0
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-100'
              : isCorrection
              ? 'bg-amber-950/60 border-amber-500/60 text-amber-200'
              : 'bg-emerald-950/40 border-emerald-700/40 text-emerald-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] ${
                missingItems.length === 0
                  ? 'bg-emerald-500 text-emerald-950'
                  : 'bg-amber-400 text-amber-950'
              }`}>
                {missingItems.length === 0 ? '✓' : '!'}
              </div>
              <span className="font-bold">২. নথিপত্র ও চুক্তি</span>
            </div>
            <p className="text-[11px] opacity-80">
              {missingItems.length === 0 ? 'সকল তথ্য সংযুক্ত' : `${missingItems.length}টি নথি অসম্পূর্ণ`}
            </p>
          </div>

          {/* Step 3 */}
          <div className={`p-3 rounded-xl border transition-all ${
            isApproved
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-100'
              : isPending
              ? 'bg-amber-950/70 border-amber-500/50 text-amber-200'
              : isCorrection
              ? 'bg-amber-900/60 border-amber-500/50 text-amber-200'
              : isRejected
              ? 'bg-rose-950/70 border-rose-500/50 text-rose-200'
              : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] ${
                isApproved ? 'bg-emerald-500 text-emerald-950' : isPending ? 'bg-amber-400 text-amber-950 animate-spin' : isRejected ? 'bg-rose-500 text-white' : 'bg-amber-400 text-amber-950'
              }`}>
                {isApproved ? '✓' : isPending ? '↻' : isRejected ? '✕' : '!'}
              </div>
              <span className="font-bold">৩. অ্যাডমিন রিভিউ</span>
            </div>
            <p className="text-[11px] opacity-80">
              {isApproved ? 'যাচাই সম্পন্ন' : isPending ? 'চলমান' : isCorrection ? 'সংশোধন সাপেক্ষ' : 'বাতিল'}
            </p>
          </div>

          {/* Step 4 */}
          <div className={`p-3 rounded-xl border transition-all ${
            isApproved
              ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100 shadow-lg'
              : 'bg-slate-900/50 border-slate-800/80 text-slate-500'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] ${
                isApproved ? 'bg-emerald-400 text-emerald-950' : 'bg-slate-800 text-slate-500'
              }`}>
                {isApproved ? '✓' : '4'}
              </div>
              <span className="font-bold">৪. পোর্টাল অ্যাক্টিভ</span>
            </div>
            <p className="text-[11px] opacity-80">
              {isApproved ? 'কিউআর ও রিডেম্পশন সক্রিয়' : 'অপেক্ষমাণ'}
            </p>
          </div>
        </div>
      </div>

      {/* Completion Progress Bar */}
      <div className="bg-slate-950/60 border border-emerald-900/50 rounded-xl p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-emerald-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            নথিপত্র ও চুক্তি সম্পূর্ণতা (Documentation Completion)
          </span>
          <span className={`${progressPercent === 100 ? 'text-emerald-400' : 'text-amber-300'}`}>
            {progressPercent}% ({uploadedCount}/{totalCount} সম্পন্ন)
          </span>
        </div>

        <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPercent === 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-emerald-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Missing or Requested Correction Callout Banner */}
      {(missingItems.length > 0 || isCorrection || requestedCorrectionFields.length > 0) && (
        <div className="bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-rose-950/80 border border-amber-500/50 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-200">
                {isCorrection
                  ? 'অ্যাডমিন তথ্য সংশোধনের নির্দেশ দিয়েছেন (Correction Required)'
                  : 'প্রয়োজনীয় নথিপত্র অসম্পূর্ণ/অনুপস্থিত রয়েছে'}
              </h4>
              <p className="text-xs text-amber-100/90 mt-0.5 leading-relaxed">
                দ্রুত ভেরিফিকেশন সম্পন্ন করতে নিচের অনুপস্থিত বা সংশোধনীয় ডকুমেন্ট প্রদান করুন।
              </p>
            </div>
          </div>

          {/* List of missing or flagged items */}
          <div className="bg-black/40 border border-amber-500/30 rounded-lg p-3 text-xs space-y-1.5">
            <span className="font-bold text-amber-300 block mb-1">
              অনুপস্থিত / পুনঃআপলোড আবশ্যক বিষয়সমূহ ({missingItems.length + requestedCorrectionFields.length}টি):
            </span>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-rose-200">
              {missingItems.map((item, idx) => (
                <li key={`mpt-miss-${item.id || 'm'}-${idx}`} className="flex items-center gap-2 bg-rose-950/50 border border-rose-500/30 px-2.5 py-1 rounded-md">
                  <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{item.label} (অনুপস্থিত)</span>
                </li>
              ))}

              {requestedCorrectionFields.map((field, idx) => (
                <li key={`mpt-corr-field-${idx}`} className="flex items-center gap-2 bg-amber-950/50 border border-amber-500/40 px-2.5 py-1 rounded-md text-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{field} (সংশোধন নির্দেশ)</span>
                </li>
              ))}
            </ul>
          </div>

          {onNavigateToCorrection && (
            <div className="pt-1">
              <button
                onClick={onNavigateToCorrection}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                এখনই নথিপত্র সংশোধন বা আপলোড করুন
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detailed Document Checklist Matrix */}
      {!compact && (
        <div className="space-y-3 pt-1">
          <h4 className="text-xs font-bold text-emerald-200 uppercase tracking-wider flex items-center gap-2">
            <FileSignature className="w-4 h-4 text-emerald-400" />
            নথিপত্র ও ভেরিফিকেশন চেকমান (Submitted Documentation Checklist)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {docItems.map((item, idx) => (
              <div
                key={`mpt-doc-${item.id || 'd'}-${idx}`}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  item.isUploaded
                    ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-100'
                    : 'bg-rose-950/30 border-rose-800/50 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    item.isUploaded ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {item.isUploaded ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{item.label}</p>
                    {item.value && (
                      <p className="text-[11px] text-emerald-300/80 truncate">{item.value}</p>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {item.isUploaded ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      সংযুক্ত ✓
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      অনুপস্থিত ✕
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helpful Admin Note */}
      <div className="bg-slate-950/40 border border-emerald-900/40 rounded-xl p-3 text-xs text-emerald-300/80 flex items-center gap-3">
        <HelpCircle className="w-5 h-5 text-emerald-400 shrink-0" />
        <p className="leading-relaxed">
          আবেদন পাওয়ার ২৪-৪৮ ঘণ্টার মধ্যে আমাদের টিম নথিপত্রগুলো পরীক্ষা করে চূড়ান্ত সিদ্ধান্ত প্রদান করেন।
          {helpline?.isActive !== false && helpline?.primaryPhone && (
            <span> যেকোনো জিজ্ঞাসায় হেল্পলাইনে যোগাযোগ করতে পারেন: <a href={`tel:${helpline.primaryPhone.replace(/\s+/g, '')}`} className="text-amber-300 hover:text-amber-200 font-semibold font-mono underline decoration-amber-500/50">{helpline.primaryPhone}</a></span>
          )}
        </p>
      </div>
    </div>
  );
};
