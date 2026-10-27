import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  AlertTriangle,
  Shield,
  Megaphone,
  CheckCheck,
  Filter,
  ArrowLeft,
  Clock,
  Inbox,
  Trash2,
  MessageCircle,
  Share2,
  Check,
  X,
  Loader2,
  VolumeX,
  RotateCcw,
  ArrowRight,
  Smartphone,
  Send,
  Info,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { NotificationItem, NotificationType } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface NotificationsViewProps {
  onBack?: () => void;
  onNavigateToCircles?: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, msg: string) => void;
  onNotificationReadChange?: (unreadCount: number) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onBack,
  onNavigateToCircles,
  onShowToast,
  onNotificationReadChange
}) => {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Device Push Notification States
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  });
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showNotificationGuide, setShowNotificationGuide] = useState(false);

  const handleRequestDevicePermission = async () => {
    if (!('Notification' in window)) {
      onShowToast('error', 'অসমর্থিত ডিভাইস', 'আপনার ব্রাউজার বা ডিভাইসে নোটিফিকেশন সাপোর্ট নেই।');
      return;
    }
    try {
      setIsRequestingPermission(true);
      const perm = await Notification.requestPermission();
      setPermissionStatus(perm);
      if (perm === 'granted') {
        onShowToast('success', 'অনুমতি সফল', 'ডিভাইস নোটিফিকেশন সফলভাবে চালু করা হয়েছে!');
        
        // Subscription logic
        try {
          const registration = await navigator.serviceWorker.ready;
          const vapidPublicKey = 'BDZJ8SbU0aAGWQJD3x19rXlCYokBjGH2hGYUn_XnjGiE9X5DRtp_kTGjSPgb6snMqWeLVxMyyXiaRXylglLD9vQ';
          const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
          
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });
          
          await api.subscribeToPush(subscription);
        } catch (subErr) {
          console.error('Push subscription failed:', subErr);
        }

        try {
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(reg => {
              reg.showNotification('🎉 গুহা সাথী পুশ নোটিফিকেশন চালু হয়েছে', {
                body: 'এখন থেকে সালাতের ওয়াক্ত, সার্কেল মেসেজ ও অর্ডারের আপডেট আপনার ডিভাইসে সরাসরি পাবেন।',
                icon: '/app_icon.jpg',
                badge: '/app_icon.jpg'
              });
            });
          } else {
            new Notification('🎉 গুহা সাথী পুশ নোটিফিকেশন চালু হয়েছে', {
              body: 'এখন থেকে সালাতের ওয়াক্ত, সার্কেল মেসেজ ও অর্ডারের আপডেট আপনার ডিভাইসে সরাসরি পাবেন।',
              icon: '/app_icon.jpg'
            });
          }
        } catch (e) {
          console.warn('Initial welcome notification failed:', e);
        }
      } else if (perm === 'denied') {
        onShowToast('info', 'অনুমতি মেলেনি', 'ব্রাউজার সেটিংসে (Site Settings -> Notifications) গিয়ে পারমিশন Allow করুন।');
      }
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err.message || 'অনুমতি চাওয়া সম্ভব হয়নি।');
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleSendTestNotification = () => {
    if (!('Notification' in window)) {
      onShowToast('error', 'অসমর্থিত', 'ব্রাউজার নোটিফিকেশন সাপোর্ট করে না।');
      return;
    }
    if (Notification.permission !== 'granted') {
      onShowToast('info', 'অনুমতি নেই', 'প্রথমে ডিভাইস নোটিফিকেশন চালু করুন।');
      return;
    }
    setIsSendingTest(true);
    try {
      const title = '🕌 টেস্ট নোটিফিকেশন - গুহা সাথী';
      const options = {
        body: 'আপনার ডিভাইসে পুশ নোটিফিকেশন সঠিকভাবে কাজ করছে! আলহামদুলিল্লাহ।',
        icon: '/app_icon.jpg',
        badge: '/app_icon.jpg',
        vibrate: [200, 100, 200]
      };
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, options);
        });
      } else {
        new Notification(title, options);
      }
      onShowToast('success', 'পাঠানো হয়েছে', 'আপনার ডিভাইসে টেস্ট নোটিফিকেশন পাঠানো হয়েছে।');
    } catch (err) {
      onShowToast('error', 'ব্যর্থ', 'নোটিফিকেশন পাঠাতে সমস্যা হয়েছে।');
    } finally {
      setTimeout(() => setIsSendingTest(false), 800);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
      if (onNotificationReadChange) {
        onNotificationReadChange(res.unreadCount);
      }
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await api.markNotificationRead(id);
      setNotifications(prev =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(res.unreadCount);
      if (onNotificationReadChange) {
        onNotificationReadChange(res.unreadCount);
      }
    } catch (err: any) {
      onShowToast('error', t('common.error'), t('notifications.updateFailed'));
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      const res = await api.markAllNotificationsRead();
      setNotifications(prev => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      if (onNotificationReadChange) {
        onNotificationReadChange(0);
      }
      onShowToast('success', t('common.success'), t('notifications.allMarkedRead'));
    } catch (err: any) {
      onShowToast('error', t('common.error'), t('notifications.updateFailed'));
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(res.unreadCount);
      if (onNotificationReadChange) {
        onNotificationReadChange(res.unreadCount);
      }
      onShowToast('success', t('common.success'), t('notifications.deleted'));
    } catch (err: any) {
      onShowToast('error', t('common.error'), t('notifications.deleteFailed'));
    }
  };

  const executeDeleteAll = async () => {
    try {
      const res = await api.deleteAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
      if (onNotificationReadChange) {
        onNotificationReadChange(0);
      }
      setShowDeleteConfirm(false);
      onShowToast('success', t('common.success'), t('notifications.allDeleted'));
    } catch (err: any) {
      onShowToast('error', t('common.error'), t('notifications.deleteFailed'));
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CIRCLE_INVITE':
        return <Share2 className="w-5 h-5 text-amber-400" />;
      case 'CIRCLE_MESSAGE':
        return <MessageCircle className="w-5 h-5 text-emerald-400" />;
      case 'PRAYER_VERIFIED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'TOKEN_EARNED':
        return <Sparkles className="w-5 h-5 text-amber-400" />;
      case 'TOKEN_REDEEMED':
        return <ShoppingBag className="w-5 h-5 text-teal-400" />;
      case 'REDEMPTION_FAILED':
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
      case 'SECURITY':
        return <Shield className="w-5 h-5 text-blue-400" />;
      case 'MODERATION_WARNING':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'MODERATION_MUTE':
        return <VolumeX className="w-5 h-5 text-orange-400" />;
      case 'MODERATION_WITHDRAWN':
        return <RotateCcw className="w-5 h-5 text-emerald-400" />;
      case 'ANNOUNCEMENT':
      default:
        return <Megaphone className="w-5 h-5 text-indigo-400" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'CIRCLE_INVITE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/50">সার্কেল আমন্ত্রণ 🏕️</span>;
      case 'CIRCLE_MESSAGE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">সার্কেল বার্তা 💬</span>;
      case 'PRAYER_VERIFIED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">{t('notifications.badges.prayerVerified')}</span>;
      case 'TOKEN_EARNED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/50">{t('notifications.badges.tokenEarned')}</span>;
      case 'TOKEN_REDEEMED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-950/80 text-teal-300 border border-teal-700/50">{t('notifications.badges.tokenRedeemed')}</span>;
      case 'REDEMPTION_FAILED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-700/50">{t('notifications.badges.redemptionFailed')}</span>;
      case 'SECURITY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950/80 text-blue-300 border border-blue-700/50">{t('notifications.badges.security')}</span>;
      case 'MODERATION_WARNING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/90 text-amber-300 border border-amber-600/60">কমিউনিটি সতর্কতা ⚠️</span>;
      case 'MODERATION_MUTE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-950/90 text-orange-300 border border-orange-600/60">বার্তা বিরতি 🔇</span>;
      case 'MODERATION_WITHDRAWN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-600/60">সতর্কতা প্রত্যাহার ✅</span>;
      case 'ANNOUNCEMENT':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">{t('notifications.badges.announcement')}</span>;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  return (
    <div className="w-full max-w-4xl mx-auto px-1.5 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-5 pb-28 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer shadow-sm active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 truncate">
              <Bell className="w-5 h-5 text-amber-400 shrink-0" />
              <span>{t('notifications.title')}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-amber-400 transition-colors cursor-pointer shadow-xs active:scale-95"
              title={t('notifications.markAllRead')}
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">{t('notifications.markAllRead')}</span>
            </button>
          )}

          {notifications.length > 0 && (
            showDeleteConfirm ? (
              <div className="flex items-center gap-1.5 animate-fadeIn bg-rose-950/40 border border-rose-900/60 px-2.5 py-1.5 rounded-xl">
                <span className="text-[11px] text-rose-300 font-bold hidden sm:inline">{t('notifications.confirmDeleteAll')}</span>
                <button
                  onClick={executeDeleteAll}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  {t('notifications.yes')}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 transition-colors cursor-pointer"
                >
                  {t('notifications.no')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-900/60 rounded-xl text-xs font-semibold text-rose-300 transition-colors cursor-pointer shadow-xs active:scale-95"
                title={t('notifications.deleteAll')}
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('notifications.deleteAll')}</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Device Push Notification Status & Test Banner */}
      <div className={`p-4 rounded-2xl border transition-all ${
        permissionStatus === 'granted'
          ? 'bg-emerald-950/20 border-emerald-500/30'
          : 'bg-amber-950/25 border-amber-500/30'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              permissionStatus === 'granted'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}>
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  {permissionStatus === 'granted'
                    ? 'ডিভাইস পুশ নোটিফিকেশন চালু রয়েছে'
                    : 'ডিভাইসে পুশ নোটিফিকেশন পেতে চান?'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  permissionStatus === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}>
                  {permissionStatus === 'granted' ? 'সক্রিয় (Active)' : 'অনুমতি প্রয়োজন'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {permissionStatus === 'granted'
                  ? 'সালাতের ওয়াক্ত, সার্কেল মেসেজ ও অর্ডারের আপডেট সরাসরি আপনার ডিভাইসের নোটিফিকেশন বারে আসছে।'
                  : 'অ্যাপ বন্ধ থাকলেও সালাত ও সার্কেল বার্তার সরাসরি আপডেট পেতে ব্রাউজার নোটিফিকেশন চালু করুন।'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            {permissionStatus === 'granted' ? (
              <button
                type="button"
                onClick={handleSendTestNotification}
                disabled={isSendingTest}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>টেস্ট নোটিফিকেশন পাঠান</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRequestDevicePermission}
                disabled={isRequestingPermission}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isRequestingPermission ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                <span>নোটিফিকেশন অন করুন</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowNotificationGuide(!showNotificationGuide)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer shrink-0"
              title="সাহায্য ও তথ্য"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Info / Troubleshooting */}
        {showNotificationGuide && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-300 space-y-1.5 animate-fadeIn">
            <p className="font-bold text-amber-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>মোবাইল ডিভাইসে নোটিফিকেশন না আসলে কি করবেন?</span>
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li><strong>ব্রাউজার পারমিশন:</strong> ব্রাউজারের উপরে তালার চিহ্নে (Lock icon) ক্লিক করে Notification "Allow" আছে কিনা চেক করুন।</li>
              <li><strong>মোবাইলের ব্যাটারি অপ্টিমাইজেশন:</strong> ফোনের Settings -&gt; Apps -&gt; Chrome/Browser -&gt; Battery-তে গিয়ে "Unrestricted" বা Don't Optimize দিন যাতে ব্যাকগ্রাউন্ডে নোটিফিকেশন বন্ধ না হয়।</li>
              <li><strong>হোম স্ক্রিনে যুক্ত করুন (PWA):</strong> সেরা পারফরম্যান্সের জন্য ব্রাউজার মেনু থেকে "Install App" বা "Add to Home Screen" করুন।</li>
            </ul>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="w-full flex gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'all'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {t('notifications.all')} ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all relative ${
            filter === 'unread'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {t('notifications.unread')}
          {unreadCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={`notif-skeleton-${i}`} className="animate-pulse bg-slate-900/60 border border-slate-800 rounded-2xl p-4 h-24" />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl p-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
            <Inbox className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-300">{t('notifications.empty')}</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {filter === 'unread'
              ? t('notifications.allReadMessage')
              : t('notifications.emptySubMessage')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredNotifications.map((notification, idx) => (
              <motion.div
                key={`notif-${notification.id || 'n'}-${idx}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`w-full p-3 sm:p-3.5 rounded-2xl border transition-all relative ${
                  !notification.read
                    ? 'bg-gradient-to-br from-slate-900/95 via-slate-900/85 to-emerald-950/40 border-emerald-600/50 shadow-md'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 opacity-90'
                }`}
              >
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 shrink-0 shadow-xs">
                    {getTypeIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Line 1: Title & Actions */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h4 className={`text-xs sm:text-sm font-bold truncate ${!notification.read ? 'text-white' : 'text-slate-300'}`}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="New" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {getTypeBadge(notification.type)}
                        <button
                          onClick={(e) => handleDeleteNotification(notification.id, e)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title={t('notifications.deleteAll')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Line 2: Message */}
                    <p className="text-xs text-slate-300 leading-snug break-words">
                      {notification.message}
                    </p>

                    {/* Line 3: Footer with Time, Circle link, and Mark as read */}
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 pt-1 border-t border-slate-800/40">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-2">
                        {notification.type === 'CIRCLE_INVITE' && onNavigateToCircles && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToCircles();
                            }}
                            className="text-[10px] sm:text-[11px] text-amber-300 hover:text-amber-200 font-bold px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-700/50 hover:bg-amber-900/60 transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                          >
                            <span>সার্কেলে যান</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}

                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-[10px] sm:text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-0.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 hover:bg-emerald-950/80 transition-colors cursor-pointer active:scale-95"
                          >
                            {t('notifications.markAsRead')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
