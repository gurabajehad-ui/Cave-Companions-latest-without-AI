// Client-side storage and calculation service for My Cave Journey features:
// - Sawm (Fasting) records
// - Quran reading time records
// - Tasbih logs
// - Realized Token Donation Impact calculations

export interface DailySawmRecord {
  date: string; // YYYY-MM-DD
  completed: boolean;
  type: 'fard' | 'ramadan' | 'sunnah' | 'nafil';
  note?: string;
  updatedAt: number;
}

export interface DailyQuranRecord {
  date: string; // YYYY-MM-DD
  minutes: number;
  surahsRead?: number[];
  updatedAt: number;
}

export interface DailyTasbihRecord {
  date: string; // YYYY-MM-DD
  count: number;
  updatedAt: number;
}

export interface DonationImpactData {
  totalPledgedCount: number;
  realizedCount: number;
  realizedAmountBn: string;
  realizedAmountEn: string;
  utilizationRate: number;
  pledgedTokensList: Array<{ id: string; name: string; amount: number; isRealized: boolean; date: string }>;
}

const SAWM_STORAGE_KEY = 'cave_sawm_records_v1';
const QURAN_STORAGE_KEY = 'cave_quran_time_records_v1';
const TASBIH_STORAGE_KEY = 'cave_tasbih_time_records_v1';

export const journeyDataService = {
  // --- SAWM (FASTING) ---
  getSawmRecords(): Record<string, DailySawmRecord> {
    try {
      const raw = localStorage.getItem(SAWM_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  getSawmRecord(dateStr: string): DailySawmRecord | null {
    const records = this.getSawmRecords();
    return records[dateStr] || null;
  },

  setSawmRecord(dateStr: string, completed: boolean, type: 'fard' | 'ramadan' | 'sunnah' | 'nafil' = 'fard', note?: string): DailySawmRecord {
    const records = this.getSawmRecords();
    const updatedRecord: DailySawmRecord = {
      date: dateStr,
      completed,
      type,
      note,
      updatedAt: Date.now()
    };
    records[dateStr] = updatedRecord;
    try {
      localStorage.setItem(SAWM_STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.warn('Failed to save sawm record:', e);
    }
    return updatedRecord;
  },

  getMonthlySawmCount(year: number, month: number): { completedDays: number; totalDays: number } {
    const records = this.getSawmRecords();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    let completed = 0;
    Object.keys(records).forEach(d => {
      if (d.startsWith(prefix) && records[d].completed) {
        completed++;
      }
    });
    const daysInMonth = new Date(year, month, 0).getDate();
    return { completedDays: completed, totalDays: daysInMonth };
  },

  // --- QURAN TIME ---
  getQuranRecords(): Record<string, DailyQuranRecord> {
    try {
      const raw = localStorage.getItem(QURAN_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  getQuranMinutes(dateStr: string): number {
    const records = this.getQuranRecords();
    return records[dateStr]?.minutes || 0;
  },

  addQuranMinutes(dateStr: string, addMinutes: number): number {
    const records = this.getQuranRecords();
    const current = records[dateStr]?.minutes || 0;
    const newTotal = current + addMinutes;
    records[dateStr] = {
      date: dateStr,
      minutes: newTotal,
      updatedAt: Date.now()
    };
    try {
      localStorage.setItem(QURAN_STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.warn('Failed to save quran time:', e);
    }
    return newTotal;
  },

  setQuranMinutes(dateStr: string, minutes: number): number {
    const records = this.getQuranRecords();
    records[dateStr] = {
      date: dateStr,
      minutes: minutes,
      updatedAt: Date.now()
    };
    try {
      localStorage.setItem(QURAN_STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.warn('Failed to save quran time:', e);
    }
    return minutes;
  },

  getMonthlyQuranMinutes(year: number, month: number): number {
    const records = this.getQuranRecords();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    let total = 0;
    Object.keys(records).forEach(d => {
      if (d.startsWith(prefix)) {
        total += records[d].minutes || 0;
      }
    });
    return total;
  },

  // --- TASBIH ---
  getTasbihRecords(): Record<string, DailyTasbihRecord> {
    try {
      const raw = localStorage.getItem(TASBIH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  getTasbihCount(dateStr: string): number {
    const records = this.getTasbihRecords();
    return records[dateStr]?.count || 0;
  },

  setTasbihCount(dateStr: string, count: number): number {
    const records = this.getTasbihRecords();
    records[dateStr] = {
      date: dateStr,
      count,
      updatedAt: Date.now()
    };
    try {
      localStorage.setItem(TASBIH_STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.warn('Failed to save tasbih count:', e);
    }
    return count;
  },

  addTasbihCount(dateStr: string, delta: number): number {
    const current = this.getTasbihCount(dateStr);
    return this.setTasbihCount(dateStr, Math.max(0, current + delta));
  },

  getMonthlyTasbihCount(year: number, month: number): number {
    const records = this.getTasbihRecords();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    let total = 0;
    Object.keys(records).forEach(d => {
      if (d.startsWith(prefix)) {
        total += records[d].count || 0;
      }
    });
    return total;
  },

  // --- TOKEN DONATION IMPACT CALCULATION ---
  calculateDonationImpact(myTokensData: any): DonationImpactData {
    if (!myTokensData) {
      return {
        totalPledgedCount: 0,
        realizedCount: 0,
        realizedAmountBn: '0',
        realizedAmountEn: '0',
        utilizationRate: 0,
        pledgedTokensList: []
      };
    }

    const availableTokens: any[] = myTokensData.availableTokens || myTokensData.available || [];
    const usedTokens: any[] = myTokensData.usedTokens || myTokensData.used || [];

    // All tokens where user selected "Donate Token"
    const pledgedAvailable = availableTokens.filter(t => t.isDonated === true || t.is_donated === true);
    const pledgedUsed = usedTokens.filter(t => t.isDonated === true || t.is_donated === true || (t.donatedAmount && Number(t.donatedAmount) > 0));

    const totalPledgedCount = pledgedAvailable.length + pledgedUsed.length;
    const realizedCount = pledgedUsed.length;

    let totalRealizedTk = 0;
    pledgedUsed.forEach(t => {
      const amt = Number(t.donatedAmount || t.donated_amount || t.discountAmount || t.tokenDiscountAmount || 0);
      totalRealizedTk += amt > 0 ? amt : 0;
    });

    const utilizationRate = totalPledgedCount > 0 ? Math.round((realizedCount / totalPledgedCount) * 100) : 0;

    const pledgedTokensList = [
      ...pledgedUsed.map(t => ({
        id: t.id || t.tokenId || 'token-used',
        name: t.tokenType || t.type || 'Donated Token',
        amount: Number(t.donatedAmount || t.donated_amount || t.discountAmount || 0),
        isRealized: true,
        date: t.usedAt || t.used_at || t.createdAt || 'Used'
      })),
      ...pledgedAvailable.map(t => ({
        id: t.id || t.tokenId || 'token-available',
        name: t.tokenType || t.type || 'Donated Token',
        amount: Number(t.donatedAmount || t.donated_amount || 0),
        isRealized: false,
        date: t.createdAt || 'Pledged'
      }))
    ];

    return {
      totalPledgedCount,
      realizedCount,
      realizedAmountBn: totalRealizedTk.toLocaleString('bn-BD'),
      realizedAmountEn: totalRealizedTk.toLocaleString('en-US'),
      utilizationRate,
      pledgedTokensList
    };
  }
};
