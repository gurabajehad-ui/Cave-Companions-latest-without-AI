import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChevronLeft,
  BookOpen,
  Search,
  Bookmark,
  Settings,
  HelpCircle,
  Sparkles,
  Award,
  ChevronRight,
  Compass,
  X,
  DownloadCloud,
  Wifi,
  WifiOff,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { SurahMeta, QuranBookmark, QuranLastRead, QuranReadingSettings, QuranSearchResult } from '../../types/quran';
import { quranService } from '../../services/quranService';
import { quranIndexedDb } from '../../services/quranIndexedDb';
import { QuranAboutModal } from './QuranAboutModal';
import { QuranBookmarksModal } from './QuranBookmarksModal';
import { SurahReaderView } from './SurahReaderView';
import { useLanguage } from '../../context/LanguageContext';

interface QuranMajidViewProps {
  onBack: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const QuranMajidView: React.FC<QuranMajidViewProps> = ({ onBack, onShowToast }) => {
  const { language, t } = useLanguage();
  // Navigation & States
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const listScrollRef = useRef<number>(0);

  // Automatically preserve and restore list scroll position on Surah reader transitions
  useEffect(() => {
    if (selectedSurah !== null) {
      listScrollRef.current = window.scrollY;
      window.scrollTo({ top: 0 });
    } else {
      const saved = listScrollRef.current;
      const timer = setTimeout(() => {
        window.scrollTo({ top: saved });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedSurah]);

  const [initialAyah, setInitialAyah] = useState<number>(1);
  const [activeFilter, setActiveFilter] = useState<'all' | 'makki' | 'madani'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<QuranSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Modals
  const [aboutOpen, setAboutOpen] = useState<boolean>(false);
  const [bookmarksOpen, setBookmarksOpen] = useState<boolean>(false);

  // Core Data State
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [bookmarks, setBookmarks] = useState<QuranBookmark[]>([]);
  const [lastRead, setLastRead] = useState<QuranLastRead | null>(null);
  const [settings, setSettings] = useState<QuranReadingSettings>(quranService.getReadingSettings());

  // Deep Caching States
  const [cachedSurahs, setCachedSurahs] = useState<number[]>([]);
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);

  // Load Data on Mount & on Return
  useEffect(() => {
    setSurahs(quranService.getAllSurahs());
    setBookmarks(quranService.getBookmarks());
    setLastRead(quranService.getLastRead());
    
    // Fetch cached surah list from IndexedDB
    const fetchCached = async () => {
      const numbers = await quranIndexedDb.getCachedSurahNumbers();
      setCachedSurahs(numbers);
    };
    fetchCached();
  }, [selectedSurah, bookmarksOpen]);

  // Bulk Downloader for Full Offline Support
  const handleDownloadAll = async () => {
    if (isDownloadingAll) return;
    setIsDownloadingAll(true);
    setDownloadProgress(0);

    const allSurahs = quranService.getAllSurahs();
    let downloadedCount = 0;

    for (let i = 0; i < allSurahs.length; i++) {
      const surah = allSurahs[i];
      // Check if already in state
      if (cachedSurahs.includes(surah.number)) {
        downloadedCount++;
        setDownloadProgress(Math.round((downloadedCount / allSurahs.length) * 100));
        continue;
      }

      try {
        await quranService.getSurahDetail(surah.number);
        downloadedCount++;
        setDownloadProgress(Math.round((downloadedCount / allSurahs.length) * 100));
        setCachedSurahs(prev => [...prev, surah.number]);
      } catch (err) {
        console.error(`Offline caching failed for surah ${surah.number}:`, err);
        // Continue downloading others even if one fails
      }
    }

    setIsDownloadingAll(false);
    onShowToast(
      language === 'bn'
        ? 'আলহামদুলিল্লাহ! সম্পূর্ণ ১১৪টি সূরা অফলাইন স্টোরেজে সেভ করা হয়েছে।'
        : 'Alhamdulillah! All 114 Surahs have been saved to offline storage.',
      'success'
    );
  };

  // Handle Search Input
  useEffect(() => {
    const handleSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      const results = await quranService.searchQuran(searchQuery);
      setSearchResults(results);
    };

    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Save Settings
  const handleSaveSettings = (newSettings: QuranReadingSettings) => {
    const saved = quranService.saveReadingSettings(newSettings);
    setSettings(saved);
  };

  // Remove Bookmark
  const handleRemoveBookmark = (surahNumber: number, ayahNumber: number) => {
    const updated = quranService.removeBookmark(surahNumber, ayahNumber);
    setBookmarks(updated);
    onShowToast(language === 'bn' ? 'বুকমার্ক সরানো হয়েছে' : 'Bookmark removed', 'info');
  };

  // Select Bookmark or Last Read to Jump Directly
  const handleSelectAyah = (surahNumber: number, ayahNumber: number) => {
    setInitialAyah(ayahNumber);
    setSelectedSurah(surahNumber);
    setBookmarksOpen(false);
  };

  const handleClearLastRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.removeItem('cave_quran_last_read_v1');
    setLastRead(null);
    onShowToast(language === 'bn' ? 'ইতিহাস মুছে ফেলা হয়েছে' : 'History cleared', 'info');
  };

  // Filter Surahs
  const filteredSurahs = useMemo(() => {
    return surahs.filter((s) => {
      if (activeFilter === 'makki') return s.revelationType === 'MAKKI';
      if (activeFilter === 'madani') return s.revelationType === 'MADANI';
      return true;
    });
  }, [surahs, activeFilter]);

  // Safe Bengali/English Number Convertor
  const toBnNum = (num: number): string => {
    if (language === 'en') return String(num);
    const en = num.toString();
    const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return en.replace(/[0-9]/g, (w) => bn[parseInt(w, 10)]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#02110c] to-[#010906] text-white pb-24">
      {selectedSurah !== null && (
        <SurahReaderView
          surahNumber={selectedSurah}
          initialAyahNumber={initialAyah}
          settings={settings}
          onBack={() => {
            setSelectedSurah(null);
            setInitialAyah(1);
          }}
          onNavigateSurah={(num, ayah = 1) => {
            setInitialAyah(ayah);
            setSelectedSurah(num);
          }}
          onSaveSettings={handleSaveSettings}
          onShowToast={onShowToast}
        />
      )}

      <div className={selectedSurah !== null ? 'hidden' : ''}>
      {/* Premium Navigation Header */}
      <div className="sticky top-0 z-30 bg-[#02110c]/95 backdrop-blur-md border-b border-emerald-900/60 shadow-md">
        <div className="w-full max-w-2xl mx-auto px-1.5 sm:px-3 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-emerald-950/70 text-emerald-300 hover:text-white border border-emerald-900/50 cursor-pointer active:scale-95 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-1.5">
                {t('quran.title')}
              </h1>
              <p className="text-[10px] text-emerald-300/80">{language === 'bn' ? 'পবিত্র কুরআনুল কারীম বাংলা অর্থসহ' : 'Al-Quran Al-Kareem with Translation'}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Bookmarks Icon */}
            <button
              onClick={() => setBookmarksOpen(true)}
              className="p-2 rounded-xl bg-emerald-950/70 text-amber-300 hover:text-amber-200 border border-emerald-900/50 cursor-pointer active:scale-95 transition relative"
              title={t('quran.bookmarks')}
            >
              <Bookmark className="w-4 h-4 fill-amber-300" />
              {bookmarks.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold flex items-center justify-center text-white">
                  {bookmarks.length}
                </span>
              )}
            </button>

            {/* About / Sources */}
            <button
              onClick={() => setAboutOpen(true)}
              className="p-2 rounded-xl bg-emerald-950/70 text-emerald-300 hover:text-white border border-emerald-900/50 cursor-pointer active:scale-95 transition"
              title={language === 'bn' ? 'উৎস ও লাইসেন্স' : 'Sources & License'}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-0.5 sm:px-1 mt-3 space-y-3">
        {/* Continue Reading (Last Read) Widget */}
        {lastRead && (
          <div
            onClick={() => handleSelectAyah(lastRead.surahNumber, lastRead.ayahNumber)}
            className="group relative overflow-hidden p-4 rounded-2xl bg-gradient-to-r from-[#04281f] to-[#021d15] border border-amber-500/40 shadow-md cursor-pointer transition active:scale-98 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-inner">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                  {language === 'bn' ? 'পড়া চালিয়ে যান' : 'Continue Reading'}
                </span>
                <h3 className="text-sm font-bold text-white">
                  {language === 'bn' 
                    ? `সূরা ${lastRead.surahNameBn} (আয়াত ${toBnNum(lastRead.ayahNumber)})`
                    : `Surah ${lastRead.surahNameEn || lastRead.surahNameBn} (Ayah ${lastRead.ayahNumber})`}
                </h3>
                <p className="text-[10px] text-emerald-300/70">
                  {language === 'bn'
                    ? `সর্বশেষ পাঠ: ${new Date(lastRead.timestamp).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' })}`
                    : `Last read: ${new Date(lastRead.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearLastRead}
                className="p-1.5 rounded-lg bg-emerald-950 hover:bg-red-950 hover:text-red-400 text-emerald-400 border border-emerald-900/60 hover:border-red-900/40 cursor-pointer transition"
                title={language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="p-1 rounded-full bg-amber-400/10 text-amber-300">
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder={t('quran.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[#032017]/90 border border-emerald-900/70 focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/80 text-white placeholder-emerald-500/80 text-xs transition outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Deep Offline Caching Panel */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#031d16] to-[#02140f] border border-emerald-800/40 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-emerald-950 text-emerald-300">
                {navigator.onLine ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4 text-amber-500" />}
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block">
                  {language === 'bn' ? 'ডিপ অফলাইন স্টোরেজ' : 'Deep Offline Storage'}
                </span>
                <span className="text-xs font-semibold text-white">
                  {cachedSurahs.length === 114 ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {language === 'bn' ? 'সম্পূর্ণ কুরআন অফলাইন প্রস্তুত' : 'Complete Quran Offline Ready'}
                    </span>
                  ) : (
                    language === 'bn'
                      ? `১১৪টির মধ্যে ${toBnNum(cachedSurahs.length)}টি সূরা সংরক্ষিত`
                      : `${cachedSurahs.length} of 114 Surahs saved`
                  )}
                </span>
              </div>
            </div>

            {cachedSurahs.length < 114 && (
              <button
                onClick={handleDownloadAll}
                disabled={isDownloadingAll}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-[11px] flex items-center gap-1.5 shadow-md hover:shadow-emerald-900/20 active:scale-95 transition disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isDownloadingAll ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>{language === 'bn' ? 'ক্যাশ হচ্ছে...' : 'Caching...'}</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'সব ডাউনলোড করুন' : 'Download All'}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Download progress bar */}
          {isDownloadingAll && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-emerald-400/90 px-0.5">
                <span>{language === 'bn' ? 'সূরা ডাউনলোড ও অফলাইন ক্যাশিং চলছে...' : 'Downloading & caching surahs...'}</span>
                <span className="font-mono font-bold text-amber-300">{toBnNum(downloadProgress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-emerald-950 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-300 rounded-full"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Search Results Drawer */}
        {isSearching && searchQuery && (
          <div className="bg-[#031d16] border border-emerald-800/60 rounded-2xl p-4 space-y-3">
            <h3 className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? `অনুসন্ধানের ফলাফল (${toBnNum(searchResults.length)})` : `Search Results (${searchResults.length})`}</span>
            </h3>
            {searchResults.length === 0 ? (
              <p className="text-xs text-emerald-400/70 py-2">
                {language === 'bn' ? 'কোনো সূরা বা আয়াত খুঁজে পাওয়া যায়নি।' : 'No surah or ayah found.'}
              </p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {searchResults.map((res, idx) => (
                  <div
                    key={`qmv-res-${res.surahNumber}_${res.ayahNumber}-${idx}`}
                    onClick={() => handleSelectAyah(res.surahNumber, res.ayahNumber)}
                    className="p-3 rounded-xl bg-[#04261c] hover:bg-[#053225] border border-emerald-900/40 hover:border-emerald-700/50 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">
                        {language === 'bn' ? res.surahNameBn : res.surahNameEn} ({toBnNum(res.surahNumber)})
                      </p>
                      <p className="text-[10.5px] text-emerald-300/80 line-clamp-1 mt-0.5">
                        {language === 'bn' ? res.bengaliText : (res.englishText || res.bengaliText)}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-500" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Categories / Filters Tab */}
        {!searchQuery && (
          <div className="grid grid-cols-3 gap-2 bg-[#021812]/80 p-1 rounded-xl border border-emerald-900/40">
            <button
              onClick={() => setActiveFilter('all')}
              className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-white shadow'
                  : 'text-emerald-400 hover:text-white'
              }`}
            >
              {language === 'bn' ? `সকল সূরা (${toBnNum(114)})` : `All Surahs (${114})`}
            </button>
            <button
              onClick={() => setActiveFilter('makki')}
              className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeFilter === 'makki'
                  ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-white shadow'
                  : 'text-emerald-400 hover:text-white'
              }`}
            >
              {language === 'bn' ? `মাক্কী (${toBnNum(86)})` : `Makki (${86})`}
            </button>
            <button
              onClick={() => setActiveFilter('madani')}
              className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeFilter === 'madani'
                  ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-white shadow'
                  : 'text-emerald-400 hover:text-white'
              }`}
            >
              {language === 'bn' ? `মাদানী (${toBnNum(28)})` : `Madani (${28})`}
            </button>
          </div>
        )}

        {/* Surah List Grid */}
        {!searchQuery && (
          <div className="space-y-2.5">
            {filteredSurahs.map((surah, idx) => (
              <div
                key={`qmv-surah-${surah.number}-${idx}`}
                onClick={() => {
                  setInitialAyah(1);
                  setSelectedSurah(surah.number);
                }}
                className="group relative overflow-hidden p-4 rounded-2xl bg-[#02140f] border border-emerald-950 hover:border-emerald-800 hover:bg-[#031d16] transition-all duration-200 cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {/* Custom Islamic Star Emblem for Surah Number */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-950 to-emerald-900 border border-emerald-800 flex items-center justify-center font-mono font-bold text-amber-300 text-sm shadow-md">
                    {toBnNum(surah.number)}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      {language === 'bn' ? surah.nameBn : surah.nameEn}
                    </h3>
                    <p className="text-[10.5px] text-emerald-400/80">
                      {language === 'bn' ? surah.revelationTypeBn : surah.revelationType} • {language === 'bn' ? `${toBnNum(surah.ayahCount)}টি আয়াত` : `${surah.ayahCount} Ayahs`}
                    </p>
                  </div>
                </div>

                {/* Right Arab name & English pronunciation */}
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="font-arabic text-amber-200 text-lg leading-none">{surah.nameAr}</p>
                    <p className="text-[10px] text-emerald-500 font-mono mt-0.5">{surah.nameEn}</p>
                  </div>
                  <div className="p-1 rounded-lg bg-emerald-950/40 text-emerald-500 group-hover:text-amber-300 group-hover:bg-emerald-900/20 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      </div>

      {/* About/Sources Modal */}
      <QuranAboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />

      {/* Saved Bookmarks Modal */}
      <QuranBookmarksModal
        isOpen={bookmarksOpen}
        onClose={() => setBookmarksOpen(false)}
        bookmarks={bookmarks}
        onRemoveBookmark={handleRemoveBookmark}
        onSelectBookmark={handleSelectAyah}
      />
    </div>
  );
};
