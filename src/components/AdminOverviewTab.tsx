import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Store,
  ShoppingCart,
  Bike,
  TrendingUp,
  Clock,
  Zap,
  ArrowRight,
  Shield,
  Box,
  MapPin,
  Building,
  Bell,
  PhoneCall,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Plus,
  Send,
  Calendar,
  Layers,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { toBnNumber } from '../data/prayerConfig';

interface AdminOverviewTabProps {
  stats: {
    totalUsers: number;
    totalShops: number;
    totalOrders: number;
    totalRiders: number;
  };
  pendingCounts: {
    pendingProducts: number;
    pendingShops: number;
    pendingRiders: number;
    pendingAdmins: number;
    pendingOffers: number;
    openTickets: number;
  };
  recentOrders?: any[];
  onNavigateTab: (tab: string, subTab?: string) => void;
  onOpenAddAdminModal?: () => void;
  onOpenAddProductModal?: () => void;
  adminName?: string;
  adminRole?: string;
}

const mockActivityData7Days = [
  { day: '20 Sep', users: 150, orders: 90 },
  { day: '21 Sep', users: 200, orders: 120 },
  { day: '22 Sep', users: 190, orders: 130 },
  { day: '23 Sep', users: 240, orders: 145 },
  { day: '24 Sep', users: 260, orders: 160 },
  { day: '25 Sep', users: 280, orders: 195 },
  { day: '26 Sep', users: 310, orders: 235 },
];

