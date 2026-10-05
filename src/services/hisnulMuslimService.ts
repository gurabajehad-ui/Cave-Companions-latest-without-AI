import { HisnulMuslimChapter, HisnulMuslimDua } from '../types';
import { HISNUL_MUSLIM_CHAPTERS, HISNUL_MUSLIM_DUAS, HISNUL_MUSLIM_SOURCE_INFO } from '../data/hisnulMuslimData';

const BOOKMARKS_STORAGE_KEY = 'cave_hisnul_muslim_bookmarks_v1';
const FONT_SIZE_STORAGE_KEY = 'cave_hisnul_muslim_font_scale_v1';

export interface HisnulMuslimFontSettings {
  arabicScale: number; // default 1 (e.g. text-xl/2xl), range 0.8 to 1.6
  banglaScale: number;  // default 1 (e.g. text-sm), range 0.8 to 1.5
}

class HisnulMuslimService {
  private chapters: HisnulMuslimChapter[] = HISNUL_MUSLIM_CHAPTERS;
  private duas: HisnulMuslimDua[] = HISNUL_MUSLIM_DUAS;

  public getChapters(): HisnulMuslimChapter[] {
    return this.chapters;
  }

  public getDuasByChapter(chapterId: string): HisnulMuslimDua[] {
    return this.duas.filter(d => d.chapter_id === chapterId);
  }

  public getDuaById(id: string): HisnulMuslimDua | undefined {
    return this.duas.find(d => d.id === id);
  }

  public getAllDuas(): HisnulMuslimDua[] {
    return this.duas;
  }

  public getSourceInfo() {
    return HISNUL_MUSLIM_SOURCE_INFO;
  }

  /**
   * Fast, multi-field search across Arabic, Bangla title, Bangla translation, Dua number, chapter
   */
  public searchDuas(query: string): HisnulMuslimDua[] {
    if (!query || !query.trim()) return [];
    const q = query.trim().toLowerCase();

    // Convert digits to standard for matching numbers
    const bnDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
    const enQueryNum = q.replace(/[০-৯]/g, d => bnDigits.indexOf(d).toString());

    return this.duas.filter(dua => {
      // 1. Dua number match
      if (dua.dua_number.toString() === enQueryNum || `dua_${dua.dua_number}` === enQueryNum) {
        return true;
      }
      // 2. Bangla title match
      if (dua.title_bn.toLowerCase().includes(q)) return true;
      // 3. Chapter title match
      if (dua.chapter_title && dua.chapter_title.toLowerCase().includes(q)) return true;
      // 4. Bangla translation match
      if (dua.translation_bn.toLowerCase().includes(q)) return true;
      // 5. Transliteration match
      if (dua.transliteration && dua.transliteration.toLowerCase().includes(q)) return true;
      // 6. Arabic text match
      if (dua.arabic_text.includes(q)) return true;

      return false;
    });
  }

  /**
   * Bookmark Management via localStorage
   */
  public getBookmarks(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  public isBookmarked(duaId: string): boolean {
    const list = this.getBookmarks();
    return list.includes(duaId);
  }

  public toggleBookmark(duaId: string): boolean {
    if (typeof window === 'undefined') return false;
    const list = this.getBookmarks();
    const index = list.indexOf(duaId);
    let nextList: string[] = [];
    let isNowBookmarked = false;

    if (index >= 0) {
      nextList = list.filter(id => id !== duaId);
      isNowBookmarked = false;
    } else {
      nextList = [...list, duaId];
      isNowBookmarked = true;
    }

    try {
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(nextList));
    } catch (e) {
      console.error('Failed to save Hisnul Muslim bookmark:', e);
    }
    return isNowBookmarked;
  }

  public getBookmarkedDuas(): HisnulMuslimDua[] {
    const bookmarkIds = new Set(this.getBookmarks());
    return this.duas.filter(d => bookmarkIds.has(d.id));
  }

  /**
   * Font scale settings
   */
  public getFontSettings(): HisnulMuslimFontSettings {
    if (typeof window === 'undefined') return { arabicScale: 1, banglaScale: 1 };
    try {
      const saved = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // fallback
    }
    return { arabicScale: 1, banglaScale: 1 };
  }

  public saveFontSettings(settings: HisnulMuslimFontSettings): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save Hisnul Muslim font settings:', e);
    }
  }
}

export const hisnulMuslimService = new HisnulMuslimService();
