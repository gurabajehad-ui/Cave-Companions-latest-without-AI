import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Landmark, MapPin, X, Upload, CheckCircle2, AlertTriangle,
  Compass, Loader2, User, Phone, Image as ImageIcon,
  FileText, Navigation, Info, Sparkles, Map, ArrowLeft
} from 'lucide-react';
import { api, getStoredUser } from '../services/api';
import { Mosque } from '../types';
import { MosqueLocationPickerModal } from './MosqueLocationPickerModal';
import { useLanguage } from '../context/LanguageContext';

interface MosqueSubmissionModalProps {
  onClose: () => void;
  onSuccess: (createdMosque: Mosque) => void;
  isAdminMode?: boolean;
}

export const MosqueSubmissionModal: React.FC<MosqueSubmissionModalProps> = ({
  onClose,
  onSuccess,
  isAdminMode = false
}) => {
  const { language } = useLanguage();
  const currentUser = getStoredUser();

  const [nameBn, setNameBn] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [district, setDistrict] = useState('ঢাকা');
  const [imamName, setImamName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [description, setDescription] = useState('');

  const [applicantName] = useState(currentUser?.fullName || '');
  const [applicantPhone] = useState(currentUser?.phone || '');

  // Photos
  const [mosqueImageBase64, setMosqueImageBase64] = useState<string | null>(null);
  const [mosqueImageUrl, setMosqueImageUrl] = useState<string>('');
  const [imamImageBase64, setImamImageBase64] = useState<string | null>(null);
  const [imamImageUrl, setImamImageUrl] = useState<string>('');

  // States
  const [isLocating, setIsLocating] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isUploadingMosquePhoto, setIsUploadingMosquePhoto] = useState(false);
  const [isUploadingImamPhoto, setIsUploadingImamPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Duplicate warning
  const [duplicateWarnings, setDuplicateWarnings] = useState<Array<{ mosque: Mosque; reason: string }>>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  // Live duplicate check when user types names or coordinates
  useEffect(() => {
    if (!nameBn.trim() && !name.trim() && (!latitude || !longitude)) {
      setDuplicateWarnings([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingDuplicates(true);
        const res = await api.checkMosqueDuplicates({
          name: name.trim() || undefined,
          nameBn: nameBn.trim() || undefined,
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined
        });
        if (res.success && res.duplicates) {
          setDuplicateWarnings(res.duplicates);
        }
      } catch (err) {
        console.warn('Duplicate check error:', err);
      } finally {
        setIsCheckingDuplicates(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [nameBn, name, latitude, longitude]);

  // GPS auto-detection
  const handleDetectGPS = () => {
    setIsLocating(true);
    setErrorMessage(null);
    if (!navigator.geolocation) {
      setIsLocating(false);
      setErrorMessage(language === 'bn' ? 'আপনার ব্রাউজার জিপিএস লোকেশন সাপোর্ট করে না।' : 'Your browser does not support GPS location.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setIsLocating(false);
      },
      (err) => {
        console.warn('GPS location error:', err);
        setIsLocating(false);
        setErrorMessage(language === 'bn' ? 'জিপিএস লোকেশন পাওয়া যায়নি। অনুগ্রহ করে গুগল ম্যাপ বা ম্যানুয়ালি লিখুন।' : 'GPS location could not be fetched. Please pick from Google Maps or enter manually.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Image Upload Handlers
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'mosque' | 'imam') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage(language === 'bn' ? 'ছবির সাইজ সর্বোচ্চ ৫ মেগাবাইট হতে পারবে।' : 'Image size cannot exceed 5MB.');
      return;
    }

    // Set loading state immediately so UI reacts instantly
    const previewUrl = URL.createObjectURL(file);
    if (type === 'mosque') {
      setMosqueImageBase64(previewUrl);
      setIsUploadingMosquePhoto(true);
    } else {
      setImamImageBase64(previewUrl);
      setIsUploadingImamPhoto(true);
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      if (type === 'mosque') {
        try {
          const res = await api.uploadMosquePhoto({
            imageBase64: base64,
            filename: file.name,
            mimeType: file.type
          });
          if (res.success && res.url) {
            setMosqueImageUrl(res.url);
          }
        } catch (err) {
          console.warn('Photo upload warning:', err);
        } finally {
          setIsUploadingMosquePhoto(false);
        }
      } else {
        try {
          const res = await api.uploadMosquePhoto({
            imageBase64: base64,
            filename: file.name,
            mimeType: file.type
          });
          if (res.success && res.url) {
            setImamImageUrl(res.url);
          }
        } catch (err) {
          console.warn('Imam photo upload warning:', err);
        } finally {
          setIsUploadingImamPhoto(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Essential validation with gentle fallbacks
    const resolvedName = (nameBn.trim() || name.trim() || 'জামে মসজিদ');
    const resolvedAddress = (address.trim() || area.trim() || district.trim() || 'স্থানীয় ঠিকানা');

    setIsSubmitting(true);
    try {
      const finalMosqueImageUrl = mosqueImageUrl || mosqueImageBase64 || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80';
      const finalImamImageUrl = imamImageUrl || imamImageBase64 || finalMosqueImageUrl;

      const lat = latitude && !isNaN(parseFloat(latitude)) ? parseFloat(latitude) : 23.8103;
      const lng = longitude && !isNaN(parseFloat(longitude)) ? parseFloat(longitude) : 90.4125;
      const finalArea = area.trim() || district.trim() || 'ঢাকা';
      const finalDistrict = district.trim() || 'ঢাকা';
      const finalImamName = imamName.trim() || 'দায়িত্বশীল ইমাম';
      const finalContact = contactNumber.trim() || '01700000000';
      const finalApplicantName = applicantName.trim() || currentUser?.fullName || 'সাধারণ ব্যবহারকারী';
      const finalApplicantPhone = applicantPhone.trim() || currentUser?.phone || '01700000000';

      if (isAdminMode) {
        // Direct creation by Admin
        const res = await api.createAdminMosque({
          name: (name.trim() || resolvedName),
          nameBn: (nameBn.trim() || resolvedName),
          address: resolvedAddress,
          area: finalArea,
          district: finalDistrict,
          imamName: finalImamName,
          contactNumber: finalContact,
          latitude: lat,
          longitude: lng,
          description: description.trim() || undefined,
          imageUrl: finalMosqueImageUrl,
          imamImageUrl: finalImamImageUrl,
          status: 'active'
        });

        if (res.success) {
          setSuccessMessage(language === 'bn' ? 'মসজিদটি সফলভাবে যুক্ত এবং লাইভ করা হয়েছে!' : 'Mosque added and made live successfully!');
          onSuccess(res.mosque);
          onClose();
        } else {
          setErrorMessage(res.message || (language === 'bn' ? 'মসজিদ যুক্ত করতে সমস্যা হয়েছে।' : 'Failed to add mosque.'));
        }
      } else {
        // User Application (Pending Review)
        const res = await api.requestMosque({
          name: (name.trim() || resolvedName),
          nameBn: (nameBn.trim() || resolvedName),
          address: resolvedAddress,
          area: finalArea,
          district: finalDistrict,
          imamName: finalImamName,
          contactNumber: finalContact,
          latitude: lat,
          longitude: lng,
          description: description.trim() || undefined,
          imageUrl: finalMosqueImageUrl,
          imamImageUrl: finalImamImageUrl,
          applicantName: finalApplicantName,
          applicantPhone: finalApplicantPhone
        });

        if (res.success) {
          setSuccessMessage(language === 'bn' ? 'আলহামদুলিল্লাহ্! আপনার আবেদন সফলভাবে জমা হয়েছে।' : 'Alhamdulillah! Your application has been submitted successfully.');
          onSuccess(res.mosque);
          onClose();
        } else {
          setErrorMessage(res.message || (language === 'bn' ? 'আবেদন জমা দিতে সমস্যা হয়েছে।' : 'Failed to submit application.'));
        }
      }
    } catch (err: any) {
      console.error('Submit mosque error:', err);
      setErrorMessage(err.message || (language === 'bn' ? 'আবেদন জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' : 'Failed to submit application. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-950 flex flex-col w-full h-full animate-fadeIn overflow-hidden text-slate-100">
      {/* Header */}
      <div className="bg-emerald-950 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-emerald-800/80 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-xl bg-emerald-900/60 text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors cursor-pointer shrink-0 shadow-xs active:scale-95"
            title={language === 'bn' ? 'ফিরে যান' : 'Back'}
          >
            <ArrowLeft className="w-5 h-5 text-emerald-400" />
          </button>

          <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white leading-tight truncate">
              {isAdminMode
                ? (language === 'bn' ? 'নতুন মসজিদ নিবন্ধন ফরম (বাধ্যতামূলক তথ্য)' : 'New Mosque Registration Form')
                : (language === 'bn' ? 'নতুন মসজিদ যুক্ত করার আবেদন (সকল তথ্য বাধ্যতামূলক)' : 'Apply to Add New Mosque')}
            </h2>
            <p className="text-[11px] sm:text-xs text-emerald-300/80 mt-0.5 truncate">
              {isAdminMode
                ? (language === 'bn' ? 'মসজিদের সকল বিবরণ ও ছবি প্রদান করে সরাসরি লাইভ করুন' : 'Enter all details & photos to make the mosque live')
                : (language === 'bn' ? 'সকল ঘর পূরণ করা বাধ্যতামূলক। যাচাই শেষে মসজিদটি লাইভ হবে' : 'Fill in all fields. Mosque will be live after verification')}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 sm:p-2.5 rounded-xl bg-emerald-900/60 text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors cursor-pointer shrink-0 shadow-xs active:scale-95"
          title={language === 'bn' ? 'বন্ধ করুন' : 'Close'}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Form Body */}
      <form onSubmit={handleSubmit} className="px-3 sm:px-6 py-4 sm:py-6 overflow-y-auto space-y-5 flex-1 w-full pb-28">
          {/* Status Alerts */}
          {!isAdminMode && !currentUser && (
            <div className="p-4 bg-amber-950/60 border border-amber-600/50 rounded-2xl flex flex-col items-center gap-3 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-white">{language === 'bn' ? 'লগইন প্রয়োজন' : 'Login Required'}</p>
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  {language === 'bn' ? 'মসজিদ আবেদন জমা দিতে দয়া করে আপনার অ্যাকাউন্টে লগইন করুন। আপনার অ্যাকাউন্টের তথ্য স্বয়ংক্রিয়ভাবে আবেদনের সাথে যুক্ত করা হবে।' : 'Please sign in to submit a mosque application. Your account details will be attached automatically.'}
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-rose-950/70 border border-rose-800 rounded-2xl flex items-start gap-2.5 text-xs text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-700 rounded-2xl flex items-start gap-3 text-xs text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-white">{language === 'bn' ? 'আবেদন সফল হয়েছে' : 'Application Successful'}</p>
                <p>{successMessage}</p>
              </div>
            </div>
          )}

          {/* Duplicate Warnings Banner */}
          {duplicateWarnings.length > 0 && (
            <div className="p-3.5 bg-amber-950/60 border border-amber-600/50 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>{language === 'bn' ? `সম্ভাব্য ডুপ্লিকেট মসজিদ সতর্কবার্তা (${duplicateWarnings.length})` : `Potential Duplicate Mosques (${duplicateWarnings.length})`}</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                {language === 'bn' ? 'আপনার দেওয়া তথ্যের অনুরূপ মসজিদ ইতোমধ্যে সিস্টেমে রয়েছে:' : 'A mosque with matching details already exists in the system:'}
              </p>
              <div className="space-y-1.5 pt-1">
                {duplicateWarnings.map((dw, idx) => (
                  <div key={`dup-warn-${dw.mosque?.id || 'm'}-${idx}`} className="text-[11px] bg-slate-900/90 p-2 rounded-xl border border-slate-800 flex items-center justify-between text-slate-300">
                    <span className="font-semibold text-white">{dw.mosque.nameBn || dw.mosque.name} ({dw.mosque.area}, {dw.mosque.district})</span>
                    <span className="text-[10px] text-amber-400 font-mono px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-700/50">{dw.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Applicant Info (User Identity Box) */}
          {!isAdminMode && currentUser && (
            <div className="p-3.5 bg-slate-900/90 border border-emerald-900/50 rounded-2xl flex items-center justify-between gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-900/50 border border-emerald-700/40 flex items-center justify-center text-emerald-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>{currentUser.fullName || applicantName || (language === 'bn' ? 'ব্যবহারকারী' : 'User')}</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800">
                      {language === 'bn' ? 'আবেদনকারী' : 'Applicant'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">{currentUser.phone || applicantPhone}</p>
                </div>
              </div>
              <span className="text-[10px] text-emerald-400 italic">
                {language === 'bn' ? 'ইউজার আইডি ও ফোন স্বয়ংক্রিয়ভাবে সংযুক্ত' : 'User ID & Phone attached automatically'}
              </span>
            </div>
          )}

          {/* 1. Basic Mosque Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? '১. মসজিদের সাধারণ তথ্য' : '1. Mosque Basic Information'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>{language === 'bn' ? 'মসজিদের নাম (বাংলা)' : 'Mosque Name (Bangla)'} <span className="text-rose-400">*</span></span>
                </label>
                <input
                  type="text"
                  value={nameBn}
                  onChange={e => setNameBn(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: বাইতুল আমান জামে মসজিদ' : 'e.g. Baitul Aman Jame Mosque'}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  <span>{language === 'bn' ? 'মসজিদের নাম (English)' : 'Mosque Name (English)'}</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Baitul Aman Jame Mosque"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                <span>{language === 'bn' ? 'মসজিদের পূর্ণাঙ্গ ঠিকানা' : 'Full Address'}</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder={language === 'bn' ? 'যেমন: রোড নং ৪, ব্লক সি, মূল সড়ক সংলগ্ন' : 'e.g. Road 4, Block C'}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  <span>{language === 'bn' ? 'এলাকা / থানা / উপজেলা' : 'Area / Thana / Upazila'}</span>
                </label>
                <input
                  type="text"
                  value={area}
                  onChange={e => setArea(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: ধানমন্ডি / মিরপুর' : 'e.g. Dhanmondi / Mirpur'}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  <span>{language === 'bn' ? 'জেলা' : 'District'}</span>
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: ঢাকা' : 'e.g. Dhaka'}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 2. GPS Location Picker & Google Maps Integration */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? '২. GPS লোকেশন (গুগল ম্যাপ ও জিপিএস - বাধ্যতামূলক)' : '2. GPS Coordinates (Google Maps / GPS)'} <span className="text-rose-400">*</span></span>
              </h3>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer"
                >
                  <Map className="w-3.5 h-3.5 text-amber-300" />
                  <span>{language === 'bn' ? 'গুগল ম্যাপ থেকে সেট করুন' : 'Pick on Google Maps'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={isLocating}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isLocating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Compass className="w-3.5 h-3.5" />
                  )}
                  <span>{language === 'bn' ? 'বর্তমান জিপিএস নিন' : 'Detect Current GPS'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">
                  <span>{language === 'bn' ? 'Latitude (অক্ষাংশ)' : 'Latitude'} <span className="text-rose-400">*</span></span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={e => setLatitude(e.target.value)}
                  placeholder="23.8103"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">
                  <span>{language === 'bn' ? 'Longitude (দ্রাঘিমাংশ)' : 'Longitude'} <span className="text-rose-400">*</span></span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={e => setLongitude(e.target.value)}
                  placeholder="90.4125"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              {language === 'bn' ? 'সঠিক লোকেশন নির্ধারণ করতে উপর থেকে "গুগল ম্যাপ থেকে সেট করুন" বাটনে ক্লিক করুন।' : 'Click "Pick on Google Maps" above to pinpoint precise coordinates.'}
            </p>
          </div>

          {/* 3. Imam & Management Contact */}
          <div className="space-y-3 pt-1">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? '৩. ইমাম ও যোগাযোগের তথ্য (বাধ্যতামূলক)' : '3. Imam & Contact Information'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  <span>{language === 'bn' ? 'ইমাম / খতিবের নাম' : 'Imam / Khatib Name'} <span className="text-rose-400">*</span></span>
                </label>
                <input
                  type="text"
                  value={imamName}
                  onChange={e => setImamName(e.target.value)}
                  placeholder={language === 'bn' ? 'মাওলানা আব্দুর রহমান' : 'Maulana Abdur Rahman'}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  <span>{language === 'bn' ? 'ইমাম / দায়িত্বশীলের ফোন নম্বর' : 'Imam / Official Phone'} <span className="text-rose-400">*</span></span>
                </label>
                <input
                  type="tel"
                  value={contactNumber}
                  onChange={e => setContactNumber(e.target.value)}
                  placeholder="017XXXXXXXX"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 4. Photos (Mosque & Imam) - Mandatory */}
          <div className="space-y-3 pt-1">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? '৪. মসজিদের ছবি ও ইমামের ছবি (দুটিই বাধ্যতামূলক)' : '4. Mosque Photo & Imam Photo'} <span className="text-rose-400">*</span></span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Mosque Photo */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>{language === 'bn' ? 'মসজিদের ছবি' : 'Mosque Photo'} <span className="text-rose-400">*</span></span>
                </label>

                {mosqueImageBase64 ? (
                  <div className="relative rounded-xl overflow-hidden border border-emerald-600/50 bg-black/40 h-28 flex items-center justify-center group">
                    <img
                      src={mosqueImageBase64}
                      alt="Mosque preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setMosqueImageBase64(null);
                        setMosqueImageUrl('');
                      }}
                      className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/70 text-rose-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-colors h-28 bg-slate-950/40">
                    <Upload className="w-5 h-5 text-emerald-400 mb-1" />
                    <span className="text-xs text-slate-200 font-semibold">{language === 'bn' ? 'মসজিদের ছবি দিন' : 'Upload Mosque Photo'}</span>
                    <span className="text-[10px] text-slate-400">JPG, PNG (max 5MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handlePhotoSelect(e, 'mosque')}
                      required={!mosqueImageUrl && !mosqueImageBase64}
                      className="hidden"
                    />
                  </label>
                )}
                {isUploadingMosquePhoto && (
                  <p className="text-[10px] text-amber-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>{language === 'bn' ? 'ছবি আপলোড হচ্ছে...' : 'Uploading photo...'}</span>
                  </p>
                )}
              </div>

              {/* Imam Photo */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>{language === 'bn' ? 'ইমামের ছবি' : 'Imam Photo'} <span className="text-rose-400">*</span></span>
                </label>

                {imamImageBase64 ? (
                  <div className="relative rounded-xl overflow-hidden border border-emerald-600/50 bg-black/40 h-28 flex items-center justify-center group">
                    <img
                      src={imamImageBase64}
                      alt="Imam preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImamImageBase64(null);
                        setImamImageUrl('');
                      }}
                      className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/70 text-rose-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-colors h-28 bg-slate-950/40">
                    <Upload className="w-5 h-5 text-emerald-400 mb-1" />
                    <span className="text-xs text-slate-200 font-semibold">{language === 'bn' ? 'ইমামের ছবি দিন' : 'Upload Imam Photo'}</span>
                    <span className="text-[10px] text-slate-400">JPG, PNG (max 5MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handlePhotoSelect(e, 'imam')}
                      required={!imamImageUrl && !imamImageBase64}
                      className="hidden"
                    />
                  </label>
                )}
                {isUploadingImamPhoto && (
                  <p className="text-[10px] text-amber-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>{language === 'bn' ? 'ইমামের ছবি আপলোড হচ্ছে...' : 'Uploading imam photo...'}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 5. Additional Description */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>{language === 'bn' ? 'অতিরিক্ত বিবরণ বা বিশেষ বৈশিষ্ট্য (ঐচ্ছিক)' : 'Additional Details / Facilities (Optional)'}</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={language === 'bn' ? 'যেমন: মহিলাদের জন্য পৃথক নামাজের ব্যবস্থা রয়েছে, অজু খানা ও পার্কিং সুবিধা।' : 'e.g. Dedicated women prayer space, wudu facilities and parking.'}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Submit Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || (!isAdminMode && !currentUser)}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/60 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === 'bn' ? 'জমা হচ্ছে...' : 'Submitting...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{isAdminMode ? (language === 'bn' ? 'মসজিদ সরাসরি লাইভ করুন' : 'Make Mosque Live') : (language === 'bn' ? 'আবেদন জমা দিন' : 'Submit Application')}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {showMapPicker && (
          <MosqueLocationPickerModal
            initialLat={latitude ? parseFloat(latitude) : 23.8103}
            initialLng={longitude ? parseFloat(longitude) : 90.4125}
            address={address}
            onClose={() => setShowMapPicker(false)}
            onSuccess={(lat, lng, addr) => {
              setLatitude(lat.toFixed(6));
              setLongitude(lng.toFixed(6));
              if (addr && !address) {
                setAddress(addr);
              }
              setShowMapPicker(false);
            }}
            onShowToast={(type, title, msg) => {
              console.log(`[Toast ${type}] ${title}: ${msg}`);
            }}
          />
        )}
    </div>
  );
};

