import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Phone, Mail, MapPin, Calendar, Heart, ShieldCheck, Activity, Award, CheckCircle2, X, Loader2, UserCheck, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface UserDetailModalProps {
  identifier: string | null;
  onClose: () => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({ identifier, onClose }) => {
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!identifier) return;
    const fetchUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.lookupUser(identifier);
        if (res.success && res.user) {
          setUserData(res.user);
        } else {
          setError('ইউজারের তথ্য পাওয়া যায়নি।');
        }
      } catch (err: any) {
        console.error('Fetch user detail error:', err);
        setError(err.message || 'ইউজারের বিস্তারিত তথ্য লোড করতে সমস্যা হয়েছে।');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [identifier]);

  if (!identifier) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white leading-tight">ইউজার প্রোফাইল বিবরণ</h3>
              <p className="text-xs text-amber-400/80 font-medium">ব্যবহারকারীর বিস্তারিত হিসাব ও নিবন্ধিত তথ্য</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-sm font-bold text-slate-400">ইউজার তথ্য লোড হচ্ছে...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="text-sm font-bold text-slate-300">{error}</p>
            </div>
          ) : userData ? (
            <>
              {/* User Overview Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 text-xl font-black uppercase overflow-hidden flex-shrink-0">
                  {userData.photoUrl ? (
                    <img src={userData.photoUrl} alt={userData.fullName} className="w-full h-full object-cover" />
                  ) : (
                    userData.fullName?.charAt(0) || 'U'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-white truncate">{userData.fullName}</h4>
                    {userData.isVerified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> ভেরিফাইড
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <Phone className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-mono">{userData.phone}</span>
                  </div>
                  {userData.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{userData.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center">
                  <Activity className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">মোট সালাত</span>
                  <span className="text-base font-black text-emerald-400 font-mono">{(userData.totalPrayers || 0).toLocaleString('bn-BD')}</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center">
                  <Award className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">সংগৃহীত টোকেন</span>
                  <span className="text-base font-black text-amber-400 font-mono">{(userData.availableTokens || 0).toLocaleString('bn-BD')}</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center">
                  <Heart className="w-4 h-4 text-rose-400 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">ব্যবহৃত টোকেন</span>
                  <span className="text-base font-black text-rose-400 font-mono">{(userData.redeemedTokens || 0).toLocaleString('bn-BD')}</span>
                </div>
              </div>

              {/* Personal Details */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h5 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800">
                  ব্যক্তিগত বিবরণী (Personal Info)
                </h5>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold block">লিঙ্গ (Gender):</span>
                    <span className="text-slate-200 font-medium capitalize">
                      {userData.gender === 'male' ? 'পুরুষ (Male)' : userData.gender === 'female' ? 'নারী (Female)' : 'অন্যান্য'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">বয়স (Age):</span>
                    <span className="text-slate-200 font-medium">
                      {userData.age ? `${userData.age} বছর` : 'নির্ধারিত নয়'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">বৈবাহিক অবস্থা:</span>
                    <span className="text-slate-200 font-medium capitalize">
                      {userData.maritalStatus || 'নির্ধারিত নয়'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">জেলা / অবস্থান:</span>
                    <span className="text-slate-200 font-medium">
                      {userData.district ? `${userData.district}${userData.upazila ? `, ${userData.upazila}` : ''}` : 'নির্ধারিত নয়'}
                    </span>
                  </div>
                </div>

                {userData.address && (
                  <div className="pt-2 border-t border-slate-800/80 text-xs">
                    <span className="text-slate-500 font-bold block">পূর্ণাঙ্গ ঠিকানা:</span>
                    <span className="text-slate-300 font-medium">{userData.address}</span>
                  </div>
                )}
              </div>

              {/* Membership & System Status */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">নিবন্ধনের তারিখ:</span>
                  <span className="text-slate-300 font-mono">
                    {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }) : 'অজানা'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">অ্যাকাউন্ট স্ট্যাটাস:</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {userData.status || 'ACTIVE'}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            বন্ধ করুন (Close)
          </button>
        </div>
      </motion.div>
    </div>
  );
};