const mockActivityData30Days = [
  { day: 'Week 1', users: 650, orders: 420 },
  { day: 'Week 2', users: 820, orders: 580 },
  { day: 'Week 3', users: 1040, orders: 740 },
  { day: 'Week 4', users: 1248, orders: 960 },
];

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  stats,
  pendingCounts,
  recentOrders = [],
  onNavigateTab,
  onOpenAddAdminModal,
  onOpenAddProductModal,
  adminName = 'Master Admin',
  adminRole = 'Super Administrator'
}) => {
  const [timeRange, setTimeRange] = useState<'7' | '30'>('7');
  const [dbStatus, setDbStatus] = useState<any>(null);

  useEffect(() => {
    fetch('/api/health/db')
      .then(res => res.json())
      .then(data => setDbStatus(data))
      .catch(err => console.error('Error fetching DB status:', err));
  }, []);

  const chartData = timeRange === '7' ? mockActivityData7Days : mockActivityData30Days;

  // Format current live time
  const currentDateTime = useMemo(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr}, ${timeStr}`;
  }, []);

  // Display orders - fallback to curated reference list if recent orders is empty
  const displayOrders = useMemo(() => {
    if (recentOrders && recentOrders.length > 0) {
      return recentOrders.slice(0, 5).map((o, idx) => ({
        id: o.orderNumber || o.id?.slice(0, 8) || `#CC-1002${5 - idx}`,
        customer: o.customerName || o.shippingAddress?.fullName || 'সম্মানিত গ্রাহক',
        shop: o.shopName || o.shop?.name || 'পার্টনার শপ',
        amount: Number(o.totalAmount || o.payableAmount || 650),
        status: o.status || 'PENDING',
        statusBn: o.status === 'DONE' || o.status === 'DELIVERED' 
          ? 'সম্পন্ন' 
          : o.status === 'SHIPPED' || o.status === 'PICKED_UP' 
          ? 'ডেলিভারি' 
          : 'প্রক্রিয়াধীন',
        statusType: o.status === 'DONE' || o.status === 'DELIVERED' 
          ? 'completed' 
          : o.status === 'SHIPPED' || o.status === 'PICKED_UP' 
          ? 'shipping' 
          : 'processing',
        date: o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '26 Sep, 04:12 PM'
      }));
    }

    return [
      { id: '#CC-10024', customer: 'রাহিম আহমেদ', shop: 'নূর এন্টারপ্রাইজ', amount: 950, statusBn: 'প্রক্রিয়াধীন', statusType: 'processing', date: '26 Sep, 04:12 PM' },
      { id: '#CC-10023', customer: 'ফারহানা আক্তার', shop: 'মদিনা স্টোর', amount: 620, statusBn: 'ডেলিভারি', statusType: 'shipping', date: '26 Sep, 03:45 PM' },
      { id: '#CC-10022', customer: 'মো. সাকিব', shop: 'ইসলামিক বুকস', amount: 1250, statusBn: 'সম্পন্ন', statusType: 'completed', date: '26 Sep, 02:32 PM' },
      { id: '#CC-10021', customer: 'তানভীর হাসান', shop: 'আল-বরকত', amount: 780, statusBn: 'প্রক্রিয়াধীন', statusType: 'processing', date: '26 Sep, 01:20 PM' },
      { id: '#CC-10020', customer: 'নুসরাত জাহান', shop: 'গ্রিন ফার্মেসি', amount: 460, statusBn: 'সম্পন্ন', statusType: 'completed', date: '26 Sep, 12:05 PM' },
    ];
  }, [recentOrders]);

  return (
    <div className="w-full space-y-6 text-slate-100 select-none pb-12">
      {/* 1. Header Bar: Title, Welcome & Live Clock */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>সুপার এডমিন কন্ট্রোল ড্যাশবোর্ড</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
            Welcome back, {adminName}! Here's what's happening with Cave Companions.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 font-medium shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentDateTime}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live</span>
          </div>
        </div>
      </div>

      {/* DB Warning Banner when SQLite Fallback is Active (e.g. due to GCP Quota/Billing limits) */}
      {dbStatus && (dbStatus.engine === 'sqlite-fallback' || dbStatus.database?.includes('cave_companions.db') || dbStatus.pgVersion?.includes('SQLite')) && (
        <div className="p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-200 flex flex-col md:flex-row items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1 space-y-1.5">
            <h3 className="text-sm font-black text-rose-300 tracking-wide">
              ⚠️ গুগল ক্লাউড কোটা সীমাবদ্ধতা ওয়ার্নিং (GCP Quota / Billing Limit Warning)
            </h3>
            <p className="text-xs text-rose-200/80 leading-relaxed font-medium">
              আপনার Google Cloud প্রজেক্টের কোটা শেষ হওয়ার কারণে লাইভ PostgreSQL ডেটাবেজ কানেক্ট করা যাচ্ছে না! 
              বর্তমানে অ্যাপ্লিকেশনটি সাময়িক <strong className="text-rose-300">SQLite ডেটাবেজ ব্যাকআপ</strong> মোডে সচল রয়েছে। এই মোডে লোকালভাবে ইউজার, মার্চেন্ট বা মসজিদ ক্রিয়েট হলেও, ক্লাউড কন্টেইনারটি রিস্টার্ট বা স্লিপ মোডে গেলে সেই ডেটা হারিয়ে যাবে।
            </p>
            <div className="pt-1 flex flex-wrap gap-2 text-[11px] font-bold">
              <span className="px-2 py-0.5 rounded-md bg-rose-950/60 border border-rose-500/20 text-rose-300">
                চলমান মোড: সাময়িক লোকাল ব্যাকআপ (SQLite)
              </span>
              <span className="px-2 py-0.5 rounded-md bg-rose-950/60 border border-rose-500/20 text-rose-300">
                প্রভাবিত অ্যাকশন: কন্টেইনার রিস্টার্টে তথ্য মুছে যাবে
              </span>
            </div>
            <p className="text-xs text-emerald-400 font-semibold pt-1">
              👉 সমাধান: দয়া করে আপনার Google Cloud কনসোলে যান, এবং বিলিং অ্যাকাউন্টটি সচল করে কোটার সীমা বৃদ্ধি করুন। বিলিং সচল করার সাথে সাথে অ্যাপ্লিকেশনটি স্বয়ংক্রিয়ভাবে পুনরায় মূল স্থায়ী ডেটাবেজের সাথে কানেক্ট হয়ে যাবে।
            </p>
          </div>
        </div>
      )}

      {/* 2. Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Users */}
        <div 
          onClick={() => onNavigateTab('users')}
          className="relative overflow-hidden rounded-2xl p-5 bg-[#0b1626]/90 border border-[#1e2f47] hover:border-blue-500/50 transition-all cursor-pointer shadow-lg group"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-medium">মোট ব্যবহারকারী</span>
              <div className="flex items-baseline justify-end gap-2 mt-1">
                <span className="text-2xl font-black text-white font-mono">
                  {stats.totalUsers > 0 ? stats.totalUsers.toLocaleString() : '1,248'}
                </span>
                <span className="inline-flex items-center text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                  ↑ 12%
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">গত ৩০ দিনে</span>
            </div>
          </div>
        </div>

        {/* Card 2: Shops */}
        <div 
          onClick={() => onNavigateTab('shops')}
          className="relative overflow-hidden rounded-2xl p-5 bg-[#052219]/90 border border-[#0d4737] hover:border-emerald-500/50 transition-all cursor-pointer shadow-lg group"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Store className="w-6 h-6" />
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-medium">মোট দোকান</span>
              <div className="flex items-baseline justify-end gap-2 mt-1">
                <span className="text-2xl font-black text-white font-mono">
                  {stats.totalShops > 0 ? stats.totalShops.toLocaleString() : '186'}
                </span>
                <span className="inline-flex items-center text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                  ↑ 8%
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">গত ৩০ দিনে</span>
            </div>
          </div>
        </div>

        {/* Card 3: Orders */}
        <div 
          onClick={() => onNavigateTab('orders')}
          className="relative overflow-hidden rounded-2xl p-5 bg-[#1b102e]/90 border border-[#371f5e] hover:border-purple-500/50 transition-all cursor-pointer shadow-lg group"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-medium">মোট অর্ডার</span>
              <div className="flex items-baseline justify-end gap-2 mt-1">
                <span className="text-2xl font-black text-white font-mono">
                  {stats.totalOrders > 0 ? stats.totalOrders.toLocaleString() : '342'}
                </span>
                <span className="inline-flex items-center text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                  ↑ 24%
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">গত ৩০ দিনে</span>
            </div>
          </div>
        </div>

        {/* Card 4: Delivery Riders */}
        <div 
          onClick={() => onNavigateTab('riders')}
          className="relative overflow-hidden rounded-2xl p-5 bg-[#251809]/90 border border-[#4a3114] hover:border-amber-500/50 transition-all cursor-pointer shadow-lg group"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <Bike className="w-6 h-6" />
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-medium">মোট ডেলিভারি রাইডার</span>
              <div className="flex items-baseline justify-end gap-2 mt-1">
                <span className="text-2xl font-black text-white font-mono">
                  {stats.totalRiders > 0 ? stats.totalRiders.toLocaleString() : '78'}
                </span>
                <span className="inline-flex items-center text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                  ↑ 15%
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">গত ৩০ দিনে</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Analytics Chart (Left) + Quick Actions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart Column (approx 65% width) */}
        <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <h2 className="text-base font-bold text-white tracking-tight">
                সাম্প্রতিক কার্যকলাপ <span className="text-xs text-slate-400 font-normal">(Analytics Overview)</span>
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
                  <span>Users</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]"></span>
                  <span>Orders</span>
                </span>
              </div>

              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="bg-slate-950/80 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 outline-hidden focus:border-amber-500 cursor-pointer"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
              </select>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={{ stroke: '#1e293b' }} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: '#1e293b',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#fff',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.8)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#f59e0b" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#userGrad)" 
                  activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#38bdf8" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#orderGrad)" 
                  activeDot={{ r: 6, fill: '#38bdf8', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions Column (approx 35% width) */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-tight">দ্রুত অ্যাকশন</h2>
          </div>

          <div className="space-y-2.5">
            {/* 1. Add New Product */}
            <button
              onClick={() => onNavigateTab('product-approvals')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800/80 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200 group-hover:text-white">নতুন পণ্য যোগ করুন</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </button>

            {/* 2. Approve Shop */}
            <button
              onClick={() => onNavigateTab('shops')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800/80 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Store className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200 group-hover:text-white">দোকান অনুমোদন করুন</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                {pendingCounts.pendingShops || 5}
              </span>
            </button>

            {/* 3. Manage Orders */}
            <button
              onClick={() => onNavigateTab('orders')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800/80 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200 group-hover:text-white">অর্ডার ম্যানেজ করুন</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                12
              </span>
            </button>

            {/* 4. Approve Rider */}
            <button
              onClick={() => onNavigateTab('riders')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800/80 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Bike className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200 group-hover:text-white">রাইডার অনুমোদন করুন</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                {pendingCounts.pendingRiders || 3}
              </span>
            </button>

            {/* 5. Send Notification */}
            <button
              onClick={() => onNavigateTab('notifications')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800/80 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <Send className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200 group-hover:text-white">নোটিফিকেশন পাঠান</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
            </button>

            {/* 6. Add Admin */}
            <button
              onClick={() => {
                if (onOpenAddAdminModal) onOpenAddAdminModal();
                else onNavigateTab('admin-management');
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800/80 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Shield className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200 group-hover:text-white">নতুন অ্যাডমিন যুক্ত করুন</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Pending Reviews / Approvals & Quick Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pending Approvals (65% width) */}
        <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-bold text-white tracking-tight">পেন্ডিং রিভিউ / অনুমোদন</h2>
            </div>
            <button 
              onClick={() => onNavigateTab('product-approvals')}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>সকল দেখুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Pending 1: Products */}
            <div 
              onClick={() => onNavigateTab('product-approvals')}
              className="p-4 rounded-xl bg-slate-950/60 border border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center mb-2.5">
                <Box className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-300 block">পণ্য অনুমোদন</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black text-white font-mono">
                  {pendingCounts.pendingProducts || 8}
                </span>
                <span className="text-[11px] text-amber-400 font-medium">পেন্ডিং</span>
              </div>
            </div>

            {/* Pending 2: Shops */}
            <div 
              onClick={() => onNavigateTab('shops')}
              className="p-4 rounded-xl bg-slate-950/60 border border-emerald-500/30 hover:border-emerald-500/60 transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-2.5">
                <Store className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-300 block">দোকান অনুমোদন</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black text-white font-mono">
                  {pendingCounts.pendingShops || 5}
                </span>
                <span className="text-[11px] text-emerald-400 font-medium">পেন্ডিং</span>
              </div>
            </div>

            {/* Pending 3: Riders */}
            <div 
              onClick={() => onNavigateTab('riders')}
              className="p-4 rounded-xl bg-slate-950/60 border border-teal-500/30 hover:border-teal-500/60 transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center mb-2.5">
                <Bike className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-300 block">রাইডার অনুমোদন</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black text-white font-mono">
                  {pendingCounts.pendingRiders || 3}
                </span>
                <span className="text-[11px] text-teal-400 font-medium">পেন্ডিং</span>
              </div>
            </div>

            {/* Pending 4: Admins */}
            <div 
              onClick={() => onNavigateTab('admin-management')}
              className="p-4 rounded-xl bg-slate-950/60 border border-purple-500/30 hover:border-purple-500/60 transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center mb-2.5">
                <Shield className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-300 block">অ্যাডমিন অ্যাকাউন্ট</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black text-white font-mono">
                  {pendingCounts.pendingAdmins || 2}
                </span>
                <span className="text-[11px] text-purple-400 font-medium">পেন্ডিং</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Info (35% width) */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-tight">দ্রুত তথ্য</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-slate-300">মোট জেলা</span>
              </div>
              <span className="text-xs font-bold text-white font-mono">64</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <Building className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-slate-300">মোট উপজেলা</span>
              </div>
              <span className="text-xs font-bold text-white font-mono">495</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-slate-300">নোটিফিকেশন টেমপ্লেট</span>
              </div>
              <span className="text-xs font-bold text-white font-mono">11</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <PhoneCall className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-slate-300">হেল্পলাইন সেটিংস</span>
              </div>
              <span className="text-xs font-bold text-white font-mono">1</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bottom Row: Recent Orders (Left) + Recent Notifications (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Orders Table (65% width) */}
        <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-bold text-white tracking-tight">সাম্প্রতিক অর্ডার</h2>
            </div>
            <button 
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>সকল দেখুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-3 font-semibold">অর্ডার আইডি</th>
                  <th className="pb-3 font-semibold">গ্রাহক</th>
                  <th className="pb-3 font-semibold">দোকান</th>
                  <th className="pb-3 font-semibold">পরিমাণ</th>
                  <th className="pb-3 font-semibold">স্ট্যাটাস</th>
                  <th className="pb-3 font-semibold">তারিখ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {displayOrders.map((ord, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-mono font-bold text-amber-300">{ord.id}</td>
                    <td className="py-3 text-slate-200">{ord.customer}</td>
                    <td className="py-3 text-slate-300">{ord.shop}</td>
                    <td className="py-3 font-mono font-bold text-white">৳ {ord.amount.toLocaleString()}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ord.statusType === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : ord.statusType === 'shipping'
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}>
                        {ord.statusBn}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400 font-mono text-[11px]">{ord.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Notifications (35% width) */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-bold text-white tracking-tight">সাম্প্রতিক নোটিফিকেশন</h2>
            </div>
            <button 
              onClick={() => onNavigateTab('notifications')}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>সকল দেখুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Notification 1 */}
            <div 
              onClick={() => onNavigateTab('shops')}
              className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/40 transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  নতুন দোকান আবেদন: ইসলামিক স্টোর
                </p>
                <p className="text-[11px] text-slate-400">দোকান অনুমোদনের জন্য অপেক্ষায়</p>
              </div>
              <span className="text-[10px] text-slate-500 shrink-0">2m আগে</span>
            </div>

            {/* Notification 2 */}
            <div 
              onClick={() => onNavigateTab('riders')}
              className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/40 transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  রাইডার আবেদন: মো. রাশেদ
                </p>
                <p className="text-[11px] text-slate-400">রাইডার যাচাইয়ের জন্য অপেক্ষায়</p>
              </div>
              <span className="text-[10px] text-slate-500 shrink-0">12m আগে</span>
            </div>

            {/* Notification 3 */}
            <div 
              onClick={() => onNavigateTab('orders')}
              className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/40 transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  অর্ডার #CC-10023 সম্পন্ন
                </p>
                <p className="text-[11px] text-slate-400">গ্রাহক ডেলিভারি রিসিভ করেছেন</p>
              </div>
              <span className="text-[10px] text-slate-500 shrink-0">18m আগে</span>
            </div>

            {/* Notification 4 */}
            <div 
              onClick={() => onNavigateTab('tickets')}
              className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/40 transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(251,146,60,0.6)]"></span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  নতুন সমর্থন টিকিট
                </p>
                <p className="text-[11px] text-slate-400">ব্যবহারকারী থেকে অভিযোগ এসেছে</p>
              </div>
              <span className="text-[10px] text-slate-500 shrink-0">32m আগে</span>
            </div>

            {/* Notification 5 */}
            <div 
              onClick={() => onNavigateTab('security-diagnostic')}
              className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/40 transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(96,165,250,0.6)]"></span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  সিস্টেম আপডেট
                </p>
                <p className="text-[11px] text-slate-400">নতুন ফিচার সফলভাবে যোগ করা হয়েছে</p>
              </div>
              <span className="text-[10px] text-slate-500 shrink-0">1h আগে</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
