import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  MessageSquare, 
  Clock, 
  Check, 
  X, 
  Loader2,
  Trash2,
  Flag,
  Lock,
  Unlock,
  Eye,
  AlertOctagon
} from 'lucide-react';
import { getStoredAdminToken } from '../services/api';

interface AdminCircleModerationViewProps {
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  isBn?: boolean;
}

export const AdminCircleModerationView: React.FC<AdminCircleModerationViewProps> = ({ onShowToast, isBn = true }) => {
  const [queueData, setQueueData] = useState<any>({ events: [], reports: [], stats: {} });
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<'reports' | 'events'>('reports');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [customNote, setCustomNote] = useState<string>('');
  const [selectedItemForAction, setSelectedItemForAction] = useState<any | null>(null);
  const [actionModalType, setActionModalType] = useState<string | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    const token = getStoredAdminToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/moderation/queue', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      const json = await res.json();
      if (json.success) {
        setQueueData({
          events: json.events || [],
          reports: json.reports || [],
          stats: json.stats || {}
        });
      } else {
        onShowToast('error', isBn ? 'ত্রুটি' : 'Error', json.message || 'মডারেশন কিউ লোড করা যায়নি');
      }
    } catch (err: any) {
      console.error('[AdminCircleModerationView] Fetch error:', err);
      onShowToast('error', isBn ? 'নেটওয়ার্ক ত্রুটি' : 'Network Error', err.message || 'সার্ভার সংযোগে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleExecuteEventAction = async (eventId: string, action: string, notes?: string) => {
    setActionLoadingId(eventId);
    const token = getStoredAdminToken();
    try {
      const res = await fetch(`/api/admin/moderation/events/${eventId}/action`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, notes: notes || customNote })
      });
      const json = await res.json();
      if (json.success) {
        onShowToast('success', isBn ? 'সফল' : 'Success', json.message || 'মডারেশন সিদ্ধান্ত সফলভাবে কার্যকর হয়েছে।');
        setSelectedItemForAction(null);
        setActionModalType(null);
        setCustomNote('');
        fetchQueue();
      } else {
        onShowToast('error', isBn ? 'ত্রুটি' : 'Error', json.message || 'অ্যাকশন সম্পন্ন করা যায়নি');
      }
    } catch (err: any) {
      onShowToast('error', isBn ? 'ত্রুটি' : 'Error', err.message || 'অ্যাকশন এক্সিকিউট করতে সমস্যা হয়েছে');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExecuteReportAction = async (reportId: string, action: string) => {
    setActionLoadingId(reportId);
    const token = getStoredAdminToken();
    try {
      const res = await fetch(`/api/admin/moderation/reports/${reportId}/action`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });
      const json = await res.json();
      if (json.success) {
        onShowToast('success', isBn ? 'সফল' : 'Success', json.message || 'রিপোর্ট সফলভাবে আপডেট করা হয়েছে।');
        fetchQueue();
      } else {
        onShowToast('error', isBn ? 'ত্রুটি' : 'Error', json.message || 'রিপোর্ট আপডেট ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      onShowToast('error', isBn ? 'ত্রুটি' : 'Error', err.message || 'নেটওয়ার্ক সমস্যা');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleWithdrawEvent = async (eventId: string) => {
    setActionLoadingId(eventId);
    const token = getStoredAdminToken();
    try {
      const res = await fetch(`/api/admin/moderation/events/${eventId}/withdraw`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: customNote })
      });
      const json = await res.json();
      if (json.success) {
        onShowToast('success', isBn ? 'প্রত্যাহার সম্পন্ন' : 'Withdrawn', json.message || 'সিদ্ধান্ত প্রত্যাহার করা হয়েছে।');
        fetchQueue();
      } else {
        onShowToast('error', isBn ? 'ত্রুটি' : 'Error', json.message || 'প্রত্যাহার ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      onShowToast('error', isBn ? 'ত্রুটি' : 'Error', err.message || 'নেটওয়ার্ক সমস্যা');
    } finally {
      setActionLoadingId(null);
    }
  };

  const stats = queueData.stats || {};
  const reports = queueData.reports || [];
  const events = queueData.events || [];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-white">
              {isBn ? 'কেভ সার্কেল মডারেশন ও রিপোর্ট রিভিউ' : 'Cave Circle Moderation & Reports'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            {isBn 
              ? 'ব্যবহারকারীদের রিপোর্টকৃত বার্তা এবং এআই মডারেশন সিস্টেম কর্তৃক ফ্লাগড ইভেন্টসমূহ পর্যালোচনা ও নিয়ন্ত্রণ করুন।' 
              : 'Review and moderate reported messages and AI-flagged events across Cave Circles.'}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchQueue}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
          <span>{isBn ? 'রিফ্রেশ করুন' : 'Refresh Queue'}</span>
        </button>
      </div>

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1 shadow-md">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{isBn ? 'পেন্ডিং রিপোর্ট' : 'Pending Reports'}</p>
          <h3 className="text-xl font-black text-amber-400">{reports.length}</h3>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1 shadow-md">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{isBn ? 'এআই ফ্লাগড পেন্ডিং' : 'AI Pending Events'}</p>
          <h3 className="text-xl font-black text-emerald-400">{stats.pending_count || 0}</h3>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1 shadow-md">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{isBn ? 'বার্তা মুছে ফেলা হয়েছে' : 'Blocked / Removed'}</p>
          <h3 className="text-xl font-black text-rose-400">{stats.blocked_count || 0}</h3>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1 shadow-md">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{isBn ? 'সতর্কতা ও ম্যুট' : 'Warnings & Mutes'}</p>
          <h3 className="text-xl font-black text-blue-400">{(Number(stats.warning_count) || 0) + (Number(stats.muted_count) || 0)}</h3>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'reports'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>{isBn ? `ব্যবহারকারী রিপোর্ট (${reports.length})` : `User Reports (${reports.length})`}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('events')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'events'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          <span>{isBn ? `এআই মডারেশন ইভেন্ট (${events.length})` : `AI Moderation Events (${events.length})`}</span>
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-400 mx-auto" />
          <p className="text-xs">{isBn ? 'মডারেশন কিউ লোড হচ্ছে...' : 'Loading moderation queue...'}</p>
        </div>
      ) : activeSubTab === 'reports' ? (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto opacity-60" />
              <p className="text-sm font-bold text-white">{isBn ? 'কোনো পেন্ডিং রিপোর্ট নেই' : 'No pending reports'}</p>
              <p className="text-xs text-slate-500">{isBn ? 'সার্কেল চ্যাটে কোনো রিপোর্ট জমা হলে এখানে দেখা যাবে।' : 'Reported messages from chat will appear here.'}</p>
            </div>
          ) : (
            reports.map((r: any) => (
              <div key={r.id} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/30 transition-all space-y-3 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 text-[10px] font-black uppercase">
                      {r.category || 'HARASSMENT'}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {isBn ? 'সার্কেল:' : 'Circle:'} <strong className="text-emerald-400">{r.circle_name}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">{isBn ? 'অভিযুক্ত ব্যবহারকারী:' : 'Reported User:'}</span>
                    <span className="font-bold text-rose-400">{r.reported_user_name} ({r.reported_user_phone})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">{isBn ? 'রিপোর্টকারী:' : 'Reporter:'}</span>
                    <span className="font-bold text-slate-200">{r.reporter_user_name}</span>
                  </div>
                </div>

                {r.message_content && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isBn ? 'রিপোর্টকৃত বার্তা:' : 'Reported Message:'}</span>
                    <p className="text-slate-200 font-mono italic">"{r.message_content}"</p>
                  </div>
                )}

                {r.description && (
                  <p className="text-xs text-slate-300 italic">
                    <strong>{isBn ? 'কারণ/বিবরণ:' : 'Reason:'}</strong> {r.description}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleExecuteReportAction(r.id, 'DISMISSED')}
                    disabled={actionLoadingId === r.id}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
                  >
                    {isBn ? 'খারিজ করুন (Dismiss)' : 'Dismiss'}
                  </button>
                  {r.message_id && (
                    <button
                      type="button"
                      onClick={() => handleExecuteReportAction(r.id, 'REMOVE_MESSAGE')}
                      disabled={actionLoadingId === r.id}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-md shadow-rose-950/50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isBn ? 'বার্তা মুছুন ও সমাধান করুন' : 'Remove Message & Resolve'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleExecuteReportAction(r.id, 'RESOLVED')}
                    disabled={actionLoadingId === r.id}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-950/50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isBn ? 'সমাধান হিসেবে চিহ্নিত করুন' : 'Mark Resolved'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto opacity-60" />
              <p className="text-sm font-bold text-white">{isBn ? 'কোনো এআই মডারেশন ইভেন্ট নেই' : 'No moderation events'}</p>
            </div>
          ) : (
            events.map((ev: any) => (
              <div key={ev.id} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/35 transition-all space-y-3 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                      ev.decision === 'BLOCK' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {ev.decision || 'FLAGGED'}
                    </span>
                    <span className="text-xs font-bold text-white">{ev.circle_name}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {new Date(ev.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">{isBn ? 'ব্যবহারকারী:' : 'User:'}</span>
                    <span className="font-bold text-emerald-400">{ev.user_name} ({ev.user_phone})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">{isBn ? 'রিভিউ স্ট্যাটাস:' : 'Review Status:'}</span>
                    <span className="font-bold text-amber-300">{ev.review_status}</span>
                  </div>
                </div>

                {ev.content_preview && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isBn ? 'বার্তা প্রিভিউ:' : 'Content Preview:'}</span>
                    <p className="text-slate-200 font-mono italic">"{ev.content_preview}"</p>
                  </div>
                )}

                {ev.risk_factors && (
                  <p className="text-xs text-rose-400">
                    <strong>{isBn ? 'ঝুঁকি কারণ:' : 'Risk Factors:'}</strong> {JSON.stringify(ev.risk_factors)}
                  </p>
                )}

                {ev.admin_action && (
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                    <p><strong>{isBn ? 'এডমিন সিদ্ধান্ত:' : 'Admin Action:'}</strong> {ev.admin_action} ({ev.admin_notes || 'N/A'})</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  {ev.is_withdrawn ? (
                    <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold">
                      {isBn ? 'প্রত্যাহারকৃত (Withdrawn)' : 'Withdrawn'}
                    </span>
                  ) : ev.review_status === 'RESOLVED' ? (
                    <button
                      type="button"
                      onClick={() => handleWithdrawEvent(ev.id)}
                      disabled={actionLoadingId === ev.id}
                      className="px-3.5 py-2 rounded-xl bg-amber-600/80 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-md"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>{isBn ? 'সিদ্ধান্ত প্রত্যাহার করুন (Withdraw)' : 'Withdraw Decision'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleExecuteEventAction(ev.id, 'ALLOW', 'অনুমোদিত')}
                        disabled={actionLoadingId === ev.id}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold cursor-pointer transition-colors"
                      >
                        {isBn ? 'অনুমোদন দিন (Allow)' : 'Allow'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExecuteEventAction(ev.id, 'REMOVE_MESSAGE', 'বার্তা মুছে ফেলা হয়েছে')}
                        disabled={actionLoadingId === ev.id}
                        className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isBn ? 'বার্তা মুছুন' : 'Remove Message'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExecuteEventAction(ev.id, 'WARN_USER', 'কমিউনিটি সতর্কতা জারি করা হয়েছে')}
                        disabled={actionLoadingId === ev.id}
                        className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs cursor-pointer transition-colors"
                      >
                        {isBn ? 'সতর্ক করুন (Warn)' : 'Warn User'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExecuteEventAction(ev.id, 'MUTE_USER_24H', '২৪ ঘণ্টার জন্য সাময়িক ম্যুট')}
                        disabled={actionLoadingId === ev.id}
                        className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>{isBn ? '২৪ ঘণ্টা ম্যুট' : 'Mute 24h'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
