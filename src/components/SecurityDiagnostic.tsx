import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, RefreshCw, CheckCircle2, XCircle, Server, Database, Key } from 'lucide-react';

interface DiagnosticResult {
  success: boolean;
  timestamp: string;
  diagnostics: {
    jwtSecretConfigured: boolean;
    jwtValidLength: boolean;
    jwtSecretLength?: number;
    nodeEnv: string;
    databaseConfigured: boolean;
    appUrlConfigured: boolean;
    adminSecretConfigured: boolean;
  };
}

export const SecurityDiagnostic: React.FC = () => {
  const [data, setData] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/security-diagnostic');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch security diagnostics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">রানিং প্রোডাকশন সিকিউরিটি ডায়াগনস্টিকস</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">রিয়েল-টাইম এনভায়রনমেন্ট ভেরিয়েবল ও সার্ভার কনফিগারেশন যাচাই</p>
          </div>
        </div>
        <button
          onClick={fetchDiagnostics}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          রিফ্রেশ
        </button>
      </div>

      {loading && !data && (
        <div className="py-8 text-center text-slate-500 text-sm">
          ডায়াগনস্টিক ডেটা লোড হচ্ছে...
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">ডায়াগনস্টিক সংযোগ ত্রুটি</p>
            <p className="text-xs mt-0.5 opacity-90">{error}</p>
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* JWT Secret Status */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
              data.diagnostics.jwtSecretConfigured && data.diagnostics.jwtValidLength
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                : 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-900 dark:text-red-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <Key className="w-4 h-4" />
                <span className="text-xs font-semibold">JWT_SECRET কনফিগারেশন</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold">
                {data.diagnostics.jwtSecretConfigured && data.diagnostics.jwtValidLength ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>কনফিগারড (সুরক্ষিত)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span>ত্রুটি / অনুপস্থিত</span>
                  </>
                )}
              </div>
            </div>

            {/* Database Status */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
              data.diagnostics.databaseConfigured
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4" />
                <span className="text-xs font-semibold">ডাটাবেস কানেকশন</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold">
                {data.diagnostics.databaseConfigured ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>সংযুক্ত</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>অনুপস্থিত</span>
                  </>
                )}
              </div>
            </div>

            {/* Environment Status */}
            <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                <Server className="w-4 h-4" />
                <span className="text-xs font-semibold">রানিং এনভায়রনমেন্ট (NODE_ENV)</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded uppercase">
                {data.diagnostics.nodeEnv}
              </span>
            </div>

            {/* Admin Secret Status */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
              data.diagnostics.adminSecretConfigured
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-semibold">অ্যাডমিন সিক্রেট কী</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold">
                {data.diagnostics.adminSecretConfigured ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>উপস্থিত</span>
                  </>
                ) : (
                  <span>ডিফল্ট মোড</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 text-right pt-1">
            সর্বশেষ যাচাই: {new Date(data.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};
