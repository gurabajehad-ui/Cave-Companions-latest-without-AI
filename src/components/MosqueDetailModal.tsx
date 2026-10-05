import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Landmark, MapPin, Phone, User, X, Loader2, AlertCircle, CheckCircle2, ShieldCheck, Navigation } from 'lucide-react';
import { api } from '../services/api';
import { Mosque } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface MosqueDetailModalProps {
  mosqueId?: string | null;
  mosqueName?: string | null;
  onClose: () => void;
}

export const MosqueDetailModal: React.FC<MosqueDetailModalProps> = ({ mosqueId, mosqueName, onClose }) => {
  const { language } = useLanguage();
  const [mosque, setMosque] = useState<Mosque | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mosqueId && !mosqueName) return;
    const fetchMosque = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.lookupMosque({
          id: mosqueId || undefined,
          name: mosqueName || undefined
        });
        if (res.success && res.mosque) {
          setMosque(res.mosque);
        } else {
          setError(language === 'bn' ? 'মসজিদের বিস্তারিত তথ্য পাওয়া যায়নি।' : 'Mosque details not found.');
        }
      } catch (err: any) {
        console.error('Fetch mosque detail error:', err);
        setError(err.message || (language === 'bn' ? 'মসজিদের তথ্য লোড করতে সমস্যা হয়েছে।' : 'Failed to load mosque information.'));
      } finally {
        setLoading(false);
      }
    };
    fetchMosque();
  }, [mosqueId, mosqueName, language]);

  if (!mosqueId && !mosqueName) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600/20 via-slate-900 to-slate-900 px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white leading-tight">
                {language === 'bn' ? 'মসজিদের বিস্তারিত বিবরণ' : 'Mosque Details'}
              </h3>
              <p className="text-xs text-emerald-400/80 font-medium">
                {language === 'bn' ? 'নিবন্ধিত মসজিদের অবস্থান ও তথ্য' : 'Registered Mosque Location & Information'}
              </p>
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
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-sm font-bold text-slate-400">
                {language === 'bn' ? 'মসজিদের তথ্য লোড হচ্ছে...' : 'Loading mosque information...'}
              </p>
            </div>
          ) : error ? (
            <div className="py-12 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="text-sm font-bold text-slate-300">{error}</p>
              {mosqueName && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl inline-block text-xs text-slate-400 font-bold">
                  {language === 'bn' ? 'মসজিদের নাম:' : 'Mosque Name:'} {mosqueName}
                </div>
              )}
            </div>
          ) : mosque ? (
            <>
              {/* Mosque Title Banner */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-black text-white leading-snug">{mosque.nameBn || mosque.name}</h4>
                    {mosque.nameBn && mosque.name !== mosque.nameBn && (
                      <p className="text-xs text-slate-400 font-medium">{mosque.name}</p>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${
                    mosque.status === 'active' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    <CheckCircle2 className="w-3 h-3" />
                    {mosque.status === 'active' ? (language === 'bn' ? 'অনুমোদিত' : 'Active') : mosque.status}
                  </span>
                </div>
              </div>

              {/* Location & Details */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h5 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  {language === 'bn' ? 'অবস্থান ও ঠিকানা' : 'Location & Address'}
                </h5>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold block">{language === 'bn' ? 'জেলা:' : 'District:'}</span>
                    <span className="text-slate-200 font-medium">{mosque.district || (language === 'bn' ? 'নির্ধারিত নয়' : 'Not set')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">{language === 'bn' ? 'এলাকা:' : 'Area:'}</span>
                    <span className="text-slate-200 font-medium">{mosque.area || (language === 'bn' ? 'নির্ধারিত নয়' : 'Not set')}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-xs">
                  <span className="text-slate-500 font-bold block">{language === 'bn' ? 'ঠিকানা:' : 'Address:'}</span>
                  <span className="text-slate-300 font-medium">{mosque.address || (language === 'bn' ? 'নির্ধারিত নয়' : 'Not set')}</span>
                </div>
              </div>

              {/* Contact & Imam Info */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h5 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  {language === 'bn' ? 'দায়িত্বপ্রাপ্ত ব্যক্তিবর্গ' : 'Mosque Management'}
                </h5>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold block">{language === 'bn' ? 'ইমামের নাম:' : 'Imam Name:'}</span>
                    <span className="text-slate-200 font-medium">{mosque.imamName || (language === 'bn' ? 'তথ্য দেওয়া হয়নি' : 'Not provided')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">{language === 'bn' ? 'যোগাযোগের মোবাইল:' : 'Contact Phone:'}</span>
                    <span className="text-slate-200 font-medium font-mono">{mosque.contactNumber || (language === 'bn' ? 'তথ্য দেওয়া হয়নি' : 'Not provided')}</span>
                  </div>
                </div>
              </div>

              {/* Location Verification Parameters */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-950/80 border border-emerald-700/60 rounded-xl flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h6 className="text-xs font-black text-white flex items-center gap-1.5">
                    {language === 'bn' ? 'সালাত লোকেশন ভেরিফিকেশন' : 'Salat Location Verification'}
                  </h6>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    {language === 'bn' ? 'জিপিএস কোঅর্ডিনেট:' : 'GPS Coordinates:'} {mosque.latitude ? `${Number(mosque.latitude).toFixed(4)}, ${Number(mosque.longitude).toFixed(4)}` : (language === 'bn' ? 'নির্ধারণ করা হয়নি' : 'Not configured')}
                  </p>
                  <p className="text-[11px] text-emerald-400 mt-0.5 font-medium">
                    {language === 'bn' ? `অনুমোদিত ভেরিফিকেশন রেঞ্জ: ${mosque.verificationRadius || 75} মিটার` : `Allowed Verification Radius: ${mosque.verificationRadius || 75} meters`}
                  </p>
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
            {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
