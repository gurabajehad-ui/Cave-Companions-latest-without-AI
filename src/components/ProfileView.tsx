import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Phone,
  ShieldCheck,
  LogOut,
  Edit2,
  MapPin,
  CheckCircle2,
  X,
  Trash2,
  Lock,
  Loader2,
  ChevronRight,
  Compass,
  BookOpen,
  Globe,
  Copy,
  Check,
  Video,
  Users,
  Bell,
  Landmark,
  Headphones,
  FileText,
  Info,
  Layers,
  Settings,
  Sparkles,
  BookMarked,
  Camera
} from 'lucide-react';
import { BANGLADESH_DISTRICTS } from '../data/bangladeshGeo';
import { toBnNumber } from '../data/prayerConfig';
import { PrayerReminderCard } from './PrayerReminderCard';

interface ProfileViewProps {
  onLogout: () => void;
  onShowToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, msg: string) => void;
  onNavigateTab?: (tab: string) => void;
  onOpenLegal?: (type: 'privacy' | 'terms' | 'about') => void;
  onOpenTasbih?: () => void;
  onOpenQibla?: () => void;
  onOpenMosques?: () => void;
  onBack?: () => void;
}

// Custom Ornate Tasbih Rosary Icon
const TasbihRosaryIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="5" r="1.5" fill="currentColor" fillOpacity="0.2" />
    <circle cx="16.5" cy="6.5" r="1.5" fill="currentColor" fillOpacity="0.2" />
    <circle cx="19" cy="10.5" r="1.5" fill="currentColor" fillOpacity="0.2" />
    <circle cx="18" cy="15" r="1.5" fill="currentColor" fillOpacity="0.2" />
    <circle cx="14" cy="18" r="1.5" fill="currentColor" fillOpacity="0.2" />
    <circle cx="10" cy="18" r="1.5" fill="currentColor" fillOpacity="0.2" />
    <circle cx="6" cy="15" r="1.5" fill="currentColor" fillOpacity="0.2" />
    <circle cx="5" cy="10.5" r="1.5" fill="currentColor" fillOpacity="0.2" />
    <circle cx="7.5" cy="6.5" r="1.5" fill="currentColor" fillOpacity="0.2" />
    {/* Tassel */}
    <path d="M12 19.5v3m-2 1.5h4" strokeWidth="1.75" />
  </svg>
);

// Custom Hisnul Muslim Book Icon with [M] Emblem
const HisnulMuslimEmblem: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <div className="w-5 h-5 rounded-md border border-amber-400/80 flex items-center justify-center font-serif font-black text-[9px] text-amber-300">
      M
    </div>
  </div>
);

// Custom Campfire Cave Artwork for Default Avatar
const CampfireArtwork: React.FC<{ className?: string }> = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 100 100" fill="none" className={className}>
    <defs>
      <radialGradient id="caveAura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#d97706" stopOpacity="0.45" />
        <stop offset="60%" stopColor="#042017" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#02110c" />
      </radialGradient>
      <linearGradient id="fireGrad" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="35%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#78350f" />
        <stop offset="100%" stopColor="#451a03" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#caveAura)" />
    {/* Mountain/Cave Silhouettes */}
    <path d="M15 85 L35 45 L50 65 L70 35 L90 85 Z" fill="#062e22" opacity="0.6" />
    <path d="M5 85 L25 55 L45 75 L65 50 L85 85 Z" fill="#031f16" opacity="0.8" />
    {/* Campfire Logs */}
    <path d="M35 78 L65 72" stroke="url(#woodGrad)" strokeWidth="4" strokeLinecap="round" />
    <path d="M35 72 L65 78" stroke="url(#woodGrad)" strokeWidth="4" strokeLinecap="round" />
    {/* Campfire Flame */}
    <path d="M50 42 C45 52 40 60 40 70 C40 76 44 80 50 80 C56 80 60 76 60 70 C60 60 55 52 50 42 Z" fill="url(#fireGrad)" />
    <path d="M50 54 C47 60 45 64 45 70 C45 73 47 76 50 76 C53 76 55 73 55 70 C55 64 53 60 50 54 Z" fill="#fffbeb" />
  </svg>
);

