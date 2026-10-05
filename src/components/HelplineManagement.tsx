import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Phone,
  PhoneCall,
  MessageCircle,
  Mail,
  MessageSquareText,
  Power,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  ShieldCheck,
  Clock,
  Sparkles,
  PhoneForwarded
} from 'lucide-react';
import { api } from '../services/api';
import { HelplineSettings } from '../types';

interface HelplineManagementProps {
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, msg: string) => void;
}

export const HelplineManagement: React.FC<HelplineManagementProps> = ({ onShowToast }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Form states
  const [primaryPhone, setPrimaryPhone] = useState('+880 1700-000000');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [supportEmail, setSupportEmail] = useState('support@cavecompanions.org');
  const [supportMessage, setSupportMessage] = useState(
    'সাহায্যের জন্য ২৪-৪৮ ঘণ্টার মধ্যে আমাদের টিম আপনার অনুরোধটি রিভিউ করবে। জরুরি কোনো সাহায্যের প্রয়োজন হলে আমাদের হেল্পলাইনে যোগাযোগ করতে পারেন।'
  );
  const [isWhatsappEnabled, setIsWhatsappEnabled] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [updatedBy, setUpdatedBy] = useState('system');

  // Load existing configuration on mount
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminHelpline();
      if (res.success && res.helpline) {
        const h = res.helpline;
        setPrimaryPhone(h.primaryPhone || '+880 1700-000000');
        setSecondaryPhone(h.secondaryPhone || '');
        setWhatsappNumber(h.whatsappNumber || '');
        setSupportEmail(h.supportEmail || 'support@cavecompanions.org');
        setSupportMessage(
          h.supportMessage ||
            'সাহায্যের জন্য ২৪-৪৮ ঘণ্টার মধ্যে আমাদের টিম আপনার অনুরোধটি রিভিউ করবে। জরুরি কোনো সাহায্যের প্রয়োজন হলে আমাদের হেল্পলাইনে যোগাযোগ করতে পারেন।'
        );
        setIsWhatsappEnabled(Boolean(h.isWhatsappEnabled));
        setIsActive(h.isActive !== undefined ? Boolean(h.isActive) : true);
        setUpdatedBy(h.updatedBy || 'system');
        if (h.updatedAt) {
          setLastSavedTime(new Date(h.updatedAt).toLocaleTimeString('bn-BD', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: 'numeric',
            month: 'short'
          }));
        }
      }
    } catch (err: any) {
      console.error('Failed to load helpline settings:', err);
      if (onShowToast) {
        onShowToast('error', 'লোড ত্রুটি', 'হেল্পলাইন তথ্য লোড করা যায়নি।');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!primaryPhone.trim() || primaryPhone.trim().length < 5) {
      if (onShowToast) {
        onShowToast('error', 'অবৈধ নম্বর', 'অনুগ্রহ করে একটি সঠিক প্রাথমিক হেল্পলাইন নম্বর লিখুন।');
      }
      return;
    }

    if (supportEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail.trim())) {
      if (onShowToast) {
        onShowToast('error', 'অবৈধ ইমেইল', 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা প্রদান করুন।');
      }
      return;
    }

    try {
      setSaving(true);
      const res = await api.updateAdminHelpline({
        primaryPhone: primaryPhone.trim(),
        secondaryPhone: secondaryPhone.trim(),
        whatsappNumber: whatsappNumber.trim(),
        supportEmail: supportEmail.trim(),
        supportMessage: supportMessage.trim(),
        isWhatsappEnabled,
        isActive
      });

      if (res.success) {
        if (onShowToast) {
          onShowToast('success', 'সফল', res.message || 'হেল্পলাইন তথ্য সফলভাবে আপডেট করা হয়েছে।');
        }
        setLastSavedTime(new Date().toLocaleTimeString('bn-BD', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          day: 'numeric',
          month: 'short'
        }));
      } else {
        if (onShowToast) {
          onShowToast('error', 'ব্যর্থ', 'হেল্পলাইন তথ্য আপডেট করা যায়নি। আবার চেষ্টা করুন।');
        }
      }
    } catch (err: any) {
      console.error('Failed to update helpline settings:', err);
      if (onShowToast) {
        onShowToast('error', 'ত্রুটি', err.message || 'হেল্পলাইন তথ্য আপডেট করা যায়নি। আবার চেষ্টা করুন।');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-400">হেল্পলাইন কনফিগারেশন লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner / Status Overview */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            isActive
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}>
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-black text-white">হেল্পলাইন নিয়ন্ত্রণ কেন্দ্র</h4>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {isActive ? '● সক্রিয় (ACTIVE)' : '○ নিষ্ক্রিয় (INACTIVE)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              এখানে পরিবর্তিত তথ্য রিয়েল-টাইমে ইউজার অ্যাপের সাপোর্ট স্ক্রিন এবং প্রগ্রেস ট্র্যাকারে প্রদর্শিত হবে।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastSavedTime && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>সর্বশেষ আপডেট: {lastSavedTime}</span>
            </div>
          )}
          <button
            type="button"
            onClick={fetchSettings}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Settings Form (Left 7 Cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl text-left">
            {/* Helpline Master Active Toggle */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Power className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="text-sm font-bold text-white">হেল্পলাইন সিস্টেম স্ট্যাটাস</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  নিষ্ক্রিয় রাখলে ইউজার অ্যাপে কোনো হেল্পলাইন ফোন নম্বর দৃশ্যমান হবে না।
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isActive ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Primary Phone Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>প্রাথমিক হেল্পলাইন নম্বর (Primary Phone) <span className="text-rose-400">*</span></span>
              </label>
              <input
                type="text"
                required
                value={primaryPhone}
                onChange={e => setPrimaryPhone(e.target.value)}
                placeholder="+880 1700-000000"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition-colors font-mono"
              />
              <p className="text-[11px] text-slate-400">
                ব্যবহারকারী এই নম্বরে সরাসরি কল করতে পারবেন (`tel:+880...`)।
              </p>
            </div>

            {/* Secondary Phone Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <PhoneForwarded className="w-3.5 h-3.5 text-blue-400" />
                <span>বিকল্প হেল্পলাইন নম্বর (Secondary Phone - ঐচ্ছিক)</span>
              </label>
              <input
                type="text"
                value={secondaryPhone}
                onChange={e => setSecondaryPhone(e.target.value)}
                placeholder="+880 1800-000000 (প্রযোজ্য হলে)"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition-colors font-mono"
              />
              <p className="text-[11px] text-slate-400">
                জরুরি প্রয়োজনে ব্যাকআপ বা দ্বিতীয় হেল্পলাইন নম্বর হিসেবে প্রদর্শিত হবে।
              </p>
            </div>

            {/* WhatsApp Integration Section */}
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-200">হোয়াটসঅ্যাপ সাপোর্ট সুবিধা (WhatsApp Support)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWhatsappEnabled(!isWhatsappEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isWhatsappEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isWhatsappEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {isWhatsappEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-1.5 pt-2 border-t border-emerald-900/40"
                >
                  <label className="text-[11px] font-bold text-emerald-300 block">
                    হোয়াটসঅ্যাপ নম্বর (দেশ কোড সহ লিখুন)
                  </label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={e => setWhatsappNumber(e.target.value)}
                    placeholder="+880 1700-000000 বা 8801700000000"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-emerald-800/50 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 transition-colors font-mono"
                  />
                  <p className="text-[10px] text-emerald-400/80">
                    ইউজার অ্যাপে ক্লিক করলে সরাসরি `https://wa.me/8801700000000` এ চ্যাট ওপেন হবে।
                  </p>
                </motion.div>
              )}
            </div>

            {/* Support Email Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>সাপোর্ট ইমেইল (Support Email)</span>
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={e => setSupportEmail(e.target.value)}
                placeholder="support@cavecompanions.org"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
              <p className="text-[11px] text-slate-400">
                ইমেইল ক্লায়েন্ট খোলার জন্য `mailto:` প্রটোকল ব্যবহার করা হবে।
              </p>
            </div>

            {/* Support Message Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <MessageSquareText className="w-3.5 h-3.5 text-teal-400" />
                <span>সাপোর্ট নোটিশ ও বার্তা (Support Message)</span>
              </label>
              <textarea
                rows={3}
                value={supportMessage}
                onChange={e => setSupportMessage(e.target.value)}
                placeholder="ইউজার অ্যাপে প্রদর্শনীয় বার্তা লিখুন..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition-colors resize-none leading-relaxed"
              />
              <p className="text-[11px] text-slate-400">
                ইউজার অ্যাপের সাপোর্ট সেকশনে যোগাযোগের ঠিক ওপরে এই বার্তাটি দেখানো হবে।
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>আপডেট করা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-slate-950" />
                    <span>হেল্পলাইন আপডেট করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Live User App Preview (Right 5 Cols) */}
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>লাইভ অ্যাপ প্রিভিউ (User App Preview)</span>
              </h4>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                রিয়েল-টাইম প্রিভিউ
              </span>
            </div>

            <p className="text-xs text-slate-400">
              ইউজার অ্যাপের সহায়তা ডায়ালগ ও সাপোর্ট স্ক্রিনে যেভাবে প্রদর্শিত হবে:
            </p>

            {/* Simulated Phone Screen Card */}
            <div className="bg-slate-950 border border-emerald-700/60 rounded-2xl p-4 space-y-4 shadow-inner">
              <div className="flex items-center justify-between border-b border-emerald-950 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-900/60 flex items-center justify-center text-amber-300">
                    <PhoneCall className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-white">যোগাযোগ ও সহায়তা</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                </span>
              </div>

              {isActive ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                    {supportMessage || 'সাহায্যের জন্য জরুরি কোনো প্রয়োজনে আমাদের হেল্পলাইনে যোগাযোগ করতে পারেন।'}
                  </p>

                  <div className="space-y-2 pt-1">
                    {/* Primary Phone */}
                    <a
                      href={`tel:${primaryPhone.replace(/\s+/g, '')}`}
                      onClick={e => e.preventDefault()}
                      className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-800/60 flex items-center justify-center text-emerald-300">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-[10px] text-emerald-400/80 font-semibold">প্রাথমিক হেল্পলাইন</p>
                          <p className="text-xs font-bold text-white font-mono">{primaryPhone || '+880 1700-000000'}</p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-1 bg-emerald-600 text-white font-bold rounded-lg">
                        কল করুন
                      </span>
                    </a>

                    {/* Secondary Phone */}
                    {secondaryPhone.trim() && (
                      <a
                        href={`tel:${secondaryPhone.replace(/\s+/g, '')}`}
                        onClick={e => e.preventDefault()}
                        className="flex items-center justify-between p-3 rounded-xl bg-blue-950/40 border border-blue-800/60 text-blue-300 hover:bg-blue-900/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-800/60 flex items-center justify-center text-blue-300">
                            <PhoneForwarded className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-[10px] text-blue-400/80 font-semibold">বিকল্প হেল্পলাইন</p>
                            <p className="text-xs font-bold text-white font-mono">{secondaryPhone}</p>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-1 bg-blue-600 text-white font-bold rounded-lg">
                          কল করুন
                        </span>
                      </a>
                    )}

                    {/* WhatsApp Button */}
                    {isWhatsappEnabled && whatsappNumber.trim() && (
                      <a
                        href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
                        onClick={e => e.preventDefault()}
                        className="flex items-center justify-between p-3 rounded-xl bg-green-950/40 border border-green-800/60 text-green-300 hover:bg-green-900/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-green-800/60 flex items-center justify-center text-green-300">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-[10px] text-green-400/80 font-semibold">হোয়াটসঅ্যাপ চ্যাট</p>
                            <p className="text-xs font-bold text-white font-mono">{whatsappNumber}</p>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-1 bg-green-600 text-white font-bold rounded-lg">
                          মেসেজ দিন
                        </span>
                      </a>
                    )}

                    {/* Support Email */}
                    {supportEmail.trim() && (
                      <a
                        href={`mailto:${supportEmail.trim()}`}
                        onClick={e => e.preventDefault()}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400">
                            <Mail className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-semibold">ইমেইল সহায়তা</p>
                            <p className="text-xs font-bold text-white">{supportEmail}</p>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-1 bg-slate-800 text-slate-200 font-bold rounded-lg border border-slate-700">
                          ইমেইল
                        </span>
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-400">
                    হেল্পলাইন বর্তমানে নিষ্ক্রিয় রয়েছে। ইউজার অ্যাপে শুধুমাত্র সাধারণ সাপোর্ট টিকিট ও FAQ দেখানো হবে।
                  </p>
                </div>
              )}
            </div>

            {/* Architecture Assurance Note */}
            <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-4 space-y-1.5 text-xs text-amber-300/90">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>ক্লাউড ও ডাটাবেজ স্থায়িত্ব গ্যারান্টি</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                এই হেল্পলাইন তথ্যগুলো ক্লাউড এসকিউএল (PostgreSQL)-এর `helpline_settings` টেবিলে স্থায়ীভাবে সংরক্ষিত হয়। অ্যাপ রিস্টার্ট বা রিডিপ্লয় হলেও কোনো তথ্য রিসেট হবে না।
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
