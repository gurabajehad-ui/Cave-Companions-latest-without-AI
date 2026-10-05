import { query, getClient } from './pg.js';
import { getTodayDateString, getYesterdayDateString, isFriday, getDhakaDate } from './timezone.js';

export interface JourneyMilestone {
  id: string;
  titleBn: string;
  titleEn?: string;
  descBn: string;
  descEn?: string;
  icon: string;
  target: number;
  current: number;
  unlocked: boolean;
  unlockedAt?: string;
  category: 'streak' | 'total' | 'perfect_day';
}

export interface DayPrayerItem {
  type: 'fajr' | 'dhuhr' | 'jumuah' | 'asr' | 'maghrib' | 'isha';
  nameBn: string;
  completed: boolean;
  mosqueName?: string;
  verifiedAt?: string;
  timeBn?: string;
}

export interface CalendarDayInfo {
  date: string;
  dayNumber: number;
  dayNameBn: string;
  isFriday: boolean;
  isToday: boolean;
  isFuture: boolean;
  completedCount: number;
  totalPrayers: number;
  level: 'EXCELLENT' | 'VERY_GOOD' | 'MODERATE' | 'NEEDS_IMPROVEMENT' | 'NONE';
  tokenEarned: 'GOLD' | 'SILVER' | 'BRONZE' | null;
  prayers: DayPrayerItem[];
}

export interface ChartDataPoint {
  label: string;
  date: string;
  completed: number;
  total: number;
  percentage: number;
}

export class SalahJourneyService {
  // 1. Get or create journey settings
  static async getJourneySettings(userId: string) {
    const res = await query(`
      SELECT * FROM user_salah_journeys WHERE user_id = $1
    `, [userId]);

    if (res.rows.length > 0) {
      const row = res.rows[0];
      return {
        userId: row.user_id,
        journeyStartDate: row.journey_start_date || '',
        archivedJourneys: typeof row.archived_journeys === 'string' 
          ? JSON.parse(row.archived_journeys) 
          : (row.archived_journeys || [])
      };
    }

    // Initialize with default
    await query(`
      INSERT INTO user_salah_journeys (user_id, journey_start_date, archived_journeys)
      VALUES ($1, '', '[]'::jsonb)
      ON CONFLICT (user_id) DO NOTHING
    `, [userId]);

    return {
      userId,
      journeyStartDate: '',
      archivedJourneys: []
    };
  }

  // 2. Start a New Journey (Archive past data)
  static async startNewJourney(userId: string) {
    const settings = await this.getJourneySettings(userId);
    const todayStr = getTodayDateString();

    // Calculate stats of active journey before archiving
    const summary = await this.getJourneySummary(userId, true);

    const archiveEntry = {
      id: `JRN_${Date.now()}`,
      startDate: settings.journeyStartDate || summary.earliestDate || todayStr,
      endDate: todayStr,
      archivedAt: new Date().toISOString(),
      totalPrayersCompleted: summary.totalCompletedPrayers,
      perfectDaysCount: summary.perfectDaysCount,
      bestStreak: summary.bestStreak
    };

    const updatedArchives = [...settings.archivedJourneys, archiveEntry];

    await query(`
      UPDATE user_salah_journeys 
      SET journey_start_date = $2, archived_journeys = $3, updated_at = NOW()
      WHERE user_id = $1
    `, [userId, todayStr, JSON.stringify(updatedArchives)]);

    return {
      success: true,
      journeyStartDate: todayStr,
      archivedCount: updatedArchives.length,
      message: 'নতুন সালাত জার্নি সফলভাবে শুরু হয়েছে।'
    };
  }

