import React from 'react';
import { X, Bookmark, Trash2, ChevronRight, BookOpen } from 'lucide-react';
import { QuranBookmark } from '../../types/quran';
import { useLanguage } from '../../context/LanguageContext';

interface QuranBookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: QuranBookmark[];
  onRemoveBookmark: (surahNumber: number, ayahNumber: number) => void;
  onSelectBookmark: (surahNumber: number, ayahNumber: number) => void;
}

export const QuranBookmarksModal: React.FC<QuranBookmarksModalProps> = ({
  isOpen,
  onClose,
  bookmarks,
  onRemoveBookmark,
  onSelectBookmark
}) => {
  const { language } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-gradient-to-b from-[#03231a] via-[#021812] to-[#01140e] border border-emerald-700/60 rounded-3xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl text-white flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-emerald-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
              <Bookmark className="w-5 h-5 fill-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {language === 'bn' ? 'আমার বুকমার্কস' : 'My Bookmarks'}
              </h2>
              <p className="text-xs text-emerald-300/80">
                {language === 'bn' ? 'সংরক্ষিত আয়াতসমূহের তালিকা' : 'List of saved Ayahs'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-emerald-950/60 text-emerald-300 hover:text-white hover:bg-emerald-900 border border-emerald-800/40 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {bookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-950/40 flex items-center justify-center border border-emerald-900/60 text-emerald-500">
                <Bookmark className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-emerald-200">
                  {language === 'bn' ? 'কোনো বুকমার্ক পাওয়া যায়নি' : 'No bookmarks found'}
                </p>
                <p className="text-xs text-emerald-400/70 max-w-[240px] mx-auto">
                  {language === 'bn'
                    ? 'সূরা পড়ার সময় আয়াতের পাশে বুকমার্ক আইকনে চাপ দিয়ে গুরুত্বপূর্ণ আয়াতগুলো এখানে জমা রাখতে পারেন।'
                    : 'Tap the bookmark icon next to any ayah while reading to save it here.'}
                </p>
              </div>
            </div>
          ) : (
            bookmarks.map((bm, idx) => (
              <div
                key={`qbm-${bm.id || 'b'}-${idx}`}
                className="group p-4 rounded-2xl bg-[#04261c] hover:bg-[#053225] border border-emerald-855 hover:border-emerald-700/50 transition-all duration-200 flex flex-col gap-2.5 relative"
              >
                {/* Top Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-900/60 text-amber-300 font-bold text-[11px] flex items-center justify-center border border-emerald-800 font-mono">
                      {bm.surahNumber}
                    </span>
                    <span className="font-bold text-sm text-white">
                      {bm.surahNameBn} : {language === 'bn' ? `আয়াত ${bm.ayahNumber}` : `Ayah ${bm.ayahNumber}`}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveBookmark(bm.surahNumber, bm.ayahNumber);
                    }}
                    className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/40 cursor-pointer transition"
                    title={language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Excerpt Details */}
                <div className="space-y-1.5 bg-black/20 p-2.5 rounded-xl border border-emerald-900/30">
                  <p className="font-arabic text-amber-200 text-right text-base leading-relaxed line-clamp-2" dir="rtl">
                    {bm.arabicExcerpt}
                  </p>
                  <p className="text-[11.5px] text-emerald-200/90 leading-relaxed line-clamp-2">
                    {bm.bengaliExcerpt}
                  </p>
                </div>

                {/* Date & Jump */}
                <div className="flex items-center justify-between text-[10px] text-emerald-400/70 pt-1">
                  <span>
                    {new Date(bm.timestamp).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
                      day: 'numeric',
                      month: 'long'
                    })}
                  </span>
                  <button
                    onClick={() => onSelectBookmark(bm.surahNumber, bm.ayahNumber)}
                    className="flex items-center gap-0.5 text-xs text-amber-300 font-semibold hover:text-amber-200 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'পাঠ করুন' : 'Read'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#021812] border-t border-emerald-800/60">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition cursor-pointer shadow-md"
          >
            {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
