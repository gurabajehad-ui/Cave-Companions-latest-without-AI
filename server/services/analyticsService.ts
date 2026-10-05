import { query } from '../pg.js';
import crypto from 'crypto';

export interface AnalyticsDateFilter {
  period: 'today' | '7d' | '30d' | '90d' | 'custom';
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export interface DateRange {
  startDate: string;      // YYYY-MM-DD
  endDate: string;        // YYYY-MM-DD
  prevStartDate: string;  // YYYY-MM-DD
  prevEndDate: string;    // YYYY-MM-DD
  daysCount: number;
}

export interface MetricWithChange {
  current: number;
  previous: number;
  percentChange: number | null;
  changeText: string;
  direction: 'up' | 'down' | 'neutral';
}

// Calculate date ranges in Bangladesh Timezone (Asia/Dhaka)
export function resolveDateRange(filter: AnalyticsDateFilter): DateRange {
  const now = new Date();
  
  // Get today's date string in Bangladesh timezone (UTC+6)
  const dhakaNow = new Date(now.getTime() + (6 * 60 * 60 * 1000));
  const dhakaNowStr = dhakaNow.toISOString().slice(0, 10);
  
  let endDate = dhakaNowStr;
  let startDate = dhakaNowStr;
  let daysCount = 1;

  if (filter.period === 'today') {
    startDate = dhakaNowStr;
    endDate = dhakaNowStr;
    daysCount = 1;
  } else if (filter.period === '7d') {
    const end = new Date(dhakaNowStr);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    startDate = start.toISOString().slice(0, 10);
    endDate = dhakaNowStr;
    daysCount = 7;
  } else if (filter.period === '30d') {
    const end = new Date(dhakaNowStr);
    const start = new Date(end);
    start.setDate(end.getDate() - 29);
    startDate = start.toISOString().slice(0, 10);
    endDate = dhakaNowStr;
    daysCount = 30;
  } else if (filter.period === '90d') {
    const end = new Date(dhakaNowStr);
    const start = new Date(end);
    start.setDate(end.getDate() - 89);
    startDate = start.toISOString().slice(0, 10);
    endDate = dhakaNowStr;
    daysCount = 90;
  } else if (filter.period === 'custom' && filter.startDate && filter.endDate) {
    startDate = filter.startDate;
    endDate = filter.endDate;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }

  // Calculate preceding comparison period of exact same duration
  const startObj = new Date(startDate);
  const prevEndObj = new Date(startObj);
  prevEndObj.setDate(startObj.getDate() - 1);
  
  const prevStartObj = new Date(prevEndObj);
  prevStartObj.setDate(prevEndObj.getDate() - (daysCount - 1));

  const prevStartDate = prevStartObj.toISOString().slice(0, 10);
  const prevEndDate = prevEndObj.toISOString().slice(0, 10);

  return {
    startDate,
    endDate,
    prevStartDate,
    prevEndDate,
    daysCount
  };
}

export function calculateMetricChange(current: number, previous: number): MetricWithChange {
  if (previous === 0) {
    if (current === 0) {
      return { current, previous, percentChange: 0, changeText: '0%', direction: 'neutral' };
    }
    return { current, previous, percentChange: 100, changeText: '+100% (New)', direction: 'up' };
  }

  const diff = current - previous;
  const rawPct = (diff / previous) * 100;
  const percentChange = Math.round(rawPct * 10) / 10;

  if (percentChange > 0) {
    return { current, previous, percentChange, changeText: `+${percentChange}%`, direction: 'up' };
  } else if (percentChange < 0) {
    return { current, previous, percentChange, changeText: `${percentChange}%`, direction: 'down' };
  }

  return { current, previous, percentChange: 0, changeText: '0%', direction: 'neutral' };
}

// Analytics Event Recording Helper
export async function trackAnalyticsEvent(event: {
  userId?: string | null;
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    const id = `EVT-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    await query(
      `INSERT INTO analytics_events (id, user_id, event_type, entity_type, entity_id, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        id,
        event.userId || null,
        event.eventType,
        event.entityType || null,
        event.entityId || null,
        JSON.stringify(event.metadata || {})
      ]
    );
  } catch (err) {
    console.warn('[Analytics Tracker] Non-fatal log event failed:', err);
  }
}