  // 3. Get comprehensive Journey Summary & Growth Dashboard
  static async getJourneySummary(userId: string, ignoreActiveDateFilter = false) {
    const settings = await this.getJourneySettings(userId);
    const todayStr = getTodayDateString();
    const yesterdayStr = getYesterdayDateString();

    let dateCondition = '';
    const params: any[] = [userId];

    if (!ignoreActiveDateFilter && settings.journeyStartDate) {
      params.push(settings.journeyStartDate);
      dateCondition = `AND date >= $${params.length}`;
    }

    // Fetch all attendances for the user in active journey
    const attRes = await query(`
      SELECT * FROM prayer_attendances 
      WHERE user_id = $1 ${dateCondition}
      ORDER BY date ASC, verified_at ASC
    `, params);

    const attendances = attRes.rows;
    const totalCompletedPrayers = attendances.length;

    // Group by date
    const dateMap: Record<string, { count: number; prayers: Set<string>; attendances: any[] }> = {};
    const prayerDistribution: Record<string, number> = {
      fajr: 0,
      dhuhr: 0,
      jumuah: 0,
      asr: 0,
      maghrib: 0,
      isha: 0
    };

    attendances.forEach(att => {
      const d = att.date;
      if (!dateMap[d]) {
        dateMap[d] = { count: 0, prayers: new Set(), attendances: [] };
      }
      dateMap[d].count += 1;
      dateMap[d].prayers.add(att.prayer_type);
      dateMap[d].attendances.push(att);

      const pType = (att.prayer_type || '').toLowerCase();
      if (prayerDistribution[pType] !== undefined) {
        prayerDistribution[pType] += 1;
      }
    });

    const recordedDates = Object.keys(dateMap).sort();
    const earliestDate = recordedDates.length > 0 ? recordedDates[0] : todayStr;

    // Calculate Perfect Days (count >= 5)
    let perfectDaysCount = 0;
    Object.values(dateMap).forEach(d => {
      if (d.count >= 5) perfectDaysCount += 1;
    });

    // Calculate Streaks (5/5 perfect days)
    const { currentStreak, bestStreak } = this.calculateStreaks(dateMap, todayStr, yesterdayStr);

    // Calculate Perfect Weeks (calendar weeks with 35/35 prayers)
    const perfectWeeksCount = this.calculatePerfectWeeks(dateMap);

    // Calculate Weekly Metrics (This Week vs Previous Week - Saturday to Friday or 7-day window)
    const weekStats = this.calculateWeekComparison(dateMap, todayStr);

    // Calculate Monthly Metrics
    const monthStats = this.calculateMonthComparison(dateMap, todayStr);

    // Calculate Consistency Score (0 - 100%)
    const consistencyScore = this.calculateConsistencyScore(dateMap, settings.journeyStartDate || earliestDate, todayStr, totalCompletedPrayers);

    // Generate Smart Data-driven Insights
    const insights = this.generateSmartInsights({
      totalCompletedPrayers,
      perfectDaysCount,
      currentStreak,
      bestStreak,
      prayerDistribution,
      weekStats,
      dateMap,
      todayStr
    });

    // Generate Practical Islamic Recommendations
    const recommendations = this.generateRecommendations({
      prayerDistribution,
      currentStreak,
      weekStats,
      totalCompletedPrayers
    });

    // Calculate Milestones & Achievements
    const milestones = this.calculateMilestones({
      totalCompletedPrayers,
      perfectDaysCount,
      bestStreak,
      currentStreak
    });

    // Recovery Mode Detection: active in past but dropped significantly recently
    const showRecoveryMode = this.detectRecoveryMode(dateMap, todayStr, totalCompletedPrayers);

    // Compact Teaser for Home Card
    const teaser = this.generateHomeTeaser(weekStats, currentStreak, totalCompletedPrayers);

    return {
      success: true,
      journeyStartDate: settings.journeyStartDate || earliestDate,
      earliestDate,
      totalCompletedPrayers,
      todayCompletedPrayers: dateMap[todayStr]?.count || 0,
      perfectDaysCount,
      perfectWeeksCount,
      currentStreak,
      bestStreak,
      consistencyScore,
      weekStats,
      monthStats,
      prayerDistribution,
      insights,
      recommendations,
      milestones,
      showRecoveryMode,
      teaser,
      archivedJourneysCount: settings.archivedJourneys.length
    };
  }

  // 4. Get Period Analytics & Graph Data
  static async getJourneyAnalytics(
    userId: string,
    period: 'week' | 'month' | 'year' | 'custom',
    startDateParam?: string,
    endDateParam?: string
  ) {
    const todayStr = getTodayDateString();
    let startDate = startDateParam || '';
    let endDate = endDateParam || todayStr;

    const todayDate = new Date(todayStr + 'T12:00:00Z');

    if (period === 'week') {
      const start = new Date(todayDate);
      start.setUTCDate(todayDate.getUTCDate() - 6);
      startDate = start.toISOString().split('T')[0];
      endDate = todayStr;
    } else if (period === 'month') {
      const start = new Date(todayDate);
      start.setUTCDate(todayDate.getUTCDate() - 29);
      startDate = start.toISOString().split('T')[0];
      endDate = todayStr;
    } else if (period === 'year') {
      const start = new Date(todayDate);
      start.setUTCDate(todayDate.getUTCDate() - 364);
      startDate = start.toISOString().split('T')[0];
      endDate = todayStr;
    }

    // Fetch attendances in range
    const attRes = await query(`
      SELECT * FROM prayer_attendances 
      WHERE user_id = $1 AND date >= $2 AND date <= $3
      ORDER BY date ASC, verified_at ASC
    `, [userId, startDate, endDate]);

    const attendances = attRes.rows;
    const dateMap: Record<string, number> = {};
    attendances.forEach(att => {
      dateMap[att.date] = (dateMap[att.date] || 0) + 1;
    });

    // Generate date series for charts
    const chartData: ChartDataPoint[] = [];
    const curr = new Date(startDate + 'T12:00:00Z');
    const end = new Date(endDate + 'T12:00:00Z');

    let totalDays = 0;
    while (curr <= end && totalDays <= 370) {
      const dStr = curr.toISOString().split('T')[0];
      const completed = dateMap[dStr] || 0;
      const total = 5;
      const percentage = Math.round((completed / total) * 100);

      const dayMonthLabel = formatShortDateBn(dStr);
      chartData.push({
        label: dayMonthLabel,
        date: dStr,
        completed,
        total,
        percentage
      });

      curr.setUTCDate(curr.getUTCDate() + 1);
      totalDays++;
    }

    const totalPossible = Math.max(1, chartData.length * 5);
    const totalCompleted = attendances.length;
    const completionPercentage = Math.round((totalCompleted / totalPossible) * 100);

    // Calculate previous period for comparison
    const periodDays = chartData.length;
    const prevEnd = new Date(new Date(startDate + 'T12:00:00Z').getTime() - 24 * 60 * 60 * 1000);
    const prevStart = new Date(prevEnd.getTime() - (periodDays - 1) * 24 * 60 * 60 * 1000);
    const prevStartStr = prevStart.toISOString().split('T')[0];
    const prevEndStr = prevEnd.toISOString().split('T')[0];

    const prevRes = await query(`
      SELECT COUNT(*) as count FROM prayer_attendances 
      WHERE user_id = $1 AND date >= $2 AND date <= $3
    `, [userId, prevStartStr, prevEndStr]);

    const prevCompleted = Number(prevRes.rows[0]?.count || 0);
    const prevPossible = Math.max(1, periodDays * 5);
    const prevPercentage = Math.round((prevCompleted / prevPossible) * 100);

    const diff = completionPercentage - prevPercentage;
    let direction: 'UP' | 'DOWN' | 'SAME' = 'SAME';
    let trendText = 'পূর্ববর্তী সময়ের সমান রয়েছে';
    if (diff > 0) {
      direction = 'UP';
      trendText = `পূর্ববর্তী সময়ের তুলনায় ↑ ${toBnNumber(diff)}% উন্নতি`;
    } else if (diff < 0) {
      direction = 'DOWN';
      trendText = `পূর্ববর্তী সময়ের তুলনায় ↓ ${toBnNumber(Math.abs(diff))}% হ্রাস`;
    }

    return {
      success: true,
      period,
      startDate,
      endDate,
      totalPossible,
      totalCompleted,
      completionPercentage,
      previousPeriod: {
        startDate: prevStartStr,
        endDate: prevEndStr,
        totalPossible: prevPossible,
        totalCompleted: prevCompleted,
        completionPercentage: prevPercentage
      },
      improvementRate: {
        diff,
        direction,
        textBn: trendText
      },
      chartData
    };
  }

