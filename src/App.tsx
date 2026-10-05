import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import { ActiveTab, Mosque, PrayerInfo, TodayPrayerStatus } from './types';
import { api, getStoredMerchantToken, getStoredRiderToken, getStoredToken } from './services/api';
import { PRAYERS_CONFIG, getTodayPrayerOrder, HADITHS, toBnNumber } from './data/prayerConfig';
import { prayerReminderService } from './services/prayerReminderService';
import { offlineSyncService } from './services/offlineSyncService';
import { Sparkles, BookOpen, Landmark, RefreshCw, CloudUpload, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { PDFVerificationView } from './components/PDFVerificationView';

// Dynamic confetti celebration helper
const triggerConfettiCelebration = async () => {
  try {
    const confettiModule = await import('canvas-confetti');
    const confetti = confettiModule.default;
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#10b981', '#fbbf24', '#34d399', '#ffffff']
    });
  } catch (e) {}
};

// Core Initial Components
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { SplashScreen } from './components/SplashScreen';
import { AuthScreen } from './components/AuthScreen';
import { DailyProgressCard } from './components/DailyProgressCard';
import { SehriIftarCard } from './components/SehriIftarCard';
import { CompactPrayersCard } from './components/CompactPrayersCard';
import { DailyNasihaCard } from './components/DailyNasihaCard';
import { DigitalTasbihModal } from './components/DigitalTasbihModal';
import { MosqueDirectoryModal } from './components/MosqueDirectoryModal';
import { LegalModal } from './components/LegalModals';
import { QiblaFinderModal } from './components/QiblaFinderModal';
import AdBanner from './components/AdBanner';
import { FeatureDiscoveryTicker } from './components/FeatureDiscoveryTicker';
import { ToastContainer, ToastMessage } from './components/Toast';

import { ShopsView } from './components/ShopsView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { SalahJourneyView } from './components/SalahJourneyView';
import { ProfileView } from './components/ProfileView';
import { MyTokenView } from './components/MyTokenView';
import { MerchantPortalView } from './components/MerchantPortalView';
import { RiderPortalView } from './components/RiderPortalView';
import { NotificationsView } from './components/NotificationsView';
import { CaveCirclesView } from './components/CaveCirclesView';
import { SupportView } from './components/SupportView';
import { CaveMarketView } from './components/CaveMarketView';
import { QuranMajidView } from './components/quran/QuranMajidView';
import { HisnulMuslimView } from './components/hisnulMuslim/HisnulMuslimView';
import { BlogView } from './components/BlogView';
import { TokenRulesView } from './components/TokenRulesView';
import { AllFeaturesView } from './components/AllFeaturesView';
import { evaluateLocationSpoofing } from './utils/antiSpoofing';

// Lightweight Fallback for Lazy Views
const ViewLoadingFallback: React.FC = () => {
  const { language } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-3 py-16">
      <div className="w-10 h-10 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin" />
      <p className="text-xs text-emerald-400 font-medium">
        {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}
      </p>
    </div>
  );
};

const SPLASH_SEEN_KEY = 'cave_splash_shown_session';
const SPLASH_TIME_KEY = 'cave_splash_last_shown_time';

