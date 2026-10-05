import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Download,
  Flame,
  Award,
  Store,
  Landmark,
  Sparkles,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  ChevronRight,
  Activity,
  Layers,
  BarChart3,
  Percent,
  HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { api, getStoredAdminToken, removeStoredAdminToken } from '../services/api';

interface AnalyticsViewProps {
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onShowToast }) => {
  // Date filter state
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | '90d' | 'custom'>('7d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Shop sorting metric tab
  const [shopSortMetric, setShopSortMetric] = useState<'redemptions' | 'customers' | 'value'>('value');

  // Loading & Data states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Fetch Analytics Data
  const fetchAnalytics = async () => {
    const token = getStoredAdminToken();
    if (!token) {
      setError('অনুমতি নেই বা এডমিন সেশন মেয়াদোত্তীর্ণ। অনুগ্রহ করে এডমিন প্যানেলে পুনঃলগইন করুন।');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminAnalytics({
        period,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined
      });
      if (res.success && res.data) {
        setAnalyticsData(res.data);
      } else {
        setError('এনালাইটিক্স ডাটা লোড করা যায়নি।');
      }
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      const isAuthError = err.status === 401 || err.status === 403 || err.message?.includes('403') || err.message?.includes('401');
      if (isAuthError) {
        setError('অনুমতি নেই বা এডমিন সেশন মেয়াদোত্তীর্ণ। অনুগ্রহ করে এডমিন প্যানেলে পুনঃলগইন অথবা পেজ রিফ্রেশ করুন।');
      } else {
        setError(err.message || 'নেটওয়ার্ক বা সার্ভার ত্রুটি ঘটেছে।');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (period === 'custom' && (!startDate || !endDate)) {
      return;
    }
    fetchAnalytics();
  }, [period, startDate, endDate]);

  // Format Bengali Numbers
  const toBnNumber = (num: number | string | undefined | null): string => {
    if (num === undefined || num === null || isNaN(Number(num))) return '০';
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return Number(num)
      .toLocaleString('en-US')
      .replace(/\d/g, (d) => bnDigits[parseInt(d, 10)]);
  };

  // Helper for rendering Change Badges
  const renderChangeBadge = (metric: any) => {
    if (!metric) return null;
    const { changeText, direction } = metric;
    
    if (direction === 'up') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <TrendingUp className="w-3 h-3" />
          <span>{changeText}</span>
        </span>
      );
    } else if (direction === 'down') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <TrendingDown className="w-3 h-3" />
          <span>{changeText}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
        <Minus className="w-3 h-3" />
        <span>{changeText}</span>
      </span>
    );
  };

  // CSV Report Exporter
  const handleExportCSV = () => {
    if (!analyticsData) return;
    
    const { dateRange, overviewCards, prayerStats, tokenStats, financialStats, topShops, mosquePerformance } = analyticsData;

    let csvContent = `data:text/csv;charset=utf-8,\uFEFF`;
    
    csvContent += `Cave Companions Analytics & Insights Report\n`;
    csvContent += `Period: ${dateRange.startDate} to ${dateRange.endDate}\n`;
    csvContent += `Generated At: ${new Date().toLocaleString('bn-BD')}\n\n`;

    // Overview Section
    csvContent += `1. OVERVIEW METRICS\n`;
    csvContent += `Metric,Value,Previous Period,Change\n`;
    csvContent += `Daily Active Users (DAU),${overviewCards.dau.current},${overviewCards.dau.previous},${overviewCards.dau.changeText}\n`;
    csvContent += `Weekly Active Users (WAU),${overviewCards.wau.current},-,-\n`;
    csvContent += `Monthly Active Users (MAU),${overviewCards.mau.current},-,-\n`;
    csvContent += `New Users,${overviewCards.newUsers.current},${overviewCards.newUsers.previous},${overviewCards.newUsers.changeText}\n`;
    csvContent += `Total Registered Users,${overviewCards.totalRegisteredUsers.current},-,-\n`;
    csvContent += `Completed Prayers,${overviewCards.completedPrayers.current},${overviewCards.completedPrayers.previous},${overviewCards.completedPrayers.changeText}\n`;
    csvContent += `Tokens Earned,${overviewCards.tokensEarned.current},${overviewCards.tokensEarned.previous},${overviewCards.tokensEarned.changeText}\n`;
    csvContent += `Tokens Redeemed,${overviewCards.tokensRedeemed.current},${overviewCards.tokensRedeemed.previous},${overviewCards.tokensRedeemed.changeText}\n`;
    csvContent += `Gross Redemption Value (BDT),${overviewCards.totalRedemptionValue.current},${overviewCards.totalRedemptionValue.previous},${overviewCards.totalRedemptionValue.changeText}\n`;
    csvContent += `Net Income (BDT),${overviewCards.ccNetIncome.current},${overviewCards.ccNetIncome.previous},${overviewCards.ccNetIncome.changeText}\n\n`;

    // Top Partner Shops
    csvContent += `2. TOP PARTNER SHOPS\n`;
    csvContent += `Rank,Shop Name,Area,District,Redemptions,Customers,Total Value (BDT),Net Income (BDT)\n`;
    topShops.forEach((s: any) => {
      csvContent += `${s.rank},"${s.shopName}",${s.area},${s.district},${s.redemptions},${s.customers},${s.totalValue},${s.netIncome}\n`;
    });
    csvContent += `\n`;

    // Mosque Performance
    csvContent += `3. MOSQUE PERFORMANCE\n`;
    csvContent += `Rank,Mosque Name,Area,District,Total Prayers,Active Users,QR Verifications\n`;
    mosquePerformance.forEach((m: any) => {
      csvContent += `${m.rank},"${m.mosqueName}",${m.area},${m.district},${m.totalPrayers},${m.activeUsers},${m.qrVerifications}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cave_Companions_Analytics_${dateRange.startDate}_to_${dateRange.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onShowToast) {
      onShowToast('success', 'এক্সপোর্ট সফল', 'এনালাইটিক্স রিপোর্ট সফলভাবে CSV আকারে ডাউনলোড করা হয়েছে।');
    }
  };

  // Prepare chart datasets safely
  const dailyTrend = analyticsData?.dailyTrend || [];
  const prayerBreakdown = analyticsData?.prayerStats?.breakdown || {};
  
  const prayerChartData = [
    { name: 'ফজর (Fajr)', total: prayerBreakdown.fajr?.total || 0, qrVerified: prayerBreakdown.fajr?.qrVerified || 0 },
    { name: 'জুমুআ / জোহর (Jumu\'ah/Dhuhr)', total: (prayerBreakdown.jumuah?.total || 0) + (prayerBreakdown.dhuhr?.total || 0), qrVerified: (prayerBreakdown.jumuah?.qrVerified || 0) + (prayerBreakdown.dhuhr?.qrVerified || 0) },
    { name: 'আসর (Asr)', total: prayerBreakdown.asr?.total || 0, qrVerified: prayerBreakdown.asr?.qrVerified || 0 },
    { name: 'মাগরিব (Maghrib)', total: prayerBreakdown.maghrib?.total || 0, qrVerified: prayerBreakdown.maghrib?.qrVerified || 0 },
    { name: 'ইশা (Isha)', total: prayerBreakdown.isha?.total || 0, qrVerified: prayerBreakdown.isha?.qrVerified || 0 }
  ];

  const tokenDistributionData = [
    { name: 'গোল্ড (Gold)', value: analyticsData?.tokenStats?.distribution?.GOLD || 0, color: '#f59e0b' },
    { name: 'সিলভার (Silver)', value: analyticsData?.tokenStats?.distribution?.SILVER || 0, color: '#94a3b8' },
    { name: 'ব্রোঞ্জ (Bronze)', value: analyticsData?.tokenStats?.distribution?.BRONZE || 0, color: '#d97706' }
  ];

  const tokenLifecycleData = [
    {
      category: 'টোকেন পারফরম্যান্স',
      earned: analyticsData?.tokenStats?.earned || 0,
      redeemed: analyticsData?.tokenStats?.redeemed || 0,
      available: analyticsData?.tokenStats?.available || 0
    }
  ];

  // Sorted Shops List
  const sortedShops = [...(analyticsData?.topShops || [])].sort((a, b) => {
    if (shopSortMetric === 'redemptions') return b.redemptions - a.redemptions;
    if (shopSortMetric === 'customers') return b.customers - a.customers;
    return b.totalValue - a.totalValue;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER & DATE RANGE FILTER BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-amber-400" />
              <h1 className="text-xl font-black text-white">Analytics & Insights (এনালাইটিক্স & ইনসাইট)</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Monitor Cave Companions growth, user activity, prayer engagement, token performance, redemption activity and business performance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer disabled:opacity-50"
              title="রিলিড করুন"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleExportCSV}
              disabled={loading || !analyticsData}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Export Report (CSV)</span>
            </button>
          </div>
        </div>

        {/* DATE RANGE FILTER BUTTONS */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mr-2">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>সময়সীমা নির্বাচন:</span>
          </span>

          {(
            [
              { id: 'today', label: 'আজ (Today)' },
              { id: '7d', label: 'গত ৭ দিন (7 Days)' },
              { id: '30d', label: 'গত ৩০ দিন (30 Days)' },
              { id: '90d', label: 'গত ৯০ দিন (90 Days)' },
              { id: 'custom', label: 'কাস্টম রেঞ্জ (Custom)' }
            ] as const
          ).map((p, idx) => (
            <button
              key={`av-p-${p.id}-${idx}`}
              onClick={() => setPeriod(p.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                period === p.id
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}

          {period === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0 bg-slate-950 p-2 rounded-xl border border-slate-800">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs text-slate-500">থেকে</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="bg-rose-950/40 border border-rose-800 rounded-2xl p-6 text-center space-y-3">
          <p className="text-rose-300 font-bold text-sm">{error}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>পুনরায় চেষ্টা করুন</span>
            </button>
            <button
              onClick={() => {
                removeStoredAdminToken();
                window.location.reload();
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-md"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>এডমিন সেশন পুনঃলগইন করুন</span>
            </button>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400 font-bold">এনালাইটিক্স ডাটা ও ইনসাইট প্রস্তুত করা হচ্ছে...</p>
        </div>
      )}

      {/* MAIN DASHBOARD CONTENT */}
      {!loading && !error && analyticsData && (
        <div className="space-y-8">
          
          {/* SMART INSIGHTS PANEL */}
          {analyticsData.smartInsights && analyticsData.smartInsights.length > 0 && (
            <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                <Sparkles className="w-5 h-5" />
                <span>স্মার্ট ইনসাইট & গুরুত্বপূর্ণ পর্যবেক্ষণ (Smart Insights)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {analyticsData.smartInsights.map((insight: string, idx: number) => (
                  <div
                    key={`smart-insight-${idx}`}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-amber-500/10 text-xs text-slate-200"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OVERVIEW ANALYTICS CARDS (GRID) */}
          <div className="space-y-3">
            <h2 className="text-sm font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>সারসংক্ষেপ এনালাইটিক্স (Overview Analytics)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              
              {/* Card 1: DAU */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">দৈনিক সক্রিয় ইউজার (DAU)</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-black text-white font-mono">
                    {toBnNumber(analyticsData.overviewCards.dau.current)}
                  </span>
                  {renderChangeBadge(analyticsData.overviewCards.dau)}
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  পূর্ববর্তী সময়ের তুলনায় তুলনাভিত্তিক পরিবর্তন
                </p>
              </div>

              {/* Card 2: WAU */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">সাপ্তাহিক সক্রিয় ইউজার (WAU)</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-black text-white font-mono">
                    {toBnNumber(analyticsData.overviewCards.wau.current)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded-full">
                    Past 7 Days
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  বিগত ৭ দিনের অনন্য সক্রিয় ইউজার
                </p>
              </div>

              {/* Card 3: MAU */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">মাসিক সক্রিয় ইউজার (MAU)</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-black text-white font-mono">
                    {toBnNumber(analyticsData.overviewCards.mau.current)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded-full">
                    Past 30 Days
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  বিগত ৩০ দিনের অনন্য সক্রিয় ইউজার
                </p>
              </div>

              {/* Card 4: New Users */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">নতুন নিবন্ধিত ইউজার</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-black text-white font-mono">
                    {toBnNumber(analyticsData.overviewCards.newUsers.current)}
                  </span>
                  {renderChangeBadge(analyticsData.overviewCards.newUsers)}
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  মোট নিবন্ধিত ইউজার: {toBnNumber(analyticsData.overviewCards.totalRegisteredUsers.current)} জন
                </p>
              </div>

              {/* Card 5: Completed Congregational Prayers */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">সম্পন্ন সালাত উপস্থিতি</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Flame className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-black text-white font-mono">
                    {toBnNumber(analyticsData.overviewCards.completedPrayers.current)}
                  </span>
                  {renderChangeBadge(analyticsData.overviewCards.completedPrayers)}
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  যাচাইকৃত জামাতে উপস্থিতি সংখ্যা
                </p>
              </div>

              {/* Card 6: Tokens Earned */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">অর্জিত টোকেন সংখ্যা</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-black text-white font-mono">
                    {toBnNumber(analyticsData.overviewCards.tokensEarned.current)}
                  </span>
                  {renderChangeBadge(analyticsData.overviewCards.tokensEarned)}
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  অব্যবহৃত টোকেন অবশিষ্ট: {toBnNumber(analyticsData.tokenStats.available)} টি
                </p>
              </div>

              {/* Card 7: Tokens Redeemed */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">ব্যবহৃত/রিডিমকৃত টোকেন</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Percent className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-black text-white font-mono">
                    {toBnNumber(analyticsData.overviewCards.tokensRedeemed.current)}
                  </span>
                  {renderChangeBadge(analyticsData.overviewCards.tokensRedeemed)}
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  রিডেম্পশন হার: {toBnNumber(analyticsData.growthAndEngagement.tokenRedemptionRate)}%
                </p>
              </div>

              {/* Card 8: Total Redemption Value */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">মোট রিডেম্পশন লেনদেন মূল্য</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-black text-white font-mono">
                    ৳{toBnNumber(analyticsData.overviewCards.totalRedemptionValue.current)}
                  </span>
                  {renderChangeBadge(analyticsData.overviewCards.totalRedemptionValue)}
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  প্ল্যাটফর্ম নিট আয়: ৳{toBnNumber(analyticsData.overviewCards.ccNetIncome.current)}
                </p>
              </div>

            </div>
          </div>

          {/* PRIMARY CHARTS ROW: USER ACTIVITY TREND & PRAYER BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* User Activity Trend Line Chart */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span>User Activity Trend (ইউজার অ্যাক্টিভিটি ট্রেন্ড)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    দৈনিক সক্রিয় ইউজার (DAU) এবং নতুন সাইনআপের সমান্তরাল চিত্র
                  </p>
                </div>
              </div>

              <div className="h-72 w-full pt-2">
                {dailyTrend.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs font-bold">
                    কোনো ডাটা পাওয়া যায়নি
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Area type="monotone" dataKey="activeUsers" name="সক্রিয় ইউজার (DAU)" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorActive)" />
                      <Area type="monotone" dataKey="newUsers" name="নতুন ইউজার" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorNew)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Prayer Activity Bar Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-emerald-400" />
                  <span>Prayer Activity (সালাত উপস্থিতি)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  সালাতের ওয়াক্ত অনুযায়ী মোট উপস্থিতি ও QR স্ক্যান
                </p>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prayerChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="total" name="মোট উপস্থিতি" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="qrVerified" name="QR ভেরিফাইড" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-amber-300/90 font-medium">
                💡 <span className="font-bold">শুক্রবার জুমুআ রুল:</span> শুক্রবার জোহরের ওয়াক্ত স্বয়ংক্রিয়ভাবে জুমুআ হিসেবে সংগৃহীত হয়।
              </div>
            </div>

          </div>

          {/* SECOND CHARTS ROW: TOKEN DISTRIBUTION & LIFECYCLE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Token Distribution Pie Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Token Distribution (টোকেন বণ্টন)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  গোল্ড, সিলভার ও ব্রোঞ্জ টোকেনের শতকরা অনুপাত
                </p>
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                {analyticsData.tokenStats.earned === 0 ? (
                  <div className="text-xs text-slate-500 font-bold">কোনো অর্জিত টোকেন নেই</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tokenDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {tokenDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono font-bold bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="text-amber-400">গোল্ড: {toBnNumber(tokenDistributionData[0].value)}</div>
                <div className="text-slate-300">সিলভার: {toBnNumber(tokenDistributionData[1].value)}</div>
                <div className="text-amber-600">ব্রোঞ্জ: {toBnNumber(tokenDistributionData[2].value)}</div>
              </div>
            </div>

            {/* Token Lifecycle & Business Financial Trend */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Redemption & Business Trend (বিজনেস & রিডেম্পশন ট্রেন্ড)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  দৈনিক লেনদেন মূল্য (Gross) এবং কেভ কম্প্যানিয়ন প্ল্যাটফর্ম নিট আয় (Net Income)
                </p>
              </div>

              <div className="h-64 w-full">
                {dailyTrend.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs font-bold">
                    কোনো ডাটা পাওয়া যায়নি
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="grossValue" name="মোট লেনদেন (৳ Gross)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="netIncome" name="প্ল্যাটফর্ম নিট আয় (৳ Net)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

          {/* TABLES ROW: TOP PARTNER SHOPS & MOSQUE PERFORMANCE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Top Partner Shops */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Store className="w-4 h-4 text-amber-400" />
                    <span>Top Partner Shops (শীর্ষ পার্টনার শপ র্যাংকিং)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">রিডেম্পশন ও বিজনেস পারফরম্যান্সের ভিত্তিতে শপ র‍্যাংকিং</p>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                  <button
                    onClick={() => setShopSortMetric('value')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      shopSortMetric === 'value' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    মূল্য ৳
                  </button>
                  <button
                    onClick={() => setShopSortMetric('redemptions')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      shopSortMetric === 'redemptions' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    রিডেম্পশন
                  </button>
                  <button
                    onClick={() => setShopSortMetric('customers')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      shopSortMetric === 'customers' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    কাস্টমার
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">র‍্যাংক</th>
                      <th className="py-2.5 px-3">দোকানের নাম & এলাকা</th>
                      <th className="py-2.5 px-3 text-center">রিডেম্পশন</th>
                      <th className="py-2.5 px-3 text-right">মোট লেনদেন</th>
                      <th className="py-2.5 px-3 text-right">নিট আয়</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {sortedShops.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                          কোনো পার্টনার শপ লেনদেন পাওয়া যায়নি
                        </td>
                      </tr>
                    ) : (
                      sortedShops.map((shop: any, idx: number) => (
                        <tr key={`${shop.shopId || 'shop'}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                            #{shop.rank}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-white">{shop.shopName}</div>
                            <div className="text-[10px] text-slate-400">{shop.area}, {shop.district}</div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200">
                            {toBnNumber(shop.redemptions)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                            ৳{toBnNumber(shop.totalValue)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300">
                            ৳{toBnNumber(shop.netIncome)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mosque Performance Analytics */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-400" />
                  <span>Mosque Analytics (মসজিদ পারফরম্যান্স ডিরেক্টরি)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">মসজিদভিত্তিক সালাত উপস্থিতি ও সক্রিয় ইউজারের তথ্য</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">র‍্যাংক</th>
                      <th className="py-2.5 px-3">মসজিদের নাম & স্থান</th>
                      <th className="py-2.5 px-3 text-center">উপস্থিতি</th>
                      <th className="py-2.5 px-3 text-center">সক্রিয় ইউজার</th>
                      <th className="py-2.5 px-3 text-center">QR স্ক্যান</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {analyticsData.mosquePerformance.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                          কোনো মসজিদ পারফরম্যান্স তথ্য পাওয়া যায়নি
                        </td>
                      </tr>
                    ) : (
                      analyticsData.mosquePerformance.map((m: any, idx: number) => (
                        <tr key={`${m.mosqueId || 'mosque'}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                            #{m.rank}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-white">{m.mosqueName}</div>
                            <div className="text-[10px] text-slate-400">{m.area}, {m.district}</div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200">
                            {toBnNumber(m.totalPrayers)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-300">
                            {toBnNumber(m.activeUsers)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-400">
                            {toBnNumber(m.qrVerifications)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* GROWTH & ENGAGEMENT METRICS ROW */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>গ্রোথ & এনগেজমেন্ট সূচকসমূহ (Growth & Engagement Rates)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block">ইউজার গ্রোথ রেট</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {toBnNumber(analyticsData.growthAndEngagement.userGrowthRate)}%
                </span>
                <span className="text-[10px] text-slate-500 block">নতুন নিবন্ধনের শতকরা অনুপাত</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block">রিটেনশন রেট</span>
                <span className="text-xl font-black text-amber-400 font-mono">
                  {toBnNumber(analyticsData.growthAndEngagement.retentionRate)}%
                </span>
                <span className="text-[10px] text-slate-500 block">পুনরাবৃত্ত ইউজারের অনুপাত</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block">সালাত ধারাবাহিকতা (Consistency)</span>
                <span className="text-xl font-black text-blue-400 font-mono">
                  {toBnNumber(analyticsData.growthAndEngagement.prayerConsistency)}
                </span>
                <span className="text-[10px] text-slate-500 block">দৈনিক গড়ে সালাত সম্পন্নতা / ইউজার</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block">টোকেন রিডেম্পশন রেট</span>
                <span className="text-xl font-black text-purple-400 font-mono">
                  {toBnNumber(analyticsData.growthAndEngagement.tokenRedemptionRate)}%
                </span>
                <span className="text-[10px] text-slate-500 block">অর্জিত বনাম ব্যবহৃত টোকেন হার</span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
export default AnalyticsView;
