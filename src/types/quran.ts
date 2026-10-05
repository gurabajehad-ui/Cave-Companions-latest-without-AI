export type RevelationType = 'MAKKI' | 'MADANI';

export interface SurahMeta {
  number: number;
  nameAr: string;
  nameBn: string;
  nameEn: string;
  meaningBn: string;
  revelationType: RevelationType;
  revelationTypeBn: 'মাক্কী' | 'মাদানী';
  ayahCount: number;
  juzStart: number;
  pageStart: number;
}

export interface AyahItem {
  ayahNumber: number;
  arabicText: string;
  bengaliText: string;
  footnotes?: string;
  tafsir?: string;
  sajdah?: boolean;
  juzNumber?: number;
}

export interface SurahDetail {
  meta: SurahMeta;
  bismillah: boolean;
  ayahs: AyahItem[];
}

export interface QuranBookmark {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  surahNameBn: string;
  surahNameEn?: string;
  surahNameAr: string;
  arabicExcerpt: string;
  bengaliExcerpt: string;
  timestamp: number;
}

export interface QuranLastRead {
  surahNumber: number;
  ayahNumber: number;
  surahNameBn: string;
  surahNameEn?: string;
  surahNameAr: string;
  timestamp: number;
}

export interface QuranReadingSettings {
  arabicFontSize: number;
  bengaliFontSize: number;
  showTranslation: boolean;
  showArabic: boolean;
}

export interface QuranSearchResult {
  surahNumber: number;
  surahNameBn: string;
  surahNameEn?: string;
  surahNameAr: string;
  ayahNumber: number;
  arabicText: string;
  bengaliText: string;
  englishText?: string;
  matchType: 'surah' | 'translation';
}
