import React, { useState, useEffect } from 'react';
import {
  X,
  Bookmark,
  BookmarkCheck,
  Copy,
  Share2,
  Check,
  BookOpen,
  Sparkles,
  AArrowDown,
  AArrowUp,
  Volume2
} from 'lucide-react';
import { HisnulMuslimDua } from '../../types';
import { hisnulMuslimService } from '../../services/hisnulMuslimService';
import { useLanguage } from '../../context/LanguageContext';

interface HisnulMuslimDetailModalProps {
  dua: HisnulMuslimDua | null;
  onClose: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onBookmarkToggle?: (duaId: string) => void;
}

export const HisnulMuslimDetailModal: React.FC<HisnulMuslimDetailModalProps> = ({
  dua,
  onClose,
  onShowToast,
  onBookmarkToggle
}) => {
  const { language } = useLanguage();
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showTransliteration, setShowTransliteration] = useState<boolean>(true);
  const [fontScale, setFontScale] = useState<{ arabicScale: number; banglaScale: number }>(() =>
    hisnulMuslimService.getFontSettings()
  );

  useEffect(() => {
    if (dua) {
      setIsBookmarked(hisnulMuslimService.isBookmarked(dua.id));
    }
  }, [dua]);

  if (!dua) return null;

  const handleBookmark = () => {
    const updatedStatus = hisnulMuslimService.toggleBookmark(dua.id);
    setIsBookmarked(updatedStatus);
    if (onBookmarkToggle) onBookmarkToggle(dua.id);
    onShowToast(
      updatedStatus
        ? (language === 'bn' ? 'দো‘আটি বুকমার্কে সংরক্ষিত হয়েছে' : 'Du\'a saved to bookmarks')
        : (language === 'bn' ? 'বুকমার্ক থেকে সরিয়ে নেওয়া হয়েছে' : 'Removed from bookmarks'),
      'info'
    );
  };

  const handleCopy = async () => {
    const copyText = `🕌 ${dua.title_bn} (Hisnul Muslim #${dua.dua_number})\n\n${dua.arabic_text}\n\n${language === 'bn' ? 'অর্থ' : 'Meaning'}: ${dua.translation_bn}\n\n${language === 'bn' ? 'রেফারেন্স' : 'Reference'}: ${dua.reference_book}${dua.reference_number ? ` (${language === 'bn' ? 'হাদীস নম্বর' : 'Hadith No'}: ${dua.reference_number})` : ''}\n\n— Cave Companions`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(copyText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = copyText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      onShowToast(language === 'bn' ? 'দো‘আ ও অর্থ কপি করা হয়েছে' : 'Du\'a & meaning copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      onShowToast(language === 'bn' ? 'কপি করা সম্ভব হয়নি' : 'Could not copy', 'error');
    }
  };

  const handleShare = async () => {
    const shareText = `🕌 ${dua.title_bn} (Hisnul Muslim #${dua.dua_number})\n\n${dua.arabic_text}\n\n${language === 'bn' ? 'অর্থ' : 'Meaning'}: ${dua.translation_bn}\n\n${language === 'bn' ? 'রেফারেন্স' : 'Reference'}: ${dua.reference_book}${dua.reference_number ? ` (${dua.reference_number})` : ''}\n\n— Cave Companions`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: dua.title_bn,
          text: shareText
        });
      } catch (e) {
        // user cancelled share
      }
    } else {
      handleCopy();
    }
  };

  const adjustFont = (type: 'arabic' | 'bangla', delta: number) => {
    setFontScale(prev => {
      const next = { ...prev };
      if (type === 'arabic') {
        next.arabicScale = Math.min(1.6, Math.max(0.8, prev.arabicScale + delta));
      } else {
        next.banglaScale = Math.min(1.5, Math.max(0.8, prev.banglaScale + delta));
      }
      hisnulMuslimService.saveFontSettings(next);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-gradient-to-b from-[#032219] via-[#021812] to-[#01120d] border border-emerald-700/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-emerald-800/60 bg-emerald-950/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold font-mono">#{dua.dua_number}</span>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-amber-300 font-medium block truncate">
                {dua.chapter_title}
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                {dua.title_bn}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center text-emerald-300 hover:text-white hover:bg-emerald-800/80 transition-colors shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#01140e] border-b border-emerald-800/40 text-xs shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {/* Font Scale Controls */}
            <div className="flex items-center bg-emerald-950/80 rounded-xl border border-emerald-800/60 p-1">
              <span className="text-[10px] text-emerald-300 px-1.5 font-medium">{language === 'bn' ? 'আরবী:' : 'Arabic:'}</span>
              <button
                onClick={() => adjustFont('arabic', -0.1)}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-emerald-800/60 text-emerald-300 hover:text-white cursor-pointer"
                title={language === 'bn' ? 'আরবী ফন্ট ছোট করুন' : 'Decrease Arabic font'}
              >
                <AArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => adjustFont('arabic', 0.1)}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-emerald-800/60 text-emerald-300 hover:text-white cursor-pointer"
                title={language === 'bn' ? 'আরবী ফন্ট বড় করুন' : 'Increase Arabic font'}
              >
                <AArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => setShowTransliteration(!showTransliteration)}
              className={`px-2.5 py-1 rounded-xl border text-[11px] font-medium transition-colors cursor-pointer ${
                showTransliteration
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                  : 'bg-emerald-950/60 border-emerald-800/50 text-emerald-400 hover:text-emerald-200'
              }`}
            >
              {language === 'bn'
                ? `উচ্চারণ ${showTransliteration ? 'অন' : 'অফ'}`
                : `Transliteration ${showTransliteration ? 'ON' : 'OFF'}`}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBookmark}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-500 text-emerald-950 border-amber-400 font-bold'
                  : 'bg-emerald-900/60 border-emerald-700/60 text-amber-300 hover:bg-emerald-800'
              }`}
            >
              {isBookmarked ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'সংরক্ষিত' : 'Saved'}</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'বুকমার্ক' : 'Bookmark'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopy}
              className="p-1.5 rounded-xl bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 hover:text-white hover:bg-emerald-800 transition-colors cursor-pointer"
              title={language === 'bn' ? 'কপি করুন' : 'Copy'}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={handleShare}
              className="p-1.5 rounded-xl bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 hover:text-white hover:bg-emerald-800 transition-colors cursor-pointer"
              title={language === 'bn' ? 'শেয়ার করুন' : 'Share'}
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Arabic Text Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-[#021d15] to-[#01140e] border border-amber-500/30 shadow-inner">
            <p
              className="text-right font-serif leading-[2.2] tracking-wide text-amber-200 select-text"
              style={{
                direction: 'rtl',
                fontSize: `${1.35 * fontScale.arabicScale}rem`
              }}
            >
              {dua.arabic_text}
            </p>
          </div>

          {/* Transliteration */}
          {showTransliteration && dua.transliteration && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                {language === 'bn' ? 'উচ্চারণ (বাংলা):' : 'Transliteration:'}
              </span>
              <p
                className="text-emerald-200/90 italic leading-relaxed"
                style={{ fontSize: `${0.875 * fontScale.banglaScale}rem` }}
              >
                {dua.transliteration}
              </p>
            </div>
          )}

          {/* Translation */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
              {language === 'bn' ? 'বাংলা অনুবাদ:' : 'Translation (Bangla):'}
            </span>
            <p
              className="text-emerald-50 leading-relaxed font-medium select-text"
              style={{ fontSize: `${0.95 * fontScale.banglaScale}rem` }}
            >
              {dua.translation_bn}
            </p>
          </div>

          {/* Reference & Hadith Grade Metadata */}
          <div className="p-3.5 rounded-2xl bg-[#01150e] border border-emerald-800/60 space-y-2 text-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-amber-300/90 font-medium">
                <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {language === 'bn' ? 'রেফারেন্স:' : 'Reference:'} <strong className="text-white">{dua.reference_book}</strong>
                  {dua.reference_number && (
                    <span className="text-emerald-300 font-mono ml-1">
                      ({language === 'bn' ? `হাদীস: ${dua.reference_number}` : `Hadith: ${dua.reference_number}`})
                    </span>
                  )}
                </span>
              </div>

              {dua.hadith_grade && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {language === 'bn' ? `মান: ${dua.hadith_grade}` : `Grade: ${dua.hadith_grade}`}
                </span>
              )}
            </div>

            <div className="text-[10.5px] text-emerald-400/70 border-t border-emerald-900/60 pt-2 flex items-center justify-between">
              <span>{language === 'bn' ? `সূত্র: ${dua.source}` : `Source: ${dua.source}`}</span>
              <span className="font-mono text-[9.5px]">v{dua.content_version}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
