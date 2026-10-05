import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  BookMarked,
  Search,
  Bookmark,
  Sparkles,
  ChevronRight,
  BookOpen,
  Info,
  X,
  Heart,
  Moon,
  Sun,
  Clock,
  Droplets,
  Landmark,
  Utensils,
  Shirt,
  Compass,
  ShieldAlert,
  Activity,
  Layers,
  Flower2,
  Check
} from 'lucide-react';
import { HisnulMuslimChapter, HisnulMuslimDua } from '../../types';
import { hisnulMuslimService } from '../../services/hisnulMuslimService';
import { HisnulMuslimDetailModal } from './HisnulMuslimDetailModal';
import { useLanguage } from '../../context/LanguageContext';

interface HisnulMuslimViewProps {
  onBack: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Moon: <Moon className="w-5 h-5" />,
  Sun: <Sun className="w-5 h-5" />,
  Clock: <Clock className="w-5 h-5" />,
  Droplets: <Droplets className="w-5 h-5" />,
  Landmark: <Landmark className="w-5 h-5" />,
  Utensils: <Utensils className="w-5 h-5" />,
  Shirt: <Shirt className="w-5 h-5" />,
  Compass: <Compass className="w-5 h-5" />,
  Heart: <Heart className="w-5 h-5" />,
  ShieldAlert: <ShieldAlert className="w-5 h-5" />,
  Activity: <Activity className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
  BookOpen: <BookOpen className="w-5 h-5" />,
  Flower2: <Flower2 className="w-5 h-5" />,
  Layers: <Layers className="w-5 h-5" />
};

