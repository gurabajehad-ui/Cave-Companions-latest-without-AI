import React from 'react';
import { BookMarked, ChevronRight, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface HisnulMuslimCardProps {
  onOpen: () => void;
}

export const HisnulMuslimCard: React.FC<HisnulMuslimCardProps> = ({ onOpen }) => {
  const { language } = useLanguage();

  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-[#03241b] via-[#021a13] to-[#03241b] hover:from-[#053f30]/90 hover:to-[#053f30]/90 border border-emerald-700/60 hover:border-amber-400/60 transition-all text-left cursor-pointer group active:scale-[0.99] shadow-md col-span-1 sm:col-span-2"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-700/80 via-emerald-800 to-teal-900 border border-amber-400/50 text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
          <BookMarked className="w-5 h-5 text-amber-300" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
              {language === 'bn' ? 'হিসনুল মুসলিম' : 'Hisnul Muslim'}
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30 font-bold flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" />
              HISNUL MUSLIM
            </span>
          </div>
          <span className="text-[10.5px] text-emerald-300/85 truncate block mt-0.5">
            {language === 'bn' ? 'দৈনন্দিন জীবনের সহীহ দো‘আ ও যিকর (কুরআন ও সুন্নাহ থেকে)' : 'Authentic Daily Du’as & Adhkar (From Quran & Sunnah)'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="hidden xs:inline-block text-[10px] font-semibold text-amber-300/90 bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-800/60">
          {language === 'bn' ? 'খুলুন' : 'Open'}
        </span>
        <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
};
