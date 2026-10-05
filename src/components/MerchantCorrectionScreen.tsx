import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Upload, RefreshCw, CheckCircle, FileText, ImageIcon, LogOut, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { optimizeImageForUpload } from '../utils/imageOptimizer';
import { MerchantProgressTracker } from './MerchantProgressTracker';

interface MerchantCorrectionScreenProps {
  verification: any;
  shop: any;
  onResubmitted: () => void;
  onLogout: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const MerchantCorrectionScreen: React.FC<MerchantCorrectionScreenProps> = ({
  verification,
  shop,
  onResubmitted,
  onLogout,
  onShowToast
}) => {
  const [shopName, setShopName] = useState(verification?.shopName || shop?.name || '');
  const [shopAddress, setShopAddress] = useState(verification?.shopAddress || shop?.address || '');
  const [nidNumber, setNidNumber] = useState(verification?.nidNumber || '');
  const [nidFrontUrl, setNidFrontUrl] = useState(verification?.nidFrontUrl || '');
  const [nidBackUrl, setNidBackUrl] = useState(verification?.nidBackUrl || '');
  const [ownerSelfieUrl, setOwnerSelfieUrl] = useState(verification?.ownerSelfieUrl || '');
  const [tradeLicenseNumber, setTradeLicenseNumber] = useState(verification?.tradeLicenseNumber || '');
  const [tradeLicenseUrl, setTradeLicenseUrl] = useState(verification?.tradeLicenseUrl || '');

  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const correctionFields: string[] = verification?.requestedFields || [];

  // File upload helper
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';
    setUploadingField(fieldName);
    try {
      const optimized = await optimizeImageForUpload(file, 1600, 0.85);
      const res = await api.uploadMerchantDocument(optimized.base64, optimized.fileName, fieldName);
      if (res.success && res.url) {
        if (fieldName === 'nidFront') setNidFrontUrl(res.url);
        if (fieldName === 'nidBack') setNidBackUrl(res.url);
        if (fieldName === 'ownerSelfie') setOwnerSelfieUrl(res.url);
        if (fieldName === 'tradeLicense') setTradeLicenseUrl(res.url);
        onShowToast?.('success', 'আপলোড সফল', 'ফাইল আপডেট করা হয়েছে।');
      } else {
        onShowToast?.('error', 'আপলোড ব্যর্থ', res.message || 'ফাইল আপলোড ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      console.error(`Upload error for ${fieldName}:`, err);
      onShowToast?.('error', 'ত্রুটি', err.message || 'আপলোডে সমস্যা হয়েছে।');
    } finally {
      setUploadingField(null);
    }
  };

  const handleResubmit = async () => {
    try {
      setIsSubmitting(true);
      const res = await api.resubmitMerchantRegistration({
        shopName,
        shopAddress,
        nidNumber,
        nidFrontUrl,
        nidBackUrl,
        ownerSelfieUrl,
        tradeLicenseNumber,
        tradeLicenseUrl
      });

      if (res.success) {
        onShowToast?.('success', 'পুনরায় জমা সম্পন্ন', res.message);
        onResubmitted();
      } else {
        onShowToast?.('error', 'ব্যর্থ', res.message);
      }
    } catch (err: any) {
      onShowToast?.('error', 'ত্রুটি', err.message || 'পুনরায় জমা দিতে ব্যর্থ।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Visual Progress Tracker & Document Status */}
      <MerchantProgressTracker
        verification={verification}
        shop={shop}
        status="CORRECTION_REQUIRED"
      />

      {/* Banner */}
      <div className="bg-gradient-to-br from-amber-950 via-amber-900 to-emerald-950 border border-amber-500/60 rounded-2xl p-6 shadow-2xl text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center shrink-0 border border-amber-500/40">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-amber-950 mb-1">
              সংশোধন আবশ্যক (CORRECTION REQUIRED)
            </span>
            <h2 className="text-xl font-bold text-amber-100">
              অ্যাডমিন টিম আপনার আবেদনে তথ্য সংশোধনের অনুরোধ জানিয়েছেন
            </h2>
            <p className="text-xs text-amber-200/90 mt-1">
              নিচে অ্যাডমিনের বার্তা এবং চিহ্নিত ফিল্ডসমূহ সংশোধন করে পুনরায় জমা দিন।
            </p>
          </div>
        </div>

        {/* Correction Message Box */}
        <div className="mt-4 bg-amber-950/80 border border-amber-500/50 rounded-xl p-4">
          <span className="text-xs font-bold text-amber-300 block mb-1">
            অ্যাডমিনের বার্তা / Correction Instructions:
          </span>
          <p className="text-sm font-medium text-amber-100 bg-black/30 p-3 rounded-lg border border-amber-500/30">
            "{verification?.correctionMessage || 'অনুগ্রহ করে এনআইডি এবং ট্রেড লাইসেন্সের পরিষ্কার ছবি পুনরায় আপলোড করুন।'}"
          </p>

          {correctionFields.length > 0 && (
            <div className="mt-3">
              <span className="text-xs text-amber-300 font-semibold block mb-1">চিহ্নিত ফিল্ডসমূহ:</span>
              <div className="flex flex-wrap gap-1.5">
                {correctionFields.map((f, i) => (
                  <span key={`corr-f-${f}-${i}`} className="text-[11px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-full font-medium">
                    • {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-emerald-950/40 backdrop-blur-md rounded-2xl border border-emerald-800/40 p-5 text-white space-y-4">
        <h3 className="text-sm font-bold text-emerald-200 flex items-center gap-2 border-b border-emerald-800/60 pb-2">
          <FileText className="w-4 h-4 text-emerald-400" /> তথ্য সংশোধন করুন
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-emerald-300 mb-1">দোকানের নাম</label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full bg-emerald-900/40 border border-emerald-700/50 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-emerald-300 mb-1">দোকানের ঠিকানা</label>
            <input
              type="text"
              value={shopAddress}
              onChange={(e) => setShopAddress(e.target.value)}
              className="w-full bg-emerald-900/40 border border-emerald-700/50 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-emerald-300 mb-1">এনআইডি (NID) নম্বর</label>
            <input
              type="text"
              value={nidNumber}
              onChange={(e) => setNidNumber(e.target.value)}
              className="w-full bg-emerald-900/40 border border-emerald-700/50 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-emerald-300 mb-1">ট্রেড লাইসেন্স নম্বর</label>
            <input
              type="text"
              value={tradeLicenseNumber}
              onChange={(e) => setTradeLicenseNumber(e.target.value)}
              className="w-full bg-emerald-900/40 border border-emerald-700/50 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        {/* Document Re-uploads */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-emerald-900/30 p-3 rounded-xl border border-emerald-700/40">
            <span className="text-xs font-medium text-emerald-300 block mb-2">এনআইডি সামনের অংশ</span>
            {nidFrontUrl && <img src={nidFrontUrl} alt="NID Front" className="w-full h-28 object-cover rounded-lg mb-2" />}
            <label className="cursor-pointer bg-emerald-800 hover:bg-emerald-700 px-3 py-1.5 rounded-lg text-xs text-white block text-center font-medium">
              {uploadingField === 'nidFront' ? 'আপলোড হচ্ছে...' : 'নতুন ছবি আপলোড করুন'}
              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'nidFront')} className="hidden" />
            </label>
          </div>

          <div className="bg-emerald-900/30 p-3 rounded-xl border border-emerald-700/40">
            <span className="text-xs font-medium text-emerald-300 block mb-2">এনআইডি পেছনের অংশ</span>
            {nidBackUrl && <img src={nidBackUrl} alt="NID Back" className="w-full h-28 object-cover rounded-lg mb-2" />}
            <label className="cursor-pointer bg-emerald-800 hover:bg-emerald-700 px-3 py-1.5 rounded-lg text-xs text-white block text-center font-medium">
              {uploadingField === 'nidBack' ? 'আপলোড হচ্ছে...' : 'নতুন ছবি আপলোড করুন'}
              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'nidBack')} className="hidden" />
            </label>
          </div>

          <div className="bg-emerald-900/30 p-3 rounded-xl border border-emerald-700/40">
            <span className="text-xs font-medium text-emerald-300 block mb-2">মালিকের সেলফি</span>
            {ownerSelfieUrl && <img src={ownerSelfieUrl} alt="Selfie" className="w-20 h-20 object-cover rounded-full mb-2" />}
            <label className="cursor-pointer bg-emerald-800 hover:bg-emerald-700 px-3 py-1.5 rounded-lg text-xs text-white block text-center font-medium">
              {uploadingField === 'ownerSelfie' ? 'আপলোড হচ্ছে...' : 'নতুন ছবি আপলোড করুন'}
              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'ownerSelfie')} className="hidden" />
            </label>
          </div>

          <div className="bg-emerald-900/30 p-3 rounded-xl border border-emerald-700/40">
            <span className="text-xs font-medium text-emerald-300 block mb-2">ট্রেড লাইসেন্স ছবি</span>
            {tradeLicenseUrl && <img src={tradeLicenseUrl} alt="Trade License" className="w-full h-28 object-cover rounded-lg mb-2" />}
            <label className="cursor-pointer bg-emerald-800 hover:bg-emerald-700 px-3 py-1.5 rounded-lg text-xs text-white block text-center font-medium">
              {uploadingField === 'tradeLicense' ? 'আপলোড হচ্ছে...' : 'নতুন ছবি আপলোড করুন'}
              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'tradeLicense')} className="hidden" />
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-emerald-800/40">
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 text-xs font-medium flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> লগআউট
          </button>

          <button
            onClick={handleResubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> জমা হচ্ছে...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" /> সংশোধন সাপেক্ষে পুনরায় জমা দিন (Resubmit)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

