import React, { useState } from 'react';
import { X, Type, RotateCcw, Check } from 'lucide-react';
import { QuranReadingSettings } from '../../types/quran';
import { useLanguage } from '../../context/LanguageContext';

interface QuranSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: QuranReadingSettings;
  onSaveSettings: (settings: QuranReadingSettings) => void;
}

export const QuranSettingsModal: React.FC<QuranSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings
}) => {
  const { language } = useLanguage();
  const [current, setCurrent] = useState<QuranReadingSettings>(settings);

  if (!isOpen) return null;

  const handleReset = () => {
    const defaultVal: QuranReadingSettings = {
      arabicFontSize: 30,
      bengaliFontSize: 16,
      showTranslation: true,
      showArabic: true
    };
    setCurrent(defaultVal);
    onSaveSettings(defaultVal);
  };

  const handleUpdate = (patch: Partial<QuranReadingSettings>) => {
    const updated = { ...current, ...patch };
    setCurrent(updated);
    onSaveSettings(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-gradient-to-b from-[#03231a] via-[#021812] to-[#01140e] border border-emerald-700/60 rounded-3xl max-w-md w-full shadow-2xl text-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-emerald-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {language === 'bn' ? 'পড়ার সেটিংস ও ফন্ট সাইজ' : 'Reading Settings & Font Size'}
              </h2>
              <p className="text-xs text-emerald-300/80">
                {language === 'bn' ? 'পছন্দমতো ফন্ট সাইজ পরিবর্তন করুন' : 'Adjust font size according to your preference'}
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
        <div className="p-5 space-y-6">
          {/* Live Preview Box */}
          <div className="p-4 rounded-2xl bg-[#04261c] border border-emerald-800/80 space-y-3">
            <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
              {language === 'bn' ? 'লাইভ প্রিভিউ (Live Preview)' : 'Live Preview'}
            </span>
            {current.showArabic && (
              <p
                className="font-arabic text-amber-200 text-right leading-relaxed"
                style={{ fontSize: `${current.arabicFontSize}px` }}
                dir="rtl"
              >
                بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ ﴿١﴾
              </p>
            )}
            {current.showTranslation && (
              <p
                className="text-emerald-100/90 leading-normal"
                style={{ fontSize: `${current.bengaliFontSize}px` }}
              >
                {language === 'bn' ? 'পরম করুণাময়, অসীম দয়ালু আল্লাহর নামে।' : 'In the name of Allah, the Entirely Merciful, the Especially Merciful.'}
              </p>
            )}
          </div>

          {/* Arabic Font Size Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-200">
                {language === 'bn' ? 'আরবি ফন্ট সাইজ' : 'Arabic Font Size'}
              </span>
              <span className="font-mono text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
                {current.arabicFontSize}px
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleUpdate({ arabicFontSize: Math.max(20, current.arabicFontSize - 2) })}
                className="w-10 h-10 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 font-bold flex items-center justify-center border border-emerald-700/50 cursor-pointer active:scale-95 text-base"
              >
                -
              </button>
              <input
                type="range"
                min="20"
                max="48"
                step="2"
                value={current.arabicFontSize}
                onChange={(e) => handleUpdate({ arabicFontSize: parseInt(e.target.value, 10) })}
                className="flex-1 accent-amber-400 cursor-pointer h-2 bg-emerald-950 rounded-lg"
              />
              <button
                onClick={() => handleUpdate({ arabicFontSize: Math.min(48, current.arabicFontSize + 2) })}
                className="w-10 h-10 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 font-bold flex items-center justify-center border border-emerald-700/50 cursor-pointer active:scale-95 text-base"
              >
                +
              </button>
            </div>
          </div>

          {/* Bengali Font Size Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-200">
                {language === 'bn' ? 'বাংলা অনুবাদ ফন্ট সাইজ' : 'Translation Font Size'}
              </span>
              <span className="font-mono text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
                {current.bengaliFontSize}px
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleUpdate({ bengaliFontSize: Math.max(12, current.bengaliFontSize - 1) })}
                className="w-10 h-10 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 font-bold flex items-center justify-center border border-emerald-700/50 cursor-pointer active:scale-95 text-base"
              >
                -
              </button>
              <input
                type="range"
                min="12"
                max="26"
                step="1"
                value={current.bengaliFontSize}
                onChange={(e) => handleUpdate({ bengaliFontSize: parseInt(e.target.value, 10) })}
                className="flex-1 accent-amber-400 cursor-pointer h-2 bg-emerald-950 rounded-lg"
              />
              <button
                onClick={() => handleUpdate({ bengaliFontSize: Math.min(26, current.bengaliFontSize + 1) })}
                className="w-10 h-10 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 font-bold flex items-center justify-center border border-emerald-700/50 cursor-pointer active:scale-95 text-base"
              >
                +
              </button>
            </div>
          </div>

          {/* Visibility Toggles */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => handleUpdate({ showArabic: !current.showArabic })}
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition ${
                current.showArabic
                  ? 'bg-emerald-900/70 border-amber-400 text-amber-300'
                  : 'bg-black/40 border-emerald-900/50 text-emerald-500'
              }`}
            >
              {current.showArabic && <Check className="w-3.5 h-3.5 text-amber-400" />}
              <span>{language === 'bn' ? 'আরবি টেক্সট' : 'Arabic Text'}</span>
            </button>
            <button
              onClick={() => handleUpdate({ showTranslation: !current.showTranslation })}
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition ${
                current.showTranslation
                  ? 'bg-emerald-900/70 border-amber-400 text-amber-300'
                  : 'bg-black/40 border-emerald-900/50 text-emerald-500'
              }`}
            >
              {current.showTranslation && <Check className="w-3.5 h-3.5 text-amber-400" />}
              <span>{language === 'bn' ? 'বাংলা অর্থ' : 'Translation'}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#021812] border-t border-emerald-800/60 flex items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-800/40 cursor-pointer transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'রিসেট ডিফল্ট' : 'Reset Defaults'}</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition cursor-pointer shadow-md"
          >
            {language === 'bn' ? 'সংরক্ষণ ও বন্ধ করুন' : 'Save & Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