// Main Analytics Data Aggregator
export async function getAnalyticsDashboardData(filter: AnalyticsDateFilter) {
  const range = resolveDateRange(filter);
  const { startDate, endDate, prevStartDate, prevEndDate, daysCount } = range;

  // 1. User Metrics (DAU, WAU, MAU, New Users, Total Users, Returning Users)
  const dauCurrentRes = await query(
    `SELECT COUNT(DISTINCT user_id) as count FROM (
       SELECT user_id FROM prayer_attendances WHERE date BETWEEN $1 AND $2
       UNION
       SELECT user_id FROM tokens WHERE earned_date BETWEEN $1 AND $2
       UNION
       SELECT user_id FROM redemptions WHERE date BETWEEN $1 AND $2
       UNION
       SELECT user_id FROM analytics_events WHERE user_id IS NOT NULL AND TO_CHAR(created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD') BETWEEN $1 AND $2
     ) u`,
    [startDate, endDate]
  );
  
  const dauPrevRes = await query(
    `SELECT COUNT(DISTINCT user_id) as count FROM (
       SELECT user_id FROM prayer_attendances WHERE date BETWEEN $1 AND $2
       UNION
       SELECT user_id FROM tokens WHERE earned_date BETWEEN $1 AND $2
       UNION
       SELECT user_id FROM redemptions WHERE date BETWEEN $1 AND $2
       UNION
       SELECT user_id FROM analytics_events WHERE user_id IS NOT NULL AND TO_CHAR(created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD') BETWEEN $1 AND $2
     ) u`,
    [prevStartDate, prevEndDate]
  );

  const activeUsersCount = parseInt(dauCurrentRes.rows[0]?.count || '0', 10);
  const prevActiveUsersCount = parseInt(dauPrevRes.rows[0]?.count || '0', 10);

  // WAU (Unique active users in last 7 days from endDate)
  const wauStartObj = new Date(endDate);
  wauStartObj.setDate(wauStartObj.getDate() - 6);
  const wauStartDate = wauStartObj.toISOString().slice(0, 10);

  const wauRes = await query(
    `SELECT COUNT(DISTINCT user_id) as count FROM (
       SELECT user_id FROM prayer_attendances WHERE date BETWEEN $1 AND $2
       UNION
       SELECT user_id FROM tokens WHERE earned_date BETWEEN $1 AND $2
       UNION
       SELECT user_id FROM redemptions WHERE date BETWEEN $1 AND $2
     ) u`,
    [wauStartDate, endDate]
  );
  const wauCount = parseInt(wauRes.rows[0]?.count || '0', 10);

  // MAU (Unique active users in last 30 days from endDate)
  const mauStartObj = new Date(endDate);
  mauStartObj.setDate(mauStartObj.getDate() - 29);
  const mauStartDate = mauStartObj.toISOString().slice(0, 10);

  const mauRes = await query(
    `SELECT COUNT(DISTINCT user_id) as count FROM (
       SELECT user_id FROM prayer_attendances WHERE date BETWEEN $1 AND $2
       UNION
       SELECT user_id FROM tokens WHERE earned_date BETWEEN $1 AND $2
       UNION
       SELECT user_id FROM redemptions WHERE date BETWEEN $1 AND $2
     ) u`,
    [mauStartDate, endDate]
  );
  const mauCount = parseInt(mauRes.rows[0]?.count || '0', 10);

  // New Users
  const newUsersCurrentRes = await query(
    `SELECT COUNT(*) as count FROM users 
     WHERE TO_CHAR(created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD') BETWEEN $1 AND $2`,
    [startDate, endDate]
  );
  const newUsersPrevRes = await query(
    `SELECT COUNT(*) as count FROM users 
     WHERE TO_CHAR(created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD') BETWEEN $1 AND $2`,
    [prevStartDate, prevEndDate]
  );
  const newUsersCount = parseInt(newUsersCurrentRes.rows[0]?.count || '0', 10);
  const prevNewUsersCount = parseInt(newUsersPrevRes.rows[0]?.count || '0', 10);

  // Total Cumulative Registered Users up to endDate
  const totalUsersRes = await query(
    `SELECT COUNT(*) as count FROM users 
     WHERE TO_CHAR(created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD') <= $1`,
    [endDate]
  );
  const totalUsersCount = parseInt(totalUsersRes.rows[0]?.count || '0', 10);

  // Returning Users (active in range who registered BEFORE startDate)
  const returningRes = await query(
    `SELECT COUNT(DISTINCT u.user_id) as count FROM (
       SELECT user_id FROM prayer_attendances WHERE date BETWEEN $1 AND $2
       UNION
       SELECT user_id FROM tokens WHERE earned_date BETWEEN $1 AND $2
       UNION
       SELECT user_id FROM redemptions WHERE date BETWEEN $1 AND $2
     ) u
     JOIN users usr ON u.user_id = usr.id
     WHERE TO_CHAR(usr.created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD') < $1`,
    [startDate, endDate]
  );
  const returningUsersCount = parseInt(returningRes.rows[0]?.count || '0', 10);

  // User Retention Rate
  const retentionRate = activeUsersCount > 0 
    ? Math.round((returningUsersCount / activeUsersCount) * 1000) / 10 
    : 0;

  // 2. Congregational Prayer Metrics
  const prayersCurrentRes = await query(
    `SELECT COUNT(*) as count FROM prayer_attendances WHERE date BETWEEN $1 AND $2`,
    [startDate, endDate]
  );
  const prayersPrevRes = await query(
    `SELECT COUNT(*) as count FROM prayer_attendances WHERE date BETWEEN $1 AND $2`,
    [prevStartDate, prevEndDate]
  );
  const prayersCount = parseInt(prayersCurrentRes.rows[0]?.count || '0', 10);
  const prevPrayersCount = parseInt(prayersPrevRes.rows[0]?.count || '0', 10);

  // Prayer breakdown by type (with Friday Jumu'ah labeling logic)
  const prayerBreakdownRes = await query(
    `SELECT 
       prayer_type,
       date,
       COUNT(*) as total_count,
       COALESCE(SUM(CASE WHEN qr_payload IS NOT NULL AND qr_payload != '' THEN 1 ELSE 0 END), 0) as qr_count
     FROM prayer_attendances
     WHERE date BETWEEN $1 AND $2
     GROUP BY prayer_type, date`,
    [startDate, endDate]
  );

  const prayerStatsMap: Record<string, { total: number; qrVerified: number }> = {
    fajr: { total: 0, qrVerified: 0 },
    dhuhr: { total: 0, qrVerified: 0 },
    jumuah: { total: 0, qrVerified: 0 },
    asr: { total: 0, qrVerified: 0 },
    maghrib: { total: 0, qrVerified: 0 },
    isha: { total: 0, qrVerified: 0 }
  };

  prayerBreakdownRes.rows.forEach(row => {
    const pDate = new Date(row.date);
    const isFriday = pDate.getUTCDay() === 5; // Friday
    let pType = row.prayer_type.toLowerCase();

    if (pType === 'dhuhr' && isFriday) {
      pType = 'jumuah';
    }

    if (!prayerStatsMap[pType]) {
      prayerStatsMap[pType] = { total: 0, qrVerified: 0 };
    }
    prayerStatsMap[pType].total += parseInt(row.total_count, 10);
    prayerStatsMap[pType].qrVerified += parseInt(row.qr_count, 10);
  });

  // 3. Token Metrics
  const tokensEarnedCurrentRes = await query(
    `SELECT COUNT(*) as count FROM tokens WHERE earned_date BETWEEN $1 AND $2`,
    [startDate, endDate]
  );
  const tokensEarnedPrevRes = await query(
    `SELECT COUNT(*) as count FROM tokens WHERE earned_date BETWEEN $1 AND $2`,
    [prevStartDate, prevEndDate]
  );
  const tokensEarnedCount = parseInt(tokensEarnedCurrentRes.rows[0]?.count || '0', 10);
  const prevTokensEarnedCount = parseInt(tokensEarnedPrevRes.rows[0]?.count || '0', 10);

  const tokensRedeemedCurrentRes = await query(
    `SELECT COUNT(*) as count FROM redemptions WHERE date BETWEEN $1 AND $2`,
    [startDate, endDate]
  );
  const tokensRedeemedPrevRes = await query(
    `SELECT COUNT(*) as count FROM redemptions WHERE date BETWEEN $1 AND $2`,
    [prevStartDate, prevEndDate]
  );
  const tokensRedeemedCount = parseInt(tokensRedeemedCurrentRes.rows[0]?.count || '0', 10);
  const prevTokensRedeemedCount = parseInt(tokensRedeemedPrevRes.rows[0]?.count || '0', 10);

  // Token Distribution by Type (Gold, Silver, Bronze)
  const tokenDistRes = await query(
    `SELECT token_type, COUNT(*) as count 
     FROM tokens 
     WHERE earned_date BETWEEN $1 AND $2 
     GROUP BY token_type`,
    [startDate, endDate]
  );

  const tokenDistribution = {
    GOLD: 0,
    SILVER: 0,
    BRONZE: 0,
    total: tokensEarnedCount
  };

  tokenDistRes.rows.forEach(row => {
    const type = (row.token_type || '').toUpperCase();
    if (type === 'GOLD') tokenDistribution.GOLD += parseInt(row.count, 10);
    else if (type === 'SILVER') tokenDistribution.SILVER += parseInt(row.count, 10);
    else if (type === 'BRONZE') tokenDistribution.BRONZE += parseInt(row.count, 10);
  });

  // Available Tokens Count
  const tokensAvailableRes = await query(
    `SELECT COUNT(*) as count FROM tokens WHERE status = 'AVAILABLE'`
  );
  const tokensAvailableCount = parseInt(tokensAvailableRes.rows[0]?.count || '0', 10);

  // 4. Redemption & Financial Metrics
  const finCurrentRes = await query(
    `SELECT 
       COUNT(*) as redemption_count,
       COALESCE(SUM(bill_amount), 0) as gross_value,
       COALESCE(SUM(discount_amount), 0) as total_discount,
       COALESCE(SUM(commission_amount), 0) as net_income
     FROM redemptions
     WHERE date BETWEEN $1 AND $2`,
    [startDate, endDate]
  );

  const finPrevRes = await query(
    `SELECT 
       COUNT(*) as redemption_count,
       COALESCE(SUM(bill_amount), 0) as gross_value,
       COALESCE(SUM(discount_amount), 0) as total_discount,
       COALESCE(SUM(commission_amount), 0) as net_income
     FROM redemptions
     WHERE date BETWEEN $1 AND $2`,
    [prevStartDate, prevEndDate]
  );

  // Online Sales Financials
  const onlineFinCurrentRes = await query(
    `SELECT 
       COALESCE(SUM(net_income), 0) as online_net_income,
       COALESCE(SUM(customer_product_payable), 0) as online_gross
     FROM online_financial_records
     WHERE TO_CHAR(created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD') BETWEEN $1 AND $2`,
    [startDate, endDate]
  );

  const grossTransactionValue = parseFloat(finCurrentRes.rows[0]?.gross_value || '0') + parseFloat(onlineFinCurrentRes.rows[0]?.online_gross || '0');
  const prevGrossTransactionValue = parseFloat(finPrevRes.rows[0]?.gross_value || '0');
  const totalCustomerDiscount = parseFloat(finCurrentRes.rows[0]?.total_discount || '0');
  const ccNetIncome = parseFloat(finCurrentRes.rows[0]?.net_income || '0') + parseFloat(onlineFinCurrentRes.rows[0]?.online_net_income || '0');
  const prevCcNetIncome = parseFloat(finPrevRes.rows[0]?.net_income || '0');

  // 5. Daily Series for User Activity & Financial Trends
  const activeUsersByDateRes = await query(
    `SELECT date_val as date, COUNT(DISTINCT user_id) as active_users
     FROM (
       SELECT date as date_val, user_id FROM prayer_attendances WHERE date BETWEEN $1 AND $2
       UNION
       SELECT earned_date as date_val, user_id FROM tokens WHERE earned_date BETWEEN $1 AND $2
       UNION
       SELECT date as date_val, user_id FROM redemptions WHERE date BETWEEN $1 AND $2
     ) t
     GROUP BY date_val`,
    [startDate, endDate]
  );
  const activeMap = new Map(activeUsersByDateRes.rows.map(r => [r.date, parseInt(r.active_users, 10)]));

  const newUsersByDateRes = await query(
    `SELECT TO_CHAR(created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD') as date, COUNT(*) as new_users
     FROM users
     WHERE TO_CHAR(created_at AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD') BETWEEN $1 AND $2
     GROUP BY date`,
    [startDate, endDate]
  );
  const newMap = new Map(newUsersByDateRes.rows.map(r => [r.date, parseInt(r.new_users, 10)]));

  const prayersByDateRes = await query(
    `SELECT date, COUNT(*) as prayer_count
     FROM prayer_attendances
     WHERE date BETWEEN $1 AND $2
     GROUP BY date`,
    [startDate, endDate]
  );
  const prayerMap = new Map(prayersByDateRes.rows.map(r => [r.date, parseInt(r.prayer_count, 10)]));

  const redemptionsByDateRes = await query(
    `SELECT date, COUNT(*) as redemption_count, COALESCE(SUM(bill_amount), 0) as gross_value, COALESCE(SUM(commission_amount), 0) as net_income
     FROM redemptions
     WHERE date BETWEEN $1 AND $2
     GROUP BY date`,
    [startDate, endDate]
  );
  const redemptionMap = new Map(redemptionsByDateRes.rows.map(r => [r.date, {
    count: parseInt(r.redemption_count, 10),
    gross: parseFloat(r.gross_value),
    net: parseFloat(r.net_income)
  }]));

  const dateList: string[] = [];
  const curDate = new Date(startDate);
  const stopDate = new Date(endDate);
  while (curDate <= stopDate) {
    dateList.push(curDate.toISOString().slice(0, 10));
    curDate.setDate(curDate.getDate() + 1);
  }

  const dailyTrend = dateList.map(dateStr => {
    const rData = redemptionMap.get(dateStr) || { count: 0, gross: 0, net: 0 };
    return {
      date: dateStr,
      activeUsers: activeMap.get(dateStr) || 0,
      newUsers: newMap.get(dateStr) || 0,
      prayers: prayerMap.get(dateStr) || 0,
      redemptions: rData.count,
      grossValue: rData.gross,
      netIncome: rData.net
    };
  });

  // 6. Top Partner Shops Analytics
  const topShopsRes = await query(
    `SELECT 
       s.id as shop_id,
       s.name as shop_name,
       s.name_bn as shop_name_bn,
       s.area,
       s.district,
       COUNT(r.id) as redemption_count,
       COUNT(DISTINCT r.user_id) as active_customers,
       COALESCE(SUM(r.bill_amount), 0) as total_value,
       COALESCE(SUM(r.discount_amount), 0) as total_discount,
       COALESCE(SUM(r.commission_amount), 0) as net_income
     FROM shops s
     LEFT JOIN redemptions r ON s.id = r.shop_id AND r.date BETWEEN $1 AND $2
     WHERE s.status = 'ACTIVE'
     GROUP BY s.id, s.name, s.name_bn, s.area, s.district
     ORDER BY total_value DESC, redemption_count DESC
     LIMIT 10`,
    [startDate, endDate]
  );

  const topShops = topShopsRes.rows.map((row, index) => ({
    rank: index + 1,
    shopId: row.shop_id,
    shopName: row.shop_name_bn || row.shop_name,
    area: row.area,
    district: row.district,
    redemptions: parseInt(row.redemption_count, 10),
    customers: parseInt(row.active_customers, 10),
    totalValue: parseFloat(row.total_value),
    discountAmount: parseFloat(row.total_discount),
    netIncome: parseFloat(row.net_income)
  }));

  // 7. Mosque Performance Analytics Table
  const mosquePerfRes = await query(
    `SELECT 
       m.id as mosque_id,
       m.name as mosque_name,
       m.name_bn as mosque_name_bn,
       m.area,
       m.district,
       COUNT(p.id) as total_prayers,
       COUNT(DISTINCT p.user_id) as active_users,
       COALESCE(SUM(CASE WHEN p.qr_payload IS NOT NULL AND p.qr_payload != '' THEN 1 ELSE 0 END), 0) as qr_verifications
     FROM mosques m
     LEFT JOIN prayer_attendances p ON m.id = p.mosque_id AND p.date BETWEEN $1 AND $2
     WHERE m.status = 'active'
     GROUP BY m.id, m.name, m.name_bn, m.area, m.district
     ORDER BY total_prayers DESC, active_users DESC
     LIMIT 15`,
    [startDate, endDate]
  );

  const mosquePerformance = mosquePerfRes.rows.map((row, index) => ({
    rank: index + 1,
    mosqueId: row.mosque_id,
    mosqueName: row.mosque_name_bn || row.mosque_name,
    area: row.area,
    district: row.district,
    totalPrayers: parseInt(row.total_prayers, 10),
    activeUsers: parseInt(row.active_users, 10),
    qrVerifications: parseInt(row.qr_verifications, 10)
  }));

  // Top Mosque Summary Highlights
  const mostActiveMosque = mosquePerformance[0] || null;

  // 8. Growth & Engagement Rates
  const userGrowthRate = totalUsersCount > 0 
    ? Math.round((newUsersCount / totalUsersCount) * 1000) / 10 
    : 0;

  const prayerConsistency = activeUsersCount > 0 
    ? Math.round((prayersCount / (activeUsersCount * daysCount)) * 10) / 10 
    : 0;

  const tokenRedemptionRate = tokensEarnedCount > 0 
    ? Math.round((tokensRedeemedCount / tokensEarnedCount) * 1000) / 10 
    : 0;

  // 9. Smart Insights Generator
  const smartInsights: string[] = [];

  // Insight 1: User Growth / Activity
  const dauChange = calculateMetricChange(activeUsersCount, prevActiveUsersCount);
  if (dauChange.direction === 'up') {
    smartInsights.push(`সক্রিয় ইউজার সংখ্যা পূর্ববর্তী সময়ের চেয়ে ${dauChange.changeText} বৃদ্ধি পেয়েছে (মোট ${activeUsersCount} জন)।`);
  } else if (dauChange.direction === 'down') {
    smartInsights.push(`সক্রিয় ইউজার সংখ্যা পূর্ববর্তী সময়ের চেয়ে ${dauChange.changeText} হ্রাস পেয়েছে।`);
  } else {
    smartInsights.push(`সক্রিয় ইউজার উপস্থিতি স্থিতিশীল রয়েছে (মোট ${activeUsersCount} জন)।`);
  }

  // Insight 2: Friday Prayer / Jumu'ah highlight
  if (prayerStatsMap.jumuah.total > 0) {
    smartInsights.push(`জুমুআর সালাতে সর্বোচ্চ উপস্থিতি রেকর্ড করা হয়েছে (মোট ${prayerStatsMap.jumuah.total} টি সালাত)।`);
  }

  // Insight 3: Token highlight
  if (tokensEarnedCount > 0) {
    const goldPct = Math.round((tokenDistribution.GOLD / tokensEarnedCount) * 100);
    smartInsights.push(`অর্জিত টোকেনের ${goldPct}% ই গোল্ড টোকেন (${tokenDistribution.GOLD} টি)। রিডেম্পশন রেট ${tokenRedemptionRate}%।`);
  }

  // Insight 4: Top Shop
  if (topShops.length > 0 && topShops[0].redemptions > 0) {
    smartInsights.push(`শীর্ষ পার্টনার শপ "${topShops[0].shopName}" এ সর্বোচ্চ ${topShops[0].redemptions} টি ডিসকাউন্ট রিডেম্পশন সম্পন্ন হয়েছে (মোট ৳${topShops[0].totalValue.toLocaleString('bn-BD')})।`);
  }

  // Insight 5: Top Mosque
  if (mostActiveMosque && mostActiveMosque.totalPrayers > 0) {
    smartInsights.push(`সর্বাধিক সক্রিয় মসজিদ "${mostActiveMosque.mosqueName}" (মোট ${mostActiveMosque.totalPrayers} টি জামাতে উপস্থিতি)।`);
  }

  if (smartInsights.length === 0) {
    smartInsights.push('নির্বাচিত সময়সীমার জন্য কোনো উল্লেখযোগ্য এনালাইটিক্স তথ্য পাওয়া যায়নি।');
  }

  return {
    dateRange: range,
    overviewCards: {
      dau: calculateMetricChange(activeUsersCount, prevActiveUsersCount),
      wau: { current: wauCount },
      mau: { current: mauCount },
      newUsers: calculateMetricChange(newUsersCount, prevNewUsersCount),
      totalRegisteredUsers: { current: totalUsersCount },
      returningUsers: { current: returningUsersCount },
      retentionRate: { current: retentionRate },
      completedPrayers: calculateMetricChange(prayersCount, prevPrayersCount),
      tokensEarned: calculateMetricChange(tokensEarnedCount, prevTokensEarnedCount),
      tokensRedeemed: calculateMetricChange(tokensRedeemedCount, prevTokensRedeemedCount),
      totalRedemptionValue: calculateMetricChange(grossTransactionValue, prevGrossTransactionValue),
      ccNetIncome: calculateMetricChange(ccNetIncome, prevCcNetIncome),
      totalDiscountAmount: totalCustomerDiscount
    },
    dailyTrend,
    prayerStats: {
      totalPrayers: prayersCount,
      breakdown: prayerStatsMap
    },
    tokenStats: {
      earned: tokensEarnedCount,
      redeemed: tokensRedeemedCount,
      available: tokensAvailableCount,
      distribution: tokenDistribution
    },
    financialStats: {
      grossTransactionValue,
      totalDiscount: totalCustomerDiscount,
      ccNetIncome,
      redemptionCount: tokensRedeemedCount
    },
    growthAndEngagement: {
      userGrowthRate,
      retentionRate,
      prayerConsistency,
      tokenRedemptionRate
    },
    topShops,
    mosquePerformance,
    mostActiveMosque,
    smartInsights
  };
}