export const ProfileView: React.FC<ProfileViewProps> = React.memo(({
  onLogout,
  onShowToast,
  onNavigateTab,
  onOpenLegal,
  onOpenTasbih,
  onOpenQibla,
  onOpenMosques
}) => {
  const { user, updateProfile, deleteAccount } = useAuth();
  const { language, setLanguage } = useLanguage();

  const [copiedId, setCopiedId] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);

  // Photo Upload State
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('error', language === 'bn' ? 'ত্রুটি' : 'Error', language === 'bn' ? 'শুধুমাত্র ছবি আপলোড করা যাবে।' : 'Only image files are allowed.');
      return;
    }

    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 360;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            
            const success = await updateProfile({ photoUrl: dataUrl });
            if (success) {
              onShowToast('success', language === 'bn' ? 'ছবি পরিবর্তন সফল' : 'Photo Updated', language === 'bn' ? 'প্রোফাইল ছবি সফলভাবে পরিবর্তন করা হয়েছে।' : 'Profile photo updated successfully.');
            } else {
              onShowToast('error', language === 'bn' ? 'ত্রুটি' : 'Error', language === 'bn' ? 'ছবি সেভ করতে সমস্যা হয়েছে।' : 'Failed to save photo.');
            }
          }
          setUploadingPhoto(false);
        };
        img.onerror = () => {
          onShowToast('error', language === 'bn' ? 'ত্রুটি' : 'Error', language === 'bn' ? 'ছবি লোড করা সম্ভব হয়নি।' : 'Failed to load image.');
          setUploadingPhoto(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      onShowToast('error', language === 'bn' ? 'ত্রুটি' : 'Error', err.message || (language === 'bn' ? 'আপলোড করতে সমস্যা হয়েছে।' : 'Upload failed.'));
      setUploadingPhoto(false);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user?.fullName || '');
  const [newDistrict, setNewDistrict] = useState(user?.district || '');
  const [newUpazila, setNewUpazila] = useState(user?.upazila || '');
  const [newAddress, setNewAddress] = useState(user?.address || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Delete account state
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  const userDistrictFormatted = useMemo(() => {
    if (!user?.district) return '';
    const found = BANGLADESH_DISTRICTS.find(d => d.district.toLowerCase() === user.district!.toLowerCase() || d.districtBn === user.district);
    const dist = language === 'bn' ? (found?.districtBn || user.district) : (found?.district || user.district);
    const upz = user.upazila ? `, ${user.upazila}` : '';
    return `${dist}${upz}`;
  }, [user?.district, user?.upazila, language]);

  const displayUserId = useMemo(() => {
    if (!user?.id) return 'USR-10001';
    // Format nicely like reference screenshot: USR-1789888814178-D7C3EB69
    const raw = String(user.id).toUpperCase();
    if (raw.startsWith('USR-')) return raw;
    return `USR-${raw}`;
  }, [user?.id]);

  const handleCopyId = () => {
    if (!displayUserId) return;
    navigator.clipboard.writeText(displayUserId);
    setCopiedId(true);
    onShowToast('success', language === 'bn' ? 'কপি সফল' : 'Copied', language === 'bn' ? 'ইউজার আইডি কপি করা হয়েছে' : 'User ID copied to clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setSavingProfile(true);
    try {
      const ok = await updateProfile({
        fullName: newName.trim(),
        district: newDistrict.trim() || undefined,
        upazila: newUpazila.trim() || undefined,
        address: newAddress.trim() || undefined
      });
      if (ok) {
        onShowToast(
          'success', 
          language === 'bn' ? 'সফল' : 'Success', 
          language === 'bn' ? 'প্রোফাইল তথ্য সফলভাবে পরিবর্তন করা হয়েছে।' : 'Profile updated successfully.'
        );
        setIsEditing(false);
      }
    } catch (err: any) {
      onShowToast(
        'error', 
        language === 'bn' ? 'ত্রুটি' : 'Error', 
        err.message || (language === 'bn' ? 'আপডেট করতে ব্যর্থ হয়েছে।' : 'Failed to update profile.')
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteAccountError(null);
    setIsDeletingAccount(true);

    try {
      const res = await deleteAccount(deletePassword, deleteConfirmText);
      if (res.success) {
        onShowToast(
          'success', 
          language === 'bn' ? 'অ্যাকাউন্ট মুছে ফেলা হয়েছে' : 'Account Deleted', 
          res.message || (language === 'bn' ? 'আপনার অ্যাকাউন্টটি সফলভাবে মুছে ফেলা হয়েছে।' : 'Your account has been deleted successfully.')
        );
        setIsDeleteAccountOpen(false);
        onLogout();
      } else {
        setDeleteAccountError(res.message || (language === 'bn' ? 'অ্যাকাউন্ট মুছে ফেলতে সমস্যা হয়েছে।' : 'Failed to delete account.'));
      }
    } catch (err: any) {
      setDeleteAccountError(err.message || (language === 'bn' ? 'অ্যাকাউন্ট মুছে ফেলতে নেটওয়ার্ক বা সার্ভারে ত্রুটি দেখা দিয়েছে।' : 'A network or server error occurred while deleting account.'));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (!user) return null;

  return (
    <div className="w-full space-y-3.5 pb-24 text-slate-100 select-none">
      
      {/* 1. Top Profile Hero Card matching Screenshot */}
      <div 
        style={{ transform: 'translate3d(0, 0, 0)', backfaceVisibility: 'hidden' }}
        className="w-full relative overflow-hidden rounded-[26px] sm:rounded-[30px] border border-[#104b3d]/80 bg-gradient-to-b from-[#042017] via-[#021711] to-[#01110c] p-4 sm:p-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] text-white"
      >
        {/* Soft Ambient Radiance */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12)_0%,transparent_70%)] pointer-events-none" />
        
        {/* Compact Corner Verified User Badge */}
        <div className="absolute top-3.5 right-3.5 z-20">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#053326]/90 border border-[#0e5c46] text-emerald-300 text-[10.5px] font-semibold shadow-xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="font-sans">{language === 'bn' ? 'যাচাইকৃত' : 'Verified'}</span>
          </div>
        </div>

        {/* Main Info Row */}
        <div className="flex items-center gap-3.5 sm:gap-4 relative z-10 pr-16 sm:pr-20">
          {/* Avatar with Golden Glowing Ornate Ring & Upload Button */}
          <div className="relative shrink-0 group">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full p-0.5 bg-gradient-to-tr from-[#eab308] via-[#ca8a04] to-[#78350f] shadow-[0_0_14px_rgba(234,179,8,0.25)] flex items-center justify-center relative cursor-pointer active:scale-95 transition-transform overflow-hidden group/avatar"
              title={language === 'bn' ? 'প্রোফাইল ছবি পরিবর্তন করুন' : 'Change Profile Picture'}
            >
              <div className="w-full h-full rounded-full bg-[#031d16] overflow-hidden border border-[#14532d]/60 flex items-center justify-center text-xl font-black text-amber-300 relative">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt={user.fullName} className="w-full h-full object-cover" />
                ) : (
                  <CampfireArtwork className="w-full h-full" />
                )}
                {/* Camera Hover Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-amber-300 text-[9px] font-bold gap-0.5 backdrop-blur-[1px]">
                  {uploadingPhoto ? (
                    <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>{language === 'bn' ? 'ছবি দিন' : 'Upload'}</span>
                    </>
                  )}
                </div>
              </div>
            </button>

            {/* Bottom-Right Camera Badge Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#053628] hover:bg-[#084b38] border-2 border-[#031d16] flex items-center justify-center text-amber-300 shadow-md cursor-pointer active:scale-90 transition-all z-20"
              title={language === 'bn' ? 'প্রোফাইল ছবি পরিবর্তন করুন' : 'Change Profile Picture'}
            >
              {uploadingPhoto ? (
                <Loader2 className="w-3 h-3 animate-spin text-amber-300" />
              ) : (
                <Camera className="w-3 h-3 text-amber-300" />
              )}
            </button>
          </div>

          {/* User Meta Information */}
          <div className="min-w-0 flex-1 space-y-1">
            {/* User Name + Edit Icon */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-tight drop-shadow-sm font-sans">
                {user.fullName || (language === 'bn' ? 'সম্মানিত ব্যবহারকারী' : 'Honored User')}
              </h1>
              <button
                type="button"
                onClick={() => {
                  setNewName(user.fullName);
                  setNewDistrict(user.district || '');
                  setNewUpazila(user.upazila || '');
                  setNewAddress(user.address || '');
                  setIsEditing(true);
                }}
                className="p-1 text-emerald-400/80 hover:text-amber-300 hover:bg-emerald-900/40 rounded-lg transition-colors cursor-pointer"
                title={language === 'bn' ? 'সম্পাদন করুন' : 'Edit Profile'}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Phone Pill Badge */}
            <div className="flex items-center gap-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#063326]/90 border border-[#0d5540]/60 text-emerald-300 text-xs font-medium">
                <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="font-mono">{user.phone}</span>
              </div>
            </div>

            {/* User ID Line with Copy Button */}
            <div className="flex items-center gap-1.5 text-xs text-emerald-200/80 font-mono">
              <div className="w-3.5 h-3.5 rounded-xs border border-emerald-400/60 flex items-center justify-center shrink-0">
                <span className="text-[7px] font-sans font-bold">🪪</span>
              </div>
              <span className="text-[11px] sm:text-xs">
                ID: {displayUserId}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="p-0.5 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer shrink-0"
                title="Copy ID"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Location Line */}
            {userDistrictFormatted && (
              <div className="flex items-center gap-1.5 text-xs text-amber-200/90 leading-tight">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] sm:text-xs font-medium">
                  {userDistrictFormatted}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Islamic Quote Bar across Bottom */}
        <div className="pt-2 mt-3 border-t border-[#0e4839]/60 flex items-center justify-center gap-1.5 text-[11px] sm:text-xs italic text-amber-200/80 font-serif relative z-10">
          <span className="text-[8px] text-amber-400/80">◇</span>
          <span>{language === 'bn' ? 'আল্লাহ আমাদের পথচলায় বরকত দান করুন' : 'May Allah bless our journey'}</span>
          <span className="text-[8px] text-amber-400/80">◇</span>
        </div>
      </div>

      {/* 2. Features & Tools 8-Card Grid Section matching Screenshot */}
      <div 
        style={{ transform: 'translate3d(0, 0, 0)', backfaceVisibility: 'hidden' }}
        className="rounded-[26px] sm:rounded-[30px] bg-[#021812]/95 border border-[#0d4737] p-4 sm:p-5 space-y-4 shadow-md"
      >
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#072c21] border border-[#0f543e] flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
              <Layers className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight font-sans truncate">
                {language === 'bn' ? 'ফিচার ও টুলস' : 'Features & Tools'}
              </h2>
              <span className="text-xs text-emerald-300/70 font-medium leading-tight mt-0.5 truncate">
                {language === 'bn' ? 'আপনার দ্বীনি সঙ্গী' : 'Your Islamic Companion'}
              </span>
            </div>
          </div>

          {/* See More Link in Upper Right Corner */}
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('all_features')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400 text-amber-300 hover:text-amber-200 text-xs font-semibold transition-all cursor-pointer group active:scale-95 shadow-xs shrink-0"
            title={language === 'bn' ? 'সকল ফিচার ও টুলস দেখুন' : 'View all features and tools'}
          >
            <span>{language === 'bn' ? 'সব দেখুন' : 'See More'}</span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* 8 Companion Tiles Grid */}
        <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
          {/* Tile 1: Quran */}
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('quran')}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#031d16] hover:bg-[#052b20] border border-[#0b4233] hover:border-amber-400/50 transition-all cursor-pointer group active:scale-95 shadow-xs"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-amber-300 mb-1 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-[11.5px] sm:text-xs font-bold text-slate-100 group-hover:text-amber-200 text-center leading-tight">
              {language === 'bn' ? 'কুরআন' : 'Quran'}
            </span>
          </button>

          {/* Tile 2: Tasbih */}
          <button
            type="button"
            onClick={() => onOpenTasbih && onOpenTasbih()}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#031d16] hover:bg-[#052b20] border border-[#0b4233] hover:border-amber-400/50 transition-all cursor-pointer group active:scale-95 shadow-xs"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-amber-300 mb-1 group-hover:scale-110 transition-transform">
              <TasbihRosaryIcon className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-[11.5px] sm:text-xs font-bold text-slate-100 group-hover:text-amber-200 text-center leading-tight">
              {language === 'bn' ? 'তাসবীহ' : 'Tasbih'}
            </span>
          </button>

          {/* Tile 3: Hisnul Muslim */}
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('hisnul_muslim')}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#031d16] hover:bg-[#052b20] border border-[#0b4233] hover:border-amber-400/50 transition-all cursor-pointer group active:scale-95 shadow-xs"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-amber-300 mb-1 group-hover:scale-110 transition-transform">
              <HisnulMuslimEmblem className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-100 group-hover:text-amber-200 text-center leading-tight">
              {language === 'bn' ? 'হিসনুল মুসলিম' : 'Hisnul Muslim'}
            </span>
          </button>

          {/* Tile 4: Qibla */}
          <button
            type="button"
            onClick={() => onOpenQibla && onOpenQibla()}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#031d16] hover:bg-[#052b20] border border-[#0b4233] hover:border-amber-400/50 transition-all cursor-pointer group active:scale-95 shadow-xs"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-amber-300 mb-1 group-hover:scale-110 transition-transform">
              <Compass className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-[11.5px] sm:text-xs font-bold text-slate-100 group-hover:text-amber-200 text-center leading-tight">
              {language === 'bn' ? 'কিবলা' : 'Qibla'}
            </span>
          </button>

          {/* Tile 5: CAVE Media */}
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('blog')}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#031d16] hover:bg-[#052b20] border border-[#0b4233] hover:border-amber-400/50 transition-all cursor-pointer group active:scale-95 shadow-xs"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-amber-300 mb-1 group-hover:scale-110 transition-transform">
              <Video className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-100 group-hover:text-amber-200 text-center leading-tight">
              {language === 'bn' ? 'কেভ মিডিয়া' : 'CAVE Media'}
            </span>
          </button>

          {/* Tile 6: Mosques */}
          <button
            type="button"
            onClick={() => onOpenMosques && onOpenMosques()}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#031d16] hover:bg-[#052b20] border border-[#0b4233] hover:border-amber-400/50 transition-all cursor-pointer group active:scale-95 shadow-xs"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-amber-300 mb-1 group-hover:scale-110 transition-transform">
              <Landmark className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-[11.5px] sm:text-xs font-bold text-slate-100 group-hover:text-amber-200 text-center leading-tight">
              {language === 'bn' ? 'মসজিদ' : 'Mosques'}
            </span>
          </button>

          {/* Tile 7: Cave Circle */}
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('cave_circle')}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#031d16] hover:bg-[#052b20] border border-[#0b4233] hover:border-amber-400/50 transition-all cursor-pointer group active:scale-95 shadow-xs"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-amber-300 mb-1 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-100 group-hover:text-amber-200 text-center leading-tight">
              {language === 'bn' ? 'কেভ সার্কেল' : 'Cave Circle'}
            </span>
          </button>

          {/* Tile 8: Prayer Alert */}
          <button
            type="button"
            onClick={() => setShowReminderModal(true)}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#031d16] hover:bg-[#052b20] border border-[#0b4233] hover:border-amber-400/50 transition-all cursor-pointer group active:scale-95 shadow-xs"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-amber-300 mb-1 group-hover:scale-110 transition-transform">
              <Bell className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-100 group-hover:text-amber-200 text-center leading-tight">
              {language === 'bn' ? 'সালাত অ্যালার্ট' : 'Prayer Alert'}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Settings & Support Section matching Screenshot */}
      <div 
        style={{ transform: 'translate3d(0, 0, 0)', backfaceVisibility: 'hidden' }}
        className="rounded-[26px] sm:rounded-[30px] bg-[#021812]/95 border border-[#0d4737] p-4 sm:p-5 space-y-3.5 shadow-md"
      >
        {/* Section Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#072c21] border border-[#0f543e] flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
            <Settings className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-white leading-tight font-sans">
              {language === 'bn' ? 'সেটিংস ও সাপোর্ট' : 'Settings & Support'}
            </h2>
            <span className="text-xs text-emerald-300/70 font-medium leading-tight mt-0.5">
              {language === 'bn' ? 'অ্যাকাউন্ট ও প্রেফারেন্স পরিচালনা' : 'Manage your account and preferences'}
            </span>
          </div>
        </div>

        {/* Vertical List of Options */}
        <div className="space-y-2 pt-1">
          {/* Item 1: App Language */}
          <div className="w-full flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-[#031d16]/70 border border-[#0a3a2d] transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#06291f] border border-[#0e4f3a] text-amber-400 flex items-center justify-center shrink-0">
                <Globe className="w-4.5 h-4.5 text-amber-400" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs sm:text-sm font-bold text-white">
                  {language === 'bn' ? 'অ্যাপের ভাষা' : 'App Language'}
                </span>
                <span className="text-[11px] text-emerald-300/60 font-medium truncate">
                  {language === 'bn' ? 'বাংলা (Bangla)' : 'English'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
              className="px-3.5 py-1.5 rounded-full bg-[#053225] hover:bg-[#084232] border border-[#0f5c45] text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
            >
              <span>{language === 'bn' ? 'পরিবর্তন' : 'Change'}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>

          {/* Item 2: Help & Support */}
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('support')}
            className="w-full flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-[#031d16]/70 hover:bg-[#05291f] border border-[#0a3a2d] hover:border-[#105643] transition-all cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#06291f] border border-[#0e4f3a] text-amber-400 flex items-center justify-center shrink-0">
                <Headphones className="w-4.5 h-4.5 text-amber-400" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-200 transition-colors">
                  {language === 'bn' ? 'হেল্প ও সাপোর্ট' : 'Help & Support'}
                </span>
                <span className="text-[11px] text-emerald-300/60 font-medium truncate">
                  {language === 'bn' ? 'প্রশ্নোত্তর ও সরাসরি সহায়তা' : 'FAQ & Direct Support'}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-500/80 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Item 2: Admin Dashboard */}
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('admin')}
            className="w-full flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-[#031d16]/70 hover:bg-[#05291f] border border-[#0a3a2d] hover:border-[#105643] transition-all cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#06291f] border border-[#0e4f3a] text-amber-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4.5 h-4.5 text-amber-400" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-200 transition-colors">
                    {language === 'bn' ? 'এডমিন ড্যাশবোর্ড' : 'Admin Dashboard'}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-300/60 font-medium truncate">
                  {language === 'bn' ? 'শপ ও মসজিদ পরিচালনা' : 'Shop & Mosque Management'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold text-emerald-300 bg-[#053628] border border-[#0e5c46] px-2 py-0.5 rounded-md font-sans">
                ADMIN
              </span>
              <ChevronRight className="w-4 h-4 text-emerald-500/80 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
            </div>
          </button>

          {/* Item 3: Privacy Policy */}
          <button
            type="button"
            onClick={() => onOpenLegal && onOpenLegal('privacy')}
            className="w-full flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-[#031d16]/70 hover:bg-[#05291f] border border-[#0a3a2d] hover:border-[#105643] transition-all cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#06291f] border border-[#0e4f3a] text-amber-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4.5 h-4.5 text-amber-400" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-200 transition-colors">
                  {language === 'bn' ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}
                </span>
                <span className="text-[11px] text-emerald-300/60 font-medium truncate">
                  {language === 'bn' ? 'আপনার তথ্য আমাদের কাছে সুরক্ষিত' : 'Your data is safe with us'}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-500/80 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Item 4: Terms & Conditions */}
          <button
            type="button"
            onClick={() => onOpenLegal && onOpenLegal('terms')}
            className="w-full flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-[#031d16]/70 hover:bg-[#05291f] border border-[#0a3a2d] hover:border-[#105643] transition-all cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#06291f] border border-[#0e4f3a] text-amber-400 flex items-center justify-center shrink-0">
                <FileText className="w-4.5 h-4.5 text-amber-400" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-200 transition-colors">
                  {language === 'bn' ? 'শর্তাবলী' : 'Terms & Conditions'}
                </span>
                <span className="text-[11px] text-emerald-300/60 font-medium truncate">
                  {language === 'bn' ? 'অ্যাপ ব্যবহারের নিয়মাবলি পড়ুন' : 'Read before using our app'}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-500/80 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Item 5: About App */}
          <button
            type="button"
            onClick={() => onOpenLegal && onOpenLegal('about')}
            className="w-full flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-[#031d16]/70 hover:bg-[#05291f] border border-[#0a3a2d] hover:border-[#105643] transition-all cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#06291f] border border-[#0e4f3a] text-amber-400 flex items-center justify-center shrink-0">
                <Info className="w-4.5 h-4.5 text-amber-400" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-200 transition-colors">
                  {language === 'bn' ? 'অ্যাপ সম্পর্কে' : 'About App'}
                </span>
                <span className="text-[11px] text-emerald-300/60 font-medium truncate">
                  {language === 'bn' ? 'ভার্সন ও অন্যান্য বিস্তারিত' : 'Version & more details'}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-500/80 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        </div>
      </div>

      {/* 5. Log Out & Danger Zone matching Screenshot */}
      <div className="space-y-2.5 pt-1">
        {/* Full-Width Pill Logout Button */}
        <button
          type="button"
          onClick={onLogout}
          className="w-full py-3 sm:py-3.5 px-4 rounded-full bg-gradient-to-r from-[#2c0e15] via-[#45121e] to-[#2c0e15] hover:from-[#551624] hover:to-[#551624] border border-rose-900/50 text-rose-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-black/40 transition-all cursor-pointer active:scale-[0.99]"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span>{language === 'bn' ? 'লগআউট করুন' : 'Log Out'}</span>
        </button>

        {/* Minimal Delete Account Link */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              setDeletePassword('');
              setDeleteConfirmText('');
              setDeleteAccountError(null);
              setIsDeleteAccountOpen(true);
            }}
            className="text-[11px] sm:text-xs text-rose-400/80 hover:text-rose-300 flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400/80" />
            <span>{language === 'bn' ? 'অ্যাকাউন্ট স্থায়ীভাবে মুছুন' : 'Delete Account Permanently'}</span>
          </button>
        </div>
      </div>

      {/* Prayer Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowReminderModal(false)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <PrayerReminderCard onShowToast={onShowToast} />
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gradient-to-br from-[#04241b] via-[#021c15] to-[#01140e] border border-emerald-700/70 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-emerald-800/50 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-amber-400" />
                  <span>{language === 'bn' ? 'প্রোফাইল সম্পাদন' : 'Edit Profile'}</span>
                </h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1 text-emerald-300/80 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-emerald-300 mb-1">
                    {language === 'bn' ? 'আপনার নাম' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-[#031d16] border border-emerald-700/60 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                    placeholder="আপনার পূর্ণ নাম"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-300 mb-1">
                    {language === 'bn' ? 'জেলা' : 'District'}
                  </label>
                  <select
                    value={newDistrict}
                    onChange={(e) => {
                      setNewDistrict(e.target.value);
                      setNewUpazila('');
                    }}
                    className="w-full bg-[#031d16] border border-emerald-700/60 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                  >
                    <option value="">{language === 'bn' ? '-- জেলা নির্বাচন করুন --' : '-- Select District --'}</option>
                    {BANGLADESH_DISTRICTS.map((d) => (
                      <option key={d.district} value={d.district}>
                        {language === 'bn' ? d.districtBn : d.district}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-300 mb-1">
                    {language === 'bn' ? 'উপজেলা' : 'Upazila'}
                  </label>
                  <input
                    type="text"
                    value={newUpazila}
                    onChange={(e) => setNewUpazila(e.target.value)}
                    className="w-full bg-[#031d16] border border-emerald-700/60 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                    placeholder="উপজেলা নাম লিখুন"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-300 mb-1">
                    {language === 'bn' ? 'ঠিকানা (ঐচ্ছিক)' : 'Address (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full bg-[#031d16] border border-emerald-700/60 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                    placeholder="বাড়ি, রোড বা এলাকা"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    {language === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {savingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{language === 'bn' ? 'সংরক্ষণ' : 'Save'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {isDeleteAccountOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gradient-to-br from-[#1f0a0e] via-[#140609] to-[#0a0304] border border-rose-700/60 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-rose-900/40 pb-3">
                <h3 className="text-base font-bold text-rose-300 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>{language === 'bn' ? 'অ্যাকাউন্ট স্থায়ীভাবে মুছুন' : 'Delete Account'}</span>
                </h3>
                <button
                  onClick={() => setIsDeleteAccountOpen(false)}
                  className="p-1 text-rose-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-rose-200/90 leading-relaxed bg-rose-950/40 p-3 rounded-xl border border-rose-900/50">
                {language === 'bn'
                  ? 'সতর্কতা: অ্যাকাউন্ট মুছে ফেললে আপনার সকল সালাত হিস্ট্রি, টোকেন ও পার্সোনাল ডাটা স্থায়ীভাবে মুছে যাবে।'
                  : 'Warning: Deleting your account will permanently remove all your prayer records, earned tokens, and profile data.'}
              </div>

              {deleteAccountError && (
                <div className="text-xs text-rose-400 bg-rose-950/80 p-2.5 rounded-xl border border-rose-800">
                  {deleteAccountError}
                </div>
              )}

              <form onSubmit={handleDeleteAccountSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-rose-300 mb-1">
                    {language === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-rose-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full bg-[#120507] border border-rose-800/60 rounded-xl pl-9 pr-3 py-2 text-white text-xs focus:outline-none focus:border-rose-400"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-rose-300 mb-1">
                    {language === 'bn' ? 'নিশ্চিত করতে "DELETE" লিখুন' : 'Type "DELETE" to confirm'}
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full bg-[#120507] border border-rose-800/60 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-rose-400"
                    placeholder="DELETE"
                    required
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDeleteAccountOpen(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    {language === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isDeletingAccount || deleteConfirmText !== 'DELETE'}
                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isDeletingAccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
});
