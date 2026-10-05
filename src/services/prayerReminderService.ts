import { PrayerType } from '../types';
import { getTodayPrayerOrder } from '../data/prayerConfig';
import {
  calculatePrayerTimes,
  getSavedOrGpsLocation,
  LocationCoords,
  LocationPrayerTimes
} from './prayerTimeService';
import { audioNotificationService, SoundType } from './audioNotificationService';

export interface PrayerReminderSettings {
  enabled: boolean;
  soundEnabled: boolean;
  soundType: SoundType;
  reminderMinutesBefore: number; // 0 (exact time), 5, 10, 15
  vibrationEnabled: boolean;
  prayers: Record<PrayerType, boolean>;
  userDistrict?: string;
  locationCoords?: LocationCoords | null;
}

const STORAGE_KEY = 'prayer_reminder_settings';

const DEFAULT_SETTINGS: PrayerReminderSettings = {
  enabled: true,
  soundEnabled: false, // শব্দবিহীন (Silent) নোটিফিকেশন
  soundType: 'adhan_chime',
  reminderMinutesBefore: 0,
  vibrationEnabled: true,
  prayers: {
    fajr: true,
    dhuhr: true,
    jumuah: true,
    asr: true,
    maghrib: true,
    isha: true
  }
};

class PrayerReminderService {
  private settings: PrayerReminderSettings;
  private timerId: any = null;
  private currentPrayerTimes: LocationPrayerTimes | null = null;
  private currentLocation: LocationCoords | null = null;
  private onInAppReminderCallback: ((prayerType: PrayerType, nameBn: string, startTimeStr: string, isEarlyReminder?: boolean) => void) | null = null;

  constructor() {
    this.settings = this.loadSettings();
    this.initServiceWorker();
  }

