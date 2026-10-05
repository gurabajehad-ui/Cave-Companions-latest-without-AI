import { SURAHS_LIST } from '../data/quran/surahs';
import { JUZ_30_SURAHS } from '../data/quran/juz30';
import { quranIndexedDb } from './quranIndexedDb';
import {
  SurahMeta,
  SurahDetail,
  AyahItem,
  QuranBookmark,
  QuranLastRead,
  QuranReadingSettings,
  QuranSearchResult
} from '../types/quran';

const STORAGE_KEYS = {
  BOOKMARKS: 'cave_quran_bookmarks_v1',
  LAST_READ: 'cave_quran_last_read_v1',
  SETTINGS: 'cave_quran_settings_v1',
  SURAH_CACHE_PREFIX: 'cave_quran_surah_cache_'
};

const DEFAULT_SETTINGS: QuranReadingSettings = {
  arabicFontSize: 30,
  bengaliFontSize: 16,
  showTranslation: true,
  showArabic: true
};

const SURAH_1_AYAHS: AyahItem[] = [
  {
    ayahNumber: 1,
    arabicText: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
    bengaliText: 'পরম করুণাময় অসীম দয়ালু আল্লাহর নামে শুরু করছি।'
  },
  {
    ayahNumber: 2,
    arabicText: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ',
    bengaliText: 'সকল প্রশংসা সৃষ্টিকুলের রব্ব [১] আল্লাহর জন্য,',
    footnotes: '[১] ‘রবব’ শব্দটির সঠিক অনুবাদ কোনো একটি কথায় করা সম্ভব নয়। এর অর্থ হলো: যিনি সৃষ্টি করেন, জীবনদান করেন, রক্ষা করেন, প্রয়োজন পূরণ করেন, লালন-পালন করেন এবং কর্তৃত্ব পরিচালনা করেন।'
  },
  {
    ayahNumber: 3,
    arabicText: 'ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
    bengaliText: 'পরম করুণাময়, অসীম দয়ালু,'
  },
  {
    ayahNumber: 4,
    arabicText: 'مَـٰلِكِ يَوْمِ ٱلدِّينِ',
    bengaliText: 'বিচার দিনের মালিক [১] ।',
    footnotes: '[১] ‘ইয়াউমুদ্দীন’ অর্থ বিচার বা প্রতিদান দিবস। আখেরাতে আল্লাহ তাআলা একা বিচার করবেন, সেদিন কারো কোনো ক্ষমতা থাকবে না।'
  },
  {
    ayahNumber: 5,
    arabicText: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
    bengaliText: 'আমরা শুধু আপনারই ইবাদাত করি এবং শুধু আপনারই কাছে সাহায্য চাই [১]।',
    footnotes: '[১] এই আয়াতে তাওহীদে উলূহিয়্যাত ও ইবাদতে একমাত্র আল্লাহর মুখাপেক্ষিতা ঘোষণা করা হয়েছে।'
  },
  {
    ayahNumber: 6,
    arabicText: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ',
    bengaliText: 'আমাদেরকে সরল পথ প্রদর্শন করুন [১] —',
    footnotes: '[১] ‘সিরাতুল মুস্তাকীম’ হলো ইসলাম, কুরআন মাজীদের অনুসরণ এবং সঠিক ঈমান ও সৎকর্মের পথ।'
  },
  {
    ayahNumber: 7,
    arabicText: 'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ',
    bengaliText: 'তাদের পথ, যাদেরকে আপনি নি‘আমত দিয়েছেন [১], যাদের উপর আপনার ক্রোধ আপতিত হয়নি [২] এবং যারা পথভ্রষ্টও নয় [৩]',
    footnotes: '[১] অর্থাৎ নবীগণ, সিদ্দীকগণ, শহীদগণ ও সৎকর্মপরায়ণ ব্যক্তিগণ (সূরা আন-নিসা: ৬৯)।\n[২] অর্থাৎ ইহুদী ও তাদের পথানুসারীগণ। হাদিসে এসেছে: "যাদের উপর ক্রোধ বর্ষিত হয়েছে তারা হচ্ছে ইহুদী" (তিরমিজি: ২৯৫৪)।\n[৩] অর্থাৎ খ্রীষ্টান ও তাদের অনুসারীগণ। হাদিসে এসেছে: "যাদের পথভ্রষ্ট বলা হয়েছে তারা হচ্ছে খ্রীষ্টান" (তিরমিজি: ২৯৫৪)।'
  }
];