  // 5. Get Month Calendar Data
  static async getJourneyCalendar(userId: string, year: number, month: number) {
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;
    const todayStr = getTodayDateString();

    const attRes = await query(`
      SELECT * FROM prayer_attendances 
      WHERE user_id = $1 AND date LIKE $2
      ORDER BY date ASC, verified_at ASC
    `, [userId, `${prefix}-%`]);

    const attendances = attRes.rows;
    const dateMap: Record<string, any[]> = {};
    attendances.forEach(att => {
      if (!dateMap[att.date]) dateMap[att.date] = [];
      dateMap[att.date].push(att);
    });

    const daysInMonth = new Date(year, month, 0).getDate();
    const days: CalendarDayInfo[] = [];

    const bnDayNames = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;
      const dayDate = new Date(year, month - 1, day);
      const isFri = isFriday(dStr);
      const dayName = bnDayNames[dayDate.getDay()];
      const isToday = dStr === todayStr;
      const isFuture = dStr > todayStr;

      const dayAtts = dateMap[dStr] || [];
      const completedCount = dayAtts.length;

      let level: 'EXCELLENT' | 'VERY_GOOD' | 'MODERATE' | 'NEEDS_IMPROVEMENT' | 'NONE' = 'NONE';
      if (completedCount >= 5) level = 'EXCELLENT';
      else if (completedCount === 4) level = 'VERY_GOOD';
      else if (completedCount === 3) level = 'MODERATE';
      else if (completedCount >= 1) level = 'NEEDS_IMPROVEMENT';

      let tokenEarned: 'GOLD' | 'SILVER' | 'BRONZE' | null = null;
      if (completedCount >= 5) tokenEarned = 'GOLD';
      else if (completedCount === 4) tokenEarned = 'SILVER';
      else if (completedCount === 3) tokenEarned = 'BRONZE';

      // Build 5 prayers list for this day
      const prayerTypes: Array<'fajr' | 'dhuhr' | 'jumuah' | 'asr' | 'maghrib' | 'isha'> = isFri
        ? ['fajr', 'jumuah', 'asr', 'maghrib', 'isha']
        : ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

      const prayerNamesBn: Record<string, string> = {
        fajr: 'ফজর',
        dhuhr: 'যোহর',
        jumuah: 'জুমআ',
        asr: 'আসর',
        maghrib: 'মাগরিব',
        isha: 'এশা'
      };
      const prayerNamesEn: Record<string, string> = {
        fajr: 'Fajr',
        dhuhr: 'Dhuhr',
        jumuah: "Jum'ah",
        asr: 'Asr',
        maghrib: 'Maghrib',
        isha: 'Isha'
      };

      const prayers: DayPrayerItem[] = prayerTypes.map(pType => {
        const found = dayAtts.find(a => a.prayer_type === pType || (isFri && pType === 'jumuah' && a.prayer_type === 'dhuhr') || (!isFri && pType === 'dhuhr' && a.prayer_type === 'jumuah'));
        return {
          type: pType,
          nameBn: prayerNamesBn[pType] || pType,
          nameEn: prayerNamesEn[pType] || pType,
          completed: !!found,
          mosqueName: found?.mosque_name || undefined,
          verifiedAt: found?.verified_at ? new Date(found.verified_at).toISOString() : undefined,
          timeBn: found?.verified_at ? formatTimeBengali(found.verified_at) : undefined,
          timeEn: found?.verified_at ? new Date(found.verified_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : undefined
        };
      });

      days.push({
        date: dStr,
        dayNumber: day,
        dayNameBn: dayName,
        isFriday: isFri,
        isToday,
        isFuture,
        completedCount,
        totalPrayers: 5,
        level,
        tokenEarned,
        prayers
      });
    }

    return {
      success: true,
      year,
      month,
      daysInMonth,
      days
    };
  }

