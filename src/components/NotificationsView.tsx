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
  ArrowRight
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