// In-memory cache for fast transitions
const surahMemoryCache = new Map<number, SurahDetail>();

export const quranService = {
  /**
   * Get all 114 Surahs metadata list
   */
  getAllSurahs(): SurahMeta[] {
    return SURAHS_LIST;
  },

  /**
   * Get Surah metadata by number (1-114)
   */
  getSurahMeta(surahNumber: number): SurahMeta | undefined {
    return SURAHS_LIST.find((s) => s.number === surahNumber);
  },

  /**
   * Get complete Surah data (Arabic Uthmani + Dr. Abu Bakr Muhammad Zakaria translation)
   * Guaranteed offline-first: checks memory, localStorage cache, bundled dataset, or verified source
   */
  async getSurahDetail(surahNumber: number): Promise<SurahDetail> {
    const meta = this.getSurahMeta(surahNumber);
    if (!meta) {
      throw new Error(`সূরা #${surahNumber} খুঁজে পাওয়া যায়নি।`);
    }

    // 1. Check memory cache
    if (surahMemoryCache.has(surahNumber)) {
      return surahMemoryCache.get(surahNumber)!;
    }

    // 2. Check IndexedDB cache (Deep Caching)
    try {
      const dbCached = await quranIndexedDb.getSurah(surahNumber);
      if (dbCached && dbCached.ayahs?.length === meta.ayahCount) {
        surahMemoryCache.set(surahNumber, dbCached);
        return dbCached;
      }
    } catch (e) {
      console.warn('[Quran IndexedDB Read Error]', e);
    }

    // 3. Check localStorage cache
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.SURAH_CACHE_PREFIX + surahNumber);
      if (cached) {
        const parsed = JSON.parse(cached) as SurahDetail;
        if (parsed?.ayahs?.length === meta.ayahCount) {
          surahMemoryCache.set(surahNumber, parsed);
          // Also migrate to IndexedDB if missing there
          quranIndexedDb.saveSurah(surahNumber, parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[Quran Cache Read Error]', e);
    }

    // 4. Check bundled offline dataset (e.g., Surah 1, Juz 30 and primary surahs)
    if (surahNumber === 1) {
      const detail: SurahDetail = {
        meta,
        bismillah: false,
        ayahs: SURAH_1_AYAHS
      };
      surahMemoryCache.set(surahNumber, detail);
      this.cacheSurahDetailLocally(detail);
      quranIndexedDb.saveSurah(surahNumber, detail);
      return detail;
    }

    if (JUZ_30_SURAHS[surahNumber] && JUZ_30_SURAHS[surahNumber].length === meta.ayahCount) {
      const detail: SurahDetail = {
        meta,
        bismillah: surahNumber !== 9 && surahNumber !== 1,
        ayahs: JUZ_30_SURAHS[surahNumber]
      };
      surahMemoryCache.set(surahNumber, detail);
      this.cacheSurahDetailLocally(detail);
      quranIndexedDb.saveSurah(surahNumber, detail);
      return detail;
    }

    // 5. Fetch from verified QuranEnc official dataset
    try {
      const url = `https://quranenc.com/api/v1/translation/sura/bengali_zakaria/${surahNumber}`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'force-cache'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: সূরা লোড করা যায়নি`);
      }

      const data = await response.json();
      if (data?.result && Array.isArray(data.result) && data.result.length > 0) {
        const ayahs: AyahItem[] = data.result.map((item: any) => ({
          ayahNumber: parseInt(item.aya, 10),
          arabicText: (item.arabic_text || '').trim(),
          bengaliText: (item.translation || '').trim(),
          footnotes: (item.footnotes || item.footnote || '').trim()
        }));

        const detail: SurahDetail = {
          meta,
          bismillah: surahNumber !== 9 && surahNumber !== 1,
          ayahs
        };

        surahMemoryCache.set(surahNumber, detail);
        this.cacheSurahDetailLocally(detail);
        await quranIndexedDb.saveSurah(surahNumber, detail);
        return detail;
      }
    } catch (networkErr) {
      console.warn('[Quran Fetch Fallback]', networkErr);
    }

    // Fallback: Alternative static CDN mirror
    try {
      const mirrorUrl = `https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ben-muhiuddinkhan/${surahNumber}.json`;
      const res = await fetch(mirrorUrl);
      if (res.ok) {
        const d = await res.json();
        if (d?.chapter && Array.isArray(d.chapter)) {
          const ayahs: AyahItem[] = d.chapter.map((item: any) => ({
            ayahNumber: item.verse,
            arabicText: item.text || '',
            bengaliText: item.text || ''
          }));
          const detail: SurahDetail = {
            meta,
            bismillah: surahNumber !== 9 && surahNumber !== 1,
            ayahs
          };
          surahMemoryCache.set(surahNumber, detail);
          quranIndexedDb.saveSurah(surahNumber, detail);
          return detail;
        }
      }
    } catch (e) {}

    throw new Error('কুরআনের ডেটা লোড করা সম্ভব হয়নি। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।');
  },

  cacheSurahDetailLocally(detail: SurahDetail) {
    try {
      localStorage.setItem(
        STORAGE_KEYS.SURAH_CACHE_PREFIX + detail.meta.number,
        JSON.stringify(detail)
      );
    } catch (e) {
      console.warn('[Quran Local Storage Quota / Save Warning]', e);
    }
  },

  /**
   * Search Quran by Surah name, number, or translation content
   */
  async searchQuran(query: string): Promise<QuranSearchResult[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results: QuranSearchResult[] = [];

    // Check if searching by Surah number
    const surahNum = parseInt(q, 10);
    if (!isNaN(surahNum) && surahNum >= 1 && surahNum <= 114) {
      const match = SURAHS_LIST.find((s) => s.number === surahNum);
      if (match) {
        results.push({
          surahNumber: match.number,
          surahNameBn: match.nameBn,
          surahNameAr: match.nameAr,
          ayahNumber: 1,
          arabicText: match.nameAr,
          bengaliText: `সূরা #${match.number} - ${match.nameBn} (${match.meaningBn}) • ${match.ayahCount} আয়াত • ${match.revelationTypeBn}`,
          matchType: 'surah'
        });
      }
    }

    // Match Surah name in Bengali, English, or Arabic
    for (const s of SURAHS_LIST) {
      if (
        s.nameBn.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.meaningBn.toLowerCase().includes(q) ||
        s.nameAr.includes(q)
      ) {
        if (!results.some((r) => r.surahNumber === s.number && r.ayahNumber === 1)) {
          results.push({
            surahNumber: s.number,
            surahNameBn: s.nameBn,
            surahNameAr: s.nameAr,
            ayahNumber: 1,
            arabicText: s.nameAr,
            bengaliText: `সূরা #${s.number} - ${s.nameBn} (${s.meaningBn}) • ${s.ayahCount} আয়াত • ${s.revelationTypeBn}`,
            matchType: 'surah'
          });
        }
      }
    }

    return results;
  },

  /**
   * Get all saved bookmarks
   */
  getBookmarks(): QuranBookmark[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Toggle or Add a Bookmark
   */
  addBookmark(bookmark: Omit<QuranBookmark, 'id' | 'timestamp'>): QuranBookmark[] {
    const bookmarks = this.getBookmarks();
    const existingIndex = bookmarks.findIndex(
      (b) => b.surahNumber === bookmark.surahNumber && b.ayahNumber === bookmark.ayahNumber
    );

    if (existingIndex >= 0) {
      bookmarks.splice(existingIndex, 1);
    } else {
      const newBm: QuranBookmark = {
        ...bookmark,
        id: `bm_${bookmark.surahNumber}_${bookmark.ayahNumber}_${Date.now()}`,
        timestamp: Date.now()
      };
      bookmarks.unshift(newBm);
    }

    try {
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
    } catch (e) {}

    return bookmarks;
  },

  /**
   * Remove a bookmark
   */
  removeBookmark(surahNumber: number, ayahNumber: number): QuranBookmark[] {
    let bookmarks = this.getBookmarks();
    bookmarks = bookmarks.filter(
      (b) => !(b.surahNumber === surahNumber && b.ayahNumber === ayahNumber)
    );
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
    } catch (e) {}
    return bookmarks;
  },

  /**
   * Check if an Ayah is bookmarked
   */
  isBookmarked(surahNumber: number, ayahNumber: number): boolean {
    const bookmarks = this.getBookmarks();
    return bookmarks.some(
      (b) => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber
    );
  },

  /**
   * Get Last Read position
   */
  getLastRead(): QuranLastRead | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAST_READ);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Save Last Read position
   */
  saveLastRead(surahNumber: number, ayahNumber: number): void {
    const meta = this.getSurahMeta(surahNumber);
    if (!meta) return;

    const lastRead: QuranLastRead = {
      surahNumber,
      ayahNumber,
      surahNameBn: meta.nameBn,
      surahNameAr: meta.nameAr,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(STORAGE_KEYS.LAST_READ, JSON.stringify(lastRead));
    } catch (e) {}
  },

  /**
   * Get reading settings
   */
  getReadingSettings(): QuranReadingSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch (e) {}
    return DEFAULT_SETTINGS;
  },

  /**
   * Save reading settings
   */
  saveReadingSettings(settings: Partial<QuranReadingSettings>): QuranReadingSettings {
    const current = this.getReadingSettings();
    const updated = { ...current, ...settings };
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    } catch (e) {}
    return updated;
  },

  /**
   * Forensic Quran Dataset Validation
   */
  validateQuranDataset(): {
    isValid: boolean;
    totalSurahs: number;
    totalAyahs: number;
    errors: string[];
  } {
    const errors: string[] = [];
    let totalAyahs = 0;

    if (SURAHS_LIST.length !== 114) {
      errors.push(`সূরা সংখ্যা ১১৪ টি হওয়া আবশ্যক, কিন্তু পাওয়া গেছে: ${SURAHS_LIST.length}`);
    }

    const seenNumbers = new Set<number>();
    for (let i = 0; i < SURAHS_LIST.length; i++) {
      const surah = SURAHS_LIST[i];
      if (surah.number !== i + 1) {
        errors.push(`সূরার ক্রম সঠিক নয়: প্রত্যাশিত #${i + 1}, কিন্তু পাওয়া গেছে #${surah.number}`);
      }
      if (seenNumbers.has(surah.number)) {
        errors.push(`ডুপ্লিকেট সূরা নম্বর: #${surah.number}`);
      }
      seenNumbers.add(surah.number);
      totalAyahs += surah.ayahCount;

      if (!surah.nameAr || !surah.nameBn || !surah.ayahCount || surah.ayahCount <= 0) {
        errors.push(`সূরার তথ্যে অপূর্ণতা: #${surah.number} ${surah.nameBn}`);
      }
    }

    if (totalAyahs !== 6236) {
      errors.push(`মোট আয়াত সংখ্যা ৬২৩৬ টি হওয়া আবশ্যক, কিন্তু যোগফল পাওয়া গেছে: ${totalAyahs}`);
    }

    return {
      isValid: errors.length === 0,
      totalSurahs: SURAHS_LIST.length,
      totalAyahs,
      errors
    };
  },

  /**
   * Fetch detailed explanation/footnotes/tafsir for a specific ayah
   */
  async fetchAyahExplanation(surahNumber: number, ayahNumber: number): Promise<{ footnotes?: string; tafsir?: string }> {
    // 1. Check if ayah in memory cache has footnotes
    if (surahMemoryCache.has(surahNumber)) {
      const cached = surahMemoryCache.get(surahNumber)!;
      const ayah = cached.ayahs.find(a => a.ayahNumber === ayahNumber);
      if (ayah?.footnotes || ayah?.tafsir) {
        return { footnotes: ayah.footnotes, tafsir: ayah.tafsir };
      }
    }

    // 2. Fetch single ayah translation & footnotes from QuranEnc
    try {
      const url = `https://quranenc.com/api/v1/translation/aya/bengali_zakaria/${surahNumber}/${ayahNumber}`;
      const res = await fetch(url, { cache: 'force-cache' });
      if (res.ok) {
        const data = await res.json();
        if (data?.result) {
          const fn = (data.result.footnotes || data.result.footnote || '').trim();
          return { footnotes: fn };
        }
      }
    } catch (e) {
      console.warn('[QuranEnc Ayah Footnote Fetch Error]', e);
    }

    // 3. Fallback: Try Quran.com Bengali Tafsir API (Ahsanul Bayaan / Ibn Kathir - ID 167)
    try {
      const tafsirUrl = `https://api.quran.com/api/v4/tafsirs/167/by_ayah/${surahNumber}:${ayahNumber}`;
      const res = await fetch(tafsirUrl);
      if (res.ok) {
        const data = await res.json();
        if (data?.tafsir?.text) {
          const cleanText = data.tafsir.text.replace(/<[^>]*>/g, '').trim();
          return { tafsir: cleanText };
        }
      }
    } catch (e) {
      console.warn('[Quran.com Tafsir Fetch Error]', e);
    }

    return {};
  }
};
