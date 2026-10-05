import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  Calendar, 
  Clock, 
  Check, 
  X, 
  Loader2,
  Lock,
  LogIn
} from 'lucide-react';
import { getStoredAdminToken } from '../services/api';

interface QuarantinedRecord {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  mosque_id: string;
  mosque_name: string;
  prayer_type: string;
  date: string;
  verified_at: string;
  status: string;
  risk_score: number;
  risk_reason: string;
  synced_at: string;
}

interface AdminQuarantineViewProps {
  onReAuthenticate?: () => void;
}

export const AdminQuarantineView: React.FC<AdminQuarantineViewProps> = ({ onReAuthenticate }) => {
  const [records, setRecords] = useState<QuarantinedRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState<boolean>(false);
  const [authStatus, setAuthStatus] = useState<number | null>(null);
  const [hasLoadedSuccessfully, setHasLoadedSuccessfully] = useState<boolean>(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    setIsAuthError(false);
    setAuthStatus(null);
    setSuccessMsg(null);

    const token = getStoredAdminToken();
    if (!token) {
      console.warn('[AdminQuarantineView] No admin token found in storage');
      setLoading(false);
      setIsAuthError(true);
      setAuthStatus(401);
      setError('কোনো সক্রিয় এডমিন সেশন বা অনুমোদন টোকেন পাওয়া যায়নি। অনুগ্রহ করে এডমিন হিসেবে লগইন করুন।');
      setHasLoadedSuccessfully(false);
      setRecords([]);
      return;
    }

    try {
      // Try /api/admin/quarantine first, then fallback to /api/prayers/admin/quarantine
      let res = await fetch('/api/admin/quarantine', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (res.status === 404) {
        res = await fetch('/api/prayers/admin/quarantine', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
      }

      setAuthStatus(res.status);

      if (res.status === 401 || res.status === 403) {
        let errDetail = 'এডমিন সেশন অনুমোদিত নয়।';
        try {
          const errJson = await res.json();
          errDetail = errJson.message || errJson.error || errDetail;
        } catch (_) {
          // ignore json parse error
        }
        setIsAuthError(true);
        setError(res.status === 401 
          ? `এডমিন সেশনের মেয়াদ শেষ হয়েছে বা অনুমোদন নেই (HTTP 401)। ${errDetail}`
          : `এই মডিউলে প্রবেশের অনুমতি নেই (HTTP 403)। ${errDetail}`);
        setHasLoadedSuccessfully(false);
        setRecords([]);
        return;
      }

      if (!res.ok) {
        let errDetail = `সার্ভার ত্রুটি: HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          errDetail = errJson.message || errDetail;
        } catch (_) {
          // ignore json parse error
        }
        setIsAuthError(false);
        setError(errDetail);
        setHasLoadedSuccessfully(false);
        setRecords([]);
        return;
      }

      const json = await res.json();
      if (json.success) {
        setRecords(Array.isArray(json.records) ? json.records : []);
        setHasLoadedSuccessfully(true);
        setError(null);
        setIsAuthError(false);
      } else {
        setIsAuthError(false);
        setError(json.message || 'কোয়ারেন্টাইনড রেকর্ড লোড করতে ব্যর্থ হয়েছে');
        setHasLoadedSuccessfully(false);
      }
    } catch (err: any) {
      console.error('[AdminQuarantineView] fetch error:', err);
      setIsAuthError(false);
      setError(err.message || 'কোয়ারেন্টাইনড রেকর্ড ফেচ করতে নেটওয়ার্ক সমস্যা হয়েছে');
      setHasLoadedSuccessfully(false);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string, action: 'approve' | 'reject') => {
    setResolvingId(id);
    setError(null);
    setSuccessMsg(null);

    const token = getStoredAdminToken();
    if (!token) {
      setIsAuthError(true);
      setAuthStatus(401);
      setError('এডমিন সেশন টোকেন পাওয়া যায়নি। অনুগ্রহ করে পুনরায় লগইন করুন।');
      setResolvingId(null);
      return;
    }

    try {
      let res = await fetch('/api/admin/quarantine/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id, action })
      });

      if (res.status === 404) {
        res = await fetch('/api/prayers/admin/quarantine/resolve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ id, action })
        });
      }

      if (res.status === 401 || res.status === 403) {
        let errDetail = 'সেশন মেয়াদোত্তীর্ণ';
        try {
          const errJson = await res.json();
          errDetail = errJson.message || errDetail;
        } catch (_) {}
        setIsAuthError(true);
        setAuthStatus(res.status);
        setError(`এডমিন সেশন ত্রুটি (${res.status}): ${errDetail}`);
        return;
      }

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.message || `রেকর্ড সফলভাবে ${action === 'approve' ? 'অনুমোদন' : 'প্রত্যাখ্যান'} করা হয়েছে।`);
        // Remove from list
        setRecords(prev => prev.filter(r => r.id !== id));
      } else {
        throw new Error(json.message || 'রেকর্ড নিষ্পত্তি ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      setError(err.message || 'রেকর্ড নিষ্পত্তি করতে সমস্যা হয়েছে');
    } finally {
      setResolvingId(null);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const getPrayerName = (type: string) => {
    const names: Record<string, string> = {
      fajr: 'ফজর (Fajr)',
      dhuhr: 'যোহর (Dhuhr)',
      asr: 'আসর (Asr)',
      maghrib: 'মাগরিব (Maghrib)',
      isha: 'এশা (Isha)'
    };
    return names[type.toLowerCase()] || type;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 pb-4 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">কোয়ারেন্টাইনড নামাজ ভেরিফিকেশন রিভিউ</h3>
            <p className="text-xs text-slate-400">সন্দেহজনক অফলাইন সিঙ্ক বা টাইমস্ট্যাম্প টেম্পারিং প্রতিরোধ মডিউল</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRecords}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            রিফ্রেশ তালিকা
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 mb-4 bg-emerald-950/40 border border-emerald-900/50 rounded-xl text-emerald-400 text-xs flex items-start gap-3 animate-in fade-in">
          <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. Dedicated Loading State */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3 border border-slate-800/60 rounded-xl bg-slate-950/30">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <span>কোয়ারেন্টাইন তালিকা লোড হচ্ছে...</span>
        </div>
      ) : isAuthError ? (
        /* 2. Dedicated Authentication / 401 Session Error State (Never treats as empty list) */
        <div className="py-10 px-6 text-center border border-red-500/30 bg-red-950/20 rounded-xl flex flex-col items-center gap-4 animate-in fade-in">
          <div className="p-3.5 bg-red-500/10 text-red-400 rounded-full border border-red-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h4 className="text-base font-bold text-red-200">
              এডমিন সেশন অনুমোদন ত্রুটি {authStatus ? `(HTTP ${authStatus})` : ''}
            </h4>
            <p className="text-xs text-red-300/90 leading-relaxed">
              {error || 'আপনার এডমিন সেশন টোকেন পাওয়া যায়নি বা এর মেয়াদ শেষ হয়ে গেছে। কোয়ারেন্টাইন রিভিউ দেখতে এডমিন অনুমোদন আবশ্যক।'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <button
              onClick={fetchRecords}
              className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              পুনরায় চেষ্টা করুন
            </button>
            {onReAuthenticate && (
              <button
                onClick={onReAuthenticate}
                className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-900/20"
              >
                <LogIn className="w-3.5 h-3.5" />
                এডমিন লগইন স্ক্রিনে যান
              </button>
            )}
          </div>
        </div>
      ) : error ? (
        /* 3. Dedicated General API Error State (Never treats as empty list) */
        <div className="py-10 px-6 text-center border border-amber-500/30 bg-amber-950/20 rounded-xl flex flex-col items-center gap-4 animate-in fade-in">
          <div className="p-3.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h4 className="text-base font-bold text-amber-200">
              কোয়ারেন্টাইন তথ্য লোড করতে ত্রুটি
            </h4>
            <p className="text-xs text-amber-300/90 leading-relaxed">
              {error}
            </p>
          </div>
          <button
            onClick={fetchRecords}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer mt-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            পুনরায় চেষ্টা করুন
          </button>
        </div>
      ) : hasLoadedSuccessfully && records.length === 0 ? (
        /* 4. Strict Empty State: ONLY displayed when HTTP 200 with success: true and empty array */
        <div className="py-12 text-center text-slate-400 text-sm border border-dashed border-slate-800 rounded-xl flex flex-col items-center gap-2 bg-slate-950/20">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          <p className="font-bold text-slate-200">কোয়ারেন্টাইনে কোনো রিভিউ অপেক্ষমান নেই!</p>
          <p className="text-xs text-slate-400">সব অফলাইন ভেরিফিকেশন সফলভাবে সম্পন্ন হয়েছে ও নিরাপদ রয়েছে।</p>
        </div>
      ) : hasLoadedSuccessfully && records.length > 0 ? (
        /* 5. Records Table */
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs uppercase bg-slate-900/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">ব্যবহারকারী</th>
                <th className="px-4 py-3">নামাজের বিবরণ</th>
                <th className="px-4 py-3">ঝুঁকি স্কোর ও কারণ</th>
                <th className="px-4 py-3">সময়কাল</th>
                <th className="px-4 py-3 text-right">পদক্ষেপ</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, rIdx) => {
                const isThisResolving = resolvingId === record.id;
                return (
                  <tr key={`aqv-rec-${record.id || 'r'}-${rIdx}`} className="border-b border-slate-900 hover:bg-slate-900/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-100 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {record.user_name}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{record.user_phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-amber-400">{getPrayerName(record.prayer_type)}</div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        {record.mosque_name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-800 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${record.risk_score >= 80 ? 'bg-red-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(100, record.risk_score)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                          record.risk_score >= 80 
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {record.risk_score}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 max-w-xs truncate" title={record.risk_reason}>
                        {record.risk_reason || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-1 text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>নামাজ তারিখ: </span>
                        <span className="font-mono font-semibold">{record.date}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 mt-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>স্ক্যান সময়: </span>
                        <span className="font-mono">{new Date(record.verified_at).toLocaleTimeString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleResolve(record.id, 'approve')}
                          disabled={isThisResolving}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white rounded-lg transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isThisResolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          অনুমোদন
                        </button>
                        <button
                          onClick={() => handleResolve(record.id, 'reject')}
                          disabled={isThisResolving}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-red-600/10 text-red-400 border border-red-500/20 hover:bg-red-600 hover:text-white rounded-lg transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isThisResolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                          প্রত্যাখ্যান
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