  // 6. Get Day Detail
  static async getJourneyDayDetail(userId: string, dateStr: string) {
    const isFri = isFriday(dateStr);
    const attRes = await query(`
      SELECT * FROM prayer_attendances 
      WHERE user_id = $1 AND date = $2
      ORDER BY verified_at ASC
    `, [userId, dateStr]);

    const dayAtts = attRes.rows;
    const completedCount = dayAtts.length;

    let tokenEarned: 'GOLD' | 'SILVER' | 'BRONZE' | null = null;
    if (completedCount >= 5) tokenEarned = 'GOLD';
    else if (completedCount === 4) tokenEarned = 'SILVER';
    else if (completedCount === 3) tokenEarned = 'BRONZE';

    const prayerTypes: Array<'fajr' | 'dhuhr' | 'jumuah' | 'asr' | 'maghrib' | 'isha'> = isFri
      ? ['fajr', 'jumuah', 'asr', 'maghrib', 'isha']
      : ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

    const prayerNamesBn: Record<string, string> = {
      fajr: 'ফজর',
      dhuhr: 'যোহর',
      jumuah: 'জুমআ',
      asr: 'আসর',
      maghrib: 'মাগরিব',
      isha: 'এশা'
    };
    const prayerNamesEn: Record<string, string> = {
      fajr: 'Fajr',
      dhuhr: 'Dhuhr',
      jumuah: "Jum'ah",
      asr: 'Asr',
      maghrib: 'Maghrib',
      isha: 'Isha'
    };

    const prayers: DayPrayerItem[] = prayerTypes.map(pType => {
      const found = dayAtts.find(a => a.prayer_type === pType || (isFri && pType === 'jumuah' && a.prayer_type === 'dhuhr') || (!isFri && pType === 'dhuhr' && a.prayer_type === 'jumuah'));
      return {
        type: pType,
        nameBn: prayerNamesBn[pType] || pType,
        nameEn: prayerNamesEn[pType] || pType,
        completed: !!found,
        mosqueName: found?.mosque_name || undefined,
        verifiedAt: found?.verified_at ? new Date(found.verified_at).toISOString() : undefined,
        timeBn: found?.verified_at ? formatTimeBengali(found.verified_at) : undefined,
        timeEn: found?.verified_at ? new Date(found.verified_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : undefined
      };
    });

    return {
      success: true,
      date: dateStr,
      isFriday: isFri,
      completedCount,
      totalPrayers: 5,
      tokenEarned,
      prayers,
      summaryText: `এই দিনে মোট ${toBnNumber(completedCount)}/৫ ওয়াক্ত সালাত জামাতে আদায় হয়েছে।`
    };
  }

  // 7. Delete specific day history
  static async deleteHistoryDay(userId: string, dateStr: string) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query(`
        DELETE FROM prayer_attendances WHERE user_id = $1 AND date = $2
      `, [userId, dateStr]);

      await client.query('COMMIT');
      return { success: true, message: `${dateStr} তারিখের সালাত ইতিহাস সফলভাবে মুছে ফেলা হয়েছে।` };
    } catch (e: any) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // 8. Delete date range history
  static async deleteHistoryRange(userId: string, startDate: string, endDate: string) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const delAtt = await client.query(`
        DELETE FROM prayer_attendances 
        WHERE user_id = $1 AND date >= $2 AND date <= $3
      `, [userId, startDate, endDate]);