  public loadSettings(): PrayerReminderSettings {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed, reminderMinutesBefore: 0 };
      }
    } catch (e) {
      console.error('Failed to parse prayer reminder settings:', e);
    }
    return DEFAULT_SETTINGS;
  }

  public saveSettings(newSettings: Partial<PrayerReminderSettings>): PrayerReminderSettings {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save prayer reminder settings:', e);
    }
    this.updateLocationAndTimes();
    this.syncScheduleWithServiceWorker();
    return this.settings;
  }

  public getSettings(): PrayerReminderSettings {
    return { ...this.settings };
  }

  public setInAppReminderCallback(cb: (prayerType: PrayerType, nameBn: string, startTimeStr: string, isEarlyReminder?: boolean) => void) {
    this.onInAppReminderCallback = cb;
  }

  private async initServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        // If Periodic Sync is supported in modern browsers, register prayer check
        if ('periodicSync' in reg) {
          try {
            await (reg as any).periodicSync.register('cave-prayer-sync', {
              minInterval: 15 * 60 * 1000 // 15 minutes
            });
          } catch (pe) {
            // Periodic sync permission not granted or not supported
          }
        }
      } catch (e) {
        console.warn('Service worker registration failed:', e);
      }
    }
  }

  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support desktop notifications');
      return 'denied';
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.initServiceWorker();
      }
      return permission;
    } catch (e) {
      console.error('Error requesting notification permission:', e);
      return 'denied';
    }
  }

  public getNotificationPermission(): NotificationPermission {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
  }

  /**
   * Start background scheduler that checks prayer times every 20 seconds
   */
  public async startScheduler() {
    this.stopScheduler();
    await this.updateLocationAndTimes();

    // Check every 20 seconds for precise prayer alerts
    this.timerId = setInterval(() => {
      this.checkAndTriggerReminders();
    }, 20000);

    // Initial check right away
    this.checkAndTriggerReminders();
    this.syncScheduleWithServiceWorker();
  }

  public stopScheduler() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public async updateLocationAndTimes(userDistrict?: string): Promise<{ location: LocationCoords; times: LocationPrayerTimes }> {
    const coords = await getSavedOrGpsLocation(userDistrict || this.settings.userDistrict);
    this.currentLocation = coords;
    const times = await calculatePrayerTimes(coords, new Date());
    this.currentPrayerTimes = times;
    return { location: coords, times };
  }

  public getCurrentLocationAndTimes(): { location: LocationCoords | null; times: LocationPrayerTimes | null } {
    return {
      location: this.currentLocation,
      times: this.currentPrayerTimes
    };
  }

  /**
   * Dispatch schedule to Service Worker for background caching and offline notifications
   */
  private syncScheduleWithServiceWorker() {
    if (!this.settings.enabled || !this.currentPrayerTimes) return;
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const schedule = Object.entries(this.currentPrayerTimes).map(([type, info]) => ({
        type,
        nameBn: info.nameBn,
        startTime: info.startTime.toISOString(),
        formattedTimeBn: info.formattedTimeBn
      }));

      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_PRAYER_SCHEDULE',
        schedule,
        settings: this.settings
      });
    }
  }

  /**
   * Main check function that fires notifications right when prayer time starts or beforehand
   */
  private checkAndTriggerReminders() {
    if (!this.settings.enabled || !this.currentPrayerTimes) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const prayers: PrayerType[] = getTodayPrayerOrder(now);

    prayers.forEach(prayer => {
      // Check if user enabled reminder for this specific prayer
      const isEnabled = prayer === 'jumuah' ? (this.settings.prayers['dhuhr'] ?? true) : this.settings.prayers[prayer];
      if (!isEnabled) return;

      const info = this.currentPrayerTimes![prayer];
      if (!info) return;

      const targetTime = info.startTime.getTime();
      const nowTime = now.getTime();
      const diffMinutes = (nowTime - targetTime) / (1000 * 60);

      // 1. Check exact prayer start time (within [0, 4] minutes after start time)
      const exactNotifiedKey = `prayer_notified_exact_${prayer}_${todayStr}`;
      if (diffMinutes >= 0 && diffMinutes <= 4 && !localStorage.getItem(exactNotifiedKey)) {
        localStorage.setItem(exactNotifiedKey, 'true');
        this.triggerReminderNotification(info, false);
      }

      // 2. Check early reminder if configured (e.g. 10 minutes before)
      if (this.settings.reminderMinutesBefore > 0) {
        const earlyNotifiedKey = `prayer_notified_early_${prayer}_${todayStr}`;
        const minutesBefore = -diffMinutes; // positive when in the future
        if (
          minutesBefore >= this.settings.reminderMinutesBefore - 1.5 &&
          minutesBefore <= this.settings.reminderMinutesBefore + 1.5 &&
          !localStorage.getItem(earlyNotifiedKey)
        ) {
          localStorage.setItem(earlyNotifiedKey, 'true');
          this.triggerReminderNotification(info, true);
        }
      }
    });
  }

  public triggerReminderNotification(
    info: { type: PrayerType; nameBn: string; nameEn: string; startTime: Date; formattedTimeBn: string },
    isEarlyReminder: boolean = false
  ) {
    const locationStr = this.currentLocation?.locationName ? ` (${this.currentLocation.locationName})` : '';
    
    let title = `🕌 ${info.nameBn} সালাতের ওয়াক্ত শুরু হয়েছে`;
    let body = `আপনার লোকেশন${locationStr} অনুযায়ী এখন ${info.nameBn} সালাতের ওয়াক্ত হয়েছে (${info.formattedTimeBn})। জামাতে সালাত আদায় করে নিন।`;

    if (isEarlyReminder) {
      title = `⏳ ${info.nameBn} সালাতের ওয়াক্ত আসন্ন (${this.settings.reminderMinutesBefore} মিনিট পর)`;
      body = `${info.nameBn} সালাতের ওয়াক্ত শুরু হতে ${this.settings.reminderMinutesBefore} মিনিট বাকি (${info.formattedTimeBn})। ওযু করে প্রস্ততি নিন।`;
    }

    // 1. Silent Notification (No audio played)
    // Audio alert disabled as requested for complete silent notifications

    // 2. Send Web Notification / Service Worker Notification (Silent by default)
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notificationOptions: any = {
          body,
          icon: '/app_icon.jpg',
          badge: '/app_icon.jpg',
          silent: !this.settings.soundEnabled, // শব্দবিহীন নোটিফিকেশন
          vibrate: this.settings.vibrationEnabled ? [200, 100, 200] : undefined,
          tag: `prayer-${info.type}-${isEarlyReminder ? 'early' : 'exact'}`,
          renotify: true,
          data: { url: '/', prayerType: info.type }
        };

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, notificationOptions);
          });
        } else {
          new Notification(title, notificationOptions);
        }
      } catch (e) {
        console.error('Browser push notification error:', e);
      }
    }

    // 3. Trigger In-App UI Toast Callback
    if (this.onInAppReminderCallback) {
      this.onInAppReminderCallback(info.type, info.nameBn, info.formattedTimeBn, isEarlyReminder);
    }
  }

  /**
   * Send test silent notification for user verification
   */
  public testReminder(): boolean {
    const testInfo = {
      type: 'dhuhr' as PrayerType,
      nameBn: 'যোহর',
      nameEn: 'Dhuhr',
      startTime: new Date(),
      formattedTimeBn: '১২:১৫ PM'
    };

    this.triggerReminderNotification(testInfo, false);
    return true;
  }
}

export const prayerReminderService = new PrayerReminderService();