export const HisnulMuslimView: React.FC<HisnulMuslimViewProps> = ({ onBack, onShowToast }) => {
  const { t, language } = useLanguage();
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const listScrollRef = useRef<number>(0);

  // Automatically preserve and restore list scroll position on chapter transitions or search states
  useEffect(() => {
    if (selectedChapterId !== null || searchQuery.trim() !== '') {
      // Capture scroll position before list content gets hidden or filtered
      if (!selectedChapterId && searchQuery.trim() === '') {
        listScrollRef.current = window.scrollY;
      }
      window.scrollTo({ top: 0 });
    } else {
      const saved = listScrollRef.current;
      const timer = setTimeout(() => {
        window.scrollTo({ top: saved });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedChapterId, searchQuery]);
  const [activeTab, setActiveTab] = useState<'categories' | 'bookmarks' | 'all'>('categories');
  const [selectedDua, setSelectedDua] = useState<HisnulMuslimDua | null>(null);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [bookmarkRefreshCount, setBookmarkRefreshCount] = useState<number>(0);

  const chapters = useMemo(() => hisnulMuslimService.getChapters(), []);
  const sourceInfo = useMemo(() => hisnulMuslimService.getSourceInfo(), []);

  // Search or Filter logic
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return hisnulMuslimService.searchDuas(searchQuery);
  }, [searchQuery]);

  const bookmarkedDuas = useMemo(() => {
    return hisnulMuslimService.getBookmarkedDuas();
  }, [bookmarkRefreshCount]);

  const activeChapterDuas = useMemo(() => {
    if (!selectedChapterId) return [];
    return hisnulMuslimService.getDuasByChapter(selectedChapterId);
  }, [selectedChapterId]);

  const activeChapter = useMemo(() => {
    if (!selectedChapterId) return null;
    return chapters.find(c => c.id === selectedChapterId) || null;
  }, [selectedChapterId, chapters]);

  const handleBookmarkToggle = () => {
    setBookmarkRefreshCount(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#01140e] text-white flex flex-col pb-12">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-gradient-to-b from-[#032219] via-[#021812] to-[#01140e]/95 backdrop-blur-md border-b border-emerald-800/60 px-1.5 py-2.5 sm:px-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                if (selectedChapterId) {
                  setSelectedChapterId(null);
                } else {
                  onBack();
                }
              }}
              className="w-9 h-9 rounded-xl bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 hover:text-white hover:bg-emerald-800 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="ফিরে যান"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{t('dua.title')}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-400/40">
                  حصن المسلم
                </span>
              </h1>
              <p className="text-[11px] text-emerald-300/80 truncate">
                {activeChapter ? (language === 'bn' ? activeChapter.title_bn : activeChapter.title_bn) : (language === 'bn' ? 'কুরআন ও সহীহ সুন্নাহ থেকে নির্বাচিত দো‘আ ও যিকর' : 'Selected Duas from Quran & Sunnah')}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowInfoModal(true)}
            className="w-9 h-9 rounded-xl bg-emerald-900/60 border border-emerald-700/60 text-amber-300 hover:text-white hover:bg-emerald-800 transition-colors flex items-center justify-center shrink-0"
            title={language === 'bn' ? 'তথ্য ও সূত্র' : 'Info & Source'}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mt-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('dua.searchPlaceholder')}
              className="w-full bg-[#021d15] text-white text-xs sm:text-sm pl-10 pr-9 py-2.5 rounded-2xl border border-emerald-700/60 focus:border-amber-400 focus:outline-none transition-colors placeholder:text-emerald-400/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-white p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-2xl mx-auto w-full px-0.5 sm:px-1 py-3 space-y-3.5 flex-1">
        {/* Search View Mode */}
        {searchQuery.trim() ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                {language === 'bn' ? `অনুসন্ধানের ফলাফল (${searchResults.length})` : `Search Results (${searchResults.length})`}
              </h2>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-emerald-400 hover:underline cursor-pointer"
              >
                {language === 'bn' ? 'ফলাফল মুছুন' : 'Clear Results'}
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="p-8 text-center bg-emerald-950/40 rounded-2xl border border-emerald-800/40 space-y-2">
                <Search className="w-8 h-8 text-emerald-500/60 mx-auto" />
                <p className="text-xs text-emerald-300 font-medium">
                  {language === 'bn' ? `"${searchQuery}" দিয়ে কোনো দো‘আ পাওয়া যায়নি।` : `No du'a found matching "${searchQuery}".`}
                </p>
                <p className="text-[11px] text-emerald-400/70">
                  {language === 'bn' ? 'অন্য কোনো শব্দ বা নম্বর দিয়ে চেষ্টা করুন।' : 'Try searching with a different word or number.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {searchResults.map((dua, idx) => (
                  <button
                    key={`hnm-search-${dua.id || 'd'}-${idx}`}
                    onClick={() => setSelectedDua(dua)}
                    className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#03241b] via-[#021b14] to-[#03241b] hover:from-[#053d2d] hover:to-[#053d2d] border border-emerald-700/50 hover:border-amber-400/60 transition-all text-left group flex items-start justify-between gap-3 shadow-md cursor-pointer"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 font-bold font-mono">
                          #{dua.dua_number}
                        </span>
                        <span className="text-[11px] text-emerald-300/80 truncate">
                          {dua.chapter_title}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                        {dua.title_bn}
                      </h3>
                      <p className="text-xs text-amber-200/90 font-serif truncate" style={{ direction: 'rtl' }}>
                        {dua.arabic_text}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : selectedChapterId ? (
          /* Chapter Detail Dua List View */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#03291f] to-[#011a12] border border-emerald-700/60 shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                  {activeChapter ? CATEGORY_ICONS[activeChapter.iconName] || <BookOpen className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {activeChapter?.title_bn}
                  </h2>
                  <p className="text-[11px] text-amber-300/90 font-serif">
                    {activeChapter?.title_ar}
                  </p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-semibold">
                {language === 'bn' ? `${activeChapterDuas.length} টি দো‘আ` : `${activeChapterDuas.length} Du'as`}
              </span>
            </div>

            <div className="space-y-2.5">
              {activeChapterDuas.map((dua, idx) => (
                <button
                  key={`hnm-chdua-${dua.id || 'd'}-${idx}`}
                  onClick={() => setSelectedDua(dua)}
                  className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#032219] via-[#021812] to-[#032219] hover:from-[#053d2d] hover:to-[#053d2d] border border-emerald-700/50 hover:border-amber-400/60 transition-all text-left group flex items-start justify-between gap-3 shadow-md cursor-pointer"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-900/80 border border-emerald-700/60 text-amber-300 text-xs font-bold font-mono flex items-center justify-center shrink-0">
                        {dua.dua_number}
                      </span>
                      <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                        {dua.title_bn}
                      </h3>
                    </div>
                    <p className="text-xs text-amber-200/90 font-serif truncate pl-8" style={{ direction: 'rtl' }}>
                      {dua.arabic_text}
                    </p>
                    <p className="text-[11.5px] text-emerald-300/80 line-clamp-1 pl-8">
                      {dua.translation_bn}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Normal Categories / Bookmarks Tab View */}
        <div className={selectedChapterId || searchQuery.trim() ? 'hidden' : 'space-y-5'}>
          {/* View Tabs */}
          <div className="flex items-center p-1 bg-[#021c14] border border-emerald-800/60 rounded-2xl">
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-gradient-to-r from-emerald-800 to-teal-800 text-amber-300 shadow-sm border border-emerald-600/50'
                  : 'text-emerald-300/80 hover:text-white'
              }`}
            >
              {language === 'bn' ? `অধ্যায় / ক্যাটাগরি (${chapters.length})` : `Categories (${chapters.length})`}
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'bookmarks'
                  ? 'bg-gradient-to-r from-emerald-800 to-teal-800 text-amber-300 shadow-sm border border-emerald-600/50'
                  : 'text-emerald-300/80 hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? `বুকমার্ক (${bookmarkedDuas.length})` : `Bookmarks (${bookmarkedDuas.length})`}</span>
            </button>
          </div>

          {/* Categories Grid */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {chapters.map((ch, idx) => (
                <button
                  key={`hnm-ch-${ch.id || 'c'}-${idx}`}
                  onClick={() => setSelectedChapterId(ch.id)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-[#03231a] via-[#021812] to-[#03231a] hover:from-[#053d2e] hover:to-[#053d2e] border border-emerald-700/50 hover:border-amber-400/60 transition-all text-left group shadow-md cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-800 to-teal-900 border border-emerald-600/50 text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {CATEGORY_ICONS[ch.iconName] || <BookOpen className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                        {ch.title_bn}
                      </h3>
                      <p className="text-[10px] text-emerald-300/80 truncate font-serif">
                        {ch.title_ar} • {language === 'bn' ? `${ch.dua_count} টি দো‘আ` : `${ch.dua_count} Du'as`}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Bookmarks Tab */}
          {activeTab === 'bookmarks' && (
            <div className="space-y-3">
              {bookmarkedDuas.length === 0 ? (
                <div className="p-8 text-center bg-emerald-950/40 rounded-2xl border border-emerald-800/40 space-y-2">
                  <Bookmark className="w-8 h-8 text-amber-400/60 mx-auto" />
                  <p className="text-xs text-emerald-300 font-medium">
                    {language === 'bn' ? 'এখনো কোনো দো‘আ বুকমার্ক করা হয়নি।' : 'No du\'a bookmarked yet.'}
                  </p>
                  <p className="text-[11px] text-emerald-400/70">
                    {language === 'bn' ? 'পছন্দের দো‘আগুলোর বিস্তারিত পাতায় বুকমার্ক আইকনে ট্যাপ করে এখানে জমা রাখুন।' : 'Tap the bookmark icon on any du\'a details view to save it here.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {bookmarkedDuas.map((dua, idx) => (
                    <button
                      key={`hnm-bm-${dua.id || 'd'}-${idx}`}
                      onClick={() => setSelectedDua(dua)}
                      className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#032219] via-[#021812] to-[#032219] hover:from-[#053d2d] hover:to-[#053d2d] border border-emerald-700/50 hover:border-amber-400/60 transition-all text-left group flex items-start justify-between gap-3 shadow-md cursor-pointer"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 font-bold font-mono">
                            #{dua.dua_number}
                          </span>
                          <span className="text-[11px] text-emerald-300/80 truncate">
                            {dua.chapter_title}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                          {dua.title_bn}
                        </h3>
                      </div>
                      <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selected Dua Detail Modal */}
      <HisnulMuslimDetailModal
        dua={selectedDua}
        onClose={() => setSelectedDua(null)}
        onShowToast={onShowToast}
        onBookmarkToggle={handleBookmarkToggle}
      />

      {/* Source Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-gradient-to-b from-[#032219] via-[#021812] to-[#01120d] border border-emerald-700/60 rounded-3xl p-5 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-800/60 pb-3">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>{language === 'bn' ? 'হিসনুল মুসলিম তথ্য ও সূত্র' : 'Hisnul Muslim Info & Sources'}</span>
              </h3>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-emerald-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-emerald-200/90">
              <div>
                <strong className="text-amber-300 block">{language === 'bn' ? 'মূল গ্রন্থ:' : 'Original Book:'}</strong>
                <span className="font-serif text-sm">{sourceInfo.bookNameAr}</span>
                <span className="block text-emerald-300">{sourceInfo.bookNameBn}</span>
              </div>

              <div>
                <strong className="text-amber-300 block">{language === 'bn' ? 'লেখক:' : 'Author:'}</strong>
                <span>{sourceInfo.authorBn}</span>
              </div>

              <div>
                <strong className="text-amber-300 block">{language === 'bn' ? 'বাংলা অনুবাদক:' : 'Bangla Translator:'}</strong>
                <span>{sourceInfo.translatorBn}</span>
              </div>

              <div>
                <strong className="text-amber-300 block">{language === 'bn' ? 'প্রকাশক ও সূত্র:' : 'Publisher & Source:'}</strong>
                <span>{sourceInfo.publisherBn}</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-[11px] text-emerald-300/80">
                <strong>{language === 'bn' ? 'লাইসেন্স ও স্বত্বাধিকার নোটিশ:' : 'License & Copyright Notice:'}</strong>
                <p className="mt-1">{sourceInfo.licenseNote}</p>
              </div>
            </div>

            <button
              onClick={() => setShowInfoModal(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-800 to-teal-800 text-white font-bold text-xs hover:from-emerald-700 hover:to-teal-700 transition-colors cursor-pointer"
            >
              {language === 'bn' ? 'ঠিক আছে' : 'OK'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