      await client.query('COMMIT');
      return { 
        success: true, 
        deletedCount: delAtt.rowCount || 0,
        message: `${startDate} থেকে ${endDate} পর্যন্ত সালাত ইতিহাস সফলভাবে মুছে ফেলা হয়েছে।` 
      };
    } catch (e: any) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // 9. Delete all history
  static async deleteHistoryAll(userId: string) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM prayer_attendances WHERE user_id = $1`, [userId]);
      await client.query(`
        UPDATE user_salah_journeys 
        SET journey_start_date = '', archived_journeys = '[]'::jsonb, updated_at = NOW() 
        WHERE user_id = $1
      `, [userId]);

      await client.query('COMMIT');
      return { success: true, message: 'আপনার সম্পূর্ণ সালাত ইতিহাস সফলভাবে মুছে ফেলা হয়েছে।' };
    } catch (e: any) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // ----------------------------------------------------
  // Helper algorithms
  // ----------------------------------------------------

  private static calculateStreaks(
    dateMap: Record<string, { count: number }>,
    todayStr: string,
    yesterdayStr: string
  ) {
    const dates = Object.keys(dateMap).sort();
    if (dates.length === 0) return { currentStreak: 0, bestStreak: 0 };

    // Calculate Best Streak across all recorded dates
    let bestStreak = 0;
    let tempStreak = 0;
    let prevDateObj: Date | null = null;

    for (const dStr of dates) {
      const isPerfect = (dateMap[dStr]?.count || 0) >= 5;
      const currDateObj = new Date(dStr + 'T12:00:00Z');

      if (isPerfect) {
        if (!prevDateObj) {
          tempStreak = 1;
        } else {
          const diffDays = Math.round((currDateObj.getTime() - prevDateObj.getTime()) / (24 * 60 * 60 * 1000));
          if (diffDays === 1) {
            tempStreak += 1;
          } else {
            tempStreak = 1;
          }
        }
        prevDateObj = currDateObj;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      } else {
        tempStreak = 0;
        prevDateObj = null;
      }
    }

    // Calculate Current Streak
    let currentStreak = 0;
    const todayCount = dateMap[todayStr]?.count || 0;
    let checkDateObj = new Date(todayStr + 'T12:00:00Z');

    if (todayCount >= 5) {
      // Streak includes today
      while (true) {
        const dStr = checkDateObj.toISOString().split('T')[0];
        if ((dateMap[dStr]?.count || 0) >= 5) {
          currentStreak++;
          checkDateObj.setUTCDate(checkDateObj.getUTCDate() - 1);
        } else {
          break;
        }
      }
    } else {
      // Today is still ongoing; check from yesterday
      checkDateObj = new Date(yesterdayStr + 'T12:00:00Z');
      while (true) {
        const dStr = checkDateObj.toISOString().split('T')[0];
        if ((dateMap[dStr]?.count || 0) >= 5) {
          currentStreak++;
          checkDateObj.setUTCDate(checkDateObj.getUTCDate() - 1);
        } else {
          break;
        }
      }
    }

    return {
      currentStreak,
      bestStreak: Math.max(bestStreak, currentStreak)
    };
  }

  private static calculatePerfectWeeks(dateMap: Record<string, { count: number }>) {
    let perfectWeeks = 0;
    const dates = Object.keys(dateMap).sort();
    if (dates.length < 7) return 0;

    // Group dates by ISO calendar week
    const weekMap: Record<string, number> = {};
    dates.forEach(dStr => {
      if ((dateMap[dStr]?.count || 0) >= 5) {
        const d = new Date(dStr + 'T12:00:00Z');
        const year = d.getUTCFullYear();
        const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
        const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getUTCDay() + 1) / 7);
        const key = `${year}-W${weekNum}`;
        weekMap[key] = (weekMap[key] || 0) + 1;
      }
    });

    Object.values(weekMap).forEach(cnt => {
      if (cnt >= 7) perfectWeeks++;
    });

    return perfectWeeks;
  }

  private static calculateWeekComparison(dateMap: Record<string, { count: number }>, todayStr: string) {
    const today = new Date(todayStr + 'T12:00:00Z');
    let thisWeekCompleted = 0;
    let prevWeekCompleted = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      const dStr = d.toISOString().split('T')[0];
      thisWeekCompleted += dateMap[dStr]?.count || 0;
    }

    for (let i = 7; i < 14; i++) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      const dStr = d.toISOString().split('T')[0];
      prevWeekCompleted += dateMap[dStr]?.count || 0;
    }

    const totalPossible = 35;
    const completionPercentage = Math.round((thisWeekCompleted / totalPossible) * 100);
    const prevPercentage = Math.round((prevWeekCompleted / totalPossible) * 100);
    const diff = completionPercentage - prevPercentage;

    let direction: 'UP' | 'DOWN' | 'SAME' = 'SAME';
    let textBn = 'গত সপ্তাহের সমান';
    if (diff > 0) {
      direction = 'UP';
      textBn = `গত সপ্তাহের তুলনায় ↑ ${toBnNumber(diff)}% উন্নতি`;
    } else if (diff < 0) {
      direction = 'DOWN';
      textBn = `গত সপ্তাহের তুলনায় ↓ ${toBnNumber(Math.abs(diff))}% হ্রাস`;
    }

    return {
      thisWeekCompleted,
      prevWeekCompleted,
      totalPossible,
      completionPercentage,
      prevPercentage,
      diff,
      direction,
      textBn
    };
  }

  private static calculateMonthComparison(dateMap: Record<string, { count: number }>, todayStr: string) {
    const today = new Date(todayStr + 'T12:00:00Z');
    let thisMonthCompleted = 0;
    let prevMonthCompleted = 0;

    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      const dStr = d.toISOString().split('T')[0];
      thisMonthCompleted += dateMap[dStr]?.count || 0;
    }

    for (let i = 30; i < 60; i++) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      const dStr = d.toISOString().split('T')[0];
      prevMonthCompleted += dateMap[dStr]?.count || 0;
    }

    const totalPossible = 150;
    const completionPercentage = Math.round((thisMonthCompleted / totalPossible) * 100);
    const prevPercentage = Math.round((prevMonthCompleted / totalPossible) * 100);
    const diff = completionPercentage - prevPercentage;

    let direction: 'UP' | 'DOWN' | 'SAME' = 'SAME';
    let textBn = 'পূর্ববর্তী ৩০ দিনের সমান';
    if (diff > 0) {
      direction = 'UP';
      textBn = `পূর্ববর্তী মাসের তুলনায় ↑ ${toBnNumber(diff)}% উন্নতি`;
    } else if (diff < 0) {
      direction = 'DOWN';
      textBn = `পূর্ববর্তী মাসের তুলনায় ↓ ${toBnNumber(Math.abs(diff))}% হ্রাস`;
    }

    return {
      thisMonthCompleted,
      prevMonthCompleted,
      totalPossible,
      completionPercentage,
      diff,
      direction,
      textBn
    };
  }

  private static calculateConsistencyScore(
    dateMap: Record<string, { count: number }>,
    startDateStr: string,
    todayStr: string,
    totalCompleted: number
  ) {
    if (totalCompleted === 0) {
      return {
        score: 0,
        level: 'NO_DATA',
        ratingBn: 'এখনও পর্যাপ্ত তথ্য নেই',
        messageBn: 'মসজিদে জামাতে সালাত আদায় ও ভেরিফাই করলে স্কোর কার্যকর হবে।'
      };
    }

    // Evaluate over the last 30 days or active period
    const startObj = new Date(startDateStr + 'T12:00:00Z');
    const todayObj = new Date(todayStr + 'T12:00:00Z');
    const daysTracked = Math.min(30, Math.max(1, Math.round((todayObj.getTime() - startObj.getTime()) / (24 * 60 * 60 * 1000)) + 1));
    const potentialPrayers = daysTracked * 5;

    let recentCompleted = 0;
    for (let i = 0; i < daysTracked; i++) {
      const d = new Date(todayObj);
      d.setUTCDate(todayObj.getUTCDate() - i);
      const dStr = d.toISOString().split('T')[0];
      recentCompleted += dateMap[dStr]?.count || 0;
    }

    const rawScore = Math.min(100, Math.round((recentCompleted / potentialPrayers) * 100));

    if (rawScore >= 90) {
      return {
        score: rawScore,
        level: 'EXCELLENT',
        ratingBn: 'অসাধারণ ধারাবাহিকতা (Excellent)',
        messageBn: 'মাশাআল্লাহ! আপনি প্রায় প্রতিটি ওয়াক্তই নিষ্ঠার সাথে জামাতে আদায় করছেন।'
      };
    } else if (rawScore >= 70) {
      return {
        score: rawScore,
        level: 'VERY_GOOD',
        ratingBn: 'খুব ভালো অগ্রগতি (Very Good)',
        messageBn: 'আলহামদুলিল্লাহ! আপনার সালাতের অভ্যাস চমৎকারভাবে গড়ে উঠছে।'
      };
    } else if (rawScore >= 40) {
      return {
        score: rawScore,
        level: 'IMPROVEMENT_NEEDED',
        ratingBn: 'উন্নতির দারুণ সম্ভাবনা',
        messageBn: 'ছোট ছোট উন্নতিও গুরুত্বপূর্ণ। প্রতিদিন অন্তত আরও ১টি সালাত জামাতে পড়ার চেষ্টা করুন।'
      };
    } else {
      return {
        score: Math.max(10, rawScore),
        level: 'START_AGAIN',
        ratingBn: 'আজ থেকেই নতুন উদ্যমে',
        messageBn: 'অতীত ভুলে আজ থেকেই আবার শুরু করুন। ইনশাআল্লাহ আপনার ধারাবাহিকতা বৃদ্ধি পাবে।'
      };
    }
  }

  private static generateSmartInsights(params: {
    totalCompletedPrayers: number;
    perfectDaysCount: number;
    currentStreak: number;
    bestStreak: number;
    prayerDistribution: Record<string, number>;
    weekStats: any;
    dateMap: Record<string, { count: number }>;
    todayStr: string;
  }) {
    const insights: string[] = [];
    const { totalCompletedPrayers, perfectDaysCount, currentStreak, prayerDistribution, weekStats, dateMap, todayStr } = params;

    if (totalCompletedPrayers === 0) {
      insights.push('আপনার সালাত জার্নিতে স্বাগতম। মসজিদে জামাতে সালাত যাচাইয়ের মাধ্যমে আপনার ধারাবাহিকতা রেকর্ড করুন।');
      return insights;
    }

    // Today's insight
    const todayCount = dateMap[todayStr]?.count || 0;
    if (todayCount === 5) {
      insights.push('আপনি আজ ৫/৫ ওয়াক্ত সালাত সম্পন্ন করেছেন। আলহামদুলিল্লাহ!');
    } else if (todayCount > 0) {
      insights.push(`আজ আপনি ${toBnNumber(todayCount)}/৫ ওয়াক্ত সালাত আদায় করেছেন। বাকি ওয়াক্তগুলোতে জামাতে উপস্থিত থাকুন।`);
    }

    // Streak insight
    if (currentStreak >= 3) {
      insights.push(`মাশাআল্লাহ! আপনার টানা ${toBnNumber(currentStreak)} দিনের পূর্ণ ধারাবাহিকতা বজায় রয়েছে 🔥`);
    }

    // Week comparison insight
    if (weekStats.diff > 0) {
      insights.push(`আপনি গত সপ্তাহের তুলনায় ${toBnNumber(weekStats.diff)}% বেশি সালাত আদায় করেছেন।`);
    } else if (weekStats.thisWeekCompleted >= 25) {
      insights.push(`এই সপ্তাহে আপনি ${toBnNumber(weekStats.thisWeekCompleted)}/৩৫ ওয়াক্ত সালাত আদায় করেছেন, যা অত্যন্ত প্রশংসনীয়।`);
    }

    // Weakest / Strongest prayer insight
    const prayers = [
      { key: 'fajr', name: 'ফজর', count: prayerDistribution.fajr || 0 },
      { key: 'dhuhr', name: 'যোহর', count: (prayerDistribution.dhuhr || 0) + (prayerDistribution.jumuah || 0) },
      { key: 'asr', name: 'আসর', count: prayerDistribution.asr || 0 },
      { key: 'maghrib', name: 'মাগরিব', count: prayerDistribution.maghrib || 0 },
      { key: 'isha', name: 'এশা', count: prayerDistribution.isha || 0 }
    ];

    prayers.sort((a, b) => b.count - a.count);
    const strongest = prayers[0];
    const weakest = prayers[prayers.length - 1];

    if (strongest && strongest.count > 0) {
      insights.push(`${strongest.name} সালাতে আপনার উপস্থিতি সবচেয়ে বেশি (${toBnNumber(strongest.count)} ওয়াক্ত)।`);
    }

    if (weakest && weakest.count < strongest.count && weakest.count < totalCompletedPrayers * 0.18) {
      insights.push(`${weakest.name} সালাতের জামাতে নিয়মিততায় কিছুটা বাড়তি মনোযোগ প্রয়োজন।`);
    }

    // Perfect days insight
    if (perfectDaysCount >= 5) {
      insights.push(`আপনি মোট ${toBnNumber(perfectDaysCount)} টি পূর্ণ দিনে (৫/৫ ওয়াক্ত) সালাত আদায় সম্পন্ন করেছেন ⭐`);
    }

    return insights.slice(0, 5);
  }

  private static generateRecommendations(params: {
    prayerDistribution: Record<string, number>;
    currentStreak: number;
    weekStats: any;
    totalCompletedPrayers: number;
  }) {
    const recs: string[] = [];
    const { prayerDistribution, currentStreak, weekStats, totalCompletedPrayers } = params;

    if (totalCompletedPrayers === 0) {
      recs.push('আজকের প্রথম ওয়াক্তের সালাতের জামাত থেকেই আপনার আত্মিক যাত্রা শুরু করুন।');
      return recs;
    }

    const fajrCount = prayerDistribution.fajr || 0;
    const ishaCount = prayerDistribution.isha || 0;

    if (fajrCount < ishaCount * 0.6) {
      recs.push('ফজরের জামাত ধরতে রাতে দ্রুত ঘুমানোর অভ্যাস করুন এবং অ্যালার্ম ব্যবহার করুন।');
    }

    if (currentStreak >= 5) {
      recs.push('আপনার ধারাবাহিকতা দুর্দান্ত! আল্লাহ যেন আপনার এই আমল কবুল করেন এবং অবিচল রাখেন।');
    } else if (weekStats.diff < 0) {
      recs.push('ধারাবাহিকতা কিছুটা কমলেও হতাশ হবেন না। আজকের ওয়াক্তগুলোর প্রতি যত্নবান হোন।');
    } else {
      recs.push('প্রতিটি সালাতের জন্য আগেভাগেই মসজিদে পৌঁছানোর নিয়ত রাখুন।');
    }

    recs.push('সালাত শেষে আত্মশুদ্ধি ও দ্বীনের ওপর অবিচল থাকার জন্য নিয়মিত দোয়া করুন।');
    return recs.slice(0, 3);
  }

  private static calculateMilestones(params: {
    totalCompletedPrayers: number;
    perfectDaysCount: number;
    bestStreak: number;
    currentStreak: number;
  }): JourneyMilestone[] {
    const { totalCompletedPrayers, perfectDaysCount, bestStreak } = params;

    const list: JourneyMilestone[] = [
      {
        id: 'FIRST_PERFECT_DAY',
        titleBn: 'প্রথম পূর্ণ দিন',
        titleEn: 'First Perfect Day',
        descBn: '১ দিনে ৫/৫ ওয়াক্ত সালাত সম্পন্ন',
        descEn: 'Completed 5/5 prayers in 1 day',
        icon: '🌙',
        target: 1,
        current: Math.min(1, perfectDaysCount),
        unlocked: perfectDaysCount >= 1,
        category: 'perfect_day'
      },
      {
        id: 'STREAK_3_DAYS',
        titleBn: '৩ দিনের ধারাবাহিকতা',
        titleEn: '3-Day Streak',
        descBn: 'টানা ৩ দিন ৫/৫ ওয়াক্ত সালাত',
        descEn: '5/5 prayers for 3 consecutive days',
        icon: '🔥',
        target: 3,
        current: Math.min(3, bestStreak),
        unlocked: bestStreak >= 3,
        category: 'streak'
      },
      {
        id: 'STREAK_7_DAYS',
        titleBn: '৭ দিনের ধারাবাহিকতা',
        titleEn: '7-Day Streak',
        descBn: 'টানা ১ সপ্তাহ পূর্ণ জামাত',
        descEn: 'Full Jama\'ah for 1 consecutive week',
        icon: '🔥',
        target: 7,
        current: Math.min(7, bestStreak),
        unlocked: bestStreak >= 7,
        category: 'streak'
      },
      {
        id: 'PERFECT_DAYS_10',
        titleBn: '১০টি Perfect Day',
        titleEn: '10 Perfect Days',
        descBn: 'মোট ১০ দিন ৫/৫ ওয়াক্ত সালাত',
        descEn: 'Total 10 days with 5/5 prayers',
        icon: '⭐',
        target: 10,
        current: Math.min(10, perfectDaysCount),
        unlocked: perfectDaysCount >= 10,
        category: 'perfect_day'
      },
      {
        id: 'STREAK_30_DAYS',
        titleBn: '৩০ দিনের ধারাবাহিকতা',
        titleEn: '30-Day Streak',
        descBn: 'টানা ১ মাস নিরবচ্ছিন্ন সালাত',
        descEn: 'Unbroken prayer streak for 1 month',
        icon: '🏆',
        target: 30,
        current: Math.min(30, bestStreak),
        unlocked: bestStreak >= 30,
        category: 'streak'
      },
      {
        id: 'TOTAL_50_PRAYERS',
        titleBn: 'জামাত অনুরাগী',
        titleEn: 'Jama\'ah Devotee',
        descBn: '৫০ ওয়াক্ত সালাত সম্পন্ন',
        descEn: '50 prayers completed in Jama\'ah',
        icon: '🕌',
        target: 50,
        current: Math.min(50, totalCompletedPrayers),
        unlocked: totalCompletedPrayers >= 50,
        category: 'total'
      },
      {
        id: 'TOTAL_100_PRAYERS',
        titleBn: 'সেঞ্চুরিয়ন',
        titleEn: 'Centurion',
        descBn: '১০০ ওয়াক্ত সালাত সম্পন্ন',
        descEn: '100 prayers completed in Jama\'ah',
        icon: '🌟',
        target: 100,
        current: Math.min(100, totalCompletedPrayers),
        unlocked: totalCompletedPrayers >= 100,
        category: 'total'
      },
      {
        id: 'TOTAL_300_PRAYERS',
        titleBn: 'সালাতের রক্ষক',
        titleEn: 'Guardian of Prayer',
        descBn: '৩০০ ওয়াক্ত সালাত সম্পন্ন',
        descEn: '300 prayers completed in Jama\'ah',
        icon: '👑',
        target: 300,
        current: Math.min(300, totalCompletedPrayers),
        unlocked: totalCompletedPrayers >= 300,
        category: 'total'
      }
    ];

    return list;
  }

  private static detectRecoveryMode(
    dateMap: Record<string, { count: number }>,
    todayStr: string,
    totalCompleted: number
  ) {
    if (totalCompleted < 10) return false;

    // Check last 3 days
    const today = new Date(todayStr + 'T12:00:00Z');
    let last3DaysCount = 0;
    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      const dStr = d.toISOString().split('T')[0];
      last3DaysCount += dateMap[dStr]?.count || 0;
    }

    return last3DaysCount === 0;
  }

  private static generateHomeTeaser(weekStats: any, currentStreak: number, totalCompleted: number) {
    if (totalCompleted === 0) {
      return {
        headline: 'আমার কেভ জার্নি',
        headlineEn: 'My Cave Journey',
        primaryStat: 'দ্বীনি জীবন ও আত্মিক অগ্রগতির পূর্ণাঙ্গ পথচলা →',
        primaryStatEn: 'Your journey of faith, deeds & spiritual growth →',
        secondaryStat: '',
        secondaryStatEn: '',
        badgeText: '',
        badgeTextEn: ''
      };
    }

    if (currentStreak >= 3) {
      return {
        headline: 'আমার কেভ জার্নি',
        headlineEn: 'My Cave Journey',
        primaryStat: `${toBnNumber(currentStreak)} দিনের streak 🔥`,
        primaryStatEn: `${currentStreak}-day streak 🔥`,
        secondaryStat: `এই সপ্তাহে ${toBnNumber(weekStats.thisWeekCompleted)} ওয়াক্ত`,
        secondaryStatEn: `${weekStats.thisWeekCompleted} prayers this week`,
        badgeText: `${toBnNumber(currentStreak)} দিন 🔥`,
        badgeTextEn: `${currentStreak}d streak 🔥`
      };
    }

    if (weekStats.diff > 0) {
      return {
        headline: 'আমার কেভ জার্নি',
        headlineEn: 'My Cave Journey',
        primaryStat: `এই সপ্তাহে ↑ ${toBnNumber(weekStats.diff)}% উন্নতি`,
        primaryStatEn: `↑ ${weekStats.diff}% improvement this week`,
        secondaryStat: `${toBnNumber(weekStats.thisWeekCompleted)} ওয়াক্ত সম্পন্ন`,
        secondaryStatEn: `${weekStats.thisWeekCompleted} completed`,
        badgeText: `↑ ${toBnNumber(weekStats.diff)}%`,
        badgeTextEn: `↑ ${weekStats.diff}%`
      };
    }

    return {
      headline: 'আমার কেভ জার্নি',
      headlineEn: 'My Cave Journey',
      primaryStat: `এই সপ্তাহে ${toBnNumber(weekStats.thisWeekCompleted)} ওয়াক্ত সম্পন্ন`,
      primaryStatEn: `${weekStats.thisWeekCompleted} prayers this week`,
      secondaryStat: 'ধারাবাহিক থাকুন ✨',
      secondaryStatEn: 'Stay consistent ✨',
      badgeText: '',
      badgeTextEn: ''
    };
  }
}

// Helpers
function toBnNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return '০';
  const digits: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
  };
  return String(num).replace(/\d/g, d => digits[d] || d);
}

function formatShortDateBn(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const day = toBnNumber(parseInt(parts[2], 10));
  const monthNames = ['', 'জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
  const month = monthNames[parseInt(parts[1], 10)] || '';
  return `${day} ${month}`;
}

function formatTimeBengali(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const parts = formatter.formatToParts(d);
  let hour = '';
  let minute = '';
  let dayPeriod = '';
  for (const p of parts) {
    if (p.type === 'hour') hour = p.value;
    if (p.type === 'minute') minute = p.value;
    if (p.type === 'dayPeriod') dayPeriod = p.value.toUpperCase();
  }
  const periodBn = dayPeriod.includes('AM') || dayPeriod === 'AM' ? 'সকাল' : 'সন্ধ্যা/রাত';
  return `${toBnNumber(hour)}:${toBnNumber(minute)} ${periodBn}`;
}
