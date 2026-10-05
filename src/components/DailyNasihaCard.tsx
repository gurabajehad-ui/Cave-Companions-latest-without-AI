import React from 'react';
import { BookOpen } from 'lucide-react';
import { HADITHS } from '../data/prayerConfig';
import { useLanguage } from '../context/LanguageContext';

interface DailyNasihaCardProps {
  nasihaList?: any[];
  randomHadithIndex: number;
}

export const DailyNasihaCard: React.FC<DailyNasihaCardProps> = React.memo(({
  nasihaList = [],
  randomHadithIndex
}) => {
  const { t, language } = useLanguage();
  const activeSource = nasihaList && nasihaList.length > 0 ? nasihaList : HADITHS;
  const currentItem = activeSource[randomHadithIndex % activeSource.length];

  const text = language === 'bn' 
    ? currentItem?.textBn 
    : (currentItem?.textEn || currentItem?.textBn);

  const source = language === 'bn'
    ? currentItem?.sourceBn
    : (currentItem?.sourceEn || currentItem?.sourceBn);

  return (
    <div 
      style={{ contain: 'layout style', transform: 'translateZ(0)' }}
      className="rounded-2xl border border-[#0c4334] bg-[#022119] p-3.5 shadow-sm text-white"
    >
      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 mb-1.5">
        <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="tracking-wide text-[11px] font-bold">{t('prayer.dailyNasiha')}</span>
      </div>
      <p className="text-xs text-emerald-100/90 leading-relaxed font-normal">
        "{text}"
      </p>
      {source && (
        <div className="text-[10px] text-amber-300/90 text-right font-medium mt-1">
          — {source}
        </div>
      )}
    </div>
  );
});