const hasSeenSplashInSession = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    if (sessionStorage.getItem(SPLASH_SEEN_KEY) === 'true') {
      return true;
    }
    const lastShown = localStorage.getItem(SPLASH_TIME_KEY);
    if (lastShown) {
      const elapsed = Date.now() - parseInt(lastShown, 10);
      if (!isNaN(elapsed) && elapsed < 12 * 60 * 60 * 1000) {
        return true;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
};

export default function App() {
  const [isVerifyPath] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.startsWith('/verify/pdf/');
  });

  if (isVerifyPath) {
    return <PDFVerificationView />;
  }

  const { user, isLoading, logout, refreshUser } = useAuth();
  const { language } = useLanguage();

  const getInitialTab = (): ActiveTab => {
    if (typeof window === 'undefined') return 'home';
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    // Explicit admin portal route
    if (path.startsWith('/admin') || hash === '#admin' || hash.startsWith('#admin-')) {
      return 'admin';
    }

    // Explicit CC Delivery Rider portal route
    if (path.startsWith('/rider') || hash === '#rider' || hash.startsWith('#rider-')) {
      return 'rider';
    }

    // Explicit Partner Shop Merchant portal route
    if (path.startsWith('/merchant') || hash === '#merchant' || hash.startsWith('#merchant-')) {
      return 'merchant';
    }
    
    // Specific shop item deep link
    if (hash.startsWith('#shop-')) {
      return 'shops';
    }

    // Explicit Quran or Hisnul Muslim direct route or hash
    if (path === '/quran' || hash === '#quran') {
      return 'quran';
    }
    if (path === '/hisnul-muslim' || hash === '#hisnul_muslim') {
      return 'hisnul_muslim';
    }
    
    // Explicit hash navigation (e.g. #shops, #tokens, #profile)
    if (hash.startsWith('#') && hash.length > 1) {
      const cleanHash = hash.substring(1);
      const validTabs: ActiveTab[] = ['home', 'quran', 'hisnul_muslim', 'tokens', 'shops', 'market', 'profile', 'prayer_journey', 'notifications', 'support', 'merchant', 'rider', 'admin', 'cave_circle', 'token_rules', 'all_features'];
      if (validTabs.includes(cleanHash as ActiveTab)) {
        return cleanHash as ActiveTab;
      }
    }

    // If browser reload (refresh), restore saved user tab from localStorage
    // CRITICAL: Portal tabs ('merchant', 'rider', 'admin') are NEVER restored automatically on root URL reload
    try {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const isReload = navEntry ? navEntry.type === 'reload' : (performance as any).navigation?.type === 1;
      if (isReload) {
        const savedTab = localStorage.getItem('cave_active_tab_current');
        const validUserTabs: ActiveTab[] = ['home', 'quran', 'hisnul_muslim', 'tokens', 'shops', 'market', 'profile', 'prayer_journey', 'notifications', 'support', 'cave_circle', 'all_features'];
        if (savedTab && validUserTabs.includes(savedTab as ActiveTab)) {
          return savedTab as ActiveTab;
        }
      }
    } catch (e) {
      // ignore
    }
    
    // Default root URL route is ALWAYS User-First ('home')
    return 'home';
  };

  // Navigation & Screen states
  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialTab);

  // Sync activeTab with localStorage and URL hash on changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // Do not store portal tabs in cave_active_tab_current to ensure root URL visits remain User-First
      if (['merchant', 'rider', 'admin'].includes(activeTab)) {
        localStorage.removeItem('cave_active_tab_current');
      } else {
        localStorage.setItem('cave_active_tab_current', activeTab);
      }

      if (!window.location.hash.startsWith('#shop-') && !window.location.hash.startsWith('#admin-')) {
        if (activeTab === 'home') {
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        } else {
          window.history.replaceState(null, '', `#${activeTab}`);
        }
      }
    } catch (e) {
      console.warn('Failed to save activeTab state', e);
    }
  }, [activeTab]);
  const [showSplash, setShowSplash] = useState<boolean>(() => !hasSeenSplashInSession());
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Modals
  const [showMosqueModal, setShowMosqueModal] = useState<boolean>(false);
  const [showTasbihModal, setShowTasbihModal] = useState<boolean>(false);
  const [showQiblaModal, setShowQiblaModal] = useState<boolean>(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | 'about' | null>(null);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState<boolean>(false);

  useEffect(() => {
    // Check if the prompt event was already captured globally in index.html
    if ((window as any).deferredPrompt) {
      const evt = (window as any).deferredPrompt;
      setDeferredPrompt(evt);
      setShowInstallPrompt(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
      setShowInstallPrompt(true);
    };

    const handleCustomPromptAvailable = (e: any) => {
      if (e.detail) {
        setDeferredPrompt(e.detail);
        (window as any).deferredPrompt = e.detail;
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-available', handleCustomPromptAvailable as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-available', handleCustomPromptAvailable as EventListener);
    };
  }, []);

  const handleInstallClick = async () => {
    const activePrompt = deferredPrompt || (window as any).deferredPrompt;
    if (!activePrompt) {
      showToast(
        'info', 
        language === 'bn' ? 'ইন্সটল' : 'Install', 
        language === 'bn' 
          ? 'আপনি ব্রাউজারের "Add to Home Screen" বা "Install App" অপশন ব্যবহার করে ইন্সটল করতে পারেন।' 
          : 'You can install using browser "Add to Home Screen" or "Install App".'
      );
      return;
    }

    try {
      // Show the native install prompt
      await activePrompt.prompt();
      // Wait for the user choice
      const choiceResult = await activePrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        showToast(
          'success', 
          language === 'bn' ? 'ইন্সটল সফল' : 'Install Successful', 
          language === 'bn' ? 'অ্যাপটি সফলভাবে ডিভাইসে ইনস্টল করা হয়েছে।' : 'App installed successfully on your device.'
        );
      }
    } catch (err: any) {
      console.error('[PWA] Error triggering install prompt:', err);
    } finally {
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
      setShowInstallPrompt(false);
    }
  };

  // Notifications State
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [actionLoadingPrayerType, setActionLoadingPrayerType] = useState<string | null>(null);

  // Offline Sync State
  const [pendingOfflineItems, setPendingOfflineItems] = useState(offlineSyncService.getPendingCheckIns());
  const [isSyncingOffline, setIsSyncingOffline] = useState(offlineSyncService.getIsSyncing());
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Prayer state
  const [todayStatus, setTodayStatus] = useState<TodayPrayerStatus | null>(null);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loadingPrayers, setLoadingPrayers] = useState<boolean>(true);
  const [randomHadithIndex, setRandomHadithIndex] = useState<number>(0);
  const [nasihaList, setNasihaList] = useState<any[]>([]);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const lastKnownNotifIdRef = useRef<string | null>(null);

  // Request browser notification permission once user is logged in
  useEffect(() => {
    if (user && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, [user]);

  // Fetch notification count & trigger browser push on new messages
  const fetchNotificationCount = useCallback(async () => {
    if (!user) return;
    const token = localStorage.getItem('cave_companions_auth_token');
    if (!token) return;
    try {
      const data = await api.getNotifications(true);
      const newCount = data.unreadCount || 0;
      setUnreadNotificationsCount(newCount);

      if (data.notifications && data.notifications.length > 0) {
        const topNotif = data.notifications[0];
        // If this is a newly arrived unread notification that we haven't seen yet
        if (lastKnownNotifIdRef.current && lastKnownNotifIdRef.current !== topNotif.id && !topNotif.read) {
          // 1. Browser Push Notification (works across tabs and desktop)
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(topNotif.title || 'Cave Circles', {
                body: topNotif.message || 'নতুন সার্কেল বার্তা এসেছে',
                icon: '/favicon.ico'
              });
            } catch (e) {
              console.warn('Browser notification error:', e);
            }
          }

          // 2. In-App Toast Popup Alert
          showToast('info', topNotif.title || 'নতুন বার্তা', topNotif.message || '');
        }
        lastKnownNotifIdRef.current = topNotif.id;
      }
    } catch (err: any) {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      const isNetworkOrTimeout = isOffline || err.isNetworkError || err.isTimeout || (err.message && (
        err.message.includes('নেটওয়ার্ক') || 
        err.message.includes('সংযোগ') || 
        err.message.includes('fetch') || 
        err.message.includes('Failed to fetch') ||
        err.message.includes('NetworkError') ||
        err.message.includes('AbortError') ||
        err.message.includes('timeout')
      ));
      if (isNetworkOrTimeout) {
        console.warn('Network issue fetching notification count:', err);
        return;
      }
      const isAuthOrUserInvalid = (
        err.status === 401 ||
        err.code === 'USER_NOT_FOUND' ||
        err.code === 'UNAUTHORIZED' ||
        err.code === 'INVALID_TOKEN' ||
        (err.message && (
          err.message.includes('USER_NOT_FOUND') ||
          err.message.includes('UNAUTHORIZED') ||
          err.message.includes('INVALID_TOKEN') ||
          err.message.includes('ব্যবহারকারী পাওয়া যায়নি') ||
          err.message.includes('অ্যাকাউন্ট নিষ্ক্রিয়') ||
          err.message.includes('লগইন') ||
          err.message.includes('সেশন')
        ))
      );

      if (isAuthOrUserInvalid) {
        logout();
        return;
      }
      console.error('Failed to fetch notification count:', err);
    }
  }, [user, logout, showToast]);

  // Fetch today's prayer status
  const fetchTodayStatus = useCallback(async () => {
    if (!user) return;
    const token = localStorage.getItem('cave_companions_auth_token');
    if (!token) return;
    try {
      setLoadingPrayers(true);
      const data = await api.getTodayPrayers();
      setTodayStatus(data);
    } catch (err: any) {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      const isNetworkOrTimeout = isOffline || err.isNetworkError || err.isTimeout || (err.message && (
        err.message.includes('নেটওয়ার্ক') || 
        err.message.includes('সংযোগ') || 
        err.message.includes('fetch') || 
        err.message.includes('Failed to fetch') ||
        err.message.includes('NetworkError') ||
        err.message.includes('AbortError') ||
        err.message.includes('timeout')
      ));
      if (isNetworkOrTimeout) {
        console.warn('Network issue fetching today prayers:', err);
        return;
      }
      const isAuthOrUserInvalid = (
        err.status === 401 ||
        err.code === 'USER_NOT_FOUND' ||
        err.code === 'UNAUTHORIZED' ||
        err.code === 'INVALID_TOKEN' ||
        (err.message && (
          err.message.includes('USER_NOT_FOUND') ||
          err.message.includes('UNAUTHORIZED') ||
          err.message.includes('INVALID_TOKEN') ||
          err.message.includes('ব্যবহারকারী পাওয়া যায়নি') ||
          err.message.includes('অ্যাকাউন্ট নিষ্ক্রিয়') ||
          err.message.includes('লগইন') ||
          err.message.includes('সেশন')
        ))
      );

      if (isAuthOrUserInvalid) {
        logout();
        return;
      }
      console.error('Failed to fetch today prayers:', err);
    } finally {
      setLoadingPrayers(false);
    }
  }, [user, logout]);

  // Fetch registered mosques
  const fetchMosques = useCallback(async () => {
    try {
      const data = await api.getMosques();
      if (data && Array.isArray(data.mosques)) {
        setMosques(data.mosques);
        offlineSyncService.cacheMosques(data.mosques);
      }
    } catch (err: any) {
      const cached = offlineSyncService.getCachedMosques();
      if (cached && cached.length > 0) {
        setMosques(cached);
      }
      console.warn('[App] Could not fetch mosques from server, using local cache:', err?.message || err);
    }
  }, []);

  const handleDismissSplash = useCallback(() => {
    setShowSplash(false);
    setActiveTab('home');
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(SPLASH_SEEN_KEY, 'true');
      } catch (e) {}
      try {
        localStorage.setItem(SPLASH_TIME_KEY, Date.now().toString());
      } catch (e) {}
      if (!window.location.pathname.startsWith('/admin') && window.location.pathname !== '/quran') {
        window.history.replaceState(null, '', `/${window.location.search}`);
      }
    }
  }, []);

  const fetchNasiha = useCallback(async () => {
    try {
      const res = await api.getPublicNasihaList();
      if (res && res.success && Array.isArray(res.list) && res.list.length > 0) {
        setNasihaList(res.list);
      }
    } catch (err: any) {
      console.warn('[App] Could not fetch public nasiha:', err?.message || err);
    }
  }, []);

  useEffect(() => {
    if (!showSplash) return;

    // Immediately mark as seen so rapid refresh or returning doesn't re-trigger splash
    try {
      sessionStorage.setItem(SPLASH_SEEN_KEY, 'true');
      localStorage.setItem(SPLASH_TIME_KEY, Date.now().toString());
    } catch (e) {}

    // Show splash screen for a fixed duration on first session startup
    const timer = setTimeout(() => {
      handleDismissSplash();
    }, 2500);

    return () => clearTimeout(timer);
  }, [showSplash, handleDismissSplash]);

  useEffect(() => {
    // Fire API calls immediately in parallel without staggered timeouts
    fetchNasiha();
    
    if (user) {
      Promise.allSettled([
        fetchTodayStatus(),
        fetchMosques(),
        fetchNotificationCount()
      ]);
      setShowAuthModal(false);

      // Periodically check for new circle messages and notifications every 15 seconds
      const notifInterval = setInterval(() => {
        fetchNotificationCount();
      }, 15000);

      return () => clearInterval(notifInterval);
    }
  }, [user, fetchNasiha, fetchTodayStatus, fetchMosques, fetchNotificationCount]);

  // Daily Hadith rotator
  useEffect(() => {
    const dayIndex = new Date().getDate() % HADITHS.length;
    setRandomHadithIndex(dayIndex);
  }, []);

  // Initialize Offline Sync Service
  useEffect(() => {
    offlineSyncService.init(
      () => {
        fetchTodayStatus();
        refreshUser();
      },
      (type, title, msg) => {
        showToast(type, title, msg);
      }
    );

    const updateOfflineStatus = () => {
      setPendingOfflineItems(offlineSyncService.getPendingCheckIns());
      setIsSyncingOffline(offlineSyncService.getIsSyncing());
      setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    };

    window.addEventListener('cave_offline_queue_updated', updateOfflineStatus);
    window.addEventListener('online', updateOfflineStatus);
    window.addEventListener('offline', updateOfflineStatus);

    return () => {
      window.removeEventListener('cave_offline_queue_updated', updateOfflineStatus);
      window.removeEventListener('online', updateOfflineStatus);
      window.removeEventListener('offline', updateOfflineStatus);
    };
  }, [showToast, fetchTodayStatus, refreshUser]);

  // Initialize Prayer Push Reminder Service (local notifications when prayer time starts)
  useEffect(() => {
    prayerReminderService.setInAppReminderCallback((prayerType, nameBn, startTimeStr) => {
      showToast(
        'info',
        `🕌 ${nameBn} সালাতের ওয়াক্ত শুরু হয়েছে`,
        `এখন ${nameBn} সালাতের ওয়াক্ত শুরু হয়েছে (${startTimeStr})। সালাত আদায় করে নিন।`
      );
    });

    prayerReminderService.startScheduler();

    return () => {
      prayerReminderService.stopScheduler();
    };
  }, [showToast]);

  // Global routing, popstate, and hash change navigation listener
  useEffect(() => {
    (window as any).setAppActiveTab = (tab: any) => {
      setActiveTab(tab);
    };

    const handleUrlNavigation = () => {
      const currentTab = getInitialTab();
      setActiveTab(currentTab);
    };

    const handleHashNavigation = () => {
      const hash = window.location.hash;
      if (!hash) return;
      
      if (hash.startsWith('#shop-')) {
        setActiveTab('shops');
      } else {
        handleUrlNavigation();
      }
    };

    window.addEventListener('hashchange', handleHashNavigation);
    window.addEventListener('popstate', handleUrlNavigation);
    
    // Run immediately on mount
    handleUrlNavigation();
    if (
      typeof window !== 'undefined' && 
      !window.location.pathname.startsWith('/admin') && 
      !window.location.pathname.startsWith('/merchant') && 
      !window.location.pathname.startsWith('/rider') && 
      window.location.pathname !== '/' && 
      window.location.pathname !== '/quran'
    ) {
      window.history.replaceState(null, '', `/${window.location.search}`);
    }

    return () => {
      window.removeEventListener('hashchange', handleHashNavigation);
      window.removeEventListener('popstate', handleUrlNavigation);
    };
  }, []);

  // Track user login transition to always default to 'home' upon login
  const userLoggedInRef = useRef<boolean>(!!user);
  useEffect(() => {
    if (!userLoggedInRef.current && user) {
      setActiveTab('home');
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/');
      }
    }
    userLoggedInRef.current = !!user;
  }, [user]);

  // Synchronize activeTab state changes to URL path
  useEffect(() => {
    if (activeTab) {
      const currentPath = window.location.pathname;
      const search = window.location.search;
      let targetPath = '/';
      
      if (activeTab === 'admin') {
        // Let AdminDashboardView handle sub-paths, but ensure we are on /admin...
        if (!currentPath.startsWith('/admin')) {
          targetPath = '/admin/analytics';
        } else {
          return;
        }
      } else if (activeTab === 'rider') {
        targetPath = '/rider';
      } else if (activeTab !== 'home') {
        targetPath = `/${activeTab}`;
      }
      
      if (currentPath !== targetPath) {
        window.history.pushState(null, '', `${targetPath}${search}`);
      }
    }
  }, [activeTab]);

  // User cached location ref with timestamp to prevent repeated GPS requests within 45 seconds
  const lastKnownLocationRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);

  // Stable navigation & modal handlers to preserve React.memo across renders
  const handleOpenMosques = useCallback(() => setShowMosqueModal(true), []);
  const handleOpenNotifications = useCallback(() => setActiveTab('notifications'), []);
  const handleOpenTasbih = useCallback(() => setShowTasbihModal(true), []);
  const handleOpenJourney = useCallback(() => setActiveTab('prayer_journey'), []);
  const handleOpenTokens = useCallback(() => setActiveTab('tokens'), []);
  const handleOpenTokenRules = useCallback(() => setActiveTab('token_rules'), []);
  const handleOpenQibla = useCallback(() => setShowQiblaModal(true), []);
  const handleOpenLegal = useCallback((type: 'privacy' | 'terms' | 'about') => setLegalModalType(type), []);
  const handleNavigateTab = useCallback((tab: string) => setActiveTab(tab as ActiveTab), []);
  const handleLogoutAction = useCallback(() => {
    setActiveTab('home');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/');
    }
    logout();
    showToast(
      'info', 
      language === 'bn' ? 'লগআউট' : 'Logout', 
      language === 'bn' ? 'আপনি সফলভাবে লগআউট করেছেন।' : 'You have logged out successfully.'
    );
  }, [logout, showToast, language]);

  // Handler for 1-Click Salat recording:
  // - User taps "আলহামদুলিল্লাহ, সালাত সম্পন্ন করেছি" ONCE.
  // - Female users: Instant prayer time validation -> save attendance -> small toast.
  // - Male users: Instant prayer time validation -> obtain location (cached/fast) -> auto mosque-radius validation -> save attendance -> small toast.
  // - ZERO modals, ZERO popups, ZERO screens. The user stays on the normal Salat page.
  const handlePrayerAction = useCallback(async (prayer: PrayerInfo) => {
    if (actionLoadingPrayerType) return; // Prevent double tap

    const gender = (user?.gender || 'male').toLowerCase();
    const isFemale = gender === 'female';

    setActionLoadingPrayerType(prayer.type);

    try {
      if (isFemale) {
        // FEMALE FLOW:
        const result = await api.verifyPrayer(prayer.type, {
          mosqueId: 'FEMALE_DIRECT'
        });

        triggerConfettiCelebration();

        showToast(
          'success',
          language === 'bn' ? 'আলহামদুলিল্লাহ!' : 'Alhamdulillah!',
          language === 'bn' ? 'আলহামদুলিল্লাহ! সালাতের রেকর্ড সংরক্ষণ হয়েছে।' : 'Alhamdulillah! Prayer record has been saved.'
        );

        if ((result as any)?.tokenResult?.message) {
          showToast('info', language === 'bn' ? '🪙 টোকেন রিওয়ার্ড' : '🪙 Token Reward', (result as any).tokenResult.message);
        }

        await Promise.allSettled([
          fetchTodayStatus(),
          refreshUser()
        ]);
      } else {
        // MALE FLOW:
        if (!navigator.geolocation) {
          showToast(
            'error', 
            language === 'bn' ? 'লোকেশন প্রয়োজন' : 'Location Required', 
            language === 'bn' ? 'লোকেশন যাচাই করা যাচ্ছে না। Location চালু আছে কিনা দেখুন।' : 'Cannot verify location. Please check if Location is enabled.'
          );
          return;
        }

        let coords: { lat: number; lng: number; accuracy?: number } | null = null;
        let antiSpoofMeta: { isMock?: boolean; spoofSignals?: string[]; sampleVariance?: number } = {};

        try {
          coords = await new Promise<{ lat: number; lng: number; accuracy?: number }>((resolve, reject) => {
            // Attempt 1: High Accuracy with multi-sample jitter & mock verification
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const loc = { 
                  lat: pos.coords.latitude, 
                  lng: pos.coords.longitude,
                  accuracy: pos.coords.accuracy
                };

                // Rapid second sample (350ms later) to verify hardware satellite micro-jitter
                setTimeout(() => {
                  navigator.geolocation.getCurrentPosition(
                    (pos2) => {
                      const prevCheck = lastKnownLocationRef.current
                        ? { lat: lastKnownLocationRef.current.lat, lng: lastKnownLocationRef.current.lng, timestamp: lastKnownLocationRef.current.timestamp }
                        : null;
                      const spoofCheck = evaluateLocationSpoofing(pos, pos2, prevCheck);

                      if (spoofCheck.isSpoofed) {
                        reject(new Error(
                          language === 'bn'
                            ? 'নিরাপত্তা সতর্কতা: ডিভাইসে ফেক জিপিএস (Fake GPS) বা মক লোকেশন সনাক্ত হয়েছে। অনুগ্রহ করে ফেক জিপিএস বন্ধ করে আসল জিপিএস নিয়ে মসজিদে উপস্থিত হয়ে সালাত ভেরিফাই করুন।'
                            : 'Security Alert: Fake GPS or Mock Location detected. Please disable Fake GPS and verify presence with genuine GPS.'
                        ));
                        return;
                      }

                      antiSpoofMeta = {
                        isMock: spoofCheck.isMockProvider,
                        spoofSignals: spoofCheck.reasons,
                        sampleVariance: spoofCheck.sampleVariance
                      };

                      lastKnownLocationRef.current = { lat: loc.lat, lng: loc.lng, timestamp: Date.now() };
                      resolve(loc);
                    },
                    () => {
                      // If second sample fails, evaluate single sample
                      const singleCheck = evaluateLocationSpoofing(pos, null, null);
                      if (singleCheck.isSpoofed) {
                        reject(new Error(
                          language === 'bn'
                            ? 'নিরাপত্তা সতর্কতা: ডিভাইসে ফেক জিপিএস বা মক লোকেশন সনাক্ত হয়েছে।'
                            : 'Security Alert: Fake GPS or Mock Location detected.'
                        ));
                        return;
                      }
                      antiSpoofMeta = {
                        isMock: singleCheck.isMockProvider,
                        spoofSignals: singleCheck.reasons,
                        sampleVariance: 0
                      };
                      lastKnownLocationRef.current = { lat: loc.lat, lng: loc.lng, timestamp: Date.now() };
                      resolve(loc);
                    },
                    { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 }
                  );
                }, 350);
              },
              (geoErr) => {
                console.warn('[GPS High-Accuracy failed, attempting Low-Accuracy fallback]', geoErr);
                
                // Attempt 2: Low accuracy (Wi-Fi/Cellular/IP) - fast and works indoors!
                navigator.geolocation.getCurrentPosition(
                  (pos2) => {
                    const loc2 = {
                      lat: pos2.coords.latitude,
                      lng: pos2.coords.longitude,
                      accuracy: pos2.coords.accuracy
                    };
                    const lowCheck = evaluateLocationSpoofing(pos2, null, null);
                    if (lowCheck.isSpoofed) {
                      reject(new Error(
                        language === 'bn'
                          ? 'নিরাপত্তা সতর্কতা: ফেক জিপিএস সনাক্ত হয়েছে।'
                          : 'Security Alert: Fake GPS detected.'
                      ));
                      return;
                    }
                    antiSpoofMeta = {
                      isMock: lowCheck.isMockProvider,
                      spoofSignals: lowCheck.reasons,
                      sampleVariance: 0
                    };
                    lastKnownLocationRef.current = { lat: loc2.lat, lng: loc2.lng, timestamp: Date.now() };
                    resolve(loc2);
                  },
                  (geoErr2) => {
                    console.warn('[GPS Low-Accuracy failed, checking fresh memory cache]', geoErr2);
                    
                    // Fallback 1: Fresh Memory cache (lastKnownLocationRef) within the last 3 minutes (180,000 ms)
                    if (lastKnownLocationRef.current && (Date.now() - lastKnownLocationRef.current.timestamp) < 180000) {
                      resolve({
                        lat: lastKnownLocationRef.current.lat,
                        lng: lastKnownLocationRef.current.lng,
                        accuracy: 150
                      });
                      return;
                    }

                    // DO NOT fallback to localStorage for attendance verification.
                    // Instead, construct a precise helpful error message based on HTML5 specifications
                    let finalMsg = '';
                    const errCode = geoErr2.code ?? geoErr.code;
                    
                    if (errCode === 1) { // PERMISSION_DENIED
                      finalMsg = language === 'bn' 
                        ? 'লোকেশন পারমিশন বন্ধ আছে। অনুগ্রহ করে আপনার ব্রাউজার ও ফোনের সেটিংস থেকে লোকেশন পারমিশন চালু করুন।' 
                        : 'Location permission is denied. Please enable location permission in your browser and phone settings.';
                    } else if (errCode === 2) { // POSITION_UNAVAILABLE
                      finalMsg = language === 'bn' 
                        ? 'আপনার ডিভাইসের জিপিএস (GPS) বা লোকেশন সার্ভিস বন্ধ রয়েছে। অনুগ্রহ করে ফোনের নোটিফিকেশন বার বা সেটিংস থেকে লোকেশন/GPS চালু করুন এবং পুনরায় চেষ্টা করুন।' 
                        : 'Your device GPS/Location service is turned off. Please turn on Location/GPS from your phone settings and try again.';
                    } else if (errCode === 3) { // TIMEOUT
                      finalMsg = language === 'bn' 
                        ? 'লোকেশন সিগন্যাল পেতে সময় বেশি লেগেছে। অনুগ্রহ করে খোলা জায়গায় বা জানালার কাছে এসে পুনরায় চেষ্টা করুন।' 
                        : 'Location request timed out. Please move near a window or an open space and try again.';
                    } else {
                      finalMsg = language === 'bn' 
                        ? 'আপনার ফোনের জিপিএস (GPS) বা লোকেশন সার্ভিস বন্ধ রয়েছে। অনুগ্রহ করে ফোনের নোটিফিকেশন বার বা সেটিংস থেকে লোকেশন/GPS চালু করুন।' 
                        : 'Your device location service is unavailable. Please make sure GPS is turned on and try again.';
                    }
                    
                    reject(new Error(finalMsg));
                  },
                  {
                    enableHighAccuracy: false,
                    timeout: 8000,
                    maximumAge: 60000
                  }
                );
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 20000
              }
            );
          });
        } catch (gpsError: any) {
          showToast(
            'error', 
            language === 'bn' ? 'লোকেশন যাচাই সমস্যা' : 'Location Verification Error', 
            gpsError.message
          );
          return;
        }

        if (!coords) {
          showToast(
            'error', 
            language === 'bn' ? 'লোকেশন প্রয়োজন' : 'Location Required', 
            language === 'bn' ? 'লোকেশন যাচাই করা যাচ্ছে না। দয়া করে ফোনের জিপিএস (GPS) সচল আছে কিনা দেখুন।' : 'Cannot verify location. Please make sure your device GPS is enabled.'
          );
          return;
        }

        const result = await api.verifyPrayer(prayer.type, {
          lat: coords.lat,
          lng: coords.lng,
          accuracy: coords.accuracy,
          isMock: antiSpoofMeta.isMock,
          spoofSignals: antiSpoofMeta.spoofSignals,
          sampleVariance: antiSpoofMeta.sampleVariance
        });

        triggerConfettiCelebration();

        showToast(
          'success',
          language === 'bn' ? 'আলহামদুলিল্লাহ!' : 'Alhamdulillah!',
          language === 'bn' ? 'আলহামদুলিল্লাহ! সালাতের রেকর্ড সংরক্ষণ হয়েছে।' : 'Alhamdulillah! Prayer record has been saved.'
        );

        if ((result as any)?.tokenResult?.message) {
          showToast('info', language === 'bn' ? '🪙 টোকেন রিওয়ার্ড' : '🪙 Token Reward', (result as any).tokenResult.message);
        }

        await Promise.allSettled([
          fetchTodayStatus(),
          refreshUser()
        ]);
      }
    } catch (err: any) {
      const msg = err.message || (language === 'bn' ? 'সালাতের রেকর্ড সংরক্ষণ করা সম্ভব হয়নি।' : 'Could not save prayer record.');
      showToast('error', language === 'bn' ? 'যাচাই ব্যর্থ' : 'Verification Failed', msg);
    } finally {
      setActionLoadingPrayerType(null);
    }
  }, [actionLoadingPrayerType, user, showToast, fetchTodayStatus, refreshUser, language]);

  // Show Splash Screen first on fresh session startup
  if (showSplash) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <SplashScreen
          onStart={handleDismissSplash}
        />
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium text-emerald-300">
          {language === 'bn' ? 'কেভ কম্প্যানিয়ন্স লোড হচ্ছে...' : 'Loading Cave Companions...'}
        </p>
      </div>
    );
  }

  // Full-screen portals (Admin, Merchant, Rider) - must take 100% viewport width without mobile shell constraints
  if (activeTab === 'admin') {
    return (
      <div className="h-screen w-full bg-[#090d16] text-slate-100 flex flex-col selection:bg-emerald-600 selection:text-white overflow-hidden">
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <AdminDashboardView
          onBack={() => {
            setActiveTab('home');
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', '/');
            }
          }}
          onShowToast={showToast}
        />
      </div>
    );
  }

  if (activeTab === 'merchant') {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-600 selection:text-white">
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <MerchantPortalView
          onShowToast={showToast}
          onExitMerchant={() => {
            setActiveTab('home');
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', '/');
            }
          }}
        />
      </div>
    );
  }

  if (activeTab === 'rider') {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-600 selection:text-white">
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <RiderPortalView
          onShowToast={showToast}
          onExitRider={() => {
            setActiveTab('home');
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', '/');
            }
          }}
        />
      </div>
    );
  }

  // Not logged in: Show Auth Screen
  if (!user) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <AuthScreen
          onSuccess={() => {
            setActiveTab('home');
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', '/');
            }
            showToast(
              'success', 
              language === 'bn' ? 'স্বাগতম' : 'Welcome', 
              language === 'bn' ? 'সফলভাবে লগইন সম্পন্ন হয়েছে!' : 'Logged in successfully!'
            );
          }}
          onOpenMerchantLogin={() => {
            setActiveTab('merchant');
          }}
          onOpenRiderLogin={() => {
            setActiveTab('rider');
          }}
        />
      </>
    );
  }

  const todayDateStr = todayStatus ? todayStatus.date : new Date().toISOString().split('T')[0];
  const completedCount = todayStatus ? todayStatus.completedCount : 0;

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-app)] flex flex-col selection:bg-emerald-600 selection:text-white pb-16">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Top Header */}
      {activeTab === 'home' && (
        <Header
          onOpenNotifications={handleOpenNotifications}
          unreadNotificationsCount={unreadNotificationsCount}
          showInstallPrompt={showInstallPrompt}
          onInstallClick={handleInstallClick}
          onOpenTasbih={handleOpenTasbih}
        />
      )}

      {/* Main Content Area */}
      <main className={`flex-1 w-full ${activeTab === 'cave_circle' || activeTab === 'notifications' ? 'max-w-4xl px-1 sm:px-2' : 'max-w-2xl px-1 sm:px-3'} mx-auto pb-5 ${activeTab === 'home' ? 'pt-1.5' : 'pt-2.5 sm:pt-4'}`}>
        {/* Tab 1: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-3 sm:space-y-3.5">
            <AdBanner pageName="HOME" placementSlot="TOP" />
            
            {/* Daily Progress Counter Card with Built-In Arc Countdown Timer */}
            <DailyProgressCard
              todayStatus={todayStatus}
              completedCount={completedCount}
              totalPrayers={5}
              dateStr={todayDateStr}
              userDistrict={user?.district}
              userGender={user?.gender}
              onOpenJourney={handleOpenJourney}
              onOpenTokens={handleOpenTokens}
              onOpenTokenRules={handleOpenTokenRules}
            />

            <AdBanner pageName="HOME" placementSlot="BEFORE_PRODUCTS" />

            {/* Offline Sync Banner (Visible when offline, syncing, or when offline items are pending) */}
            {(pendingOfflineItems.length > 0 || isSyncingOffline || !isOnline) && (
              <div className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-xs ${
                isSyncingOffline
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                  : !isOnline
                  ? 'bg-slate-800/10 border-slate-700/30 text-slate-800 dark:text-slate-200'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    isSyncingOffline
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      : !isOnline
                      ? 'bg-slate-500/20 text-slate-600 dark:text-slate-400'
                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {isSyncingOffline ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : !isOnline ? (
                      <WifiOff className="w-4 h-4" />
                    ) : (
                      <CloudUpload className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold leading-tight truncate">
                      {isSyncingOffline
                        ? (language === 'bn' ? 'সার্ভারের সাথে সিঙ্ক হচ্ছে...' : 'Syncing with server...')
                        : !isOnline
                        ? (language === 'bn' 
                            ? `ডিভাইস অফলাইনে আছে (${toBnNumber(pendingOfflineItems.length)}টি পেন্ডিং)` 
                            : `Device is offline (${pendingOfflineItems.length} pending)`)
                        : (language === 'bn' 
                            ? `অফলাইনে সংরক্ষিত চেক-ইন: ${toBnNumber(pendingOfflineItems.length)}টি` 
                            : `Offline saved check-ins: ${pendingOfflineItems.length}`)}
                    </h4>
                    <p className="text-[11px] opacity-80 mt-0.5 leading-snug">
                      {isSyncingOffline
                        ? (language === 'bn' ? 'অনুগ্রহ করে অপেক্ষা করুন, সার্ভারে উপস্থিতি যাচাই করা হচ্ছে' : 'Please wait, verifying attendance on server')
                        : !isOnline
                        ? (language === 'bn' ? 'ইন্টারনেট সংযোগ ফিরলে স্বয়ংক্রিয়ভাবে সার্ভারের সাথে সিঙ্ক হবে' : 'Will automatically sync once internet is restored')
                        : (language === 'bn' ? 'ইন্টারনেট চালু হয়েছে। সবগুলো চেক-ইন সার্ভারে পাঠাতে সিঙ্ক করুন' : 'Internet restored. Sync to submit all check-ins')}
                    </p>
                  </div>
                </div>

                {isOnline && !isSyncingOffline && pendingOfflineItems.length > 0 && (
                  <button
                    onClick={() => offlineSyncService.syncPendingCheckIns(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 transition cursor-pointer shadow-xs active:scale-95 flex items-center gap-1"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'সিঙ্ক করুন' : 'Sync Now'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Quick Features Grid */}

            {/* Five Daily Prayers Section */}
            <CompactPrayersCard
              todayStatus={todayStatus}
              userDistrict={user?.district}
              userGender={user?.gender}
              onCompletePrayer={handlePrayerAction}
              actionLoadingPrayerType={actionLoadingPrayerType}
              onShowToast={showToast}
              todayDateStr={todayDateStr}
            />

            {/* Feature Discovery Auto-Rotating Card */}
            <FeatureDiscoveryTicker
              onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)}
              onOpenQibla={handleOpenQibla}
              onOpenMosques={() => setShowMosqueModal(true)}
            />

            <AdBanner pageName="HOME" placementSlot="MIDDLE" />

            {/* Sahri and Iftar Timetable Card (Salafi Principles, GPS-based) */}
            <SehriIftarCard userDistrict={user?.district} onShowToast={showToast} />

            {/* Daily Nasiha Inspiration Card */}
            <DailyNasihaCard
              nasihaList={nasihaList}
              randomHadithIndex={randomHadithIndex}
            />

            <AdBanner pageName="HOME" placementSlot="BOTTOM" />
          </div>
        )}

        {/* Tab 2: MY TOKENS (Phase 4 & 5) */}
        {activeTab === 'tokens' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <MyTokenView
              onShowToast={showToast}
              onNavigateToHome={() => setActiveTab('home')}
              onNavigateToShops={() => setActiveTab('shops')}
            />
          </React.Suspense>
        )}

        {/* Tab 3: SHOPS (Phase 6) */}
        {activeTab === 'shops' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <ShopsView
              onShowToast={showToast}
              onNavigateToTokens={() => setActiveTab('tokens')}
              onNavigateToMerchant={() => setActiveTab('merchant')}
            />
          </React.Suspense>
        )}

        {/* Tab 3.5: CAVE MARKET */}
        {activeTab === 'market' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <CaveMarketView />
          </React.Suspense>
        )}

        {/* Tab 5: PROFILE */}
        {activeTab === 'profile' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <ProfileView
              onLogout={handleLogoutAction}
              onShowToast={showToast}
              onNavigateTab={handleNavigateTab}
              onOpenTasbih={handleOpenTasbih}
              onOpenQibla={handleOpenQibla}
              onOpenLegal={handleOpenLegal}
              onOpenMosques={handleOpenMosques}
            />
          </React.Suspense>
        )}

        {/* Tab 5.5: QURAN MAJID MODULE */}
        {activeTab === 'quran' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <QuranMajidView
              onBack={() => setActiveTab('profile')}
              onShowToast={(msg, type) => showToast(type, language === 'bn' ? 'কুরআন মাজীদ' : 'Quran Majeed', msg)}
            />
          </React.Suspense>
        )}

        {/* Tab 5.6: HISNUL MUSLIM MODULE */}
        {activeTab === 'hisnul_muslim' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <HisnulMuslimView
              onBack={() => setActiveTab('profile')}
              onShowToast={(msg, type) => showToast(type, language === 'bn' ? 'হিসনুল মুসলিম' : 'Hisnul Muslim', msg)}
            />
          </React.Suspense>
        )}

        {/* Tab 5.7: CAVE CIRCLES MODULE */}
        {activeTab === 'cave_circle' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <CaveCirclesView
              onBack={() => setActiveTab('profile')}
              onShowToast={showToast}
            />
          </React.Suspense>
        )}

        {/* Tab 6: NOTIFICATIONS (Phase 8) */}
        {activeTab === 'notifications' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <NotificationsView
              onBack={() => setActiveTab('home')}
              onNavigateToCircles={() => setActiveTab('cave_circle')}
              onShowToast={showToast}
              onNotificationReadChange={count => setUnreadNotificationsCount(count)}
            />
          </React.Suspense>
        )}

        {/* Tab: BLOG */}
        {activeTab === 'blog' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <BlogView onBack={() => setActiveTab('profile')} />
          </React.Suspense>
        )}

        {/* Tab 7: SALAH JOURNEY & GROWTH (Dedicated Full-Screen View) */}
        {(activeTab === 'prayer_journey' || activeTab === 'prayer_history' || activeTab === 'history') && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <SalahJourneyView
              onBack={() => setActiveTab('home')}
              onShowToast={showToast}
            />
          </React.Suspense>
        )}

        {/* Tab 7.5: TOKEN EARNING RULES & GUIDELINES (Dedicated Full-Screen View) */}
        {activeTab === 'token_rules' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <TokenRulesView
              onBack={() => setActiveTab('home')}
              onNavigateToTokens={() => setActiveTab('tokens')}
              onNavigateToShops={() => setActiveTab('shops')}
            />
          </React.Suspense>
        )}

        {/* Tab 8: HELP & SUPPORT (Phase 8) */}
        {activeTab === 'support' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <SupportView
              onBack={() => setActiveTab('profile')}
              onShowToast={showToast}
              onNavigate={(tab) => setActiveTab(tab as any)}
            />
          </React.Suspense>
        )}

        {/* Tab 9: ALL FEATURES & TOOLS HUB */}
        {activeTab === 'all_features' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <AllFeaturesView
              onBack={() => setActiveTab('profile')}
              onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)}
              onOpenQibla={handleOpenQibla}
              onOpenTasbih={handleOpenTasbih}
              onOpenMosques={() => setShowMosqueModal(true)}
              onShowToast={showToast}
            />
          </React.Suspense>
        )}
      </main>

      {/* Bottom Navigation */}
      {['home', 'tokens', 'shops', 'market', 'profile'].includes(activeTab) && (
        <BottomNav
          activeTab={activeTab as any}
          onChangeTab={setActiveTab}
        />
      )}

      {/* Dynamic Modals loaded in Suspense */}
      <React.Suspense fallback={null}>
        {/* Legal Policy & Terms Modal */}
        {legalModalType && (
          <LegalModal
            isOpen={!!legalModalType}
            type={legalModalType}
            onClose={() => setLegalModalType(null)}
          />
        )}

        {/* Mosque Directory Modal */}
        {showMosqueModal && (
          <MosqueDirectoryModal
            onClose={() => setShowMosqueModal(false)}
          />
        )}

        {/* Digital Tasbih Modal */}
        {showTasbihModal && (
          <DigitalTasbihModal
            isOpen={showTasbihModal}
            onClose={() => setShowTasbihModal(false)}
            onShowToast={(msg, t) => showToast(t, language === 'bn' ? 'তাসবীহ' : 'Digital Tasbih', msg)}
          />
        )}

        {/* Qibla Finder Modal */}
        {showQiblaModal && (
          <QiblaFinderModal
            isOpen={showQiblaModal}
            onClose={() => setShowQiblaModal(false)}
            userDistrict={user?.district || ''}
            onShowToast={showToast}
          />
        )}
      </React.Suspense>
    </div>
  );
}
